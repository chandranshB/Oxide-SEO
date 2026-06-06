use std::collections::{HashSet, HashMap, VecDeque};
use reqwest::Client;
use url::Url;
use tauri::{AppHandle, Emitter};
use crate::models::*;

/// Normalize a URL for deduplication.
pub fn normalize_url(url_str: &str) -> String {
    if let Ok(mut parsed) = Url::parse(url_str) {
        parsed.set_fragment(None);
        // Remove trailing slash for non-root paths
        let path = parsed.path().to_string();
        if path.len() > 1 && path.ends_with('/') {
            parsed.set_path(&path[..path.len() - 1]);
        }
        // Remove default ports
        let _ = parsed.set_port(None);
        parsed.to_string()
    } else {
        url_str.to_string()
    }
}

/// Run the full site crawl. This is the core orchestrator.
pub async fn run_crawl(
    app: AppHandle,
    client: Client,
    start_url: String,
    sitemap_url: Option<String>,
    max_pages: usize,
    crawl_speed: usize,
) -> Result<String, String> {
    let base_url = Url::parse(&start_url).map_err(|e| e.to_string())?;
    let domain = base_url.domain().unwrap_or("").to_string();

    // --- Phase 1: Pre-checks ---
    let (robots, mut site_level_issues) =
        crate::crawler::robots::fetch_and_parse(&client, &base_url).await;

    // --- Phase 2: Sitemap discovery ---
    let mut visited: HashSet<String> = HashSet::new();
    let mut queue: VecDeque<(String, usize)> = VecDeque::new(); // (url, depth)
    let mut all_results: Vec<AuditPageResult> = Vec::new();
    let mut internally_linked_urls: HashSet<String> = HashSet::new();
    let mut sitemap_urls: HashSet<String> = HashSet::new();
    let mut link_graph: HashMap<String, Vec<String>> = HashMap::new();

    let (sitemap_tx, mut sitemap_rx) = tokio::sync::mpsc::unbounded_channel();

    let sitemap_to_check = if let Some(s_url) = &sitemap_url {
        if s_url.is_empty() {
            base_url.join("/sitemap.xml").ok()
        } else {
            Url::parse(s_url).ok()
        }
    } else {
        base_url.join("/sitemap.xml").ok()
    };

    if let Some(s_url) = sitemap_to_check {
        let client_c = client.clone();
        tokio::spawn(async move {
            crate::crawler::sitemap::fetch_sitemap_urls(&client_c, &s_url, sitemap_tx).await;
        });
    } else {
        site_level_issues.push(AuditIssue {
            category: "Warning".to_string(),
            description: "Missing sitemap.xml".to_string(),
        });
    }

    let normalized_start = normalize_url(&start_url);
    queue.push_back((start_url.clone(), 0));
    visited.insert(normalized_start.clone());

    // --- Phase 3: Crawl loop ---
    let mut join_set = tokio::task::JoinSet::new();
    let mut pages_crawled: usize = 0;
    let mut sitemap_finished = false;

    loop {
        // Drain sitemap channel
        while let Ok(url) = sitemap_rx.try_recv() {
            let norm = normalize_url(&url);
            sitemap_urls.insert(norm.clone());
            if !visited.contains(&norm) {
                visited.insert(norm);
                queue.push_back((url, 0));
            }
        }

        // Spawn new tasks
        while join_set.len() < crawl_speed && !queue.is_empty() && pages_crawled < max_pages {
            let (current_url, depth) = queue.pop_front().unwrap();

            // Check robots.txt
            if let Ok(parsed) = Url::parse(&current_url) {
                if !robots.is_allowed(parsed.path()) {
                    continue;
                }
            }

            let client = client.clone();
            let base_url = base_url.clone();
            let domain = domain.clone();
            let app = app.clone();
            let start_url_c = start_url.clone();
            let site_level_issues = site_level_issues.clone();
            let current_crawled = pages_crawled;

            join_set.spawn(async move {
                let _ = app.emit(
                    "audit-progress",
                    AuditProgress {
                        url: current_url.clone(),
                        status: "crawling".to_string(),
                        pages_crawled: current_crawled,
                    },
                );

                let start_time = std::time::Instant::now();
                let res = client.get(&current_url).send().await;
                let load_time_ms = start_time.elapsed().as_millis() as u64;

                let mut page_result = AuditPageResult {
                    url: current_url.clone(),
                    load_time_ms,
                    crawl_depth: depth,
                    ..Default::default()
                };

                let mut new_links: Vec<String> = Vec::new();
                let mut external_links: Vec<String> = Vec::new();

                if let Ok(response) = res {
                    page_result.status_code = response.status().as_u16();

                    if page_result.status_code >= 400 {
                        page_result.issues.push(AuditIssue {
                            category: "Error".to_string(),
                            description: format!(
                                "Broken link: HTTP {}",
                                page_result.status_code
                            ),
                        });
                    } else if page_result.status_code == 200 {
                        // Check content type — only parse HTML
                        let content_type = response
                            .headers()
                            .get(reqwest::header::CONTENT_TYPE)
                            .and_then(|v| v.to_str().ok())
                            .unwrap_or("")
                            .to_lowercase();

                        if !content_type.contains("text/html") && !content_type.is_empty() {
                            let _ = app.emit("audit-page-result", page_result.clone());
                            return (page_result, new_links, depth);
                        }

                        if let Ok(html_text) = response.text().await {
                            let response_size = html_text.len();
                            page_result.response_size_bytes = response_size;

                            let b_url = base_url.clone();
                            let d_main = domain.clone();
                            let c_url = current_url.clone();
                            let html_for_parse = html_text;

                            let analysis =
                                tokio::task::spawn_blocking(move || {
                                    crate::analyzer::html::analyze_page(
                                        &html_for_parse,
                                        &b_url,
                                        &d_main,
                                        &c_url,
                                        response_size,
                                    )
                                })
                                .await
                                .unwrap();

                            // Transfer analysis results
                            page_result.issues.extend(analysis.issues);
                            page_result.title = analysis.title;
                            page_result.meta_description = analysis.meta_description;
                            page_result.h1 = analysis.h1;
                            page_result.word_count = analysis.word_count;
                            page_result.heading_count = analysis.heading_count;
                            page_result.heading_depth = analysis.heading_depth;
                            page_result.image_count = analysis.image_count;
                            page_result.images_without_alt = analysis.images_without_alt;
                            page_result.paragraph_count = analysis.paragraph_count;
                            page_result.has_table = analysis.has_table;
                            page_result.has_list = analysis.has_list;
                            page_result.has_video = analysis.has_video;
                            page_result.readability_score = analysis.readability_score;
                            page_result.avg_sentence_length = analysis.avg_sentence_length;
                            page_result.content_to_html_ratio = analysis.content_to_html_ratio;
                            page_result.has_schema = analysis.has_schema;
                            page_result.schema_types = analysis.schema_types;
                            page_result.meta_robots = analysis.meta_robots;
                            page_result.canonical_url = analysis.canonical_url;
                            page_result.og_image = analysis.og_image;
                            page_result.internal_link_count = analysis.internal_links.len();
                            page_result.external_link_count = analysis.external_links.len();

                            new_links = analysis.internal_links;
                            external_links = analysis.external_links;

                            // Compute content depth score
                            page_result.content_depth_score =
                                crate::analyzer::content_depth::compute_score(&page_result);
                        } else {
                            page_result.issues.push(AuditIssue {
                                category: "Error".to_string(),
                                description: "Failed to read HTML response".to_string(),
                            });
                        }
                    }
                } else {
                    page_result.issues.push(AuditIssue {
                        category: "Error".to_string(),
                        description: "Failed to fetch page".to_string(),
                    });
                }

                // Site-level issues on start page
                if current_url == start_url_c {
                    page_result.issues.extend(site_level_issues);
                }

                // Depth check
                if depth > 3 {
                    page_result.issues.push(AuditIssue {
                        category: "Warning".to_string(),
                        description: format!(
                            "Page too deep ({} clicks from homepage)",
                            depth
                        ),
                    });
                }

                // Load time check
                if load_time_ms > 3000 {
                    page_result.issues.push(AuditIssue {
                        category: "Warning".to_string(),
                        description: format!("Very slow page ({}ms load time)", load_time_ms),
                    });
                }

                // Check external broken links (up to 10)
                let mut external_broken = 0;
                if !external_links.is_empty() {
                    let max_ext = std::cmp::min(10, external_links.len());
                    let mut ext_futures = vec![];
                    for ext in external_links.into_iter().take(max_ext) {
                        let client_c = client.clone();
                        ext_futures.push(tokio::spawn(async move {
                            let req = client_c.head(&ext).send();
                            if let Ok(Ok(res)) = tokio::time::timeout(std::time::Duration::from_secs(4), req).await {
                                if res.status().as_u16() >= 400 { return true; }
                            } else { 
                                // Timeout or error
                                return true; 
                            }
                            false
                        }));
                    }
                    for f in futures::future::join_all(ext_futures).await {
                        if let Ok(true) = f { external_broken += 1; }
                    }
                }
                if external_broken > 0 {
                    page_result.issues.push(AuditIssue {
                        category: "Error".to_string(),
                        description: format!("Broken External Links ({})", external_broken),
                    });
                }

                // Compute page SEO score
                page_result.page_seo_score =
                    crate::scoring::page_score::compute(&page_result);

                let _ = app.emit("audit-page-result", page_result.clone());
                (page_result, new_links, depth)
            });
            pages_crawled += 1;
        }

        // Check termination
        if join_set.is_empty() {
            if queue.is_empty() || pages_crawled >= max_pages {
                if sitemap_finished {
                    break;
                } else {
                    if let Some(url) = sitemap_rx.recv().await {
                        let norm = normalize_url(&url);
                        sitemap_urls.insert(norm.clone());
                        if !visited.contains(&norm) {
                            visited.insert(norm);
                            queue.push_back((url, 0));
                        }
                    } else {
                        sitemap_finished = true;
                    }
                    continue;
                }
            }
        }

        // Process completed tasks or sitemap arrivals
        tokio::select! {
            Some(res) = join_set.join_next(), if !join_set.is_empty() => {
                if let Ok((page_result, new_links, depth)) = res {
                    let u = page_result.url.clone();
                    all_results.push(page_result);
                    link_graph.insert(u, new_links.clone());
                    for link in new_links {
                        let norm = normalize_url(&link);
                        internally_linked_urls.insert(norm.clone());
                        if !visited.contains(&norm) {
                            visited.insert(norm);
                            queue.push_back((link, depth + 1));
                        }
                    }
                }
            }
            recv_res = sitemap_rx.recv(), if !sitemap_finished => {
                if let Some(url) = recv_res {
                    let norm = normalize_url(&url);
                    sitemap_urls.insert(norm.clone());
                    if !visited.contains(&norm) {
                        visited.insert(norm);
                        queue.push_back((url, 0));
                    }
                } else {
                    sitemap_finished = true;
                }
            }
        }
    }

    // --- Phase 4: Post-crawl analysis ---
    let mut title_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut desc_map: HashMap<String, Vec<String>> = HashMap::new();

    for page in &all_results {
        if let Some(t) = &page.title {
            if !t.is_empty() {
                title_map
                    .entry(t.clone())
                    .or_default()
                    .push(page.url.clone());
            }
        }
        if let Some(d) = &page.meta_description {
            if !d.is_empty() {
                desc_map
                    .entry(d.clone())
                    .or_default()
                    .push(page.url.clone());
            }
        }
    }

    for page in &mut all_results {
        let mut modified = false;

        if let Some(t) = &page.title {
            if title_map.get(t).map_or(0, |u| u.len()) > 1 {
                page.issues.push(AuditIssue {
                    category: "Error".to_string(),
                    description: "Duplicate Title Tag".to_string(),
                });
                modified = true;
            }
        }
        if let Some(d) = &page.meta_description {
            if desc_map.get(d).map_or(0, |u| u.len()) > 1 {
                page.issues.push(AuditIssue {
                    category: "Error".to_string(),
                    description: "Duplicate Meta Description".to_string(),
                });
                modified = true;
            }
        }

        let normalized_url = normalize_url(&page.url);
        if sitemap_urls.contains(&normalized_url)
            && !internally_linked_urls.contains(&normalized_url)
            && normalized_url != normalized_start
        {
            page.issues.push(AuditIssue {
                category: "Warning".to_string(),
                description: "Orphan Page (in sitemap, no internal links)".to_string(),
            });
            modified = true;
        }

        if modified {
            page.page_seo_score = crate::scoring::page_score::compute(page);
            let _ = app.emit("audit-page-result", page.clone());
        }
    }

    // Orphan pages
    let mut final_orphan_pages = vec![];
    for su in &sitemap_urls {
        if !internally_linked_urls.contains(su) && su != &normalized_start {
            final_orphan_pages.push(su.clone());
        }
    }
    if !final_orphan_pages.is_empty() {
        let _ = app.emit(
            "audit-orphan-pages",
            serde_json::json!({ "orphan_pages": final_orphan_pages }),
        );
    }

    // --- Phase 5: Link graph & PageRank ---
    let graph_nodes =
        crate::scoring::graph::compute_graph(&all_results, &link_graph, &start_url);
    let _ = app.emit(
        "audit-graph-results",
        AuditGraphResults {
            nodes: graph_nodes,
        },
    );

    let _ = app.emit(
        "audit-progress",
        AuditProgress {
            url: String::new(),
            status: "completed".to_string(),
            pages_crawled,
        },
    );

    Ok("Audit completed".to_string())
}
