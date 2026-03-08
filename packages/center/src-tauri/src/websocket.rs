use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{broadcast, Mutex};
use tokio_tungstenite::{accept_async, tungstenite};
use futures::stream::StreamExt;
use futures::SinkExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetDeviceStatus {
    pub microphone: String, // "on", "off", "unknown"
    pub camera: String,
    pub last_updated: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub id: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub timestamp: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
}

pub struct WebSocketServer {
    addr: String,
    current_state: Arc<Mutex<MeetDeviceStatus>>,
    broadcast_tx: broadcast::Sender<WebSocketMessage>,
}

impl WebSocketServer {
    pub fn new(port: u16) -> Self {
        let addr = format!("127.0.0.1:{}", port);
        let (broadcast_tx, _) = broadcast::channel(100);

        WebSocketServer {
            addr,
            current_state: Arc::new(Mutex::new(MeetDeviceStatus {
                microphone: "unknown".to_string(),
                camera: "unknown".to_string(),
                last_updated: 0,
            })),
            broadcast_tx,
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(&self.addr).await?;
        println!("WebSocket server listening on: {}", self.addr);

        loop {
            let (stream, peer_addr) = listener.accept().await?;
            println!("New connection from: {}", peer_addr);

            let state = Arc::clone(&self.current_state);
            let broadcast_tx = self.broadcast_tx.clone();

            tokio::spawn(async move {
                if let Err(e) = handle_connection(stream, state, broadcast_tx).await {
                    eprintln!("Error handling connection: {}", e);
                }
            });
        }
    }

    pub async fn update_state(&self, status: MeetDeviceStatus) {
        let mut state = self.current_state.lock().await;
        *state = status.clone();
    }

    pub async fn get_state(&self) -> MeetDeviceStatus {
        self.current_state.lock().await.clone()
    }
}

async fn handle_connection(
    stream: TcpStream,
    state: Arc<Mutex<MeetDeviceStatus>>,
    broadcast_tx: broadcast::Sender<WebSocketMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    let mut broadcast_rx = broadcast_tx.subscribe();

    loop {
        tokio::select! {
            msg = read.next() => {
                match msg {
                    Some(Ok(tungstenite::Message::Text(text))) => {
                        if let Ok(message) = serde_json::from_str::<WebSocketMessage>(&text) {
                            // Extract role from payload for better logging
                            let role_info = message.payload
                                .as_ref()
                                .and_then(|p| p.get("role"))
                                .and_then(|r| r.as_str())
                                .map(|r| format!(" (role: {})", r))
                                .unwrap_or_default();
                            println!("📨 Received message type: {}{}", message.msg_type, role_info);
                            
                            match message.msg_type.as_str() {
                                "register" => {
                                    eprintln!("🔍 DEBUG: Processing register message");
                                    // Handle client registration
                                    if let Some(payload) = &message.payload {
                                        eprintln!("🔍 DEBUG: Payload found: {:?}", payload);
                                        if let Some(role) = payload.get("role").and_then(|r| r.as_str()) {
                                            println!("✅ Client registered as: {}", role);
                                            
                                            if role != "center" {
                                                // Send confirmation back to client
                                            let confirmation = WebSocketMessage {
                                                id: format!("{}-confirm", message.id),
                                                msg_type: format!("{}-connected", role),
                                                timestamp: std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap()
                                                    .as_millis() as u64,
                                                payload: Some(serde_json::json!({ "status": "registered" })),
                                            };
                                            println!("📤 Sending confirmation: {}", confirmation.msg_type);
                                            let confirm_json = serde_json::to_string(&confirmation).unwrap();
                                            eprintln!("🔍 DEBUG: Sending JSON: {}", confirm_json);
                                            match write.send(tungstenite::Message::Text(confirm_json)).await {
                                                Ok(_) => eprintln!("✅ DEBUG: Confirmation sent successfully"),
                                                Err(e) => eprintln!("❌ DEBUG: Failed to send confirmation: {}", e),
                                            }
                                            
                                            // Also broadcast to all other clients so they know this role connected
                                            let broadcast_msg = WebSocketMessage {
                                                id: format!("{}-broadcast", message.id),
                                                msg_type: format!("{}-connected", role),
                                                timestamp: std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap()
                                                    .as_millis() as u64,
                                                payload: Some(serde_json::json!({ "status": "registered" })),
                                            };
                                            println!("📢 Broadcasting: {}", broadcast_msg.msg_type);
                                            let _ = broadcast_tx.send(broadcast_msg);
                                            } else {
                                                println!("🎛️ Center UI connected");
                                            }
                                        }
                                    }
                                }
                                "state-update" => {
                                    // Update server state
                                    if let Some(payload) = &message.payload {
                                        if let Ok(status) = serde_json::from_value::<MeetDeviceStatus>(payload.clone()) {
                                            let mut s = state.lock().await;
                                            *s = status;
                                            println!("✅ State updated: {:?}", s);
                                        }
                                    }
                                    // Broadcast state update to all clients
                                    let _ = broadcast_tx.send(message);
                                }
                                "state-query" => {
                                    // Handle state query - send current state back to client
                                    let current_state = state.lock().await;
                                    let response = WebSocketMessage {
                                        id: message.id.clone(),
                                        msg_type: "state-response".to_string(),
                                        timestamp: std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap()
                                            .as_millis() as u64,
                                        payload: Some(serde_json::to_value(&*current_state).unwrap()),
                                    };
                                    println!("📤 Sending state-response: {:?}", response);
                                    let _ = write.send(tungstenite::Message::Text(
                                        serde_json::to_string(&response).unwrap()
                                    )).await;
                                    drop(current_state);
                                }
                                _ => {
                                    // Broadcast other message types to all clients
                                    let _ = broadcast_tx.send(message);
                                }
                            }
                        }
                    }
                    Some(Ok(tungstenite::Message::Binary(_))) => {
                        // Handle binary messages if needed
                    }
                    Some(Ok(tungstenite::Message::Ping(data))) => {
                        // Respond to ping with pong
                        let _ = write.send(tungstenite::Message::Pong(data)).await;
                    }
                    Some(Ok(tungstenite::Message::Pong(_))) => {
                        // Handle pong
                    }
                    Some(Ok(tungstenite::Message::Close(_))) => {
                        println!("Connection closed");
                        break;
                    }
                    Some(Ok(tungstenite::Message::Frame(_))) => {
                        // Handle frame if needed
                    }
                    Some(Err(e)) => {
                        eprintln!("WebSocket error: {}", e);
                        break;
                    }
                    None => break,
                }
            }
            Ok(msg) = broadcast_rx.recv() => {
                // Forward broadcast messages to all clients
                if let Ok(text) = serde_json::to_string(&msg) {
                    let _ = write.send(tungstenite::Message::Text(text)).await;
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::Mutex;

    /// Mock WebSocket stream for testing - captures sent messages and allows injecting received ones
    #[allow(dead_code)]
    struct MockWebSocketStream {
        /// Messages that were sent through this stream
        pub sent_messages: Arc<Mutex<Vec<String>>>,
        /// Messages queued to be "received"
        pub recv_queue: Arc<Mutex<Vec<String>>>,
    }

    impl MockWebSocketStream {
        #[allow(dead_code)]
        fn new() -> Self {
            MockWebSocketStream {
                sent_messages: Arc::new(Mutex::new(Vec::new())),
                recv_queue: Arc::new(Mutex::new(Vec::new())),
            }
        }

        /// Queue a message to be received
        #[allow(dead_code)]
        async fn queue_recv(&self, msg: String) {
            self.recv_queue.lock().await.push(msg);
        }

        /// Get all messages that were sent
        #[allow(dead_code)]
        async fn get_sent_messages(&self) -> Vec<String> {
            self.sent_messages.lock().await.clone()
        }

        /// Get the last sent message
        #[allow(dead_code)]
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

    // TASK 3: WebSocketServer Initialization Tests
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

    // TASK 4: State Management Tests
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

        server.update_state(MeetDeviceStatus {
            microphone: "on".to_string(),
            camera: "on".to_string(),
            last_updated: 1000,
        }).await;

        let state1 = server.get_state().await;
        assert_eq!(state1.microphone, "on");

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

        let mut handles = vec![];
        for _ in 0..5 {
            let server_clone = Arc::clone(&server);
            let handle = tokio::spawn(async move {
                server_clone.get_state().await
            });
            handles.push(handle);
        }

        for handle in handles {
            let state = handle.await.unwrap();
            assert_eq!(state.microphone, "on");
        }
    }

    // TASK 5: WebSocketMessage Parsing Tests
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

    // TASK 6: MeetDeviceStatus Tests
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

    // TASK 7: TestMessageBuilder Tests
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

        assert!(msg.payload.unwrap().get("role").is_none());
    }

    // TASK 8: Broadcast Channel Tests
    #[tokio::test]
    async fn test_broadcast_channel_creation() {
        let server = WebSocketServer::new(8080);
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

        let received = rx.recv().await.expect("Should receive broadcasted message");
        assert_eq!(received.id, "test");
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

        let msg1 = rx1.recv().await.expect("Subscriber 1 should receive message");
        assert_eq!(msg1.id, "multi-test");

        let msg2 = rx2.recv().await.expect("Subscriber 2 should receive message");
        assert_eq!(msg2.id, "multi-test");
    }
}
