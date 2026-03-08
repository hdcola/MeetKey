# MeetKey Monorepo 重构 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 将 MeetKey 项目从单一结构重构为 pnpm monorepo，建立 4 个相互协作的包。

**架构：** 使用 pnpm workspace 管理 4 个包（shared, plugin, browser-extension, service），共享根级配置和版本号。所有包通过 @meetkey 命名空间进行 scoped。

**技术栈：** pnpm, Vue 3, TypeScript, Vite (plugin), WXT (browser-extension), Tauri (service)

---

## 第一阶段：基础结构

### Task 1: 创建 pnpm 工作区配置

**文件：**

- Create: `pnpm-workspace.yaml`

**步骤 1: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

**步骤 2: 验证**

确认文件已创建：

```bash
ls -la pnpm-workspace.yaml
```

Expected: 文件存在

**步骤 3: 提交**

```bash
git add pnpm-workspace.yaml
git commit -m "feat: add pnpm workspace configuration"
```

---

### Task 2: 创建根 package.json

**文件：**

- Create: `package.json` (根目录，覆盖现有的)

**步骤 1: 创建根 package.json**

```json
{
  "name": "meetkey",
  "version": "0.1.0",
  "description": "MeetKey - Stream Dock and Browser integration for Google Meet control",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "format": "prettier . --write",
    "lint": "eslint .",
    "install": "pnpm i"
  },
  "devDependencies": {
    "eslint": "^8.56.0",
    "prettier": "^3.2.5",
    "typescript": "^5.3.3"
  }
}
```

**步骤 2: 验证**

```bash
cat package.json | grep -A 2 '"name"'
```

Expected: `"name": "meetkey"`

**步骤 3: 提交**

```bash
git add package.json
git commit -m "feat: create root package.json with workspace scripts"
```

---

### Task 3: 创建共享的 TypeScript 配置

**文件：**

- Create: `tsconfig.json`

**步骤 1: 创建根 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**步骤 2: 验证**

```bash
cat tsconfig.json | grep -A 3 '"compilerOptions"'
```

Expected: JSON 格式正确

**步骤 3: 提交**

```bash
git add tsconfig.json
git commit -m "feat: add root TypeScript configuration"
```

---

### Task 4: 创建 Prettier 配置

**文件：**

- Create: `prettier.config.js`

**步骤 1: 创建 prettier.config.js**

```javascript
export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  arrowParens: 'always',
  printWidth: 100,
  vueIndentScriptAndStyle: true,
};
```

**步骤 2: 验证**

```bash
cat prettier.config.js | head -5
```

Expected: JavaScript 代码正确

**步骤 3: 提交**

```bash
git add prettier.config.js
git commit -m "feat: add Prettier configuration"
```

---

### Task 5: 创建 ESLint 配置

**文件：**

- Create: `eslint.config.js`

**步骤 1: 创建 eslint.config.js**

```javascript
export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
```

**步骤 2: 验证**

```bash
cat eslint.config.js | head -5
```

Expected: JavaScript 代码正确

**步骤 3: 提交**

```bash
git add eslint.config.js
git commit -m "feat: add ESLint configuration"
```

---

### Task 6: 创建 packages 目录结构

**文件：**

- Create: `packages/` 目录

**步骤 1: 创建目录**

```bash
mkdir -p packages
```

**步骤 2: 验证**

```bash
ls -la packages/
```

Expected: 目录存在

**步骤 3: 创建 .gitkeep 占位符**

```bash
touch packages/.gitkeep
```

**步骤 4: 提交**

```bash
git add packages/.gitkeep
git commit -m "feat: create packages directory structure"
```

---

### Task 7: 移动 meetkey-plugin 到 packages/plugin

**文件：**

- Move: `meetkey-plugin/` → `packages/plugin/`

**步骤 1: 移动目录**

```bash
mv meetkey-plugin packages/plugin
```

**步骤 2: 验证**

```bash
ls -la packages/plugin/src/
```

Expected: plugin 的源文件存在

**步骤 3: 更新 plugin 目录中的 pnpm-lock.yaml**

```bash
rm -f packages/plugin/pnpm-lock.yaml
```

**步骤 4: 提交**

```bash
git add packages/plugin/
git rm -r meetkey-plugin
git commit -m "feat: move plugin to packages/plugin"
```

---

### Task 8: 更新 plugin 的 package.json

**文件：**

- Modify: `packages/plugin/package.json`

**步骤 1: 更新 package.json**

原内容：

```json
{
  "name": "vue",
  ...
}
```

新内容：

```json
{
  "name": "@meetkey/plugin",
  "type": "module",
  "scripts": {
    "dev": "node ./script/autofile.cjs dev && vite",
    "build": "vite build && node ./script/autofile.cjs"
  },
  "dependencies": {
    "pinia": "^2.1.7",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "@types/node": "^20.11.10",
    "@vitejs/plugin-vue": "^5.0.4",
    "autoprefixer": "^10.4.20",
    "fs-extra": "^11.2.0",
    "naive-ui": "^2.38.1",
    "postcss": "^8.4.44",
    "prettier": "^3.2.5",
    "sass": "^1.71.1",
    "tailwindcss": "^3.4.10",
    "unplugin-auto-import": "^0.17.5",
    "vite": "^5.1.5",
    "vite-plugin-singlefile": "^2.0.1"
  }
}
```

**步骤 2: 验证**

```bash
cat packages/plugin/package.json | grep '"name"'
```

Expected: `"name": "@meetkey/plugin"`

**步骤 3: 提交**

```bash
git add packages/plugin/package.json
git commit -m "feat: update plugin package.json with scoped name"
```

---

## 第二阶段：共享库

### Task 9: 创建 @meetkey/shared 包结构

**文件：**

- Create: `packages/shared/`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/`

**步骤 1: 创建目录**

```bash
mkdir -p packages/shared/src/{types,protocol,utils}
```

**步骤 2: 验证**

```bash
ls -la packages/shared/src/
```

Expected: types, protocol, utils 目录存在

**步骤 3: 提交**

```bash
git add packages/shared/
git commit -m "feat: create shared package structure"
```

---

### Task 10: 创建 shared 的 package.json

**文件：**

- Create: `packages/shared/package.json`

**步骤 1: 创建 package.json**

```json
{
  "name": "@meetkey/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./protocol": {
      "import": "./dist/protocol/index.js",
      "types": "./dist/protocol/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "workspace:*"
  }
}
```

**步骤 2: 验证**

```bash
cat packages/shared/package.json | grep '"name"'
```

Expected: `"name": "@meetkey/shared"`

**步骤 3: 提交**

```bash
git add packages/shared/package.json
git commit -m "feat: create shared package.json with exports"
```

---

### Task 11: 创建 shared 的 TypeScript 配置

**文件：**

- Create: `packages/shared/tsconfig.json`

**步骤 1: 创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**步骤 2: 验证**

```bash
cat packages/shared/tsconfig.json | grep '"extends"'
```

Expected: 继承根 tsconfig

**步骤 3: 提交**

```bash
git add packages/shared/tsconfig.json
git commit -m "feat: create shared tsconfig.json"
```

---

### Task 12: 创建 shared 类型定义文件

**文件：**

- Create: `packages/shared/src/types/index.ts`

**步骤 1: 创建基础类型定义**

```typescript
/**
 * WebSocket 消息类型定义
 */

export type MessageType = 'ping' | 'pong' | 'action' | 'event' | 'error' | 'ack';

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  payload?: unknown;
}

export interface ActionMessage extends WebSocketMessage {
  type: 'action';
  payload: {
    actionId: string;
    params?: Record<string, unknown>;
  };
}

export interface EventMessage extends WebSocketMessage {
  type: 'event';
  payload: {
    eventType: string;
    data?: Record<string, unknown>;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

// Google Meet 相关类型
export interface MeetAction {
  id: string;
  name: string;
  description: string;
  category: 'audio' | 'video' | 'chat' | 'screen' | 'other';
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'macos' | 'windows';
}
```

**步骤 2: 验证**

```bash
cat packages/shared/src/types/index.ts | head -20
```

Expected: TypeScript 代码正确

**步骤 3: 提交**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add WebSocket message types"
```

---

### Task 13: 创建 shared 通信协议文件

**文件：**

- Create: `packages/shared/src/protocol/index.ts`

**步骤 1: 创建协议定义**

```typescript
/**
 * WebSocket 通信协议
 */

import type {
  WebSocketMessage,
  ActionMessage,
  EventMessage,
  ErrorMessage,
} from '../types/index.js';

export class MessageBuilder {
  static createActionMessage(
    id: string,
    actionId: string,
    params?: Record<string, unknown>
  ): ActionMessage {
    return {
      id,
      type: 'action',
      timestamp: Date.now(),
      payload: {
        actionId,
        params,
      },
    };
  }

  static createEventMessage(
    id: string,
    eventType: string,
    data?: Record<string, unknown>
  ): EventMessage {
    return {
      id,
      type: 'event',
      timestamp: Date.now(),
      payload: {
        eventType,
        data,
      },
    };
  }

  static createErrorMessage(id: string, code: string, message: string): ErrorMessage {
    return {
      id,
      type: 'error',
      timestamp: Date.now(),
      payload: {
        code,
        message,
      },
    };
  }
}

export function isValidMessage(data: unknown): data is WebSocketMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  return (
    typeof msg.id === 'string' && typeof msg.type === 'string' && typeof msg.timestamp === 'number'
  );
}
```

**步骤 2: 验证**

```bash
cat packages/shared/src/protocol/index.ts | head -20
```

Expected: TypeScript 代码正确

**步骤 3: 提交**

```bash
git add packages/shared/src/protocol/index.ts
git commit -m "feat: add WebSocket protocol builders"
```

---

### Task 14: 创建 shared 索引文件

**文件：**

- Create: `packages/shared/src/index.ts`

**步骤 1: 创建索引**

```typescript
/**
 * @meetkey/shared - Shared types and utilities
 */

export * from './types/index.js';
export * from './protocol/index.js';
```

**步骤 2: 验证**

```bash
cat packages/shared/src/index.ts
```

Expected: 文件内容正确

**步骤 3: 提交**

```bash
git add packages/shared/src/index.ts
git commit -m "feat: add shared package index"
```

---

### Task 15: 更新 plugin 依赖 shared

**文件：**

- Modify: `packages/plugin/package.json`

**步骤 1: 更新依赖**

在 `dependencies` 中添加：

```json
"@meetkey/shared": "workspace:*"
```

结果：

```json
{
  "name": "@meetkey/plugin",
  "type": "module",
  "scripts": {
    "dev": "node ./script/autofile.cjs dev && vite",
    "build": "vite build && node ./script/autofile.cjs"
  },
  "dependencies": {
    "@meetkey/shared": "workspace:*",
    "pinia": "^2.1.7",
    "vue": "^3.4.21"
  },
  ...
}
```

**步骤 2: 验证**

```bash
cat packages/plugin/package.json | grep -A 5 '"dependencies"'
```

Expected: `@meetkey/shared` 在依赖列表中

**步骤 3: 提交**

```bash
git add packages/plugin/package.json
git commit -m "feat: add @meetkey/shared dependency to plugin"
```

---

## 第三阶段：新包框架

### Task 16: 创建 browser-extension 基础框架

**文件：**

- Create: `packages/browser-extension/package.json`
- Create: `packages/browser-extension/wxt.config.ts`
- Create: `packages/browser-extension/tsconfig.json`
- Create: `packages/browser-extension/src/` 结构

**步骤 1: 创建目录**

```bash
mkdir -p packages/browser-extension/src/{entrypoints,components}
```

**步骤 2: 创建 package.json**

```json
{
  "name": "@meetkey/browser-extension",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "pack": "wxt build --zip"
  },
  "dependencies": {
    "@meetkey/shared": "workspace:*",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "@wxt-dev/auto-icons": "^0.3.3",
    "wxt": "^0.20.4"
  }
}
```

**步骤 3: 创建 wxt.config.ts**

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/auto-icons'],
  manifest: {
    name: 'MeetKey - Google Meet Controller',
    description: 'Control Google Meet from your browser',
    permissions: ['activeTab', 'scripting', 'storage'],
  },
});
```

**步骤 4: 创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**步骤 5: 创建基础 manifest.json**

```json
{
  "manifest_version": 3,
  "name": "MeetKey",
  "version": "0.1.0",
  "description": "Control Google Meet with one-click actions"
}
```

**步骤 6: 验证**

```bash
ls -la packages/browser-extension/
```

Expected: 文件结构正确

**步骤 7: 提交**

```bash
git add packages/browser-extension/
git commit -m "feat: create browser-extension package framework"
```

---

### Task 17: 创建 service (Tauri) 基础框架

**文件：**

- Create: `packages/service/package.json`
- Create: `packages/service/tsconfig.json`
- Create: `packages/service/src-tauri/Cargo.toml`
- Create: `packages/service/src/` 结构

**步骤 1: 创建目录**

```bash
mkdir -p packages/service/src-tauri/src
mkdir -p packages/service/src
```

**步骤 2: 创建 package.json**

```json
{
  "name": "@meetkey/service",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build"
  },
  "dependencies": {
    "@meetkey/shared": "workspace:*",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^1.5.0",
    "@tauri-apps/api": "^1.5.0"
  }
}
```

**步骤 3: 创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**步骤 4: 创建 Cargo.toml (基础)**

```toml
[package]
name = "meetkey-service"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = "1.5"

[dependencies]
tauri = "1.5"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.20"
uuid = { version = "1", features = ["v4", "serde"] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

**步骤 5: 创建 src-tauri/src/main.rs (基础)**

```rust
// Prevents additional console window on Windows
#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

**步骤 6: 创建 src/App.vue (基础)**

```vue
<script setup lang="ts">
  import { ref } from 'vue';

  const message = ref('MeetKey Service');
</script>

<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold">{{ message }}</h1>
    <p class="text-gray-600">Central service for MeetKey</p>
  </div>
</template>

<style scoped></style>
```

**步骤 7: 验证**

```bash
ls -la packages/service/
```

Expected: 文件结构正确

**步骤 8: 提交**

```bash
git add packages/service/
git commit -m "feat: create service (Tauri) package framework"
```

---

## 第四阶段：整合和验证

### Task 18: 安装 pnpm 依赖

**步骤 1: 移除旧的 lock 文件**

```bash
rm -f pnpm-lock.yaml
```

**步骤 2: 安装依赖**

```bash
pnpm install
```

Expected: 所有包的依赖都被正确安装

**步骤 3: 验证工作区**

```bash
pnpm list
```

Expected: 显示所有 4 个包的树形结构

**步骤 4: 提交**

```bash
git add pnpm-lock.yaml
git commit -m "feat: install dependencies for monorepo"
```

---

### Task 19: 验证构建

**步骤 1: 构建 shared**

```bash
cd packages/shared
pnpm build
```

Expected: `packages/shared/dist/` 目录生成

**步骤 2: 构建 plugin**

```bash
cd packages/plugin
pnpm build
```

Expected: `packages/plugin/dist/` 目录生成

**步骤 3: 验证产物**

```bash
ls -la packages/plugin/dist/
```

Expected: 构建产物存在

**步骤 4: 返回根目录**

```bash
cd ../..
```

**步骤 5: 提交**

```bash
git add .
git commit -m "feat: verify monorepo builds successfully"
```

---

### Task 20: 更新 README 和文档

**文件：**

- Modify: `README.md`
- Modify: `CLAUDE.md`

**步骤 1: 更新 README**

````markdown
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
````

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

````

**步骤 2: 更新 CLAUDE.md**

在 CLAUDE.md 的末尾添加：

```markdown

## Monorepo 结构（2025-03-05 更新）

现在项目是一个 pnpm monorepo，包含 4 个包：

### 包结构

````

packages/
├── shared/ # 共享库（类型、协议）
├── plugin/ # Stream Deck 插件
├── browser-extension/ # 浏览器插件 (WXT)
└── service/ # 中心服务 (Tauri)

````

### 常用命令

所有命令都在根目录运行：

```bash
pnpm dev                 # 并行启动所有包
pnpm build              # 构建所有包
pnpm format             # 格式化全部代码
````

### 单个包开发

```bash
cd packages/service
pnpm dev                # 仅启动 service 包
```

### 内部依赖

使用 workspace 协议引用：

```json
{
  "dependencies": {
    "@meetkey/shared": "workspace:*"
  }
}
```

````

**步骤 3: 验证**

```bash
cat README.md | head -20
````

Expected: 内容更新正确

**步骤 4: 提交**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update documentation for monorepo structure"
```

---

## 验收标准

✅ 所有 4 个包都可通过 `pnpm dev` 启动  
✅ `@meetkey/shared` 可被其他包正确导入  
✅ `pnpm build` 能构建所有包  
✅ 代码格式化和检查通过  
✅ Git 历史清晰，每个逻辑单位一个提交  
✅ 文档更新完整

---

## 下一步

1. 实现 `@meetkey/service` 中的 WebSocket server（Rust）
2. 实现 `@meetkey/browser-extension` 的基础功能
3. 将 plugin 与 service 连接
4. 添加集成测试
