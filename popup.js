// popup.js — save and load state

// Load saved data when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(
    ['projectName','completed','inProgress','blocked','nextSteps','notes'],
    (data) => {
      document.getElementById('projectName').value = data.projectName || '';
      document.getElementById('completed').value   = data.completed   || '';
      document.getElementById('inProgress').value  = data.inProgress  || '';
      document.getElementById('blocked').value     = data.blocked     || '';
      document.getElementById('nextSteps').value   = data.nextSteps   || '';
      document.getElementById('notes').value       = data.notes       || '';
    }
  );
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
    document.getElementById('status').textContent = 'Saved!';
    setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
  });
});
