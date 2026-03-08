# MeetKey Monorepo 重构设计文档

**日期：** 2025-03-05  
**作者：** Claude Code  
**状态：** 已批准

## 1. 概述

将 MeetKey 项目从单一结构重构为 **pnpm monorepo**，支持多个相互关联的应用：Stream Deck 插件、浏览器插件和中心服务程序。

## 2. 项目目标

- 建立清晰的包结构，便于多个应用的协作开发
- 统一的代码风格和工具配置
- 共享数据模型和类型定义
- 中心服务程序（Tauri）作为 WebSocket 服务器，连接各个插件

## 3. 最终架构

### 3.1 包结构

```
meetkey/
├── pnpm-workspace.yaml
├── package.json                  # 根 package.json
├── tsconfig.json                 # 基础 TypeScript 配置
├── prettier.config.js            # 代码格式化配置
├── eslint.config.js              # 代码检查配置
├── CLAUDE.md
│
├── packages/
│   ├── shared/                   # 共享库 (@meetkey/shared)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/            # 消息、事件类型定义
│   │   │   ├── protocol/         # WebSocket 通信协议
│   │   │   └── utils/
│   │   └── tsconfig.json
│   │
│   ├── plugin/                   # Stream Deck 插件 (@meetkey/plugin)
│   │   ├── package.json
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── manifest.cjs
│   │
│   ├── browser-extension/        # 浏览器插件 (@meetkey/browser-extension)
│   │   ├── package.json
│   │   ├── wxt.config.ts
│   │   ├── src/
│   │   └── tsconfig.json
│   │
│   └── service/                  # Tauri 中心服务 (@meetkey/service)
│       ├── package.json
│       ├── src-tauri/
│       │   ├── Cargo.toml
│       │   └── src/
│       │       ├── main.rs
│       │       ├── websocket.rs
│       │       └── installer.rs
│       ├── src/                  # Vue 前端
│       │   ├── App.vue
│       │   └── main.ts
│       └── tsconfig.json
│
└── docs/
    └── architecture.md
```

### 3.2 包职责

| 包                           | 技术栈                    | 职责                                   |
| ---------------------------- | ------------------------- | -------------------------------------- |
| `@meetkey/shared`            | TypeScript                | 共享类型定义、消息协议、工具函数       |
| `@meetkey/plugin`            | Vue 3 + TypeScript + Vite | Stream Deck 插件（button/action 处理） |
| `@meetkey/browser-extension` | Vue 3 + TypeScript + WXT  | 浏览器扩展（Google Meet 控制）         |
| `@meetkey/service`           | Tauri + Rust + Vue 3      | 中心服务（WebSocket server、插件安装） |

## 4. 关键设计决策

### 4.1 Pnpm Monorepo

**选择理由：**

- Workspace 支持高效的内部依赖管理
- 节省磁盘空间（共享 node_modules）
- 支持并行构建和开发

### 4.2 Scoped Packages (@meetkey/\*)

**选择理由：**

- 清晰的命名空间
- 避免命名冲突
- 最佳实践

### 4.3 根目录共享配置

**共享项目：**

- `tsconfig.json` - 基础 TypeScript 配置，各包继承
- `prettier.config.js` - 代码格式化规则
- `eslint.config.js` - 代码检查规则

**好处：**

- 保持代码风格统一
- 减少重复配置
- 便于维护

### 4.4 联合版本号管理

**策略：**

- 所有包共享同一版本号
- 更新时统一升级

**优点：**

- 简化发布流程
- 明确的发布周期
- 便于追踪项目演进

### 4.5 通信架构

```
┌─────────────────┐       ┌──────────────────────┐
│ Stream Dock     │       │   Browser            │
│ Plugin          │◄──────┤   Extension          │
└────────┬────────┘  WS   └──────────┬───────────┘
         │                           │
         └───────────────┬───────────┘
                         │
                    WebSocket
                    Client
                         │
         ┌───────────────▼───────────────┐
         │                               │
         │  @meetkey/service (Tauri)     │
         │                               │
         │  ┌─────────────────────────┐  │
         │  │ WebSocket Server        │  │
         │  │ (Rust - tokio-tungstenite)│ │
         │  └─────────────────────────┘  │
         │                               │
         │  ┌─────────────────────────┐  │
         │  │ Plugin Installer        │  │
         │  │ (Stream Deck + Browser) │  │
         │  └─────────────────────────┘  │
         │                               │
         └───────────────────────────────┘
```

**特点：**

- 中心服务作为 WebSocket 服务器
- 两个插件作为客户端连接
- 共享 `@meetkey/shared` 定义消息协议
- Rust 后端处理 WebSocket 和系统集成

## 5. 开发工作流

### 5.1 安装依赖

```bash
cd meetkey
pnpm install
```

### 5.2 本地开发

**启动所有包的开发服务：**

```bash
pnpm dev
```

**启动单个包：**

```bash
cd packages/service
pnpm dev
```

### 5.3 代码格式化

```bash
pnpm format              # 格式化整个项目
```

### 5.4 构建

```bash
pnpm build               # 构建所有包

# 单个包构建
cd packages/plugin && pnpm build
cd packages/service && pnpm build
```

## 6. 构建产物

| 包                           | 产物                       | 位置                                         |
| ---------------------------- | -------------------------- | -------------------------------------------- |
| `@meetkey/plugin`            | `.sdPlugin` 目录           | `packages/plugin/dist/`                      |
| `@meetkey/browser-extension` | 浏览器扩展包               | `packages/browser-extension/dist/`           |
| `@meetkey/service`           | 可执行程序 (.exe/.dmg)     | `packages/service/src-tauri/target/release/` |
| `@meetkey/shared`            | JavaScript/TypeScript 模块 | `packages/shared/dist/`                      |

## 7. 迁移路径

### 7.1 第一阶段：基础结构

1. 创建根 `package.json` 和 `pnpm-workspace.yaml`
2. 创建共享配置文件
3. 将 `meetkey-plugin` 移到 `packages/plugin`
4. 调整依赖和路径

### 7.2 第二阶段：共享库

1. 创建 `packages/shared` 包
2. 提取共享类型定义和通信协议
3. 更新现有包的依赖

### 7.3 第三阶段：新包

1. 创建 `packages/browser-extension` 框架（使用 WXT）
2. 创建 `packages/service` 框架（Tauri）
3. 集成 WebSocket 通信

## 8. 成功标准

- ✅ 所有包可通过 `pnpm dev` 并行启动
- ✅ 共享包可被其他包正确引入
- ✅ 代码格式和风格统一
- ✅ 版本号管理清晰
- ✅ 构建产物生成正确

## 9. 后续考虑

- 集成 Turbo 加速构建缓存
- 添加集成测试
- CI/CD 流程自动化
- 文档站点生成
