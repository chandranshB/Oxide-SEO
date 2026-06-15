use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct HeadingNode {
    pub level: usize,
    pub text: String,
}

#[derive(Serialize)]
pub struct CrawlerViewResult {
    pub url: String,
    pub raw_text: String,
    pub headings: Vec<HeadingNode>,
    pub title: Option<String>,
    pub meta_description: Option<String>,
    pub meta_robots: Option<String>,
    pub schema_json: Vec<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn fetch_page_content_view(url: String) -> Result<CrawlerViewResult, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP Error: {}", response.status()));
    }

    let html_text = response.text().await.map_err(|e| e.to_string())?;
    let document = Html::parse_document(&html_text);

    // Extract Title
    let title_selector = Selector::parse("title").unwrap();
    let title = document.select(&title_selector).next()
        .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string());

    // Extract Meta Description
    let meta_desc_sel = Selector::parse("meta[name=\"description\"]").unwrap();
    let meta_description = document.select(&meta_desc_sel).next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_string());

    // Extract Meta Robots
    let meta_robots_sel = Selector::parse("meta[name=\"robots\"]").unwrap();
    let meta_robots = document.select(&meta_robots_sel).next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_string());

    // Extract Headings
    let mut headings = Vec::new();
    let headings_sel = Selector::parse("h1, h2, h3, h4, h5, h6").unwrap();
    for heading in document.select(&headings_sel) {
        let tag = heading.value().name();
        let level = tag[1..].parse().unwrap_or(0);
        let text = heading.text().collect::<Vec<_>>().join(" ").trim().to_string();
        if !text.is_empty() {
            headings.push(HeadingNode { level, text });
        }
    }

    // Extract Schema
    let mut schema_json = Vec::new();
    let schema_sel = Selector::parse("script[type=\"application/ld+json\"]").unwrap();
    for script in document.select(&schema_sel) {
        let text = script.inner_html().trim().to_string();
        if !text.is_empty() {
            schema_json.push(text);
        }
    }

    // Extract Raw Text (strip script, style)
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
                            full_text.push('\n');
                        }
                    }
                }
            }
        }
    }

    // Cleanup raw_text (remove multiple newlines and spaces)
    let cleaned_raw_text = full_text
        .split('\n')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    Ok(CrawlerViewResult {
        url,
        raw_text: cleaned_raw_text,
        headings,
        title,
        meta_description,
        meta_robots,
        schema_json,
        error: None,
    })
}
