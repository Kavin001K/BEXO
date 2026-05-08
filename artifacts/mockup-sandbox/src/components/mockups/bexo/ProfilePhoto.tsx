import React from 'react';
import { Camera } from 'lucide-react';
import './_group.css';

export function ProfilePhoto() {
  return (
    <div className="min-h-[844px] w-full overflow-y-auto px-[24px] flex flex-col" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      <div className="h-[44px] w-full shrink-0" />
      <div className="h-[40px] w-full shrink-0" />
      
      <div className="text-center mb-[48px]">
        <h1 
          className="m-0 mb-[12px]" 
          style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 700, 
            fontSize: '28px', 
            color: 'var(--bexo-text)' 
          }}
        >
          Add your photo
        </h1>
        <p 
          className="m-0" 
          style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            fontWeight: 400, 
            fontSize: '14px', 
            color: 'var(--bexo-muted)' 
          }}
        >
          Students with a photo get 3x more profile views
        </p>
      </div>

      <div className="flex justify-center mb-[48px]">
        <div 
          className="w-[160px] h-[160px] rounded-full p-[3px] flex items-center justify-center relative cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, var(--bexo-accent) 0%, var(--bexo-coral) 100%)'
          }}
        >
          <div className="w-full h-full rounded-full bg-[var(--bexo-elevated)] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Initials Placeholder */}
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '48px', color: 'var(--bexo-text)', opacity: 0.2 }}>
              KN
            </span>
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <Camera size={32} color="var(--bexo-text)" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-[16px] mb-[40px]">
        <button className="bexo-btn-ghost flex-1">
          Take photo
        </button>
        <button className="bexo-btn-ghost flex-1">
          Choose from gallery
        </button>
      </div>

      <div className="mt-auto pb-[24px]">
        <div className="text-center mb-[24px]">
          <span 
            style={{ 
              fontFamily: "'DM Sans', sans-serif", 
              fontWeight: 500, 
              fontSize: '14px', 
              color: 'var(--bexo-dim)',
              cursor: 'pointer'
            }}
          >
            Skip for now
          </span>
        </div>
        <button className="bexo-btn-cta w-full">
          Continue →
        </button>
      </div>
    </div>
  );
}