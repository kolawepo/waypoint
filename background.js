/**
 * background.js — Waypoint v4
 *
 * The automatic session tracker.
 *
 * What it does:
 *   - Every 30 seconds, scans all open Claude/ChatGPT tabs
 *   - Asks the content script to extract a session snapshot
 *     (project name if any, last topic, recent keywords)
 *   - Stores the most recent snapshot so new chats can use it
 */

const AI_URLS = ['claude.ai', 'chatgpt.com', 'chat.openai.com'];

// ─── Scan tabs every 30 seconds ────────────────────────────────────────────
setInterval(scanAllAITabs, 30000);

// ─── Also scan when user switches tabs ─────────────────────────────────────
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const allTabs = await chrome.tabs.query({});

  // Scan AI tabs that are NOT the one just activated
  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
    if (isAI && tab.id !== activeInfo.tabId) {
      sendScanRequest(tab.id);
    }
  }
});

// ─── Scan when a tab finishes loading ──────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
  if (!isAI) return;
  setTimeout(() => sendScanRequest(tabId), 2500);
});

// ─── Scan all open AI tabs ──────────────────────────────────────────────────
async function scanAllAITabs() {
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
    if (isAI) sendScanRequest(tab.id);
  }
}

// ─── Send scan request to a tab ────────────────────────────────────────────
function sendScanRequest(tabId) {
  chrome.tabs.sendMessage(tabId, { type: 'SCAN_SESSION' }, (response) => {
    // Suppress "no receiver" errors when content script isn't loaded yet
    void chrome.runtime.lastError;
    if (response && response.snapshot) {
      saveSnapshot(response.snapshot);
    }
  });
}

// ─── Save the session snapshot ─────────────────────────────────────────────
function saveSnapshot(snapshot) {
  // Only save if there's meaningful content
  if (!snapshot.lastTopic && !snapshot.projectName) return;

  chrome.storage.local.set({
    waypointAutoSession: {
      ...snapshot,
      savedAt: Date.now(),
    }
  });
}

// ─── Listen for manual clear from content.js ───────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CLEAR_DETECTED') {
    chrome.storage.local.remove('waypointAutoSession');
  }
  if (message.type === 'CLEAR_AUTO_SESSION') {
    chrome.storage.local.remove('waypointAutoSession');
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Waypoint] v4 installed — automatic session tracking active.');
  }
});
