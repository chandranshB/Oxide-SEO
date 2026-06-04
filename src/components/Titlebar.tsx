import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const Titlebar: React.FC = () => {
  const appWindow = getCurrentWindow();
  
  return (
    <div 
      data-tauri-drag-region 
      className="h-8 shrink-0 select-none flex justify-between items-center bg-[var(--bg-base)] border-b border-[var(--border-strong)] z-50"
    >
      <div 
        data-tauri-drag-region 
        className="flex items-center pl-4 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase h-full w-full"
      >
        Oxide SEO by shan
      </div>
      <div className="flex h-full shrink-0">
        <div 
          onClick={() => appWindow.minimize()} 
          className="inline-flex justify-center items-center w-11 h-full hover:bg-[var(--bg-surface-hover)] cursor-pointer text-zinc-400 transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none"><rect width="10" height="1" fill="currentColor"/></svg>
        </div>
        <div 
          onClick={() => appWindow.toggleMaximize()} 
          className="inline-flex justify-center items-center w-11 h-full hover:bg-[var(--bg-surface-hover)] cursor-pointer text-zinc-400 transition-colors"
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor"/></svg>
        </div>
        <div 
          onClick={() => appWindow.close()} 
          className="inline-flex justify-center items-center w-11 h-full hover:bg-red-500 hover:text-white cursor-pointer text-zinc-400 transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2"/></svg>
        </div>
      </div>
    </div>
  );
};
