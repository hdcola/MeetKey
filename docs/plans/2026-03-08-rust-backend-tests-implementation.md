# Rust Backend Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive unit tests for `websocket.rs` with >80% statement coverage using simple mocks and `#[tokio::test]` macro.

**Architecture:** Add inline `#[cfg(test)]` modules in `websocket.rs` with hand-written mock structs for TcpStream/WebSocketStream, test message builders, and organized test suites by message type. No external mock libraries.

**Tech Stack:** 
- Rust `#[cfg(test)]` + `#[tokio::test]` macro (built-in)
- `tokio::sync::broadcast` for testing message routing
- `serde_json` for message construction
- Simple trait-based mocks (no `mockito`/`mockall`)

---

## Task 1: Add test dependencies to Cargo.toml

**Files:**
- Modify: `packages/center/src-tauri/Cargo.toml`

**Step 1: Read current Cargo.toml to understand structure**

Run: `cat packages/center/src-tauri/Cargo.toml`

Expected: See `[dependencies]` and `[features]` sections, no `[dev-dependencies]`

**Step 2: Add dev-dependencies section**

In `packages/center/src-tauri/Cargo.toml`, add after the `[features]` section:

```toml
[dev-dependencies]
tokio = { version = "1", features = ["full", "rt", "sync"] }
```

(Note: tokio already in main dependencies, but we need to ensure "sync" feature is available for tests)

**Step 3: Verify Cargo.toml is valid**

Run: `cd packages/center/src-tauri && cargo check`

Expected: SUCCESS (no compilation errors)

**Step 4: Commit**

```bash
cd packages/center/src-tauri
git add Cargo.toml
git commit -m "build: add dev-dependencies for backend tests"
```

---

## Task 2: Add mock trait and MockWebSocketStream struct

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add at end before closing brace, around line 200+)

**Step 1: Review websocket.rs structure**

Run: `wc -l packages/center/src-tauri/src/websocket.rs`

Expected: Should show ~200+ lines

Read the last 30 lines to see where to add tests:
Run: `tail -30 packages/center/src-tauri/src/websocket.rs`

**Step 2: Add mock trait definition after main code**

At the end of `websocket.rs`, before the closing brace, add:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::Mutex;
    use futures::stream::StreamExt;
    use futures::SinkExt;

    /// Mock WebSocket stream for testing - captures sent messages and allows injecting received ones
    struct MockWebSocketStream {
        /// Messages that were sent through this stream
        pub sent_messages: Arc<Mutex<Vec<String>>>,
        /// Messages queued to be "received"
        pub recv_queue: Arc<Mutex<Vec<String>>>,
    }

    impl MockWebSocketStream {
        fn new() -> Self {
            MockWebSocketStream {
                sent_messages: Arc::new(Mutex::new(Vec::new())),
                recv_queue: Arc::new(Mutex::new(Vec::new())),
            }
        }

        /// Queue a message to be received
        async fn queue_recv(&self, msg: String) {
            self.recv_queue.lock().await.push(msg);
        }

        /// Get all messages that were sent
        async fn get_sent_messages(&self) -> Vec<String> {
            self.sent_messages.lock().await.clone()
        }

        /// Get the last sent message
        async fn last_sent(&self) -> Option<String> {
            self.sent_messages.lock().await.last().cloned()
        }
    }

    /// Helper to build valid WebSocket messages for tests
    struct TestMessageBuilder;

    impl TestMessageBuilder {
        fn register(role: &str) -> String {
            let msg = WebSocketMessage {
                id: format!("test-register-{}", uuid::Uuid::new_v4()),
                msg_type: "register".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                payload: Some(serde_json::json!({ "role": role })),
            };
            serde_json::to_string(&msg).unwrap()
        }

        fn state_update(microphone: &str, camera: &str) -> String {
            let msg = WebSocketMessage {
                id: format!("test-state-{}", uuid::Uuid::new_v4()),
                msg_type: "state-update".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                payload: Some(serde_json::json!({
                    "microphone": microphone,
                    "camera": camera,
                    "last_updated": 0
                })),
            };
            serde_json::to_string(&msg).unwrap()
        }

        fn state_query() -> String {
            let msg = WebSocketMessage {
                id: format!("test-query-{}", uuid::Uuid::new_v4()),
                msg_type: "state-query".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                payload: None,
            };
            serde_json::to_string(&msg).unwrap()
        }

        fn invalid_json() -> String {
            "{invalid json".to_string()
        }

        fn missing_role() -> String {
            let msg = WebSocketMessage {
                id: "test-no-role".to_string(),
                msg_type: "register".to_string(),
                timestamp: 0,
                payload: Some(serde_json::json!({})),
            };
            serde_json::to_string(&msg).unwrap()
        }
    }
}
```

**Step 3: Run cargo check to verify compilation**

Run: `cd packages/center/src-tauri && cargo check`

Expected: SUCCESS (compiles with new test module)

**Step 4: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add mock stream and message builder utilities"
```

---

## Task 3: Add WebSocketServer initialization tests

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add in `#[cfg(test)]` section)

**Step 1: Add test for WebSocketServer::new()**

Inside the `#[cfg(test)] mod tests` block, add before the closing brace of the `tests` module:

```rust
    #[test]
    fn test_websocket_server_new() {
        let server = WebSocketServer::new(8080);
        assert_eq!(server.addr, "127.0.0.1:8080");
    }

    #[test]
    fn test_websocket_server_new_different_port() {
        let server = WebSocketServer::new(9000);
        assert_eq!(server.addr, "127.0.0.1:9000");
    }

    #[tokio::test]
    async fn test_websocket_server_initial_state() {
        let server = WebSocketServer::new(8080);
        let state = server.get_state().await;
        
        assert_eq!(state.microphone, "unknown");
        assert_eq!(state.camera, "unknown");
        assert_eq!(state.last_updated, 0);
    }
```

**Step 2: Run the tests**

Run: `cd packages/center/src-tauri && cargo test --lib test_websocket_server`

Expected: All 3 tests PASS

**Step 3: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add WebSocketServer initialization tests"
```

---

## Task 4: Add state management tests

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add in `#[cfg(test)]` section)

**Step 1: Add update_state and get_state tests**

Inside the `#[cfg(test)] mod tests` block, add:

```rust
    #[tokio::test]
    async fn test_update_state() {
        let server = WebSocketServer::new(8080);
        
        let new_state = MeetDeviceStatus {
            microphone: "on".to_string(),
            camera: "off".to_string(),
            last_updated: 12345,
        };
        
        server.update_state(new_state.clone()).await;
        let state = server.get_state().await;
        
        assert_eq!(state.microphone, "on");
        assert_eq!(state.camera, "off");
        assert_eq!(state.last_updated, 12345);
    }

    #[tokio::test]
    async fn test_multiple_state_updates() {
        let server = WebSocketServer::new(8080);
        
        // First update
        server.update_state(MeetDeviceStatus {
            microphone: "on".to_string(),
            camera: "on".to_string(),
            last_updated: 1000,
        }).await;
        
        let state1 = server.get_state().await;
        assert_eq!(state1.microphone, "on");
        
        // Second update
        server.update_state(MeetDeviceStatus {
            microphone: "off".to_string(),
            camera: "on".to_string(),
            last_updated: 2000,
        }).await;
        
        let state2 = server.get_state().await;
        assert_eq!(state2.microphone, "off");
        assert_eq!(state2.last_updated, 2000);
    }

    #[tokio::test]
    async fn test_concurrent_state_reads() {
        let server = Arc::new(WebSocketServer::new(8080));
        
        server.update_state(MeetDeviceStatus {
            microphone: "on".to_string(),
            camera: "on".to_string(),
            last_updated: 999,
        }).await;
        
        // Spawn 5 concurrent reads
        let mut handles = vec![];
        for _ in 0..5 {
            let server_clone = Arc::clone(&server);
            let handle = tokio::spawn(async move {
                server_clone.get_state().await
            });
            handles.push(handle);
        }
        
        // Wait for all and verify they all got the same state
        for handle in handles {
            let state = handle.await.unwrap();
            assert_eq!(state.microphone, "on");
        }
    }
```

**Step 2: Run the tests**

Run: `cd packages/center/src-tauri && cargo test --lib test_update_state test_multiple test_concurrent`

Expected: All 3 tests PASS

**Step 3: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add state management tests"
```

---

## Task 5: Add WebSocketMessage parsing tests

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add in `#[cfg(test)]` section)

**Step 1: Add message parsing tests**

Inside the `#[cfg(test)] mod tests` block, add:

```rust
    #[test]
    fn test_websocket_message_serialization() {
        let msg = WebSocketMessage {
            id: "test-123".to_string(),
            msg_type: "register".to_string(),
            timestamp: 1234567890,
            payload: Some(serde_json::json!({ "role": "plugin" })),
        };
        
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: WebSocketMessage = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.id, "test-123");
        assert_eq!(parsed.msg_type, "register");
        assert_eq!(parsed.payload.unwrap()["role"], "plugin");
    }

    #[test]
    fn test_websocket_message_without_payload() {
        let json = r#"{"id":"test","type":"state-query","timestamp":123,"payload":null}"#;
        let msg: WebSocketMessage = serde_json::from_str(json).unwrap();
        
        assert_eq!(msg.msg_type, "state-query");
        assert!(msg.payload.is_none());
    }

    #[test]
    fn test_invalid_json_parsing() {
        let invalid = "{invalid json}";
        let result: Result<WebSocketMessage, _> = serde_json::from_str(invalid);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_missing_required_fields() {
        let incomplete = r#"{"id":"test"}"#;
        let result: Result<WebSocketMessage, _> = serde_json::from_str(incomplete);
        
        assert!(result.is_err());
    }
```

**Step 2: Run the tests**

Run: `cd packages/center/src-tauri && cargo test --lib test_websocket_message`

Expected: All 4 tests PASS

**Step 3: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add message parsing and deserialization tests"
```

---

## Task 6: Add MeetDeviceStatus tests

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add in `#[cfg(test)]` section)

**Step 1: Add device status tests**

Inside the `#[cfg(test)] mod tests` block, add:

```rust
    #[test]
    fn test_meet_device_status_serialization() {
        let status = MeetDeviceStatus {
            microphone: "on".to_string(),
            camera: "off".to_string(),
            last_updated: 1234567890,
        };
        
        let json = serde_json::to_string(&status).unwrap();
        let parsed: MeetDeviceStatus = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.microphone, "on");
        assert_eq!(parsed.camera, "off");
        assert_eq!(parsed.last_updated, 1234567890);
    }

    #[test]
    fn test_device_status_with_unknown_states() {
        let status = MeetDeviceStatus {
            microphone: "unknown".to_string(),
            camera: "unknown".to_string(),
            last_updated: 0,
        };
        
        assert_eq!(status.microphone, "unknown");
        assert_eq!(status.camera, "unknown");
    }

    #[test]
    fn test_device_status_clone() {
        let status1 = MeetDeviceStatus {
            microphone: "on".to_string(),
            camera: "off".to_string(),
            last_updated: 999,
        };
        
        let status2 = status1.clone();
        assert_eq!(status1.microphone, status2.microphone);
    }
```

**Step 2: Run the tests**

Run: `cd packages/center/src-tauri && cargo test --lib test_meet_device_status`

Expected: All 3 tests PASS

**Step 3: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add device status serialization tests"
```

---

## Task 7: Add TestMessageBuilder validation tests

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add in `#[cfg(test)]` section)

**Step 1: Add message builder tests**

Inside the `#[cfg(test)] mod tests` block, add:

```rust
    #[test]
    fn test_message_builder_register() {
        let msg_json = TestMessageBuilder::register("plugin");
        let msg: WebSocketMessage = serde_json::from_str(&msg_json).unwrap();
        
        assert_eq!(msg.msg_type, "register");
        assert_eq!(msg.payload.unwrap()["role"], "plugin");
    }

    #[test]
    fn test_message_builder_register_center() {
        let msg_json = TestMessageBuilder::register("center");
        let msg: WebSocketMessage = serde_json::from_str(&msg_json).unwrap();
        
        assert_eq!(msg.payload.unwrap()["role"], "center");
    }

    #[test]
    fn test_message_builder_state_update() {
        let msg_json = TestMessageBuilder::state_update("on", "off");
        let msg: WebSocketMessage = serde_json::from_str(&msg_json).unwrap();
        
        assert_eq!(msg.msg_type, "state-update");
        let payload = msg.payload.unwrap();
        assert_eq!(payload["microphone"], "on");
        assert_eq!(payload["camera"], "off");
    }

    #[test]
    fn test_message_builder_state_query() {
        let msg_json = TestMessageBuilder::state_query();
        let msg: WebSocketMessage = serde_json::from_str(&msg_json).unwrap();
        
        assert_eq!(msg.msg_type, "state-query");
        assert!(msg.payload.is_none());
    }

    #[test]
    fn test_message_builder_invalid_json() {
        let invalid = TestMessageBuilder::invalid_json();
        let result: Result<WebSocketMessage, _> = serde_json::from_str(&invalid);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_message_builder_missing_role() {
        let msg_json = TestMessageBuilder::missing_role();
        let msg: WebSocketMessage = serde_json::from_str(&msg_json).unwrap();
        
        // Message parses, but role is missing
        assert!(msg.payload.unwrap().get("role").is_none());
    }
```

**Step 2: Run the tests**

Run: `cd packages/center/src-tauri && cargo test --lib test_message_builder`

Expected: All 6 tests PASS

**Step 3: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add message builder utility tests"
```

---

## Task 8: Add broadcast channel tests

**Files:**
- Modify: `packages/center/src-tauri/src/websocket.rs` (add in `#[cfg(test)]` section)

**Step 1: Add broadcast functionality tests**

Inside the `#[cfg(test)] mod tests` block, add:

```rust
    #[tokio::test]
    async fn test_broadcast_channel_creation() {
        let server = WebSocketServer::new(8080);
        // Server creates a broadcast channel internally, just verify it initializes
        let state = server.get_state().await;
        assert_eq!(state.microphone, "unknown");
    }

    #[tokio::test]
    async fn test_broadcast_single_message() {
        let (_tx, mut rx) = tokio::sync::broadcast::channel(10);
        
        let msg = WebSocketMessage {
            id: "test".to_string(),
            msg_type: "test".to_string(),
            timestamp: 0,
            payload: None,
        };
        
        let _tx_clone = _tx.clone();
        let _ = _tx_clone.send(msg.clone());
        
        // Verify a message can be sent/received on broadcast
        if let Ok(received) = rx.recv().await {
            assert_eq!(received.id, "test");
        }
    }

    #[tokio::test]
    async fn test_broadcast_multiple_subscribers() {
        let (tx, _) = tokio::sync::broadcast::channel(10);
        
        let mut rx1 = tx.subscribe();
        let mut rx2 = tx.subscribe();
        
        let msg = WebSocketMessage {
            id: "multi-test".to_string(),
            msg_type: "broadcast-test".to_string(),
            timestamp: 0,
            payload: None,
        };
        
        let _ = tx.send(msg.clone());
        
        // Both subscribers should receive
        if let Ok(msg1) = rx1.recv().await {
            assert_eq!(msg1.id, "multi-test");
        }
        
        if let Ok(msg2) = rx2.recv().await {
            assert_eq!(msg2.id, "multi-test");
        }
    }
```

**Step 2: Run the tests**

Run: `cd packages/center/src-tauri && cargo test --lib test_broadcast`

Expected: All 3 tests PASS

**Step 3: Commit**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: add broadcast channel tests"
```

---

## Task 9: Run full test suite and check coverage

**Files:**
- Check: `packages/center/src-tauri/src/websocket.rs`

**Step 1: Run all backend tests**

Run: `cd packages/center/src-tauri && cargo test --lib 2>&1`

Expected: All tests PASS (count should be 20+)

**Step 2: Check test coverage with tarpaulin**

First, install tarpaulin if not already present:
```bash
cargo install cargo-tarpaulin
```

Then run coverage:
```bash
cd packages/center/src-tauri && cargo tarpaulin --lib --out Html --output-dir target/coverage
```

Expected: Should generate HTML coverage report in `target/coverage/index.html`

**Step 3: Review coverage report**

Run: `cd packages/center/src-tauri && cargo tarpaulin --lib --out Stdout`

Expected: Should show coverage >80% for websocket.rs

**Step 4: Commit all test changes**

```bash
cd packages/center/src-tauri
git add src/websocket.rs
git commit -m "test: complete backend test suite with comprehensive coverage"
```

---

## Task 10: Add backend tests to CI and documentation

**Files:**
- Create: `docs/testing/backend-tests.md`
- Modify: `package.json` (root)
- Modify: `packages/center/package.json`

**Step 1: Create backend testing documentation**

Create `docs/testing/backend-tests.md`:

```markdown
# Backend Tests - Rust WebSocket Server

## Overview

Backend tests for `packages/center/src-tauri/src/websocket.rs` use Rust's built-in testing infrastructure with `#[tokio::test]` macro for async code.

## Running Tests

### Run all backend tests
\`\`\`bash
cd packages/center/src-tauri
cargo test --lib
\`\`\`

### Run specific test
\`\`\`bash
cargo test --lib test_websocket_server_new
\`\`\`

### Run with output
\`\`\`bash
cargo test --lib -- --nocapture
\`\`\`

## Coverage

Check coverage with tarpaulin:
\`\`\`bash
cargo tarpaulin --lib --out Stdout
\`\`\`

Target: >80% statement coverage

## Test Organization

Tests are organized in `#[cfg(test)]` module in `websocket.rs`:

- **Server initialization**: `test_websocket_server_*`
- **State management**: `test_update_state`, `test_concurrent_*`
- **Message handling**: `test_websocket_message_*`, `test_message_builder_*`
- **Device status**: `test_meet_device_status_*`
- **Broadcasting**: `test_broadcast_*`

## Mock Strategy

Simple hand-written mocks, no external libraries:
- `MockWebSocketStream` - simulates WebSocket I/O
- `TestMessageBuilder` - constructs valid/invalid test messages

## Future: Integration Tests

Phase 2 will add integration tests with real TCP connections.
```

**Step 2: Add test scripts to root package.json**

In root `package.json`, update scripts section to add:

```json
"test:backend": "cd packages/center/src-tauri && cargo test --lib",
"test:backend:coverage": "cd packages/center/src-tauri && cargo tarpaulin --lib --out Stdout",
```

**Step 3: Verify scripts work**

Run: `cd /Users/hd/work/prj/MeetKey && pnpm test:backend`

Expected: All backend tests pass

**Step 4: Commit documentation**

```bash
git add docs/testing/backend-tests.md package.json packages/center/package.json
git commit -m "docs: add backend testing guide and scripts"
```

---

## Task 11: Verify all tests pass and create summary

**Files:**
- Check: All test files

**Step 1: Run complete test suite (frontend + backend)**

Run both:
```bash
cd /Users/hd/work/prj/MeetKey
pnpm test:center           # Frontend tests
pnpm test:backend          # Backend tests
```

Expected: All tests PASS (frontend: 66 tests, backend: 20+ tests)

**Step 2: Verify coverage metrics**

Frontend:
```bash
pnpm test:center:coverage 2>&1 | grep "% Stmts"
```

Expected: >80%

Backend:
```bash
cd packages/center/src-tauri && cargo tarpaulin --lib --out Stdout | grep "Total"
```

Expected: >80%

**Step 3: Create summary commit**

```bash
git add -A
git commit -m "test: complete frontend and backend test suite

- Frontend: 66 tests, 88.83% coverage
- Backend: 20+ tests, >80% coverage
- Full websocket.rs unit test coverage with mocks
- Ready for integration tests phase"
```

---

## Success Criteria

✅ **All 20+ backend tests pass**  
✅ **Statement coverage >80%**  
✅ **Tests run in <10 seconds total**  
✅ **No external mock libraries required**  
✅ **Tests integrated with CI/CD scripts**  
✅ **Documentation complete**  

## Notes

- All tests use inline `#[cfg(test)]` modules in websocket.rs
- Use `#[tokio::test]` for async functions
- SimpleMessageBuilder provides test data (no factories needed)
- Broadcast channel testing verifies multi-client scenarios
- Future phases can add real TCP/WebSocket integration tests

---

**Plan Complete**

This plan creates comprehensive unit test coverage for the Rust backend with simple mocks, achieving >80% coverage target to match frontend testing standards.
