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
    if (desc.includes("Duplicate Title Tag")) {
      return {
        why: "Duplicate titles confuse search engines about which page to rank for a query, often leading to keyword cannibalization.",
        current: `Current title: "${page.title}"`,
        fix: "Write a unique, descriptive title tag for every single page on your website."
      };
    }
    if (desc.includes("Duplicate Meta Description")) {
      return {
        why: "When multiple pages share the same meta description, search engines might ignore it or consider the pages as duplicates.",
        current: `Current description: "${page.meta_description}"`,
        fix: "Craft a unique meta description tailored specifically to the unique content of this page."
      };
    }
    if (desc.includes("Orphan Page")) {
      return {
        why: "Orphan pages have no internal links pointing to them. Search engine bots have trouble finding them, and they pass no internal link equity.",
        current: "No internal links found pointing to this page.",
        fix: "Find relevant pages on your site and add internal links pointing to this orphan page."
      };
    }
    if (desc.includes("Broken External Links")) {
      return {
        why: "Linking out to 404 pages harms the user experience and signals to search engines that your content is outdated or unmaintained.",
        current: "Found external links returning 4XX/5XX errors.",
        fix: "Remove the broken external links or replace them with links to live, relevant resources."
      };
    }
    if (desc.includes("Mixed Content")) {
      return {
        why: "Loading insecure (HTTP) assets on a secure (HTTPS) page breaks the browser's padlock and can trigger severe security warnings for users.",
        current: "Insecure HTTP links detected.",
        fix: "Update all absolute URLs linking to your assets or internal pages to use 'https://' instead of 'http://'."
      };
    }
    if (desc.includes("Multiple Canonical Tags")) {
      return {
        why: "Having more than one canonical tag on a page completely invalidates the signal. Search engines will ignore both.",
        current: "Multiple <link rel=\"canonical\"> tags found.",
        fix: "Remove the extra canonical tags. Ensure exactly one canonical tag exists in the <head>."
      };
    }
    if (desc.includes("Too many links on page")) {
      return {
        why: "While there's no strict limit, pages with excessive links (>100) dilute PageRank and can look spammy to search engines.",
        current: "More than 100 links found on this page.",
        fix: "Review your links. Remove unnecessary ones and ensure navigation menus aren't overly bloated."
      };
    }
    if (desc.includes("URL is too long")) {
      return {
        why: "Overly long URLs are difficult to read, hard to share, and truncated in search results. Best practice is keeping them under 115 characters.",
        current: `URL length is ${page.url.length} chars.`,
        fix: "Shorten the URL slug to contain just the primary keyword."
      };
    }
    if (desc.includes("URL contains underscores")) {
      return {
        why: "Search engines treat hyphens (-) as word separators, but do NOT treat underscores (_) as separators. 'seo_guide' is seen as 'seoguide'.",
        current: "Underscores detected in the URL path.",
        fix: "Set up a 301 redirect and change the URL slug to use hyphens instead of underscores."
      };
    }
    if (desc.includes("Missing Language Attribute")) {
      return {
        why: "The HTML lang attribute helps search engines and screen readers determine the language of the page content.",
        current: "No lang attribute found on the <html> tag.",
        fix: "Add the lang attribute to your root HTML element (e.g., <html lang=\"en\">)."
      };
    }
    if (desc.includes("CSS file size too large")) {
      return {
        why: "Large CSS files block rendering, significantly slowing down the time it takes for a user to see the page content.",
        current: "CSS content exceeds recommended size limits.",
        fix: "Minify your CSS, remove unused styles, and consider deferring non-critical CSS."
      };
    }
    if (desc.includes("Missing Viewport")) {
      return {
        why: "A viewport meta tag is essential for responsive design. Without it, mobile devices will render the page at desktop width, leading to a poor user experience and lower mobile search rankings.",
        current: "No viewport meta tag found.",
        fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> inside the <head> of your page."
      };
    }
    if (desc.includes("Open Graph")) {
      return {
        why: "Open Graph tags control how your page appears when shared on social media (Facebook, LinkedIn, etc.). Missing tags result in broken or unoptimized share previews.",
        current: "Missing required og:title, og:description, or og:image.",
        fix: "Add the required Open Graph meta tags to your <head> section."
      };
    }
    if (desc.includes("Twitter Card")) {
      return {
        why: "Twitter Card tags ensure your page displays a rich preview (image, title, description) when shared on Twitter.",
        current: "Missing twitter:card meta tag.",
        fix: "Add <meta name=\"twitter:card\" content=\"summary_large_image\"> to your <head>."
      };
    }
    if (desc.includes("Noindex")) {
      return {
        why: "A noindex tag tells search engines NOT to index the page. If this is intentional, ignore this notice. If unintentional, your page will not appear in search results.",
        current: "Found 'noindex' in meta robots tag.",
        fix: "If you want this page to be indexed, remove the 'noindex' directive from the meta robots tag."
      };
    }
    if (desc.includes("Image Alt")) {
      return {
        why: "Alt text is crucial for accessibility (screen readers) and helps search engines understand the content of the image, improving image search rankings.",
        current: "Found images without alt text.",
        fix: "Add descriptive alt=\"...\" attributes to all <img> tags."
      };
    }
    if (desc.includes("Multiple H1")) {
      return {
        why: "Having multiple H1 tags can confuse search engines about the primary topic of the page.",
        current: "More than one <h1> tag found.",
        fix: "Ensure there is only one <h1> tag that describes the main topic, and use H2-H6 for subheadings."
      };
    }
    if (desc.includes("Heading Hierarchy Broken")) {
      return {
        why: "Skipping heading levels (e.g., jumping from H2 to H4) breaks the logical structure of the page, making it harder for search engines and screen readers to understand.",
        current: "Heading levels are skipped.",
        fix: "Structure your headings sequentially (H1 > H2 > H3) without skipping levels."
      };
    }
    if (desc.includes("Content-to-HTML Ratio")) {
      return {
        why: "A very low ratio indicates the page has little actual text content compared to the code, which can be a sign of thin content or bloated code.",
        current: "Ratio is below 10%.",
        fix: "Either add more valuable text content to the page or optimize/minify the HTML code to reduce bloat."
      };
    }
    if (desc.includes("No Internal Links on Page")) {
      return {
        why: "A page with no outgoing internal links is a dead end for users and search engine crawlers, halting their journey through your site.",
        current: "Zero internal links found.",
        fix: "Add contextual links to other relevant pages within your website."
      };
    }
    if (desc.includes("Extremely Large Page")) {
      return {
        why: "Pages larger than 3MB are slow to load, especially on mobile networks, leading to high bounce rates and lower search rankings.",
        current: "Page response size > 3MB.",
        fix: "Optimize images, minify CSS/JS, and reduce unnecessary DOM elements to decrease the page size."
      };
    }
    if (desc.includes("Structured data has Google rich results validation error")) {
      return {
        why: "Invalid structured data prevents search engines from displaying rich snippets (like star ratings, prices, or FAQs) for your page in search results.",
        current: "JSON-LD structured data failed parsing or is missing required fields.",
        fix: "Use the Google Rich Results Test tool to validate your JSON-LD syntax and add all required properties."
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
