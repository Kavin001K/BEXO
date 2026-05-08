import React from 'react';
import { X, CloudUpload, Github, Globe } from 'lucide-react';
import './_group.css';

export function AddUpdate() {
  return (
    <div className="min-h-[844px] w-full relative flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      {/* Dark Overlay Background */}
      
      {/* Bottom Sheet */}
      <div 
        className="w-full h-[90%] flex flex-col rounded-t-[24px] relative"
        style={{ backgroundColor: '#0D0D15' }}
      >
        {/* Drag Handle */}
        <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[40px] h-[4px] rounded-full" style={{ backgroundColor: 'var(--bexo-high)' }} />
        
        {/* Header */}
        <div className="flex items-center justify-between px-[24px] pt-[32px] pb-[24px]">
          <h2 className="m-0" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--bexo-text)' }}>
            Add a project
          </h2>
          <button className="bg-[var(--bexo-elevated)] border-none w-[36px] h-[36px] rounded-full flex items-center justify-center cursor-pointer">
            <X size={18} color="var(--bexo-muted)" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[24px] pb-[40px] flex flex-col gap-[32px]">
          
          {/* Step 1 */}
          <div>
            <input 
              type="text" 
              placeholder="Project name"
              className="w-full bg-transparent border-none outline-none mb-[16px]"
              style={{ 
                fontFamily: "'Syne', sans-serif", 
                fontWeight: 600, 
                fontSize: '20px', 
                color: 'var(--bexo-text)' 
              }}
            />
            <textarea 
              placeholder="What does it do in one sentence?"
              rows={3}
              className="w-full outline-none resize-none p-[16px] rounded-[14px]"
              style={{
                backgroundColor: 'var(--bexo-elevated)',
                border: '1px solid var(--bexo-border)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                color: 'var(--bexo-text)'
              }}
            />
          </div>

          {/* Step 2 */}
          <div>
            <div className="flex items-center gap-[8px] mb-[12px]">
              <h3 className="m-0" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '15px', color: 'var(--bexo-text)' }}>Media</h3>
              <div className="px-[8px] py-[2px] rounded-[4px] bg-[#FA6A6A]/10 text-[#FA6A6A]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', fontWeight: 600 }}>REQUIRED</div>
            </div>
            
            <div 
              className="flex flex-col items-center justify-center w-full h-[140px] rounded-[16px] cursor-pointer"
              style={{ 
                backgroundColor: 'var(--bexo-elevated)',
                border: '2px dashed rgba(124,106,250,0.2)'
              }}
            >
              <CloudUpload size={28} color="var(--bexo-accent)" className="mb-[12px]" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: '13px', color: 'var(--bexo-muted)' }}>
                Upload project image or PDF — required
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div>
            <h3 className="m-0 mb-[16px]" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '15px', color: 'var(--bexo-text)' }}>Links & Stack</h3>
            
            <div className="flex flex-col gap-[12px] mb-[20px]">
              <div className="relative">
                <div className="absolute left-[16px] top-0 bottom-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[20px] h-[20px] rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bexo-accent)' }}>
                    <Github size={12} color="white" />
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="GitHub URL"
                  className="bexo-input !pl-[48px]"
                />
              </div>
              
              <div className="relative">
                <div className="absolute left-[16px] top-0 bottom-0 flex items-center justify-center pointer-events-none">
                  <Globe size={18} color="var(--bexo-muted)" />
                </div>
                <input 
                  type="text" 
                  placeholder="Live URL"
                  className="bexo-input !pl-[48px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-[8px]">
              <div className="bexo-chip selected">React</div>
              <div className="bexo-chip selected">Node.js</div>
              <div className="bexo-chip selected">PostgreSQL</div>
              <div className="bexo-chip border-dashed">+ Add skill</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-[24px] pb-[32px] pt-[16px] shrink-0" style={{ borderTop: '1px solid var(--bexo-border)' }}>
          <button className="bexo-btn-cta w-full mb-[16px]">
            Publish update →
          </button>
          <p className="text-center m-0" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--bexo-dim)' }}>
            Saving rebuilds your portfolio in ~30 seconds
          </p>
        </div>

      </div>
    </div>
  );
}