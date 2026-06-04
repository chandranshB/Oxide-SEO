import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from './Toast';

const ContextMenuContext = createContext({});

export const ContextMenuProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Simple bounds check to prevent menu from overflowing off screen
    // Assuming menu is roughly 220px wide and 150px tall
    if (x + 220 > window.innerWidth) x = window.innerWidth - 220;
    if (y + 150 > window.innerHeight) y = window.innerHeight - 150;
    
    setPosition({ x, y });
    setIsVisible(true);
  }, []);

  const handleClick = useCallback(() => {
    if (isVisible) {
      setIsVisible(false);
    }
  }, [isVisible]);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, [handleContextMenu, handleClick]);

  return (
    <ContextMenuContext.Provider value={{}}>
      {children}
      {isVisible && (
        <div 
          className="fixed z-[9999] bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl rounded-xl py-2 w-[220px] text-sm text-zinc-300 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: position.y, left: position.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 pb-2 mb-2 border-b border-[var(--border-strong)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider">Actions</span>
          </div>

          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--bg-surface-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              window.location.reload();
              setIsVisible(false);
            }}
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload Window
          </button>
          
          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--bg-surface-hover)] hover:text-white transition-colors flex items-center gap-3"
            onClick={() => {
              window.history.back();
              setIsVisible(false);
            }}
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>

          <button 
            className="w-full text-left px-4 py-2 hover:bg-[var(--bg-surface-hover)] hover:text-white transition-colors flex items-center gap-3 mt-1 pt-2 border-t border-[var(--border-strong)]"
            onClick={() => {
              toast("Settings panel coming soon!");
              setIsVisible(false);
            }}
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </button>
        </div>
      )}
    </ContextMenuContext.Provider>
  );
};
