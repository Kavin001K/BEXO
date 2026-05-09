import { Router } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const router = Router();

// ---------------------------------------------------------------------------
// In-memory OTP store  (phone → { hash, expiresAt })
// OTPs are valid for 10 minutes. On server restart users must re-request.
// ---------------------------------------------------------------------------
const otpStore = new Map<string, { hash: string; expiresAt: number }>();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://gtjbnvpvqzddkbatyqtr.supabase.co";
const OTP_TTL_MS = 10 * 60 * 1000;

function generateOTP(): string {
  return String(100000 + (crypto.randomInt(900000)));
}

function hashOTP(otp: string): string {
  const secret = process.env.OTP_SECRET ?? "bexo_otp_secret";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

// ---------------------------------------------------------------------------
// MSG91 WhatsApp sender
// ---------------------------------------------------------------------------
async function sendWhatsAppOTP(phone: string, otp: string): Promise<void> {
  const authKey      = process.env.MSG91_AUTH_KEY;
  const from         = process.env.MSG91_WHATSAPP_NUMBER ?? "15558125705";
  const templateName = process.env.MSG91_TEMPLATE_NAME  ?? "otp_test_authu";
  const namespace    = process.env.MSG91_NAMESPACE;

  if (!authKey) throw new Error("MSG91_AUTH_KEY is not configured on the server");

  const body = {
    from,
    to: [
      {
        user_whatsapp_number: phone,
        template_name: templateName,
        namespace,
        language: "en",
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
    ],
  };

  const resp = await fetch(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authkey: authKey,
      },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`MSG91 error (${resp.status}): ${text}`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/send-otp
// Body: { phone: "+919876543210" }
// ---------------------------------------------------------------------------
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || phone.trim().length < 8) {
    res.status(400).json({ error: "Valid phone number is required" });
    return;
  }

  const normalised = phone.replace(/\s/g, "");
  const otp  = generateOTP();
  const hash = hashOTP(otp);

  otpStore.set(normalised, { hash, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendWhatsAppOTP(normalised, otp);
    res.json({ success: true, message: "OTP sent via WhatsApp" });
  } catch (err: any) {
    otpStore.delete(normalised);
    res.status(500).json({ error: err.message ?? "Failed to send OTP" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// Body: { phone: "+919876543210", code: "123456" }
// Returns: { access_token, refresh_token, user }
// ---------------------------------------------------------------------------
router.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code are required" });
    return;
  }

  const normalised = phone.replace(/\s/g, "");
  const entry = otpStore.get(normalised);

  if (!entry) {
    res.status(400).json({ error: "No OTP found for this number. Please request a new one." });
    return;
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalised);
    res.status(400).json({ error: "OTP has expired. Please request a new one." });
    return;
  }

  const expectedHash = hashOTP(code.trim());
  if (expectedHash !== entry.hash) {
    res.status(400).json({ error: "Invalid OTP. Please check and try again." });
    return;
  }

  // OTP is correct — delete it so it cannot be reused
  otpStore.delete(normalised);

  // Create / find Supabase user and return a session
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    res
      .status(500)
      .json({
        error:
          "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. " +
          "Add it to Replit Secrets → SUPABASE_SERVICE_ROLE_KEY " +
          "(find it in Supabase Dashboard → Project Settings → API → service_role key).",
      });
    return;
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Try to create user; if already exists, find them
    let userId: string;

    const { data: createData, error: createErr } =
      await admin.auth.admin.createUser({ phone: normalised, phone_confirm: true });

    if (createErr) {
      // Likely the user already exists — search by phone
      // List users in pages until we find them (acceptable for smaller user bases)
      let found: { id: string } | undefined;
      let page = 1;
      while (!found) {
        const { data: listData, error: listErr } =
          await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr || !listData) break;
        found = listData.users.find((u) => u.phone === normalised);
        if (found || listData.users.length < 1000) break;
        page++;
      }
      if (!found) {
        res.status(500).json({ error: createErr.message ?? "Failed to find or create user" });
        return;
      }
      userId = found.id;
    } else {
      userId = createData.user!.id;
    }

    // Create a session for this user
    const { data: sessionData, error: sessionErr } =
      await (admin.auth.admin as any).createSession({ user_id: userId });

    if (sessionErr || !sessionData) {
      res.status(500).json({
        error: sessionErr?.message ?? "Failed to create user session",
      });
      return;
    }

    res.json({
      access_token:  sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      user:          sessionData.user,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

export default router;
