use serde::Serialize;

// ─── Crawl Progress ───

#[derive(Clone, Serialize)]
pub struct AuditProgress {
    pub url: String,
    pub status: String,
    pub pages_crawled: usize,
}

// ─── Issues ───

#[derive(Clone, Serialize, Debug)]
pub struct AuditIssue {
    pub category: String,
    pub description: String,
}

// ─── Per-Page Result ───

#[derive(Clone, Serialize)]
pub struct AuditPageResult {
    // Core crawl data
    pub url: String,
    pub status_code: u16,
    pub title: Option<String>,
    pub meta_description: Option<String>,
    pub h1: Option<String>,
    pub word_count: usize,
    pub load_time_ms: u64,
    pub issues: Vec<AuditIssue>,

    // Content depth metrics
    pub content_depth_score: f64,
    pub heading_count: usize,
    pub heading_depth: usize,
    pub image_count: usize,
    pub images_without_alt: usize,
    pub internal_link_count: usize,
    pub external_link_count: usize,
    pub has_schema: bool,
    pub schema_types: Vec<String>,
    pub readability_score: f64,
    pub avg_sentence_length: f64,
    pub paragraph_count: usize,
    pub has_table: bool,
    pub has_list: bool,
    pub has_video: bool,
    pub content_to_html_ratio: f64,
    pub meta_robots: Option<String>,
    pub canonical_url: Option<String>,
    pub og_image: Option<String>,
    pub response_size_bytes: usize,

    // Scoring
    pub page_seo_score: f64,
    pub crawl_depth: usize,
}

impl Default for AuditPageResult {
    fn default() -> Self {
        Self {
            url: String::new(),
            status_code: 0,
            title: None,
            meta_description: None,
            h1: None,
            word_count: 0,
            load_time_ms: 0,
            issues: Vec::new(),
            content_depth_score: 0.0,
            heading_count: 0,
            heading_depth: 0,
            image_count: 0,
            images_without_alt: 0,
            internal_link_count: 0,
            external_link_count: 0,
            has_schema: false,
            schema_types: Vec::new(),
            readability_score: 0.0,
            avg_sentence_length: 0.0,
            paragraph_count: 0,
            has_table: false,
            has_list: false,
            has_video: false,
            content_to_html_ratio: 0.0,
            meta_robots: None,
            canonical_url: None,
            og_image: None,
            response_size_bytes: 0,
            page_seo_score: 0.0,
            crawl_depth: 0,
        }
    }
}

// ─── Link Graph ───

#[derive(Clone, Serialize, Default)]
pub struct AuditGraphNode {
    pub url: String,
    pub in_links: usize,
    pub out_links: usize,
    pub internal_rank: f64,
}

#[derive(Clone, Serialize)]
pub struct AuditGraphResults {
    pub nodes: Vec<AuditGraphNode>,
}

#[derive(Clone, Serialize)]
pub struct AuditOrphanPages {
    pub orphan_pages: Vec<String>,
}

// ─── Content Depth Analysis (intermediate, from HTML parsing) ───

pub struct ContentDepthAnalysis {
    pub word_count: usize,
    pub heading_count: usize,
    pub heading_depth: usize,
    pub image_count: usize,
    pub images_without_alt: usize,
    pub paragraph_count: usize,
    pub has_table: bool,
    pub has_list: bool,
    pub has_video: bool,
    pub readability_score: f64,
    pub avg_sentence_length: f64,
    pub content_to_html_ratio: f64,
    pub full_text: String,
    pub internal_links: Vec<String>,
    pub external_links: Vec<String>,
    pub schema_types: Vec<String>,
    pub has_schema: bool,
    pub meta_robots: Option<String>,
    pub canonical_url: Option<String>,
    pub og_image: Option<String>,
    pub issues: Vec<AuditIssue>,
    pub title: Option<String>,
    pub meta_description: Option<String>,
    pub h1: Option<String>,
}

// ─── Keyword / Competitor types ───

#[derive(Serialize)]
pub struct Heading {
    pub tag: String,
    pub text: String,
}

#[derive(Serialize)]
pub struct KeywordFreq {
    pub word: String,
    pub count: usize,
}

#[derive(Serialize)]
pub struct CompetitorData {
    pub title: String,
    pub meta_description: String,
    pub word_count: usize,
    pub headings: Vec<Heading>,
    pub top_keywords: Vec<KeywordFreq>,
}
