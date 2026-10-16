# Contributing to Oxide SEO

Thank you for your interest in contributing to Oxide SEO. As an open-source, privacy-first technical SEO toolkit, we welcome bug fixes, performance optimizations, feature enhancements, and documentation improvements.

---

## Development Setup

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **Rust**: Stable toolchain (`rustup default stable`, 1.77+)
- **System build tools**:
  - **Windows**: Visual Studio C++ Build Tools & WebView2
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: GTK3, WebKit2GTK, and build essentials:
    ```bash
    sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential curl wget file libssl-dev
    ```

### 2. Fork and Clone
```bash
git clone https://github.com/<your-username>/Oxide-SEO.git
cd Oxide-SEO
git checkout -b feat/your-feature-name
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Locally
To run both the Vite frontend and the compiled Rust backend with hot reloading:
```bash
npm run tauri dev
```

---

## Architecture & Conventions

### Rust Backend (`src-tauri/`)
- All network operations must be non-blocking and asynchronous using `tokio` and `reqwest`.
- Set explicit timeouts on all external network requests to prevent crawler deadlocks.
- Keep business logic cleanly separated across:
  - `src-tauri/src/crawler/`: Asynchronous engine, robots parser, sitemap scanner.
  - `src-tauri/src/analyzer/`: DOM parsing, on-page checks, readability metrics.
  - `src-tauri/src/scoring/`: Graph calculations, PageRank equity solver.
  - `src-tauri/src/commands/`: Tauri commands invoked via IPC.
- Run `cargo clippy --manifest-path src-tauri/Cargo.toml` to ensure no warnings exist.

### React Frontend (`src/`)
- Built with React 19, TypeScript, and Tailwind CSS.
- Strictly type all props, state, and Tauri IPC invocations.
- Maintain the established design system tokens (`var(--bg-base)`, `var(--bg-surface)`, `var(--accent-primary)`).
- Ensure no console errors or uncaught promise rejections occur during runtime.
- Run `npm run build` before submitting your PR to ensure TypeScript compilation passes.

---

## Testing Your Changes

Before submitting your pull request, verify:
1. `npm run build` completes without errors.
2. `cargo check --manifest-path src-tauri/Cargo.toml` passes.
3. App launches and audits a sample domain without crashes or memory leaks.

---

## Commit Messages

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat: add custom xpath extractor`
- `fix: resolve sitemap recursion on cyclic links`
- `perf: optimize tokenization in keyword clusterer`
- `docs: update build instructions for fedora`

---

## Licensing

Oxide SEO is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**. By contributing, you agree that your contributions will be licensed under AGPLv3.
