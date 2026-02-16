// popup.js — refactored for multi-project support
// storage shape: { waypointProjects: [...], waypointActiveId: "..." }

document.addEventListener('DOMContentLoaded', loadProjects);

let projects = [];
let activeId = null;

function loadProjects() {
  chrome.storage.local.get(['waypointProjects', 'waypointActiveId'], (data) => {
    projects  = data.waypointProjects || [];
    activeId  = data.waypointActiveId || null;
    renderDropdown();
    renderForm();
  });
}

function renderDropdown() {
  const sel = document.getElementById('projectSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select project —</option>';
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === activeId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderForm() {
  const project = projects.find(p => p.id === activeId);
  const form = document.getElementById('projectForm');
  const empty = document.getElementById('emptyState');
  if (!project) {
    if (form)  form.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (form)  form.classList.remove('hidden');
  if (empty) empty.classList.add('hidden');
  document.getElementById('completed').value  = project.completed  || '';
  document.getElementById('inProgress').value = project.inProgress || '';
  document.getElementById('blocked').value    = project.blocked    || '';
  document.getElementById('nextSteps').value  = project.nextSteps  || '';
  document.getElementById('notes').value      = project.notes      || '';
}

function saveAll() {
  chrome.storage.local.set({ waypointProjects: projects, waypointActiveId: activeId });
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function buildContext(project) {
  function bullets(raw) {
    if (!raw) return '';
    return raw.split('\n').map(l => l.trim()).filter(Boolean).map(l => '• ' + l).join('\n');
  }
  const lines = ['Project: ' + project.name];
  if (project.completed)  { lines.push('', 'Completed:',   bullets(project.completed)); }
  if (project.inProgress) { lines.push('', 'In Progress:', bullets(project.inProgress)); }
  if (project.blocked)    { lines.push('', 'Blocked:',     bullets(project.blocked)); }
  if (project.nextSteps)  { lines.push('', 'Next Steps:',  bullets(project.nextSteps)); }
  if (project.notes)      { lines.push('', 'Notes:',       bullets(project.notes)); }
  lines.push('', '---', 'Resume Instruction: Use this context to continue the project without asking me to re-explain completed work. First verify current state, then continue from the next step.');
  return lines.join('\n');
}

// Wire up buttons
document.addEventListener('DOMContentLoaded', () => {
  const newBtn    = document.getElementById('newProjectBtn');
  const delBtn    = document.getElementById('deleteProjectBtn');
  const sel       = document.getElementById('projectSelect');
  const saveBtn   = document.getElementById('saveBtn');
  const genBtn    = document.getElementById('generateBtn');
  const copyBtn   = document.getElementById('copyBtn');

  if (newBtn) newBtn.addEventListener('click', () => {
    if (projects.length >= 5) {
      document.getElementById('proFooter')?.classList.remove('hidden');
      return;
    }
    const name = prompt('Project name:');
    if (!name?.trim()) return;
    const p = { id: generateId(), name: name.trim(), completed: '', inProgress: '', blocked: '', nextSteps: '', notes: '' };
    projects.push(p);
    activeId = p.id;
    saveAll();
    renderDropdown();
    renderForm();
  });

  if (delBtn) delBtn.addEventListener('click', () => {
    const p = projects.find(p => p.id === activeId);
    if (!p || !confirm('Delete "' + p.name + '"?')) return;
    projects = projects.filter(p => p.id !== activeId);
    activeId = projects[0]?.id || null;
    saveAll();
    renderDropdown();
    renderForm();
  });

  if (sel) sel.addEventListener('change', () => {
    activeId = sel.value || null;
    chrome.storage.local.set({ waypointActiveId: activeId });
    renderForm();
  });

  if (saveBtn) saveBtn.addEventListener('click', () => {
    const p = projects.find(p => p.id === activeId);
    if (!p) return;
    p.completed  = document.getElementById('completed').value.trim();
    p.inProgress = document.getElementById('inProgress').value.trim();
    p.blocked    = document.getElementById('blocked').value.trim();
    p.nextSteps  = document.getElementById('nextSteps').value.trim();
    p.notes      = document.getElementById('notes').value.trim();
    saveAll();
    const status = document.getElementById('saveStatus');
    if (status) { status.textContent = '✓ Saved'; setTimeout(() => { status.textContent = ''; }, 2000); }
  });

  if (genBtn) genBtn.addEventListener('click', () => {
    const p = projects.find(proj => proj.id === activeId);
    if (!p) return;
    const context = buildContext(p);
    document.getElementById('contextOutput').textContent = context;
    document.getElementById('contextBox').classList.remove('hidden');
    if (copyBtn) copyBtn.disabled = false;
  });

  if (copyBtn) copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('contextOutput').textContent).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = orig; }, 1800);
    });
  });
});

// fix: save active project before switching to prevent data loss
