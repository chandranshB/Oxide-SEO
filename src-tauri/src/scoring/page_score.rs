use crate::models::AuditPageResult;

/// Compute a per-page SEO score (0-100) using a weighted multi-factor model.
/// This replaces the simple frontend exponential decay model.
pub fn compute(page: &AuditPageResult) -> f64 {
    let on_page = compute_on_page_score(page);
    let content = page.content_depth_score;
    let technical = compute_technical_score(page);
    let link_health = compute_link_health(page);
    let accessibility = compute_accessibility_score(page);

    let score = on_page * 0.35
        + content * 0.25
        + technical * 0.20
        + link_health * 0.10
        + accessibility * 0.10;

    score.clamp(0.0, 100.0).round()
}

/// On-page factors: title, meta desc, H1, content
fn compute_on_page_score(page: &AuditPageResult) -> f64 {
    let mut score: f64 = 100.0;
    let issues = &page.issues;

    for issue in issues {
        let desc = &issue.description;
        match issue.category.as_str() {
            "Error" => {
                if desc.contains("Missing Title") { score -= 25.0; }
                else if desc.contains("Missing H1") { score -= 20.0; }
                else if desc.contains("Duplicate Title") { score -= 15.0; }
                else if desc.contains("Duplicate Meta Description") { score -= 10.0; }
                else if desc.contains("Missing Viewport") { score -= 20.0; }
                else if desc.contains("Multiple Canonical") { score -= 15.0; }
            }
            "Warning" => {
                if desc.contains("Missing Meta Description") { score -= 10.0; }
                else if desc.contains("Title too short") || desc.contains("Title too long") { score -= 8.0; }
                else if desc.contains("Meta Description too short") || desc.contains("Meta Description too long") { score -= 5.0; }
                else if desc.contains("Multiple H1") { score -= 8.0; }
                else if desc.contains("Missing Canonical") { score -= 10.0; }
                else if desc.contains("Low word count") { score -= 12.0; }
                else if desc.contains("Missing Image Alt") { score -= 5.0; }
                else if desc.contains("Open Graph") { score -= 5.0; }
                else if desc.contains("Heading Hierarchy") { score -= 5.0; }
            }
            _ => {} // Notices don't affect on-page score
        }
    }
    score.max(0.0)
}

/// Technical factors: status code, load time, page size
fn compute_technical_score(page: &AuditPageResult) -> f64 {
    let mut score: f64 = 100.0;

    // Status code
    if page.status_code >= 400 {
        score -= 50.0;
    } else if page.status_code >= 300 {
        score -= 15.0;
    }

    // Load time
    if page.load_time_ms > 5000 {
        score -= 30.0;
    } else if page.load_time_ms > 3000 {
        score -= 15.0;
    } else if page.load_time_ms > 2000 {
        score -= 5.0;
    }

    // Response size
    if page.response_size_bytes > 3 * 1024 * 1024 {
        score -= 20.0;
    } else if page.response_size_bytes > 1024 * 1024 {
        score -= 10.0;
    }

    // Content-to-HTML ratio
    if page.content_to_html_ratio < 0.05 && page.word_count > 50 {
        score -= 10.0;
    }

    score.max(0.0)
}

/// Link health: broken links, orphan status
fn compute_link_health(page: &AuditPageResult) -> f64 {
    let mut score: f64 = 100.0;
    for issue in &page.issues {
        if issue.description.contains("Broken External Links") {
            score -= 25.0;
        }
        if issue.description.contains("Orphan Page") {
            score -= 30.0;
        }
        if issue.description.contains("No Internal Links on Page") {
            score -= 20.0;
        }
        if issue.description.contains("Mixed Content") {
            score -= 15.0;
        }
    }
    score.max(0.0)
}

/// Accessibility: alt text, lang attr
fn compute_accessibility_score(page: &AuditPageResult) -> f64 {
    let mut score: f64 = 100.0;
    for issue in &page.issues {
        if issue.description.contains("Missing Language Attribute") {
            score -= 20.0;
        }
        if issue.description.contains("Missing Image Alt") {
            score -= 30.0;
        }
        if issue.description.contains("Missing Viewport") {
            score -= 25.0;
        }
    }
    score.max(0.0)
}
