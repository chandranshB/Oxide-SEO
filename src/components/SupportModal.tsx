import { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ArrowRight01Icon } from 'hugeicons-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function SupportModal({ onComplete }: { onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(8);
  const [opacity, setOpacity] = useState(1);
  const [isHoveringSponsor, setIsHoveringSponsor] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleContinue = () => {
    if (timeLeft > 0) return;
    setOpacity(0);
    setTimeout(onComplete, 500); // Wait for fade out
  };

  const handleBuy = async () => {
    try {
      await openUrl('https://github.com/sponsors/chandranshB');
    } catch (e) {
      console.error("Failed to open link", e);
    }
  };

  const progress = ((8 - timeLeft) / 8) * 100;
  const appWindow = getCurrentWindow();

  return (
    <>
    <style>{`
      @keyframes blob-1 {
        0% { transform: translate(0px, 0px) scale(1); }
        25% { transform: translate(200px, -150px) scale(1.5); }
        50% { transform: translate(-100px, 150px) scale(0.8); }
        75% { transform: translate(-250px, -100px) scale(1.2); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      @keyframes blob-2 {
        0% { transform: translate(0px, 0px) scale(1.2); }
        33% { transform: translate(-250px, 200px) scale(0.9); }
        66% { transform: translate(200px, -250px) scale(1.4); }
        100% { transform: translate(0px, 0px) scale(1.2); }
      }
      @keyframes blob-3 {
        0% { transform: translate(0px, 0px) scale(0.9); }
        20% { transform: translate(250px, 250px) scale(1.3); }
        50% { transform: translate(-300px, -150px) scale(1.1); }
        80% { transform: translate(150px, -300px) scale(1.5); }
        100% { transform: translate(0px, 0px) scale(0.9); }
      }
      .animate-blob-1 {
        animation: blob-1 14s infinite cubic-bezier(0.4, 0, 0.2, 1);
      }
      .animate-blob-2 {
        animation: blob-2 19s infinite cubic-bezier(0.4, 0, 0.2, 1);
      }
      .animate-blob-3 {
        animation: blob-3 23s infinite cubic-bezier(0.4, 0, 0.2, 1);
      }
    `}</style>

    <div 
      className="fixed inset-0 z-[90] flex items-center justify-center transition-opacity duration-500 p-4"
      style={{ opacity }}
    >
      {/* Window Controls */}
      <div className="fixed top-0 right-0 z-[100] flex h-8 shrink-0">
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

      {/* Static Base Backdrop - Never animate backdrop-filter for smooth 60fps! */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" data-tauri-drag-region />

      {/* Animated dynamic gradient blobs (sit on top of the base blur, but are blurred themselves) */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none ${isHoveringSponsor ? 'opacity-100' : 'opacity-0'}`}
      >
         <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full mix-blend-screen filter blur-[150px] animate-blob-1" />
         <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-screen filter blur-[150px] animate-blob-2" />
         <div className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-pink-500/30 rounded-full mix-blend-screen filter blur-[150px] animate-blob-3" />
      </div>

      <div className={`relative bg-[#0f0f11] shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl max-w-xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500 transition-colors duration-1000 border ${isHoveringSponsor ? 'border-pink-500/30' : 'border-white/10'}`}>
        
        {/* Sleek gradient progress bar */}
        <div className="absolute top-0 left-0 h-1 bg-white/5 w-full">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(236,72,153,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-8 sm:p-10 pb-8 flex flex-col gap-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-md relative">
              {/* Subtle glow behind logo */}
              <div className="absolute inset-0 bg-[var(--accent-primary)]/10 blur-xl"></div>
              <img src="/logo.png" alt="Oxide-SEO Logo" className="w-9 h-9 object-contain drop-shadow-md relative z-10" />
            </div>
            <div className="flex flex-col justify-center pt-1">
              <h2 
                className="text-[13px] sm:text-[15px] uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 leading-[1.6] drop-shadow-sm" 
                style={{ fontFamily: '"Press Start 2P", system-ui' }}
              >
                Software built by humans.
              </h2>
              <p className="text-[var(--accent-primary)] font-bold text-[10px] mt-2.5 tracking-[0.25em] uppercase opacity-90 drop-shadow-[0_0_8px_var(--accent-primary)]">
                Oxide-SEO Project
              </p>
            </div>
          </div>
          
          <div className="space-y-5 text-zinc-400 leading-relaxed text-[15px]">
            <p>
              Hey there. I'm an indie developer building Oxide-SEO to disrupt the overpriced, subscription-based SEO industry.
            </p>
            <p>
              I believe tools like this should be incredibly fast, run entirely locally, and respect your privacy. Most importantly, I don't think you should have to pay $99 every single month just to audit a website.
            </p>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 mt-2">
              <p className="text-zinc-200 font-medium leading-snug">
                If this tool is saving you time or making your agency money, please consider supporting its development on GitHub Sponsors.
              </p>
            </div>
          </div>
        </div>

        {/* Distinct Footer Area */}
        <div className="bg-white/[0.02] border-t border-white/5 p-6 sm:px-10 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button 
            disabled={timeLeft > 0}
            onClick={handleContinue}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium transition-all ${
              timeLeft > 0 
                ? 'text-zinc-600 cursor-not-allowed' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer'
            }`}
          >
            {timeLeft > 0 ? `Continue in ${timeLeft}s` : 'Continue to app'}
          </button>

          <button 
            onClick={handleBuy}
            onMouseEnter={() => setIsHoveringSponsor(true)}
            onMouseLeave={() => setIsHoveringSponsor(false)}
            className="w-full sm:w-auto px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)]"
          >
            Sponsor on GitHub <ArrowRight01Icon size={18} />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
