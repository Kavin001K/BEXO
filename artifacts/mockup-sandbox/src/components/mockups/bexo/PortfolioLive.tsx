import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, Check } from 'lucide-react';
import './_group.css';

export function PortfolioLive() {
  const [showConfetti, setShowConfetti] = useState(true);

  // Generate confetti particles
  const particles = Array.from({ length: 20 }).map((_, i) => {
    const colors = ['var(--bexo-accent)', 'var(--bexo-coral)', 'var(--bexo-mint)'];
    return {
      id: i,
      x: Math.random() * 100,
      y: -10 + Math.random() * 20,
      color: colors[i % colors.length],
      delay: Math.random() * 0.5
    };
  });

  return (
    <div className="min-h-[844px] w-full overflow-y-auto flex flex-col relative" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {particles.map(p => (
            <div 
              key={p.id}
              className="absolute w-[6px] h-[6px] rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                animation: `bexo-confetti 2s ease-out ${p.delay}s forwards`
              }}
            />
          ))}
        </div>
      )}

      <div className="h-[44px] w-full shrink-0" />
      
      <div className="flex-1 flex flex-col items-center justify-center px-[24px] z-10">
        
        <div className="mb-[24px] bexo-fade-in relative">
          <div className="absolute inset-0 bg-[var(--bexo-accent)] rounded-full blur-[30px] opacity-20" />
          <ArrowUpCircle size={56} color="var(--bexo-accent)" strokeWidth={1.5} />
        </div>

        <h1 
          className="m-0 mb-[12px] text-center bexo-slide-up" 
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: 'var(--bexo-text)' }}
        >
          Your portfolio is live!
        </h1>
        
        <p 
          className="m-0 mb-[40px] text-center bexo-slide-up" 
          style={{ animationDelay: '100ms', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: '16px', color: 'var(--bexo-muted)' }}
        >
          Share it everywhere.
        </p>

        <div 
          className="w-full rounded-[20px] p-[20px] mb-[40px] bexo-slide-up"
          style={{ backgroundColor: 'var(--bexo-elevated)', animationDelay: '200ms' }}
        >
          <div className="text-center mb-[24px]">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', color: 'var(--bexo-text)' }}>
              bexo.app/kavin001
            </span>
          </div>

          <div className="flex gap-[12px] mb-[24px]">
            <button className="flex-1 h-[44px] rounded-[12px] bg-[var(--bexo-high)] border-none text-[var(--bexo-text)] font-medium text-[14px] cursor-pointer">
              Copy link
            </button>
            <button 
              className="flex-1 h-[44px] rounded-[12px] bg-transparent text-[var(--bexo-accent)] font-medium text-[14px] cursor-pointer"
              style={{ border: '1px solid var(--bexo-accent)' }}
            >
              Open site
            </button>
          </div>

          <div className="flex justify-center">
            <div 
              className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full"
              style={{ backgroundColor: 'rgba(124,106,250,0.15)' }}
            >
              <Check size={14} color="var(--bexo-glow)" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 600, color: 'var(--bexo-glow)' }}>
                Quality Score: 9/10
              </span>
            </div>
          </div>
        </div>

        <div className="w-full mb-auto bexo-slide-up" style={{ animationDelay: '300ms' }}>
          <p className="m-0 mb-[16px]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-muted)' }}>
            Share on:
          </p>
          <div className="flex justify-between">
            {['W', 'in', 'X', 'IG', 'C'].map((icon, i) => (
              <div 
                key={i}
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--bexo-high)] transition-colors"
                style={{ backgroundColor: 'var(--bexo-elevated)' }}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '16px', color: 'var(--bexo-accent)' }}>
                  {icon}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="bexo-btn-cta w-full mt-[40px] bexo-slide-up" style={{ animationDelay: '400ms' }}>
          Go to my dashboard →
        </button>

      </div>
    </div>
  );
}