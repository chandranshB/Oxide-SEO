import React, { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Titlebar } from './Titlebar';
import {
  Cancel01Icon, CodeIcon, TextIcon, Heading01Icon, Structure03Icon,
  Search01Icon, ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle01Icon,
  Alert01Icon, RefreshIcon, LinkSquare02Icon
} from 'hugeicons-react';

interface HeadingNode {
  level: number;
  text: string;
  content: string;
}

interface CrawlerViewResult {
  url: string;
  raw_text: string;
  headings: HeadingNode[];
  title: string | null;
  meta_description: string | null;
  meta_robots: string | null;
  schema_json: string[];
  error: string | null;
}

export interface CrawlerPage {
  url: string;
  title: string | null;
  word_count: number;
  has_schema: boolean;
  readability_score: number;
}

interface CrawlerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: CrawlerPage[];
  initialUrl: string | null;
}

type ContentTab = 'text' | 'headings' | 'meta' | 'schema';

const cache = new Map<string, CrawlerViewResult>();

// ── Data hook ────────────────────────────────────────────────────────────────
function useCrawlerData(url: string | null) {
  const [data, setData]       = useState<CrawlerViewResult | null>(null);
  const [prevData, setPrevData] = useState<CrawlerViewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback((targetUrl: string) => {
    if (cache.has(targetUrl)) {
      setData(cache.get(targetUrl)!);
      setPrevData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setPrevData(prev => data || prev);
    setLoading(true);
    setError(null);
    invoke<CrawlerViewResult>('fetch_page_content_view', { url: targetUrl })
      .then((res) => {
        cache.set(targetUrl, res);
        setData(res);
        setPrevData(null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setPrevData(null);
        setLoading(false);
      });
  }, [data]); // eslint-disable-line

  const refresh = useCallback((targetUrl: string) => {
    cache.delete(targetUrl);
    load(targetUrl);
  }, [load]);

  useEffect(() => {
    if (url) load(url);
  }, [url]); // eslint-disable-line

  return { data, prevData, loading, error, refresh };
}

// ── Accent-green progress bar (matches app accent) ───────────────────────────
function LoadingBar({ loading }: { loading: boolean }) {
  const [width, setWidth]     = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setWidth(0);
      const t1 = setTimeout(() => setWidth(45), 60);
      const t2 = setTimeout(() => setWidth(72), 500);
      const t3 = setTimeout(() => setWidth(82), 1100);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setWidth(100);
      const t = setTimeout(() => { setVisible(false); setWidth(0); }, 350);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] z-50 overflow-hidden">
      <div
        className="h-full transition-all"
        style={{
          width: `${width}%`,
          background: 'var(--accent-primary)',
          boxShadow: '0 0 8px var(--accent-primary)',
          transitionDuration: loading ? '700ms' : '200ms',
          transitionTimingFunction: loading ? 'ease-out' : 'ease-in',
        }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

function HeadingItem({ h }: { h: HeadingNode }) {
  const [expanded, setExpanded] = useState(false);
  const indent = (h.level - 1) * 20;
  
  type ColorMap = { badge: string; text: string; bg: string };
  const colors: Record<number, ColorMap> = {
    1: { badge: 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20', text: 'text-white font-semibold text-[15px]', bg: 'hover:bg-[var(--accent-primary)]/10' },
    2: { badge: 'text-zinc-300 bg-[var(--bg-surface-hover)] border-[var(--border-subtle)]', text: 'text-zinc-200 font-medium text-[14px]', bg: 'hover:bg-[#2a2b30]' },
    3: { badge: 'text-zinc-400 bg-[var(--bg-surface-hover)] border-[var(--border-subtle)]', text: 'text-zinc-300 text-[14px]', bg: 'hover:bg-[#2a2b30]' },
    4: { badge: 'text-zinc-500 bg-[var(--bg-base)] border-[var(--border-subtle)]', text: 'text-zinc-400 text-[13px]', bg: 'hover:bg-[#2a2b30]' },
    5: { badge: 'text-zinc-600 bg-[var(--bg-base)] border-[var(--border-subtle)]', text: 'text-zinc-500 text-[12px]', bg: 'hover:bg-[#2a2b30]' },
    6: { badge: 'text-zinc-700 bg-[var(--bg-base)] border-[var(--border-subtle)]', text: 'text-zinc-600 text-[12px]', bg: 'hover:bg-[#2a2b30]' },
  };
  const c = colors[h.level] || colors[6];
  const hasContent = h.content && h.content.trim().length > 0;

  return (
    <div style={{ marginLeft: indent }} className="flex flex-col mb-1.5">
      <div 
        className={`group flex items-start gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 ${
          hasContent ? `cursor-pointer ${c.bg}` : ''
        } ${expanded ? 'bg-[#2a2b30]/80 shadow-sm' : ''}`}
        onClick={() => hasContent && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[12px] font-bold w-10 h-7 flex items-center justify-center rounded-md border font-mono ${c.badge}`}>
            H{h.level}
          </span>
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <span className={`${c.text} leading-[1.4] group-hover:text-zinc-100 transition-colors break-words`}>
            {h.text}
          </span>
          {hasContent && expanded && (
            <div className="mt-3.5 mb-1 text-[13px] text-zinc-400 leading-[1.7] font-sans pr-2 whitespace-pre-wrap">
              {h.content}
            </div>
          )}
        </div>

        {hasContent && (
          <div className="shrink-0 text-zinc-500 opacity-40 group-hover:opacity-100 transition-opacity mt-1 ml-2">
            <ArrowRight01Icon 
              size={16} 
              className={`transition-transform duration-300 ease-out ${expanded ? 'rotate-90 text-[var(--accent-primary)]' : ''}`} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function CrawlerViewModal({ isOpen, onClose, pages, initialUrl }: CrawlerViewModalProps) {
  const [activeUrl, setActiveUrl]     = useState<string | null>(initialUrl);
  const [activeTab, setActiveTab]     = useState<ContentTab>('text');
  const [search, setSearch]           = useState('');
  const [contentKey, setContentKey]   = useState(0);  // forces re-mount for fade
  const [tabKey, setTabKey]           = useState(0);  // forces re-mount for tab fade
  const searchRef    = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const filteredRef  = useRef<CrawlerPage[]>([]);

  const { data, prevData, loading, error, refresh } = useCrawlerData(activeUrl);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setActiveUrl(initialUrl);
      setActiveTab('text');
      setSearch('');
      setContentKey(k => k + 1);
    }
  }, [isOpen, initialUrl]);

  // Smooth page navigate: fade out → update url → fade in
  const navigateTo = useCallback((url: string) => {
    if (url === activeUrl) return;
    setActiveUrl(url);
    setContentKey(k => k + 1);
  }, [activeUrl]);

  // Smooth tab switch
  const switchTab = useCallback((tab: ContentTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setTabKey(k => k + 1);
  }, [activeTab]);

  // Auto-scroll sidebar to active item
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeUrl]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (document.activeElement === searchRef.current) return;
      const fp = filteredRef.current;
      const idx = fp.findIndex(p => p.url === activeUrl);
      if ((e.key === 'ArrowDown' || e.key === 'j') && idx < fp.length - 1) {
        e.preventDefault(); navigateTo(fp[idx + 1].url);
      }
      if ((e.key === 'ArrowUp' || e.key === 'k') && idx > 0) {
        e.preventDefault(); navigateTo(fp[idx - 1].url);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeUrl, navigateTo, onClose]);

  if (!isOpen) return null;

  const filteredPages = pages.filter(p =>
    search
      ? p.url.toLowerCase().includes(search.toLowerCase()) ||
        (p.title || '').toLowerCase().includes(search.toLowerCase())
      : true
  );
  filteredRef.current = filteredPages;

  const currentIndex = filteredPages.findIndex(p => p.url === activeUrl);
  const displayData  = data || prevData;

  // Tab pill style — uses app ghost pattern
  const tabCls = (t: ContentTab) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 whitespace-nowrap ${
      activeTab === t
        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'
        : 'text-zinc-400 hover:bg-[var(--bg-surface-hover)] hover:text-white'
    }`;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[var(--bg-base)]"
      style={{ animation: 'cvFadeIn 180ms cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes cvFadeIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes cvContentIn {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .cv-content { animation: cvContentIn 180ms ease both; }
        .cv-tab     { animation: cvContentIn 120ms ease both; }
      `}</style>

      {/* Native window title bar — keeps drag region and window controls */}
      <Titlebar />

      {/* ── Top bar ── */}
      <div className="relative shrink-0 flex items-center gap-3 px-5 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <LoadingBar loading={loading} />

        {/* Back */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors group"
        >
          <ArrowLeft01Icon size={16} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
          Back
          <kbd className="hidden sm:inline text-[10px] text-zinc-600 border border-[var(--border-subtle)] rounded px-1.5 py-0.5 ml-0.5">Esc</kbd>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* Prev / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => filteredPages[currentIndex - 1] && navigateTo(filteredPages[currentIndex - 1].url)}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-[var(--bg-surface-hover)] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            title="Previous (↑ / k)"
          >
            <ArrowLeft01Icon size={14} />
          </button>
          <span className="text-[12px] text-zinc-500 tabular-nums w-[52px] text-center select-none">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${filteredPages.length}` : '–'}
          </span>
          <button
            onClick={() => filteredPages[currentIndex + 1] && navigateTo(filteredPages[currentIndex + 1].url)}
            disabled={currentIndex >= filteredPages.length - 1}
            className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-[var(--bg-surface-hover)] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            title="Next (↓ / j)"
          >
            <ArrowRight01Icon size={14} />
          </button>
        </div>

        <div className="w-px h-4 bg-[var(--border-subtle)]" />

        {/* URL */}
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <LinkSquare02Icon size={13} className="text-zinc-600 shrink-0" />
          <span className="text-[13px] text-zinc-400 font-mono truncate select-all">{activeUrl || '–'}</span>
          {loading && (
            <span className="text-[11px] text-[var(--accent-primary)] shrink-0 animate-pulse">fetching…</span>
          )}
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-1 shrink-0">
          {([
            ['text',     <TextIcon size={13} />,         'Text'],
            ['headings', <Heading01Icon size={13} />,    'Headings'],
            ['meta',     <Structure03Icon size={13} />,  'Meta'],
            ['schema',   <CodeIcon size={13} />,         'Schema'],
          ] as [ContentTab, React.ReactNode, string][]).map(([t, icon, label]) => (
            <button key={t} className={tabCls(t)} onClick={() => switchTab(t)}>
              {icon}
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Refresh */}
        {activeUrl && (
          <button
            onClick={() => refresh(activeUrl)}
            disabled={loading}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-[var(--bg-surface-hover)] transition-all disabled:opacity-30 ml-1"
            title="Re-fetch live"
          >
            <RefreshIcon size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-[272px] shrink-0 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">

          {/* Search */}
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl focus-within:border-[var(--accent-primary)]/40 transition-colors">
              <Search01Icon size={13} className="text-zinc-600 shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter pages…"
                className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <Cancel01Icon size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="px-4 pb-2 flex items-center gap-1.5 text-[10px] text-zinc-600">
            <kbd className="border border-[var(--border-subtle)] rounded px-1 font-mono bg-[var(--bg-base)]">↑</kbd>
            <kbd className="border border-[var(--border-subtle)] rounded px-1 font-mono bg-[var(--bg-base)]">↓</kbd>
            <span className="ml-0.5">navigate pages</span>
          </div>

          {/* Page list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPages.length === 0 && (
              <div className="p-8 text-zinc-600 text-[13px] text-center">No pages match.</div>
            )}
            {filteredPages.map((page) => {
              const isActive = page.url === activeUrl;
              const slug = page.url.replace(/^https?:\/\/[^/]+/, '') || '/';
              const wc = page.word_count;
              const wcColor = wc < 300 ? 'text-red-400' : wc < 600 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-primary)]';
              const isCached = cache.has(page.url);
              return (
                <button
                  key={page.url}
                  ref={isActive ? activeItemRef : null}
                  onClick={() => navigateTo(page.url)}
                  className={`w-full text-left px-4 py-3 relative group transition-colors duration-100 ${
                    isActive ? 'bg-[var(--bg-surface-hover)]' : 'hover:bg-[var(--bg-surface-hover)]/50'
                  }`}
                >
                  {/* Active accent line */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200"
                    style={{
                      height: isActive ? '28px' : '0px',
                      background: 'var(--accent-primary)',
                    }}
                  />

                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] font-mono truncate transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                        {slug}
                      </div>
                      {page.title && (
                        <div className={`text-[11px] truncate mt-0.5 transition-colors ${isActive ? 'text-zinc-500' : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                          {page.title}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                      <span className={`text-[10px] font-mono tabular-nums ${wcColor}`}>
                        {wc.toLocaleString()}w
                      </span>
                      <div className="flex items-center gap-1">
                        {isCached && !isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-strong)]" title="Cached" />
                        )}
                        {page.has_schema && (
                          <CheckmarkCircle01Icon size={10} className="text-[var(--accent-primary)]" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">
              {search ? `${filteredPages.length} of ${pages.length} pages` : `${pages.length} pages`}
            </span>
            {cache.size > 0 && (
              <span className="text-[11px] text-zinc-700">{cache.size} cached</span>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-base)]">

          {/* No selection */}
          {!activeUrl && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-600 text-sm">Select a page from the list.</p>
            </div>
          )}

          {/* Error */}
          {activeUrl && error && !loading && (
            <div className="flex-1 flex items-center justify-center p-12 cv-content">
              <div className="max-w-sm w-full p-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-center shadow-lg">
                <Alert01Icon size={28} className="text-red-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2">Couldn't load this page</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{error}</p>
                <button
                  onClick={() => refresh(activeUrl)}
                  className="mt-5 px-5 py-2 bg-[var(--bg-surface-hover)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl text-[13px] text-zinc-300 transition-all"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton (no prev data) */}
          {activeUrl && loading && !displayData && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-600">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--border-strong)', borderTopColor: 'var(--accent-primary)' }}
              />
              <p className="text-[13px]">Fetching as Googlebot…</p>
            </div>
          )}

          {/* Content pane */}
          {activeUrl && displayData && !error && (
            <div
              key={contentKey}
              className="flex-1 overflow-y-auto cv-content"
              style={{ position: 'relative' }}
            >
              {/* Dim overlay while reloading */}
              {loading && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{ background: 'rgba(9,9,11,0.5)', transition: 'opacity 200ms' }}
                />
              )}

              <div className="p-8 max-w-3xl mx-auto">

                {/* Page header */}
                <div className="mb-8 pb-6 border-b border-[var(--border-subtle)]">
                  <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">Page Title</p>
                  <h2 className="text-xl font-semibold text-white leading-snug">
                    {displayData.title || (
                      <span className="text-red-400 italic font-normal">No title tag — critical SEO issue</span>
                    )}
                  </h2>

                  {/* Quick badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {displayData.title && (() => {
                      const len = displayData.title!.length;
                      const ok = len >= 30 && len <= 60;
                      const warn = len < 30;
                      return (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                          ok   ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
                               : warn ? 'bg-[var(--accent-warning)]/10 text-[var(--accent-warning)] border-[var(--accent-warning)]/20'
                               : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {len} chars{ok ? ' ✓' : warn ? ' — too short' : ' — too long'}
                        </span>
                      );
                    })()}
                    {displayData.meta_robots && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-[var(--bg-surface)] text-zinc-400 border-[var(--border-subtle)] font-mono">
                        {displayData.meta_robots}
                      </span>
                    )}
                    {displayData.schema_json.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20">
                        {displayData.schema_json.length} schema block{displayData.schema_json.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tab body */}
                <div key={tabKey} className="cv-tab">

                  {/* ── Text ── */}
                  {activeTab === 'text' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest">
                          Visible text — as Googlebot sees it
                        </p>
                        <span className="text-[11px] text-zinc-600 tabular-nums">
                          {displayData.raw_text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                        </span>
                      </div>
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8 text-[#d4d4d8] text-[14px] leading-[1.8] whitespace-pre-wrap font-sans">
                        {displayData.raw_text || (
                          <span className="text-zinc-600 italic">
                            No visible text detected. This page may rely on JavaScript rendering,
                            which Googlebot may not execute on its first pass.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Headings ── */}
                  {activeTab === 'headings' && (
                    <div>
                      <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest mb-3">
                        Heading Structure
                      </p>
                      {displayData.headings.length > 0 ? (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-2.5">
                          {displayData.headings.map((h, i) => (
                            <HeadingItem key={i} h={h} />
                          ))}
                        </div>
                      ) : (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-10 text-center text-zinc-600 italic text-[13px]">
                          No headings found on this page.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Meta ── */}
                  {activeTab === 'meta' && (() => {
                    let snippetImage: string | null = null;
                    let snippetRating: { value: string; count: string } | null = null;

                    if (displayData.schema_json) {
                      for (const block of displayData.schema_json) {
                        try {
                          const parsed = JSON.parse(block);
                          
                          const findImage = (obj: any): string | null => {
                            if (!obj || typeof obj !== 'object') return null;
                            if (typeof obj.image === 'string') return obj.image;
                            if (obj.image && typeof obj.image.url === 'string') return obj.image.url;
                            if (Array.isArray(obj.image) && typeof obj.image[0] === 'string') return obj.image[0];
                            return null;
                          };

                          const findRating = (obj: any): any => {
                            if (!obj || typeof obj !== 'object') return null;
                            if (obj.aggregateRating) return obj.aggregateRating;
                            for (const key of Object.keys(obj)) {
                              if (obj[key] && typeof obj[key] === 'object') {
                                const r = findRating(obj[key]);
                                if (r) return r;
                              }
                            }
                            return null;
                          };

                          if (!snippetImage) snippetImage = findImage(parsed);
                          if (!snippetRating) {
                            const rating = findRating(parsed);
                            if (rating && rating.ratingValue) {
                              snippetRating = { 
                                value: String(rating.ratingValue), 
                                count: String(rating.ratingCount || rating.reviewCount || '0') 
                              };
                            }
                          }
                        } catch(e) {}
                      }
                    }

                    let hostname = '';
                    try { hostname = new URL(displayData.url).hostname; } catch(e) {}

                    return (
                      <div className="space-y-6">
                        
                        {/* Search Result Preview */}
                        <div>
                          <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest mb-3">
                            Google Search Preview
                          </p>
                          <div className="bg-[#202124] border border-[var(--border-subtle)] rounded-xl p-5 md:p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-col gap-1.5 max-w-[600px] flex-1">
                                {/* URL Breadcrumb */}
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#303134] flex items-center justify-center shrink-0 overflow-hidden">
                                    <img 
                                      src={`https://s2.googleusercontent.com/s2/favicons?domain=${hostname}&sz=32`} 
                                      className="w-4 h-4 object-contain" 
                                      alt="favicon"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dadce0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[14px] text-[#dadce0] leading-tight truncate">
                                      {hostname}
                                    </span>
                                    <span className="text-[12px] text-[#bdc1c6] leading-tight truncate">
                                      {displayData.url}
                                    </span>
                                  </div>
                                </div>
                                {/* Title Link */}
                                <a href="#" className="text-[20px] text-[#8ab4f8] hover:underline leading-[1.3] mt-1 line-clamp-2">
                                  {displayData.title || displayData.url}
                                </a>
                                {/* Description Snippet */}
                                {(() => {
                                  let desc = displayData.meta_description;
                                  if (!desc && displayData.raw_text) {
                                    const cleanText = displayData.raw_text.replace(/\s+/g, ' ').trim();
                                    if (cleanText) {
                                      desc = cleanText.length > 160 ? cleanText.substring(0, 157) + '...' : cleanText;
                                    }
                                  }
                                  if (!desc) return null;
                                  return (
                                    <p className="text-[14px] text-[#bdc1c6] leading-[1.58] mt-1 line-clamp-2">
                                      {desc}
                                    </p>
                                  );
                                })()}
                                {/* Ratings Rich Snippet */}
                                {snippetRating && (
                                  <div className="flex items-center gap-1.5 mt-1 text-[14px] text-[#bdc1c6]">
                                    <span>{Number(snippetRating.value).toFixed(1)}</span>
                                    <div className="flex text-[#fbbc04] text-[13px] tracking-widest">
                                      {'★★★★★'.split('').map((star, i) => (
                                        <span key={i} className={i < Math.round(Number(snippetRating!.value)) ? 'text-[#fbbc04]' : 'text-[#70757a]'}>{star}</span>
                                      ))}
                                    </div>
                                    {snippetRating.count !== '0' && (
                                      <span>({Number(snippetRating.count).toLocaleString()})</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Image Rich Snippet */}
                              {snippetImage && (
                                <div className="shrink-0 ml-4 hidden sm:block">
                                  <div className="w-[104px] h-[104px] rounded-lg overflow-hidden border border-[#3c4043] bg-[#202124]">
                                    <img src={snippetImage} className="w-full h-full object-cover" alt="Rich Snippet Thumbnail" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5 px-1 mt-2.5">
                          <Alert01Icon size={12} className="text-zinc-500 mt-[1px] shrink-0" />
                          <p className="text-[11px] text-zinc-500 leading-snug">
                            Google may take days or weeks to recrawl this page and update its live search results. Changes made to your site will not appear in Google immediately.
                          </p>
                        </div>

                      {/* Raw Tags */}
                      <div>
                        <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest mb-3">
                          Raw Tags & Directives
                        </p>
                        <div className="space-y-3">
                          {([
                            {
                              label: 'Title Tag',
                              value: displayData.title,
                              missing: 'Missing — critical SEO issue',
                              missingColor: 'text-red-400',
                              hint: displayData.title
                                ? `${displayData.title.length} characters · ${
                                    displayData.title.length < 30 ? 'too short' :
                                    displayData.title.length > 60 ? 'may be truncated in search results' : 'good length ✓'
                                  }`
                                : null,
                              hintOk: displayData.title
                                ? (displayData.title.length >= 30 && displayData.title.length <= 60)
                                : false,
                            },
                            {
                              label: 'Meta Description',
                              value: displayData.meta_description,
                              missing: 'Missing — Google will auto-generate a snippet',
                              missingColor: 'text-[var(--accent-warning)]',
                              hint: displayData.meta_description
                                ? `${displayData.meta_description.length} characters${displayData.meta_description.length > 160 ? ' · may be truncated' : ' ✓'}`
                                : null,
                              hintOk: displayData.meta_description
                                ? displayData.meta_description.length <= 160
                                : false,
                              mono: false,
                            },
                            {
                              label: 'Robots Directive',
                              value: displayData.meta_robots,
                              missing: 'Not set · defaults to: index, follow',
                              missingColor: 'text-zinc-500',
                              hint: null,
                              hintOk: true,
                              mono: true,
                            },
                          ]).map(({ label, value, missing, missingColor, hint, hintOk, mono }) => (
                            <div
                              key={label}
                              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5"
                            >
                              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
                              <p className={`text-[14px] leading-relaxed ${mono ? 'font-mono text-[13px]' : ''} ${value ? 'text-zinc-100' : `${missingColor} italic`}`}>
                                {value || missing}
                              </p>
                              {hint && (
                                <p className={`text-[11px] mt-2 ${hintOk ? 'text-[var(--accent-primary)]' : 'text-[var(--accent-warning)]'}`}>
                                  {hint}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )})()}

                  {/* ── Schema ── */}
                  {activeTab === 'schema' && (
                    <div>
                      <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest mb-3">
                        JSON-LD Structured Data
                      </p>
                      {displayData.schema_json.length > 0 ? (
                        <div className="space-y-3">
                          {displayData.schema_json.map((schema, i) => {
                            let pretty = schema;
                            let typeLabel = '';
                            try {
                              const parsed = JSON.parse(schema);
                              pretty = JSON.stringify(parsed, null, 2);
                              typeLabel = parsed['@type'] ? String(parsed['@type']) : '';
                            } catch (_) {}
                            return (
                              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                                <div className="flex items-center px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]">
                                  <span className="text-[11px] text-zinc-500">
                                    Block {i + 1}{typeLabel ? ` — ${typeLabel}` : ''}
                                  </span>
                                </div>
                                <div className="overflow-x-auto p-5">
                                  <pre className="text-[var(--accent-primary)] font-mono text-[12px] leading-relaxed">{pretty}</pre>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-10 text-center">
                          <CodeIcon size={28} className="text-zinc-700 mx-auto mb-3" />
                          <p className="text-zinc-500 text-[13px] italic">No structured data on this page.</p>
                          <p className="text-zinc-600 text-[11px] mt-2 max-w-xs mx-auto">
                            Adding JSON-LD markup improves eligibility for rich results in Google Search.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
