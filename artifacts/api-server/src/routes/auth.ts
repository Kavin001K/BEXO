import { Router } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class WebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

const router = Router();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://gtjbnvpvqzddkbatyqtr.supabase.co";
const OTP_TTL_MS = 10 * 60 * 1000;

function generateOTP(): string {
  return String(1000 + crypto.randomInt(9000));
}

function hashOTP(otp: string): string {
  const secret = process.env.OTP_SECRET?.trim();
  if (!secret) {
    throw new Error("OTP_SECRET is not configured on the server");
  }
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

async function getAuthenticatedUser(req: any) {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

  const admin = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

/** Deterministic placeholder handle matching profiles_handle_check (must not collide with user-chosen slugs). */
function tempHandleFromUserId(userId: string): string {
  const hex = userId.replace(/-/g, "").toLowerCase();
  const tail = hex.slice(0, 26);
  return `u${tail}`;
}

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
        language: { code: "en", policy: "deterministic" },
        namespace,
        to_and_components: [
          {
            to: [phone],
            components: {
              body_1: { type: "text", value: otp },
              button_1: { subtype: "url", type: "text", value: "verify" },
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
      headers: { "Content-Type": "application/json", authkey: authKey },
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
// ---------------------------------------------------------------------------
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || phone.trim().length < 8) {
    res.status(400).json({ error: "Valid phone number is required" });
    return;
  }

  const normalised = phone.replace(/\s/g, "");
  const msg91Phone = normalised.replace(/^\+/, "");
  const otp  = generateOTP();
  const hash = hashOTP(otp);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });
    return;
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    await admin.from("otp_codes").delete().eq("phone", normalised).eq("verified", false);
    await admin.from("otp_codes").insert({
      phone: normalised,
      code_hash: hash,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    });

    await sendWhatsAppOTP(msg91Phone, otp);
    res.json({ success: true, message: "OTP sent via WhatsApp" });
  } catch (err: any) {
    console.error("MSG91 OTP Error:", err.message);
    admin.from("otp_codes").delete().eq("phone", normalised).eq("code_hash", hash);
    res.status(500).json({ error: err.message ?? "Failed to send OTP" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// ---------------------------------------------------------------------------
router.post("/verify-otp", async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };
  if (!phone || !code) {
    res.status(400).json({ error: "Phone and code are required" });
    return;
  }

  const normalised = phone.replace(/\s/g, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!serviceRoleKey || !anonKey) {
    res.status(500).json({ error: "Server configuration error: missing Supabase keys" });
    return;
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: otpRow, error: otpErr } = await admin
    .from("otp_codes")
    .select("*")
    .eq("phone", normalised)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (otpErr || !otpRow) {
    res.status(400).json({ error: "No valid OTP found. Please request a new one." });
    return;
  }

  const expectedHash = hashOTP(code.trim());
  if (expectedHash !== otpRow.code_hash) {
    await admin.from("otp_codes")
      .update({ attempts: (otpRow.attempts ?? 0) + 1 })
      .eq("id", otpRow.id);
    res.status(400).json({ error: "Invalid OTP. Please check and try again." });
    return;
  }

  await admin.from("otp_codes").update({ verified: true }).eq("id", otpRow.id);

  try {
    const tempPassword = crypto.randomBytes(32).toString("hex");
    const fakeEmail    = `${normalised.replace(/\+/, "")}@bexo.local`;
    let userId: string;
    let signInEmail: string;

    const { data: phoneIdentity } = await admin
      .from("phone_identities")
      .select("user_id, verified")
      .eq("phone", normalised)
      .single();

    if (phoneIdentity?.user_id) {
      userId = phoneIdentity.user_id;
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      signInEmail = authUser.user?.email ?? fakeEmail;
      await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
        phone: normalised,
      });
    } else {
      const { data: profileByPhone } = await admin
        .from("profiles")
        .select("user_id")
        .eq("phone", normalised)
        .single();

      if (profileByPhone?.user_id) {
        userId = profileByPhone.user_id;
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        signInEmail = authUser.user?.email ?? fakeEmail;
        await admin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
          phone: normalised,
        });
        await admin.from("phone_identities").upsert({
          user_id: userId,
          phone: normalised,
          verified: true,
          verified_at: new Date().toISOString(),
        }, { onConflict: "phone" });
      } else {
        const { data: createData, error: createErr } = await admin.auth.admin.createUser({
          email: fakeEmail,
          phone: normalised,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { phone: normalised },
        });
        if (createErr || !createData.user) {
          res.status(500).json({ error: createErr?.message ?? "Failed to create user" });
          return;
        }
        userId = createData.user.id;
        signInEmail = fakeEmail;

        await admin.from("phone_identities").insert({
          user_id: userId,
          phone: normalised,
          verified: true,
          verified_at: new Date().toISOString(),
        });
      }
    }

    const tempHandle = tempHandleFromUserId(userId);
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, handle")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: insertProfErr } = await admin.from("profiles").insert({
        user_id: userId,
        handle: tempHandle,
        phone: normalised,
        phone_verified: true,
        email: null,
        full_name: "",
        headline: "",
        bio: "",
      });
      if (insertProfErr) {
        console.error("verify-otp profile insert:", insertProfErr);
        res.status(500).json({ error: insertProfErr.message ?? "Failed to create profile" });
        return;
      }
    } else {
      await admin.from("profiles")
        .update({ phone: normalised, phone_verified: true })
        .eq("user_id", userId);
    }

    const anonClient = createClient(SUPABASE_URL, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let authResult = await anonClient.auth.signInWithPassword({
      phone: normalised,
      password: tempPassword,
    });

    if (authResult.error || !authResult.data.session) {
      authResult = await anonClient.auth.signInWithPassword({
        email: signInEmail,
        password: tempPassword,
      });
    }

    if (authResult.error || !authResult.data.session) {
      const msg = authResult.error?.message ?? "Failed to create session";
      const hint =
        msg.includes("Phone") || msg.includes("phone")
          ? " Enable Phone provider in Supabase → Authentication → Providers."
          : msg.includes("Email") || msg.includes("email")
            ? " Enable Email provider, or enable Phone and ensure the user has a confirmed phone on their auth account."
            : "";
      res.status(500).json({ error: `${msg}${hint ? ` ${hint}` : ""}` });
      return;
    }

    const sessionData = authResult.data;
    res.json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: sessionData.user,
    });
  } catch (err: any) {
    console.error("verify-otp error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/link-phone — authenticated account mutation
// ---------------------------------------------------------------------------
router.post("/link-phone", async (req, res) => {
  const { phone, code } = req.body as { phone?: string; code?: string };
  if (!phone || !code) {
    res.status(400).json({ error: "phone and code are required" });
    return;
  }

  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const normalised = phone.replace(/\s/g, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      res.status(500).json({ error: "Server config error" });
      return;
    }

    const admin = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: otpRow } = await admin
      .from("otp_codes")
      .select("*")
      .eq("phone", normalised)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRow || hashOTP(code.trim()) !== otpRow.code_hash) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }

    await admin.from("otp_codes").update({ verified: true }).eq("id", otpRow.id);

    const { data: existing } = await admin
      .from("phone_identities")
      .select("user_id")
      .eq("phone", normalised)
      .single();

    if (existing && existing.user_id !== authUser.id) {
      res.status(409).json({ error: "This phone number is already linked to another account." });
      return;
    }

    await admin.from("phone_identities").upsert({
      user_id: authUser.id,
      phone: normalised,
      verified: true,
      verified_at: new Date().toISOString(),
    }, { onConflict: "phone" });

    await admin.from("profiles")
      .update({ phone: normalised, phone_verified: true })
      .eq("user_id", authUser.id);

    res.json({ success: true });
  } catch (err: any) {
    console.error("link-phone error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/update-email — authenticated account mutation
// ---------------------------------------------------------------------------
router.post("/update-email", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    const admin = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
      email: normalizedEmail,
      email_confirm: true,
    });

    if (error) throw error;

    const { error: profileError } = await admin
      .from("profiles")
      .update({ email: normalizedEmail })
      .eq("user_id", authUser.id);
    if (profileError) throw profileError;

    res.json({ success: true, user: data.user });
  } catch (err: any) {
    console.error("update-email error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

export default router;
