use reqwest::Client;
use url::Url;
use tokio::sync::mpsc::UnboundedSender;

/// Fetch sitemap URLs and send them through the channel.
/// Supports sitemap index files (recursive) and standard sitemaps.
pub async fn fetch_sitemap_urls(
    client: &Client,
    sitemap_url: &Url,
    tx: UnboundedSender<String>,
) {
    fetch_sitemap_recursive(client, sitemap_url.clone(), tx, 0).await;
}

/// Recursively fetch sitemaps (supports sitemap index files up to 3 levels deep).
#[async_recursion::async_recursion]
async fn fetch_sitemap_recursive(
    client: &Client,
    sitemap_url: Url,
    tx: UnboundedSender<String>,
    depth: usize,
) {
    if depth > 3 {
        return;
    }

    let response = match client.get(sitemap_url.as_str()).send().await {
        Ok(r) => r,
        Err(_) => return,
    };

    let xml = match response.text().await {
        Ok(t) => t,
        Err(_) => return,
    };

    let doc = match roxmltree::Document::parse(&xml) {
        Ok(d) => d,
        Err(_) => return,
    };

    // Check if this is a sitemap index (contains <sitemap> elements)
    let mut is_index = false;
    let mut sub_urls: Vec<String> = Vec::new();

    for node in doc.descendants() {
        if node.has_tag_name("sitemap") {
            is_index = true;
            for child in node.children() {
                if child.has_tag_name("loc") {
                    if let Some(sub_url) = child.text() {
                        sub_urls.push(sub_url.trim().to_string());
                    }
                }
            }
        }
    }

    if is_index {
        // Fetch sub-sitemaps
        for sub_url_str in sub_urls {
            if let Ok(parsed) = Url::parse(&sub_url_str) {
                let client_c = client.clone();
                let tx_c = tx.clone();
                tokio::spawn(async move {
                    fetch_sitemap_recursive(&client_c, parsed, tx_c, depth + 1).await;
                });
            }
        }
    } else {
        // Extract <url><loc> entries
        for node in doc.descendants() {
            if node.has_tag_name("loc") {
                if let Some(text) = node.text() {
                    let url = text.trim().to_string();
                    if !url.is_empty() {
                        let _ = tx.send(url);
                    }
                }
            }
        }
    }
}
