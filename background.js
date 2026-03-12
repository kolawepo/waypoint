// background.js — Waypoint
// Tab awareness: scan AI tabs when user switches, save session snapshot

const AI_URLS = ['claude.ai', 'chatgpt.com', 'chat.openai.com'];

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
    if (isAI && tab.id !== activeInfo.tabId) {
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_SESSION' }, () => void chrome.runtime.lastError);
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CLEAR_AUTO_SESSION') chrome.storage.local.remove('waypointAutoSession');
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') console.log('[Waypoint] Installed.');
});
