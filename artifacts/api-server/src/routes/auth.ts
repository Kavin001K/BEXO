import { Router } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Dummy WebSocket polyfill to prevent Supabase Realtime from crashing on Node 20
// We do not use realtime features in this server, only the Admin API.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class WebSocket {
    constructor() { /* dummy */ }
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

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
  // 4 digits: 1000 to 9999
  return String(1000 + (crypto.randomInt(9000)));
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
    integrated_number: from,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en",
          policy: "deterministic",
        },
        namespace: namespace,
        to_and_components: [
          {
            to: [phone],
            components: {
              body_1: {
                type: "text",
                value: otp,
              },
              // The template has a dynamic URL button, we need to provide a value or pass empty string
              button_1: {
                subtype: "url",
                type: "text",
                value: "verify", // Just a placeholder if it's required
              },
            },
          },
        ],
      },
    },
  };

  const resp = await fetch(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: authKey,
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
  // MSG91 expects the number without the '+' sign (e.g. 919876543210)
  const msg91Phone = normalised.replace(/^\+/, "");
  const otp = generateOTP();
  const hash = hashOTP(otp);

  otpStore.set(normalised, { hash, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendWhatsAppOTP(msg91Phone, otp);
    res.json({ success: true, message: "OTP sent via WhatsApp" });
  } catch (err: any) {
    console.error("MSG91 OTP Error:", err.message);
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
    // 1. Generate a secure, random temporary password and a deterministic fake email
    const tempPassword = crypto.randomBytes(32).toString("hex");
    const fakeEmail = `${normalised}@bexo.local`;
    let userId: string;
    let foundEmail: string | undefined;

    // 2. Check if the user already exists by phone or by fakeEmail
    let found: { id: string; email?: string } | undefined;
    let page = 1;
    while (!found) {
      const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr || !listData) break;
      found = listData.users.find((u) => u.phone === normalised || u.email === fakeEmail);
      if (found || listData.users.length < 1000) break;
      page++;
    }

    if (found) {
      // User already exists! Update their password so we can sign them in.
      userId = found.id;
      // If the user has a real email or phone, we will use the fakeEmail for sign-in if no phone is present.
      // But we will use the found account.
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        // Also ensure we have the fakeEmail attached so we can sign in with Email Auth bypass
        email: found.email ? undefined : fakeEmail,
        email_confirm: true,
      });
      if (updateErr) {
        console.error("Failed to update existing user password:", updateErr);
        res.status(500).json({ error: "Failed to update user for login: " + updateErr.message });
        return;
      }
      foundEmail = found.email || fakeEmail;
    } else {
      // User does not exist at all. Create them using the Email Auth bypass.
      const { data: createData, error: createErr } = await admin.auth.admin.createUser({
        email: fakeEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { phone: normalised },
      });

      if (createErr) {
        console.error("Could not create user:", createErr.message);
        res.status(500).json({ error: createErr.message ?? "Failed to find or create user" });
        return;
      }
      userId = createData.user!.id;
      foundEmail = fakeEmail;
    }

    // 3. Sign in using the anon client to generate a valid session
    const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error("Missing ANON_KEY");
      res.status(500).json({ error: "Server configuration error: SUPABASE_ANON_KEY is missing." });
      return;
    }

    const anonClient = createClient(SUPABASE_URL, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessionData, error: sessionErr } = await anonClient.auth.signInWithPassword({
      email: foundEmail,
      password: tempPassword,
    });

    if (sessionErr || !sessionData.session) {
      console.error("Failed to sign in with temp password:", sessionErr);
      res.status(500).json({
        error: sessionErr?.message ?? "Failed to create user session",
      });
      return;
    }

    res.json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: sessionData.user,
    });
  } catch (err: any) {
    console.error("Unexpected error in verify-otp:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

export default router;
