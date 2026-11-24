// Background service worker for Savedly
console.log('Savedly: Background Worker Started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Savedly: Extension Installed');
  chrome.storage.local.set({ bulkMode: true });
});

// Handle messages if needed
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'HEARTBEAT') {
    sendResponse({ status: 'alive' });
  }
});
