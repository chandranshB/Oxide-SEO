use tauri::AppHandle;
use crate::crawler;

#[tauri::command]
pub async fn run_site_audit(
    app: AppHandle,
    start_url: String,
    sitemap_url: Option<String>,
    max_pages: usize,
    crawl_speed: usize,
) -> Result<String, String> {
    let crawl_speed = crawl_speed.clamp(1, 15);
    let client = crawler::fetcher::build_client(crawl_speed)?;

    crawler::engine::run_crawl(
        app,
        client,
        start_url,
        sitemap_url,
        max_pages,
        crawl_speed,
    ).await
}
