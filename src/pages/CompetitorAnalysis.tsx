import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';
import { Search01Icon } from 'hugeicons-react';

interface Heading {
  tag: string;
  text: string;
}

interface KeywordFreq {
  word: string;
  count: number;
}

interface CompetitorData {
  title: string;
  meta_description: string;
  word_count: number;
  headings: Heading[];
  top_keywords: KeywordFreq[];
}

export const CompetitorAnalysis: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  
  const [targetData, setTargetData] = useState<CompetitorData | null>(null);
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
  
  const [isScraping, setIsScraping] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab === 'competitor' && e.detail?.payload) {
        if (e.detail.payload.page) {
          setTargetUrl(e.detail.payload.page);
        }
      }
    };
    window.addEventListener('app-navigate' as any, handleNavigate);
    return () => window.removeEventListener('app-navigate' as any, handleNavigate);
  }, []);

  const handleScrape = async () => {
    if (!targetUrl.trim() && !competitorUrl.trim()) return;
    setIsScraping(true);
    setTargetData(null);
    setCompetitorData(null);
    
    try {
      const promises = [];
      if (targetUrl.trim()) {
        promises.push(
          invoke<CompetitorData>('scrape_competitor_outline', { url: targetUrl })
            .then(res => setTargetData(res))
            .catch(e => { console.error(e); toastError("Failed to scrape target: " + e); })
        );
      }
      if (competitorUrl.trim()) {
        promises.push(
          invoke<CompetitorData>('scrape_competitor_outline', { url: competitorUrl })
            .then(res => setCompetitorData(res))
            .catch(e => { console.error(e); toastError("Failed to scrape competitor: " + e); })
        );
      }
      
      await Promise.all(promises);
      if (targetUrl.trim() || competitorUrl.trim()) {
        success("Analysis complete!");
      }
    } catch (e) {
      console.error(e);
      toastError("An error occurred during analysis.");
    } finally {
      setIsScraping(false);
    }
  };

  const clearData = () => {
    setTargetData(null);
    setCompetitorData(null);
  };

  const ColumnData = ({ data, title, type }: { data: CompetitorData | null, title: string, type: 'target' | 'competitor' }) => {
    if (!data) return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-[var(--border-strong)] rounded-2xl bg-[var(--bg-base)]/50">
        <p className="text-zinc-500 font-medium">No {title.toLowerCase()} scraped.</p>
      </div>
    );

    const isTarget = type === 'target';
    const accentColor = isTarget ? 'text-[var(--accent-primary)]' : 'text-blue-400';
    const bgAccent = isTarget ? 'bg-[var(--accent-primary)]/10' : 'bg-blue-500/10';

    return (
      <div className="flex-1 flex flex-col gap-4">
        <div className={`p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${isTarget ? 'bg-[var(--accent-primary)]' : 'bg-blue-500'}`}></div>
          <h3 className={`text-sm uppercase tracking-wider font-bold ${accentColor} mb-4 ml-2`}>{title}</h3>
          
          <div className="flex flex-col gap-4 ml-2">
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Page Title</span>
              <span className="text-sm font-semibold text-white leading-snug">{data.title || 'N/A'}</span>
            </div>
            
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Meta Description</span>
              <span className="text-[13px] text-zinc-400 leading-relaxed">{data.meta_description || 'N/A'}</span>
            </div>

            <div className={`mt-2 inline-flex items-center gap-3 py-2 px-4 rounded-lg ${bgAccent} self-start border border-[var(--border-subtle)]`}>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Word Count</span>
              <span className={`text-xl font-black ${accentColor}`}>{data.word_count.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Headings */}
          <div className="bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] rounded-xl flex flex-col max-h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Heading Structure</h4>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                const text = data.headings.map(h => `${h.tag.toUpperCase()}: ${h.text}`).join('\n');
                navigator.clipboard.writeText(text);
                success('Copied structure!');
              }}>
                Copy
              </Button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-1 pr-2 custom-scrollbar">
              {data.headings.length === 0 && <span className="text-zinc-500 text-sm">No headings found.</span>}
              {data.headings.map((h, i) => {
                const tag = h.tag.toLowerCase();
                let marginLeft = 'ml-0';
                let fontSize = 'text-[14px] font-semibold text-white';
                let tagStyle = `bg-zinc-800 text-zinc-300`;
                
                if (tag === 'h1') {
                   tagStyle = `${bgAccent} ${accentColor} font-bold`;
                } else if (tag === 'h2') {
                  marginLeft = 'ml-4';
                  fontSize = 'text-[13px] font-medium text-zinc-200';
                  tagStyle = 'bg-zinc-800 text-zinc-400 border border-zinc-700';
                } else if (tag === 'h3') {
                  marginLeft = 'ml-8';
                  fontSize = 'text-[12px] text-zinc-400';
                  tagStyle = 'bg-transparent text-zinc-500';
                }

                return (
                  <div key={i} className={`py-1.5 px-2 hover:bg-[var(--bg-surface-hover)] rounded-lg transition-colors flex items-start gap-2.5 ${marginLeft}`}>
                    <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] uppercase tracking-wider flex-shrink-0 mt-0.5 ${tagStyle}`}>
                      {h.tag}
                    </span>
                    <span className={`${fontSize} leading-snug pt-[2px]`}>
                      {h.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] rounded-xl flex flex-col max-h-[400px]">
            <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-3">Top Keywords (Density)</h4>
            <div className="overflow-y-auto flex flex-col gap-2.5 pr-2 custom-scrollbar">
              {data.top_keywords.length === 0 && <span className="text-zinc-500 text-sm">No text content found.</span>}
              {data.top_keywords.map((kw, i) => {
                const maxCount = data.top_keywords[0]?.count || 1;
                const percentage = Math.max(2, (kw.count / maxCount) * 100);
                
                return (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className="text-xs font-medium text-zinc-400 w-24 truncate text-right group-hover:text-white transition-colors" title={kw.word}>
                      {kw.word}
                    </span>
                    <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded-md overflow-hidden relative border border-[var(--border-subtle)]">
                      <div 
                        className={`absolute top-0 left-0 h-full ${isTarget ? 'bg-[var(--accent-primary)]/80' : 'bg-blue-500/80'} group-hover:opacity-100 transition-opacity`}
                        style={{ width: `${percentage}%` }}
                      />
                      <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white drop-shadow-md">
                        {kw.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen flex flex-col">
      <header className="flex justify-between items-start mb-8 pb-6 border-b border-[var(--border-strong)]">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Competitor Analysis</h1>
          <p className="text-zinc-400">Side-by-side SEO content comparison</p>
        </div>
      </header>

      <Card className="mb-8 flex flex-col shadow-xl border-none bg-[var(--bg-surface)]/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Side-by-Side SEO Analyzer</h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--accent-primary)] px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
            <span style={{ fontFamily: '"Press Start 2P", system-ui', fontSize: '8px', textTransform: 'none', marginRight: '4px' }}><span className="text-[var(--accent-primary)]">Ox</span>ide SEO</span> by shan
          </span>
        </div>
        <p className="text-zinc-400 text-sm mb-8 max-w-3xl">
          Compare your page directly against a top competitor. Instantly visualize gaps in Word Count, Heading Structure, and Keyword Density to outrank them.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-6">
          <div className="flex-1 relative">
            <div className="absolute -top-3 left-4 bg-[var(--bg-surface)] px-2 text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider z-10">Our Page</div>
            <Input 
              label=""
              placeholder="https://our-site.com/page" 
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              icon={<Search01Icon size={18} className="text-[var(--accent-primary)]" />}
              className="border-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]"
            />
          </div>
          <div className="flex-1 relative">
            <div className="absolute -top-3 left-4 bg-[var(--bg-surface)] px-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider z-10">Competitor Page</div>
            <Input 
              label=""
              placeholder="https://competitor.com/page" 
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              icon={<Search01Icon size={18} className="text-blue-400" />}
              className="border-blue-500/30 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-center mt-2 mb-2">
          <Button onClick={handleScrape} disabled={isScraping || (!targetUrl.trim() && !competitorUrl.trim())} className="h-[46px] px-12 text-[15px] shadow-lg shadow-[var(--accent-primary)]/20">
            {isScraping ? 'Analyzing Pages...' : 'Run Side-by-Side Analysis'}
          </Button>
        </div>

        {(targetData || competitorData) && (
          <div className="mt-8 pt-8 border-t border-[var(--border-strong)] flex flex-col gap-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">Comparison Results</h3>
              <Button size="sm" variant="danger" onClick={clearData}>
                Clear Analysis
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <ColumnData data={targetData} title="Our Page" type="target" />
              <ColumnData data={competitorData} title="Competitor Page" type="competitor" />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
