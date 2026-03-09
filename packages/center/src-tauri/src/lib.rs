pub mod websocket;

use std::sync::Arc;
use websocket::WebSocketServer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .plugin(tauri_plugin_shell::init())
        .manage(ws_server)
        .setup(|_app| {
            println!("Tauri application started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
