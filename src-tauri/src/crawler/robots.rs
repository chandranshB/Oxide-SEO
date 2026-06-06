use reqwest::Client;
use url::Url;
use crate::models::AuditIssue;

/// Parsed robots.txt data.
pub struct RobotsTxt {
    pub disallowed: Vec<String>,
    pub sitemaps: Vec<String>,
}

impl RobotsTxt {
    pub fn empty() -> Self {
        Self {
            disallowed: Vec::new(),
            sitemaps: Vec::new(),
        }
    }

    /// Check if a given path is allowed by robots.txt rules.
    pub fn is_allowed(&self, path: &str) -> bool {
        for rule in &self.disallowed {
            if rule == "/" {
                return false;
            }
            if path.starts_with(rule.as_str()) {
                return false;
            }
        }
        true
    }
}

/// Fetch and parse robots.txt, returning parsed data and any site-level issues.
pub async fn fetch_and_parse(
    client: &Client,
    base_url: &Url,
) -> (RobotsTxt, Vec<AuditIssue>) {
    let mut issues = Vec::new();

    let robots_url = match base_url.join("/robots.txt") {
        Ok(u) => u,
        Err(_) => return (RobotsTxt::empty(), issues),
    };

    let response = match client.get(robots_url).send().await {
        Ok(r) => r,
        Err(_) => {
            issues.push(AuditIssue {
                category: "Warning".to_string(),
                description: "Missing robots.txt".to_string(),
            });
            return (RobotsTxt::empty(), issues);
        }
    };

    if response.status().as_u16() >= 400 {
        issues.push(AuditIssue {
            category: "Warning".to_string(),
            description: "Missing robots.txt".to_string(),
        });
        return (RobotsTxt::empty(), issues);
    }

    let text = match response.text().await {
        Ok(t) => t,
        Err(_) => return (RobotsTxt::empty(), issues),
    };

    // Parse robots.txt
    let mut disallowed = Vec::new();
    let mut sitemaps = Vec::new();
    let mut in_wildcard_agent = false;

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let lower = line.to_lowercase();

        if lower.starts_with("user-agent:") {
            let agent = line[11..].trim().to_lowercase();
            in_wildcard_agent = agent == "*";
        } else if lower.starts_with("disallow:") && in_wildcard_agent {
            let path = line[9..].trim();
            if !path.is_empty() {
                disallowed.push(path.to_string());
            }
        } else if lower.starts_with("sitemap:") {
            let url = line[8..].trim();
            if !url.is_empty() {
                sitemaps.push(url.to_string());
            }
        }
    }

    (RobotsTxt { disallowed, sitemaps }, issues)
}
