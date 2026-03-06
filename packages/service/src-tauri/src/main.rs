// Prevents additional console window on Windows
#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod websocket;

use websocket::WebSocketServer;
use std::sync::Arc;

fn main() {
  // Create and start WebSocket server in background
  let ws_server = Arc::new(WebSocketServer::new(8080));
  let ws_clone = Arc::clone(&ws_server);

  std::thread::spawn(move || {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
      if let Err(e) = ws_clone.start().await {
        eprintln!("WebSocket server error: {}", e);
      }
    });
  });

  // Start Tauri application
  tauri::Builder::default()
    .setup(|_app| {
      println!("Tauri application started");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
