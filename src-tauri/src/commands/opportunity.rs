use crate::models::{SearchIntent, KeywordResult};

pub fn calculate_opportunity(keyword_res: &KeywordResult, cluster_size: usize) -> u8 {
    let mut opportunity: f64 = 0.0;

    // 1. Difficulty component (40% weight) - easier is better
    // If difficulty is 10, score is 90 * 0.4 = 36
    let diff_score = 100.0 - (keyword_res.difficulty as f64);
    opportunity += diff_score * 0.4;

    // 2. Intent component (30% weight) - commercial/transactional > informational
    let intent_value = match keyword_res.intent {
        SearchIntent::Transactional => 90.0,
        SearchIntent::Commercial => 80.0,
        SearchIntent::Informational => 60.0,
        SearchIntent::Navigational => 30.0,
    };
    opportunity += intent_value * 0.3;

    // 3. Long tail bonus (20% weight)
    let length_bonus = match keyword_res.word_count {
        1 => 20.0,
        2 => 50.0,
        3 => 90.0,
        4 => 100.0,
        _ => 80.0, // 5+ words is good but maybe too narrow
    };
    opportunity += length_bonus * 0.2;

    // 4. Cluster size bonus (10% weight)
    let cluster_bonus = (cluster_size * 10).min(100) as f64;
    opportunity += cluster_bonus * 0.1;

    // Additional signal: If confidence in intent is high, give a small bump
    if keyword_res.intent_confidence == "high" {
        opportunity += 5.0;
    }

    opportunity.clamp(1.0, 100.0).round() as u8
}
