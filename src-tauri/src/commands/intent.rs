use crate::models::SearchIntent;
use std::collections::HashSet;

pub fn classify_intent(keyword: &str) -> (SearchIntent, String) {
    let keyword_lower = keyword.to_lowercase();
    let words: Vec<&str> = keyword_lower.split_whitespace().collect();
    
    if words.is_empty() {
        return (SearchIntent::Informational, "low".to_string());
    }

    let info_modifiers: HashSet<&str> = [
        "how", "what", "why", "when", "who", "where", "guide", "tutorial", "tips", "meaning", 
        "definition", "example", "learn", "difference", "explain", "can", "does", "is", "are"
    ].iter().cloned().collect();

    let comm_modifiers: HashSet<&str> = [
        "best", "top", "review", "vs", "versus", "alternative", "comparison", "rating", "recommended", "compare"
    ].iter().cloned().collect();

    let trans_modifiers: HashSet<&str> = [
        "buy", "order", "price", "cheap", "discount", "coupon", "deal", "subscription", "download", 
        "hire", "book", "purchase", "free", "cost", "pricing", "shop", "store", "sale"
    ].iter().cloned().collect();

    let nav_modifiers: HashSet<&str> = [
        "login", "sign", "official", "website", "app", "contact", "support", "account", "dashboard"
    ].iter().cloned().collect();

    let mut info_score = 0;
    let mut comm_score = 0;
    let mut trans_score = 0;
    let mut nav_score = 0;

    for (i, word) in words.iter().enumerate() {
        let weight = if i < 2 { 2 } else { 1 };
        
        if info_modifiers.contains(word) { info_score += weight; }
        if comm_modifiers.contains(word) { comm_score += weight; }
        if trans_modifiers.contains(word) { trans_score += weight; }
        if nav_modifiers.contains(word) { nav_score += weight; }
    }

    // Special exact phrase matches
    if keyword_lower.contains("how to") || keyword_lower.contains("what is") {
        info_score += 3;
    }
    if keyword_lower.contains("near me") {
        trans_score += 2;
    }

    let mut max_score = info_score;
    let mut primary_intent = SearchIntent::Informational;
    
    if comm_score > max_score {
        max_score = comm_score;
        primary_intent = SearchIntent::Commercial;
    }
    if trans_score > max_score {
        max_score = trans_score;
        primary_intent = SearchIntent::Transactional;
    }
    if nav_score > max_score {
        max_score = nav_score;
        primary_intent = SearchIntent::Navigational;
    }

    // Determine confidence
    let confidence = if max_score >= 3 {
        "high".to_string()
    } else if max_score > 0 {
        "medium".to_string()
    } else {
        "low".to_string()
    };

    (primary_intent, confidence)
}
