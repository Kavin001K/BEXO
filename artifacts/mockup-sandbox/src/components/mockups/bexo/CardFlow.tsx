import React from 'react';
import { Edit2 } from 'lucide-react';
import './_group.css';

export function CardFlow() {
  return (
    <div className="min-h-[844px] w-full overflow-y-auto flex flex-col" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      <div className="h-[44px] w-full shrink-0" />
      
      {/* Progress Bar */}
      <div className="px-[24px] py-[16px]">
        <div className="w-full h-[3px] rounded-full overflow-hidden mb-[8px]" style={{ backgroundColor: 'var(--bexo-elevated)' }}>
          <div 
            className="h-full rounded-full" 
            style={{ 
              width: '45%', 
              background: 'linear-gradient(90deg, var(--bexo-accent) 0%, var(--bexo-coral) 100%)' 
            }} 
          />
        </div>
        <p className="m-0" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}>
          5 of 11
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-[24px] pb-[40px] relative perspective-1000">
        
        {/* Main Card */}
        <div 
          className="w-full rounded-[28px] p-[24px] bexo-slide-up relative"
          style={{ 
            backgroundColor: 'var(--bexo-surface)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: 'inset 0 1px 0 rgba(124,106,250,0.05), 0 20px 40px rgba(0,0,0,0.4)'
          }}
        >
          <div className="flex items-center justify-between mb-[16px]">
            <div 
              className="px-[12px] py-[4px] rounded-full"
              style={{ 
                backgroundColor: 'rgba(250, 208, 106, 0.15)',
                color: '#FAD06A',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: '11px'
              }}
            >
              Projects
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--bexo-dim)' }}>
              Q5
            </span>
          </div>

          <h2 
            className="m-0 mb-[8px]"
            style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '22px', color: 'var(--bexo-text)' }}
          >
            What have you built or created?
          </h2>
          
          <p 
            className="m-0 mb-[24px]"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: '13px', color: 'var(--bexo-muted)' }}
          >
            Projects are the #1 thing recruiters look at
          </p>

          <div className="flex flex-col gap-[12px] mb-[20px]">
            {/* Project 1 */}
            <div className="flex items-center p-[12px] rounded-[12px]" style={{ backgroundColor: 'var(--bexo-elevated)' }}>
              <div className="w-[48px] h-[48px] rounded-[8px] mr-[12px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
              <div className="flex-1">
                <h3 className="m-0 mb-[4px]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--bexo-text)' }}>
                  Portfolio Tracker
                </h3>
                <div className="flex gap-[4px] flex-wrap">
                  <span className="text-[11px]" style={{ color: 'var(--bexo-muted)' }}>React · Node.js · PostgreSQL</span>
                </div>
              </div>
              <button className="bg-transparent border-none p-[8px] cursor-pointer">
                <Edit2 size={16} color="var(--bexo-muted)" />
              </button>
            </div>

            {/* Project 2 */}
            <div className="flex items-center p-[12px] rounded-[12px]" style={{ backgroundColor: 'var(--bexo-elevated)' }}>
              <div className="w-[48px] h-[48px] rounded-[8px] mr-[12px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
              <div className="flex-1">
                <h3 className="m-0 mb-[4px]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--bexo-text)' }}>
                  VaultBridge
                </h3>
                <div className="flex gap-[4px] flex-wrap">
                  <span className="text-[11px]" style={{ color: 'var(--bexo-muted)' }}>Flutter · Firebase</span>
                </div>
              </div>
              <button className="bg-transparent border-none p-[8px] cursor-pointer">
                <Edit2 size={16} color="var(--bexo-muted)" />
              </button>
            </div>
          </div>

          <button 
            className="w-full h-[60px] rounded-[16px] flex items-center justify-center cursor-pointer transition-colors"
            style={{ 
              backgroundColor: 'var(--bexo-elevated)',
              border: '2px dashed rgba(124,106,250,0.2)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--bexo-accent)'
            }}
          >
            + Add project
          </button>
        </div>

        {/* Navigation below card */}
        <div className="flex items-center justify-between mt-[40px] px-[8px]">
          <button 
            className="bg-transparent border-none cursor-pointer p-0"
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: '15px', color: 'var(--bexo-muted)' }}
          >
            Back
          </button>
          <button className="bexo-btn-primary w-auto px-[32px] h-[52px]">
            Continue →
          </button>
        </div>

      </div>
    </div>
  );
}