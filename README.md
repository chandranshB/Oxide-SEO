<div align="center">
  <br />
  <h1>
    <img src="logo.svg" alt="Oxide SEO Logo" width="300" />
  </h1>
  <p><strong>Professional, privacy-first, and local-native SEO analysis toolkit.</strong></p>
  <br />

  [![Tauri App](https://img.shields.io/badge/Tauri-v2-24c8db?logo=tauri&logoColor=white)](#)
  [![React UI](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)](#)
  [![Rust Backend](https://img.shields.io/badge/Rust-Backend-dea584?logo=rust&logoColor=white)](#)
  [![SQLite Storage](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white)](#)
  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
</div>

---

## 📌 Overview

**Oxide SEO** is an industry-grade, cross-platform SEO toolkit engineered for speed, privacy, and precision. Unlike traditional SaaS SEO platforms that lock your data behind subscriptions, Oxide SEO runs completely locally.

By combining the raw performance of a **Rust** backend with a modern, dynamic **React** frontend (powered by Tauri), Oxide provides real-time site crawling, competitor analysis, and Google Search Console integrations—all while keeping 100% of your data securely on your own machine in a local SQLite database.

## ✨ Core Capabilities

### 🕵️ Local Site Auditor
An aggressively multi-threaded, asynchronous web crawler built natively in Rust.
*   **Comprehensive SEO Checks**: Instantly detect missing H1 tags, multiple H1s, missing Meta Descriptions, and absent Image Alt texts.
*   **Advanced Diagnostics**: Identifies Canonical tag configurations, Language attribute definitions, and deeply nested Orphan Pages.
*   **Secure & Fast**: Uses `reqwest` and `scraper` (Rust DOM parsing) for lightning-fast execution without browser overhead.

### 📊 Competitor Analysis
Perform granular, side-by-side content gap analyses against top-ranking competitors.
*   **Heading Structure Mapping**: Extract and compare full `H1-H6` outlines directly alongside competitor pages.
*   **Keyword Density**: Automatically tokenizes page text to calculate keyword frequency and term density, highlighting critical content gaps.
*   **Word Count & Meta Metrics**: Instantly compare raw page statistics.

### 📈 Google Search Console Integration
Securely authenticate with Google APIs to pull real-world search performance data.
*   **Local Data Vault**: Data is fetched via OAuth and cached locally in SQLite. No middleman servers.
*   **Performance Tracking**: Visualize impressions, clicks, CTR, and average positioning over time.

### 🔍 Keyword Scraper Vault
A powerful, free autocomplete keyword scraper designed for long-tail discovery.
*   Automatically recursively scrapes localized keyword suggestions.
*   Exports directly to CSV or saves to your local vault for future clustering.

## 🛠️ Architecture & Tech Stack

Oxide SEO employs a decoupled architecture, leveraging a lightweight web frontend communicated via IPC (Inter-Process Communication) to a high-performance system-level backend.

*   **Core Framework**: [Tauri](https://tauri.app/) (v2)
*   **Backend & Networking**: [Rust](https://www.rust-lang.org/), `reqwest`, `scraper`, `tokio`
*   **Frontend UI**: [React](https://reactjs.org/), TypeScript, [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom UI/UX with zero-bloat vanilla CSS integrations)
*   **Database**: SQLite (`@tauri-apps/plugin-sql`)

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust Toolkit](https://www.rust-lang.org/tools/install)
*   [Tauri OS Dependencies](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation Guide

#### Windows (SmartScreen Warning)
Because Oxide SEO is an indie application, Microsoft Windows SmartScreen may initially flag the `.exe` or `.msi` installers with a "Windows protected your PC / Unknown Publisher" warning. This is a standard security feature for new applications.

To install the application:
1. Click **"More info"**
2. Click **"Run anyway"**

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/oxide-seo.git
   cd oxide-seo
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Initialize the SQLite Database**
   The application will automatically scaffold the local `seo_kit.db` in your system's application data directory upon first launch.

4. **Launch the Development Server**
   This will simultaneously compile the Rust backend and launch the Vite hot-reloading frontend.
   ```bash
   npm run tauri dev
   ```

### Production Build
To compile a highly optimized, standalone executable for your operating system:
```bash
npm run tauri build
```
The compiled binaries will be located in `src-tauri/target/release/`.

## 🤝 Contributing

We welcome contributions from the community. Please follow these strict guidelines:
1.  **Rust Backend**: Ensure all new network requests use asynchronous `tokio` streams and gracefully handle timeouts.
2.  **Frontend UI**: Adhere to the established Tailwind aesthetic (utilizing `var(--accent-primary)` for brand consistency). Do not introduce generic, unstyled components.
3.  **Pull Requests**: Ensure `npm run build` and `cargo clippy` execute without warnings before submitting PRs.

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.

You are free to use, modify, and distribute this software. However, if you modify the software and distribute it, or if you run the modified software as a service over a network (SaaS), you **must** make your modified source code available to the public under the same AGPLv3 license.

See the `LICENSE` file for more details.

---
<div align="center">
  <p>Engineered for performance. Built for the desktop.</p>
</div>
