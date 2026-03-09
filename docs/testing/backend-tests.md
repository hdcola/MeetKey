# Backend Tests - Rust WebSocket Server

## Overview

Backend tests for `packages/center/src-tauri/src/websocket.rs` use Rust's built-in testing infrastructure with `#[tokio::test]` macro for async code. Phase 1 focuses on unit tests covering data structures, state management, and message handling.

## Running Tests

### Run all backend tests

```bash
cd packages/center/src-tauri
cargo test --lib
```

### Run specific test

```bash
cargo test --lib test_websocket_server_new
```

### Run with output

```bash
cargo test --lib -- --nocapture
```

## Coverage

Check coverage with tarpaulin:

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --lib --out Stdout
```

## Test Organization

44 unit tests organized in #[cfg(test)] module in websocket.rs:

**Phase 1: Unit Tests (44 tests)**

- **Server initialization** (3 tests): `test_websocket_server_*`
- **State management** (6 tests): `test_update_state`, `test_concurrent_state_reads`, etc.
- **Message parsing** (10 tests): `test_websocket_message_*`, `test_device_status_*`
- **Message builders** (6 tests): `test_message_builder_*`
- **Broadcast channels** (3 tests): `test_broadcast_*`
- **Message routing** (10 tests): `test_handle_*`, `test_registration_*`, `test_message_type_routing`
- **Integration scenarios** (6 tests): `test_multiple_clients_register_sequence`, etc.

## Mock Strategy

Simple hand-written mocks, no external libraries:

- `MockWebSocketStream` - simulates WebSocket I/O
- `TestMessageBuilder` - constructs valid/invalid test messages
- Direct state mutation testing with Arc<Mutex<T>>

## Coverage Status

**Phase 1 (Current):**

- 44 tests passing
- Unit test coverage: Data structures, message parsing, state management
- Production code coverage: 8.41% (expected - async I/O not covered in Phase 1)
- All tests use sync/async patterns that compile and run reliably

**Phase 2 (Future):**

- Integration tests with real TCP connections
- Full async handler testing
- Target: >80% production code coverage
- Requires socket-level mocking

## Why Limited Coverage in Phase 1

Rust async I/O code (WebSocket server, connection handlers) is difficult to unit test because:

1. Requires mocking of low-level TcpStream/socket APIs
2. Async executor behavior is complex to simulate
3. Message protocol state machines need full socket simulation

Phase 1 focuses on testing what CAN be unit tested (data structures, pure functions, synchronous logic). Phase 2 will add integration tests for the async components.

## Best Practices

- Each test is isolated and independent
- Tests use broadcast channels to verify message routing
- Concurrent operations tested with tokio::spawn
- JSON serialization round-trip tests verify message format
- All error cases included (invalid JSON, missing fields)

## Future: Integration Tests

Phase 2 will add:

- Real TCP/WebSocket connection simulation
- Full handle_connection function testing
- Multi-client concurrent scenarios
- Connection lifecycle testing
- Network error simulation

## CI Integration

Tests run on every commit:

```bash
cargo test --lib
```
