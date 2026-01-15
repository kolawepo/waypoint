// very basic first version — just save notes
document.getElementById('saveBtn').addEventListener('click', () => {
  const data = {
    projectName: document.getElementById('projectName').value,
    notes: document.getElementById('notes').value,
  };
  chrome.storage.local.set(data, () => {
    alert('Saved!');
  });
});
