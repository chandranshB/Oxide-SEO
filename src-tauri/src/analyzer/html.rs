use scraper::{Html, Selector};
use url::Url;
use crate::models::*;

/// Perform comprehensive HTML analysis on a page.
/// Returns a ContentDepthAnalysis with all extracted data.
pub fn analyze_page(
    html_text: &str,
    base_url: &Url,
    domain: &str,
    current_url: &str,
    response_size: usize,
) -> ContentDepthAnalysis {
    let mut issues = Vec::new();
    let document = Html::parse_document(html_text);

    // --- HTML lang attribute ---
    let html_selector = Selector::parse("html").unwrap();
    if let Some(html_el) = document.select(&html_selector).next() {
        if html_el.value().attr("lang").is_none() {
            issues.push(AuditIssue { category: "Notice".to_string(), description: "Missing Language Attribute".to_string() });
        }
    } else {
        issues.push(AuditIssue { category: "Notice".to_string(), description: "Missing Language Attribute".to_string() });
    }

    // --- Viewport meta tag ---
    let viewport_sel = Selector::parse("meta[name=\"viewport\"]").unwrap();
    if document.select(&viewport_sel).next().is_none() {
        issues.push(AuditIssue { category: "Error".to_string(), description: "Missing Viewport Meta Tag".to_string() });
    }

    // --- Canonical tag ---
    let canonical_selector = Selector::parse("link[rel=\"canonical\"]").unwrap();
    let canonical_elements: Vec<_> = document.select(&canonical_selector).collect();
    let canonical_url = canonical_elements.first()
        .and_then(|el| el.value().attr("href"))
        .map(|s| s.trim().to_string());
    if canonical_elements.is_empty() {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Missing Canonical Tag".to_string() });
    } else if canonical_elements.len() > 1 {
        issues.push(AuditIssue { category: "Error".to_string(), description: "Multiple Canonical Tags".to_string() });
    }

    // --- Meta robots ---
    let robots_sel = Selector::parse("meta[name=\"robots\"]").unwrap();
    let meta_robots = document.select(&robots_sel).next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_lowercase());
    if let Some(ref robots_content) = meta_robots {
        if robots_content.contains("noindex") {
            issues.push(AuditIssue { category: "Notice".to_string(), description: "Noindex Tag Detected".to_string() });
        }
    }

    // --- Open Graph tags ---
    let og_title_sel = Selector::parse("meta[property=\"og:title\"]").unwrap();
    let og_desc_sel = Selector::parse("meta[property=\"og:description\"]").unwrap();
    let og_image_sel = Selector::parse("meta[property=\"og:image\"]").unwrap();
    let has_og_title = document.select(&og_title_sel).next().is_some();
    let has_og_desc = document.select(&og_desc_sel).next().is_some();
    let og_image = document.select(&og_image_sel).next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_string());
    if !has_og_title || !has_og_desc || og_image.is_none() {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Missing Open Graph Tags".to_string() });
    }

    // --- Twitter Card ---
    let twitter_sel = Selector::parse("meta[name=\"twitter:card\"]").unwrap();
    if document.select(&twitter_sel).next().is_none() {
        issues.push(AuditIssue { category: "Notice".to_string(), description: "Missing Twitter Card Tags".to_string() });
    }

    // --- Images ---
    let img_selector = Selector::parse("img").unwrap();
    let mut image_count: usize = 0;
    let mut images_without_alt: usize = 0;
    for img in document.select(&img_selector) {
        image_count += 1;
        if let Some(alt) = img.value().attr("alt") {
            if alt.trim().is_empty() { images_without_alt += 1; }
        } else {
            images_without_alt += 1;
        }
    }
    if images_without_alt > 0 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Missing Image Alt Text".to_string() });
    }

    // --- Title ---
    let title_selector = Selector::parse("title").unwrap();
    let title_elements: Vec<_> = document.select(&title_selector).collect();
    let mut all_titles = Vec::new();
    for el in &title_elements {
        let text = el.text().collect::<Vec<_>>().join(" ").trim().to_string();
        all_titles.push(text);
    }
    
    if all_titles.len() > 1 {
        let titles_json = serde_json::to_string(&all_titles).unwrap_or_else(|_| "[]".to_string());
        issues.push(AuditIssue { 
            category: "Error".to_string(), 
            description: format!("Multiple Title Tags In Page|{}", titles_json) 
        });
    }

    let title = all_titles.first().cloned();
    if let Some(t) = &title {
        if t.is_empty() {
            issues.push(AuditIssue { category: "Error".to_string(), description: "Missing Title".to_string() });
        } else if t.len() < 30 {
            issues.push(AuditIssue { category: "Warning".to_string(), description: "Title too short (< 30 chars)".to_string() });
        } else if t.len() > 60 {
            issues.push(AuditIssue { category: "Warning".to_string(), description: "Title too long (> 60 chars)".to_string() });
        }
    } else {
        issues.push(AuditIssue { category: "Error".to_string(), description: "Missing Title".to_string() });
    }

    // --- Meta Description ---
    let meta_selector = Selector::parse("meta[name=\"description\"]").unwrap();
    let meta_description = document.select(&meta_selector).next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_string());
    if let Some(d) = &meta_description {
        if d.is_empty() {
            issues.push(AuditIssue { category: "Warning".to_string(), description: "Missing Meta Description".to_string() });
        } else if d.len() < 70 {
            issues.push(AuditIssue { category: "Warning".to_string(), description: "Meta Description too short (< 70 chars)".to_string() });
        } else if d.len() > 160 {
            issues.push(AuditIssue { category: "Warning".to_string(), description: "Meta Description too long (> 160 chars)".to_string() });
        }
    } else {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Missing Meta Description".to_string() });
    }

    // --- Headings ---
    let h1_selector = Selector::parse("h1").unwrap();
    let h1_count = document.select(&h1_selector).count();
    if h1_count == 0 {
        issues.push(AuditIssue { category: "Error".to_string(), description: "Missing H1".to_string() });
    } else if h1_count > 1 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Multiple H1 tags".to_string() });
    }
    let h1 = document.select(&h1_selector).next()
        .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string());

    // Count all headings and check hierarchy
    let all_headings_sel = Selector::parse("h1, h2, h3, h4, h5, h6").unwrap();
    let mut heading_count: usize = 0;
    let mut heading_depth: usize = 0;
    let mut prev_level: usize = 0;
    let mut hierarchy_broken = false;
    for heading in document.select(&all_headings_sel) {
        heading_count += 1;
        let tag = heading.value().name();
        let level: usize = tag[1..].parse().unwrap_or(0);
        if level > heading_depth { heading_depth = level; }
        if prev_level > 0 && level > prev_level + 1 {
            hierarchy_broken = true;
        }
        prev_level = level;
    }
    if hierarchy_broken {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Heading Hierarchy Broken".to_string() });
    }

    // --- Body text extraction ---
    let mut full_text = String::new();
    let body_selector = Selector::parse("body").unwrap();
    if let Some(body) = document.select(&body_selector).next() {
        for node in body.descendants() {
            if let scraper::Node::Text(text) = node.value() {
                if let Some(parent) = node.parent() {
                    if let scraper::Node::Element(el) = parent.value() {
                        let name = el.name();
                        if name != "script" && name != "style" && name != "noscript" {
                            full_text.push_str(&text.text);
                            full_text.push(' ');
                        }
                    }
                }
            }
        }
    }
    let word_count = full_text.split_whitespace().count();
    if word_count < 300 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Low word count (< 300 words)".to_string() });
    }

    // Content-to-HTML ratio
    let text_bytes = full_text.trim().len();
    let content_to_html_ratio = if response_size > 0 {
        (text_bytes as f64) / (response_size as f64)
    } else {
        0.0
    };
    if content_to_html_ratio < 0.10 && word_count > 50 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Low Content-to-HTML Ratio".to_string() });
    }

    // --- Readability (Flesch-Kincaid) ---
    let (readability_score, avg_sentence_length) = compute_readability(&full_text);

    // --- Paragraphs ---
    let p_sel = Selector::parse("p").unwrap();
    let paragraph_count = document.select(&p_sel)
        .filter(|el| !el.text().collect::<Vec<_>>().join("").trim().is_empty())
        .count();

    // --- Media richness ---
    let table_sel = Selector::parse("table").unwrap();
    let has_table = document.select(&table_sel).next().is_some();

    let list_sel = Selector::parse("ul, ol").unwrap();
    let has_list = document.select(&list_sel).next().is_some();

    let video_sel = Selector::parse("video").unwrap();
    let iframe_sel = Selector::parse("iframe").unwrap();
    let mut has_video = document.select(&video_sel).next().is_some();
    if !has_video {
        for iframe in document.select(&iframe_sel) {
            if let Some(src) = iframe.value().attr("src") {
                let src_lower = src.to_lowercase();
                if src_lower.contains("youtube") || src_lower.contains("vimeo") || src_lower.contains("dailymotion") {
                    has_video = true;
                    break;
                }
            }
        }
    }

    // --- Inline CSS size ---
    let style_selector = Selector::parse("style").unwrap();
    let mut total_inline_css_size = 0;
    for style in document.select(&style_selector) {
        total_inline_css_size += style.inner_html().len();
    }
    if total_inline_css_size > 50 * 1024 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "CSS file size too large".to_string() });
    }

    // --- Structured data ---
    let mut has_schema = false;
    let mut schema_types: Vec<String> = Vec::new();
    let script_selector = Selector::parse("script[type=\"application/ld+json\"]").unwrap();
    for script in document.select(&script_selector) {
        let json_text = script.inner_html();
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_text) {
            has_schema = true;
            // Extract @type
            if let Some(t) = val.get("@type").and_then(|v| v.as_str()) {
                schema_types.push(t.to_string());
            } else if let Some(arr) = val.as_array() {
                for item in arr {
                    if let Some(t) = item.get("@type").and_then(|v| v.as_str()) {
                        schema_types.push(t.to_string());
                    }
                }
            } else if val.get("@graph").is_some() {
                if let Some(graph) = val.get("@graph").and_then(|v| v.as_array()) {
                    for item in graph {
                        if let Some(t) = item.get("@type").and_then(|v| v.as_str()) {
                            schema_types.push(t.to_string());
                        }
                    }
                }
            } else {
                issues.push(AuditIssue { category: "Notice".to_string(), description: "Structured data has Google rich results validation error".to_string() });
            }
        } else {
            issues.push(AuditIssue { category: "Notice".to_string(), description: "Structured data has Google rich results validation error".to_string() });
        }
    }

    // --- Links ---
    let a_selector = Selector::parse("a").unwrap();
    let mut internal_links: Vec<String> = Vec::new();
    let mut external_links: Vec<String> = Vec::new();
    let mut total_links: usize = 0;
    let mut has_mixed_content = false;
    let mut internal_out_count: usize = 0;

    for a_tag in document.select(&a_selector) {
        if let Some(href) = a_tag.value().attr("href") {
            total_links += 1;
            if let Ok(parsed_url) = base_url.join(href) {
                if parsed_url.scheme() == "http" && base_url.scheme() == "https" {
                    has_mixed_content = true;
                }
                if parsed_url.domain() == Some(domain) || parsed_url.domain() == base_url.domain() {
                    let mut normalized = parsed_url.clone();
                    normalized.set_fragment(None);
                    internal_links.push(normalized.to_string());
                    internal_out_count += 1;
                } else if parsed_url.scheme() == "http" || parsed_url.scheme() == "https" {
                    external_links.push(parsed_url.to_string());
                }
            }
        }
    }
    if total_links > 100 {
        issues.push(AuditIssue { category: "Notice".to_string(), description: "Too many links on page (> 100)".to_string() });
    }
    if has_mixed_content {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Mixed Content (HTTP links on HTTPS page)".to_string() });
    }
    if internal_out_count == 0 && word_count > 50 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "No Internal Links on Page".to_string() });
    }

    // --- URL checks ---
    if current_url.len() > 115 {
        issues.push(AuditIssue { category: "Notice".to_string(), description: "URL is too long (> 115 chars)".to_string() });
    }
    if current_url.contains("_") {
        issues.push(AuditIssue { category: "Notice".to_string(), description: "URL contains underscores".to_string() });
    }

    // --- Response size ---
    if response_size > 3 * 1024 * 1024 {
        issues.push(AuditIssue { category: "Warning".to_string(), description: "Extremely Large Page (> 3MB)".to_string() });
    }

    ContentDepthAnalysis {
        word_count,
        heading_count,
        heading_depth,
        image_count,
        images_without_alt,
        paragraph_count,
        has_table,
        has_list,
        has_video,
        readability_score,
        avg_sentence_length,
        content_to_html_ratio,
        full_text,
        internal_links,
        external_links,
        schema_types,
        has_schema,
        meta_robots,
        canonical_url,
        og_image,
        issues,
        title,
        meta_description,
        h1,
    }
}

/// Compute Flesch-Kincaid readability score and average sentence length.
fn compute_readability(text: &str) -> (f64, f64) {
    let text = text.trim();
    if text.is_empty() {
        return (0.0, 0.0);
    }

    let words: Vec<&str> = text.split_whitespace().collect();
    let total_words = words.len();
    if total_words == 0 {
        return (0.0, 0.0);
    }

    // Count sentences (split by . ! ?)
    let total_sentences = text.split(|c: char| c == '.' || c == '!' || c == '?')
        .filter(|s| !s.trim().is_empty())
        .count()
        .max(1);

    // Count syllables (simple heuristic: count vowel groups)
    let mut total_syllables: usize = 0;
    for word in &words {
        total_syllables += count_syllables(word);
    }

    let avg_sentence_length = total_words as f64 / total_sentences as f64;
    let avg_syllables_per_word = total_syllables as f64 / total_words as f64;

    // Flesch Reading Ease formula
    let score = 206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables_per_word;
    let score = score.clamp(0.0, 100.0);

    (score, avg_sentence_length)
}

/// Count syllables in a word using vowel-group heuristic.
fn count_syllables(word: &str) -> usize {
    let word = word.to_lowercase();
    let vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    let mut count: usize = 0;
    let mut prev_vowel = false;

    for ch in word.chars() {
        if vowels.contains(&ch) {
            if !prev_vowel {
                count += 1;
            }
            prev_vowel = true;
        } else {
            prev_vowel = false;
        }
    }

    // Silent e adjustment
    if word.ends_with('e') && count > 1 {
        count -= 1;
    }

    count.max(1)
}
