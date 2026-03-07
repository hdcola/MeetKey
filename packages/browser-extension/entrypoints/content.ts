export default defineContentScript({
  matches: ['*://*.meet.google.com/*'],
  world: 'MAIN',
  async main(ctx) {
    console.log('[content] Injecting MeetKey into Google Meet');

    // Send a message to the background script to establish connection
    browser.runtime.sendMessage({
      type: 'page_loaded',
      url: window.location.href,
    });
  },
});
