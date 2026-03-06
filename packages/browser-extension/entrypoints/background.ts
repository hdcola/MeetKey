export default defineBackground(() => {
  console.log('[bg] Background script loaded');

  // Initialize WebSocket connection to the service
  let ws: WebSocket | null = null;

  const connectToService = () => {
    try {
      ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        console.log('[bg] Connected to service');
      };

      ws.onmessage = (event) => {
        console.log('[bg] Message from service:', event.data);
      };

      ws.onerror = (error) => {
        console.error('[bg] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[bg] Disconnected from service');
        // Attempt to reconnect after 3 seconds
        setTimeout(connectToService, 3000);
      };
    } catch (error) {
      console.error('[bg] Failed to connect to service:', error);
    }
  };

  connectToService();

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[bg] Message from content script:', request);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(request));
    }
    sendResponse({ received: true });
  });
});
