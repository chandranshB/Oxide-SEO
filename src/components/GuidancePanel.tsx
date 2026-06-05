import { Cancel01Icon, ArrowRight01Icon } from 'hugeicons-react';

interface AuditPageResult {
  url: string;
  status_code: number;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number;
  load_time_ms: number;
  issues: { category: string; description: string }[];
}

interface GuidancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  issueDescription: string | null;
  page: AuditPageResult | null;
}

export function GuidancePanel({ isOpen, onClose, issueDescription, page }: GuidancePanelProps) {
  if (!isOpen || !issueDescription || !page) return null;

  const getGuidance = (desc: string) => {
    if (desc.includes("Missing Title")) {
      return {
        why: "The title tag is the most important on-page SEO element. It tells search engines and users exactly what the page is about.",
        current: "No title tag found on this page.",
        fix: "Add a <title> tag inside the <head> section of your HTML, or use your CMS to set an SEO Title. Keep it between 30-60 characters."
      };
    }
    if (desc.includes("Title too short")) {
      return {
        why: "Short titles miss the opportunity to include valuable keywords and might not provide enough context for users.",
        current: `Current title: "${page.title}" (${page.title?.length} chars)`,
        fix: "Expand your title to 30-60 characters. Include your primary keyword and make it descriptive."
      };
    }
    if (desc.includes("Title too long")) {
      return {
        why: "Search engines typically truncate titles longer than 60 characters, which can make your listing look broken and lower CTR.",
        current: `Current title: "${page.title}" (${page.title?.length} chars)`,
        fix: "Trim your title to under 60 characters while keeping the most important keywords at the beginning."
      };
    }
    if (desc.includes("Missing Meta Description")) {
      return {
        why: "Meta descriptions act as a pitch for your page in search results. Without one, search engines will guess and grab random text.",
        current: "No meta description found.",
        fix: "Add a <meta name=\"description\" content=\"...\"> tag. Keep it between 120-160 characters and write a compelling summary."
      };
    }
    if (desc.includes("Meta Description too long")) {
      return {
        why: "Descriptions over 160 characters will be cut off in search results with an ellipsis (...).",
        current: `Current length: ${page.meta_description?.length} chars`,
        fix: "Edit your description to be concise and under 160 characters while retaining a clear call-to-action."
      };
    }
    if (desc.includes("Missing H1")) {
      return {
        why: "The H1 tag is the main heading of a page. It provides critical structural context to search engines.",
        current: "No H1 tag found.",
        fix: "Ensure exactly one <h1> tag exists on the page, and that it clearly describes the page's main topic."
      };
    }
    if (desc.includes("Broken link")) {
      return {
        why: "Broken links create terrible user experiences and signal to search engines that your site is unmaintained.",
        current: `HTTP Status Code: ${page.status_code}`,
        fix: "Check why the page is returning an error. If the page was moved, set up a 301 redirect. Otherwise, restore the content."
      };
    }
    if (desc.includes("Low word count")) {
      return {
        why: "Thin content (under 300 words) often struggles to rank because it doesn't provide enough depth or value on a topic.",
        current: `Current word count: ${page.word_count} words`,
        fix: "Consider expanding the content to be more comprehensive, or combine it with another page if it doesn't warrant its own page."
      };
    }
    return {
      why: "This issue impacts your search engine visibility or user experience.",
      current: "See page details.",
      fix: "Review standard SEO best practices for this element."
    };
  };

  const guidance = getGuidance(issueDescription);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-strong)] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <h2 className="text-xl font-bold">Issue Guidance</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-base)] rounded-xl transition-colors text-zinc-400 hover:text-white">
            <Cancel01Icon size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">The Issue</div>
            <div className="text-lg font-medium text-red-400">{issueDescription}</div>
            <a href={page.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1 mt-1 break-all">
              {page.url} <ArrowRight01Icon size={14} />
            </a>
          </div>

          <div className="p-4 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl">
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Current State</div>
            <div className="text-zinc-300 font-mono text-sm">{guidance.current}</div>
          </div>

          <div>
            <div className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">Why it matters</div>
            <p className="text-zinc-300 leading-relaxed">{guidance.why}</p>
          </div>

          <div className="p-5 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-2xl">
            <div className="text-sm font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-2">How to fix it</div>
            <p className="text-white leading-relaxed">{guidance.fix}</p>
          </div>
        </div>
      </div>
    </>
  );
}
