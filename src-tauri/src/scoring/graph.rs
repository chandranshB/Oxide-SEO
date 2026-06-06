use std::collections::HashMap;
use crate::models::{AuditPageResult, AuditGraphNode};

/// Compute link graph metrics including a PageRank-based Internal Rank.
pub fn compute_graph(
    all_results: &[AuditPageResult],
    link_graph: &HashMap<String, Vec<String>>,
    start_url: &str,
) -> Vec<AuditGraphNode> {
    // Count in-links and out-links
    let mut in_links_map: HashMap<String, usize> = HashMap::new();
    let mut out_links_map: HashMap<String, usize> = HashMap::new();

    for (url, links) in link_graph {
        out_links_map.insert(url.clone(), links.len());
        for link in links {
            *in_links_map.entry(link.clone()).or_insert(0) += 1;
        }
    }

    // PageRank algorithm
    let damping_factor = 0.85;
    let num_iterations = 20;
    let num_pages = all_results.len() as f64;
    let initial_pr = if num_pages > 0.0 { 1.0 / num_pages } else { 0.0 };

    let mut pr_scores: HashMap<String, f64> = HashMap::new();
    for res in all_results {
        pr_scores.insert(res.url.clone(), initial_pr);
    }

    if num_pages > 0.0 {
        for _ in 0..num_iterations {
            let mut new_pr_scores = HashMap::new();
            let base_pr = (1.0 - damping_factor) / num_pages;

            for res in all_results {
                new_pr_scores.insert(res.url.clone(), base_pr);
            }

            for (url, links) in link_graph {
                let out_degree = links.len() as f64;
                if out_degree > 0.0 {
                    let current_pr = *pr_scores.get(url).unwrap_or(&0.0);
                    let pr_share = current_pr / out_degree;
                    for target in links {
                        if let Some(score) = new_pr_scores.get_mut(target) {
                            *score += damping_factor * pr_share;
                        }
                    }
                } else {
                    // Dangling node: distribute PR evenly
                    let current_pr = *pr_scores.get(url).unwrap_or(&0.0);
                    let distributed_pr = (damping_factor * current_pr) / num_pages;
                    for res in all_results {
                        if let Some(score) = new_pr_scores.get_mut(&res.url) {
                            *score += distributed_pr;
                        }
                    }
                }
            }
            pr_scores = new_pr_scores;
        }
    }

    // Normalize to 0-100 with logarithmic scaling
    let mut max_pr = 0.0_f64;
    let mut min_pr = f64::MAX;
    for &pr in pr_scores.values() {
        if pr > max_pr { max_pr = pr; }
        if pr < min_pr { min_pr = pr; }
    }
    if min_pr <= 0.0 { min_pr = 1e-10; }

    let mut graph_nodes = Vec::new();
    for res in all_results {
        let u = &res.url;
        let in_links = *in_links_map.get(u).unwrap_or(&0);
        let out_links = *out_links_map.get(u).unwrap_or(&0);
        let pr = *pr_scores.get(u).unwrap_or(&initial_pr);

        let mut internal_rank = 0.0;
        if max_pr > min_pr {
            let log_pr = pr.max(min_pr).ln();
            let log_max = max_pr.max(min_pr).ln();
            let log_min = min_pr.ln();
            if log_max > log_min {
                internal_rank = ((log_pr - log_min) / (log_max - log_min)) * 100.0;
            }
        } else if num_pages > 1.0 {
            internal_rank = 50.0;
        }

        // Penalties
        if in_links == 0 && u != start_url {
            internal_rank = 0.0;
        }
        if res.status_code >= 400 || res.title.is_none() || res.word_count < 50 {
            internal_rank *= 0.2;
        } else if res.issues.len() > 3 {
            internal_rank *= 0.8;
        }

        internal_rank = internal_rank.clamp(0.0, 100.0);

        graph_nodes.push(AuditGraphNode {
            url: u.clone(),
            in_links,
            out_links,
            internal_rank,
        });
    }

    graph_nodes
}
