import { useState, useEffect } from 'react';
import { KeywordVault } from './pages/KeywordVault';
import { CompetitorAnalysis } from './pages/CompetitorAnalysis';
import { GscDashboard } from './pages/GscDashboard';
import { SiteAudit } from './pages/SiteAudit';
import { Button } from './components/Button';
import { Search01Icon, Menu01Icon, ArrowLeft01Icon, File01Icon, AnalyticsUpIcon, WebDesign01Icon, Settings01Icon, TextFontIcon } from 'hugeicons-react';
import { Titlebar } from './components/Titlebar';
import { ProjectSelector, Project } from './components/ProjectSelector';
import { Settings } from './pages/Settings';
import Database from '@tauri-apps/plugin-sql';
import { SplashScreen } from './components/SplashScreen';
import { SupportModal } from './components/SupportModal';

import { OnboardingWizard } from './components/OnboardingWizard';

function App() {
  const [appState, setAppState] = useState<'splash' | 'support' | 'ready'>('splash');
  const [activeTab, setActiveTab] = useState<'vault' | 'competitor' | 'gsc' | 'audit' | 'audit_content' | 'settings'>('audit');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectsCount, setProjectsCount] = useState<number>(0);
  const [isInitializing, setIsInitializing] = useState(true);

  // Moved form logic from the inline form to a reusable function
  const handleOnboardingComplete = async (hostname: string) => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      // Ensure table exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = await db.execute('INSERT INTO projects (domain) VALUES ($1)', [hostname]);
      
      // Start the 22h timer if this is their very first project (completed onboarding)
      if (projectsCount === 0) {
        localStorage.setItem('lastSupportSeen', Date.now().toString());
      }
      setProjectsCount(prev => prev + 1);

      setActiveProject({ 
        id: Number(result.lastInsertId) || 1, 
        domain: hostname 
      });
      
      localStorage.setItem('has_completed_onboarding', 'true');
      
      window.dispatchEvent(new CustomEvent('project-added'));
    } catch (err: any) {
      console.log('Project might already exist or error:', err);
      window.dispatchEvent(new CustomEvent('project-added'));
      setActiveProject({ id: 1, domain: hostname });
    }
  };

  useEffect(() => {
    async function loadInitialProject() {
      try {
        const db = await Database.load('sqlite:seo_kit.db');
        // Ensure table exists on boot
        await db.execute(`
          CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        const result: Project[] = await db.select('SELECT * FROM projects ORDER BY created_at DESC');
        setProjectsCount(result.length);
        
        if (result.length > 0) {
          const savedId = localStorage.getItem('activeProjectId');
          if (savedId) {
            const found = result.find(p => p.id.toString() === savedId);
            if (found) {
              setActiveProject(found);
              return;
            }
          }
          setActiveProject(result[0]);
        }
      } catch (e) {
        console.error('Failed to load initial project', e);
      } finally {
        setIsInitializing(false);
      }
    }
    loadInitialProject();
  }, []);

  useEffect(() => {
    if (activeProject) {
      localStorage.setItem('activeProjectId', activeProject.id.toString());
    } else if (!isInitializing) {
      localStorage.removeItem('activeProjectId');
    }
  }, [activeProject, isInitializing]);

  const handleTabChange = (tab: any) => {
    const event = new CustomEvent('app-navigate-request', { detail: { tab }, cancelable: true });
    if (window.dispatchEvent(event)) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) {
        handleTabChange(e.detail.tab);
      }
    };
    
    const handleForceNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    
    const handleProjectAdded = () => {
      // Just a placeholder, ProjectSelector will reload
    };

    window.addEventListener('app-navigate' as any, handleNavigate);
    window.addEventListener('app-navigate-force' as any, handleForceNavigate);
    window.addEventListener('project-added', handleProjectAdded);
    
    return () => {
      window.removeEventListener('app-navigate' as any, handleNavigate);
      window.removeEventListener('app-navigate-force' as any, handleForceNavigate);
      window.removeEventListener('project-added', handleProjectAdded);
    };
  }, []);

  // Key bindings for testing and resetting
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl + Shift + Alt + R: Hard reset the app (delete all data, clear storage)
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        try {
          const db = await Database.load('sqlite:seo_kit.db');
          await db.execute('DELETE FROM audit_pages');
          await db.execute('DELETE FROM audits');
          await db.execute('DELETE FROM gsc_metrics');
          await db.execute('DELETE FROM projects');
        } catch (err) {
          console.error("Failed to delete records", err);
        }
        localStorage.clear();
        window.location.reload();
      }
      // Ctrl + Shift + R: Reset timer and trigger flow (soft reset)
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        localStorage.removeItem('lastSupportSeen');
        setAppState('splash');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSplashComplete = () => {
    const lastSupport = localStorage.getItem('lastSupportSeen');
    const now = Date.now();
    let shouldShowSupport = false;

    if (projectsCount === 0) {
      // Onboarding - never show sponsor message
      shouldShowSupport = false;
    } else if (projectsCount > 3) {
      // More than 3 projects - always show sponsor message
      shouldShowSupport = true;
    } else {
      // Timer based on project count: 1 project = 22 hours, 2-3 projects = 6 hours
      const timerHours = projectsCount === 1 ? 22 : 6;
      const timerMs = timerHours * 60 * 60 * 1000;
      
      if (!lastSupport || now - parseInt(lastSupport) > timerMs) {
        shouldShowSupport = true;
      }
    }

    if (shouldShowSupport) {
      setAppState('support');
    } else {
      setAppState('ready');
    }
  };

  const handleSupportComplete = () => {
    localStorage.setItem('lastSupportSeen', Date.now().toString());
    setAppState('ready');
  };

  return (
    <>
      {appState === 'splash' && <SplashScreen onComplete={handleSplashComplete} />}
      {appState === 'support' && <SupportModal onComplete={handleSupportComplete} />}
      
      <div className={`flex flex-col h-screen bg-(--bg-base) text-white overflow-hidden transition-opacity duration-1000 ${appState === 'ready' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <Titlebar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Side Panel Island */}
        {activeProject && (
          <aside 
            className={`relative transition-all duration-300 ease-in-out my-4 ml-4 mr-2 rounded-2xl border border-(--border-strong) bg-(--bg-surface) flex flex-col shadow-lg z-10 ${isExpanded ? 'w-64' : 'w-[84px]'}`}
          >
          <div className={`p-6 border-b border-(--border-strong) flex items-center transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
            <div className={`${isExpanded ? 'overflow-hidden' : 'overflow-visible'} whitespace-nowrap flex flex-col justify-center transition-all duration-300 ${isExpanded ? 'items-start' : 'items-center'}`}>
              <h1 className="font-bold tracking-tight flex items-end transition-all duration-300" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
                <span className={`text-(--accent-primary) transition-all duration-300 ${isExpanded ? 'text-xl' : 'text-2xl mt-1'}`}>Ox</span>
                <span className={`transition-all duration-300 overflow-hidden text-xl ${isExpanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}`}>
                  ide SEO
                </span>
              </h1>
              <div className={`transition-all duration-300 overflow-hidden w-full ${isExpanded ? 'max-h-10 opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
                <p className="text-[11px] text-zinc-400 font-medium text-left uppercase tracking-wider">by shan</p>
              </div>
            </div>
          </div>
          
          <ProjectSelector activeProject={activeProject} setActiveProject={setActiveProject} isExpanded={isExpanded} />
          
          <nav className="flex-1 p-4 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-none">
            {/* Category: Site Health */}
            <div className="mb-2">
              <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 mt-1">Your Site's Health</div>
              </div>
              {!isExpanded && <div className="h-px bg-white/[0.04] w-8 mx-auto mb-3 mt-1" />}
              
              <div className="flex flex-col gap-2">
                <Button 
                  variant={activeTab === 'audit' ? 'active-nav' : 'ghost'} 
                  className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
                  onClick={() => handleTabChange('audit')}
                  title="Site Audit"
                >
                  <span className="flex items-center justify-center shrink-0">
                    <WebDesign01Icon size={20} />
                  </span>
                  {isExpanded && <span className="ml-3 truncate font-medium">Site Audit</span>}
                </Button>

                <Button 
                  variant={activeTab === 'audit_content' ? 'active-nav' : 'ghost'} 
                  className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
                  onClick={() => handleTabChange('audit_content')}
                  title="Content Quality"
                >
                  <span className="flex items-center justify-center shrink-0">
                    <TextFontIcon size={20} />
                  </span>
                  {isExpanded && <span className="ml-3 truncate font-medium">Content Quality</span>}
                </Button>

                <Button 
                  variant={activeTab === 'gsc' ? 'active-nav' : 'ghost'} 
                  className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
                  onClick={() => handleTabChange('gsc')}
                  title="Search Console"
                >
                  <span className="flex items-center justify-center shrink-0">
                    <AnalyticsUpIcon size={20} />
                  </span>
                  {isExpanded && <span className="ml-3 truncate font-medium">Search Console</span>}
                </Button>
              </div>
            </div>

            {/* Category: Growth */}
            <div className="mb-2 mt-4">
              <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Growth & Discovery</div>
              </div>
              {!isExpanded && <div className="h-px bg-white/[0.04] w-8 mx-auto mb-3" />}
              
              <div className="flex flex-col gap-2">
                <Button 
                  variant={activeTab === 'vault' ? 'active-nav' : 'ghost'} 
                  className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
                  onClick={() => handleTabChange('vault')}
                  title="Keyword Scraper"
                >
                  <span className="flex items-center justify-center shrink-0">
                    <Search01Icon size={20} />
                  </span>
                  {isExpanded && <span className="ml-3 truncate font-medium">Keyword Scraper</span>}
                </Button>

                <Button 
                  variant={activeTab === 'competitor' ? 'active-nav' : 'ghost'} 
                  className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
                  onClick={() => handleTabChange('competitor')}
                  title="Competitor Analysis"
                >
                  <span className="flex items-center justify-center shrink-0">
                    <File01Icon size={20} />
                  </span>
                  {isExpanded && <span className="ml-3 truncate font-medium">Competitor Analysis</span>}
                </Button>
              </div>
            </div>
          </nav>
          
          <div className={`p-4 border-t border-(--border-strong) flex ${isExpanded ? 'justify-between' : 'flex-col gap-4 items-center'} shrink-0`}>
            <button 
              onClick={() => handleTabChange('settings')}
              className={`transition-colors p-2 rounded-xl ${activeTab === 'settings' ? 'bg-(--accent-primary)/10 text-(--accent-primary) border border-(--accent-primary)/20 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-(--bg-surface-hover)'}`} 
              title="Settings"
            >
              <Settings01Icon size={20} />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-(--bg-surface-hover)"
              title="Toggle Sidebar"
            >
              {isExpanded ? <ArrowLeft01Icon size={20} /> : <Menu01Icon size={20} />}
            </button>
          </div>
        </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          {isInitializing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-(--accent-primary)/20 border-t-(--accent-primary) rounded-full animate-spin" />
            </div>
          ) : !activeProject ? (
            <OnboardingWizard 
              initialStep={localStorage.getItem('has_completed_onboarding') === 'true' ? 3 : 1}
              onComplete={handleOnboardingComplete} 
            />
          ) : activeTab === 'settings' ? (
            <Settings />
          ) : (
            <>
              {activeTab === 'gsc' && <GscDashboard />}
              {activeTab === 'vault' && <KeywordVault />}
              {activeTab === 'competitor' && <CompetitorAnalysis />}
              {(activeTab === 'audit' || activeTab === 'audit_content') && (
                <SiteAudit 
                  activeProject={activeProject} 
                  requestedTab={activeTab === 'audit_content' ? 'content' : 'overview'} 
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
    </>
  );
}

export default App;
