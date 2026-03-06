use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::accept_async;
use futures::stream::StreamExt;

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

    pub fn update_state(&self, status: MeetDeviceStatus) {
        if let Ok(mut state) = self.current_state.lock() {
            *state = status.clone();
        }
    }

    pub fn get_state(&self) -> MeetDeviceStatus {
        self.current_state.lock().unwrap().clone()
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
                            match message.msg_type.as_str() {
                                "state-update" => {
                                    // Update server state
                                    if let Some(payload) = &message.payload {
                                        if let Ok(status) = serde_json::from_value::<MeetDeviceStatus>(payload.clone()) {
                                            if let Ok(mut s) = state.lock() {
                                                *s = status;
                                            }
                                        }
                                    }
                                    // Broadcast state update to all clients
                                    let _ = broadcast_tx.send(message);
                                }
                                _ => {
                                    // Echo other message types
                                    let _ = broadcast_tx.send(message);
                                }
                            }
                        }
                    }
                    Some(Ok(tungstenite::Message::Close(_))) => {
                        println!("Connection closed");
                        break;
                    }
                    Some(Err(e)) => {
                        eprintln!("WebSocket error: {}", e);
                        break;
                    }
                    None => break,
                }
            }
            _ = broadcast_rx.recv() => {
                // Forward broadcast messages to client if needed
            }
        }
    }

    Ok(())
}
