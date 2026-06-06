use reqwest::Client;
use futures::future::join_all;
use std::collections::{HashSet, HashMap};
use crate::models::*;

const STOP_WORDS: &[&str] = &[
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
    "can", "will", "just", "like", "one", "also", "new", "get", "use", "make", "even", "much", "many", "well", "way", "see", "say", "said"
];

use crate::commands::{intent, difficulty, opportunity, cluster};

#[tauri::command]
pub async fn discover_keywords(seed: String, mode: String) -> Result<KeywordDiscoveryResult, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let mut patterns = Vec::new();
    let safe_seed = seed.trim().to_lowercase();
    
    // Base and Alphabet
    patterns.push((safe_seed.clone(), "base"));
    for c in 'a'..='z' {
        patterns.push((format!("{} {}", safe_seed, c), "alphabet"));
    }

    if mode == "deep" {
        // Questions
        let questions = ["how to", "what is", "why", "when", "where", "can", "does", "is"];
        for q in questions { patterns.push((format!("{} {}", q, safe_seed), "question")); }

        // Intent
        let intents = ["best", "top", "review", "buy", "cheap", "free", "tutorial", "guide"];
        for i in intents { patterns.push((format!("{} {}", i, safe_seed), "intent")); }
        patterns.push((format!("{} review", safe_seed), "intent"));

        // Comparison
        let comparisons = ["vs", "alternative", "or"];
        for c in comparisons { patterns.push((format!("{} {}", safe_seed, c), "comparison")); }

        // Prepositions
        let prepositions = ["for", "with", "without", "near", "like"];
        for p in prepositions { patterns.push((format!("{} {}", safe_seed, p), "preposition")); }

        // Year
        patterns.push((format!("{} 2025", safe_seed), "year"));
        patterns.push((format!("{} 2026", safe_seed), "year"));
    }

    let mut unique_keywords = HashMap::new();
    
    // Batch requests to avoid rate limits
    for chunk in patterns.chunks(10) {
        let mut futures = vec![];
        for (query, source) in chunk {
            let url = format!("http://google.com/complete/search?output=chrome&q={}&hl=en", urlencoding::encode(query));
            let c = client.clone();
            let src = source.to_string();
            futures.push(tokio::spawn(async move {
                let res = fetch_single(&c, &url).await.unwrap_or_default();
                (res, src)
            }));
        }

        let chunk_results = join_all(futures).await;
        for res in chunk_results {
            if let Ok((keywords, source)) = res {
                for kw in keywords {
                    // Only insert if we haven't seen it, to keep the first source
                    let kw_lower = kw.to_lowercase();
                    unique_keywords.entry(kw_lower).or_insert(source.clone());
                }
            }
        }
        
        // Brief delay between batches
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
    }

    let mut results: Vec<KeywordResult> = Vec::new();
    let mut intent_breakdown = IntentBreakdown { informational: 0, commercial: 0, transactional: 0, navigational: 0 };

    for (kw, source) in unique_keywords {
        let (intent, confidence) = intent::classify_intent(&kw);
        
        match intent {
            SearchIntent::Informational => intent_breakdown.informational += 1,
            SearchIntent::Commercial => intent_breakdown.commercial += 1,
            SearchIntent::Transactional => intent_breakdown.transactional += 1,
            SearchIntent::Navigational => intent_breakdown.navigational += 1,
        }

        let (diff_score, diff_label) = difficulty::estimate_difficulty(&kw, &intent);
        let word_count = kw.split_whitespace().count();

        let kw_res = KeywordResult {
            keyword: kw.clone(),
            intent,
            intent_confidence: confidence,
            difficulty: diff_score,
            difficulty_label: diff_label,
            opportunity: 0, // Will compute after clustering
            word_count,
            cluster_id: None,
            source: source.clone(),
        };

        results.push(kw_res);
    }

    let total_keywords = results.len();

    // Cluster keywords
    let (mut clusters, mut unclustered) = cluster::cluster_keywords(results);

    // Compute opportunity scores now that we have clusters
    for c in &mut clusters {
        let mut total_opp: u32 = 0;
        let c_size = c.keywords.len();
        for kw in &mut c.keywords {
            kw.opportunity = opportunity::calculate_opportunity(kw, c_size);
            total_opp += kw.opportunity as u32;
        }
        c.avg_opportunity = if c_size > 0 { (total_opp / c_size as u32) as u8 } else { 0 };
    }

    for kw in &mut unclustered {
        kw.opportunity = opportunity::calculate_opportunity(kw, 1);
    }

    // Sort clusters by avg opportunity descending
    clusters.sort_by(|a, b| b.avg_opportunity.cmp(&a.avg_opportunity));

    Ok(KeywordDiscoveryResult {
        clusters,
        unclustered,
        total_keywords,
        discovery_mode: mode,
        seed: safe_seed,
        intent_breakdown,
    })
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
