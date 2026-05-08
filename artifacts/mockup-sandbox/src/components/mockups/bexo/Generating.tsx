import React from 'react';
import './_group.css';

export function Generating() {
  // Generate random dots
  const dots = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: i % 2 === 0 ? 'var(--bexo-accent)' : 'var(--bexo-coral)',
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2
  }));

  return (
    <div className="min-h-[844px] w-full overflow-hidden flex flex-col relative" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {dots.map(dot => (
          <div 
            key={dot.id}
            className="absolute w-[4px] h-[4px] rounded-full"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              backgroundColor: dot.color,
              opacity: 0.08,
              animation: `bexo-float ${dot.duration}s infinite ease-in-out ${dot.delay}s`
            }}
          />
        ))}
      </div>

      <div className="h-[44px] w-full shrink-0" />
      
      <div className="flex-1 flex flex-col items-center justify-center px-[32px] z-10">
        <div 
          className="mb-[40px]"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: 'var(--bexo-accent)' }}
        >
          BEXO
        </div>

        {/* Animated Browser Icon */}
        <div className="relative w-[80px] h-[60px] mb-[32px]">
          <div 
            className="absolute inset-0 rounded-[8px] border-[2px]"
            style={{ borderColor: 'var(--bexo-accent)', animation: 'bexo-pulse-glow 2s infinite' }}
          />
          <div className="absolute top-[8px] left-[8px] right-[8px] flex gap-[4px]">
            <div className="w-[4px] h-[4px] rounded-full bg-[var(--bexo-accent)]" />
            <div className="w-[4px] h-[4px] rounded-full bg-[var(--bexo-accent)]" />
            <div className="w-[4px] h-[4px] rounded-full bg-[var(--bexo-accent)]" />
          </div>
          <div className="absolute top-[20px] left-[8px] right-[8px] flex flex-col gap-[6px]">
            <div className="h-[4px] rounded-full w-3/4 bg-[var(--bexo-accent)] opacity-50" />
            <div className="h-[4px] rounded-full w-full bg-[var(--bexo-accent)] opacity-50" />
            <div className="h-[4px] rounded-full w-1/2 bg-[var(--bexo-accent)] opacity-50" />
          </div>
        </div>

        <h1 
          className="m-0 mb-[16px] text-center" 
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '26px', color: 'var(--bexo-text)' }}
        >
          Building your portfolio...
        </h1>
        
        <div className="h-[24px] mb-[40px] flex items-center justify-center overflow-hidden">
          <p 
            className="m-0" 
            style={{ 
              fontFamily: "'DM Sans', sans-serif", 
              fontWeight: 400, 
              fontSize: '14px', 
              color: 'var(--bexo-muted)',
              animation: 'bexo-typing 3s infinite'
            }}
          >
            Crafting your hero section...
          </p>
        </div>

        <div className="w-full h-[3px] rounded-full bg-[var(--bexo-elevated)] mb-[60px] overflow-hidden">
          <div 
            className="h-full rounded-full"
            style={{ 
              width: '65%',
              background: 'linear-gradient(90deg, var(--bexo-accent) 0%, var(--bexo-coral) 100%)'
            }}
          />
        </div>

        {/* Blurred Preview */}
        <div className="flex flex-col items-center">
          <div 
            className="w-[260px] h-[160px] rounded-[16px] mb-[16px] overflow-hidden flex flex-col p-[16px]"
            style={{ backgroundColor: 'var(--bexo-elevated)', filter: 'blur(4px)', opacity: 0.5 }}
          >
            <div className="w-[40px] h-[40px] rounded-full bg-[var(--bexo-high)] mb-[16px]" />
            <div className="h-[12px] rounded-full bg-[var(--bexo-high)] w-3/4 mb-[8px]" />
            <div className="h-[12px] rounded-full bg-[var(--bexo-high)] w-1/2 mb-[24px]" />
            <div className="flex gap-[8px]">
              <div className="h-[32px] rounded-[8px] bg-[var(--bexo-high)] flex-1" />
              <div className="h-[32px] rounded-[8px] bg-[var(--bexo-high)] flex-1" />
            </div>
          </div>
          <p className="m-0" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}>
            Coming into focus...
          </p>
        </div>

      </div>
    </div>
  );
}