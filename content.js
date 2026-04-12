// content.js — Waypoint
// Auto session detection + manual inject button

(function init() {
  setTimeout(() => {
    injectFloatingButton();
    checkForNewChat();
  }, 2000);
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_SESSION') {
    const snapshot = extractSnapshot();
    sendResponse({ snapshot });
    return true;
  }
});

function extractSnapshot() {
  const text = getConversationText();
  console.log('[Waypoint] Scanning page...');
  if (!text || text.length < 50) return {};
  const hostname = window.location.hostname;
  const platform = hostname.includes('claude.ai') ? 'Claude' : 'ChatGPT';
  const projectMatch = matchSavedProject(text);
  const lastTopic = extractLastTopic(text);
  const keywords = extractKeywords(text);
  return { platform, projectName: projectMatch?.name || null, projectId: projectMatch?.id || null, lastTopic, keywords, url: window.location.href };
}

function getConversationText() {
  const hostname = window.location.hostname;
  const allSelectors = hostname.includes('claude.ai')
    ? ['[data-testid="conversation-turn"]','[class*="ConversationTurn"]','[class*="conversation-turn"]','[class*="message"]','[class*="Message"]','article','main','[role="main"]']
    : ['[data-testid="conversation-turns"]','[data-testid="conversation-turn"]','[class*="conversation"]','main','[role="main"]'];
  for (const sel of allSelectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const text = el.innerText || el.textContent || '';
        if (text.length > 100) return text;
      }
    } catch(e) {}
  }
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script,style,nav,header,footer').forEach(el => el.remove());
  return clone.innerText || clone.textContent || '';
}

function matchSavedProject(text) {
  try {
    const cached = sessionStorage.getItem('waypointProjectNames');
    if (!cached) return null;
    const projects = JSON.parse(cached);
    const lower = text.toLowerCase();
    return projects.find(p => lower.includes(p.name.toLowerCase())) || null;
  } catch { return null; }
}

function extractLastTopic(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 20);
  const buildWords = ['building','working on','implementing','fixing','debugging','creating','adding','integrating','deploying','error','issue','feature','endpoint','api','auth'];
  for (let i = lines.length - 1; i >= 0; i--) {
    if (buildWords.some(w => lines[i].toLowerCase().includes(w))) return lines[i].slice(0, 120);
  }
  return lines[lines.length - 1]?.slice(0, 120) || null;
}

function extractKeywords(text) {
  const techTerms = ['React','Firebase','Cloudflare','AWS','S3','OpenAI','API','JavaScript','Python','TypeScript','Node','Express','Docker','Vercel','Auth','JWT','Chrome','Stripe','SQL','Vectorize'];
  return techTerms.filter(t => text.toLowerCase().includes(t.toLowerCase())).slice(0, 8);
}

async function checkForNewChat() {
  if (!isNewChat()) return;
  const data = await storageGet(['waypointAutoSession','waypointProjects']);
  const session = data.waypointAutoSession;
  const projects = data.waypointProjects || [];
  if (!session) return;
  if (Date.now() - session.savedAt > 3 * 60 * 60 * 1000) return;
  if (session.url === window.location.href) return;
  if (projects.length > 0) sessionStorage.setItem('waypointProjectNames', JSON.stringify(projects.map(p => ({ id: p.id, name: p.name }))));
  const title = session.projectName ? 'Continue working on ' + session.projectName + '?' : 'Continue your last ' + session.platform + ' session?';
  const subtitle = session.lastTopic ? session.lastTopic.slice(0, 80) : (session.keywords?.slice(0,3).join(', ') || 'Pick up where you left off');
  showPrompt({ title, subtitle, session, projects });
}

function isNewChat() {
  const hostname = window.location.hostname;
  if (hostname.includes('claude.ai')) {
    return window.location.pathname === '/' || window.location.pathname.includes('/new') ||
      (!document.querySelector('[data-testid="conversation-turn"]') && !document.querySelector('article'));
  }
  if (hostname.includes('chatgpt.com')) return !document.querySelector('[data-testid="conversation-turn"]');
  return false;
}

function showPrompt({ title, subtitle, session, projects }) {
  if (document.getElementById('waypoint-prompt')) return;
  if (!document.getElementById('waypoint-styles')) {
    const s = document.createElement('style');
    s.id = 'waypoint-styles';
    s.textContent = '@keyframes wpSlide { from { opacity:0; transform:translateX(-50%) translateY(-14px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
    document.head.appendChild(s);
  }
  const prompt = document.createElement('div');
  prompt.id = 'waypoint-prompt';
  Object.assign(prompt.style, {
    position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)',
    zIndex:'2147483647', background:'#171c28', border:'1px solid #3a4d35',
    borderLeft:'3px solid #E8753A', borderRadius:'10px', padding:'13px 16px',
    display:'flex', alignItems:'center', gap:'12px',
    boxShadow:'0 8px 32px rgba(0,0,0,0.6)', fontFamily:"'DM Sans','Inter',system-ui,sans-serif",
    fontSize:'13px', color:'#e8dfc8', maxWidth:'460px', width:'calc(100vw - 40px)',
    animation:'wpSlide 0.2s ease',
  });
  prompt.innerHTML = `
    <svg width="18" height="22" viewBox="0 0 20 24" fill="none" style="flex-shrink:0">
      <path d="M10 0C4.477 0 0 4.477 0 10c0 6.627 8.5 14 10 14S20 16.627 20 10C20 4.477 15.523 0 10 0z" fill="#E8753A"/>
      <circle cx="10" cy="10" r="3.5" fill="#171c28"/>
      <circle cx="10" cy="10" r="1.5" fill="#E8753A"/>
    </svg>
    <div style="flex:1;line-height:1.45;min-width:0">
      <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
      <div style="color:#8a9e7e;font-size:11.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${subtitle}</div>
    </div>
    <button id="waypoint-yes" style="background:#E8753A;color:#171c28;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">Continue</button>
    <button id="waypoint-no" style="background:transparent;color:#8a9e7e;border:1px solid #3a4d35;border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;font-family:inherit;flex-shrink:0">✕</button>
  `;
  document.body.appendChild(prompt);
  document.getElementById('waypoint-yes').addEventListener('click', async () => {
    let text = '';
    if (session.projectId) {
      const d = await storageGet(['waypointProjects']);
      const p = (d.waypointProjects || []).find(p => p.id === session.projectId);
      if (p) text = buildContextBlock(p);
    }
    if (!text) text = buildAutoContext(session);
    if (!insertIntoChat(text)) { navigator.clipboard.writeText(text); showToast('Copied — paste it in.'); }
    else showToast('✓ Context injected');
    chrome.runtime.sendMessage({ type: 'CLEAR_AUTO_SESSION' });
    prompt.remove();
  });
  document.getElementById('waypoint-no').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_AUTO_SESSION' });
    prompt.remove();
  });
  watchForFirstMessage(prompt);
  setTimeout(() => document.getElementById('waypoint-prompt')?.remove(), 5 * 60 * 1000);
}

function watchForFirstMessage(promptEl) {
  const sels = window.location.hostname.includes('claude.ai')
    ? ['div[contenteditable="true"].ProseMirror','div[contenteditable="true"]','textarea']
    : ['div[contenteditable="true"]#prompt-textarea','div[contenteditable="true"]','textarea'];
  let el = null;
  for (const s of sels) { el = document.querySelector(s); if (el) break; }
  if (!el) return;
  let had = false;
  const obs = new MutationObserver(() => {
    const has = (el.innerText || el.value || '').trim().length > 0;
    if (has) had = true;
    else if (had && !has) { promptEl.remove(); obs.disconnect(); }
  });
  obs.observe(el, { childList: true, subtree: true, characterData: true });
}

function buildAutoContext(session) {
  const lines = ['Continuing from a previous ' + session.platform + ' session.'];
  if (session.lastTopic) lines.push('', 'Last topic: ' + session.lastTopic);
  if (session.keywords?.length) lines.push('', 'Technologies mentioned: ' + session.keywords.join(', '));
  lines.push('', '---', 'Resume Instruction: Use this context to continue from where we left off without asking me to re-explain what we were working on.');
  return lines.join('\n');
}

function injectFloatingButton() {
  if (document.getElementById('waypoint-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'waypoint-btn';
  btn.textContent = '⊕ Waypoint';
  Object.assign(btn.style, {
    position:'fixed', bottom:'90px', right:'20px', zIndex:'99999',
    background:'#E8753A', color:'#171c28', border:'none', borderRadius:'99px',
    padding:'9px 16px', fontSize:'13px', fontWeight:'700',
    fontFamily:"'DM Sans','Inter',system-ui,sans-serif", cursor:'pointer',
    boxShadow:'0 4px 18px rgba(232,117,58,0.4)', transition:'transform 0.15s, background 0.15s',
  });
  btn.addEventListener('mouseenter', () => { btn.style.background='#ee8c57'; btn.style.transform='scale(1.04)'; });
  btn.addEventListener('mouseleave', () => { btn.style.background='#E8753A'; btn.style.transform='scale(1)'; });
  btn.addEventListener('click', () => {
    chrome.storage.local.get(['waypointProjects','waypointActiveId'], (data) => {
      const p = (data.waypointProjects||[]).find(p=>p.id===data.waypointActiveId);
      if (!p) { showToast('No active project. Open Waypoint and select one.'); return; }
      if (insertIntoChat(buildContextBlock(p))) showToast('✓ '+p.name+' context inserted');
      else { navigator.clipboard.writeText(buildContextBlock(p)); showToast('Copied — paste it in.'); }
    });
  });
  document.body.appendChild(btn);
}

function insertIntoChat(text) {
  const hostname = window.location.hostname;
  const sels = hostname.includes('claude.ai')
    ? ['div[contenteditable="true"].ProseMirror','div[contenteditable="true"][data-placeholder]','div[contenteditable="true"]','textarea']
    : ['div[contenteditable="true"]#prompt-textarea','div[contenteditable="true"]','textarea'];
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (el) return setAndTrigger(el, text);
  }
  return false;
}

function setAndTrigger(el, text) {
  try {
    el.focus();
    if (el.tagName==='TEXTAREA'||el.tagName==='INPUT') {
      const ns = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value');
      if (ns) ns.set.call(el,text); else el.value=text;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    } else {
      document.execCommand('selectAll',false,null);
      document.execCommand('insertText',false,text);
      if (!el.textContent.includes(text.slice(0,20))) {
        el.textContent=text;
        el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
      }
    }
    return true;
  } catch(e) { return false; }
}

function showToast(message) {
  document.getElementById('waypoint-toast')?.remove();
  const t = document.createElement('div');
  t.id='waypoint-toast'; t.textContent=message;
  Object.assign(t.style, {
    position:'fixed',bottom:'148px',right:'20px',zIndex:'99999',
    background:'#171c28',color:'#e8dfc8',border:'1px solid #2f3d2b',
    borderLeft:'3px solid #E8753A',borderRadius:'7px',padding:'9px 14px',
    fontSize:'12px',fontFamily:"'DM Sans','Inter',system-ui,sans-serif",
    fontWeight:'500',boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
    maxWidth:'260px',lineHeight:'1.4',opacity:'1',transition:'opacity 0.4s',
  });
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';},2600);
  setTimeout(()=>{t.remove();},3000);
}

function storageGet(keys) { return new Promise(r=>chrome.storage.local.get(keys,r)); }

function buildContextBlock(p) {
  function b(raw) { if(!raw)return''; return raw.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>'• '+l).join('\n'); }
  const lines=['Project: '+p.name];
  if(p.completed)  lines.push('','Completed:',  b(p.completed));
  if(p.inProgress) lines.push('','In Progress:',b(p.inProgress));
  if(p.blocked)    lines.push('','Blocked:',    b(p.blocked));
  if(p.nextSteps)  lines.push('','Next Steps:', b(p.nextSteps));
  if(p.notes)      lines.push('','Notes:',      b(p.notes));
  lines.push('','---','Resume Instruction: Use this context to continue the project without asking me to re-explain completed work. First verify current state, then continue from the next step.');
  return lines.join('\n');
}
// fix: broadened selectors after Claude DOM update mar 2026
// fix: was dismissing after 15s, bumped timeout
// ux: banner now watches for first message send
