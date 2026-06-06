use crate::models::{KeywordCluster, KeywordResult};
use std::collections::{HashMap, HashSet};

const STOP_WORDS: &[&str] = &[
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves",
    "can", "will", "just", "like", "one", "also", "new", "get", "use", "make", "even", "much", "many", "well", "way", "see", "say", "said"
];

pub fn cluster_keywords(mut keywords: Vec<KeywordResult>) -> (Vec<KeywordCluster>, Vec<KeywordResult>) {
    let stop_words_set: HashSet<&str> = STOP_WORDS.iter().cloned().collect();
    let mut bigram_freq: HashMap<String, usize> = HashMap::new();
    let mut keyword_bigrams: HashMap<usize, Vec<String>> = HashMap::new();

    // 1. Extract and count bigrams
    for (i, kw) in keywords.iter().enumerate() {
        let text = kw.keyword.to_lowercase();
        let words: Vec<&str> = text
            .split(|c: char| !c.is_alphanumeric())
            .filter(|w| !w.is_empty() && !stop_words_set.contains(w))
            .collect();

        let mut bigrams = Vec::new();
        if words.len() >= 2 {
            for j in 0..words.len() - 1 {
                let bigram = format!("{} {}", words[j], words[j+1]);
                *bigram_freq.entry(bigram.clone()).or_insert(0) += 1;
                bigrams.push(bigram);
            }
        } else if words.len() == 1 {
            let unigram = words[0].to_string();
            *bigram_freq.entry(unigram.clone()).or_insert(0) += 1;
            bigrams.push(unigram);
        }

        keyword_bigrams.insert(i, bigrams);
    }

    // Filter out bigrams that only appear once to create meaningful clusters
    let mut valid_bigrams: HashSet<String> = bigram_freq.into_iter()
        .filter(|(_, count)| *count > 1)
        .map(|(bg, _)| bg)
        .collect();

    let mut clusters_map: HashMap<String, Vec<KeywordResult>> = HashMap::new();
    let mut unclustered: Vec<KeywordResult> = Vec::new();

    // 2. Assign keywords to clusters based on most frequent valid bigram
    for (i, mut kw) in keywords.into_iter().enumerate() {
        let bigrams = keyword_bigrams.get(&i).unwrap();
        let mut best_bigram = None;
        let mut max_len = 0; // Prefer longer shared phrases if available, though bigrams are length 2.

        for bg in bigrams {
            if valid_bigrams.contains(bg) {
                if best_bigram.is_none() {
                    best_bigram = Some(bg.clone());
                }
            }
        }

        if let Some(bg) = best_bigram {
            kw.cluster_id = Some(0); // Will be assigned proper ID later
            clusters_map.entry(bg).or_insert_with(Vec::new).push(kw);
        } else {
            unclustered.push(kw);
        }
    }

    // 3. Format and compute cluster metrics
    let mut clusters: Vec<KeywordCluster> = Vec::new();
    for (id, (label, mut cluster_kws)) in clusters_map.into_iter().enumerate() {
        let keyword_count = cluster_kws.len();
        
        let sum_diff: u32 = cluster_kws.iter().map(|k| k.difficulty as u32).sum();
        let avg_difficulty = if keyword_count > 0 { (sum_diff / keyword_count as u32) as u8 } else { 0 };

        // We will compute opportunity score later when we integrate opportunity.rs, 
        // For now initialize as 0 and it gets updated in the caller
        
        let mut info_count = 0;
        let mut comm_count = 0;
        let mut trans_count = 0;
        let mut nav_count = 0;

        for kw in &cluster_kws {
            match kw.intent {
                crate::models::SearchIntent::Informational => info_count += 1,
                crate::models::SearchIntent::Commercial => comm_count += 1,
                crate::models::SearchIntent::Transactional => trans_count += 1,
                crate::models::SearchIntent::Navigational => nav_count += 1,
            }
        }

        let mut primary_intent = crate::models::SearchIntent::Informational;
        let mut max_count = info_count;
        if comm_count > max_count { max_count = comm_count; primary_intent = crate::models::SearchIntent::Commercial; }
        if trans_count > max_count { max_count = trans_count; primary_intent = crate::models::SearchIntent::Transactional; }
        if nav_count > max_count { primary_intent = crate::models::SearchIntent::Navigational; }
        
        // Assign ID
        for kw in &mut cluster_kws {
            kw.cluster_id = Some(id);
        }

        clusters.push(KeywordCluster {
            id,
            label,
            keywords: cluster_kws,
            avg_difficulty,
            avg_opportunity: 0,
            primary_intent,
            keyword_count,
        });
    }

    // Sort clusters by keyword count descending
    clusters.sort_by(|a, b| b.keyword_count.cmp(&a.keyword_count));

    (clusters, unclustered)
}
