import { Link } from 'react-router-dom';
import { Search01Icon, AnalyticsUpIcon, File01Icon, WebDesign01Icon, ArrowRight01Icon, Shield01Icon, FlashIcon } from 'hugeicons-react';
import { Titlebar } from '../components/Titlebar';

export function Landing() {
  return (
    <div className="min-h-screen bg-(--bg-base) text-white font-sans overflow-x-hidden relative selection:bg-(--accent-primary-alpha) selection:text-(--accent-primary)">
      {/* Background Orbs/Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-(--accent-primary) opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#3b82f6] opacity-[0.03] blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-(--glass-border)">
        {/* If running in Tauri, Titlebar adds draggable area */}
        <Titlebar /> 
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-(--accent-primary) to-[#2db379] flex items-center justify-center shadow-lg shadow-[#3ecf8e]/20">
              <WebDesign01Icon size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
              <span className="text-(--accent-primary)">Ox</span>ide SEO
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-(--text-secondary)">
              <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How it works</a>
              <a href="#open-source" className="hover:text-white transition-colors duration-200">Open Source</a>
            </div>
            <Link 
              to="/app" 
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-95"
            >
              Sign In
            </Link>
            <Link 
              to="/app" 
              className="px-5 py-2 rounded-lg bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-(--bg-base) text-sm font-bold transition-all duration-300 shadow-lg shadow-(--accent-primary)/20 hover:shadow-(--accent-primary)/40 active:scale-95 flex items-center gap-2 group"
            >
              Launch App
              <ArrowRight01Icon size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col items-center text-center mb-24 animate-in slide-in-from-bottom-10 fade-in duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--accent-primary-alpha) text-(--accent-primary) border border-(--accent-primary)/20 text-xs font-semibold mb-8 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--accent-primary) opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-(--accent-primary)"></span>
            </span>
            v0.1.0 Beta is now available
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-tight">
            Take Control of Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-(--accent-primary) via-[#5eead4] to-[#3b82f6]">
              Local SEO Strategy
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-(--text-secondary) max-w-2xl mb-10 leading-relaxed font-light">
            The ultimate privacy-first SEO toolkit. Analyze competitors, audit sites, scrape keywords, and connect with Search Console all from a blazing fast local app.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              to="/app" 
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-(--bg-base) font-bold text-lg transition-all duration-300 shadow-xl shadow-(--accent-primary)/20 hover:shadow-(--accent-primary)/40 active:scale-95 flex items-center justify-center gap-3 group"
            >
              Start Auditing Free
              <ArrowRight01Icon size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="https://github.com/chandranshB/Oxide-SEO" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-(--bg-surface) hover:bg-(--bg-surface-hover) border border-(--border-strong) text-white font-medium text-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-3"
            >
              <svg height="24" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="24" data-view-component="true" className="fill-current">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
              </svg>
              View GitHub
            </a>
          </div>
          
          <div className="mt-12 flex items-center gap-8 text-(--text-muted) text-sm font-medium">
            <span className="flex items-center gap-2">
              <Shield01Icon size={16} className="text-(--accent-primary)" /> Privacy First
            </span>
            <span className="flex items-center gap-2">
              <FlashIcon size={16} className="text-yellow-500" /> Rust Backend
            </span>
            <span className="flex items-center gap-2">
              <File01Icon size={16} className="text-blue-500" /> Local SQLite
            </span>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <FeatureCard 
            icon={<Search01Icon size={24} className="text-[#3ecf8e]" />}
            title="Keyword Scraper"
            desc="Scrape and analyze keywords locally without depending on expensive cloud subscriptions."
            delay="100"
          />
          <FeatureCard 
            icon={<File01Icon size={24} className="text-[#3b82f6]" />}
            title="Competitor Analysis"
            desc="Keep a close eye on competitor strategies, metadata, and ranking changes."
            delay="200"
          />
          <FeatureCard 
            icon={<WebDesign01Icon size={24} className="text-[#f59e0b]" />}
            title="Site Audits"
            desc="Run deep technical audits with actionable insights, right from your desktop."
            delay="300"
          />
          <FeatureCard 
            icon={<AnalyticsUpIcon size={24} className="text-[#ef4444]" />}
            title="GSC Integration"
            desc="Connect directly to Google Search Console to map your real-world performance."
            delay="400"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-(--border-strong) bg-(--bg-surface) mt-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-(--accent-primary) flex items-center justify-center">
                <WebDesign01Icon size={14} className="text-(--bg-base)" />
              </div>
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
                <span className="text-(--accent-primary)">Ox</span>ide SEO
              </span>
            </div>
            <p className="text-(--text-muted) text-sm text-center md:text-left max-w-sm">
              The high-performance, locally-first SEO toolkit built for modern marketers.
            </p>
          </div>
          <div className="text-(--text-muted) text-sm font-medium">
            &copy; {new Date().getFullYear()} Oxide SEO. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: string }) {
  return (
    <div 
      className={`bg-(--bg-surface) border border-(--border-subtle) hover:border-(--border-strong) rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1 group animate-in fade-in slide-in-from-bottom-10 fill-mode-both`}
      style={{ animationDelay: `${delay}ms`, animationDuration: '700ms' }}
    >
      <div className="w-12 h-12 rounded-xl bg-(--bg-base) border border-(--border-subtle) flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight text-(--text-primary)">{title}</h3>
      <p className="text-(--text-secondary) leading-relaxed">{desc}</p>
    </div>
  );
}
