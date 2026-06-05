import React, { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { 
  ArrowRight01Icon, 
  Search01Icon, 
  Settings01Icon, 
  Shield01Icon, 
  AnalyticsUpIcon, 
  BrowserIcon 
} from 'hugeicons-react';

interface OnboardingProps {
  onComplete: (projectId: number) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const formatDomain = (input: string) => {
    let formatted = input.trim().toLowerCase();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || isCreating) return;

    try {
      setIsCreating(true);
      const finalDomain = formatDomain(url);
      const db = await Database.load('sqlite:seo_kit.db');
      
      // Ensure table exists just in case
      await db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      let insertId = 1;
      try {
        const result = await db.execute(
          'INSERT INTO projects (domain) VALUES ($1)',
          [finalDomain]
        );
        if (result.lastInsertId) insertId = Number(result.lastInsertId);
      } catch (insertErr: any) {
        // If unique constraint fails, it already exists, so we just proceed
        console.log('Project might already exist:', insertErr);
      }
      
      localStorage.setItem('oxide_onboarded', 'true');
      onComplete(insertId);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Error creating project: ' + err);
      setIsCreating(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-base)] text-white relative overflow-hidden animate-in fade-in duration-700">
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--accent-primary)]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl px-8 relative z-10">
        <div className="min-h-[400px] flex flex-col justify-center">
          
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8 text-center">
              <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
                <span className="text-[var(--accent-primary)]">Ox</span>ide SEO
              </h1>
              <p className="text-xl text-zinc-400 font-medium max-w-lg mx-auto leading-relaxed">
                The local-first, privacy-native SEO toolkit for professionals.
              </p>
            </div>
          )}

          {/* Step 1: Philosophy */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8 text-center">
              <div className="w-20 h-20 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                <Shield01Icon size={40} className="text-[var(--accent-primary)]" />
              </div>
              <h2 className="text-3xl font-bold">100% Private & Local</h2>
              <p className="text-lg text-zinc-400 max-w-md mx-auto leading-relaxed">
                Powered by a blazing fast Rust engine. No cloud servers. No subscriptions. Your crawl data stays securely on your machine.
              </p>
            </div>
          )}

          {/* Step 2: Features */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-10">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-3">The Professional Toolkit</h2>
                <p className="text-zinc-400">Everything you need to dominate search.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: BrowserIcon, title: "Site Auditor", desc: "Local DOM parsing & analysis" },
                  { icon: AnalyticsUpIcon, title: "Competitor Analysis", desc: "Identify content gaps instantly" },
                  { icon: Settings01Icon, title: "GSC Vault", desc: "Sync & archive console data" },
                  { icon: Search01Icon, title: "Keyword Scraper", desc: "Discover untapped opportunities" }
                ].map((feature, i) => (
                  <div key={i} className="p-5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl flex flex-col gap-3">
                    <feature.icon size={24} className="text-[var(--accent-primary)]" />
                    <div>
                      <h3 className="font-semibold text-zinc-100">{feature.title}</h3>
                      <p className="text-sm text-zinc-500 mt-1">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: First Project (Search Engine UI) */}
          {step === 3 && (
            <div className="animate-in zoom-in-95 duration-700 w-full max-w-xl mx-auto space-y-12">
              <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
                  <span className="text-[var(--accent-primary)]">Ox</span>ide
                </h1>
                <p className="text-zinc-400 font-medium">Create your first project to begin</p>
              </div>

              <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <Search01Icon size={20} className="text-zinc-500 group-focus-within:text-[var(--accent-primary)] transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Enter website URL (e.g., example.com)"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full py-4 pl-14 pr-6 text-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all shadow-lg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={isCreating || !url.trim()}
                  className="absolute inset-y-2 right-2 px-6 bg-[var(--accent-primary)] text-black font-semibold rounded-full hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? 'Creating...' : 'Analyze'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Navigation Dots & Buttons */}
        {step < 3 && (
          <div className="mt-12 flex items-center justify-between animate-in fade-in duration-1000 delay-300">
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[var(--accent-primary)]' : 'w-2 bg-zinc-700'}`} 
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-strong)] rounded-xl font-medium transition-all"
            >
              Continue
              <ArrowRight01Icon size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
