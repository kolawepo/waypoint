/**
 * popup.js — Waypoint v2
 *
 * Handles:
 *   1. Multi-project management (create, switch, delete)
 *   2. Saving and loading per-project state
 *   3. Generating and copying the context block
 *   4. 5-project free tier with Pro upsell
 *
 * Storage shape:
 *   {
 *     waypointProjects: [
 *       { id: "abc123", name: "Vault", completed: "", inProgress: "", blocked: "", nextSteps: "", notes: "" },
 *       ...
 *     ],
 *     waypointActiveId: "abc123"
 *   }
 */

// ─── Constants ─────────────────────────────────────────────────────────────
const FREE_PROJECT_LIMIT = 5;

// ─── DOM references ─────────────────────────────────────────────────────────
const projectSelect     = document.getElementById('projectSelect');
const newProjectBtn     = document.getElementById('newProjectBtn');
const deleteProjectBtn  = document.getElementById('deleteProjectBtn');

const emptyState        = document.getElementById('emptyState');
const projectForm       = document.getElementById('projectForm');
const activeProjectName = document.getElementById('activeProjectName');

const completedInput    = document.getElementById('completed');
const inProgressInput   = document.getElementById('inProgress');
const blockedInput      = document.getElementById('blocked');
const nextStepsInput    = document.getElementById('nextSteps');
const notesInput        = document.getElementById('notes');

const saveBtn           = document.getElementById('saveBtn');
const saveStatus        = document.getElementById('saveStatus');
const generateBtn       = document.getElementById('generateBtn');
const copyBtn           = document.getElementById('copyBtn');
const contextBox        = document.getElementById('contextBox');
const contextOutput     = document.getElementById('contextOutput');

const proFooter         = document.getElementById('proFooter');
const unlockBtn         = document.getElementById('unlockBtn');

// ─── App state (in memory while popup is open) ──────────────────────────────
let projects  = [];   // Array of project objects
let activeId  = null; // ID of the currently selected project

// ─── 1. Initialize: load everything from storage when popup opens ────────────
document.addEventListener('DOMContentLoaded', async () => {
  const data = await storageGet(['waypointProjects', 'waypointActiveId']);

  projects = data.waypointProjects || [];
  activeId = data.waypointActiveId || null;

  renderProjectDropdown();
  renderActiveProject();
});

// ─── 2. Create a new project ─────────────────────────────────────────────────
newProjectBtn.addEventListener('click', () => {
  // Enforce free tier limit
  if (projects.length >= FREE_PROJECT_LIMIT) {
    proFooter.classList.remove('hidden');
    return;
  }

  const name = prompt('Project name:');
  if (!name || !name.trim()) return;

  // Create a new project object with a unique ID
  const newProject = {
    id:         generateId(),
    name:       name.trim(),
    completed:  '',
    inProgress: '',
    blocked:    '',
    nextSteps:  '',
    notes:      '',
  };

  projects.push(newProject);
  activeId = newProject.id;

  saveAllProjects();
  renderProjectDropdown();
  renderActiveProject();
});

// ─── 3. Switch projects via the dropdown ─────────────────────────────────────
projectSelect.addEventListener('change', () => {
  const selected = projectSelect.value;
  if (!selected) {
    activeId = null;
    renderActiveProject();
    return;
  }

  activeId = selected;
  storageSet({ waypointActiveId: activeId });
  renderActiveProject();
});

// ─── 4. Delete the active project ────────────────────────────────────────────
deleteProjectBtn.addEventListener('click', () => {
  const project = getActiveProject();
  if (!project) return;

  const confirmed = confirm(`Delete "${project.name}"? This cannot be undone.`);
  if (!confirmed) return;

  // Remove from array
  projects = projects.filter(p => p.id !== activeId);

  // Switch to next available project, or none
  activeId = projects.length > 0 ? projects[0].id : null;

  saveAllProjects();
  renderProjectDropdown();
  renderActiveProject();

  // Hide pro footer if we're back under the limit
  if (projects.length < FREE_PROJECT_LIMIT) {
    proFooter.classList.add('hidden');
  }
});

// ─── 5. Save the current project's fields ────────────────────────────────────
saveBtn.addEventListener('click', () => {
  const project = getActiveProject();
  if (!project) return;

  // Update the project object with current field values
  project.completed  = completedInput.value.trim();
  project.inProgress = inProgressInput.value.trim();
  project.blocked    = blockedInput.value.trim();
  project.nextSteps  = nextStepsInput.value.trim();
  project.notes      = notesInput.value.trim();

  saveAllProjects();

  // Brief confirmation
  saveStatus.textContent = '✓ Saved';
  setTimeout(() => { saveStatus.textContent = ''; }, 2000);
});

// ─── 6. Generate the context block ───────────────────────────────────────────
generateBtn.addEventListener('click', () => {
  const project = getActiveProject();
  if (!project) return;

  const context = buildContextBlock(project);
  contextOutput.textContent = context;
  contextBox.classList.remove('hidden');
  copyBtn.disabled = false;
});

// ─── 7. Copy context to clipboard ────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const text = contextOutput.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = original; }, 1800);
  });
});

// ─── Pro upsell button (placeholder for now) ─────────────────────────────────
unlockBtn.addEventListener('click', () => {
  // TODO v3: open Stripe checkout or account creation flow
  alert('Pro coming soon! Unlimited projects + cloud sync across devices.');
});

// ─── Render helpers ───────────────────────────────────────────────────────────

/**
 * Rebuilds the project dropdown from the current `projects` array.
 */
function renderProjectDropdown() {
  // Clear existing options (except the placeholder)
  projectSelect.innerHTML = '<option value="">— select a project —</option>';

  projects.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    if (p.id === activeId) option.selected = true;
    projectSelect.appendChild(option);
  });
}

/**
 * Shows or hides the form based on whether there's an active project.
 * Populates fields if a project is active.
 */
function renderActiveProject() {
  const project = getActiveProject();

  if (!project) {
    // No project selected — show empty state
    emptyState.classList.remove('hidden');
    projectForm.classList.add('hidden');
    deleteProjectBtn.disabled = true;

    // Hide context box if it was open
    contextBox.classList.add('hidden');
    copyBtn.disabled = true;
    return;
  }

  // Project selected — show form, populate fields
  emptyState.classList.add('hidden');
  projectForm.classList.remove('hidden');
  deleteProjectBtn.disabled = false;

  activeProjectName.textContent = project.name;
  completedInput.value  = project.completed  || '';
  inProgressInput.value = project.inProgress || '';
  blockedInput.value    = project.blocked    || '';
  nextStepsInput.value  = project.nextSteps  || '';
  notesInput.value      = project.notes      || '';

  // Reset context box when switching projects
  contextBox.classList.add('hidden');
  copyBtn.disabled = true;
  saveStatus.textContent = '';
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Saves the full projects array and active ID to chrome.storage.local.
 */
function saveAllProjects() {
  storageSet({
    waypointProjects: projects,
    waypointActiveId: activeId,
  });
}

/**
 * Wraps chrome.storage.local.get in a Promise so we can use async/await.
 */
function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
}

/**
 * Wraps chrome.storage.local.set in a Promise.
 */
function storageSet(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve);
  });
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Returns the active project object, or null if none is selected.
 */
function getActiveProject() {
  if (!activeId) return null;
  return projects.find(p => p.id === activeId) || null;
}

/**
 * Generates a short random ID for a new project.
 */
function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Builds the formatted context string from a project object.
 * Skips empty sections so the output stays clean.
 */
function buildContextBlock(project) {
  function bulletList(raw) {
    if (!raw) return '';
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `• ${line}`)
      .join('\n');
  }

  const lines = [];
  lines.push(`Project: ${project.name}`);

  if (project.completed)  { lines.push(''); lines.push('Completed:');  lines.push(bulletList(project.completed)); }
  if (project.inProgress) { lines.push(''); lines.push('In Progress:'); lines.push(bulletList(project.inProgress)); }
  if (project.blocked)    { lines.push(''); lines.push('Blocked:');    lines.push(bulletList(project.blocked)); }
  if (project.nextSteps)  { lines.push(''); lines.push('Next Steps:'); lines.push(bulletList(project.nextSteps)); }
  if (project.notes)      { lines.push(''); lines.push('Notes:');      lines.push(bulletList(project.notes)); }

  lines.push('');
  lines.push('---');
  lines.push('Resume Instruction: Use this context to continue the project without asking me to re-explain completed work. First verify current state, then continue from the next step.');

  return lines.join('\n');
}
