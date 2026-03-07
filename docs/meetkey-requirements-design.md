# MeetKey 产品需求与设计文档

**日期：** 2026-03-05  
**作者：** Claude Code + User  
**状态：** 已批准

---

## 1. 产品概览

**产品名：** MeetKey  
**Tagline：** 一键控制 Google Meet —— 通过 Stream Dock 硬件或系统工具栏

**核心价值：**

- **Stream Dock 用户**：硬件快捷控制（类似 Elgato Zoom 插件）
- **普通用户**：系统工具栏快速控制（无需硬件）

---

## 2. 目标用户与使用场景

### 用户群体

1. **Stream Dock 硬件用户** - 专业主播、内容创作者、会议频繁的工作者
   - 希望一键快速控制 Google Meet（类似现有的 Zoom 插件）
   - 使用场景：直播、线上会议、远程教育

2. **普通 Chrome 用户** - 所有使用 Google Meet 的人
   - 希望在系统工具栏快速访问 Meet 控制
   - 使用场景：日常会议、快速调整设备状态

### 核心操作场景

- 快速静音/取消静音
- 快速打开/关闭摄像头
- 一键离开会议
- 发送快速反应（emoji）

---

## 3. 产品功能规范

### MVP 阶段（第一阶段）

**麦克风控制（3 个按钮）：**

- 🎤 **打开** - 静态图标，按下执行打开
- 🎤 **关闭** - 静态图标，按下执行关闭
- 🎤 **切换** - 动态图标，显示当前状态，按下切换

**摄像头控制（3 个按钮）：**

- 📹 **打开** - 静态图标，按下执行打开
- 📹 **关闭** - 静态图标，按下执行关闭
- 📹 **切换** - 动态图标，显示当前状态，按下切换

**支持的界面：**

- Stream Dock 硬件按钮（Plugin）
- macOS 系统工具栏（Service UI）
- Windows 系统托盘（Service UI）

### 后续功能阶段（第二、三阶段）

- 📹 **录制控制** - 开始/停止录制
- 📺 **分享屏幕** - 快速分享屏幕
- 👋 **离开/结束通话** - 离开会议或结束通话
- 😊 **快速反应** - 发送 emoji 表情
- 📊 **状态指示** - 当前参与者数、时长等

---

## 4. 系统架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       MeetKey 系统架构                       │
└─────────────────────────────────────────────────────────────┘

        使用方式 A: Stream Dock 硬件用户
                         │
              [Stream Deck 硬件按钮]
                         │
         Stream Deck Plugin (@meetkey/plugin)
                         │
                      WebSocket
                 (可配置端口，默认 8080)
                         │
    ┌──────────────────────────────────────┐
    │   Tauri Service (@meetkey/service)   │
    │                                      │
    │  核心职责：                         │
    │  • WebSocket 服务器                │
    │  • 中心状态管理                    │
    │  • 实时状态推送                    │
    │  • macOS 系统工具栏 UI             │
    │  • Windows 系统托盘 UI             │
    │  • 配置管理（端口、自启动）       │
    └──────────────────────────────────────┘
                         │
                      WebSocket
                         │
        Browser Extension (@meetkey/browser-extension)
                         │
        执行命令、同步状态到 Google Meet
                         │
                 [Google Meet 网页]

        使用方式 B: 普通用户（无硬件）
                         │
         macOS 工具栏 / Windows 托盘 UI
                         │
                      WebSocket
                         │
        Browser Extension (@meetkey/browser-extension)
                         │
                 [Google Meet 网页]
```

### 4.2 数据流向（实时状态同步 - 方案 C）

```
场景：用户在 Google Meet 网页上手动打开摄像头

1. Browser Extension 检测 Google Meet 状态变化
   ↓
2. Extension 向 Tauri Service 发送状态更新
   {
     "type": "state-update",
     "state": {
       "microphone": "on",
       "camera": "on"
     }
   }
   ↓
3. Tauri Service 接收并存储状态
   ↓
4. Tauri Service 向已连接的所有客户端推送状态
   - Stream Dock Plugin
   - Service UI (macOS/Windows)
   ↓
5. Plugin 和 Service UI 实时更新显示
   - 动态按钮显示新状态
   - 工具栏图标更新
```

### 4.3 包结构和职责

| 包                             | 技术                           | 职责                                           |
| ------------------------------ | ------------------------------ | ---------------------------------------------- |
| **@meetkey/shared**            | TypeScript                     | 共享类型定义、WebSocket 协议、消息构建器       |
| **@meetkey/plugin**            | Vue 3 + Vite + Stream Dock SDK | 处理硬件按钮事件，发送命令到服务               |
| **@meetkey/browser-extension** | Vue 3 + WXT                    | 注入脚本到 Google Meet，执行控制命令，同步状态 |
| **@meetkey/service**           | Tauri (Rust + Vue 3)           | WebSocket 服务器、状态管理、系统 UI            |

---

## 5. 技术栈选择

### 5.1 各层技术栈

| 层               | 技术                              | 理由                                           |
| ---------------- | --------------------------------- | ---------------------------------------------- |
| **UI 框架**      | Vue 3 + TypeScript                | 现有基础，与 Plugin/Extension 保持一致         |
| **Build 工具**   | Vite (Plugin) / WXT (Extension)   | 现有配置，支持快速开发和热更新                 |
| **Desktop 框架** | Tauri                             | 轻量级、跨平台（macOS/Windows）、Rust 后端强大 |
| **通信**         | WebSocket + JSON                  | 实时双向、低延迟、跨平台兼容                   |
| **状态管理**     | Pinia (Plugin) + Service 中心状态 | 集中式状态管理，易于同步                       |
| **样式**         | Tailwind CSS + Naive UI           | 现有配置，高效开发                             |

### 5.2 国际化和平台

- **语言**：中文（简体）+ English
- **平台**：Windows + macOS
- **浏览器**：Chrome（优先），后续支持 Edge / Firefox（通过 WXT）
- **不支持**：移动端、Safari

---

## 6. 关键设计决策

### 6.1 为什么 Tauri Service 既是服务器又是 UI？

**决策：** Service 本身提供 macOS 工具栏和 Windows 托盘 UI

**理由：**

1. **职责清晰** - Service 是中心枢纽，提供 UI 是自然延伸
2. **易于分层开发** - Browser Extension 保持专注（只控制 Meet），Service 负责用户交互和状态管理
3. **易于 debug** - 各层可独立测试和改进
4. **扩展灵活** - 后续可添加其他客户端（移动应用等），都通过 Service 通信

### 6.2 为什么使用 WebSocket（方案 C）而不是 HTTP？

**决策：** 使用 WebSocket 实时推送状态（方案 C），而非轮询拉取（方案 B）

**理由：**

1. **实时反馈** - 动态按钮立即更新状态
2. **低延迟** - 用户体验更好
3. **双向通信** - Plugin 既能发送命令，也能接收状态
4. **扩展性** - 后续易于添加事件驱动功能

### 6.3 按钮设计（打开/关闭/切换）

**决策：** 提供 3 种按钮选择

**理由：**

1. **灵活性** - 用户可根据工作流选择
2. **清晰性** - 明确的操作意图（打开、关闭、切换）
3. **易用性** - 动态按钮显示当前状态，减少误操作

---

## 7. 配置与部署

### 7.1 用户配置项

**Service 配置文件（JSON）：**

```json
{
  "websocket": {
    "port": 8080,
    "host": "127.0.0.1"
  },
  "autostart": {
    "enabled": false,
    "platform": "macos"
  },
  "ui": {
    "theme": "auto",
    "language": "zh_CN"
  }
}
```

**可配置项：**

- WebSocket 端口（默认 8080，用户可自定义以避免冲突）
- 开机自启（用户可选）
- 语言和主题

### 7.2 安装和启动

**流程：**

1. 用户从应用商店或官网下载 MeetKey
2. 安装 Tauri Service（自动后台运行或用户手动启动）
3. 安装 Browser Extension（Chrome Web Store）
4. 可选：安装 Stream Deck Plugin（Stream Deck 应用市场）
5. Service 自动检测 Extension 连接，建立通信

---

## 8. 开发阶段规划

### 第一阶段：MVP 基座

- **时间**：2-3 周
- **目标**：完成基础框架和麦克风/摄像头控制
- **任务**：
  1. 定义 WebSocket 通信协议（@meetkey/shared）
  2. 开发 Tauri Service WebSocket 服务器
  3. 开发 Browser Extension 控制脚本
  4. 开发 Stream Deck Plugin 基础按钮
  5. 整合和测试

### 第二阶段：完善和扩展

- **时间**：2-3 周
- **目标**：完善 UI、添加配置面板、多浏览器支持
- **任务**：
  1. macOS 系统工具栏 UI
  2. Windows 系统托盘 UI
  3. 配置面板（端口、自启动）
  4. Edge / Firefox 支持

### 第三阶段：后续功能

- **时间**：1-2 周 / 功能
- **目标**：添加录制、分享屏幕、emoji 等功能
- **任务**：
  1. 录制控制
  2. 分享屏幕
  3. 离开/结束通话
  4. 快速反应（emoji）

---

## 9. 成功标准

### MVP 验收标准

✅ **功能完整性**

- 麦克风打开/关闭/切换按钮可用
- 摄像头打开/关闭/切换按钮可用
- 所有按钮都能正确控制 Google Meet

✅ **状态同步**

- 动态按钮实时显示当前状态
- Plugin 和 Service UI 状态一致
- 延迟 < 500ms

✅ **跨平台支持**

- Windows 和 macOS 均可运行
- Chrome 浏览器扩展正常工作

✅ **用户体验**

- Stream Dock 硬件按钮响应迅速
- 系统工具栏/托盘 UI 直观易用
- 无需复杂配置即可使用

✅ **国际化**

- 中英文界面完整
- i18n 系统正确切换语言

### 后续版本目标

- 多浏览器支持（Edge/Firefox）
- 配置面板完善
- 后续功能（录制、分享屏幕等）

---

## 10. 风险与缓解

| 风险                 | 影响             | 缓解方案                        |
| -------------------- | ---------------- | ------------------------------- |
| Google Meet API 变化 | 功能失效         | 使用 DOM 注入而非 API，定期测试 |
| WebSocket 连接不稳定 | 状态同步延迟     | 实现重连机制、心跳检测          |
| 端口冲突             | Service 启动失败 | 提供端口配置，自动尝试备用端口  |
| 浏览器扩展权限限制   | 无法注入脚本     | 获取必要权限，明确向用户说明    |

---

## 11. 后续考虑

### 未来扩展方向

1. **多设备支持** - 一个 Service 连接多个 Plugin 或设备
2. **预设方案** - 保存和快速切换常用设置
3. **快捷组合** - 一键执行多个命令（如"进入演讲模式"）
4. **其他应用** - 扩展到 Zoom、Teams 等其他视频会议工具
5. **移动应用** - iOS/Android 客户端

### 社区和反馈

- 收集用户反馈
- 定期更新功能
- 开源社区贡献

---

## 12. 文件和资源

### 现有资源

- 项目结构：pnpm monorepo（4 个包）
- 代码库：Vue 3 + TypeScript + Tauri 框架已搭建
- 文档：CLAUDE.md（开发指南）

### 相关文档

- [MeetKey Monorepo 重构设计](./plans/2025-03-05-monorepo-restructure-design.md)
- [MeetKey Monorepo 重构实现计划](./plans/2025-03-05-monorepo-restructure-implementation.md)
- [Stream Dock SDK](https://sdk.key123.vip/guide/architecture.html)

---

## 13. 批准记录

| 角色        | 日期       | 意见      |
| ----------- | ---------- | --------- |
| 用户        | 2026-03-05 | ✅ 已批准 |
| Claude Code | 2026-03-05 | ✅ 已批准 |

---
