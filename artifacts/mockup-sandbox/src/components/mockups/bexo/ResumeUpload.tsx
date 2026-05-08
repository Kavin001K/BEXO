import React from 'react';
import { CloudUpload, ArrowRight } from 'lucide-react';
import './_group.css';

export function ResumeUpload() {
  return (
    <div className="min-h-[844px] w-full overflow-y-auto px-[24px] flex flex-col relative" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      {/* Background Orbs */}
      <div 
        className="absolute top-[10%] right-[-10%] w-[300px] h-[300px] rounded-full blur-[80px] pointer-events-none"
        style={{ backgroundColor: 'var(--bexo-accent)', opacity: 0.08, animation: 'bexo-orb-drift 8s infinite ease-in-out' }}
      />
      <div 
        className="absolute bottom-[20%] left-[-10%] w-[250px] h-[250px] rounded-full blur-[80px] pointer-events-none"
        style={{ backgroundColor: 'var(--bexo-coral)', opacity: 0.06, animation: 'bexo-orb-drift 10s infinite ease-in-out reverse' }}
      />

      <div className="h-[44px] w-full shrink-0" />
      <div className="h-[40px] w-full shrink-0" />

      <div className="flex flex-col relative z-10">
        <div className="self-start mb-[24px]">
          <div 
            className="inline-flex items-center px-[12px] py-[6px] rounded-full"
            style={{ 
              backgroundColor: 'rgba(124,106,250,0.15)',
              border: '1px solid rgba(124,106,250,0.3)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '12px',
              color: 'var(--bexo-glow)'
            }}
          >
            AI-Powered Setup
          </div>
        </div>

        <h1 
          className="m-0 mb-[12px]" 
          style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 800, 
            fontSize: '34px', 
            color: 'var(--bexo-text)' 
          }}
        >
          Got a resume?
        </h1>
        
        <p 
          className="m-0 mb-[32px]" 
          style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            fontWeight: 400, 
            fontSize: '15px', 
            color: 'var(--bexo-muted)',
            lineHeight: 1.5
          }}
        >
          Upload it — we'll fill everything in for you.
        </p>

        <div className="flex gap-[8px] mb-[40px]">
          <div 
            className="flex items-center px-[14px] py-[8px] rounded-full"
            style={{ backgroundColor: 'rgba(106,250,208,0.1)', color: 'var(--bexo-mint)' }}
          >
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500 }}>With resume: ~10 seconds</span>
          </div>
          <div 
            className="flex items-center px-[14px] py-[8px] rounded-full"
            style={{ backgroundColor: 'var(--bexo-elevated)', color: 'var(--bexo-muted)' }}
          >
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500 }}>Without: ~60 seconds</span>
          </div>
        </div>

        <div 
          className="flex flex-col items-center justify-center w-full h-[180px] rounded-[24px] mb-[40px] cursor-pointer relative overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bexo-elevated)'
          }}
        >
          {/* Dashed border wrapper to support animation if we wanted svg, but doing CSS dashed border */}
          <div className="absolute inset-0 rounded-[24px] border-2 border-dashed pointer-events-none" style={{ borderColor: 'rgba(124,106,250,0.3)' }} />
          
          <CloudUpload size={40} color="var(--bexo-accent)" className="mb-[16px]" />
          <span 
            className="mb-[8px]"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '16px', color: 'var(--bexo-text)' }}
          >
            Tap to upload resume
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: '13px', color: 'var(--bexo-muted)' }}>
            PDF or DOCX · Max 5MB
          </span>
        </div>

        <div className="flex items-center gap-[16px] mb-[40px]">
          <div className="flex-1 h-[1px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
          <span 
            style={{ 
              fontFamily: "'DM Sans', sans-serif", 
              fontSize: '12px', 
              color: 'var(--bexo-dim)' 
            }}
          >
            or
          </span>
          <div className="flex-1 h-[1px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
        </div>

        <button className="bexo-btn-ghost group">
          Skip — I'll fill it in manually
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>

      </div>
    </div>
  );
}