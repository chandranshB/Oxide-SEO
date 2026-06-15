import React, { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Cancel01Icon, CodeIcon, TextIcon, Heading01Icon, Structure03Icon,
  Search01Icon, ArrowLeft01Icon, ArrowRight01Icon, CheckmarkCircle01Icon,
  Alert01Icon, RefreshIcon, LinkSquare02Icon,
} from 'hugeicons-react';

interface HeadingNode {
  level: number;
  text: string;
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

function useCrawlerData(url: string | null) {
  const [data, setData] = useState<CrawlerViewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track previous data to keep it visible while loading the next page
  const [prevData, setPrevData] = useState<CrawlerViewResult | null>(null);

  const load = useCallback((targetUrl: string) => {
    if (cache.has(targetUrl)) {
      setData(cache.get(targetUrl)!);
      setPrevData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setPrevData(data); // keep current visible while fetching
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
  }, [data]);

  const refresh = useCallback((targetUrl: string) => {
    cache.delete(targetUrl);
    load(targetUrl);
  }, [load]);

  useEffect(() => {
    if (url) load(url);
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, prevData, loading, error, refresh };
}

// Thin loading bar at the top
function LoadingBar({ loading }: { loading: boolean }) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setWidth(0);
      // Animate to 80% quickly, then slow down to wait for data
      const t1 = setTimeout(() => setWidth(40), 50);
      const t2 = setTimeout(() => setWidth(70), 400);
      const t3 = setTimeout(() => setWidth(80), 900);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setWidth(100);
      const t = setTimeout(() => { setVisible(false); setWidth(0); }, 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;
  return (
    <div className="absolute top-0 left-0 right-0 h-[2px] z-50 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
        style={{
          width: `${width}%`,
          transitionDuration: loading ? '600ms' : '200ms',
          transitionTimingFunction: loading ? 'ease-out' : 'ease-in',
        }}
      />
    </div>
  );
}

export function CrawlerViewModal({ isOpen, onClose, pages, initialUrl }: CrawlerViewModalProps) {
  const [activeUrl, setActiveUrl] = useState<string | null>(initialUrl);
  const [activeTab, setActiveTab] = useState<ContentTab>('text');
  const [search, setSearch] = useState('');
  const [contentVisible, setContentVisible] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const { data, prevData, loading, error, refresh } = useCrawlerData(activeUrl);

  // Sync initial url when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveUrl(initialUrl);
      setActiveTab('text');
      setSearch('');
      setContentVisible(true);
    }
  }, [isOpen, initialUrl]);

  // Fade out → switch → fade in when changing pages
  const navigateTo = useCallback((url: string) => {
    if (url === activeUrl) return;
    setContentVisible(false);
    setTimeout(() => {
      setActiveUrl(url);
      setActiveTab('text');
      setContentVisible(true);
    }, 150);
  }, [activeUrl]);

  // Smooth fade when switching tabs
  const [tabVisible, setTabVisible] = useState(true);
  const switchTab = useCallback((tab: ContentTab) => {
    if (tab === activeTab) return;
    setTabVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setTabVisible(true);
    }, 100);
  }, [activeTab]);

  // Keyboard navigation
  const filteredPagesRef = useRef<CrawlerPage[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.target === searchRef.current) return;
      const fp = filteredPagesRef.current;
      const idx = fp.findIndex(p => p.url === activeUrl);
      if ((e.key === 'ArrowDown' || e.key === 'j') && idx < fp.length - 1) {
        e.preventDefault();
        navigateTo(fp[idx + 1].url);
      }
      if ((e.key === 'ArrowUp' || e.key === 'k') && idx > 0) {
        e.preventDefault();
        navigateTo(fp[idx - 1].url);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, activeUrl, navigateTo, onClose]);

  // Auto-scroll sidebar to active item
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeUrl]);

  if (!isOpen) return null;

  const filteredPages = pages.filter(p =>
    search
      ? p.url.toLowerCase().includes(search.toLowerCase()) ||
        (p.title || '').toLowerCase().includes(search.toLowerCase())
      : true
  );
  filteredPagesRef.current = filteredPages;

  const currentIndex = filteredPages.findIndex(p => p.url === activeUrl);
  const displayData = data || prevData; // show previous data while loading next

  const tabClass = (t: ContentTab) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${
      activeTab === t
        ? 'bg-white/[0.08] text-white'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
    }`;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#090909]"
      style={{ animation: 'fadeSlideIn 220ms cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .content-fade { animation: fadeIn 200ms ease both; }
        .tab-fade { animation: fadeIn 120ms ease both; }
      `}</style>

      {/* ── Top Chrome ── */}
      <div className="relative flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05] bg-[#0d0d0d] shrink-0">
        <LoadingBar loading={loading} />

        {/* Back */}
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors group mr-1"
        >
          <ArrowLeft01Icon size={16} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
          Back
          <kbd className="hidden sm:inline text-[10px] text-zinc-700 border border-zinc-800 rounded px-1.5 py-0.5 ml-0.5">Esc</kbd>
        </button>

        <div className="w-px h-4 bg-white/[0.08]" />

        {/* Prev / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { const prev = filteredPages[currentIndex - 1]; if (prev) navigateTo(prev.url); }}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-md text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            title="Previous (↑ or k)"
          >
            <ArrowLeft01Icon size={14} />
          </button>
          <span className="text-[12px] text-zinc-600 tabular-nums w-[54px] text-center select-none">
            {currentIndex >= 0 ? `${currentIndex + 1} / ${filteredPages.length}` : '–'}
          </span>
          <button
            onClick={() => { const next = filteredPages[currentIndex + 1]; if (next) navigateTo(next.url); }}
            disabled={currentIndex >= filteredPages.length - 1}
            className="p-1.5 rounded-md text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            title="Next (↓ or j)"
          >
            <ArrowRight01Icon size={14} />
          </button>
        </div>

        <div className="w-px h-4 bg-white/[0.08]" />

        {/* URL display */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden min-w-0">
          <LinkSquare02Icon size={13} className="text-zinc-700 shrink-0" />
          <span className="text-[13px] text-zinc-400 font-mono truncate select-all">{activeUrl || '–'}</span>
          {loading && <span className="text-[11px] text-blue-400 shrink-0 animate-pulse">fetching…</span>}
        </div>

        {/* Tabs pill group */}
        <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.05] rounded-xl p-1 shrink-0">
          {([
            ['text',     <TextIcon size={13} />,        'Text'],
            ['headings', <Heading01Icon size={13} />,   'Headings'],
            ['meta',     <Structure03Icon size={13} />,  'Meta'],
            ['schema',   <CodeIcon size={13} />,         'Schema'],
          ] as [ContentTab, React.ReactNode, string][]).map(([t, icon, label]) => (
            <button key={t} className={tabClass(t)} onClick={() => switchTab(t)}>
              {icon}
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Refresh */}
        {activeUrl && (
          <button
            onClick={() => refresh(activeUrl)}
            disabled={loading}
            className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all disabled:opacity-30"
            title="Re-fetch this page"
          >
            <RefreshIcon size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-[280px] shrink-0 border-r border-white/[0.05] flex flex-col bg-[#0b0b0b]">
          {/* Search */}
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl focus-within:border-white/20 focus-within:bg-white/[0.05] transition-all">
              <Search01Icon size={13} className="text-zinc-600 shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search pages…"
                className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-700 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-zinc-700 hover:text-zinc-400 transition-colors">
                  <Cancel01Icon size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="px-4 pb-2 flex items-center gap-1.5 text-[10px] text-zinc-700">
            <kbd className="border border-zinc-800 rounded px-1 font-mono">↑</kbd>
            <kbd className="border border-zinc-800 rounded px-1 font-mono">↓</kbd>
            <span>navigate · <kbd className="border border-zinc-800 rounded px-1 font-mono">k</kbd> <kbd className="border border-zinc-800 rounded px-1 font-mono">j</kbd> too</span>
          </div>

          {/* Pages list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPages.length === 0 && (
              <div className="p-8 text-zinc-700 text-[13px] text-center">No pages match.</div>
            )}
            {filteredPages.map((page) => {
              const isActive = page.url === activeUrl;
              const slug = page.url.replace(/^https?:\/\/[^/]+/, '') || '/';
              const wc = page.word_count;
              const wcColor = wc < 300 ? 'text-red-400' : wc < 600 ? 'text-yellow-400' : 'text-emerald-400';
              const cachedAlready = cache.has(page.url);
              return (
                <button
                  key={page.url}
                  ref={isActive ? activeItemRef : null}
                  onClick={() => navigateTo(page.url)}
                  className={`w-full text-left px-4 py-3 transition-all duration-150 relative group ${
                    isActive
                      ? 'bg-white/[0.05]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* active indicator */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                    isActive ? 'h-8 bg-blue-500' : 'h-0 bg-transparent'
                  }`} />

                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] font-mono truncate transition-colors duration-150 ${
                        isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}>
                        {slug}
                      </div>
                      {page.title && (
                        <div className={`text-[11px] truncate mt-0.5 transition-colors duration-150 ${
                          isActive ? 'text-zinc-400' : 'text-zinc-600 group-hover:text-zinc-500'
                        }`}>{page.title}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
                      <span className={`text-[10px] font-mono tabular-nums ${wcColor}`}>{wc.toLocaleString()}w</span>
                      <div className="flex items-center gap-1">
                        {cachedAlready && !isActive && (
                          <span className="w-1 h-1 rounded-full bg-zinc-600" title="Cached" />
                        )}
                        {page.has_schema && (
                          <CheckmarkCircle01Icon size={10} className="text-emerald-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-zinc-700">
              {search ? `${filteredPages.length} of ${pages.length}` : `${pages.length} pages`}
            </span>
            <span className="text-[11px] text-zinc-700">{cache.size} cached</span>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-hidden flex flex-col bg-[#090909]">

          {/* Empty state */}
          {!activeUrl && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-600 text-sm">Select a page from the list.</p>
            </div>
          )}

          {/* Error state */}
          {activeUrl && error && !loading && (
            <div className="flex-1 flex items-center justify-center p-12 content-fade">
              <div className="max-w-md w-full p-8 bg-red-500/[0.06] border border-red-500/15 rounded-2xl text-center">
                <Alert01Icon size={28} className="text-red-400 mx-auto mb-4" />
                <h3 className="font-semibold text-white mb-2 text-[15px]">Couldn't load this page</h3>
                <p className="text-[13px] text-red-300/70 leading-relaxed">{error}</p>
                <button
                  onClick={() => refresh(activeUrl)}
                  className="mt-5 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-[13px] text-zinc-300 transition-all"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {activeUrl && (displayData || loading) && !error && (
            <div
              key={activeUrl}
              className="flex-1 overflow-y-auto"
              style={{
                opacity: contentVisible ? 1 : 0,
                transition: 'opacity 150ms ease',
              }}
            >
              {/* Dim overlay while loading next page */}
              {loading && displayData && (
                <div className="absolute inset-0 bg-black/30 z-10 pointer-events-none transition-opacity duration-300" />
              )}

              {/* Pure loading (no prev data) */}
              {loading && !displayData && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full text-zinc-600">
                  <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-[13px]">Fetching as Googlebot…</p>
                </div>
              )}

              {displayData && (
                <div className="p-8 max-w-3xl mx-auto">

                  {/* Page header */}
                  <div className="mb-8">
                    <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest mb-2">Page Title</p>
                    <h1 className="text-xl font-semibold text-white leading-snug">
                      {displayData.title || (
                        <span className="text-red-400 font-normal italic">No title tag — critical SEO issue</span>
                      )}
                    </h1>
                    {/* Inline badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {displayData.title && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          (displayData.title?.length || 0) < 30
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : (displayData.title?.length || 0) > 60
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {displayData.title?.length}ch
                        </span>
                      )}
                      {displayData.meta_robots && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-zinc-800/60 text-zinc-400 border-zinc-700/60 font-mono">
                          {displayData.meta_robots}
                        </span>
                      )}
                      {displayData.schema_json.length > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          {displayData.schema_json.length} schema block{displayData.schema_json.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tab content with fade */}
                  <div style={{ opacity: tabVisible ? 1 : 0, transition: 'opacity 100ms ease' }}>

                    {activeTab === 'text' && (
                      <div className="tab-fade">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest">Visible text — as Google sees it</p>
                          <span className="text-[11px] text-zinc-600 tabular-nums">
                            {displayData.raw_text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                          </span>
                        </div>
                        <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-2xl p-6 text-zinc-300 text-[13px] leading-[1.9] whitespace-pre-wrap font-mono">
                          {displayData.raw_text || (
                            <span className="text-zinc-600 italic">
                              No visible text detected. This page may rely on JavaScript rendering, which Google's crawler may not execute on its first pass.
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'headings' && (
                      <div className="tab-fade">
                        <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest mb-3">Heading Structure</p>
                        {displayData.headings.length > 0 ? (
                          <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-2xl p-6 space-y-2.5">
                            {displayData.headings.map((h, i) => {
                              const indent = (h.level - 1) * 20;
                              const colors: Record<number, { badge: string; text: string }> = {
                                1: { badge: 'text-blue-400 bg-blue-500/10 border-blue-500/20',   text: 'text-white font-medium text-[15px]' },
                                2: { badge: 'text-purple-400 bg-purple-500/10 border-purple-500/20', text: 'text-zinc-200 text-[14px]' },
                                3: { badge: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', text: 'text-zinc-300 text-[13px]' },
                                4: { badge: 'text-zinc-400 bg-zinc-700/30 border-zinc-700',      text: 'text-zinc-400 text-[13px]' },
                                5: { badge: 'text-zinc-500 bg-zinc-800/30 border-zinc-800',      text: 'text-zinc-500 text-[12px]' },
                                6: { badge: 'text-zinc-600 bg-zinc-800/20 border-zinc-800',      text: 'text-zinc-600 text-[12px]' },
                              };
                              const c = colors[h.level] || colors[6];
                              return (
                                <div key={i} style={{ marginLeft: indent }} className="flex items-baseline gap-3">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono shrink-0 ${c.badge}`}>
                                    H{h.level}
                                  </span>
                                  <span className={c.text}>{h.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-2xl p-10 text-center text-zinc-600 italic text-[13px]">
                            No headings found on this page.
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'meta' && (
                      <div className="tab-fade space-y-3">
                        <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest mb-3">Meta Tags & Directives</p>
                        {[
                          {
                            label: 'Title Tag',
                            value: displayData.title,
                            missing: 'Missing — this is a critical SEO issue',
                            missingColor: 'text-red-400',
                            hint: displayData.title
                              ? `${displayData.title.length} characters · ${
                                  displayData.title.length < 30 ? 'too short' :
                                  displayData.title.length > 60 ? 'may be truncated in search results' : 'good length ✓'
                                }`
                              : null,
                            hintOk: displayData.title ? (displayData.title.length >= 30 && displayData.title.length <= 60) : false,
                          },
                          {
                            label: 'Meta Description',
                            value: displayData.meta_description,
                            missing: 'Missing — Google will auto-generate a snippet from page content',
                            missingColor: 'text-yellow-400',
                            hint: displayData.meta_description
                              ? `${displayData.meta_description.length} characters${displayData.meta_description.length > 160 ? ' · may be truncated' : ' ✓'}`
                              : null,
                            hintOk: displayData.meta_description ? displayData.meta_description.length <= 160 : false,
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
                        ].map(({ label, value, missing, missingColor, hint, hintOk, mono }) => (
                          <div key={label} className="bg-[#0d0d0d] border border-white/[0.04] rounded-xl p-5">
                            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
                            <p className={`text-[14px] leading-relaxed ${mono ? 'font-mono text-[13px]' : ''} ${value ? 'text-zinc-100' : `${missingColor} italic`}`}>
                              {value || missing}
                            </p>
                            {hint && (
                              <p className={`text-[11px] mt-2 ${hintOk ? 'text-emerald-500' : 'text-yellow-500'}`}>{hint}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'schema' && (
                      <div className="tab-fade">
                        <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest mb-3">JSON-LD Structured Data</p>
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
                                <div key={i} className="bg-[#0d0d0d] border border-white/[0.04] rounded-2xl overflow-hidden">
                                  <div className="flex items-center px-5 py-3 border-b border-white/[0.04] bg-white/[0.015]">
                                    <span className="text-[11px] text-zinc-500">
                                      Block {i + 1}{typeLabel ? ` — ${typeLabel}` : ''}
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto p-5">
                                    <pre className="text-emerald-400 font-mono text-[12px] leading-relaxed">{pretty}</pre>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-2xl p-10 text-center">
                            <CodeIcon size={28} className="text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-600 text-[13px] italic">No structured data on this page.</p>
                            <p className="text-zinc-700 text-[11px] mt-2 max-w-xs mx-auto">
                              Adding JSON-LD markup can improve your eligibility for rich results in Google Search.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
