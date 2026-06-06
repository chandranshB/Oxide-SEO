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
  TextFontIcon, Tag01Icon, Heading01Icon, File02Icon, Image01Icon, Link01Icon, Globe02Icon, Folder01Icon
} from 'hugeicons-react';
import { Project } from '../components/ProjectSelector';
import { GuidancePanel } from '../components/GuidancePanel';
import { Select } from '../components/Select';

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
  in_links?: number;
  out_links?: number;
  internal_rank?: number;
  // Content depth metrics
  content_depth_score?: number;
  heading_count?: number;
  heading_depth?: number;
  image_count?: number;
  images_without_alt?: number;
  internal_link_count?: number;
  external_link_count?: number;
  has_schema?: boolean;
  schema_types?: string[];
  readability_score?: number;
  avg_sentence_length?: number;
  paragraph_count?: number;
  has_table?: boolean;
  has_list?: boolean;
  has_video?: boolean;
  content_to_html_ratio?: number;
  meta_robots?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
  response_size_bytes?: number;
  // Scoring
  page_seo_score?: number;
  crawl_depth?: number;
}

interface AuditGraphNode {
  url: string;
  in_links: number;
  out_links: number;
  internal_rank: number;
}

interface AuditGraphResults {
  nodes: AuditGraphNode[];
}

interface AuditRecord {
  id: number;
  created_at: string;
  status: string;
}

const ScoreGauge = ({ score }: { score: number }) => {
  const radius = 44;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const colorClass = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="relative flex items-center justify-center shrink-0 w-[88px] h-[88px]">
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

type TreeNode = {
  name: string;
  path: string;
  page: AuditPageResult | null;
  children: Record<string, TreeNode>;
  depth: number;
};

type FlatNode = {
  name: string;
  path: string;
  page: AuditPageResult | null;
  depth: number;
  isFolder: boolean;
};

const buildUrlTree = (pages: AuditPageResult[], targetUrl: string): FlatNode[] => {
  const root: TreeNode = {
    name: '/',
    path: '/',
    page: null,
    children: {},
    depth: 0
  };
  
  const sorted = [...pages].sort((a, b) => a.url.localeCompare(b.url));
  
  sorted.forEach(p => {
    let relPath = p.url.replace(targetUrl, '');
    if (!relPath.startsWith('/')) relPath = '/' + relPath;
    if (relPath === '/') {
      root.page = p;
      return;
    }
    
    if (relPath.endsWith('/')) relPath = relPath.slice(0, -1);
    
    const segments = relPath.split('/').filter(Boolean);
    let current = root;
    let currentPath = '';
    
    segments.forEach((seg, i) => {
      currentPath += '/' + seg;
      if (!current.children[seg]) {
        current.children[seg] = {
          name: seg,
          path: currentPath,
          page: null,
          children: {},
          depth: current.depth + 1
        };
      }
      current = current.children[seg];
      if (i === segments.length - 1) {
        current.page = p;
      }
    });
  });
  
  const flatTree: FlatNode[] = [];
  
  const traverse = (node: TreeNode) => {
    flatTree.push({
      name: node.name,
      path: node.path,
      page: node.page,
      depth: node.depth,
      isFolder: Object.keys(node.children).length > 0
    });
    const childrenKeys = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
    for (const key of childrenKeys) {
      traverse(node.children[key]);
    }
  };
  
  traverse(root);
  return flatTree;
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
  const [crawlSpeed, setCrawlSpeed] = useState(15);

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
  const [isGuidanceVisible, setIsGuidanceVisible] = useState(true);

  // New Tab & Filter States
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'pages'>('overview');
  const [issuesFilterSeverity, setIssuesFilterSeverity] = useState<string>('All');
  const [issuesFilterSearch, setIssuesFilterSearch] = useState<string>('');
  const [pagesSort, setPagesSort] = useState<'internal_rank' | 'url' | 'in_links' | 'content_depth' | 'seo_score'>('internal_rank');
  const [pagesSearch, setPagesSearch] = useState<string>('');

  useEffect(() => {
    if (selectedCategory) {
      setIsGuidanceVisible(true);
    }
  }, [selectedCategory]);

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
        issues: JSON.parse(p.issues_json || '[]'),
        in_links: p.in_links ?? 0,
        out_links: p.out_links ?? 0,
        internal_rank: p.internal_rank ?? 0,
        content_depth_score: p.content_depth_score ?? 0,
        heading_count: p.heading_count ?? 0,
        heading_depth: p.heading_depth ?? 0,
        image_count: p.image_count ?? 0,
        images_without_alt: p.images_without_alt ?? 0,
        internal_link_count: p.internal_link_count ?? 0,
        external_link_count: p.external_link_count ?? 0,
        has_schema: p.has_schema === 1,
        schema_types: JSON.parse(p.schema_types || '[]'),
        readability_score: p.readability_score ?? 0,
        avg_sentence_length: p.avg_sentence_length ?? 0,
        paragraph_count: p.paragraph_count ?? 0,
        has_table: p.has_table === 1,
        has_list: p.has_list === 1,
        has_video: p.has_video === 1,
        content_to_html_ratio: p.content_to_html_ratio ?? 0,
        meta_robots: p.meta_robots,
        canonical_url: p.canonical_url,
        og_image: p.og_image,
        response_size_bytes: p.response_size_bytes ?? 0,
        page_seo_score: p.page_seo_score ?? 0,
        crawl_depth: p.crawl_depth ?? 0,
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
    window.dispatchEvent(new CustomEvent('audit-started'));
    setResults([]);
    setCompareResults([]); // Clear compare during active crawl
    setProgress(null);
    setSelectedCategory(null);
    setSelectedPage(null);

    let unlistenProgress: UnlistenFn | null = null;
    let unlistenResult: UnlistenFn | null = null;
    let unlistenOrphan: UnlistenFn | null = null;
    let unlistenGraph: UnlistenFn | null = null;
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
            `INSERT INTO audit_pages (audit_id, url, status_code, title, meta_description, h1, word_count, load_time_ms, issues_json,
              content_depth_score, heading_count, heading_depth, image_count, images_without_alt,
              internal_link_count, external_link_count, has_schema, schema_types, readability_score,
              paragraph_count, has_table, has_list, has_video, content_to_html_ratio,
              meta_robots, canonical_url, og_image, response_size_bytes, page_seo_score, crawl_depth)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
            [auditId, payload.url, payload.status_code, payload.title, payload.meta_description, payload.h1, payload.word_count, payload.load_time_ms, JSON.stringify(payload.issues || []),
              payload.content_depth_score ?? 0, payload.heading_count ?? 0, payload.heading_depth ?? 0, payload.image_count ?? 0, payload.images_without_alt ?? 0,
              payload.internal_link_count ?? 0, payload.external_link_count ?? 0, payload.has_schema ? 1 : 0, JSON.stringify(payload.schema_types || []), payload.readability_score ?? 0,
              payload.paragraph_count ?? 0, payload.has_table ? 1 : 0, payload.has_list ? 1 : 0, payload.has_video ? 1 : 0, payload.content_to_html_ratio ?? 0,
              payload.meta_robots ?? null, payload.canonical_url ?? null, payload.og_image ?? null, payload.response_size_bytes ?? 0, payload.page_seo_score ?? 0, payload.crawl_depth ?? 0]
          );
        } catch (dbErr) {
          console.error("DB Insert Error", dbErr);
        }
        
        setResults((prev) => {
          const idx = prev.findIndex(p => p.url === payload.url);
          if (idx >= 0) {
            // Replace with updated data (post-crawl re-emission)
            const next = [...prev];
            next[idx] = payload;
            return next;
          }
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

      unlistenGraph = await listen<AuditGraphResults>('audit-graph-results', async (event) => {
        const nodes = event.payload.nodes;
        
        // Update local state
        setResults(prev => {
          const map = new Map(nodes.map(n => [n.url, n]));
          return prev.map(p => {
            const node = map.get(p.url);
            if (node) {
              return { ...p, in_links: node.in_links, out_links: node.out_links, internal_rank: node.internal_rank };
            }
            return p;
          });
        });

        // Update DB
        if (db) {
          for (const node of nodes) {
            try {
              await db.execute(
                'UPDATE audit_pages SET in_links = $1, out_links = $2, internal_rank = $3 WHERE audit_id = $4 AND url = $5',
                [node.in_links, node.out_links, node.internal_rank, auditId, node.url]
              );
            } catch (e) {
              console.error("Failed to save graph node data", e);
            }
          }
        }
      });

      await invoke('run_site_audit', { 
        startUrl: targetUrl, 
        sitemapUrl: useSitemap ? (sitemapUrl || null) : null, 
        maxPages,
        crawlSpeed
      });

      await db.execute('UPDATE audits SET status = $1 WHERE id = $2', ['completed', auditId]);
      await loadAudits();

    } catch (error) {
      console.error(error);
    } finally {
      setIsAuditing(false);
      setProgress(null);
      window.dispatchEvent(new CustomEvent('audit-finished'));
      if (unlistenProgress) unlistenProgress();
      if (unlistenResult) unlistenResult();
      if (unlistenOrphan) unlistenOrphan();
      if (unlistenGraph) unlistenGraph();
    }
  };

  const calculateStats = (resultSet: AuditPageResult[]) => {
    const eGroups: Record<string, AuditPageResult[]> = {};
    const wGroups: Record<string, AuditPageResult[]> = {};
    const nGroups: Record<string, AuditPageResult[]> = {};
    const passed: AuditPageResult[] = [];
    let pagesWithErrorsCount = 0;
    
    let seoScoreSum = 0;
    let contentDepthSum = 0;
    let visiblePages = 0;

    resultSet.forEach(page => {
      // Visibility: 200 OK
      if (page.status_code >= 200 && page.status_code < 300) {
        visiblePages++;
      }

      let hasError = false;

      if (page.issues && page.issues.length > 0) {
        page.issues.forEach(issue => {
          if (issue.category === 'Error') {
            hasError = true;
            if (!eGroups[issue.description]) eGroups[issue.description] = [];
            eGroups[issue.description].push(page);
          } else if (issue.category === 'Warning') {
            if (!wGroups[issue.description]) wGroups[issue.description] = [];
            wGroups[issue.description].push(page);
          } else if (issue.category === 'Notice' || issue.category === 'Info') {
            if (!nGroups[issue.description]) nGroups[issue.description] = [];
            nGroups[issue.description].push(page);
          } else {
            if (!wGroups[issue.description]) wGroups[issue.description] = [];
            wGroups[issue.description].push(page);
          }
        });
      }
      
      // Use server-computed SEO score, falling back to exponential decay for old data
      if (page.page_seo_score && page.page_seo_score > 0) {
        seoScoreSum += page.page_seo_score;
      } else {
        // Fallback for historical data without server scores
        let errorCount = page.issues?.filter(i => i.category === 'Error').length || 0;
        let warningCount = page.issues?.filter(i => i.category === 'Warning').length || 0;
        let noticeCount = page.issues?.filter(i => i.category === 'Notice' || i.category === 'Info').length || 0;
        const scoreMultiplier = 
          Math.pow(0.80, errorCount) * 
          Math.pow(0.95, warningCount) * 
          Math.pow(0.98, noticeCount);
        seoScoreSum += Math.round(100 * scoreMultiplier);
      }

      // Content depth score
      contentDepthSum += (page.content_depth_score ?? 0);

      if (!page.issues || page.issues.length === 0) {
        passed.push(page);
      }
      if (hasError) pagesWithErrorsCount++;
    });

    const totalErrors = Object.values(eGroups).reduce((acc, arr) => acc + arr.length, 0);
    const totalWarnings = Object.values(wGroups).reduce((acc, arr) => acc + arr.length, 0);
    const totalNotices = Object.values(nGroups).reduce((acc, arr) => acc + arr.length, 0);
    
    const healthScore = resultSet.length > 0 ? Math.round(((resultSet.length - pagesWithErrorsCount) / resultSet.length) * 100) : 0;
    const visibilityScore = resultSet.length > 0 ? Math.round((visiblePages / resultSet.length) * 100) : 0;
    const seoScore = resultSet.length > 0 ? Math.round(seoScoreSum / resultSet.length) : 0;
    const contentDepthScore = resultSet.length > 0 ? Math.round(contentDepthSum / resultSet.length) : 0;

    return { 
      errorGroups: eGroups, 
      warningGroups: wGroups, 
      noticeGroups: nGroups,
      passedPages: passed, 
      totalErrors, 
      totalWarnings, 
      totalNotices,
      healthScore, 
      visibilityScore, 
      seoScore,
      contentDepthScore,
      pagesWithErrorsCount 
    };
  };

  const mainStats = useMemo(() => calculateStats(results), [results]);
  const compareStats = useMemo(() => calculateStats(compareResults), [compareResults]);

  const allIssues = useMemo(() => {
    if (!results.length) return [];
    
    const issuesList: { title: string, pages: AuditPageResult[], severity: string, count: number }[] = [];
    Object.entries(mainStats.errorGroups).forEach(([title, pages]) => {
      issuesList.push({ title, pages, severity: 'Error', count: pages.length });
    });
    Object.entries(mainStats.warningGroups).forEach(([title, pages]) => {
      issuesList.push({ title, pages, severity: 'Warning', count: pages.length });
    });
    if (mainStats.noticeGroups) {
      Object.entries(mainStats.noticeGroups).forEach(([title, pages]) => {
        issuesList.push({ title, pages, severity: 'Notice', count: pages.length });
      });
    }
    
    // Apply Filters for Issues Tab
    let filteredIssues = issuesList.sort((a, b) => b.count - a.count);
    if (issuesFilterSeverity !== 'All') {
      filteredIssues = filteredIssues.filter(i => i.severity === issuesFilterSeverity);
    }
    if (issuesFilterSearch) {
      filteredIssues = filteredIssues.filter(i => i.title.toLowerCase().includes(issuesFilterSearch.toLowerCase()));
    }
    return filteredIssues;
  }, [mainStats, issuesFilterSeverity, issuesFilterSearch]);

  const sortedPages = useMemo(() => {
    let sorted = [...results];
    if (pagesSearch) {
      sorted = sorted.filter(p => p.url.toLowerCase().includes(pagesSearch.toLowerCase()));
    }
    sorted.sort((a, b) => {
      if (pagesSort === 'internal_rank') return (b.internal_rank || 0) - (a.internal_rank || 0);
      if (pagesSort === 'content_depth') return (b.content_depth_score || 0) - (a.content_depth_score || 0);
      if (pagesSort === 'seo_score') return (b.page_seo_score || 0) - (a.page_seo_score || 0);
      if (pagesSort === 'in_links') return (b.in_links || 0) - (a.in_links || 0);
      return a.url.localeCompare(b.url);
    });
    return sorted;
  }, [results, pagesSearch, pagesSort]);

  const getIssueIcon = (cat: string, severity: string, size = 18) => {
    const color = severity === 'Error' ? 'text-red-500' : severity === 'Warning' ? 'text-yellow-500' : 'text-blue-500';
    if (cat.includes("Title")) return <TextFontIcon className={color} size={size} />;
    if (cat.includes("Meta Description")) return <Tag01Icon className={color} size={size} />;
    if (cat.includes("H1") || cat.includes("Heading Hierarchy")) return <Heading01Icon className={color} size={size} />;
    if (cat.includes("word count")) return <File02Icon className={color} size={size} />;
    if (cat.includes("Orphan")) return <LinkSquare02Icon className={color} size={size} />;
    if (cat.includes("Broken link") || cat.includes("Broken External")) return <Cancel01Icon className={color} size={size} />;
    if (cat.includes("Image Alt")) return <Image01Icon className={color} size={size} />;
    if (cat.includes("Canonical")) return <Link01Icon className={color} size={size} />;
    if (cat.includes("Language")) return <Globe02Icon className={color} size={size} />;
    if (cat.includes("robots.txt") || cat.includes("Noindex")) return <File01Icon className={color} size={size} />;
    if (cat.includes("sitemap.xml")) return <File01Icon className={color} size={size} />;
    if (cat.includes("Viewport")) return <Globe02Icon className={color} size={size} />;
    if (cat.includes("Open Graph") || cat.includes("Twitter Card")) return <Tag01Icon className={color} size={size} />;
    if (cat.includes("too deep") || cat.includes("slow page")) return <InformationCircleIcon className={color} size={size} />;
    if (cat.includes("Mixed Content") || cat.includes("Content-to-HTML")) return <Alert01Icon className={color} size={size} />;
    if (cat.includes("No Internal Links")) return <Link01Icon className={color} size={size} />;
    if (cat.includes("CSS file size") || cat.includes("Large Page")) return <File02Icon className={color} size={size} />;
    if (cat.includes("Structured data")) return <File01Icon className={color} size={size} />;
    return severity === 'Error' ? <Alert01Icon className={color} size={size} /> : <InformationCircleIcon className={color} size={size} />;
  };

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
    if (mainStats.noticeGroups && mainStats.noticeGroups[selectedCategory]) {
      return { pages: mainStats.noticeGroups[selectedCategory], isError: false };
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

  const hasStarted = audits.length > 0 || isAuditing;

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-base)] overflow-hidden relative ${!hasStarted && !selectedCategory ? 'justify-center items-center' : ''}`}>
      {/* Dynamic Top Navigation Bar */}
      {!selectedCategory && hasStarted && (
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
      )}

      {selectedCategory && (
        <div className="flex items-center px-6 py-4 shrink-0 z-10 relative">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors group px-2 py-1 -ml-2 rounded hover:bg-[var(--bg-surface)] z-10 relative"
          >
            <ArrowLeft01Icon size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to All Issues
          </button>
          
          <div className="fixed left-0 right-0 flex items-center justify-center pointer-events-none z-10" style={{ top: '32px', height: '60px' }}>
            <div className="flex items-center gap-2 pointer-events-auto bg-[var(--bg-base)] px-4 rounded-xl shadow-2xl py-2">
              <span 
                className="text-xs tracking-widest text-white/90" 
                style={{ fontFamily: '"Press Start 2P", system-ui' }}
              >
                {selectedCategory}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto p-8 relative ${!hasStarted ? 'flex flex-col justify-center' : ''}`}>
        <div className={`max-w-7xl mx-auto ${hasStarted ? 'pb-32' : 'w-full'}`}>

          {/* Empty State */}
          {!hasStarted && (
            <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500 relative w-full max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white flex items-center justify-center gap-4 mb-4">
                <Globe02Icon size={48} className="text-[var(--accent-primary)]" />
                Site Audit
              </h1>
              <p className="text-zinc-500 text-lg mb-12">
                Your workspace is ready. Run your first deep crawl to discover exactly how to make <span className="text-zinc-300 font-medium">{activeProject.domain}</span> perform flawlessly.
              </p>
              
              <div className="flex items-center justify-center gap-4 w-full">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsSettingsModalOpen(true)} 
                  className="h-14 px-6 rounded-2xl font-medium bg-[#121214] border border-[var(--border-subtle)] hover:bg-[#18181b] transition-all text-zinc-300"
                >
                  <Settings01Icon size={20} className="text-zinc-400 mr-2" />
                  Settings
                </Button>
                <Button 
                  onClick={handleStartAudit} 
                  className="px-10 h-14 text-lg font-semibold rounded-2xl transition-all shadow-[0_0_30px_rgba(var(--accent-primary-rgb),0.15)] hover:shadow-[0_0_40px_rgba(var(--accent-primary-rgb),0.3)]"
                >
                  <PlayIcon size={20} className="mr-2" />
                  Begin First Crawl
                </Button>
              </div>
            </div>
          )}

          {/* Running Crawl Indicator */}
          {isAuditing && progress && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-md mb-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                  <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)] shrink-0">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
                  </div>
                  <div className="flex flex-col overflow-hidden w-full">
                    <span className="text-zinc-400 text-xs font-medium uppercase tracking-widest mb-1">
                      Crawl in progress
                    </span>
                    <span className="text-zinc-200 font-mono text-sm truncate flex items-center gap-2">
                      {progress.url}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-3xl font-light text-white tabular-nums tracking-tight">
                    {Math.round((progress.pages_crawled / maxPages) * 100)}<span className="text-zinc-500 text-xl ml-1">%</span>
                  </span>
                  <span className="text-xs text-zinc-500 font-medium tracking-wide mt-1">
                    {progress.pages_crawled} / {maxPages} URLs analyzed
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-zinc-800/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[var(--accent-primary)] h-full rounded-full transition-all duration-300 ease-out" 
                  style={{ 
                    width: `${Math.min((progress.pages_crawled / maxPages) * 100, 100)}%`,
                    boxShadow: '0 0 10px var(--accent-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Views */}
          {results.length > 0 && (
            <>
              {/* Tab Navigation */}
              {!selectedCategory && (
                <div className="flex items-center gap-8 border-b border-[var(--border-subtle)] mb-8">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-[var(--accent-primary)] text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab('issues')}
                    className={`pb-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'issues' ? 'border-[var(--accent-primary)] text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Issues
                    <span className="bg-zinc-800 text-xs px-2 py-0.5 rounded-full text-zinc-300">{allIssues.reduce((acc, iss) => acc + iss.count, 0)}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('pages')}
                    className={`pb-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'pages' ? 'border-[var(--accent-primary)] text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Pages
                    <span className="bg-zinc-800 text-xs px-2 py-0.5 rounded-full text-zinc-300">{results.length}</span>
                  </button>
                </div>
              )}

              {selectedCategory && subSectionData ? (
                /* Sub-Section Detail View */
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  {isGuidanceVisible && (
                    <div className="flex items-center justify-between bg-[var(--bg-surface)] p-3 px-4 rounded-xl border border-[var(--border-subtle)] shadow-sm animate-in fade-in zoom-in duration-300 relative group">
                      <p className="text-[var(--text-secondary)] text-sm flex-1">
                        Found on <strong className="text-white">{subSectionData.pages.length}</strong> pages. Click a page to see guidance on how to fix this issue.
                      </p>
                      <button 
                        onClick={() => setIsGuidanceVisible(false)}
                        className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-[var(--bg-base)] transition-colors"
                        title="Dismiss"
                      >
                        <Cancel01Icon size={16} />
                      </button>
                    </div>
                  )}

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
                /* Master Tab Views */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                  
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (() => {
                    const errorCount = allIssues.filter(i => i.severity.toLowerCase() === 'error').reduce((sum, i) => sum + i.count, 0);
                    const warningCount = allIssues.filter(i => i.severity.toLowerCase() === 'warning').reduce((sum, i) => sum + i.count, 0);
                    const noticeCount = allIssues.filter(i => i.severity.toLowerCase() === 'notice').reduce((sum, i) => sum + i.count, 0);
                    const totalIssuesCount = errorCount + warningCount + noticeCount;

                    const pagesWithErrors = results.filter(p => p.issues && p.issues.some(i => i.category.toLowerCase() === 'error')).length;
                    const totalPages = Math.max(1, results.length);
                    const pagesWithoutErrors = results.length - pagesWithErrors;
                    const errorDistPercent = (pagesWithoutErrors / totalPages) * 100;

                    const successCount = results.filter(p => p.status_code >= 200 && p.status_code < 300).length;
                    const redirectCount = results.filter(p => p.status_code >= 300 && p.status_code < 400).length;
                    const clientErrorCount = results.filter(p => p.status_code >= 400).length;
                    const successPercent = (successCount / totalPages) * 100;
                    const clientErrorPercent = (clientErrorCount / totalPages) * 100;

                    // Quick stats computations
                    const avgLoadTime = results.length > 0 ? Math.round(results.reduce((s, p) => s + p.load_time_ms, 0) / results.length) : 0;
                    const avgWordCount = results.length > 0 ? Math.round(results.reduce((s, p) => s + p.word_count, 0) / results.length) : 0;
                    const totalInternalLinks = results.reduce((s, p) => s + (p.in_links || 0), 0);
                    const orphanPages = results.filter(p => p.issues?.some(i => i.description === 'Orphan Page')).length;

                    // Content depth distribution
                    const depthBuckets = [
                      { label: '0–100', min: 0, max: 100, color: '#ef4444' },
                      { label: '100–300', min: 100, max: 300, color: '#f59e0b' },
                      { label: '300–500', min: 300, max: 500, color: '#eab308' },
                      { label: '500–1k', min: 500, max: 1000, color: '#22c55e' },
                      { label: '1000+', min: 1000, max: Infinity, color: '#3ecf8e' },
                    ];
                    const depthCounts = depthBuckets.map(b => ({
                      ...b,
                      count: results.filter(p => p.word_count >= b.min && p.word_count < b.max).length
                    }));
                    const maxDepthCount = Math.max(1, ...depthCounts.map(d => d.count));

                    // Top 5 issues for the overview card
                    const top5Issues = [...allIssues].sort((a, b) => {
                      const severityOrder: Record<string, number> = { Error: 0, Warning: 1, Notice: 2 };
                      const sDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
                      return sDiff !== 0 ? sDiff : b.count - a.count;
                    }).slice(0, 5);

                    // Large score gauge for the hero card
                    const HeroGauge = ({ score }: { score: number }) => {
                      const r = 64;
                      const sw = 8;
                      const nr = r - sw * 2;
                      const c = nr * 2 * Math.PI;
                      const off = c - (score / 100) * c;
                      const col = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
                      return (
                        <div className="relative flex items-center justify-center shrink-0" style={{ width: r * 2, height: r * 2 }}>
                          <div className="absolute inset-0 rounded-full opacity-20 blur-xl transition-all duration-700" style={{ background: col }} />
                          <svg height={r * 2} width={r * 2} className="transform -rotate-90 relative z-10">
                            <circle stroke={col} fill="transparent" strokeWidth={sw} r={nr} cx={r} cy={r} opacity={0.12} />
                            <circle
                              stroke={col}
                              fill="transparent"
                              strokeWidth={sw}
                              strokeDasharray={`${c} ${c}`}
                              style={{ strokeDashoffset: off, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                              strokeLinecap="round"
                              r={nr}
                              cx={r}
                              cy={r}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <span className="text-4xl font-black tracking-tighter" style={{ color: col }}>{score}</span>
                            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-0.5">/ 100</span>
                          </div>
                        </div>
                      );
                    };

                    return (
                    <div className="space-y-6">

                      {/* ─── ROW 1: Hero Health + Score Cards ─── */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ animationDelay: '0ms' }}>

                        {/* Hero Health Score — 2 col span */}
                        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-lg flex flex-col hover:border-[var(--border-strong)] transition-all duration-300 group overflow-hidden relative">
                          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-[0.07] transition-opacity duration-500 group-hover:opacity-[0.12]" style={{ background: mainStats.healthScore >= 80 ? '#22c55e' : mainStats.healthScore >= 50 ? '#eab308' : '#ef4444' }} />
                          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-[60px] opacity-[0.04]" style={{ background: 'var(--accent-primary)' }} />

                          <div 
                            onClick={() => { setActiveTab('issues'); setIssuesFilterSeverity('All'); }}
                            className="flex items-start justify-between relative z-10 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                                  <CheckmarkCircle01Icon size={18} className="text-[var(--accent-primary)]" />
                                </div>
                                <h3 className="text-white font-bold text-lg tracking-wide">Site Health</h3>
                                {renderDiffBadge(mainStats.healthScore, compareStats.healthScore)}
                              </div>
                              <p className="text-sm text-zinc-400 mt-3 leading-relaxed max-w-md">
                                {mainStats.healthScore >= 80
                                  ? `${mainStats.healthScore}% of your pages are error-free — excellent standing.`
                                  : mainStats.healthScore >= 50
                                  ? `${mainStats.healthScore}% of pages are clean. There's room to improve.`
                                  : `Only ${mainStats.healthScore}% of pages are error-free — action needed.`
                                }
                              </p>

                            </div>

                            <div className="ml-6 shrink-0">
                              <HeroGauge score={mainStats.healthScore} />
                            </div>
                          </div>

                          {/* Elegant Summary Stats */}
                          <div className="grid grid-cols-2 mt-auto pt-8 border-t border-[var(--border-subtle)] relative z-10">
                            
                            <div 
                              onClick={() => setActiveTab('pages')}
                              className="flex items-center gap-4 group cursor-pointer py-6 pr-8 border-r border-b border-[var(--border-subtle)] hover:bg-white/5 transition-colors"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 group-hover:border-zinc-600 transition-colors shadow-sm">
                                <File01Icon size={20} className="text-zinc-400" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5 group-hover:text-zinc-300 transition-colors">Crawled Pages</div>
                                <div className="text-2xl font-bold text-white tracking-tight">{results.length}</div>
                              </div>
                            </div>

                            <div 
                              onClick={() => { setActiveTab('issues'); setIssuesFilterSeverity('Error'); }}
                              className="flex items-center gap-4 group cursor-pointer py-6 pl-8 border-b border-[var(--border-subtle)] hover:bg-red-500/5 transition-colors"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center shrink-0 group-hover:border-red-500/30 transition-colors shadow-sm">
                                <Alert01Icon size={20} className="text-red-400" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5 group-hover:text-red-300 transition-colors">Pages w/ Errors</div>
                                <div className="text-2xl font-bold text-red-400 tracking-tight">{mainStats.pagesWithErrorsCount}</div>
                              </div>
                            </div>

                            <div 
                              onClick={() => setActiveTab('pages')}
                              className="flex items-center gap-4 group cursor-pointer py-6 pr-8 border-r border-[var(--border-subtle)] hover:bg-green-500/5 transition-colors"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center justify-center shrink-0 group-hover:border-green-500/30 transition-colors shadow-sm">
                                <CheckmarkCircle01Icon size={20} className="text-green-400" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5 group-hover:text-green-300 transition-colors">Clean Pages</div>
                                <div className="text-2xl font-bold text-green-400 tracking-tight">{mainStats.passedPages.length}</div>
                              </div>
                            </div>

                            <div 
                              onClick={() => { setActiveTab('issues'); setIssuesFilterSeverity('All'); }}
                              className="flex items-center gap-4 group cursor-pointer py-6 pl-8 hover:bg-yellow-500/5 transition-colors"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-center shrink-0 group-hover:border-yellow-500/30 transition-colors shadow-sm">
                                <InformationCircleIcon size={20} className="text-yellow-400" />
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5 group-hover:text-yellow-300 transition-colors">Total Issues</div>
                                <div className="text-2xl font-bold text-yellow-400 tracking-tight">{totalIssuesCount}</div>
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* SEO Score + Indexability — stacked in 1 col */}
                        <div className="flex flex-col gap-6">
                          {/* SEO Score */}
                          <div 
                            onClick={() => { setActiveTab('pages'); setPagesSort('seo_score'); }}
                            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm flex-1 flex flex-col hover:border-[var(--border-strong)] transition-all duration-300 group overflow-hidden relative cursor-pointer"
                          >
                            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-10" style={{ background: mainStats.seoScore >= 80 ? '#22c55e' : mainStats.seoScore >= 50 ? '#eab308' : '#ef4444' }} />
                            <div className="flex items-center justify-between relative z-10">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <File01Icon size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                                  <h3 className="text-white font-bold text-sm tracking-wide">SEO Score</h3>
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">On-page ranking factors</p>
                                <div className="mt-2 min-h-[20px]">
                                  {renderDiffBadge(mainStats.seoScore, compareStats.seoScore) || <span className="text-[10px] text-zinc-600 font-medium">vs previous</span>}
                                </div>
                              </div>
                              <ScoreGauge score={mainStats.seoScore} />
                            </div>
                          </div>

                          {/* Indexability */}
                          <div 
                            onClick={() => { setActiveTab('issues'); setIssuesFilterSeverity('Error'); }}
                            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm flex-1 flex flex-col hover:border-[var(--border-strong)] transition-all duration-300 group overflow-hidden relative cursor-pointer"
                          >
                            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-10" style={{ background: mainStats.visibilityScore >= 80 ? '#22c55e' : mainStats.visibilityScore >= 50 ? '#eab308' : '#ef4444' }} />
                            <div className="flex items-center justify-between relative z-10">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <EyeIcon size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                                  <h3 className="text-white font-bold text-sm tracking-wide">Indexability</h3>
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">Crawlable & accessible URLs</p>
                                <div className="mt-2 min-h-[20px]">
                                  {renderDiffBadge(mainStats.visibilityScore, compareStats.visibilityScore) || <span className="text-[10px] text-zinc-600 font-medium">vs previous</span>}
                                </div>
                              </div>
                              <ScoreGauge score={mainStats.visibilityScore} />
                            </div>
                          </div>

                          {/* Content Depth */}
                          <div 
                            onClick={() => { setActiveTab('pages'); setPagesSort('content_depth'); }}
                            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-sm flex-1 flex flex-col hover:border-[var(--border-strong)] transition-all duration-300 group overflow-hidden relative cursor-pointer"
                          >
                            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-10" style={{ background: mainStats.contentDepthScore >= 60 ? '#8b5cf6' : mainStats.contentDepthScore >= 30 ? '#eab308' : '#ef4444' }} />
                            <div className="flex items-center justify-between relative z-10">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <TextFontIcon size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                                  <h3 className="text-white font-bold text-sm tracking-wide">Content Depth</h3>
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">Content quality & richness</p>
                                <div className="mt-2 min-h-[20px]">
                                  {renderDiffBadge(mainStats.contentDepthScore, compareStats.contentDepthScore) || <span className="text-[10px] text-zinc-600 font-medium">vs previous</span>}
                                </div>
                              </div>
                              <ScoreGauge score={mainStats.contentDepthScore} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ─── ROW 2: Quick Stats Strip ─── */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-[var(--border-subtle)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-sm">
                        {[
                          { label: 'Total Pages', value: results.length.toString(), icon: <File01Icon size={16} className="text-[var(--accent-primary)]" />, onClick: () => setActiveTab('pages') },
                          { label: 'Avg Load Time', value: `${avgLoadTime}ms`, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, onClick: () => setActiveTab('pages') },
                          { label: 'Avg Word Count', value: avgWordCount.toLocaleString(), icon: <TextFontIcon size={16} className="text-blue-400" />, onClick: () => { setActiveTab('pages'); setPagesSort('content_depth'); } },
                          { label: 'Internal Links', value: totalInternalLinks.toLocaleString(), icon: <Link01Icon size={16} className="text-cyan-400" />, onClick: () => { setActiveTab('pages'); setPagesSort('in_links'); } },
                          { label: 'Orphan Pages', value: orphanPages.toString(), icon: <LinkSquare02Icon size={16} className={orphanPages > 0 ? 'text-yellow-400' : 'text-green-400'} />, onClick: () => { setActiveTab('issues'); setIssuesFilterSearch('Orphan Page'); setIssuesFilterSeverity('All'); } },
                        ].map((stat, idx) => (
                          <div key={idx} onClick={stat.onClick} className="bg-[var(--bg-surface)] flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer group">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-base)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              {stat.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-bold text-white leading-none">{stat.value}</div>
                              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1 truncate">{stat.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ─── ROW 3: Top Issues (2-col) + Donuts (1-col) ─── */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Top Issues Card — 2 col span */}
                        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm hover:border-[var(--border-strong)] transition-all duration-300 overflow-hidden">
                          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-3">
                              <h3 className="text-white font-bold text-base tracking-wide">Top Issues</h3>
                              <div className="text-xs font-bold text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">{totalIssuesCount} total</div>
                            </div>
                            <button
                              onClick={() => { setIssuesFilterSeverity('All'); setActiveTab('issues'); }}
                              className="text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors flex items-center gap-1 group/link"
                            >
                              View all
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/link:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                          </div>
                          {top5Issues.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                              <CheckmarkCircle01Icon size={40} className="text-green-500/40 mb-3" />
                              <p className="text-sm font-medium text-zinc-400">No issues detected — your site is looking healthy!</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                              {top5Issues.map((issue, i) => {
                                const maxCount = Math.max(1, top5Issues[0]?.count || 1);
                                const barWidth = (issue.count / maxCount) * 100;
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-all cursor-pointer group/row relative"
                                    onClick={() => setSelectedCategory(issue.title)}
                                  >
                                    {/* Severity dot */}
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${issue.severity === 'Error' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : issue.severity === 'Warning' ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]' : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]'}`} />
                                    
                                    {/* Issue icon + title */}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {getIssueIcon(issue.title, issue.severity, 16)}
                                      <span className="text-sm font-medium text-zinc-200 truncate group-hover/row:text-white transition-colors">{issue.title}</span>
                                    </div>

                                    {/* Mini bar + count */}
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                        <div
                                          className={`h-full rounded-full transition-all duration-700 ${issue.severity === 'Error' ? 'bg-red-500/70' : issue.severity === 'Warning' ? 'bg-yellow-500/70' : 'bg-blue-500/70'}`}
                                          style={{ width: `${barWidth}%` }}
                                        />
                                      </div>
                                      <span className={`text-sm font-bold tabular-nums w-8 text-right ${issue.severity === 'Error' ? 'text-red-400' : issue.severity === 'Warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                        {issue.count}
                                      </span>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover/row:text-zinc-300 group-hover/row:translate-x-0.5 transition-all">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                      </svg>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Combined Donuts Card — 1 col */}
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm hover:border-[var(--border-strong)] transition-all duration-300 overflow-hidden flex flex-col">
                          
                          {/* Error Distribution Mini */}
                          <div className="p-5 flex-1 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2 mb-4">
                              <h4 className="text-white font-bold text-sm tracking-wide">Error Distribution</h4>
                              <div className="text-[10px] font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">{results.length}</div>
                            </div>
                            <div className="flex items-center gap-5">
                              <div className="relative w-[72px] h-[72px] shrink-0 flex items-center justify-center group">
                                <div
                                  className="absolute inset-0 rounded-full transition-transform duration-500 group-hover:scale-105"
                                  style={{
                                    background: `conic-gradient(#22c55e 0% ${errorDistPercent}%, #ef4444 ${errorDistPercent}% 100%)`,
                                    maskImage: 'radial-gradient(transparent 54%, black 55%)',
                                    WebkitMaskImage: 'radial-gradient(transparent 54%, black 55%)'
                                  }}
                                />
                                <span className="text-[10px] font-bold text-zinc-400">{errorDistPercent.toFixed(0)}%</span>
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs text-zinc-400">Clean</span>
                                  </div>
                                  <span className="text-xs font-bold text-white">{pagesWithoutErrors}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-xs text-zinc-400">With errors</span>
                                  </div>
                                  <span className="text-xs font-bold text-white">{pagesWithErrors}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* HTTP Status Codes Mini */}
                          <div className="p-5 flex-1">
                            <div className="flex items-center gap-2 mb-4">
                              <h4 className="text-white font-bold text-sm tracking-wide">HTTP Status</h4>
                            </div>
                            <div className="flex items-center gap-5">
                              <div className="relative w-[72px] h-[72px] shrink-0 flex items-center justify-center group">
                                <div
                                  className="absolute inset-0 rounded-full transition-transform duration-500 group-hover:scale-105"
                                  style={{
                                    background: `conic-gradient(#22c55e 0% ${successPercent}%, #ef4444 ${successPercent}% ${successPercent + clientErrorPercent}%, #eab308 ${successPercent + clientErrorPercent}% 100%)`,
                                    maskImage: 'radial-gradient(transparent 54%, black 55%)',
                                    WebkitMaskImage: 'radial-gradient(transparent 54%, black 55%)'
                                  }}
                                />
                                <span className="text-[10px] font-bold text-zinc-400">{successPercent.toFixed(0)}%</span>
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs text-zinc-400">2xx</span>
                                  </div>
                                  <span className="text-xs font-bold text-white">{successCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-xs text-zinc-400">4xx</span>
                                  </div>
                                  <span className="text-xs font-bold text-white">{clientErrorCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <span className="text-xs text-zinc-400">3xx</span>
                                  </div>
                                  <span className="text-xs font-bold text-white">{redirectCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ─── ROW 4: Content Depth Analysis ─── */}
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm hover:border-[var(--border-strong)] transition-all duration-300 overflow-hidden">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
                          <div className="flex items-center gap-3">
                            <h3 className="text-white font-bold text-base tracking-wide">Content Depth Analysis</h3>
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">quality & distribution</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-[var(--border-subtle)]">
                          {/* Left: Word Count Distribution */}
                          <div className="px-6 py-6">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Word Count Distribution</h4>
                            <div className="flex items-end gap-3 h-32">
                              {depthCounts.map((bucket, i) => (
                                <div key={i} className="flex-1 h-full flex flex-col items-center group/bar cursor-default">
                                  <span className="text-xs font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums mb-1">{bucket.count}</span>
                                  <div className="w-full flex-1 relative flex justify-center items-end">
                                    <div
                                      className="w-full max-w-[64px] rounded-t-lg transition-all duration-500 ease-out group-hover/bar:opacity-90"
                                      style={{
                                        height: `${Math.max(4, (bucket.count / maxDepthCount) * 100)}%`,
                                        background: `linear-gradient(to top, ${bucket.color}cc, ${bucket.color}88)`,
                                        boxShadow: bucket.count > 0 ? `0 0 12px ${bucket.color}33` : 'none'
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-zinc-500 font-medium mt-2 whitespace-nowrap">{bucket.label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
                              <span className="text-[11px] text-zinc-500">
                                <span className="text-red-400 font-medium">{depthCounts[0].count + depthCounts[1].count}</span> thin pages (&lt;300 words)
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                <span className="text-green-400 font-medium">{depthCounts[3].count + depthCounts[4].count}</span> deep pages (500+)
                              </span>
                            </div>
                          </div>
                          
                          {/* Right: Content Quality Breakdown */}
                          <div className="px-6 py-6">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Content Quality Breakdown</h4>
                            {(() => {
                              const qualityBuckets = [
                                { label: 'Excellent', min: 75, max: 101, color: '#22c55e' },
                                { label: 'Good', min: 50, max: 75, color: '#3ecf8e' },
                                { label: 'Fair', min: 25, max: 50, color: '#eab308' },
                                { label: 'Poor', min: 0, max: 25, color: '#ef4444' },
                              ];
                              const qCounts = qualityBuckets.map(b => ({
                                ...b,
                                count: results.filter(p => (p.content_depth_score ?? 0) >= b.min && (p.content_depth_score ?? 0) < b.max).length
                              }));
                              const totalQ = results.length || 1;
                              return (
                                <div className="space-y-3">
                                  {qCounts.map((q, qi) => (
                                    <div key={qi} className="group/qbar cursor-default">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full" style={{ background: q.color }} />
                                          <span className="text-xs font-medium text-zinc-300">{q.label}</span>
                                          <span className="text-[10px] text-zinc-500">({q.min}-{q.max === 101 ? 100 : q.max})</span>
                                        </div>
                                        <span className="text-xs font-bold text-white tabular-nums">{q.count} <span className="text-zinc-500 font-normal">({Math.round((q.count / totalQ) * 100)}%)</span></span>
                                      </div>
                                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(q.count / totalQ) * 100}%`, background: q.color }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[var(--border-subtle)]">
                              <div className="text-center">
                                <div className="text-sm font-bold text-white">{Math.round(results.reduce((a, p) => a + (p.readability_score ?? 0), 0) / (results.length || 1))}</div>
                                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Readability</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-bold text-white">{results.filter(p => p.has_schema).length}</div>
                                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">With Schema</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-bold text-white">{results.filter(p => p.has_video || (p.image_count ?? 0) > 0).length}</div>
                                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Rich Media</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                    );
                  })()}

                  {/* Issues Tab */}
                  {activeTab === 'issues' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                        <h2 className="text-xl font-bold text-white">All Identified Issues</h2>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Select 
                            value={issuesFilterSeverity}
                            onChange={(val) => setIssuesFilterSeverity(val)}
                            className="min-w-[160px]"
                            options={[
                              { value: 'All', label: 'All Severities' },
                              { value: 'Error', label: 'Errors Only', colorClass: 'text-red-400' },
                              { value: 'Warning', label: 'Warnings Only', colorClass: 'text-yellow-400' },
                              { value: 'Notice', label: 'Notices Only', colorClass: 'text-blue-400' }
                            ]}
                          />
                          <div className="relative flex-1 sm:flex-none">
                            <Search01Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="text"
                              placeholder="Search issues..."
                              value={issuesFilterSearch}
                              onChange={(e) => setIssuesFilterSearch(e.target.value)}
                              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-sm rounded-lg pl-9 pr-4 py-2 text-white outline-none focus:border-[var(--accent-primary)] w-full sm:w-64"
                            />
                          </div>
                        </div>
                      </div>

                      {allIssues.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center text-zinc-500 flex flex-col items-center shadow-sm">
                          <CheckmarkCircle01Icon size={56} className="text-green-500/50 mb-4" />
                          <h3 className="text-lg font-bold text-white mb-2">Great job!</h3>
                          <p>No issues match your current filters.</p>
                        </div>
                      ) : (
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm text-left">
                            <thead>
                              <tr className="bg-[var(--bg-base)] text-zinc-400 border-b border-[var(--border-subtle)]">
                                <th className="p-4 font-medium">Issue Description</th>
                                <th className="p-4 font-medium w-36">Affected Pages</th>
                                <th className="p-4 font-medium w-32">Change</th>
                                <th className="p-4 font-medium w-28 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allIssues.map((issue, i) => {
                                const previousPagesCount = issue.severity === 'Error' 
                                  ? (compareStats.errorGroups[issue.title]?.length || 0) 
                                  : issue.severity === 'Warning'
                                    ? (compareStats.warningGroups[issue.title]?.length || 0)
                                    : (compareStats.noticeGroups?.[issue.title]?.length || 0);
                                  
                                return (
                                  <tr 
                                    key={i} 
                                    className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-white/5 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedCategory(issue.title)}
                                  >
                                    <td className="p-4 font-medium text-white">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          {getIssueIcon(issue.title, issue.severity)}
                                          <span>{issue.title}</span>
                                        </div>
                                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 w-16 justify-center ${
                                          issue.severity === 'Error' ? 'bg-red-500/10 text-red-500' : 
                                          issue.severity === 'Warning' ? 'bg-yellow-500/10 text-yellow-500' : 
                                          'bg-blue-500/10 text-blue-500'
                                        }`}>
                                          {issue.severity}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <span className="font-bold text-lg">{issue.count}</span>
                                    </td>
                                    <td className="p-4">
                                      {renderDiffBadge(issue.count, previousPagesCount, true) || <span className="text-xs text-zinc-500 font-medium ml-2">-</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-1 ml-auto">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                      </svg>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pages Tab */}
                  {activeTab === 'pages' && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                        <h2 className="text-xl font-bold text-white">Crawled Pages Data</h2>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <Select 
                            value={pagesSort}
                            onChange={(val) => setPagesSort(val as any)}
                            className="min-w-[200px]"
                            options={[
                              { value: 'internal_rank', label: 'Sort by Internal Rank' },
                              { value: 'content_depth', label: 'Sort by Content Depth' },
                              { value: 'seo_score', label: 'Sort by SEO Score' },
                              { value: 'in_links', label: 'Sort by In-Links' },
                              { value: 'url', label: 'Sort by URL' }
                            ]}
                          />
                          <div className="relative flex-1 sm:flex-none">
                            <Search01Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="text"
                              placeholder="Search URLs..."
                              value={pagesSearch}
                              onChange={(e) => setPagesSearch(e.target.value)}
                              className="bg-[var(--bg-base)] border border-[var(--border-subtle)] text-sm rounded-lg pl-9 pr-4 py-2 text-white outline-none focus:border-[var(--accent-primary)] w-full sm:w-64"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="bg-[var(--bg-base)] text-zinc-400 border-b border-[var(--border-subtle)]">
                              <th className="p-4 font-medium">URL & Title</th>
                              <th className="p-4 font-medium w-24 text-center">Status</th>
                              {pagesSort === 'content_depth' && (
                                <>
                                  <th className="p-4 font-medium w-32 text-center">Content Depth</th>
                                  <th className="p-4 font-medium w-28 text-right">Word Count</th>
                                </>
                              )}
                              {pagesSort === 'seo_score' && (
                                <>
                                  <th className="p-4 font-medium w-32 text-center">SEO Score</th>
                                  <th className="p-4 font-medium w-24 text-center">Issues</th>
                                </>
                              )}
                              {(pagesSort === 'internal_rank' || pagesSort === 'in_links' || pagesSort === 'url') && (
                                <>
                                  <th className="p-4 font-medium w-36 text-right">Internal Rank</th>
                                  <th className="p-4 font-medium w-24 text-right">In-Links</th>
                                  <th className="p-4 font-medium w-24 text-right">Out-Links</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPages.length === 0 ? (
                               <tr>
                                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                                    No pages match your search.
                                  </td>
                               </tr>
                            ) : pagesSort === 'url' ? (
                              buildUrlTree(sortedPages, targetUrl).map((node, i) => (
                                <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-hover)] transition-colors">
                                  <td className="p-4" style={{ paddingLeft: `${node.depth * 1.5 + 1}rem` }}>
                                    <div className="font-medium text-white break-all flex items-center gap-2">
                                      {node.isFolder && !node.page ? (
                                        <Folder01Icon size={16} className="text-yellow-500 shrink-0" />
                                      ) : (
                                        <File01Icon size={16} className="text-zinc-500 shrink-0" />
                                      )}
                                      <span className={node.page ? 'text-white' : 'text-zinc-400'}>
                                        {node.name === '/' ? targetUrl : '/' + node.name}
                                      </span>
                                    </div>
                                    {node.page && node.page.title && (
                                      <div className="text-xs text-zinc-500 mt-1 pl-6 truncate max-w-md" title={node.page.title}>{node.page.title}</div>
                                    )}
                                  </td>
                                  {node.page ? (
                                    <>
                                      <td className="p-4 text-center">
                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${node.page.status_code >= 400 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                          {node.page.status_code}
                                        </span>
                                      </td>
                                      <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                            <div className="h-full bg-blue-500" style={{ width: `${node.page.internal_rank || 0}%` }}></div>
                                          </div>
                                          <span className="font-mono text-zinc-300 w-6 text-right">{Math.round(node.page.internal_rank || 0)}</span>
                                        </div>
                                      </td>
                                      <td className="p-4 text-right font-mono text-zinc-400">{node.page.in_links || 0}</td>
                                      <td className="p-4 text-right font-mono text-zinc-400">{node.page.out_links || 0}</td>
                                    </>
                                  ) : (
                                    <td colSpan={4} className="p-4 text-zinc-500 italic text-xs text-center border-l border-white/5 bg-white/5">Directory node</td>
                                  )}
                                </tr>
                              ))
                            ) : sortedPages.map((p, i) => (
                              <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-hover)] transition-colors">
                                <td className="p-4">
                                  <div className="font-medium text-white break-all flex items-center gap-2">
                                    <LinkSquare02Icon size={14} className="text-zinc-500 shrink-0" />
                                    {p.url.replace(targetUrl, '') || '/'}
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-1 pl-5 truncate max-w-md" title={p.title || 'No title'}>{p.title || 'No title'}</div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${p.status_code >= 400 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {p.status_code}
                                  </span>
                                </td>
                                
                                {pagesSort === 'content_depth' && (
                                  <>
                                    <td className="p-4 text-center">
                                      <span className={`inline-flex px-2 py-1 rounded text-xs font-bold tabular-nums ${
                                        (p.content_depth_score ?? 0) >= 75 ? 'bg-green-500/10 text-green-400' :
                                        (p.content_depth_score ?? 0) >= 50 ? 'bg-emerald-500/10 text-emerald-400' :
                                        (p.content_depth_score ?? 0) >= 25 ? 'bg-yellow-500/10 text-yellow-400' :
                                        'bg-red-500/10 text-red-400'
                                      }`}>
                                        {Math.round(p.content_depth_score ?? 0)}
                                      </span>
                                    </td>
                                    <td className="p-4 text-right font-mono text-zinc-400">{p.word_count || 0} words</td>
                                  </>
                                )}

                                {pagesSort === 'seo_score' && (
                                  <>
                                    <td className="p-4 text-center">
                                      <span className={`inline-flex px-2 py-1 rounded text-xs font-bold tabular-nums ${
                                        (p.page_seo_score ?? 0) >= 80 ? 'bg-green-500/10 text-green-400' :
                                        (p.page_seo_score ?? 0) >= 50 ? 'bg-yellow-500/10 text-yellow-400' :
                                        'bg-red-500/10 text-red-400'
                                      }`}>
                                        {Math.round(p.page_seo_score ?? 0)}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className="inline-flex px-2 py-1 rounded text-xs font-bold bg-[var(--bg-base)] text-zinc-300">
                                        {p.issues?.length || 0}
                                      </span>
                                    </td>
                                  </>
                                )}

                                {(pagesSort === 'internal_rank' || pagesSort === 'in_links') && (
                                  <>
                                    <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                          <div className="h-full bg-blue-500" style={{ width: `${p.internal_rank || 0}%` }}></div>
                                        </div>
                                        <span className="font-mono text-zinc-300 w-6 text-right">{Math.round(p.internal_rank || 0)}</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-right font-mono text-zinc-400">{p.in_links || 0}</td>
                                    <td className="p-4 text-right font-mono text-zinc-400">{p.out_links || 0}</td>
                                  </>
                                )}

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)] block">Max Pages</label>
                  <Input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-secondary)] block">Crawl Speed (1-15)</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={crawlSpeed}
                    onChange={(e) => setCrawlSpeed(Math.max(1, Math.min(15, Number(e.target.value))))}
                    className="w-full"
                  />
                </div>
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
