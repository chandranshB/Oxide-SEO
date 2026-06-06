import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { Search01Icon, AnalyticsUpIcon, WebDesign01Icon } from 'hugeicons-react';
import { KeywordTable } from '../components/KeywordTable';
export const KeywordVault: React.FC = () => {
  const [seedKeyword, setSeedKeyword] = useState(() => sessionStorage.getItem('kv_seed') || '');
  const [mode, setMode] = useState<'quick' | 'deep'>(() => (sessionStorage.getItem('kv_mode') as any) || 'quick');
  const [isScraping, setIsScraping] = useState(false);
  const [result, setResult] = useState<any>(() => {
    const saved = sessionStorage.getItem('kv_result');
    return saved ? JSON.parse(saved) : null;
  });
  const [viewMode, setViewMode] = useState<'clusters' | 'table'>(() => (sessionStorage.getItem('kv_view') as any) || 'clusters');
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('kv_cluster');
    return saved ? JSON.parse(saved) : null;
  });
  const { success, error: toastError } = useToast();

  // Persist state changes
  useEffect(() => {
    sessionStorage.setItem('kv_seed', seedKeyword);
    sessionStorage.setItem('kv_mode', mode);
    sessionStorage.setItem('kv_view', viewMode);
    if (result) sessionStorage.setItem('kv_result', JSON.stringify(result));
    else sessionStorage.removeItem('kv_result');
    if (selectedClusterId !== null) sessionStorage.setItem('kv_cluster', JSON.stringify(selectedClusterId));
    else sessionStorage.removeItem('kv_cluster');
  }, [seedKeyword, mode, viewMode, result, selectedClusterId]);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab === 'vault' && e.detail?.payload?.keyword) {
        setSeedKeyword(e.detail.payload.keyword);
        setTimeout(() => {
          document.getElementById('vault-scrape-btn')?.click();
        }, 50);
      }
    };
    window.addEventListener('app-navigate' as any, handleNavigate);
    return () => window.removeEventListener('app-navigate' as any, handleNavigate);
  }, []);

  const handleScrape = async () => {
    if (!seedKeyword.trim()) return;
    setIsScraping(true);
    setResult(null);
    setSelectedClusterId(null);
    try {
      const data = await invoke('discover_keywords', { seed: seedKeyword, mode });
      setResult(data);
      if (data && (data as any).clusters.length > 0) {
        setSelectedClusterId((data as any).clusters[0].id);
      } else if (data && (data as any).unclustered.length > 0) {
        setSelectedClusterId(-1);
      }
      success(`Discovered ${(data as any).total_keywords} keywords!`);
    } catch (e) {
      console.error(e);
      toastError("Discovery Error: " + e);
    } finally {
      setIsScraping(false);
    }
  };

  const handleClear = () => {
    setSeedKeyword('');
    setResult(null);
    setSelectedClusterId(null);
    setIsScraping(false);
  };

  const getTopOpportunity = () => {
    if (!result || !result.clusters) return null;
    let top: any = null;
    result.clusters.forEach((c: any) => {
      c.keywords.forEach((kw: any) => {
        if (!top || kw.opportunity > top.opportunity) {
          top = kw;
        }
      });
    });
    return top;
  };

  const topKeyword = getTopOpportunity();

  const handleCopyAll = () => {
    if (!result) return;
    let allKws: any[] = [];
    result.clusters.forEach((c: any) => { allKws = [...allKws, ...c.keywords]; });
    allKws = [...allKws, ...result.unclustered];
    
    // Create CSV
    const headers = ['Keyword', 'Intent', 'Difficulty', 'Opportunity', 'Words', 'Cluster'];
    const rows = allKws.map(kw => [
      `"${kw.keyword.replace(/"/g, '""')}"`,
      kw.intent,
      kw.difficulty,
      kw.opportunity,
      kw.word_count,
      kw.cluster_label || 'Unclustered'
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    navigator.clipboard.writeText(csv);
    success('Copied CSV to clipboard!');
  };

  const allKeywords = result ? [
    ...result.clusters.flatMap((c: any) => c.keywords.map((k:any) => ({...k, cluster_label: c.label}))),
    ...result.unclustered.map((k:any) => ({...k, cluster_label: 'Unclustered'}))
  ] : [];

  const hasStarted = result || isScraping;

  return (
    <div className={`p-8 max-w-6xl w-full mx-auto h-full flex flex-col overflow-y-auto overflow-x-hidden ${!hasStarted ? 'justify-center items-center' : ''}`}>
      <header className={`shrink-0 transition-all duration-500 ${hasStarted ? 'mb-10 flex justify-between items-end w-full' : 'mb-12 flex flex-col items-center text-center'}`}>
        <div>
          <h1 className={`font-medium tracking-tight text-white flex items-center justify-center gap-3 transition-all duration-500 ${hasStarted ? 'text-[26px] md:text-[28px] mb-1' : 'text-4xl md:text-5xl mb-4'}`}>
            <AnalyticsUpIcon size={hasStarted ? 28 : 48} className="text-[var(--accent-primary)]" />
            Keyword Intelligence
          </h1>
          <p className={`text-zinc-500 transition-all duration-500 ${hasStarted ? 'text-[15px]' : 'text-lg max-w-lg'}`}>Smart discovery, clustering, and opportunity scoring.</p>
        </div>
      </header>

      {/* Unified Search Control Panel */}
      <div className={`shrink-0 transition-all duration-500 w-full ${hasStarted ? 'mb-8' : 'max-w-3xl'}`}>
        {hasStarted && (
          <label className="block text-lg font-medium text-white mb-3 ml-2 tracking-wide animate-fade-in">
            What topic do you want to rank for?
          </label>
        )}
        
        <div className={`w-full relative flex flex-col md:flex-row items-center bg-[var(--bg-surface)] border rounded-2xl p-1.5 transition-all duration-500 ${seedKeyword.trim() ? 'border-[var(--accent-primary)]/50 shadow-sm' : 'border-[var(--border-strong)] focus-within:border-zinc-500'} ${!hasStarted ? 'shadow-2xl shadow-black/40 scale-105 mt-4' : ''}`}>
          
          <div className="flex items-center flex-1 w-full pl-4 pr-2">
            <Search01Icon size={24} className={`shrink-0 transition-colors duration-300 ${seedKeyword.trim() ? 'text-[var(--accent-primary)]' : 'text-zinc-500'}`} />
            <input 
              type="text"
              placeholder="e.g. coffee grinder, how to learn python..."
              className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-zinc-500 py-3.5 px-4 w-full"
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            />
          </div>

          <div className="hidden md:block h-8 w-px bg-[var(--border-strong)] mx-3"></div>

          <div className="flex items-center w-full md:w-auto gap-3 p-2 md:p-0 mt-2 md:mt-0 border-t md:border-t-0 border-[var(--border-subtle)] md:border-t-transparent pt-3 md:pt-0">
            
            {/* Minimal Scan Toggle */}
            <div className="flex bg-[#18181b] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button 
                onClick={() => setMode('quick')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${mode === 'quick' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                Fast Scan
              </button>
              <button 
                onClick={() => setMode('deep')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${mode === 'deep' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                Deep Dive
              </button>
            </div>

            {hasStarted && (
              <button 
                onClick={handleClear} 
                className="h-[46px] px-5 rounded-xl text-[14px] font-medium text-zinc-400 hover:text-white bg-transparent hover:bg-white/5 border border-transparent transition-all ml-1"
              >
                Clear
              </button>
            )}

            <Button 
              id="vault-scrape-btn" 
              onClick={handleScrape} 
              disabled={isScraping || !seedKeyword.trim()} 
              className="h-[46px] px-8 rounded-xl text-base font-semibold"
            >
              {isScraping ? 'Discovering...' : 'Discover'}
            </Button>
          </div>
        </div>
      </div>

      {/* Results Dashboard */}
      {isScraping && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border-4 border-[var(--border-subtle)] border-t-[var(--accent-primary)] rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 animate-pulse text-[var(--accent-primary)]">Analyzing & Clustering...</h2>
          <p className="text-zinc-400 max-w-sm">This may take a few moments depending on the discovery mode. We're scraping suggestions, scoring intent, and computing opportunities entirely on-device.</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-6 md:gap-8 pb-12 min-h-0 animate-fade-in flex-1">
          {/* Minimalist Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {/* Metric 1 */}
            <div className="p-6 flex flex-col justify-center bg-[#121214] border border-[var(--border-subtle)] rounded-2xl relative overflow-hidden group">
              <p className="text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Keywords Found</p>
              <p className="text-4xl font-semibold text-white tracking-tight">{result.total_keywords}</p>
              <p className="text-[13px] text-[var(--accent-primary)] mt-2 font-medium">{result.clusters.length} topic clusters</p>
            </div>
            
            {/* Metric 2 */}
            <div className="p-6 flex flex-col justify-center bg-[#121214] border border-[var(--border-subtle)] rounded-2xl relative overflow-hidden group">
              <p className="text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">Search Intent</p>
              <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-3 bg-white/5">
                <div style={{width: `${(result.intent_breakdown.informational / result.total_keywords)*100}%`}} className="bg-blue-500" title="Informational"></div>
                <div style={{width: `${(result.intent_breakdown.commercial / result.total_keywords)*100}%`}} className="bg-purple-500" title="Commercial"></div>
                <div style={{width: `${(result.intent_breakdown.transactional / result.total_keywords)*100}%`}} className="bg-[var(--accent-primary)]" title="Transactional"></div>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 font-medium tracking-wide">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Info: {result.intent_breakdown.informational}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>Comm: {result.intent_breakdown.commercial}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>Trans: {result.intent_breakdown.transactional}</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-6 flex flex-col justify-center bg-[#121214] border border-[var(--border-subtle)] rounded-2xl relative overflow-hidden group">
              <p className="text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Top Cluster</p>
              {result.clusters.length > 0 ? (
                <>
                  <p className="text-[20px] font-semibold line-clamp-2 text-white capitalize leading-tight" title={result.clusters[0].label}>{result.clusters[0].label}</p>
                  <p className="text-[13px] text-zinc-500 mt-2"><span className="text-zinc-300 font-medium">{result.clusters[0].keyword_count}</span> keywords • <span className="text-[var(--accent-primary)] font-medium">{result.clusters[0].avg_opportunity}</span> opp score</p>
                </>
              ) : (
                <p className="text-sm text-zinc-600 italic">None</p>
              )}
            </div>

            {/* Metric 4 */}
            <div className="p-6 flex flex-col justify-center bg-[var(--accent-primary)]/[0.02] border border-[var(--accent-primary)]/20 rounded-2xl relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 p-3 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <WebDesign01Icon size={120} />
              </div>
              <p className="text-[12px] uppercase tracking-wider text-[var(--accent-primary)] font-semibold mb-2 relative z-10">
                Top Opportunity
              </p>
              {topKeyword ? (
                <div className="relative z-10">
                  <p className="text-[20px] font-semibold line-clamp-2 text-white leading-tight" title={topKeyword.keyword}>{topKeyword.keyword}</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[12px] font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                      {topKeyword.opportunity}
                    </span>
                    <span className="text-[12px] text-zinc-400 font-medium">{topKeyword.difficulty_label}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 italic relative z-10">None</p>
              )}
            </div>
          </div>

          {/* Sleek Toggles & Actions */}
          <div className="flex justify-between items-center mt-2 shrink-0">
            <div className="flex bg-[#121214] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button 
                onClick={() => setViewMode('clusters')}
                className={`px-5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${viewMode === 'clusters' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
              >
                Group by Topic
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${viewMode === 'table' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
              >
                All Keywords
              </button>
            </div>
            
            <button 
              onClick={handleCopyAll}
              className="text-[13px] font-medium text-zinc-300 hover:text-white px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10"
            >
              Copy All (CSV)
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0 mt-2">
            {viewMode === 'clusters' ? (
              <div className="flex flex-col md:flex-row gap-6 h-full min-h-[500px]">
                {/* Left Sidebar: Cluster List */}
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 pb-4 max-h-64 md:max-h-none">
                  {result.clusters.map((c: any) => (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedClusterId(c.id)}
                      className={`flex items-center justify-between py-4 px-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        selectedClusterId === c.id 
                          ? 'bg-[var(--accent-primary)]/[0.05] border-[var(--accent-primary)]/30 shadow-[0_2px_10px_rgba(20,184,166,0.05)]' 
                          : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className={`text-[15px] font-medium truncate capitalize ${selectedClusterId === c.id ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}>
                          {c.label}
                        </span>
                        <span className="text-[13px] text-zinc-500 mt-1">
                          {c.keyword_count} keywords
                        </span>
                      </div>
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[12px] font-bold border ${selectedClusterId === c.id ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20' : 'bg-[#18181b] text-zinc-400 border-white/5'}`}>
                        {c.avg_opportunity}
                      </span>
                    </div>
                  ))}
                  {result.unclustered.length > 0 && (
                    <div 
                      onClick={() => setSelectedClusterId(-1)}
                      className={`flex items-center justify-between py-4 px-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        selectedClusterId === -1 
                          ? 'bg-[var(--accent-primary)]/[0.05] border-[var(--accent-primary)]/30' 
                          : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className={`text-[15px] font-medium truncate capitalize ${selectedClusterId === -1 ? 'text-[var(--accent-primary)]' : 'text-zinc-300'}`}>
                          Unclustered Ideas
                        </span>
                        <span className="text-[13px] text-zinc-500 mt-1">
                          {result.unclustered.length} keywords
                        </span>
                      </div>
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[12px] font-bold border ${selectedClusterId === -1 ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20' : 'bg-[#18181b] text-zinc-400 border-white/5'}`}>
                        {Math.round(result.unclustered.reduce((acc:number, k:any) => acc + k.opportunity, 0) / result.unclustered.length) || 0}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Area: Selected Cluster Details */}
                <div className="flex-1 h-full flex flex-col min-h-0 min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[#121214]/30 overflow-hidden">
                  <div className="px-6 py-5 border-b border-[var(--border-subtle)]/50 flex justify-between items-center shrink-0">
                    <div>
                      <h2 className="text-[18px] font-medium capitalize text-white">
                        {selectedClusterId === -1 ? 'Unclustered Ideas' : result.clusters.find((c:any) => c.id === selectedClusterId)?.label}
                      </h2>
                      <p className="text-[13px] text-zinc-400 mt-1">
                        {selectedClusterId === -1 ? result.unclustered.length : result.clusters.find((c:any) => c.id === selectedClusterId)?.keyword_count} keywords
                      </p>
                    </div>
                    <button onClick={() => {
                      const kws = selectedClusterId === -1 ? result.unclustered : result.clusters.find((c:any) => c.id === selectedClusterId)?.keywords || [];
                      const text = kws.map((k:any) => k.keyword).join('\n');
                      navigator.clipboard.writeText(text);
                      success('Copied keywords to clipboard!');
                    }} className="text-[12px] font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                      Copy Content
                    </button>
                  </div>
                  <div className="flex-1 p-0 overflow-hidden">
                    <KeywordTable 
                      keywords={selectedClusterId === -1 ? result.unclustered : result.clusters.find((c:any) => c.id === selectedClusterId)?.keywords || []} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-hidden flex flex-col min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[#121214]/30">
                <KeywordTable keywords={allKeywords} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
