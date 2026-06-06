import { useState, useEffect } from 'react';
import { GscConnectModal } from '../components/GscConnectModal';
import { useToast } from '../components/Toast';

export function Settings() {
  const [isGscConnected, setIsGscConnected] = useState(false);
  const [isGscModalOpen, setIsGscModalOpen] = useState(false);
  
  const [scraperThreads, setScraperThreads] = useState('10');
  const [scraperTimeout, setScraperTimeout] = useState('15000');
  const [scraperUserAgent, setScraperUserAgent] = useState('oxide');
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  
  const { success } = useToast();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setIsDropdownOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsGscConnected(!!localStorage.getItem('gsc_access_token'));
    
    const savedThreads = localStorage.getItem('oxide_scraper_threads');
    if (savedThreads) setScraperThreads(savedThreads);
    
    const savedTimeout = localStorage.getItem('oxide_scraper_timeout');
    if (savedTimeout) setScraperTimeout(savedTimeout);
    
    const savedUa = localStorage.getItem('oxide_scraper_ua');
    if (savedUa) setScraperUserAgent(savedUa);
  }, []);

  useEffect(() => {
    const handleNavRequest = (e: any) => {
      if (hasChanges) {
        e.preventDefault();
        setPendingTab(e.detail.tab);
      }
    };
    window.addEventListener('app-navigate-request', handleNavRequest);
    return () => window.removeEventListener('app-navigate-request', handleNavRequest);
  }, [hasChanges]);

  const handleGscDisconnect = () => {
    localStorage.removeItem('gsc_access_token');
    localStorage.removeItem('gsc_refresh_token');
    localStorage.removeItem('gsc_token_expiry');
    setIsGscConnected(false);
    success('Google account disconnected successfully');
  };

  const handleSaveAll = () => {
    localStorage.setItem('oxide_scraper_threads', scraperThreads);
    localStorage.setItem('oxide_scraper_timeout', scraperTimeout);
    localStorage.setItem('oxide_scraper_ua', scraperUserAgent);
    setHasChanges(false);
    success('Settings saved successfully');
  };

  const handleResetDefaults = () => {
    setScraperThreads('10');
    setScraperTimeout('15000');
    setScraperUserAgent('oxide');
    
    localStorage.setItem('oxide_scraper_threads', '10');
    localStorage.setItem('oxide_scraper_timeout', '15000');
    localStorage.setItem('oxide_scraper_ua', 'oxide');
    
    setHasChanges(false);
    setIsDropdownOpen(false);
    success('Settings reset and saved successfully');
  };

  const handleDiscardChanges = () => {
    setHasChanges(false);
    
    // restore original values
    const savedThreads = localStorage.getItem('oxide_scraper_threads') || '10';
    setScraperThreads(savedThreads);
    const savedTimeout = localStorage.getItem('oxide_scraper_timeout') || '15000';
    setScraperTimeout(savedTimeout);
    const savedUa = localStorage.getItem('oxide_scraper_ua') || 'oxide';
    setScraperUserAgent(savedUa);
    
    window.dispatchEvent(new CustomEvent('app-navigate-force', { detail: { tab: pendingTab } }));
    setPendingTab(null);
  };
  
  const handleSaveAndNavigate = () => {
    handleSaveAll();
    window.dispatchEvent(new CustomEvent('app-navigate-force', { detail: { tab: pendingTab } }));
    setPendingTab(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col h-full animate-in fade-in duration-500">
      <header className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Settings & Preferences</h1>
          <p className="text-zinc-400 text-lg">Customize your Oxide SEO experience and support the developer.</p>
        </div>
        
        {/* Split Save/Reset Button */}
        <div className="relative flex items-stretch h-10" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={handleSaveAll}
            disabled={!hasChanges}
            className={`px-6 font-bold text-sm rounded-l-xl border-y border-l transition-all flex items-center justify-center ${hasChanges ? 'bg-[var(--accent-primary)] text-zinc-900 border-[var(--accent-primary)] hover:brightness-110 shadow-[0_0_15px_-3px_rgba(62,207,142,0.4)]' : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'}`}
          >
            Save Changes
          </button>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`px-3 rounded-r-xl border-y border-r border-l transition-all flex items-center justify-center focus:outline-none ${hasChanges ? 'bg-[var(--accent-primary)] text-zinc-900 border-[var(--accent-primary)] hover:brightness-110 border-l-black/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full right-0 left-0 mt-2 bg-[#18181b] border border-[var(--border-strong)] rounded-xl shadow-2xl z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={handleResetDefaults}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset to Defaults
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Settings Categories */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Google Search Console Section */}
          <section>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Integrations</h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 flex items-center justify-between border-b border-[var(--border-strong)] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-300 shadow-inner">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Google Search Console</div>
                    <div className="text-sm text-zinc-400">Connect to import keywords and indexing data.</div>
                  </div>
                </div>
                {isGscConnected ? (
                  <button 
                    onClick={handleGscDisconnect}
                    className="px-5 py-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors shadow-sm"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsGscModalOpen(true)}
                    className="px-5 py-2.5 text-zinc-900 bg-zinc-100 border border-zinc-200 rounded-xl text-sm font-bold hover:bg-white transition-colors shadow-sm"
                  >
                    Connect Account
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Scraper Configuration Section */}
          <section>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Scraper Engine</h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 flex items-center justify-between border-b border-[var(--border-strong)] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-300 shadow-inner">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Concurrency (Threads)</div>
                    <div className="text-sm text-zinc-400">Number of parallel requests to make at once.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {scraperThreads !== '10' && (
                    <button 
                      onClick={() => { setScraperThreads('10'); setHasChanges(true); }}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Reset to default (10)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                  <span className="text-xs text-zinc-500 font-medium w-6 text-right">{scraperThreads}</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={scraperThreads}
                    onChange={(e) => {
                      setScraperThreads(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-32 accent-[var(--accent-primary)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-6 flex items-center justify-between border-b border-[var(--border-strong)] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-300 shadow-inner">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Request Timeout (ms)</div>
                    <div className="text-sm text-zinc-400">How long to wait before abandoning a slow request.</div>
                  </div>
                </div>
                <input 
                  type="number" 
                  value={scraperTimeout}
                  onChange={(e) => {
                    setScraperTimeout(e.target.value);
                    setHasChanges(true);
                  }}
                  className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-white w-24 text-center focus:outline-none focus:border-[var(--accent-primary)] transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
                />
              </div>

              <div className="p-6 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-300 shadow-inner">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Custom User-Agent</div>
                    <div className="text-sm text-zinc-400">Spoof the browser identity when scraping websites.</div>
                  </div>
                </div>
                <select 
                  value={scraperUserAgent}
                  onChange={(e) => {
                    setScraperUserAgent(e.target.value);
                    setHasChanges(true);
                  }}
                  className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)] transition-colors max-w-xs truncate cursor-pointer"
                >
                  <option value="oxide">Oxide SEO Bot / 1.0</option>
                  <option value="chrome_windows">Google Chrome (Windows)</option>
                  <option value="chrome_mac">Google Chrome (macOS)</option>
                  <option value="googlebot_desktop">Googlebot (Desktop)</option>
                  <option value="googlebot_smartphone">Googlebot (Smartphone)</option>
                </select>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column: Sponsoring Section */}
        <div className="xl:col-span-1">
          <section className="flex flex-col h-full">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Developer</h2>
            <div className="bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-base)] border border-[var(--border-strong)] rounded-3xl p-8 relative overflow-hidden group shadow-xl flex-1 flex flex-col items-center text-center justify-center">
              
              {/* Dynamic Animated Background */}
              <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-pink-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-pink-500/20 blur-[60px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-pink-500/30 group-hover:scale-110" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-blue-500/20 group-hover:scale-110" />
              
              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="w-32 h-32 rounded-full border-[6px] border-[var(--bg-base)] shadow-2xl overflow-hidden mb-5 relative ring-1 ring-white/10 group-hover:ring-pink-500/40 transition-all duration-500 group-hover:-translate-y-2">
                  <img 
                    src="https://avatars.githubusercontent.com/u/67635208?v=4&size=200" 
                    alt="chandranshB"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">chandranshB</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-bold uppercase tracking-widest mb-6 border border-[var(--accent-primary)]/20">
                  Creator & Maintainer
                </div>
                
                <p className="text-zinc-400 text-sm mb-10 leading-relaxed">
                  I design and build elegant tools for modern developers and creators. If Oxide SEO brings value to your workflow, consider supporting its continuous evolution!
                </p>
                
                <a 
                  href="https://github.com/sponsors/chandranshB"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full relative overflow-hidden inline-flex justify-center items-center gap-2 bg-zinc-100 text-zinc-900 font-bold px-6 py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_-5px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_-5px_rgba(255,192,203,0.4)] hover:-translate-y-1 group/btn"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-rose-100 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                  <svg className="w-5 h-5 text-pink-500 relative z-10 group-hover/btn:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span className="relative z-10 text-base">Sponsor Developer</span>
                </a>
              </div>
            </div>
          </section>
        </div>

      </div>

      <GscConnectModal 
        isOpen={isGscModalOpen} 
        onClose={() => setIsGscModalOpen(false)} 
        onConnected={() => setIsGscConnected(true)} 
      />

      {/* Unsaved Changes Warning Modal */}
      {pendingTab && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[var(--bg-base)] border border-[var(--border-strong)] shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 text-yellow-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Unsaved Changes</h3>
            <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
              You have unsaved changes in your settings. Do you want to save them before leaving?
            </p>
            
            <div className="flex w-full gap-3">
              <button 
                onClick={handleDiscardChanges}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors shadow-sm"
              >
                Discard
              </button>
              <button 
                onClick={handleSaveAndNavigate}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-zinc-900 font-bold hover:brightness-110 transition-colors shadow-[0_0_15px_-3px_rgba(62,207,142,0.3)]"
              >
                Save
              </button>
            </div>
            <button 
              onClick={() => setPendingTab(null)}
              className="mt-4 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Cancel navigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
