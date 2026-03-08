# Rust Backend Testing Design

**Date**: 2026-03-08  
**Status**: Approved  
**Target Coverage**: >80% (matching frontend coverage goal)

## Overview

Add comprehensive unit tests for the Rust WebSocket backend (`packages/center/src-tauri/src/websocket.rs`) using simple mocks and standard Rust testing infrastructure. Integration tests will be added later.

## Current State

- **Frontend tests**: ✅ 66 tests passing, 88.83% coverage
- **Backend tests**: ❌ None (0% coverage)
- **Key components**: WebSocketServer, connection handling, message routing

## Testing Strategy

### Test Approach

- **Framework**: Standard Rust `#[cfg(test)]` modules with `#[tokio::test]` macro
- **Mock Strategy**: Hand-written simple mock structs (no `mockito`/`mockall`)
- **Phase 1**: Unit tests with mocks (this phase)
- **Phase 2**: Integration tests with real connections (future)

### Test Scope

#### Core Functions to Test (High Priority)

1. **WebSocketServer::new()** - Initialization and setup
2. **WebSocketServer::get_state()** - Read current device state
3. **WebSocketServer::update_state()** - Modify state, verify concurrency safety
4. **handle_connection() - register** - Client registration, role extraction
5. **handle_connection() - state-update** - State updates and broadcasting
6. **handle_connection() - state-query** - Query and response flow
7. **handle_connection() - errors** - Malformed JSON, connection close, ping/pong

#### Test Scenarios by Message Type

**Register Message**

- ✅ Plugin/Extension client registration succeeds
- ✅ Center UI registration (special case, no confirmation)
- ✅ Confirmation sent back to registering client
- ✅ Broadcast sent to other clients
- ✅ Invalid payload handling

**State Update Message**

- ✅ Update microphone state
- ✅ Update camera state
- ✅ Update both states
- ✅ Broadcast to all subscribed clients
- ✅ Invalid state format handling

**State Query Message**

- ✅ Return current state
- ✅ Respond with correct message ID
- ✅ Handle when state is unknown/empty

**Error Cases**

- ✅ Malformed JSON parsing
- ✅ Missing required fields
- ✅ Connection close/disconnect
- ✅ Ping/Pong message handling

### Mock Components

**MockTcpStream**

- Simulates TCP socket read/write
- Can inject test data
- Can simulate connection drops

**MockWebSocketStream**

- Wraps MockTcpStream
- Simulates WebSocket framing
- Can verify sent messages

**TestMessageBuilder**

- Helper to construct valid WebSocket messages
- Generates register, state-update, state-query messages
- Creates invalid messages for error testing

### Coverage Targets

| Metric     | Target |
| ---------- | ------ |
| Statements | >80%   |
| Branches   | >75%   |
| Functions  | >90%   |

## Architecture

### Test File Organization

```
packages/center/src-tauri/src/
├── main.rs                    (unchanged)
├── websocket.rs               (production code)
└── websocket_tests.rs         (all tests - inline in websocket.rs)
```

Tests will be added as inline `#[cfg(test)]` modules within `websocket.rs` to keep related code together.

### Test Dependencies

Add to `Cargo.toml`:

```toml
[dev-dependencies]
tokio = { version = "1", features = ["full", "rt"] }
```

All other dependencies already exist in the main `[dependencies]` section.

## Test Flow

1. **Setup Phase**: Create mock WebSocketServer and client streams
2. **Action Phase**: Send test messages, trigger handlers
3. **Verification Phase**: Assert state changes, message broadcasts, responses

## Success Criteria

- ✅ All tests pass
- ✅ Coverage metrics meet targets (>80% statements)
- ✅ Tests run in CI/CD pipeline
- ✅ Tests complete in <5 seconds total
- ✅ No flaky tests (async race conditions handled)

## Future Phases

**Phase 2: Integration Tests**

- Real TCP connections
- Real WebSocket protocol
- Multiple concurrent clients
- Connection stability scenarios

**Phase 3: E2E Tests**

- Full backend + frontend communication flow
- Realistic client registration → state sync → disconnect

## Notes

- Use `tokio::sync::Mutex` for shared state (already in code)
- Broadcast channel testing requires careful `tokio::select!` handling
- Timestamp generation in tests should be mocked or acceptable variance
- No external WebSocket server dependency needed (all mocked)
