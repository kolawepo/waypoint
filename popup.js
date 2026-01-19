// popup.js — save and load state
// fix: added null check so fields don't show 'undefined' on first open

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
