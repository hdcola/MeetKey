# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MeetKey** is a monorepo project that integrates Stream Deck with browsers to control Google Meet. It consists of four interconnected packages:
- **@meetkey/plugin** - Stream Deck plugin (Vue 3 + Vite)
- **@meetkey/browser-extension** - Browser extension (Vue 3 + WXT)
- **@meetkey/service** - Central WebSocket service (Tauri + Rust)
- **@meetkey/shared** - Shared types and communication protocol

**Key Tech Stack:**
- **Package Manager:** pnpm monorepo
- **UI Frameworks:** Vue 3 with TypeScript
- **Build Tools:** Vite (plugin), WXT (browser-extension), Tauri (service)
- **State Management:** Pinia (plugin)
- **Styling:** Tailwind CSS + Naive UI components
- **Desktop Framework:** Tauri (Rust backend + Vue frontend)

## Common Commands

All commands run from **root directory**:

```bash
# Start all packages in parallel (dev mode)
pnpm dev

# Build all packages
pnpm build

# Format all code with Prettier
pnpm format

# Check code with ESLint
pnpm lint

# Install dependencies for entire monorepo
pnpm install

# Clean all node_modules, dist directories, and lock file
pnpm clean
```

**Single package development:**
```bash
cd packages/plugin
pnpm dev

cd packages/service
pnpm dev
```

**Quick cleanup and reinstall:**
```bash
# Clean and reinstall everything
pnpm clean && pnpm install
```

**Note:** Package-level `dev` and `build` commands work the same as before. The plugin's `script/autofile.cjs` still generates `dist/manifest.json` and copies to StreamDock plugins directory.

## Monorepo Structure

```
meetkey/                                    # Root directory
├── pnpm-workspace.yaml                    # Workspace configuration
├── package.json                           # Root package with shared scripts
├── tsconfig.json                          # Base TypeScript config (inherited by all packages)
├── prettier.config.js                     # Shared formatting rules
├── eslint.config.js                       # Shared linting rules
├── CLAUDE.md                              # This file
│
├── packages/
│   ├── shared/                            # @meetkey/shared - Shared library
│   │   ├── src/
│   │   │   ├── types/                     # Message, event type definitions
│   │   │   ├── protocol/                  # WebSocket protocol builders
│   │   │   └── utils/                     # Shared utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── plugin/                            # @meetkey/plugin - Stream Deck plugin
│   │   ├── src/
│   │   │   ├── plugin/                    # Action implementations
│   │   │   │   ├── index.vue             # Main plugin component
│   │   │   │   └── actions/              # Individual action handlers
│   │   │   ├── pages/                     # Property inspector UI
│   │   │   │   ├── index.vue
│   │   │   │   └── actions/
│   │   │   ├── hooks/                     # Custom composables
│   │   │   ├── components/
│   │   │   ├── types/
│   │   │   ├── main.ts
│   │   │   └── main.css
│   │   ├── script/
│   │   │   └── autofile.cjs              # Build automation script
│   │   ├── public/
│   │   ├── vite.config.ts
│   │   ├── manifest.cjs                  # Plugin metadata
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── browser-extension/                 # @meetkey/browser-extension
│   │   ├── src/
│   │   │   ├── entrypoints/              # Content scripts, background scripts
│   │   │   └── components/               # Vue components
│   │   ├── wxt.config.ts
│   │   ├── manifest.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── service/                           # @meetkey/service - Tauri app
│       ├── src/                           # Vue frontend
│       │   ├── App.vue
│       │   └── main.ts
│       ├── src-tauri/                     # Rust backend
│       │   ├── src/
│       │   │   ├── main.rs               # Tauri main entry
│       │   │   ├── websocket.rs          # WebSocket server
│       │   │   └── installer.rs          # Plugin installer logic
│       │   └── Cargo.toml
│       ├── package.json
│       └── tsconfig.json
│
└── docs/
    └── plans/
        ├── 2025-03-05-monorepo-restructure-design.md
        └── 2025-03-05-monorepo-restructure-implementation.md
```

## Architecture & Key Concepts

### Monorepo Communication Architecture

```
┌──────────────────────┐                 ┌─────────────────────┐
│  @meetkey/plugin     │  WebSocket      │  Browser Extension  │
│  (Stream Deck)       │◄────────────────┤  (Vue + WXT)        │
└──────────┬───────────┘   Client        └────────┬────────────┘
           │                                       │
           └───────────────┬───────────────────────┘
                           │
                    WebSocket Client
                           │
         ┌─────────────────▼──────────────────┐
         │                                    │
         │  @meetkey/service (Tauri)          │
         │                                    │
         │  ┌────────────────────────────┐   │
         │  │ WebSocket Server           │   │
         │  │ (Rust + tokio-tungstenite) │   │
         │  └────────────────────────────┘   │
         │                                    │
         │  ┌────────────────────────────┐   │
         │  │ Plugin Installer           │   │
         │  │ (Stream Deck + Browser)    │   │
         │  └────────────────────────────┘   │
         │                                    │
         └────────────────────────────────────┘
```

Both plugins communicate through `@meetkey/shared` - shared types and WebSocket protocol.

### @meetkey/shared - Communication Protocol

Defines:
- **Message types**: ActionMessage, EventMessage, ErrorMessage
- **Protocol builders**: MessageBuilder for constructing valid messages
- **Type definitions**: MeetAction, DeviceInfo, etc.
- **Validation**: Message validation utilities

### @meetkey/plugin - Stream Deck Integration

**Entry Point Pattern** (`src/main.ts`):
- If `arguments[4]` exists: mounts **Property Inspector** (settings UI)
- Otherwise: mounts **Plugin** (action handler)

All entry-point arguments stored in `window.argv`:
```
argv[0] = context
argv[1] = action
argv[2] = plugin instance
argv[3] = plugin manifest
argv[4] = optional property payload
```

**Manifest System** (`src/manifest.cjs`):
- Plugin UUID and version
- Actions array with multilingual i18n (en, zh_CN)
- Each action: UUID, icon, names/tooltips, states, settings

**State Management**:
- **usePluginStore()** (Pinia): Device state, events, lifecycle
- **usePropertyStore()**: Settings state
- **useWatchEvent()**: StreamDock event subscriptions
- **useI18nStore()**: Localized strings

### @meetkey/service - Central Coordinator

**Rust Backend** (`src-tauri/src/`):
- **main.rs**: Tauri window and event setup
- **websocket.rs**: WebSocket server (port 8080 by default)
- **installer.rs**: Plugin installation logic for both plugin and browser-extension

**Vue Frontend**: Configuration UI and system tray integration

### Workspace Dependencies

Packages reference each other using pnpm workspace protocol:
```json
{
  "dependencies": {
    "@meetkey/shared": "workspace:*"
  }
}
```

This ensures all packages use local versions during development.

## Development Workflow

### General Monorepo Development

1. **Start all packages**: `pnpm dev` from root
2. **Develop single package**: `cd packages/<name> && pnpm dev`
3. **Build single package**: `cd packages/<name> && pnpm build`
4. **Format code**: `pnpm format` (entire monorepo)

### Adding Features to @meetkey/shared

1. Add type definitions to `packages/shared/src/types/index.ts`
2. Add protocol builders to `packages/shared/src/protocol/index.ts`
3. Export from `packages/shared/src/index.ts`
4. Other packages automatically get access via `import { ... } from '@meetkey/shared'`

### Adding Actions to @meetkey/plugin

1. **Define action** in `packages/plugin/src/manifest.cjs`:
   - Add entry to `Actions` array with UUID, icon, i18n, states, settings
   - Auto-imports via `unplugin-auto-import` handle Vue composition API

2. **Implement action logic** in `packages/plugin/src/plugin/actions/action-name.ts`:
   - Export default function that receives action name
   - Use `usePluginStore()` and `useWatchEvent()` to handle events

3. **Create property inspector** in `packages/plugin/src/pages/actions/action-name.vue`:
   - Vue SFC with TypeScript
   - Use `usePropertyStore()` for settings state
   - Use `TabView` component for organizing settings

4. **Data persistence**: v-model binding to property store automatically persists

### Adding Features to @meetkey/browser-extension

1. Create entry points in `packages/browser-extension/src/entrypoints/`
2. Use WXT framework for manifest generation and hot reload
3. Connect to WebSocket server at `ws://localhost:8080` (when service is running)
4. Import types from `@meetkey/shared` for message protocol

### Adding Features to @meetkey/service

**Vue Frontend** (`packages/service/src/`):
- Standard Vue 3 development
- Use Tauri API via `@tauri-apps/api`

**Rust Backend** (`packages/service/src-tauri/src/`):
- WebSocket server listens on port 8080
- Handles connections from both plugin and browser-extension
- Manages plugin installation for both targets

## Build & Deployment

### Build Artifacts

| Package | Output | Location |
|---------|--------|----------|
| @meetkey/plugin | `.sdPlugin` directory | `packages/plugin/dist/` |
| @meetkey/browser-extension | Browser extension package | `packages/browser-extension/dist/` |
| @meetkey/service | Native executable (.exe/.dmg) | `packages/service/src-tauri/target/release/` |
| @meetkey/shared | TypeScript/JS modules | `packages/shared/dist/` |

### @meetkey/plugin Build Flow

1. `pnpm dev` or `pnpm build` → triggers `script/autofile.cjs`
2. Script reads `src/manifest.cjs`, generates plugin manifests and localizations
3. Vite bundles with `viteSingleFile` into single HTML file
4. Dev: uses `_.html` for hot reload; Production: uses `index.html`
5. Plugin installed to: `%APPDATA%/HotSpot/StreamDock/plugins/{UUID}.sdPlugin/` (Windows) or equivalent (macOS)

### @meetkey/service Build Flow

1. `pnpm build` → Tauri build system activates
2. Vue frontend compiled to static assets
3. Rust backend compiled (requires Rust toolchain)
4. Final app bundled for target platform
5. Installers generated (.exe for Windows, .dmg for macOS)

## Styling & UI

### @meetkey/plugin Styling

- **Tailwind Classes**: Available globally via `tailwind.config.js`
- **PostCSS**: Configured for Tailwind + Autoprefixer
- **Naive UI**: 90+ components, theme-aware, no style piercing needed
- **SCSS Support**: Sass compiler for scoped styles in SFCs

### @meetkey/service Styling

- Uses Tauri's native styling capabilities
- Can use Tailwind CSS in Vue frontend

## Important Notes

### General Monorepo

- **Workspace Protocol**: Use `workspace:*` for inter-package dependencies
- **pnpm Install**: Always use `pnpm install` from root to maintain lock file
- **Shared Configs**: All packages inherit tsconfig.json, prettier.config.js, eslint.config.js from root
- **Version Management**: All packages share same version number (0.1.0, etc.)

### @meetkey/plugin Specifics

- **Hot Reload:** Modify TypeScript/Vue files for instant changes. Restart for `manifest.cjs`, images, or config changes.
- **Plugin UUID:** Must be unique; defined in `packages/plugin/src/manifest.cjs` as `Plugin.UUID`
- **Path Aliases:** `@/` resolves to `packages/plugin/src/` (configured in Vite + TypeScript)
- **Multilingual Support:** English (`en`) and Simplified Chinese (`zh_CN`)
- **Auto-imports:** Vue 3 composition API auto-imported via `unplugin-auto-import`

### @meetkey/service Specifics

- **Rust Dependency**: Requires Rust toolchain for building (install via rustup)
- **WebSocket Port**: Default port 8080 (configurable)
- **Tauri Build**: First build is slower; subsequent builds cached via Turbo

### Dependencies Between Packages

- `@meetkey/plugin` depends on `@meetkey/shared`
- `@meetkey/browser-extension` depends on `@meetkey/shared`
- `@meetkey/service` depends on `@meetkey/shared`
- All packages use workspace protocol to reference each other

## Version Control & Environment

### .gitignore
A comprehensive `.gitignore` is configured to exclude:
- Dependencies: `node_modules/`, `.pnpm-store/`
- Build outputs: `dist/`, `build/`, Rust `target/`
- Environment: `.env`, `.env.local`
- IDE: `.vscode/`, `.idea/`
- OS files: `.DS_Store`, `Thumbs.db`
- Temporary files: `*.swp`, `.cache/`, `.turbo/`

### pnpm-lock.yaml
The lock file is committed to ensure consistent dependency versions across all team members.
