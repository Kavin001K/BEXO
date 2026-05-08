import React, { useState } from 'react';
import { Phone, Lock, Zap, Globe, ChevronDown, ArrowRight } from 'lucide-react';
import './_group.css';

export function Login() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  return (
    <div className="min-h-[844px] w-full overflow-y-auto relative" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      {/* Background Orbs */}
      <div
        className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] rounded-full blur-[80px] pointer-events-none"
        style={{ backgroundColor: 'var(--bexo-accent)', opacity: 0.08 }}
      />
      <div
        className="absolute top-[20%] left-[-20%] w-[250px] h-[250px] rounded-full blur-[80px] pointer-events-none"
        style={{ backgroundColor: 'var(--bexo-coral)', opacity: 0.06 }}
      />

      <div className="h-[44px] w-full shrink-0" />

      <div className="px-[24px] pt-[64px] pb-[40px] flex flex-col z-10 relative">
        <h1
          className="m-0 leading-[1.1]"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '38px',
            color: 'var(--bexo-text)',
          }}
        >
          Build your<br />portfolio<span style={{ color: 'var(--bexo-accent)' }}>.</span>
        </h1>

        <p
          className="mt-[16px] mb-[40px]"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            fontSize: '14px',
            color: 'var(--bexo-muted)',
            lineHeight: 1.5,
          }}
        >
          Sign up in under 60 seconds — no design skills needed.
        </p>

        {step === 'phone' ? (
          <>
            {/* Phone input */}
            <div className="mb-[16px]">
              <div
                className="flex items-center gap-[0px] rounded-[14px] overflow-hidden"
                style={{
                  backgroundColor: 'var(--bexo-elevated)',
                  border: '1px solid rgba(124,106,250,0.5)',
                  boxShadow: '0 0 0 3px rgba(124,106,250,0.10)',
                  height: '56px',
                }}
              >
                {/* Country code selector */}
                <div
                  className="flex items-center gap-[6px] px-[14px] h-full shrink-0 cursor-pointer"
                  style={{
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>🇮🇳</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'var(--bexo-text)' }}>+91</span>
                  <ChevronDown size={13} color="var(--bexo-dim)" />
                </div>

                {/* Phone number */}
                <div className="flex items-center flex-1 px-[14px] gap-[10px]">
                  <Phone size={16} color="var(--bexo-accent)" />
                  <input
                    type="tel"
                    defaultValue="98765 43210"
                    className="flex-1 bg-transparent border-none outline-none"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '16px',
                      color: 'var(--bexo-text)',
                      letterSpacing: '0.04em',
                    }}
                  />
                </div>
              </div>
              <p
                className="mt-[8px] ml-[4px]"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}
              >
                We'll send a 6-digit code. No spam, ever.
              </p>
            </div>

            {/* Send OTP CTA */}
            <button
              className="bexo-btn-primary mb-[24px]"
              onClick={() => setStep('otp')}
            >
              <Phone size={18} />
              Send OTP
              <ArrowRight size={16} style={{ marginLeft: 'auto' }} />
            </button>
          </>
        ) : (
          <>
            {/* OTP Step */}
            <div className="mb-[8px]">
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--bexo-text)', margin: 0 }}>
                Check your messages
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--bexo-muted)', marginTop: 6, marginBottom: 24 }}>
                6-digit code sent to <span style={{ color: 'var(--bexo-text)', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>+91 98765 43210</span>
              </p>

              {/* 6 OTP boxes */}
              <div className="flex gap-[8px] mb-[20px]">
                {[0,1,2,3,4,5].map((i) => (
                  <div
                    key={i}
                    className="flex-1 flex items-center justify-center rounded-[12px]"
                    style={{
                      height: '58px',
                      backgroundColor: i < 3 ? 'var(--bexo-high)' : 'var(--bexo-elevated)',
                      border: i === 3
                        ? '1px solid rgba(124,106,250,0.6)'
                        : i < 3
                        ? '1px solid rgba(106,250,208,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: i === 3 ? '0 0 0 3px rgba(124,106,250,0.12)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: '24px',
                        color: i < 3 ? 'var(--bexo-text)' : 'transparent',
                      }}
                    >
                      {i < 3 ? ['4','8','2'][i] : ''}
                    </span>
                  </div>
                ))}
              </div>

              <p
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--bexo-dim)', textAlign: 'center', marginBottom: 20 }}
              >
                Resend code in <span style={{ color: 'var(--bexo-text)', fontWeight: 500 }}>42s</span>
              </p>

              <button className="bexo-btn-cta mb-[16px]">
                Verify & Continue
              </button>

              <button
                className="bexo-btn-ghost"
                onClick={() => setStep('phone')}
              >
                Change number
              </button>
            </div>
          </>
        )}

        {/* Divider */}
        <div className="flex items-center gap-[16px] my-[20px]">
          <div className="flex-1 h-[1px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}>or</span>
          <div className="flex-1 h-[1px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
        </div>

        {/* Google */}
        <button className="bexo-btn-secondary mb-[28px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center mb-[32px]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--bexo-muted)' }}>
          Already have an account? <span style={{ color: 'var(--bexo-accent)', fontWeight: 500, cursor: 'pointer' }}>Sign in</span>
        </p>

        {/* Trust pills */}
        <div className="flex justify-center gap-[8px] mb-[32px] flex-wrap">
          <div className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full" style={{ backgroundColor: 'var(--bexo-elevated)', border: '1px solid var(--bexo-border)' }}>
            <Lock size={12} color="var(--bexo-muted)" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-muted)' }}>Private by default</span>
          </div>
          <div className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full" style={{ backgroundColor: 'var(--bexo-elevated)', border: '1px solid var(--bexo-border)' }}>
            <Zap size={12} color="var(--bexo-muted)" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-muted)' }}>AI-powered</span>
          </div>
          <div className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full" style={{ backgroundColor: 'var(--bexo-elevated)', border: '1px solid var(--bexo-border)' }}>
            <Globe size={12} color="var(--bexo-muted)" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-muted)' }}>Live in 90 sec</span>
          </div>
        </div>

        <p className="text-center" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-dim)' }}>
          By continuing, you agree to BEXO's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
