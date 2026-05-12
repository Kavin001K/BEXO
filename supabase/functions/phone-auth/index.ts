import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MSG91_AUTHKEY = Deno.env.get("MSG91_AUTHKEY") ?? "";
const MSG91_NUMBER = "15558125705";
const MSG91_NAMESPACE = "1520cd50_8420_404b_b634_4808f5f33034";
const MSG91_TEMPLATE = "otp_test_authu";
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendWhatsApp(phone: string, otp: string): Promise<void> {
  const body = {
    integrated_number: MSG91_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: MSG91_TEMPLATE,
        language: { code: "en", policy: "deterministic" },
        namespace: MSG91_NAMESPACE,
        to_and_components: [
          {
            to: [phone],
            components: {
              body_1: { type: "text", value: otp },
              button_1: { subtype: "url", type: "text", value: otp },
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
        authkey: MSG91_AUTHKEY,
      },
      body: JSON.stringify(body),
    }
  );
  const result = await resp.text();
  if (!resp.ok) throw new Error(`MSG91 error: ${result}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, phone } = await req.json();

    if (!phone || !action) {
      return new Response(JSON.stringify({ error: "phone and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── SEND OTP ──
    if (action === "send") {
      // 1. Rate limiting: Check if an OTP was sent recently (last 30s)
      const { data: recent, error: recentErr } = await adminClient
        .from("otp_codes")
        .select("created_at")
        .eq("phone", phone)
        .gte("created_at", new Date(Date.now() - 30 * 1000).toISOString())
        .maybeSingle();

      if (recentErr) throw recentErr;
      if (recent) {
        return new Response(JSON.stringify({ error: "Please wait 30 seconds before requesting another code." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Clean up old codes for this phone
      await adminClient
        .from("otp_codes")
        .delete()
        .eq("phone", phone);

      const otp = generateOTP();
      const codeHash = await hashCode(otp);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { error: dbErr } = await adminClient.from("otp_codes").insert({
        phone,
        code_hash: codeHash,
        expires_at: expiresAt,
      });
      if (dbErr) throw new Error(dbErr.message);

      await sendWhatsApp(phone, otp);

      return new Response(JSON.stringify({ success: true, expires_at: expiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VERIFY OTP ──
    if (action === "verify") {
      const { code } = await req.json();
      if (!code) {
        return new Response(JSON.stringify({ error: "code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find latest unverified code for this phone
      const { data: rows, error: findErr } = await adminClient
        .from("otp_codes")
        .select("*")
        .eq("phone", phone)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (findErr || !rows || rows.length === 0) {
        return new Response(JSON.stringify({ error: "No OTP found. Request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const record = rows[0];

      // Check attempts
      if (record.attempts >= MAX_ATTEMPTS) {
        await adminClient.from("otp_codes").update({ verified: true }).eq("id", record.id);
        return new Response(JSON.stringify({ error: "Too many attempts. Request a new OTP." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(record.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This OTP has expired. Request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify hash
      const inputHash = await hashCode(code);
      const isValid = inputHash === record.code_hash;

      // Increment attempts regardless
      await adminClient
        .from("otp_codes")
        .update({ attempts: record.attempts + 1, verified: isValid })
        .eq("id", record.id);

      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid code. Try again." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── OTP valid → set up user for login ──
      // Check if user with this phone exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.phone === phone
      );

      if (existingUser) {
        // Update existing user's password to the OTP code so client can sign in
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: code,
          phone_confirm: true,
        });
      } else {
        // Create new user with phone
        await adminClient.auth.admin.createUser({
          phone,
          password: code,
          phone_confirm: true,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
