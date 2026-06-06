use reqwest::Client;
use futures::future::join_all;
use std::collections::{HashSet, HashMap};
use crate::models::*;

const STOP_WORDS: &[&str] = &[
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    "can", "will", "just", "like", "one", "also", "new", "get", "use", "make", "even", "much", "many", "well", "way", "see", "say", "said"
];

#[tauri::command]
pub async fn fetch_keyword_suggestions(seed: String) -> Result<Vec<String>, String> {
    let client = Client::new();
    let alphabet: Vec<char> = "abcdefghijklmnopqrstuvwxyz".chars().collect();
    let mut futures = vec![];

    let base_url = format!("http://google.com/complete/search?output=chrome&q={}", urlencoding::encode(&seed));
    let base_client = client.clone();
    futures.push(tokio::spawn(async move {
        fetch_single(&base_client, &base_url).await
    }));

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

#[tauri::command]
pub async fn scrape_competitor_outline(url: String) -> Result<CompetitorData, String> {
    let client = Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let html_text = res.text().await.map_err(|e| e.to_string())?;

    let document = scraper::Html::parse_document(&html_text);

    let title_selector = scraper::Selector::parse("title").unwrap();
    let title = document.select(&title_selector).next()
        .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string())
        .unwrap_or_default();

    let meta_selector = scraper::Selector::parse("meta[name=\"description\"], meta[property=\"og:description\"]").unwrap();
    let meta_description = document.select(&meta_selector).next()
        .and_then(|el| el.value().attr("content"))
        .unwrap_or("")
        .to_string();

    let selector = scraper::Selector::parse("h1, h2, h3").unwrap();
    let mut headings = vec![];
    for element in document.select(&selector) {
        let tag = element.value().name().to_string();
        let text = element.text().collect::<Vec<_>>().join(" ").trim().to_string();
        if !text.is_empty() {
            headings.push(Heading { tag, text });
        }
    }

    let mut full_text = String::new();
    let body_selector = scraper::Selector::parse("body").unwrap();
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

    let mut word_count = 0;
    let mut word_freq: HashMap<String, usize> = HashMap::new();
    let stop_words_set: HashSet<&str> = STOP_WORDS.iter().cloned().collect();

    let words = full_text.split(|c: char| !c.is_alphanumeric());
    for w in words {
        let word = w.trim().to_lowercase();
        if !word.is_empty() {
            if word.chars().all(|c| c.is_numeric()) { continue; }
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

    Ok(CompetitorData { title, meta_description, word_count, headings, top_keywords })
}
