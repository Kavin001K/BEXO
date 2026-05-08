-- OTP codes table for WhatsApp OTP verification via MSG91
CREATE TABLE public.otp_codes (
  id          uuid primary key default uuid_generate_v4(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  verified    boolean not null default false,
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Auto-cleanup expired codes
CREATE INDEX idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX idx_otp_codes_expires ON public.otp_codes(expires_at);

-- RLS: only service_role can access (edge function uses service_role key)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
