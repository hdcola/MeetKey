# MeetKey Center 单元测试指南

本文档说明如何运行和编写 Center 的单元测试。

## 快速命令参考

| 命令 | 模式 | 说明 |
|------|------|------|
| `pnpm test` | 一次性 | 运行测试后退出 |
| `pnpm test:watch` | 监听 | 文件改变时自动重新运行 |
| `pnpm test:coverage` | 一次性 | 生成覆盖率报告并退出 |
| `pnpm test:ui` | 交互式 | 在浏览器 UI 中查看测试 |

**TDD 开发流程推荐：**
```bash
# 终端 1：启动开发服务
pnpm dev

# 终端 2：监听模式（会在文件改变时自动运行）
pnpm test:watch
```

---

## 快速开始

### 安装依赖

```bash
cd packages/center
pnpm install
```

### 运行所有测试

```bash
# 运行所有测试一次后退出（CI/CD 推荐）
pnpm test

# 监听模式（开发时使用，文件改变时自动重新运行）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 使用 UI 界面运行测试（交互式）
pnpm test:ui
```

**注意：** 使用 `pnpm test` 会自动添加 `--run` 标志，确保测试运行完后立即退出，不会进入 watch 模式。

## 测试结构

```
packages/center/src/
├── services/
│   └── __tests__/
│       └── websocketService.test.ts        # WebSocket 服务测试
├── stores/
│   └── __tests__/
│       └── centerStore.test.ts             # Pinia Store 测试
├── components/
│   └── __tests__/
│       ├── ConnectionStatus.test.ts        # 连接状态组件测试
│       └── MicrophoneButton.test.ts        # 麦克风按钮测试
└── __tests__/
    └── integration.test.ts                  # 集成测试
```

## 测试覆盖范围

### 1. WebSocket 服务测试 (`websocketService.test.ts`)

**测试内容：**
- ✅ WebSocket 连接和初始化
- ✅ 消息接收和解析
- ✅ 状态更新同步
- ✅ 消息发送（toggle 命令）
- ✅ 自动重连机制
- ✅ 错误处理

**关键测试：**
```typescript
// 测试连接后注册为 center
it('连接打开时应该注册为 center', () => {
  service.connect()
  mockWs.simulateOpen()
  
  expect(service['send']).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'register',
      payload: { role: 'center' }
    })
  )
})

// 测试接收状态更新
it('应该处理 state-update 消息', () => {
  mockWs.simulateMessage({
    type: 'state-update',
    payload: { microphone: 'on', camera: 'off' }
  })
  
  expect(store.isMicrophoneOn).toBe(true)
  expect(store.isCameraOn).toBe(false)
})
```

### 2. Pinia Store 测试 (`centerStore.test.ts`)

**测试内容：**
- ✅ 初始状态设置
- ✅ 设备状态更新（麦克风/摄像头）
- ✅ 连接状态管理
- ✅ 计算属性（isMicrophoneOn, isCameraOn）
- ✅ 状态独立性

**关键测试：**
```typescript
// 测试计算属性
it('应该正确计算 isMicrophoneOn', () => {
  store.setMicrophoneState('on')
  expect(store.isMicrophoneOn).toBe(true)
  
  store.setMicrophoneState('off')
  expect(store.isMicrophoneOn).toBe(false)
})

// 测试状态独立性
it('应该独立管理所有状态', () => {
  store.setMicrophoneState('on')
  store.setCameraState('off')
  store.setPluginConnection('connected')
  store.setBrowserConnection('disconnected')
  
  expect(store.microphone).toBe('on')
  expect(store.camera).toBe('off')
  expect(store.pluginConnection).toBe('connected')
  expect(store.browserConnection).toBe('disconnected')
})
```

### 3. 组件测试 (`ConnectionStatus.test.ts`, `MicrophoneButton.test.ts`)

**测试内容：**
- ✅ 组件渲染
- ✅ 状态绑定和响应
- ✅ CSS 类动态应用
- ✅ 用户交互（点击）
- ✅ 视觉反馈动画

**关键测试：**
```typescript
// 测试状态响应
it('应该响应 Browser 连接状态变化', async () => {
  const store = useCenterStore()
  const wrapper = mount(ConnectionStatus)
  
  store.setBrowserConnection('connected')
  await wrapper.vm.$nextTick()
  
  expect(wrapper.find('.status-item').classes()).toContain('connected')
})

// 测试点击交互
it('点击按钮时应该有按压效果', async () => {
  const wrapper = mount(MicrophoneButton)
  const button = wrapper.find('button')
  
  await button.trigger('click')
  expect(button.classes()).toContain('pressing')
})
```

### 4. 集成测试 (`integration.test.ts`)

**测试场景：**
- ✅ 完整的连接流程（Plugin/Extension）
- ✅ 多客户端同时连接
- ✅ 设备状态与连接状态的交互
- ✅ 真实场景模拟
  - 用户按下麦克风按钮
  - 用户在 Google Meet 中打开摄像头
  - 网络断开重连

## 写测试的最佳实践

### 1. 测试命名规范

```typescript
describe('ComponentName', () => {
  describe('功能分类', () => {
    it('应该正确处理某个具体场景', () => {
      // 测试代码
    })
  })
})
```

### 2. AAA 模式（Arrange, Act, Assert）

```typescript
it('应该更新状态', () => {
  // Arrange - 设置初始状态
  const store = useCenterStore()
  store.setMicrophoneState('off')
  
  // Act - 执行操作
  store.setMicrophoneState('on')
  
  // Assert - 验证结果
  expect(store.isMicrophoneOn).toBe(true)
})
```

### 3. 模拟外部依赖

```typescript
import { vi } from 'vitest'

// 模拟 WebSocket 服务
vi.mock('@/services/websocketService', () => ({
  wsService: {
    toggleMicrophone: vi.fn(),
  }
}))

// 模拟浏览器 API
global.WebSocket = MockWebSocket as any
```

### 4. 异步测试

```typescript
// 处理异步状态更新
it('应该响应异步操作', async () => {
  store.setMicrophoneState('on')
  await wrapper.vm.$nextTick()  // 等待 Vue 更新
  
  expect(wrapper.find('button').classes()).toContain('active')
})
```

## 测试覆盖率目标

| 文件 | 目标 | 当前 |
|------|------|------|
| `websocketService.ts` | > 90% | 📊 待测 |
| `centerStore.ts` | > 95% | 📊 待测 |
| `ConnectionStatus.vue` | > 85% | 📊 待测 |
| `MicrophoneButton.vue` | > 85% | 📊 待测 |

## CI/CD 集成

### 在 GitHub Actions 中运行测试

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

## 调试技巧

### 1. 使用 `.only` 单独运行某个测试

```typescript
it.only('应该处理某个场景', () => {
  // 这个测试会单独运行
})
```

### 2. 跳过某个测试

```typescript
it.skip('暂时跳过的测试', () => {
  // 这个测试会被跳过
})
```

### 3. 在 VS Code 中调试

安装 Vitest 扩展，然后点击测试行号旁的"Run" 或"Debug"。

### 4. 查看详细的测试输出

```bash
pnpm test -- --reporter=verbose
```

## 常见问题

### Q: 如何测试 WebSocket 消息？

A: 使用 `MockWebSocket` 类来模拟 WebSocket 连接和消息：

```typescript
service.connect()
mockWs.simulateOpen()
mockWs.simulateMessage({
  type: 'plugin-connected',
  payload: { status: 'registered' }
})
```

### Q: 如何测试 Vue 组件的响应式更新？

A: 使用 `await wrapper.vm.$nextTick()` 等待 Vue 更新 DOM：

```typescript
store.setBrowserConnection('connected')
await wrapper.vm.$nextTick()
expect(wrapper.find('.status-item').classes()).toContain('connected')
```

### Q: 如何模拟定时器？

A: 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTime()`：

```typescript
vi.useFakeTimers()
// 代码
vi.advanceTimersByTime(150)
await wrapper.vm.$nextTick()
vi.useRealTimers()
```

## 相关文档

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Pinia 测试指南](https://pinia.vuejs.org/cookbook/testing.html)

## 下一步

- ✅ 现有测试套件建立
- 📋 CI/CD 集成
- 📋 覆盖率目标设定（> 80%）
- 📋 E2E 测试（Cypress/Playwright）
