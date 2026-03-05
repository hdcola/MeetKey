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

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Format Code

```bash
pnpm format
```

## Documentation

- [Architecture](docs/plans/2025-03-05-monorepo-restructure-design.md)
- [CLAUDE.md](CLAUDE.md) - Developer guide for Claude Code
