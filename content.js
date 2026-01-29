// content.js — inject floating button on Claude
// fix: moved button position up to avoid overlapping send button

(function() {
  setTimeout(injectButton, 1500);
})();

function injectButton() {
  if (document.getElementById('waypoint-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'waypoint-btn';
  btn.textContent = '⊕ Waypoint';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '100px',
    right: '20px',
    zIndex: '99999',
    background: '#5b5ef4',
    color: 'white',
    border: 'none',
    borderRadius: '99px',
    padding: '9px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(91,94,244,0.4)',
  });

  btn.addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      if (!data.projectName) {
        alert('No project saved. Open Waypoint first.');
        return;
      }
      const text = buildContext(data);
      const input = document.querySelector('div[contenteditable="true"]') ||
                    document.querySelector('textarea');
      if (input) {
        input.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
      }
    });
  });

  document.body.appendChild(btn);
}

function buildContext(data) {
  function bullets(raw) {
    if (!raw) return '';
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => '• ' + l).join('\n');
  }
  const lines = ['Project: ' + (data.projectName || 'Untitled')];
  if (data.completed)  { lines.push('', 'Completed:',   bullets(data.completed)); }
  if (data.inProgress) { lines.push('', 'In Progress:', bullets(data.inProgress)); }
  if (data.blocked)    { lines.push('', 'Blocked:',     bullets(data.blocked)); }
  if (data.nextSteps)  { lines.push('', 'Next Steps:',  bullets(data.nextSteps)); }
  if (data.notes)      { lines.push('', 'Notes:',       bullets(data.notes)); }
  lines.push('', '---', 'Resume Instruction: Use this context to continue without re-explaining.');
  return lines.join('\n');
}
