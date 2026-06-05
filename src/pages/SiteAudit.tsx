import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import Database from '@tauri-apps/plugin-sql';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { 
  Alert01Icon, CheckmarkCircle01Icon, InformationCircleIcon, 
  LinkSquare02Icon, ArrowLeft01Icon, 
  Calendar01Icon, PlayIcon, Cancel01Icon, Search01Icon,
  Delete01Icon, ArrowUpRight01Icon, ArrowDownRight01Icon,
  EyeIcon, File01Icon, Settings01Icon,
  TextFontIcon, Tag01Icon, Heading01Icon, File02Icon, Image01Icon, Link01Icon, Globe02Icon
} from 'hugeicons-react';
import { Project } from '../components/ProjectSelector';
import { GuidancePanel } from '../components/GuidancePanel';

interface AuditProgress {
  url: string;
  status: string;
  pages_crawled: number;
}

interface AuditIssue {
  category: string;
  description: string;
}

interface AuditPageResult {
  url: string;
  status_code: number;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number;
  load_time_ms: number;
  issues: AuditIssue[];
}

interface AuditRecord {
  id: number;
  created_at: string;
  status: string;
}

const ScoreGauge = ({ score }: { score: number }) => {
  const radius = 38;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorClass = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="relative flex items-center justify-center shrink-0 w-[76px] h-[76px]">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="var(--bg-base)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`opacity-20 ${colorClass}`}
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`transition-all duration-1000 ease-out ${colorClass}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xl font-black tracking-tighter ${colorClass}`}>
          {score}
        </span>
      </div>
    </div>
  );
};

export function SiteAudit({ activeProject }: { activeProject: Project }) {
  const targetUrl = `https://${activeProject.domain}`;
  
  // Audits History State
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

  // Compare State
  const [compareAuditId, setCompareAuditId] = useState<number | null>(null);
  const [compareResults, setCompareResults] = useState<AuditPageResult[]>([]);

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [sitemapUrl, setSitemapUrl] = useState(`${targetUrl}/sitemap.xml`);
  const [useSitemap, setUseSitemap] = useState(true);
  const [maxPages, setMaxPages] = useState(500);

  useEffect(() => {
    setSitemapUrl(`https://${activeProject.domain}/sitemap.xml`);
  }, [activeProject.domain]);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active Crawl State
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  
  // Results State
  const [results, setResults] = useState<AuditPageResult[]>([]);

  // Master-Detail Navigation State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<AuditPageResult | null>(null);

  useEffect(() => {
    loadAudits();
  }, [activeProject.id]);

  useEffect(() => {
    if (selectedAuditId && !isAuditing) {
      loadAuditPages(selectedAuditId, false);
      
      // Auto-select the immediate previous crawl for comparison
      const currentIndex = audits.findIndex(a => a.id === selectedAuditId);
      if (currentIndex !== -1 && currentIndex + 1 < audits.length) {
        setCompareAuditId(audits[currentIndex + 1].id);
      } else {
        setCompareAuditId(null);
      }
    }
  }, [selectedAuditId]);

  useEffect(() => {
    if (compareAuditId && !isAuditing) {
      loadAuditPages(compareAuditId, true);
    } else {
      setCompareResults([]);
    }
  }, [compareAuditId]);

  const loadAudits = async () => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      const records: AuditRecord[] = await db.select(
        'SELECT id, created_at, status FROM audits WHERE project_id = $1 ORDER BY created_at DESC', 
        [activeProject.id]
      );
      setAudits(records);
      if (records.length > 0 && !isAuditing) {
        if (!selectedAuditId || !records.find(r => r.id === selectedAuditId)) {
          setSelectedAuditId(records[0].id);
        }
      } else if (records.length === 0) {
        setSelectedAuditId(null);
        setCompareAuditId(null);
        setResults([]);
        setCompareResults([]);
      }
    } catch (e) {
      console.error('Failed to load audits', e);
    }
  };

  const loadAuditPages = async (auditId: number, isCompare: boolean) => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      const pages: any[] = await db.select('SELECT * FROM audit_pages WHERE audit_id = $1', [auditId]);
      
      const loadedResults: AuditPageResult[] = pages.map(p => ({
        url: p.url,
        status_code: p.status_code,
        title: p.title,
        meta_description: p.meta_description,
        h1: p.h1,
        word_count: p.word_count,
        load_time_ms: p.load_time_ms,
        issues: JSON.parse(p.issues_json || '[]')
      }));
      
      if (isCompare) {
        setCompareResults(loadedResults);
      } else {
        setResults(loadedResults);
        setSelectedCategory(null);
        setSelectedPage(null);
      }
    } catch (e) {
      console.error('Failed to load audit pages', e);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedAuditId || isAuditing) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAudit = async () => {
    if (!selectedAuditId || isAuditing) return;

    try {
      const db = await Database.load('sqlite:seo_kit.db');
      await db.execute('DELETE FROM audits WHERE id = $1', [selectedAuditId]);
      await loadAudits(); // Will automatically select the next available audit
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to delete audit", error);
    }
  };

  const handleStartAudit = async () => {
    setIsAuditing(true);
    setResults([]);
    setCompareResults([]); // Clear compare during active crawl
    setProgress(null);
    setSelectedCategory(null);
    setSelectedPage(null);

    let unlistenProgress: UnlistenFn | null = null;
    let unlistenResult: UnlistenFn | null = null;
    let unlistenOrphan: UnlistenFn | null = null;
    let db: Database | null = null;

    try {
      db = await Database.load('sqlite:seo_kit.db');
      const res = await db.execute('INSERT INTO audits (domain, project_id, status) VALUES ($1, $2, $3)', [activeProject.domain, activeProject.id, 'running']);
      const auditId = res.lastInsertId as number;
      
      // Auto-set the new crawl as selected, and the *previous* latest as the comparison
      if (audits.length > 0) {
        setCompareAuditId(audits[0].id);
      } else {
        setCompareAuditId(null);
      }
      setSelectedAuditId(auditId);
      
      await loadAudits();

      unlistenProgress = await listen<AuditProgress>('audit-progress', (event) => {
        setProgress(event.payload);
      });

      unlistenResult = await listen<AuditPageResult>('audit-page-result', async (event) => {
        const payload = event.payload;
        try {
           await db!.execute(
            'INSERT INTO audit_pages (audit_id, url, status_code, title, meta_description, h1, word_count, load_time_ms, issues_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [auditId, payload.url, payload.status_code, payload.title, payload.meta_description, payload.h1, payload.word_count, payload.load_time_ms, JSON.stringify(payload.issues || [])]
          );
        } catch (dbErr) {
          console.error("DB Insert Error", dbErr);
        }
        
        setResults((prev) => {
          if (prev.some(p => p.url === payload.url)) return prev;
          return [...prev, payload];
        });
      });

      unlistenOrphan = await listen<{orphan_pages: string[]}>('audit-orphan-pages', async (event) => {
        const orphan_pages = event.payload.orphan_pages;
        if (orphan_pages.length === 0) return;
        
        setResults(prev => {
          return prev.map(p => {
            if (orphan_pages.includes(p.url)) {
              return {
                ...p,
                issues: [...p.issues, { category: 'Warning', description: 'Orphan Page' }]
              };
            }
            return p;
          });
        });

        if (db) {
          for (const url of orphan_pages) {
            try {
              const pages: any[] = await db.select('SELECT id, issues_json FROM audit_pages WHERE audit_id = $1 AND url = $2', [auditId, url]);
              if (pages.length > 0) {
                const issues = JSON.parse(pages[0].issues_json || '[]');
                issues.push({ category: 'Warning', description: 'Orphan Page' });
                await db.execute('UPDATE audit_pages SET issues_json = $1 WHERE id = $2', [JSON.stringify(issues), pages[0].id]);
              }
            } catch (e) {
               console.error("Failed to update orphan page issue", e);
            }
          }
        }
      });

      await invoke('run_site_audit', { 
        startUrl: targetUrl, 
        sitemapUrl: useSitemap ? (sitemapUrl || null) : null, 
        maxPages 
      });

      await db.execute('UPDATE audits SET status = $1 WHERE id = $2', ['completed', auditId]);
      await loadAudits();

    } catch (error) {
      console.error(error);
    } finally {
      setIsAuditing(false);
      setProgress(null);
      if (unlistenProgress) unlistenProgress();
      if (unlistenResult) unlistenResult();
      if (unlistenOrphan) unlistenOrphan();
    }
  };

  const calculateStats = (resultSet: AuditPageResult[]) => {
    const eGroups: Record<string, AuditPageResult[]> = {};
    const wGroups: Record<string, AuditPageResult[]> = {};
    const passed: AuditPageResult[] = [];
    let pagesWithErrorsCount = 0;
    
    let seoScoreSum = 0;
    let visiblePages = 0;

    resultSet.forEach(page => {
      // Visibility: 200 OK
      if (page.status_code >= 200 && page.status_code < 300) {
        visiblePages++;
      }

      // Authentic On-Page SEO Check
      let pageSeo = 0;
      if (page.title && page.title.trim().length > 0) pageSeo += 25;
      if (page.meta_description && page.meta_description.trim().length > 0) pageSeo += 25;
      if (page.h1 && page.h1.trim().length > 0) pageSeo += 25;
      if (page.word_count >= 300) pageSeo += 25;
      else if (page.word_count > 0) pageSeo += 10; // Thin content gets partial points
      
      seoScoreSum += pageSeo;

      if (!page.issues || page.issues.length === 0) {
        passed.push(page);
        return;
      }

      let hasError = false;
      page.issues.forEach(issue => {
        if (issue.category === 'Error') {
          hasError = true;
          if (!eGroups[issue.description]) eGroups[issue.description] = [];
          eGroups[issue.description].push(page);
        } else if (issue.category === 'Warning') {
          if (!wGroups[issue.description]) wGroups[issue.description] = [];
          wGroups[issue.description].push(page);
        }
      });
      if (hasError) pagesWithErrorsCount++;
    });

    const totalErrors = Object.values(eGroups).reduce((acc, arr) => acc + arr.length, 0);
    const totalWarnings = Object.values(wGroups).reduce((acc, arr) => acc + arr.length, 0);
    
    // Strict Authentic Formulas
    const healthScore = resultSet.length > 0 ? Math.round(((resultSet.length - pagesWithErrorsCount) / resultSet.length) * 100) : 0;
    const visibilityScore = resultSet.length > 0 ? Math.round((visiblePages / resultSet.length) * 100) : 0;
    const seoScore = resultSet.length > 0 ? Math.round(seoScoreSum / resultSet.length) : 0;

    return { 
      errorGroups: eGroups, 
      warningGroups: wGroups, 
      passedPages: passed, 
      totalErrors, 
      totalWarnings, 
      healthScore, 
      visibilityScore, 
      seoScore,
      pagesWithErrorsCount 
    };
  };

  const mainStats = useMemo(() => calculateStats(results), [results]);
  const compareStats = useMemo(() => calculateStats(compareResults), [compareResults]);

  const allIssues = useMemo(() => {
    if (!results.length) return [];
    
    const issuesList: { title: string, pages: AuditPageResult[], isError: boolean, count: number }[] = [];
    
    Object.entries(mainStats.errorGroups).forEach(([title, pages]) => {
      issuesList.push({ title, pages, isError: true, count: pages.length });
    });
    
    Object.entries(mainStats.warningGroups).forEach(([title, pages]) => {
      issuesList.push({ title, pages, isError: false, count: pages.length });
    });
    
    // Sort critical errors first, then by count descending
    return issuesList.sort((a, b) => {
      if (a.isError !== b.isError) return a.isError ? -1 : 1;
      return b.count - a.count;
    });
  }, [mainStats]);

  const renderDiffBadge = (current: number, previous: number, invertColors = false) => {
    if (!compareAuditId || isAuditing) return null;
    const diff = current - previous;
    if (diff === 0) return null;

    const isPositiveChange = invertColors ? diff < 0 : diff > 0;
    const Icon = diff > 0 ? ArrowUpRight01Icon : ArrowDownRight01Icon;
    const colorClass = isPositiveChange ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';

    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ml-2 ${colorClass}`}>
        <Icon size={12} strokeWidth={3} />
        {Math.abs(diff)}
      </span>
    );
  };

  const getSubSectionData = () => {
    if (!selectedCategory) return null;
    if (mainStats.errorGroups[selectedCategory]) {
      return { pages: mainStats.errorGroups[selectedCategory], isError: true };
    }
    if (mainStats.warningGroups[selectedCategory]) {
      return { pages: mainStats.warningGroups[selectedCategory], isError: false };
    }
    return null;
  };

  const subSectionData = getSubSectionData();

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'Z').toLocaleString('default', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] overflow-hidden relative">
      {/* Dynamic Top Navigation Bar */}
      {!selectedCategory ? (
        <div className="flex items-center justify-between p-6 pb-2 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Site Audit</span>
              <span className="font-semibold text-[var(--accent-primary)] text-lg">{activeProject.domain}</span>
            </div>
            
            <div className="h-8 w-px bg-[var(--border-strong)]"></div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Calendar01Icon size={16} className="text-zinc-400" />
                <select 
                  value={selectedAuditId || ''} 
                  onChange={e => setSelectedAuditId(Number(e.target.value))}
                  disabled={isAuditing || audits.length === 0}
                  className="bg-transparent border-none text-sm font-medium text-white focus:ring-0 cursor-pointer disabled:opacity-50 hover:bg-[var(--bg-surface)] px-2 py-1 -ml-2 rounded transition-colors"
                >
                  {audits.length === 0 && <option value="">No crawls found</option>}
                  {audits.map(a => (
                    <option key={a.id} value={a.id} className="bg-zinc-800">
                      {formatDate(a.created_at)} {a.status === 'running' ? '(Running)' : ''}
                    </option>
                  ))}
                </select>
                
                {!isAuditing && audits.length > 0 && (
                  <button 
                    onClick={handleDeleteClick}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors ml-1"
                    title="Delete Crawl"
                  >
                    <Delete01Icon size={16} />
                  </button>
                )}
              </div>
              
              {!isAuditing && audits.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 pl-[26px]">Compare with:</span>
                  <select 
                    value={compareAuditId || ''} 
                    onChange={e => setCompareAuditId(e.target.value ? Number(e.target.value) : null)}
                    className="bg-transparent border-none text-xs text-zinc-400 focus:ring-0 cursor-pointer hover:bg-[var(--bg-surface)] px-1 py-0.5 -ml-1 rounded transition-colors"
                  >
                    <option value="" className="bg-zinc-800">None</option>
                    {audits.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === selectedAuditId} className="bg-zinc-800">
                        {formatDate(a.created_at)} {a.id === selectedAuditId ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)} disabled={isAuditing} className="h-10 px-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)]">
              <Settings01Icon size={18} className="text-zinc-400" />
            </Button>
            <Button onClick={handleStartAudit} disabled={isAuditing} className="h-10 px-5 text-sm gap-2 font-semibold shadow-lg">
              <PlayIcon size={18} />
              New Crawl
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center px-6 py-4 shrink-0 z-10 relative">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors group px-2 py-1 -ml-2 rounded hover:bg-[var(--bg-surface)] z-10 relative"
          >
            <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to All Issues
          </button>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto bg-[var(--bg-base)] px-4">
              {(() => {
                const isError = subSectionData?.isError;
                const cat = selectedCategory;
                const color = isError ? "text-red-500" : "text-yellow-500";
                const size = 24;
                
                if (cat.includes("Title")) return <TextFontIcon className={color} size={size} />;
                if (cat.includes("Meta Description")) return <Tag01Icon className={color} size={size} />;
                if (cat.includes("H1")) return <Heading01Icon className={color} size={size} />;
                if (cat.includes("word count")) return <File02Icon className={color} size={size} />;
                if (cat.includes("Orphan")) return <LinkSquare02Icon className={color} size={size} />;
                if (cat.includes("Broken link")) return <Cancel01Icon className={color} size={size} />;
                if (cat.includes("Image Alt")) return <Image01Icon className={color} size={size} />;
                if (cat.includes("Canonical")) return <Link01Icon className={color} size={size} />;
                if (cat.includes("Language")) return <Globe02Icon className={color} size={size} />;
                
                return isError ? <Alert01Icon className={color} size={size} /> : <InformationCircleIcon className={color} size={size} />;
              })()}
              <span className="font-bold text-xl tracking-tight text-[var(--accent-primary)]">{selectedCategory}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-7xl mx-auto pb-32">

          {/* Empty State */}
          {!isAuditing && audits.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center p-16 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-[var(--bg-surface)] rounded-2xl flex items-center justify-center border border-[var(--border-strong)] mb-6 shadow-xl text-zinc-500">
                <Search01Icon size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-3">No crawls found</h2>
              <p className="text-[var(--text-secondary)] max-w-md mb-8">Start your first site audit for {activeProject.domain} to discover SEO issues and opportunities.</p>
              <Button onClick={handleStartAudit} className="px-8 h-12 text-base shadow-xl">Start First Crawl</Button>
            </div>
          )}

          {/* Running Crawl Indicator */}
          {isAuditing && progress && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-[var(--text-secondary)] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                  Crawling: <span className="text-white truncate max-w-md">{progress.url}</span>
                </span>
                <span className="text-[var(--accent-primary)] font-bold">{progress.pages_crawled} / {maxPages}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min((progress.pages_crawled / maxPages) * 100, 100)}%` }}></div>
              </div>
            </div>
          )}

          {/* Results Views */}
          {results.length > 0 && (
            <>
              {selectedCategory && subSectionData ? (
                /* Sub-Section Detail View */
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <p className="text-[var(--text-secondary)] text-lg mb-2">
                    Found on {subSectionData.pages.length} pages. Click a page to see guidance on how to fix this issue.
                  </p>

                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-[var(--bg-base)] text-zinc-400 border-b border-[var(--border-subtle)]">
                          <th className="p-4 font-medium">Affected URL</th>
                          <th className="p-4 font-medium w-32">Status Code</th>
                          <th className="p-4 font-medium w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subSectionData.pages.map((p, i) => (
                          <tr 
                            key={i} 
                            className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                            onClick={() => setSelectedPage(p)}
                          >
                            <td className="p-4 pr-4">
                              <span className="font-medium text-white flex items-center gap-2">
                                <LinkSquare02Icon size={16} className="text-zinc-500" />
                                {p.url.replace(targetUrl, '') || '/'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${p.status_code >= 400 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                {p.status_code}
                              </span>
                            </td>
                            <td className="p-4">
                              <Button variant="secondary" className="h-8 text-xs px-3">Review</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <GuidancePanel 
                    isOpen={!!selectedPage} 
                    onClose={() => setSelectedPage(null)} 
                    issueDescription={selectedCategory} 
                    page={selectedPage} 
                  />
                </div>
              ) : (
                /* Master Overview */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Health Score */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-[var(--border-strong)] transition-all group overflow-hidden relative">
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${mainStats.healthScore >= 80 ? 'bg-green-500' : mainStats.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CheckmarkCircle01Icon size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
                            <h3 className="text-white font-bold text-base tracking-wide">Health Score</h3>
                          </div>
                          <div className="mt-2 min-h-[24px]">
                            {renderDiffBadge(mainStats.healthScore, compareStats.healthScore) || <span className="text-xs text-zinc-500 font-medium bg-[var(--bg-base)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">No previous data</span>}
                          </div>
                        </div>
                        <ScoreGauge score={mainStats.healthScore} />
                      </div>
                      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] relative z-10">
                        <p className="text-xs text-zinc-400 leading-relaxed">Calculated from the percentage of crawled URLs that are completely free of 4xx/5xx responses and critical on-page errors.</p>
                      </div>
                    </div>

                    {/* SEO Score */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-[var(--border-strong)] transition-all group overflow-hidden relative">
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${mainStats.seoScore >= 80 ? 'bg-green-500' : mainStats.seoScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <File01Icon size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
                            <h3 className="text-white font-bold text-base tracking-wide">SEO Score</h3>
                          </div>
                          <div className="mt-2 min-h-[24px]">
                            {renderDiffBadge(mainStats.seoScore, compareStats.seoScore) || <span className="text-xs text-zinc-500 font-medium bg-[var(--bg-base)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">No previous data</span>}
                          </div>
                        </div>
                        <ScoreGauge score={mainStats.seoScore} />
                      </div>
                      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] relative z-10">
                        <p className="text-xs text-zinc-400 leading-relaxed">An authentic average based strictly on the presence of fundamental on-page ranking factors: unique titles, meta descriptions, correct H1 usage, and sufficient content depth.</p>
                      </div>
                    </div>

                    {/* Visibility Score */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-[var(--border-strong)] transition-all group overflow-hidden relative">
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${mainStats.visibilityScore >= 80 ? 'bg-green-500' : mainStats.visibilityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <div className="flex items-start justify-between relative z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <EyeIcon size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
                            <h3 className="text-white font-bold text-base tracking-wide">Indexability</h3>
                          </div>
                          <div className="mt-2 min-h-[24px]">
                            {renderDiffBadge(mainStats.visibilityScore, compareStats.visibilityScore) || <span className="text-xs text-zinc-500 font-medium bg-[var(--bg-base)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">No previous data</span>}
                          </div>
                        </div>
                        <ScoreGauge score={mainStats.visibilityScore} />
                      </div>
                      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] relative z-10">
                        <p className="text-xs text-zinc-400 leading-relaxed">The percentage of successfully accessed URLs. Pages that are broken, redirecting, or blocked by robots.txt represent lost crawl budget and lower this score.</p>
                      </div>
                    </div>
                  </div>

                  {/* Issues Table */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">All Identified Issues</h2>
                    {allIssues.length === 0 ? (
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center text-zinc-500 flex flex-col items-center shadow-sm">
                        <CheckmarkCircle01Icon size={56} className="text-green-500/50 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Great job!</h3>
                        <p>No issues or warnings were found during this audit.</p>
                      </div>
                    ) : (
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="bg-[var(--bg-base)] text-zinc-400 border-b border-[var(--border-subtle)]">
                              <th className="p-4 font-medium w-16 text-center">Severity</th>
                              <th className="p-4 font-medium">Issue Description</th>
                              <th className="p-4 font-medium w-36">Affected Pages</th>
                              <th className="p-4 font-medium w-32">Change</th>
                              <th className="p-4 font-medium w-28 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allIssues.map((issue, i) => {
                              const previousPagesCount = issue.isError 
                                ? (compareStats.errorGroups[issue.title]?.length || 0) 
                                : (compareStats.warningGroups[issue.title]?.length || 0);
                                
                              return (
                                <tr 
                                  key={i} 
                                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-hover)] transition-colors"
                                >
                                  <td className="p-4 text-center">
                                    <div className={`mx-auto w-3 h-3 rounded-full shadow-sm ${issue.isError ? 'bg-red-500' : 'bg-yellow-500'}`} title={issue.isError ? "Critical Error" : "Warning"} />
                                  </td>
                                  <td className="p-4 font-medium text-white">{issue.title}</td>
                                  <td className="p-4">
                                    <span className="font-bold text-lg">{issue.count}</span>
                                  </td>
                                  <td className="p-4">
                                    {renderDiffBadge(issue.count, previousPagesCount, true) || <span className="text-xs text-zinc-500 font-medium ml-2">-</span>}
                                  </td>
                                  <td className="p-4 text-right">
                                    <Button variant="secondary" className="h-8 text-xs px-4 ml-auto" onClick={() => setSelectedCategory(issue.title)}>View Pages</Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Crawl Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <h2 className="text-lg font-bold">Crawl Settings</h2>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <Cancel01Icon size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)] block">Target Domain</label>
                <div className="px-4 py-2.5 bg-[var(--bg-base)] rounded-lg text-zinc-300 font-medium border border-[var(--border-subtle)]">
                  {targetUrl}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text-secondary)] block">Max Pages to Crawl</label>
                <Input
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="useSitemap"
                    checked={useSitemap}
                    onChange={(e) => setUseSitemap(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                  />
                  <label htmlFor="useSitemap" className="text-sm font-medium cursor-pointer">Use XML Sitemap</label>
                </div>
                
                {useSitemap && (
                  <Input
                    type="url"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="https://example.com/sitemap.xml"
                    className="w-full"
                  />
                )}
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex justify-end gap-3">
              <Button onClick={() => setIsSettingsModalOpen(false)}>Save Settings</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[var(--bg-surface)] border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Alert01Icon size={32} />
              </div>
              <h2 className="text-xl font-bold">Delete this Crawl?</h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Are you sure you want to permanently delete this crawl and all its associated page data? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col sm:flex-row gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={confirmDeleteAudit}>Delete Crawl</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
