import React from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import './_group.css';

export function HandleSetup() {
  return (
    <div className="min-h-[844px] w-full overflow-y-auto flex flex-col" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      <div className="h-[44px] w-full shrink-0" />
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-[20px] py-[16px]">
        <button className="p-2 -ml-2 bg-transparent border-none cursor-pointer">
          <ChevronLeft size={24} color="var(--bexo-accent)" />
        </button>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}>
          Step 1 of 2
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center px-[24px] pb-[40px]">
        <div 
          className="text-center mb-[24px]"
          style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 800, 
            fontSize: '72px', 
            color: 'var(--bexo-accent)',
            textShadow: '0 0 40px rgba(124,106,250,0.5)'
          }}
        >
          @
        </div>
        
        <h1 
          className="text-center m-0 mb-[12px]" 
          style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 800, 
            fontSize: '30px', 
            color: 'var(--bexo-text)' 
          }}
        >
          Claim your handle
        </h1>
        
        <p 
          className="text-center m-0 mb-[32px]" 
          style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            fontWeight: 400, 
            fontSize: '14px', 
            color: 'var(--bexo-muted)' 
          }}
        >
          This becomes your portfolio URL
        </p>

        <div className="flex justify-center mb-[40px]">
          <div 
            className="flex items-center px-[20px] py-[10px] rounded-full"
            style={{ 
              backgroundColor: 'var(--bexo-elevated)',
              border: '1px solid rgba(124,106,250,0.2)'
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: 'var(--bexo-dim)' }}>bexo.app/</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', color: 'var(--bexo-accent)' }}>kavin001</span>
          </div>
        </div>

        <div className="relative mb-[24px]">
          <div 
            className="absolute left-[16px] top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', color: 'var(--bexo-accent)' }}
          >
            @
          </div>
          <input 
            type="text" 
            defaultValue="kavin001"
            className="w-full rounded-[14px] outline-none"
            style={{ 
              backgroundColor: 'var(--bexo-elevated)',
              border: '1px solid rgba(124,106,250,0.5)',
              boxShadow: '0 0 0 3px rgba(124,106,250,0.12)',
              height: '62px',
              paddingLeft: '40px',
              paddingRight: '110px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '20px',
              color: 'var(--bexo-text)'
            }}
          />
          <div className="absolute right-[16px] top-0 bottom-0 flex items-center gap-[6px] pointer-events-none">
            <CheckCircle2 size={16} color="var(--bexo-mint)" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500, color: 'var(--bexo-mint)' }}>Available!</span>
          </div>
        </div>

        <div className="flex justify-center gap-[8px] mb-auto">
          <div className="bexo-chip">Lowercase only</div>
          <div className="bexo-chip">No spaces</div>
          <div className="bexo-chip">3–20 chars</div>
        </div>

        <button className="bexo-btn-cta mt-[40px]">
          Claim @kavin001
        </button>
      </div>
    </div>
  );
}