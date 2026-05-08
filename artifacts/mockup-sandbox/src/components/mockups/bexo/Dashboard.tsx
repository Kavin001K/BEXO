import React from 'react';
import { Eye, Zap, CheckCircle, Home, Layout, Plus, User } from 'lucide-react';
import './_group.css';

export function Dashboard() {
  return (
    <div className="min-h-[844px] w-full overflow-y-auto flex flex-col relative pb-[80px]" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      <div className="h-[44px] w-full shrink-0" />
      
      {/* Top Bar */}
      <div className="h-[56px] px-[20px] flex items-center justify-between shrink-0">
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--bexo-accent)' }}>
          BEXO
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '18px', color: 'var(--bexo-text)' }}>
          Dashboard
        </div>
        <div 
          className="w-[36px] h-[36px] rounded-full flex items-center justify-center p-[2px]"
          style={{ background: 'linear-gradient(135deg, var(--bexo-accent), var(--bexo-coral))' }}
        >
          <div className="w-full h-full rounded-full flex items-center justify-center bg-[var(--bexo-elevated)]">
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: 'var(--bexo-text)' }}>KN</span>
          </div>
        </div>
      </div>

      <div className="px-[20px] flex flex-col gap-[24px] pt-[16px]">
        {/* Stats Row */}
        <div className="flex gap-[12px]">
          <div className="flex-1 rounded-[16px] p-[14px]" style={{ backgroundColor: 'var(--bexo-surface)' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--bexo-text)' }}>1,284</div>
            <div className="mt-[2px] mb-[8px]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-muted)' }}>Profile Views</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-mint)' }}>+12% today</div>
          </div>
          <div className="flex-1 rounded-[16px] p-[14px]" style={{ backgroundColor: 'var(--bexo-surface)' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--bexo-text)' }}>47</div>
            <div className="mt-[2px] mb-[8px]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-muted)' }}>Recruiter Clicks</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-mint)' }}>+3 today</div>
          </div>
          <div className="flex-1 rounded-[16px] p-[14px]" style={{ backgroundColor: 'var(--bexo-surface)' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--bexo-text)' }}>9/10</div>
            <div className="mt-[2px] mb-[8px]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-muted)' }}>Portfolio Score</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-accent)' }}>Excellent</div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="w-full rounded-[24px] overflow-hidden" style={{ backgroundColor: 'var(--bexo-surface)' }}>
          {/* Mockup Top */}
          <div className="h-[40px] px-[16px] flex items-center gap-[8px]" style={{ backgroundColor: 'var(--bexo-elevated)' }}>
            <div className="flex gap-[6px]">
              <div className="w-[10px] h-[10px] rounded-full bg-[#FA6A6A]" />
              <div className="w-[10px] h-[10px] rounded-full bg-[#FAD06A]" />
              <div className="w-[10px] h-[10px] rounded-full bg-[#6AFAD0]" />
            </div>
            <div className="h-[20px] w-[120px] rounded-[6px] ml-[8px]" style={{ backgroundColor: 'var(--bexo-high)' }} />
          </div>
          {/* Mockup Content (Gradient block) */}
          <div 
            className="h-[160px] w-full flex flex-col items-center justify-center p-[20px]"
            style={{ background: 'linear-gradient(180deg, #1A1A24 0%, #0A0A0F 100%)' }}
          >
            <div className="w-[60px] h-[60px] rounded-full bg-[var(--bexo-surface)] mb-[16px]" />
            <div className="w-1/2 h-[12px] rounded-full bg-[var(--bexo-surface)] mb-[8px]" />
            <div className="w-1/3 h-[12px] rounded-full bg-[var(--bexo-surface)]" />
          </div>
          
          {/* Card Footer */}
          <div className="p-[16px]">
            <div className="flex items-center justify-between mb-[16px]">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'var(--bexo-text)' }}>bexo.app/kavin001</span>
              <div className="flex gap-[8px]">
                <button className="px-[12px] py-[6px] rounded-[8px] bg-[var(--bexo-elevated)] border-none text-[var(--bexo-text)] text-[12px] cursor-pointer">Open</button>
                <button className="px-[12px] py-[6px] rounded-[8px] bg-[var(--bexo-elevated)] border-none text-[var(--bexo-text)] text-[12px] cursor-pointer">Share</button>
              </div>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}>
              Last updated: 2h ago
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h3 className="m-0 mb-[16px]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '14px', color: 'var(--bexo-muted)' }}>
            Recent activity
          </h3>
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-center px-[16px] h-[56px] rounded-[12px]" style={{ backgroundColor: 'var(--bexo-surface)' }}>
              <Eye size={18} color="var(--bexo-accent)" className="mr-[12px]" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--bexo-text)' }}>
                Someone from Zoho viewed your portfolio <span style={{ color: 'var(--bexo-dim)' }}>· 3h ago</span>
              </span>
            </div>
            <div className="flex items-center px-[16px] h-[56px] rounded-[12px]" style={{ backgroundColor: 'var(--bexo-surface)' }}>
              <Zap size={18} color="var(--bexo-accent)" className="mr-[12px]" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--bexo-text)' }}>
                Portfolio rebuilt after your last update <span style={{ color: 'var(--bexo-dim)' }}>· 5h ago</span>
              </span>
            </div>
            <div className="flex items-center px-[16px] h-[56px] rounded-[12px]" style={{ backgroundColor: 'var(--bexo-surface)' }}>
              <CheckCircle size={18} color="var(--bexo-accent)" className="mr-[12px]" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'var(--bexo-text)' }}>
                Portfolio quality score improved to 9/10 <span style={{ color: 'var(--bexo-dim)' }}>· 1d ago</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* FAB */}
      <button 
        className="fixed bottom-[80px] right-[20px] w-[64px] h-[64px] rounded-full flex items-center justify-center border-none cursor-pointer z-20"
        style={{ 
          background: 'linear-gradient(135deg, var(--bexo-accent), var(--bexo-coral))',
          boxShadow: '0 8px 32px rgba(124,106,250,0.5)'
        }}
      >
        <Plus size={28} color="#FFFFFF" />
      </button>

      {/* Bottom Nav */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-[60px] flex items-center justify-around px-[16px] z-20"
        style={{ backgroundColor: '#0D0D14', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col items-center gap-[4px] cursor-pointer">
          <Home size={20} color="var(--bexo-accent)" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-accent)' }}>Home</span>
        </div>
        <div className="flex flex-col items-center gap-[4px] cursor-pointer">
          <Layout size={20} color="var(--bexo-dim)" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-dim)' }}>Portfolio</span>
        </div>
        <div className="flex flex-col items-center gap-[4px] cursor-pointer opacity-0 pointer-events-none w-[40px]">
          {/* Spacer for FAB */}
        </div>
        <div className="flex flex-col items-center gap-[4px] cursor-pointer">
          <User size={20} color="var(--bexo-dim)" />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--bexo-dim)' }}>Profile</span>
        </div>
      </div>
    </div>
  );
}