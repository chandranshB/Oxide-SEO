import { useState, useEffect } from 'react';
import { KeywordVault } from './KeywordVault';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { GscDashboard } from './GscDashboard';
import { SiteAudit } from './SiteAudit';
import { Button } from '../components/Button';
import { Search01Icon, Menu01Icon, ArrowLeft01Icon, File01Icon, AnalyticsUpIcon, WebDesign01Icon } from 'hugeicons-react';
import { Titlebar } from '../components/Titlebar';
import { ProjectSelector, Project } from '../components/ProjectSelector';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'vault' | 'competitor' | 'gsc' | 'audit'>('audit');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('app-navigate' as any, handleNavigate);
    return () => window.removeEventListener('app-navigate' as any, handleNavigate);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-(--bg-base) text-white overflow-hidden w-full">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Side Panel Island */}
        <aside 
          className={`relative transition-all duration-300 ease-in-out my-4 ml-4 mr-2 rounded-2xl border border-(--border-strong) bg-(--bg-surface) flex flex-col shadow-lg z-10 ${isExpanded ? 'w-64' : 'w-[84px]'}`}
        >
          <div className={`p-6 border-b border-(--border-strong) flex items-center transition-all duration-300 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: '"Press Start 2P", system-ui' }}>
                  <span className="text-(--accent-primary)">Ox</span>ide SEO
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-medium">by shan</p>
              </div>
            )}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-white transition-colors shrink-0 focus:outline-none p-1 rounded-md hover:bg-(--bg-surface-hover)"
              title="Toggle Sidebar"
            >
              {isExpanded ? <ArrowLeft01Icon size={20} /> : <Menu01Icon size={24} />}
            </button>
          </div>
          
          <ProjectSelector activeProject={activeProject} setActiveProject={setActiveProject} isExpanded={isExpanded} />
          
          <nav className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
            <Button 
              variant={activeTab === 'gsc' ? 'secondary' : 'ghost'} 
              className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
              onClick={() => setActiveTab('gsc')}
              title="Search Console"
            >
              <span className="flex items-center justify-center shrink-0">
                <AnalyticsUpIcon size={20} />
              </span>
              {isExpanded && <span className="ml-3 truncate font-medium">Search Console</span>}
            </Button>

            <Button 
              variant={activeTab === 'vault' ? 'secondary' : 'ghost'} 
              className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
              onClick={() => setActiveTab('vault')}
              title="Keyword Scraper"
            >
              <span className="flex items-center justify-center shrink-0">
                <Search01Icon size={20} />
              </span>
              {isExpanded && <span className="ml-3 truncate font-medium">Keyword Scraper</span>}
            </Button>

            <Button 
              variant={activeTab === 'competitor' ? 'secondary' : 'ghost'} 
              className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
              onClick={() => setActiveTab('competitor')}
              title="Competitor Analysis"
            >
              <span className="flex items-center justify-center shrink-0">
                <File01Icon size={20} />
              </span>
              {isExpanded && <span className="ml-3 truncate font-medium">Competitor Analysis</span>}
            </Button>

            <Button 
              variant={activeTab === 'audit' ? 'secondary' : 'ghost'} 
              className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
              onClick={() => setActiveTab('audit')}
              title="Site Audit"
            >
              <span className="flex items-center justify-center shrink-0">
                <WebDesign01Icon size={20} />
              </span>
              {isExpanded && <span className="ml-3 truncate font-medium">Site Audit</span>}
            </Button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          {!activeProject ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-(--bg-surface) rounded-2xl flex items-center justify-center border border-(--border-strong) mb-6 shadow-xl">
                <WebDesign01Icon size={48} className="text-(--accent-primary)" />
              </div>
              <h2 className="text-3xl font-bold mb-3 tracking-tight">
                Welcome to <span style={{ fontFamily: '"Press Start 2P", system-ui' }}><span className="text-(--accent-primary)">Ox</span>ide SEO</span>
              </h2>
              <p className="text-(--text-secondary) max-w-md mb-8 text-lg">Your new centralized hub for local, privacy-first SEO tools. Please add your first website project using the folder icon in the sidebar to get started.</p>
            </div>
          ) : (
            <>
              {activeTab === 'gsc' && <GscDashboard />}
              {activeTab === 'vault' && <KeywordVault />}
              {activeTab === 'competitor' && <CompetitorAnalysis />}
              {activeTab === 'audit' && <SiteAudit activeProject={activeProject} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
