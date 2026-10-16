<div align="center">
  <br />
  <img src="logo.svg" alt="Oxide SEO" width="340" />
  <br />
  <p><strong>Fast, local-first technical SEO toolkit built with Rust, Tauri v2, and React.</strong></p>

  <p>
    <a href="https://github.com/chandranshB/Oxide-SEO/releases/latest"><img src="https://img.shields.io/github/v/release/chandranshB/Oxide-SEO?color=22c55e&label=release&logo=github&style=flat-square" alt="Latest Release" /></a>
    <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/rust-2021_edition-dea584?logo=rust&logoColor=white&style=flat-square" alt="Rust 2021" /></a>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/tauri-v2-24c8db?logo=tauri&logoColor=white&style=flat-square" alt="Tauri v2" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/react-19-61dafb?logo=react&logoColor=black&style=flat-square" alt="React 19" /></a>
    <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/storage-local_sqlite-003b57?logo=sqlite&logoColor=white&style=flat-square" alt="SQLite" /></a>
    <a href="https://www.gnu.org/licenses/agpl-3.0"><img src="https://img.shields.io/badge/license-AGPL_v3-3b82f6?style=flat-square" alt="AGPL v3" /></a>
  </p>

  <p>
    <a href="#why-oxide-seo">Why Oxide SEO</a> &bull;
    <a href="#features">Features</a> &bull;
    <a href="#comparison">Comparison</a> &bull;
    <a href="#architecture--tech-stack">Architecture</a> &bull;
    <a href="#installation">Installation</a> &bull;
    <a href="#building-from-source">Building from Source</a> &bull;
    <a href="#license">License</a>
  </p>
</div>

---

## Why Oxide SEO?

Most SEO tools fall into two frustrating extremes:

1. **Cloud SaaS Platforms (Ahrefs, Semrush, Moz)**: Cost \$120 to \$300+ every month, meter your crawls with credit limits, and force you to transmit your clients' unreleased staging sites, competitive research, and search data across third-party remote servers.
2. **Legacy Desktop Crawlers (Screaming Frog)**: Require \$259/year recurring licenses, run on bulky Java runtimes, consume immense amounts of RAM on medium-sized crawls, and sport interfaces built in the mid-2000s.

**Oxide SEO is an open-source, local-first alternative.**

It pairs a high-performance **Rust** asynchronous networking engine with **Tauri v2** and a **React 19** interface. Your site audits, competitor content outlines, Google Search Console logs, and keyword clusters stay **100% on your machine in an embedded SQLite database**.

- **Zero recurring subscription fees**: Free and open source under AGPLv3.
- **Unrestricted crawls**: Run audits as deep as your network and hardware allow.
- **Total privacy**: Client data, internal URLs, and Google OAuth tokens never touch an intermediary server.
- **Native performance**: Compiles down to a lean native desktop binary without Chromium or Electron overhead.

---

## Features

### 1. High-Concurrency Asynchronous Site Crawler
Engineered natively in Rust with `tokio`, `reqwest`, and `scraper` for non-blocking HTTP streaming:
- **Comprehensive On-Page Audits**: Automatically flags missing or duplicate H1 tags, title and meta description truncation, absent image alt attributes, canonical tag mismatches, and meta robots instructions (`noindex`, `nofollow`).
- **Content & Readability Scoring**: Computes word counts, paragraph depth, content-to-HTML ratio, table/video presence, and automated readability metrics.
- **Structured Data Extraction**: Detects and extracts Schema.org JSON-LD microdata hierarchies.
- **Protocol & Status Code Auditing**: Real-time status reporting across `2xx`, `3xx` redirects, `4xx` broken links, and `5xx` server faults.
- **Sitemap & Robots.txt Parser**: Discovers URLs via XML sitemaps and enforces crawler boundaries defined in `robots.txt`.
- **In-App Crawler View**: Inspect the raw HTML, parsed DOM tree, extracted heading outlines, and schema blocks of any crawled page without leaving the desktop workspace.

### 2. Internal Link Graph & PageRank Equity
A website's internal architecture dictates its ranking authority:
- **Link Topology Mapping**: Computes incoming and outgoing internal link connections for every crawled document.
- **Local PageRank Scoring**: Runs a weighted recursive graph traversal to compute internal link equity, isolating orphan pages and weak leaf nodes.
- **Crawl Depth Tracking**: Identifies deep pages hidden beyond 3+ click depths from the root URL.

### 3. Local Google Search Console Intelligence
Connect your Google account directly without a remote cloud proxy:
- **Loopback OAuth 2.0**: Authenticates via a temporary local loopback server (`http://localhost:8080/callback`). Client credentials and access tokens are saved only to your local database.
- **Direct Metric Caching**: Synchronizes search queries, landing pages, clicks, impressions, CTR, and average position directly into SQLite.
- **Instant Local Filtering**: Query tens of thousands of search performance rows with zero lag and zero cloud rate-limiting.

### 4. Long-Tail Keyword Vault & Semantic Clustering
A built-in keyword discovery engine designed to uncover high-intent search terms:
- **Multi-Vector Suggestion Scraper**: Runs concurrent autocomplete passes across alphabetical (`A–Z`), interrogative (`how`, `what`, `why`), commercial intent (`best`, `review`, `buy`), and comparative (`vs`, `alternative`) patterns.
- **Search Intent Classifier**: Automatically buckets terms into **Informational**, **Commercial**, **Transactional**, and **Navigational** categories.
- **Opportunity & Difficulty Scoring**: Calculates competitive opportunity scores based on token length, keyword depth, and intent modifiers.
- **Semantic Clustering**: Groups related long-tail terms into topical silos and content clusters to guide site architecture.

### 5. Side-by-Side Competitor Outliner
Compare your landing pages directly against top-ranking SERP competitors:
- **Heading Structure Comparison**: Pulls full `H1`–`H6` outline hierarchies side-by-side to highlight missing topical coverage.
- **Keyword Density & Term Frequency**: Tokenizes page text to calculate n-gram word counts and term density differentials.
- **Metadata Inspection**: Instant side-by-side comparison of word counts, title tags, and meta descriptions.

---

## Comparison

| Capability | Oxide SEO | Screaming Frog | SaaS (Ahrefs / Semrush) |
| :--- | :---: | :---: | :---: |
| **Pricing** | **Free & Open Source** | \$259 / year | \$120 – \$300+ / month |
| **Data Storage** | **100% Local SQLite** | Local Memory / Disk DB | Proprietary Cloud |
| **Privacy & Security** | **Zero Telemetry** | Local | URLs Stored on Third-Party Servers |
| **Architecture** | **Rust + Tauri v2** | Java Swing Runtime | Web App / Browser |
| **Memory Footprint** | **~60–120 MB RAM** | ~1–4+ GB RAM | Browser Tab |
| **Internal PageRank** | Built-in | Built-in | Limited |
| **Direct GSC Sync** | Local OAuth Loopback | API Connector | Cloud Integration |
| **Keyword Discovery** | Multi-Pass Autocomplete | None | Credit-Based API |
| **Semantic Clustering**| Built-in Local Engine | None | Add-on Plan Required |

---

## Architecture & Tech Stack

Oxide SEO uses a decoupled, event-driven desktop architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                     │
│    Tailwind CSS  •  HugeIcons  •  Vite  •  TypeScript       │
└──────────────────────────────┬──────────────────────────────┘
                               │  Tauri IPC (Event Streaming)
┌──────────────────────────────▼──────────────────────────────┐
│                    Tauri v2 Native Bridge                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼─────────────┐ ┌──────────────▼───────────────┐
│     Rust Async Engine      │ │      Local Storage Layer     │
│  • Tokio (Threadpool)      │ │  • SQLite (via plugin-sql)   │
│  • Reqwest (HTTP / TLS)    │ │  • Embedded `seo_kit.db`     │
│  • Scraper (DOM Parsing)   │ │  • Local OAuth 2.0 Loopback  │
│  • PageRank Graph Solver   │ │  • Zero External Telemetry   │
└────────────────────────────┘ └──────────────────────────────┘
```

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Vite](https://vitejs.dev/)
- **Desktop Runtime**: [Tauri v2](https://tauri.app/)
- **Core Backend**: [Rust](https://www.rust-lang.org/) (2021 Edition)
- **Networking & Concurrency**: [Tokio](https://tokio.rs/), [Reqwest](https://github.com/seanmonstar/reqwest) (Rustls TLS)
- **DOM Parsing**: [Scraper](https://github.com/causal-agent/scraper)
- **Database**: SQLite embedded via `@tauri-apps/plugin-sql`

---

## Installation

### Pre-Compiled Desktop Installers
Download the latest binary for your operating system from the [Releases](https://github.com/chandranshB/Oxide-SEO/releases) page:

- **Windows**: `.msi` installer or standalone `.exe`
- **macOS**: `.dmg` (Universal binary for Apple Silicon & Intel)
- **Linux**: `.deb` or standalone `.AppImage`

---

## Building from Source

### Prerequisites

Ensure you have the required toolchains installed:
1. **Node.js**: `v20.0.0` or higher ([Download](https://nodejs.org/))
2. **Rust & Cargo**: Stable toolchain (`1.77+`) ([Install Rust](https://rustup.rs/))
3. **Platform Build Dependencies**:
   - **Windows**: [C++ Build Tools from Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and WebView2 (pre-installed on Windows 10/11).
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`).
   - **Linux (Debian/Ubuntu)**:
     ```bash
     sudo apt update
     sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential curl wget file libssl-dev
     ```

### Build Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/chandranshB/Oxide-SEO.git
   cd Oxide-SEO
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode** (hot-reloads React and recompiles Rust backend):
   ```bash
   npm run tauri dev
   ```

4. **Package a standalone release binary**:
   ```bash
   npm run tauri build
   ```
   Compiled release bundles will be generated under `src-tauri/target/release/bundle/`.

---

## Local Data Storage

All data created in Oxide SEO is saved locally in an embedded SQLite database named `seo_kit.db`. No data is ever transmitted to an external service.

The database is stored in standard operating system application directories:
- **Windows**: `%APPDATA%\com.oxideseo.app\seo_kit.db`
- **macOS**: `~/Library/Application Support/com.oxideseo.app/seo_kit.db`
- **Linux**: `~/.config/com.oxideseo.app/seo_kit.db`

You can inspect, query, or backup this SQLite database at any time using tools like `sqlite3`, DBeaver, or TablePlus.

---

## Roadmap

- [x] Multi-threaded asynchronous website crawler
- [x] On-page technical SEO diagnostics (headings, meta, canonicals, images)
- [x] Local PageRank and internal link equity graph scoring
- [x] Google Search Console direct loopback OAuth integration
- [x] Autocomplete keyword discovery and semantic clustering
- [x] Side-by-side competitor outline comparison
- [ ] Export audit reports to CSV, XLSX, and standalone PDF
- [ ] Historical audit diffing (track site regressions between crawl dates)
- [ ] Custom CSS selector & XPath data extraction
- [ ] Lighthouse Core Web Vitals lab diagnostics integration

---

## Contributing

Contributions from the developer and SEO communities are welcome. To get started:

1. Fork the repository and create your feature branch: `git checkout -b feat/my-new-feature`.
2. Ensure frontend code conforms to TypeScript checks: `npm run build`.
3. Ensure backend code passes formatting and linting: `cargo clippy --manifest-path src-tauri/Cargo.toml`.
4. Commit your changes with conventional commit messages: `git commit -m 'feat: add custom xpath extractor'`.
5. Push to your branch and open a Pull Request.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for code conventions and architectural guidelines.

---

## Security & Privacy

Oxide SEO treats user privacy and data security as foundational principles:
- **No Analytics / Telemetry**: Oxide SEO does not bundle tracking SDKs, Google Analytics, telemetry pings, or telemetry flags.
- **Local Credentials**: Google OAuth refresh tokens are stored exclusively inside your local SQLite database file.
- For security vulnerability reports, please review our [Security Policy](SECURITY.md).

---

## License

Oxide SEO is free and open-source software licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.

You are free to run, study, modify, and share this software. If you modify the codebase and distribute it or operate it over a network as a service, you must release your modifications under the same AGPLv3 license. See the [LICENSE](LICENSE) file for complete terms.

---

<div align="center">
  <p>Maintained by <a href="https://github.com/chandranshB">Chandransh</a> and the open-source community.</p>
</div>
