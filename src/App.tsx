import { useState, useEffect } from 'react';
import { KeywordVault } from './pages/KeywordVault';
import { CompetitorAnalysis } from './pages/CompetitorAnalysis';
import { GscDashboard } from './pages/GscDashboard';
import { Button } from './components/Button';
import { Search01Icon, Menu01Icon, ArrowLeft01Icon, File01Icon, AnalyticsUpIcon } from 'hugeicons-react';
import { Titlebar } from './components/Titlebar';

function App() {
  const [activeTab, setActiveTab] = useState<'vault' | 'competitor' | 'gsc'>('gsc');
  const [isExpanded, setIsExpanded] = useState(true);

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
    <div className="flex flex-col h-screen bg-[var(--bg-base)] text-white overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Side Panel Island */}
        <aside 
          className={`relative transition-all duration-300 ease-in-out my-4 ml-4 mr-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] flex flex-col shadow-lg z-10 ${isExpanded ? 'w-64' : 'w-[84px]'}`}
        >
          <div className={`p-6 border-b border-[var(--border-strong)] flex items-center transition-all duration-300 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                <h1 className="text-xl font-bold tracking-tight text-[var(--accent-primary)]">Oxide SEO</h1>
                <p className="text-xs text-zinc-400 mt-1 font-medium">by shan</p>
              </div>
            )}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-white transition-colors flex-shrink-0 focus:outline-none p-1 rounded-md hover:bg-[var(--bg-surface-hover)]"
              title="Toggle Sidebar"
            >
              {isExpanded ? <ArrowLeft01Icon size={20} /> : <Menu01Icon size={24} />}
            </button>
          </div>
          
          <nav className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
            <Button 
              variant={activeTab === 'gsc' ? 'secondary' : 'ghost'} 
              className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${!isExpanded ? 'w-12 h-12 p-0 justify-center rounded-xl mx-auto' : 'w-full justify-start px-4'}`}
              onClick={() => setActiveTab('gsc')}
              title="Search Console"
            >
              <span className="flex items-center justify-center flex-shrink-0">
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
              <span className="flex items-center justify-center flex-shrink-0">
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
              <span className="flex items-center justify-center flex-shrink-0">
                <File01Icon size={20} />
              </span>
              {isExpanded && <span className="ml-3 truncate font-medium">Competitor Analysis</span>}
            </Button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative">
          {activeTab === 'gsc' && <GscDashboard />}
          {activeTab === 'vault' && <KeywordVault />}
          {activeTab === 'competitor' && <CompetitorAnalysis />}
        </main>
      </div>
    </div>
  );
}

export default App;
