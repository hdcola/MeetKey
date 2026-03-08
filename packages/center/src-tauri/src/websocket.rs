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
