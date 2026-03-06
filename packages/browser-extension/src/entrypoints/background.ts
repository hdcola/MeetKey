/**
 * Background Script - 处理扩展事件和权限
 */

console.log('[MeetKey] Background script loaded');

// 监听扩展安装
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[MeetKey] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // 打开欢迎页面
    chrome.tabs.create({ url: 'welcome.html' });
  }
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[MeetKey] Message received:', request);
  sendResponse({ status: 'ok' });
});
