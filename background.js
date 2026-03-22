// background.js — Waypoint
// Scan AI tabs every 30 seconds + on tab switch

const AI_URLS = ['claude.ai', 'chatgpt.com', 'chat.openai.com'];

setInterval(scanAllAITabs, 30000);

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
    if (isAI && tab.id !== activeInfo.tabId) sendScan(tab.id);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
  if (isAI) setTimeout(() => sendScan(tabId), 2500);
});

async function scanAllAITabs() {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
    if (isAI) sendScan(tab.id);
  }
}

function sendScan(tabId) {
  chrome.tabs.sendMessage(tabId, { type: 'SCAN_SESSION' }, (response) => {
    void chrome.runtime.lastError;
    if (response?.snapshot) saveSnapshot(response.snapshot);
  });
}

function saveSnapshot(snapshot) {
  if (!snapshot.lastTopic && !snapshot.projectName) return;
  chrome.storage.local.set({ waypointAutoSession: { ...snapshot, savedAt: Date.now() } });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CLEAR_AUTO_SESSION') chrome.storage.local.remove('waypointAutoSession');
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') console.log('[Waypoint] Installed with auto session tracking.');
});
