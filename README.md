# MeetKey

One-click control of Google Meet in Stream Dock.

## Project Structure

This is a **pnpm monorepo** with the following packages:

- **@meetkey/shared** - Shared types, protocols, and utilities
- **@meetkey/plugin** - Stream Deck plugin (Vue 3 + Vite)
- **@meetkey/browser-extension** - Browser extension (Vue 3 + WXT)
- **@meetkey/service** - Central service (Tauri + Rust)

## Quick Start

### Install Dependencies

```bash
pnpm install
```

> **Note**: This command automatically sets up **Husky** Git hooks. If you have any issues with automated formatting on commit, ensure hooks are active by running `git config core.hooksPath .husky`.

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

## Code Quality & Formatting

This project uses **Prettier** for frontend code and **rustfmt** for Rust code.

- **Manual Format**: Run `pnpm format` to format all files.
- **Automated Format**: Formatting is automatically applied to **staged files** on every `git commit` via **Husky** and **lint-staged**.
- **Lint Check**: Run `pnpm lint:check` for ESLint rules.
- **Format Check**: Run `pnpm format:check` to verify formatting (used in CI).

### Editor Configuration (Recommended)

To improve development experience, it is highly recommended to enable **Format on Save** in your editor (VS Code, IntelliJ, etc.) using the project's Prettier and Rust Analyzer configurations.

## Documentation

- [Architecture](docs/plans/2025-03-05-monorepo-restructure-design.md)
- [CLAUDE.md](CLAUDE.md) - Developer guide for Claude Code
