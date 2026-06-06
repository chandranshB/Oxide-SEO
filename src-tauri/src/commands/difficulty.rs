use crate::models::SearchIntent;

pub fn estimate_difficulty(keyword: &str, intent: &SearchIntent) -> (u8, String) {
    let mut difficulty: i32 = 0;
    let keyword_lower = keyword.to_lowercase();
    let words: Vec<&str> = keyword_lower.split_whitespace().collect();
    let word_count = words.len();

    // 1. Word count heuristic
    if word_count == 1 {
        difficulty += 35; // Head terms are extremely competitive
    } else if word_count == 2 {
        difficulty += 25; // Still very competitive
    } else if word_count == 3 {
        difficulty += 15; // Moderate competition
    } else if word_count >= 4 {
        difficulty += 5;  // Long-tail, easier
    }

    // 2. Intent signals
    match intent {
        SearchIntent::Transactional => difficulty += 15, // Money keywords attract competition
        SearchIntent::Commercial => difficulty += 10,    // Reviews are competitive
        SearchIntent::Informational => difficulty += 5,  // Usually more content opportunities
        SearchIntent::Navigational => difficulty += 20,  // Hard to outrank official sites
    }

    // 3. Modifier heuristics
    let competitive_modifiers = ["best", "top", "review", "vs", "alternative", "buy"];
    if competitive_modifiers.iter().any(|&m| words.contains(&m)) {
        difficulty += 10;
    }

    let question_words = ["how", "what", "why", "when", "where", "can", "is", "does"];
    if words.first().map_or(false, |w| question_words.contains(w)) {
        difficulty -= 10; // Questions are often easier to target with exact answers
    }

    if keyword_lower.contains("2024") || keyword_lower.contains("2025") || keyword_lower.contains("2026") {
        difficulty -= 5; // Fresh queries have less entrenched competition
    }

    if keyword_lower.contains("near me") {
        difficulty -= 5; // Local intent
    }

    if word_count >= 5 {
        difficulty -= 5; // Niche long tail
    }

    // Cap between 1 and 100
    let final_difficulty = difficulty.clamp(1, 100) as u8;

    let label = if final_difficulty < 30 {
        "Easy"
    } else if final_difficulty < 60 {
        "Medium"
    } else if final_difficulty < 80 {
        "Hard"
    } else {
        "Very Hard"
    };

    (final_difficulty, label.to_string())
}
