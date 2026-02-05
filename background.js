// background.js — Waypoint service worker
// MV3 requires a service worker, keeping this minimal for now

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Waypoint] Extension installed.');
  }
});
