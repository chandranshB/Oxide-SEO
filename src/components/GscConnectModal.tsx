import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Button } from './Button';
import { useToast } from './Toast';
import { GSC_CONFIG } from '../config/gsc';

interface GscConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export const GscConnectModal: React.FC<GscConnectModalProps> = ({ isOpen, onClose, onConnected }) => {
  const [isExchanging, setIsExchanging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleClose = () => {
    // Ping the local server to unblock the TCP listener if it's waiting
    if (isExchanging) {
      fetch('http://127.0.0.1:34852/?cancel=true').catch(() => {});
      setIsExchanging(false);
    }
    onClose();
  };

  const handleOpenAuth = async () => {
    setIsExchanging(true);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GSC_CONFIG.CLIENT_ID.trim())}&redirect_uri=${encodeURIComponent(GSC_CONFIG.REDIRECT_URI.trim())}&response_type=code&scope=${encodeURIComponent(GSC_CONFIG.SCOPES.trim())}&access_type=offline&prompt=consent`;
    setGeneratedUrl(authUrl);
    
    try {
      await openUrl(authUrl);
      
      // The Rust backend will block and wait for the redirect
      const code: string = await invoke('start_oauth_server');
      await handleExchange(code);
    } catch (e: any) {
      console.error(e);
      error(e.message || "Authentication failed or timed out.");
      setIsExchanging(false);
    }
  };

  const handleExchange = async (authCode: string) => {
    try {
      // Pass the code directly to Rust to bypass any browser CORS issues entirely!
      const responseStr = await invoke<string>('exchange_oauth_token', {
        code: decodeURIComponent(authCode.trim()),
        clientId: GSC_CONFIG.CLIENT_ID.trim(),
        clientSecret: GSC_CONFIG.CLIENT_SECRET.trim(),
        redirectUri: GSC_CONFIG.REDIRECT_URI.trim(),
      });

      const data = JSON.parse(responseStr);

      if (data.error) {
        throw new Error(data.error_description || data.error || 'Failed to exchange token');
      }

      localStorage.setItem('gsc_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('gsc_refresh_token', data.refresh_token);
      }
      
      const expiry = new Date().getTime() + (data.expires_in * 1000);
      localStorage.setItem('gsc_token_expiry', expiry.toString());

      setIsExchanging(false);
      setIsSuccess(true);
      
      // Smooth 1.5s success animation before closing and triggering sync
      setTimeout(() => {
        onConnected();
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (e: any) {
      console.error(e);
      error(e.message || "Authentication failed or timed out.");
      setIsExchanging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[var(--bg-base)] border border-[var(--border-strong)] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[var(--border-strong)] flex items-center justify-between bg-[var(--bg-surface)]">
          <h2 className="text-lg font-semibold text-white">Connect Google Search Console</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          {!isExchanging && !isSuccess && (
            <>
              <p className="text-zinc-300 text-sm">
                Sign in with your Google account to grant Oxide SEO secure read-only access to your Search Console data.
              </p>

              <div>
                <Button 
                  onClick={handleOpenAuth} 
                  disabled={isExchanging}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-white text-black hover:bg-zinc-200 border border-zinc-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-semibold">Sign in with Google</span>
                </Button>
                <p className="text-[11px] text-zinc-500 mt-3 text-center">
                  Your browser will open to authenticate. The app will securely intercept the credentials and connect automatically!
                </p>

                {generatedUrl && (
                  <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                    <p className="text-xs text-zinc-400">If your browser didn't open, copy this URL:</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={generatedUrl} 
                        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-zinc-400 outline-none"
                      />
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedUrl);
                          success("URL copied to clipboard!");
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {isExchanging && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-300 font-medium">Waiting for authentication...</p>
              <p className="text-xs text-zinc-500 mt-2 text-center">Please complete the sign-in process in your browser.</p>
              <Button variant="ghost" size="sm" className="mt-6" onClick={() => {
                invoke('start_oauth_server'); // Sending a new request cancels the old one roughly, but user can just close modal
                setIsExchanging(false);
                onClose();
              }}>Cancel</Button>
            </div>
          )}

          {isSuccess && (
            <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-[var(--accent-primary)]/10 rounded-full flex items-center justify-center mb-4 text-[var(--accent-primary)]">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Connected successfully!</h3>
              <p className="text-sm text-zinc-400">Loading your Search Console data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
