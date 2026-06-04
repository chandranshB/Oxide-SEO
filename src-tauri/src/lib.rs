use reqwest::Client;
use scraper::{Html, Selector};
use serde::Serialize;
use futures::future::join_all;
use std::collections::{HashSet, HashMap};
use std::io::{Read, Write};
use std::net::TcpListener;

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

#[tauri::command]
async fn fetch_keyword_suggestions(seed: String) -> Result<Vec<String>, String> {
    let client = Client::new();
    let alphabet: Vec<char> = "abcdefghijklmnopqrstuvwxyz".chars().collect();
    let mut futures = vec![];

    // Create a base request for just the seed
    let base_url = format!("http://google.com/complete/search?output=chrome&q={}", urlencoding::encode(&seed));
    let base_client = client.clone();
    futures.push(tokio::spawn(async move {
        fetch_single(&base_client, &base_url).await
    }));

    // Create requests for seed + space + letter
    for letter in alphabet {
        let query = format!("{} {}", seed, letter);
        let url = format!("http://google.com/complete/search?output=chrome&q={}", urlencoding::encode(&query));
        let c = client.clone();
        futures.push(tokio::spawn(async move {
            fetch_single(&c, &url).await
        }));
    }

    let results = join_all(futures).await;
    let mut unique_keywords = HashSet::new();

    for res in results {
        if let Ok(Ok(keywords)) = res {
            for kw in keywords {
                unique_keywords.insert(kw);
            }
        }
    }

    let mut sorted_keywords: Vec<String> = unique_keywords.into_iter().collect();
    sorted_keywords.sort();

    Ok(sorted_keywords)
}

async fn fetch_single(client: &Client, url: &str) -> Result<Vec<String>, String> {
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    
    // Google autocomplete returns an array like: ["query", ["query a", "query b", ...]]
    let parsed: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    
    let mut keywords = vec![];
    if let Some(suggestions) = parsed.get(1).and_then(|v| v.as_array()) {
        for s in suggestions {
            if let Some(kw) = s.as_str() {
                keywords.push(kw.to_string());
            }
        }
    }
    
    Ok(keywords)
}

const STOP_WORDS: &[&str] = &[
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    "can", "will", "just", "like", "one", "also", "new", "get", "use", "make", "even", "much", "many", "well", "way", "see", "say", "said"
];

#[tauri::command]
async fn scrape_competitor_outline(url: String) -> Result<CompetitorData, String> {
    let client = Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html_text = res.text().await.map_err(|e| e.to_string())?;

    let document = Html::parse_document(&html_text);
    
    // 1. Title
    let title_selector = Selector::parse("title").unwrap();
    let title = document.select(&title_selector).next()
        .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string())
        .unwrap_or_default();

    // 2. Meta Description
    let meta_selector = Selector::parse("meta[name=\"description\"], meta[property=\"og:description\"]").unwrap();
    let meta_description = document.select(&meta_selector).next()
        .and_then(|el| el.value().attr("content"))
        .unwrap_or("")
        .to_string();

    // 3. Headings
    let selector = Selector::parse("h1, h2, h3").unwrap();
    let mut headings = vec![];
    for element in document.select(&selector) {
        let tag = element.value().name().to_string();
        let text = element.text().collect::<Vec<_>>().join(" ").trim().to_string();
        if !text.is_empty() {
            headings.push(Heading { tag, text });
        }
    }

    // 4. Full text extraction for word count and keyword frequency
    let mut full_text = String::new();
    let body_selector = Selector::parse("body").unwrap();
    if let Some(body) = document.select(&body_selector).next() {
        for node in body.descendants() {
            if let scraper::Node::Text(text) = node.value() {
                // Check parent to skip scripts and styles
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

    let mut word_count = 0;
    let mut word_freq: HashMap<String, usize> = HashMap::new();
    let stop_words_set: HashSet<&str> = STOP_WORDS.iter().cloned().collect();

    let words = full_text.split(|c: char| !c.is_alphanumeric());
    for w in words {
        let word = w.trim().to_lowercase();
        if !word.is_empty() {
            if word.chars().all(|c| c.is_numeric()) {
                continue;
            }
            word_count += 1;
            if !stop_words_set.contains(word.as_str()) && word.len() > 2 {
                *word_freq.entry(word).or_insert(0) += 1;
            }
        }
    }

    let mut top_keywords: Vec<KeywordFreq> = word_freq.into_iter()
        .map(|(word, count)| KeywordFreq { word, count })
        .collect();
    
    top_keywords.sort_by(|a, b| b.count.cmp(&a.count));
    top_keywords.truncate(30);

    Ok(CompetitorData {
        title,
        meta_description,
        word_count,
        headings,
        top_keywords,
    })
}

use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
async fn start_oauth_server() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        let listener = TcpListener::bind("127.0.0.1:34852").map_err(|e| e.to_string())?;
        
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0; 2048];
                if let Ok(size) = stream.read(&mut buffer) {
                    let request = String::from_utf8_lossy(&buffer[..size]);
                    
                    if request.contains("cancel=true") {
                        let _ = stream.write_all(b"HTTP/1.1 200 OK\r\n\r\n");
                        return Err("Cancelled by user".to_string());
                    }
                    
                    if request.starts_with("GET ") && request.contains("code=") {
                        let first_line = request.lines().next().unwrap_or("");
                        if let Some(start) = first_line.find("code=") {
                            let code_start = start + 5;
                            if let Some(end) = first_line[code_start..].find(|c: char| c == ' ' || c == '&') {
                                let code = &first_line[code_start..code_start + end];
                                
                                let html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n\
                                <!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Authentication Successful</title>\
                                <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); \
                                body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #09090b; color: #ffffff; } \
                                .container { text-align: center; padding: 48px 40px; background: #18181b; border: 1px solid #27272a; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); max-width: 400px; animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); } \
                                .icon { width: 80px; height: 80px; background: rgba(0,208,156,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; } \
                                .icon svg { width: 40px; height: 40px; color: #00d09c; } \
                                h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.5px; } \
                                p { font-size: 15px; color: #a1a1aa; line-height: 1.6; margin: 0 0 32px 0; } \
                                .btn { display: inline-block; background: #00d09c; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; transition: all 0.2s ease; cursor: pointer; border: none; } \
                                .btn:hover { background: #00b889; transform: translateY(-1px); } \
                                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }</style></head>\
                                <body><div class=\"container\"><div class=\"icon\">\
                                <svg fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.5\" d=\"M5 13l4 4L19 7\"></path></svg>\
                                </div><h1>Authentication Successful</h1><p>Oxide SEO has securely connected to your Google account. You can now close this window and return to the app.</p>\
                                <button class=\"btn\" onclick=\"window.close()\">Close Window</button></div>\
                                <script>setTimeout(() => window.close(), 3000);</script></body></html>";
                                
                                let _ = stream.write_all(html.as_bytes());
                                return Ok(code.to_string());
                            }
                        }
                    }
                    
                    let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\n\r\n");
                }
            }
        }
        
        Err("Listener closed unexpectedly".to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn exchange_oauth_token(code: String, client_id: String, client_secret: String, redirect_uri: String) -> Result<String, String> {
    let client = Client::new();
    let params = [
        ("code", code),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code".to_string()),
    ];

    let res = client.post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    res.text().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_gsc_metrics_table",
            sql: "CREATE TABLE IF NOT EXISTS gsc_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                page TEXT NOT NULL,
                clicks INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                ctr REAL DEFAULT 0,
                average_position REAL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:seo_kit.db", migrations)
                .build()
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fetch_keyword_suggestions,
            scrape_competitor_outline,
            start_oauth_server,
            exchange_oauth_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
