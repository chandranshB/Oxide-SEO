import React, { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { GscConnectModal } from '../components/GscConnectModal';
import { fetchAndSyncGscData, fetchGscSites } from '../utils/gscApi';
import { Delete01Icon, AnalyticsUpIcon, CursorMagicSelection01Icon, EyeIcon, Search01Icon, File01Icon } from 'hugeicons-react';

interface GscMetric {
  id: number;
  keyword: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  average_position: number;
}

const CustomSiteSelect: React.FC<{
  options: string[];
  value: string;
  onChange: (val: string) => void;
}> = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatSite = (site: string) => {
    return site.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/\/$/, '');
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-all border border-[var(--border-strong)] rounded-xl px-4 py-2.5 cursor-pointer min-w-[260px] shadow-sm"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-5 h-5 rounded-full bg-[var(--bg-base)] flex items-center justify-center flex-shrink-0 text-zinc-400 border border-[var(--border-subtle)]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          </div>
          <span className="text-sm font-medium text-white truncate leading-none mt-[-1px]">
            {value ? formatSite(value) : 'Select a property'}
          </span>
        </div>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full max-h-[320px] overflow-y-auto bg-[#18181b] border border-[var(--border-strong)] rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1">
            {options.map((option) => (
              <div 
                key={option}
                onClick={() => { onChange(option); setIsOpen(false); }}
                className={`px-3 py-2.5 my-0.5 cursor-pointer flex items-center justify-between transition-colors rounded-lg ${value === option ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'text-zinc-300 hover:bg-[var(--bg-surface-hover)]'}`}
              >
                <span className="text-sm font-medium truncate">{formatSite(option)}</span>
                {value === option && (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const GscDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<GscMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(!!localStorage.getItem('gsc_access_token'));
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const { success, error: toastError } = useToast();

  const loadMetrics = async () => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      const result = await db.select<GscMetric[]>(
        'SELECT * FROM gsc_metrics WHERE average_position >= 11 AND average_position <= 20 ORDER BY impressions DESC'
      );
      setMetrics(result);
    } catch (error) {
      console.error("Database error:", error);
      toastError("Database Error: " + error);
    }
  };

  useEffect(() => {
    async function initDb() {
      await loadMetrics();
      setLoading(false);
    }
    initDb();
  }, []);

  useEffect(() => {
    async function loadSites() {
      if (isConnected) {
        try {
          const sites = await fetchGscSites();
          setAvailableSites(sites);
          if (sites.length > 0) setSelectedSite(sites[0]);
        } catch (e: any) {
          console.error(e);
          if (e.message?.includes('Not authenticated')) setIsConnected(false);
        }
      }
    }
    loadSites();
  }, [isConnected]);

  const handleSyncGsc = async () => {
    if (!selectedSite) {
      toastError("Please select a site first.");
      return;
    }
    setIsSyncing(true);
    try {
      await fetchAndSyncGscData(selectedSite);
      await loadMetrics();
      success("Successfully synced latest 30 days of data from GSC!");
    } catch (e: any) {
      console.error(e);
      toastError(e.message || "Failed to sync GSC data");
      if (e.message?.includes('Not authenticated')) {
        setIsConnected(false);
        setIsModalOpen(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteMetric = async (id: number) => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      await db.execute('DELETE FROM gsc_metrics WHERE id = $1', [id]);
      setMetrics(metrics.filter(m => m.id !== id));
      success("Keyword deleted.");
    } catch (e) {
      console.error(e);
      toastError("Delete Error: " + e);
    }
  };

  const clearAllData = async () => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      await db.execute('DELETE FROM gsc_metrics');
      setMetrics([]);
      success("All data cleared.");
    } catch (e) {
      console.error(e);
      toastError("Clear Data Error: " + e);
    }
  };

  // Calculate Aggregates
  const totalKeywords = metrics.length;
  const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const avgPos = totalKeywords > 0 ? (metrics.reduce((sum, m) => sum + m.average_position, 0) / totalKeywords).toFixed(1) : '0.0';

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-base)] overflow-hidden relative ${!isConnected ? 'justify-center items-center' : ''}`}>
      <div className={`flex-1 overflow-y-auto p-8 relative w-full ${!isConnected ? 'flex flex-col justify-center' : ''}`}>
        <div className={`mx-auto ${isConnected ? 'max-w-6xl pb-32' : 'w-full max-w-3xl'}`}>
          {isConnected && (
            <header className="flex justify-between items-start mb-8 pb-6 border-b border-[var(--border-strong)]">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Search Console Dashboard</h1>
          <p className="text-zinc-400">
            {isConnected ? 'Striking Distance Opportunities (Positions 11-20)' : 'Google Search Console Integration'}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {isConnected && (
            <>
              <div className="flex gap-3 items-center">
                {availableSites.length > 0 ? (
                  <CustomSiteSelect 
                    options={availableSites} 
                    value={selectedSite} 
                    onChange={setSelectedSite} 
                  />
                ) : (
                  <div className="bg-[var(--bg-surface)] px-4 py-2.5 rounded-xl border border-[var(--border-strong)]">
                    <span className="text-sm text-zinc-500">No properties found</span>
                  </div>
                )}
                <Button onClick={handleSyncGsc} className="h-[42px] px-6 shadow-lg shadow-[var(--accent-primary)]/20" disabled={isSyncing || !selectedSite}>
                  {isSyncing ? 'Syncing...' : 'Sync from GSC'}
                </Button>
              </div>
              <Button onClick={clearAllData} variant="danger" size="sm">Clear All</Button>
            </>
          )}
        </div>
      </header>
      )}
      
      <GscConnectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConnected={async () => {
          setIsConnected(true);
          try {
            const sites = await fetchGscSites();
            setAvailableSites(sites);
            if (sites.length > 0) {
              setSelectedSite(sites[0]);
              setIsSyncing(true);
              try {
                await fetchAndSyncGscData(sites[0]);
                await loadMetrics();
                success("Successfully synced latest 30 days of data from GSC!");
              } catch (e: any) {
                toastError(e.message || "Failed to sync GSC data");
              } finally {
                setIsSyncing(false);
              }
            } else {
              toastError("No verified Search Console sites found on this account.");
            }
          } catch (e: any) {
            console.error(e);
            toastError("Failed to fetch sites: " + e.message);
          }
        }}
      />

      {/* Syncing Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Syncing Search Console Data</h2>
          <p className="text-zinc-300 max-w-sm text-center">
            Securely downloading and processing up to 5,000 keyword rows...
          </p>
        </div>
      )}

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500 relative w-full max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white flex items-center justify-center gap-4 mb-4">
            <AnalyticsUpIcon size={48} className="text-emerald-400" />
            Search Console
          </h1>
          <p className="text-zinc-500 text-lg mb-12">
            Uncover <span className="text-zinc-300 font-medium">striking distance</span> keywords—pages ranking on page 2 that can easily be pushed to page 1 for massive traffic gains.
          </p>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative h-14 px-10 bg-white hover:bg-zinc-100 text-zinc-900 text-lg font-semibold rounded-2xl transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)] hover:-translate-y-1 overflow-hidden inline-flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="flex flex-col gap-3 !p-5 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] border-[var(--border-strong)]">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] mb-2">
            <AnalyticsUpIcon size={20} />
          </div>
          <p className="text-sm font-medium text-zinc-400">Total Keywords</p>
          <h2 className="text-3xl font-bold tracking-tight">{totalKeywords}</h2>
        </Card>
        
        <Card className="flex flex-col gap-3 !p-5 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] border-[var(--border-strong)]">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
            <CursorMagicSelection01Icon size={20} />
          </div>
          <p className="text-sm font-medium text-zinc-400">Est. Clicks (30d)</p>
          <h2 className="text-3xl font-bold tracking-tight">{totalClicks.toLocaleString()}</h2>
        </Card>

        <Card className="flex flex-col gap-3 !p-5 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] border-[var(--border-strong)]">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2">
            <EyeIcon size={20} />
          </div>
          <p className="text-sm font-medium text-zinc-400">Total Impressions</p>
          <h2 className="text-3xl font-bold tracking-tight">{totalImpressions.toLocaleString()}</h2>
        </Card>

        <Card className="flex flex-col gap-3 !p-5 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] border-[var(--border-strong)]">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">Avg. Position</p>
          <h2 className="text-3xl font-bold tracking-tight">{avgPos}</h2>
        </Card>
      </div>

      <Card className="flex flex-col border-none shadow-xl bg-[var(--bg-surface)]/50 backdrop-blur-sm">
        <div className="p-6 border-b border-[var(--border-strong)] flex justify-between items-center">
          <h2 className="text-lg font-semibold">Striking Distance Opportunities</h2>
          <span className="text-xs text-zinc-500">Sorted by Highest Impressions</span>
        </div>
        {loading ? (
          <p className="text-zinc-400 p-12 text-center">Loading metrics...</p>
        ) : metrics.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-base)] border border-[var(--border-strong)] flex items-center justify-center mx-auto mb-4 text-zinc-500">
              <AnalyticsUpIcon size={28} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No keywords found</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">Connect your Google Search Console account and sync data to discover your low-hanging fruit.</p>
            {!isConnected ? (
              <Button onClick={() => setIsModalOpen(true)}>
                Connect Search Console
              </Button>
            ) : (
              <Button onClick={handleSyncGsc} disabled={isSyncing || !selectedSite}>
                {isSyncing ? 'Syncing...' : 'Sync Data Now'}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-strong)] text-zinc-400 text-xs uppercase tracking-wider bg-[var(--bg-base)]/50">
                  <th className="py-4 px-6 font-semibold rounded-tl-xl">Keyword</th>
                  <th className="py-4 px-6 font-semibold">Page</th>
                  <th className="py-4 px-6 font-semibold">Clicks</th>
                  <th className="py-4 px-6 font-semibold">Impressions</th>
                  <th className="py-4 px-6 font-semibold min-w-[120px]">CTR</th>
                  <th className="py-4 px-6 font-semibold">Avg. Pos</th>
                  <th className="py-4 px-6 font-semibold w-12 rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] transition-colors group">
                    <td className="py-4 px-6 font-medium text-white">{m.keyword}</td>
                    <td className="py-4 px-6 text-zinc-400 truncate max-w-[200px]" title={m.page}>{m.page.replace('https://', '').replace('http://', '')}</td>
                    <td className="py-4 px-6 font-medium text-zinc-300">{m.clicks}</td>
                    <td className="py-4 px-6 font-medium text-zinc-300">{m.impressions}</td>
                    <td className="py-4 px-6 relative">
                      <div className="flex items-center gap-3">
                        <span className="w-10 font-medium text-zinc-300">{m.ctr.toFixed(1)}%</span>
                        <div className="h-1.5 w-16 bg-[var(--bg-base)] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-[var(--accent-primary)]" 
                            style={{ width: `${Math.min(100, m.ctr * 10)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={m.average_position <= 15 ? 'success' : 'warning'} className="font-semibold px-2.5 py-1">
                        {m.average_position.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab: 'vault', payload: { keyword: m.keyword } } }))}
                          className="text-zinc-400 hover:text-[var(--accent-primary)] p-1.5 rounded-md hover:bg-[var(--accent-primary)]/10"
                          title="Research Keyword"
                        >
                          <Search01Icon size={16} />
                        </button>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab: 'competitor', payload: { page: m.page, keyword: m.keyword } } }))}
                          className="text-zinc-400 hover:text-blue-400 p-1.5 rounded-md hover:bg-blue-500/10"
                          title="Analyze SEO"
                        >
                          <File01Icon size={16} />
                        </button>
                        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1"></div>
                        <button 
                          onClick={() => deleteMetric(m.id)}
                          className="text-zinc-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Delete01Icon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </Card>
        </>
      )}
        </div>
      </div>
    </div>
  );
};
