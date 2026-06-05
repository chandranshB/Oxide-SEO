import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { MinusSignIcon, SquareIcon, Cancel01Icon } from 'hugeicons-react';

export const Titlebar: React.FC = () => {
  const appWindow = getCurrentWindow();
  
  return (
    <div className="h-8 shrink-0 select-none flex justify-between items-center bg-[var(--bg-base)] border-b border-[var(--border-strong)] z-[9999] relative">
      {/* Background Drag Region - explicitly stops before the buttons so OS doesn't steal clicks */}
      <div data-tauri-drag-region className="absolute top-0 bottom-0 left-0 right-[144px] z-0" />
      
      <div className="flex items-center pl-4 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase h-full w-full relative z-10 pointer-events-none">
        Oxide SEO by shan
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span style={{ fontFamily: '"Press Start 2P", system-ui', fontSize: '9px', textTransform: 'none' }} className="text-zinc-200">
          <span className="text-[var(--accent-primary)]">Ox</span>ide SEO
        </span>
      </div>
      <div className="flex h-full shrink-0 relative z-20 pointer-events-auto">
        <div 
          onClick={() => appWindow.minimize()} 
          className="inline-flex justify-center items-center w-12 h-full hover:bg-yellow-500/10 cursor-pointer text-zinc-500 hover:text-yellow-500 transition-all duration-200"
          title="Minimize"
        >
          <MinusSignIcon size={14} />
        </div>
        <div 
          onClick={() => appWindow.toggleMaximize()} 
          className="inline-flex justify-center items-center w-12 h-full hover:bg-[var(--accent-primary)]/10 cursor-pointer text-zinc-500 hover:text-[var(--accent-primary)] transition-all duration-200"
          title="Maximize"
        >
          <SquareIcon size={12} />
        </div>
        <div 
          onClick={() => appWindow.close()} 
          className="inline-flex justify-center items-center w-12 h-full hover:bg-red-500/10 cursor-pointer text-zinc-500 hover:text-red-500 transition-all duration-200"
          title="Close"
        >
          <Cancel01Icon size={14} />
        </div>
      </div>
    </div>
  );
};
