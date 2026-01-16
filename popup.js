// popup.js — save all fields
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
