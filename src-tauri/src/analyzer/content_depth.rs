use crate::models::AuditPageResult;

/// Compute a Content Depth Score (0-100) from page analysis data.
/// Weighted combination of 7 factors.
pub fn compute_score(page: &AuditPageResult) -> f64 {
    let word_score = compute_word_count_score(page.word_count);
    let structure_score =
        compute_structure_score(page.heading_count, page.heading_depth);
    let media_score = compute_media_score(
        page.image_count,
        page.has_video,
        page.has_table,
        page.has_list,
    );
    let readability = compute_readability_score(page.readability_score);
    let link_score =
        compute_link_score(page.internal_link_count, page.external_link_count);
    let schema_score = compute_schema_score(page.has_schema, &page.schema_types);
    let technical_score =
        compute_technical_score(page.content_to_html_ratio, page.response_size_bytes);

    let score = word_score * 0.25
        + structure_score * 0.20
        + media_score * 0.15
        + readability * 0.15
        + link_score * 0.10
        + schema_score * 0.10
        + technical_score * 0.05;

    (score * 100.0).round() / 100.0
}

/// Word count quality: 0-100
fn compute_word_count_score(word_count: usize) -> f64 {
    match word_count {
        0..=49 => 0.0,
        50..=99 => 10.0,
        100..=199 => 25.0,
        200..=299 => 40.0,
        300..=499 => 55.0,
        500..=799 => 70.0,
        800..=999 => 80.0,
        1000..=2500 => 100.0,
        _ => 90.0,
    }
}

/// Heading structure quality: 0-100
fn compute_structure_score(heading_count: usize, heading_depth: usize) -> f64 {
    let count_score = match heading_count {
        0 => 0.0,
        1 => 20.0,
        2 => 40.0,
        3..=5 => 70.0,
        6..=10 => 90.0,
        _ => 100.0,
    };
    let depth_score = match heading_depth {
        0 => 0.0,
        1 => 30.0,
        2 => 60.0,
        3 => 90.0,
        _ => 100.0,
    };
    count_score * 0.6 + depth_score * 0.4
}

/// Media richness: images, video, tables, lists
fn compute_media_score(
    image_count: usize,
    has_video: bool,
    has_table: bool,
    has_list: bool,
) -> f64 {
    let img_score = match image_count {
        0 => 0.0,
        1 => 30.0,
        2..=3 => 60.0,
        4..=8 => 85.0,
        _ => 100.0,
    };
    let mut bonus: f64 = 0.0;
    if has_video {
        bonus += 30.0;
    }
    if has_table {
        bonus += 15.0;
    }
    if has_list {
        bonus += 15.0;
    }

    (img_score * 0.5 + bonus.min(60.0) * 0.5).min(100.0)
}

/// Readability: ideal Flesch-Kincaid range is 60-80
fn compute_readability_score(flesch_score: f64) -> f64 {
    if flesch_score <= 0.0 {
        return 0.0;
    }
    if flesch_score >= 60.0 && flesch_score <= 80.0 {
        100.0
    } else if flesch_score > 80.0 {
        let penalty = (flesch_score - 80.0) * 2.0;
        (100.0 - penalty).max(30.0)
    } else {
        let penalty = (60.0 - flesch_score) * 1.5;
        (100.0 - penalty).max(10.0)
    }
}

/// Link quality: internal + external density
fn compute_link_score(internal: usize, external: usize) -> f64 {
    let internal_score = match internal {
        0 => 0.0,
        1..=2 => 30.0,
        3..=5 => 60.0,
        6..=15 => 85.0,
        _ => 100.0,
    };
    let external_score = match external {
        0 => 20.0,
        1..=3 => 70.0,
        4..=8 => 100.0,
        _ => 80.0,
    };
    internal_score * 0.7 + external_score * 0.3
}

/// Schema/structured data presence
fn compute_schema_score(has_schema: bool, schema_types: &[String]) -> f64 {
    if !has_schema {
        return 0.0;
    }
    let rich_types = [
        "Article",
        "BlogPosting",
        "Product",
        "FAQPage",
        "HowTo",
        "Recipe",
        "Review",
        "Event",
        "LocalBusiness",
    ];
    let has_rich = schema_types
        .iter()
        .any(|t| rich_types.iter().any(|rt| t.contains(rt)));
    if has_rich {
        100.0
    } else {
        60.0
    }
}

/// Technical quality: content ratio and page size
fn compute_technical_score(ratio: f64, response_size: usize) -> f64 {
    let ratio_score = if ratio >= 0.20 && ratio <= 0.50 {
        100.0
    } else if ratio >= 0.10 {
        70.0
    } else if ratio >= 0.05 {
        40.0
    } else {
        10.0
    };
    let size_score = match response_size {
        0..=50_000 => 100.0,
        50_001..=200_000 => 85.0,
        200_001..=500_000 => 60.0,
        500_001..=1_000_000 => 40.0,
        _ => 20.0,
    };
    ratio_score * 0.6 + size_score * 0.4
}
