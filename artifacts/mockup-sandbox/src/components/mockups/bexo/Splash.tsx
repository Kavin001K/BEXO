import React from 'react';
import './_group.css';

export function Splash() {
  return (
    <div className="min-h-[844px] w-full overflow-y-auto" style={{ backgroundColor: 'var(--bexo-bg)' }}>
      <div className="h-[44px] w-full shrink-0" />
      <div className="flex flex-col items-center justify-center h-[calc(100vh-44px)] relative relative">
        <div 
          className="absolute rounded-full w-[200px] h-[200px] blur-3xl pointer-events-none"
          style={{
            backgroundColor: 'rgba(124,106,250,0.12)',
            animation: 'bexo-pulse-glow 3s infinite ease-in-out'
          }}
        />
        
        <h1 
          className="relative z-10 m-0" 
          style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontWeight: 800, 
            fontSize: '52px', 
            color: 'var(--bexo-text)' 
          }}
        >
          <span style={{ textShadow: '0 0 40px rgba(124,106,250,0.6)' }}>B</span>EXO
        </h1>
        
        <p 
          className="mt-2 mb-0 z-10" 
          style={{ 
            fontFamily: "'DM Sans', sans-serif", 
            fontWeight: 400, 
            fontSize: '15px', 
            color: 'var(--bexo-muted)' 
          }}
        >
          Your portfolio. One tap away.
        </p>

        <div className="absolute bottom-[20%] w-full max-w-[200px] h-[2px] bg-[var(--bexo-surface)] overflow-hidden rounded-full">
          <div 
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--bexo-accent) 0%, var(--bexo-coral) 100%)',
              animation: 'bexo-bar-fill 2s ease-out forwards'
            }}
          />
        </div>
      </div>
    </div>
  );
}