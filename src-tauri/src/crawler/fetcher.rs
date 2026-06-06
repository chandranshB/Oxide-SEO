use reqwest::Client;
use std::time::Duration;

/// Build the HTTP client with proper configuration for web crawling.
pub fn build_client(crawl_speed: usize) -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(15))
        .connect_timeout(Duration::from_secs(10))
        .pool_idle_timeout(Duration::from_secs(90))
        .pool_max_idle_per_host(crawl_speed)
        .user_agent("OxideSEO/1.0 (+https://oxideseo.com/bot)")
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e: reqwest::Error| e.to_string())
}
