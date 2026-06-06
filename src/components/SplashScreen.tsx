import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [opacity, setOpacity] = useState(1);
  const appWindow = getCurrentWindow();
  
  useEffect(() => {
    // Start fade out after 2s
    const timer1 = setTimeout(() => setOpacity(0), 2000);
    // Complete after 2.5s
    const timer2 = setTimeout(() => onComplete(), 2500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[var(--bg-base)] flex items-center justify-center transition-opacity duration-500"
      style={{ opacity }}
      data-tauri-drag-region
    >
      {/* Window Controls */}
      <div className="fixed top-0 right-0 z-[110] flex h-8 shrink-0">
        <div 
          onClick={() => appWindow.minimize()} 
          className="inline-flex justify-center items-center w-11 h-full hover:bg-white/10 cursor-pointer text-zinc-400 transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none"><rect width="10" height="1" fill="currentColor"/></svg>
        </div>
        <div 
          onClick={() => appWindow.toggleMaximize()} 
          className="inline-flex justify-center items-center w-11 h-full hover:bg-white/10 cursor-pointer text-zinc-400 transition-colors"
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

      <div className="flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-1000 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)]/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white relative z-10" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-[var(--accent-primary)] to-emerald-400">Ox</span>ide
        </h1>
      </div>
    </div>
  );
}
