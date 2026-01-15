/**
 * content.js — Waypoint v4
 *
 * Runs on every Claude and ChatGPT tab.
 *
 * Three jobs:
 *   1. SCAN — when background asks, read the conversation and extract
 *             a session snapshot (project name, last topic, keywords)
 *
 *   2. PROMPT — on new chats, check for a recent session and show
 *               a "Continue where you left off?" banner
 *
 *   3. BUTTON — manual floating inject button (always available)
 */

// ─── Initialize ─────────────────────────────────────────────────────────────
(function init() {
  setTimeout(() => {
    injectFloatingButton();
    checkForNewChat();
  }, 2500);
})();

// ─── Listen for scan requests from background.js ────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_SESSION') {
    const snapshot = extractSessionSnapshot();
    sendResponse({ snapshot });
    return true; // Keep channel open for async
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — SESSION EXTRACTION
// Read the conversation and pull out useful context automatically
// ═══════════════════════════════════════════════════════════════════════════

function extractSessionSnapshot() {
  // Debug log so we can confirm scanning is working
  console.log("[Waypoint] Scanning page...");
  const text = getConversationText();
  if (!text || text.length < 50) return {};

  const hostname = window.location.hostname;
  const platform = hostname.includes('claude.ai') ? 'Claude' : 'ChatGPT';

  // Try to detect a project name from saved waypoints first
  const projectMatch = matchSavedProject(text);

  // Extract the last meaningful topic from the conversation
  const lastTopic = extractLastTopic(text);

  // Pull recent keywords (tech terms, project-sounding words)
  const keywords = extractKeywords(text);

  // Grab the last few lines of the conversation as a "last message" summary
  const lastLines = getLastLines(text, 3);

  return {
    platform,
    projectName: projectMatch?.name || null,
    projectId:   projectMatch?.id   || null,
    lastTopic,
    keywords,
    lastLines,
    url: window.location.href,
  };
}

// ─── Get all conversation text from the page ────────────────────────────────
function getConversationText() {
  const hostname = window.location.hostname;

  // Try many selectors — Claude and ChatGPT change their DOM frequently
  // We try the most specific first, then fall back to broader ones
  const allSelectors = hostname.includes('claude.ai') ? [
    // Claude selectors — try all of these
    '[data-testid="conversation-turn"]',
    '[class*="ConversationTurn"]',
    '[class*="conversation-turn"]',
    '[class*="message"]',
    '[class*="Message"]',
    '[class*="chat"]',
    '[class*="Chat"]',
    'article',
    'main',
    '#main-content',
    '[role="main"]',
  ] : [
    // ChatGPT selectors
    '[data-testid="conversation-turns"]',
    '[data-testid="conversation-turn"]',
    '[class*="react-scroll"]',
    '[class*="conversation"]',
    'main',
    '[role="main"]',
  ];

  // Try each selector and return the first one with real content
  for (const sel of allSelectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const text = el.innerText || el.textContent || '';
        if (text.length > 100) return text;
      }
    } catch (e) {
      // Bad selector — skip
    }
  }

  // Last resort: grab everything from the body but filter out nav/header noise
  const body = document.body;
  if (body) {
    // Remove script and style content
    const clone = body.cloneNode(true);
    clone.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
    const text = clone.innerText || clone.textContent || '';
    if (text.length > 50) return text;
  }

  return '';
}

// ─── Match against saved Waypoint projects ──────────────────────────────────
function matchSavedProject(text) {
  // We can't do async here easily, so we read from a cached value
  // The popup.js keeps waypointProjects in storage — we read it synchronously
  // via a workaround: store a copy in sessionStorage on popup open
  // For now we do a best-effort sync read using a pre-cached value
  try {
    const cached = sessionStorage.getItem('waypointProjectNames');
    if (!cached) return null;
    const projects = JSON.parse(cached);
    const lower = text.toLowerCase();
    return projects.find(p => lower.includes(p.name.toLowerCase())) || null;
  } catch {
    return null;
  }
}

// ─── Extract the last meaningful topic ──────────────────────────────────────
/**
 * Looks for sentences that sound like they describe what's being built.
 * Prioritizes lines that contain action words + tech terms.
 */
function extractLastTopic(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 20);

  // Keywords that suggest a line is about building/coding
  const buildWords = [
    'building', 'working on', 'implementing', 'fixing', 'debugging',
    'creating', 'adding', 'integrating', 'deploying', 'setting up',
    'trying to', "can't get", 'error', 'issue', 'feature', 'function',
    'component', 'endpoint', 'api', 'database', 'auth', 'deploy'
  ];

  // Find the last line that contains a build word
  for (let i = lines.length - 1; i >= 0; i--) {
    const lower = lines[i].toLowerCase();
    if (buildWords.some(w => lower.includes(w))) {
      // Truncate to 120 chars max
      return lines[i].slice(0, 120);
    }
  }

  // Fallback: just return the last non-trivial line
  return lines[lines.length - 1]?.slice(0, 120) || null;
}

// ─── Extract keywords ────────────────────────────────────────────────────────
/**
 * Pulls out capitalized words and tech terms that likely describe
 * the project or tech stack being discussed.
 */
function extractKeywords(text) {
  const techTerms = [
    'React', 'Firebase', 'Cloudflare', 'AWS', 'S3', 'OpenAI', 'API',
    'JavaScript', 'Python', 'TypeScript', 'Node', 'Express', 'Postgres',
    'MongoDB', 'Docker', 'Vercel', 'Supabase', 'Auth', 'JWT', 'Claude',
    'ChatGPT', 'GPT', 'Chrome', 'extension', 'Stripe', 'Redux', 'Next',
    'Vue', 'Svelte', 'Tailwind', 'CSS', 'HTML', 'SQL', 'Prisma', 'Vite',
  ];

  const found = techTerms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase())
  );

  // Also grab capitalized words that look like project/product names
  const capitalWords = (text.match(/\b[A-Z][a-z]{2,}\b/g) || [])
    .filter(w => !['The', 'This', 'That', 'When', 'What', 'With', 'From',
                   'Your', 'Have', 'Here', 'Just', 'Also', 'Then'].includes(w));

  const uniqueCaps = [...new Set(capitalWords)].slice(0, 5);

  return [...new Set([...found, ...uniqueCaps])].slice(0, 8);
}

// ─── Get last N lines of conversation ───────────────────────────────────────
function getLastLines(text, n) {
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 15)
    .slice(-n)
    .join(' ')
    .slice(0, 200);
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — NEW CHAT PROMPT
// Show "Continue where you left off?" on fresh chats
// ═══════════════════════════════════════════════════════════════════════════

async function checkForNewChat() {
  if (!isNewChat()) return;

  const data = await storageGet(['waypointAutoSession', 'waypointProjects']);
  const session  = data.waypointAutoSession;
  const projects = data.waypointProjects || [];

  if (!session) return;

  // Only use sessions from the last 3 hours
  const threeHours = 3 * 60 * 60 * 1000;
  if (Date.now() - session.savedAt > threeHours) return;

  // Don't prompt if the session is from THIS tab (already on the right chat)
  if (session.url === window.location.href) return;

  // Cache project names in sessionStorage for sync access in matchSavedProject
  if (projects.length > 0) {
    sessionStorage.setItem('waypointProjectNames', JSON.stringify(
      projects.map(p => ({ id: p.id, name: p.name }))
    ));
  }

  // Build the prompt message
  const title = session.projectName
    ? `Continue working on ${session.projectName}?`
    : `Continue your last ${session.platform} session?`;

  const subtitle = session.lastTopic
    ? truncate(session.lastTopic, 80)
    : session.keywords?.slice(0, 3).join(', ') || 'Pick up where you left off';

  showContinuePrompt({ title, subtitle, session, projects });
}

// ─── Is this a new/empty chat? ───────────────────────────────────────────────
function isNewChat() {
  const hostname = window.location.hostname;

  if (hostname.includes('claude.ai')) {
    // Check URL patterns for new chats
    const isNewURL = window.location.pathname === '/' ||
                     window.location.pathname.includes('/new') ||
                     window.location.pathname === '/chats';

    // Check if there are no messages on the page yet
    const hasNoMessages =
      !document.querySelector('[data-testid="conversation-turn"]') &&
      !document.querySelector('[class*="ConversationTurn"]') &&
      !document.querySelector('[class*="conversation-turn"]') &&
      !document.querySelector('article');

    return isNewURL || hasNoMessages;
  }

  if (hostname.includes('chatgpt.com')) {
    return !document.querySelector('[data-testid="conversation-turn"]') &&
           !document.querySelector('[class*="group/conversation-turn"]');
  }

  return false;
}

// ─── Show the continue prompt banner ────────────────────────────────────────
function showContinuePrompt({ title, subtitle, session, projects }) {
  if (document.getElementById('waypoint-prompt')) return;

  // Inject animation styles once
  if (!document.getElementById('waypoint-styles')) {
    const style = document.createElement('style');
    style.id = 'waypoint-styles';
    style.textContent = `
      @keyframes wpSlideDown {
        from { opacity:0; transform:translateX(-50%) translateY(-14px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  const prompt = document.createElement('div');
  prompt.id = 'waypoint-prompt';

  Object.assign(prompt.style, {
    position:     'fixed',
    top:          '16px',
    left:         '50%',
    transform:    'translateX(-50%)',
    zIndex:       '2147483647',
    background:   '#222d1f',
    border:       '1px solid #3a4d35',
    borderLeft:   '3px solid #E8753A',
    borderRadius: '10px',
    padding:      '13px 16px',
    display:      'flex',
    alignItems:   'center',
    gap:          '12px',
    boxShadow:    '0 8px 32px rgba(0,0,0,0.6)',
    fontFamily:   "'DM Sans','Inter',system-ui,sans-serif",
    fontSize:     '13px',
    color:        '#e8dfc8',
    maxWidth:     '460px',
    width:        'calc(100vw - 40px)',
    animation:    'wpSlideDown 0.2s ease',
  });

  prompt.innerHTML = `
    <svg width="18" height="22" viewBox="0 0 20 24" fill="none" style="flex-shrink:0">
      <path d="M10 0C4.477 0 0 4.477 0 10c0 6.627 8.5 14 10 14S20 16.627 20 10C20 4.477 15.523 0 10 0z" fill="#E8753A"/>
      <circle cx="10" cy="10" r="3.5" fill="#222d1f"/>
      <circle cx="10" cy="10" r="1.5" fill="#E8753A"/>
    </svg>
    <div style="flex:1;line-height:1.45;min-width:0">
      <div style="font-weight:700;color:#e8dfc8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
      <div style="color:#8a9e7e;font-size:11.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${subtitle}</div>
    </div>
    <button id="waypoint-yes" style="
      background:#E8753A;color:#1a2318;border:none;border-radius:6px;
      padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;
      font-family:inherit;white-space:nowrap;flex-shrink:0
    ">Continue</button>
    <button id="waypoint-no" style="
      background:transparent;color:#8a9e7e;border:1px solid #3a4d35;
      border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;
      font-family:inherit;flex-shrink:0
    ">✕</button>
  `;

  document.body.appendChild(prompt);

  // ── Continue: build and inject context ──────────────────────────────────
  document.getElementById('waypoint-yes').addEventListener('click', async () => {
    let contextText = '';

    if (session.projectId) {
      // We have a saved Waypoint project — use its full state
      const p = projects.find(proj => proj.id === session.projectId);
      if (p) contextText = buildContextBlock(p);
    }

    if (!contextText) {
      // No saved project — build context from what we detected automatically
      contextText = buildAutoContext(session);
    }

    const inserted = insertIntoChat(contextText);
    if (!inserted) {
      navigator.clipboard.writeText(contextText);
      showToast('Copied to clipboard — paste it in.');
    } else {
      showToast('✓ Context injected');
    }

    chrome.runtime.sendMessage({ type: 'CLEAR_AUTO_SESSION' });
    prompt.remove();
  });

  // ── Dismiss ──────────────────────────────────────────────────────────────
  document.getElementById('waypoint-no').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_AUTO_SESSION' });
    prompt.remove();
  });

  // Dismiss when user sends their first message (feels natural)
  // Also keep a long fallback timer of 5 minutes just in case
  watchForFirstMessage(prompt);
  setTimeout(() => {
    document.getElementById('waypoint-prompt')?.remove();
  }, 5 * 60 * 1000);
}

// ─── Build context from auto-detected session (no saved project) ─────────────
function buildAutoContext(session) {
  const lines = [];

  lines.push(`Continuing from a previous ${session.platform} session.`);

  if (session.lastTopic) {
    lines.push('');
    lines.push(`Last topic: ${session.lastTopic}`);
  }

  if (session.keywords?.length > 0) {
    lines.push('');
    lines.push(`Technologies mentioned: ${session.keywords.join(', ')}`);
  }

  if (session.lastLines) {
    lines.push('');
    lines.push('Recent context:');
    lines.push(session.lastLines);
  }

  lines.push('');
  lines.push('---');
  lines.push('Resume Instruction: Use this context to continue from where we left off without asking me to re-explain what we were working on.');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — MANUAL FLOATING BUTTON (always available)
// ═══════════════════════════════════════════════════════════════════════════

function injectFloatingButton() {
  if (document.getElementById('waypoint-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'waypoint-btn';
  btn.textContent = '⊕ Waypoint';
  btn.title = 'Insert Waypoint project context manually';

  Object.assign(btn.style, {
    position:     'fixed',
    bottom:       '90px',
    right:        '20px',
    zIndex:       '99999',
    background:   '#E8753A',
    color:        '#1a2318',
    border:       'none',
    borderRadius: '99px',
    padding:      '9px 16px',
    fontSize:     '13px',
    fontWeight:   '700',
    fontFamily:   "'DM Sans','Inter',system-ui,sans-serif",
    cursor:       'pointer',
    boxShadow:    '0 4px 18px rgba(232,117,58,0.4)',
    transition:   'transform 0.15s, background 0.15s',
    userSelect:   'none',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#ee8c57';
    btn.style.transform  = 'scale(1.04)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#E8753A';
    btn.style.transform  = 'scale(1)';
  });

  btn.addEventListener('click', handleManualInsert);
  document.body.appendChild(btn);
}

function handleManualInsert() {
  chrome.storage.local.get(['waypointProjects', 'waypointActiveId'], (data) => {
    const projects = data.waypointProjects || [];
    const project  = projects.find(p => p.id === data.waypointActiveId);

    if (!project) {
      showToast('No active project. Open Waypoint and select one.');
      return;
    }

    const inserted = insertIntoChat(buildContextBlock(project));
    if (inserted) showToast(`✓ ${project.name} context inserted`);
    else {
      navigator.clipboard.writeText(buildContextBlock(project));
      showToast('Copied to clipboard — paste it in.');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function insertIntoChat(text) {
  const hostname = window.location.hostname;
  const selectors = hostname.includes('claude.ai')
    ? ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"][data-placeholder]', 'div[contenteditable="true"]', 'textarea']
    : ['div[contenteditable="true"]#prompt-textarea', 'div[contenteditable="true"]', 'textarea'];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return setValueAndTrigger(el, text);
  }
  return false;
}

function setValueAndTrigger(el, text) {
  try {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      if (nativeSetter) nativeSetter.set.call(el, text);
      else el.value = text;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
      if (!el.textContent.includes(text.slice(0, 20))) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }
    }
    return true;
  } catch (err) {
    console.error('[Waypoint] Insert failed:', err);
    return false;
  }
}

function showToast(message) {
  document.getElementById('waypoint-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'waypoint-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position:'fixed', bottom:'148px', right:'20px', zIndex:'99999',
    background:'#222d1f', color:'#e8dfc8', border:'1px solid #2f3d2b',
    borderLeft:'3px solid #E8753A', borderRadius:'7px', padding:'9px 14px',
    fontSize:'12px', fontFamily:"'DM Sans','Inter',system-ui,sans-serif",
    fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
    maxWidth:'260px', lineHeight:'1.4', opacity:'1', transition:'opacity 0.4s',
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; }, 2600);
  setTimeout(() => { toast.remove(); }, 3000);
}

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function buildContextBlock(project) {
  function bulletList(raw) {
    if (!raw) return '';
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => `• ${l}`).join('\n');
  }
  const lines = [`Project: ${project.name}`];
  if (project.completed)  { lines.push('', 'Completed:',   bulletList(project.completed)); }
  if (project.inProgress) { lines.push('', 'In Progress:', bulletList(project.inProgress)); }
  if (project.blocked)    { lines.push('', 'Blocked:',     bulletList(project.blocked)); }
  if (project.nextSteps)  { lines.push('', 'Next Steps:',  bulletList(project.nextSteps)); }
  if (project.notes)      { lines.push('', 'Notes:',       bulletList(project.notes)); }
  lines.push('', '---', 'Resume Instruction: Use this context to continue the project without asking me to re-explain completed work. First verify current state, then continue from the next step.');
  return lines.join('\n');
}

// ─── Watch for first message send and dismiss prompt ───────────────────────
/**
 * Observes the chat input. When the user sends their first message
 * (input clears after being non-empty), we dismiss the Waypoint prompt.
 * This feels natural — if you're typing your own thing, you don't need it.
 */
function watchForFirstMessage(promptEl) {
  const hostname = window.location.hostname;

  const selectors = hostname.includes('claude.ai')
    ? ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]', 'textarea']
    : ['div[contenteditable="true"]#prompt-textarea', 'div[contenteditable="true"]', 'textarea'];

  let inputEl = null;
  for (const sel of selectors) {
    inputEl = document.querySelector(sel);
    if (inputEl) break;
  }

  if (!inputEl) return;

  let hadContent = false;

  const observer = new MutationObserver(() => {
    const text = inputEl.innerText || inputEl.value || '';
    const hasContent = text.trim().length > 0;

    if (hasContent) {
      hadContent = true;
    } else if (hadContent && !hasContent) {
      // Input just cleared — user sent their message
      promptEl.remove();
      observer.disconnect();
    }
  });

  observer.observe(inputEl, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
