pub mod models;
pub mod crawler;
pub mod analyzer;
pub mod scoring;
pub mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_gsc_metrics_table",
            sql: "CREATE TABLE IF NOT EXISTS gsc_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT NOT NULL,
                page TEXT NOT NULL,
                clicks INTEGER DEFAULT 0,
                impressions INTEGER DEFAULT 0,
                ctr REAL DEFAULT 0,
                average_position REAL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_audit_tables",
            sql: "CREATE TABLE audits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'running'
            );
            CREATE TABLE audit_pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                audit_id INTEGER NOT NULL,
                url TEXT NOT NULL,
                status_code INTEGER,
                title TEXT,
                meta_description TEXT,
                h1 TEXT,
                word_count INTEGER DEFAULT 0,
                load_time_ms INTEGER DEFAULT 0,
                FOREIGN KEY(audit_id) REFERENCES audits(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_projects_table",
            sql: "CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_audit_history_fields",
            sql: "ALTER TABLE audit_pages ADD COLUMN issues_json TEXT DEFAULT '[]';
                  ALTER TABLE audits ADD COLUMN project_id INTEGER;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_link_metrics",
            sql: "ALTER TABLE audit_pages ADD COLUMN in_links INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN out_links INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN internal_rank REAL DEFAULT 0.0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_content_depth_and_scoring_fields",
            sql: "ALTER TABLE audit_pages ADD COLUMN content_depth_score REAL DEFAULT 0.0;
                  ALTER TABLE audit_pages ADD COLUMN heading_count INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN heading_depth INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN image_count INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN images_without_alt INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN internal_link_count INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN external_link_count INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN has_schema INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN schema_types TEXT DEFAULT '[]';
                  ALTER TABLE audit_pages ADD COLUMN readability_score REAL DEFAULT 0.0;
                  ALTER TABLE audit_pages ADD COLUMN paragraph_count INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN has_table INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN has_list INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN has_video INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN content_to_html_ratio REAL DEFAULT 0.0;
                  ALTER TABLE audit_pages ADD COLUMN meta_robots TEXT;
                  ALTER TABLE audit_pages ADD COLUMN canonical_url TEXT;
                  ALTER TABLE audit_pages ADD COLUMN og_image TEXT;
                  ALTER TABLE audit_pages ADD COLUMN response_size_bytes INTEGER DEFAULT 0;
                  ALTER TABLE audit_pages ADD COLUMN page_seo_score REAL DEFAULT 0.0;
                  ALTER TABLE audit_pages ADD COLUMN crawl_depth INTEGER DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_keyword_sessions",
            sql: "CREATE TABLE IF NOT EXISTS keyword_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                seed TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'quick',
                total_keywords INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS keyword_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                keyword TEXT NOT NULL,
                intent TEXT NOT NULL,
                intent_confidence TEXT NOT NULL,
                difficulty INTEGER DEFAULT 50,
                opportunity INTEGER DEFAULT 50,
                word_count INTEGER DEFAULT 0,
                cluster_label TEXT,
                source TEXT,
                is_saved BOOLEAN DEFAULT 0,
                user_notes TEXT,
                FOREIGN KEY(session_id) REFERENCES keyword_sessions(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:seo_kit.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::keywords::discover_keywords,
            commands::keywords::scrape_competitor_outline,
            commands::oauth::start_oauth_server,
            commands::oauth::exchange_oauth_token,
            commands::audit::run_site_audit,
            commands::crawler_view::fetch_page_content_view
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

