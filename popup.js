// popup.js — save, load, generate context

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(null, (data) => {
    document.getElementById('projectName').value = data.projectName || '';
    document.getElementById('completed').value   = data.completed   || '';
    document.getElementById('inProgress').value  = data.inProgress  || '';
    document.getElementById('blocked').value     = data.blocked     || '';
    document.getElementById('nextSteps').value   = data.nextSteps   || '';
    document.getElementById('notes').value       = data.notes       || '';
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const data = {
    projectName: document.getElementById('projectName').value.trim(),
    completed:   document.getElementById('completed').value.trim(),
    inProgress:  document.getElementById('inProgress').value.trim(),
    blocked:     document.getElementById('blocked').value.trim(),
    nextSteps:   document.getElementById('nextSteps').value.trim(),
    notes:       document.getElementById('notes').value.trim(),
  };
  chrome.storage.local.set(data, () => {
    const status = document.getElementById('status');
    status.textContent = '✓ Saved';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

document.getElementById('generateBtn').addEventListener('click', () => {
  const name       = document.getElementById('projectName').value.trim() || 'Untitled';
  const completed  = document.getElementById('completed').value.trim();
  const inProgress = document.getElementById('inProgress').value.trim();
  const blocked    = document.getElementById('blocked').value.trim();
  const nextSteps  = document.getElementById('nextSteps').value.trim();
  const notes      = document.getElementById('notes').value.trim();

  const context = buildContext({ name, completed, inProgress, blocked, nextSteps, notes });
  document.getElementById('contextOutput').textContent = context;
  document.getElementById('contextBox').style.display = 'block';
});

function buildContext({ name, completed, inProgress, blocked, nextSteps, notes }) {
  function bullets(raw) {
    if (!raw) return '';
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => '• ' + l).join('\n');
  }
  const lines = ['Project: ' + name];
  if (completed)  { lines.push('', 'Completed:',   bullets(completed)); }
  if (inProgress) { lines.push('', 'In Progress:', bullets(inProgress)); }
  if (blocked)    { lines.push('', 'Blocked:',     bullets(blocked)); }
  if (nextSteps)  { lines.push('', 'Next Steps:',  bullets(nextSteps)); }
  if (notes)      { lines.push('', 'Notes:',       bullets(notes)); }
  lines.push('', '---', 'Resume Instruction: Use this context to continue the project without asking me to re-explain completed work. First verify current state, then continue from the next step.');
  return lines.join('\n');
}
