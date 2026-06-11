/**
 * background.js — Waypoint v4
 *
 * Automatic session tracker.
 *
 * What it does:
 * - Scans open Claude/ChatGPT tabs
 * - Asks content.js to extract a session snapshot
 * - Sends snapshot text to local OpenAI summary backend
 * - Saves the AI-generated summary for new chats
 */

const AI_URLS = ['claude.ai', 'chatgpt.com', 'chat.openai.com'];
const SUMMARY_API_URL = 'http://localhost:3001/summarize';

// Scan tabs every 30 seconds
setInterval(scanAllAITabs, 10000);

// Scan when user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const allTabs = await chrome.tabs.query({});

  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));

    if (isAI && tab.id !== activeInfo.tabId) {
      sendScanRequest(tab.id);
    }
  }
});

// Scan when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));
  if (!isAI) return;

  setTimeout(() => sendScanRequest(tabId), 2500);
});

// Scan all open AI tabs
async function scanAllAITabs() {
  const allTabs = await chrome.tabs.query({});

  for (const tab of allTabs) {
    const isAI = AI_URLS.some(url => tab.url && tab.url.includes(url));

    if (isAI) {
      sendScanRequest(tab.id);
    }
  }
}

// Ask content.js for the current session snapshot
function sendScanRequest(tabId) {
  chrome.tabs.sendMessage(tabId, { type: 'SCAN_SESSION' }, (response) => {
    void chrome.runtime.lastError;

    if (response && response.snapshot) {
      saveSnapshot(response.snapshot);
    }
  });
}

// Save session after creating AI summary
async function saveSnapshot(snapshot) {
  if (!snapshot.lastTopic && !snapshot.projectName && !snapshot.lastLines) {
    return;
  }

  const aiSummary = await summarizeSnapshot(snapshot);

  chrome.storage.local.set({
    waypointAutoSession: {
      ...snapshot,
      aiSummary,
      savedAt: Date.now(),
    },
  });

  console.log('[Waypoint] Saved session with AI summary:', aiSummary);
}

// Send snapshot to local OpenAI backend
async function summarizeSnapshot(snapshot) {
  try {
    const textParts = [
      snapshot.projectName ? `Project: ${snapshot.projectName}` : null,
      snapshot.lastTopic ? `Last topic: ${snapshot.lastTopic}` : null,
      snapshot.lastLines ? `Recent context: ${snapshot.lastLines}` : null,
      snapshot.keywords?.length
        ? `Keywords: ${snapshot.keywords.join(', ')}`
        : null,
    ].filter(Boolean);

    const text = textParts.join('\n');

    if (!text || text.length < 50) {
      return null;
    }

    const response = await fetch(SUMMARY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: snapshot.platform || 'Unknown',
        text,
      }),
    });

    if (!response.ok) {
      console.warn('[Waypoint] Summary API failed:', response.status);
      return null;
    }

    const data = await response.json();

    return data.summary || null;
  } catch (err) {
    console.warn('[Waypoint] Could not summarize session:', err);
    return null;
  }
}

// Optional manual clear support
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