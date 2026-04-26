import {
  requireAuth, logout, getProfile, updateProfile,
  avatarHtml, toast
} from '/js/api.js';

const user = requireAuth(['student']);
if (!user) throw new Error('Unauthorized');

document.getElementById('sb-name').textContent = user.name;
document.getElementById('sb-avatar').innerHTML = avatarHtml(user, 'sm');
document.getElementById('logout-btn').addEventListener('click', logout);

// Mobile sidebar
const sidebar = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
  sidebar.classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
});

let skills    = [];
let interests = [];
let projects  = [];

// ── Live preview ──────────────────────────────────────────────────
function updatePreview() {
  const name   = document.getElementById('p-name').value.trim();
  const branch = document.getElementById('p-branch').value.trim();
  const year   = document.getElementById('p-year').value;
  const cgpa   = document.getElementById('p-cgpa').value;
  const bio    = document.getElementById('p-bio').value.trim();
  const li     = document.getElementById('p-linkedin').value.trim();
  const gh     = document.getElementById('p-github').value.trim();

  document.getElementById('display-name').textContent = name || '—';
  document.getElementById('display-sub').textContent  = year || 'Student';
  document.getElementById('display-meta').textContent = branch ? `📖 ${branch}` : '';
  document.getElementById('display-cgpa').textContent = cgpa  || '—';
  document.getElementById('display-projects').textContent = projects.length;
  document.getElementById('display-bio').textContent  = bio || '';

  // Initials update
  const initEl = document.getElementById('photo-initials');
  if (initEl) {
    initEl.textContent = name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '👤';
  }

  // Interests preview tags
  const intEl = document.getElementById('display-interests');
  intEl.innerHTML = interests.slice(0, 5).map(i =>
    `<span class="tag" style="font-size:0.7rem;padding:3px 10px;background:var(--success-soft);border-color:rgba(0,212,170,0.2);color:var(--success);">${i}</span>`
  ).join('');

  // Social links
  const linksEl = document.getElementById('display-links');
  linksEl.innerHTML = '';
  if (li) {
    const a = document.createElement('a');
    a.href = li; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'profile-social-link'; a.title = 'LinkedIn';
    a.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
    linksEl.appendChild(a);
  }
  if (gh) {
    const a = document.createElement('a');
    a.href = gh; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'profile-social-link'; a.title = 'GitHub';
    a.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>';
    linksEl.appendChild(a);
  }
}

// Attach live preview listeners
['p-name','p-branch','p-year','p-cgpa','p-bio','p-linkedin','p-github'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', updatePreview);
  el.addEventListener('change', updatePreview);
});

// Bio counter
document.getElementById('p-bio').addEventListener('input', function () {
  document.getElementById('bio-counter').textContent = `${this.value.length} / 150`;
});

// ── Load profile ──────────────────────────────────────────────────
async function loadProfile() {
  try {
    const { user: u } = await getProfile();

    document.getElementById('p-name').value   = u.name   || '';
    document.getElementById('p-branch').value = u.branch || '';
    document.getElementById('p-year').value   = u.year   || '';
    document.getElementById('p-cgpa').value   = u.cgpa   != null ? u.cgpa : '';
    document.getElementById('p-bio').value    = u.bio    || '';
    document.getElementById('bio-counter').textContent = `${(u.bio||'').length} / 150`;
    document.getElementById('p-linkedin').value = u.links?.linkedin || '';
    document.getElementById('p-github').value   = u.links?.github   || '';

    skills    = Array.isArray(u.skills)    ? u.skills    : [];
    interests = Array.isArray(u.interests) ? u.interests : [];
    projects  = Array.isArray(u.projects)  ? u.projects  : [];

    // Profile photo
    if (u.profilePhoto) {
      document.getElementById('photo-preview').innerHTML =
        `<img src="${u.profilePhoto}" style="width:100%;height:100%;object-fit:cover;" alt="Photo">`;
    } else {
      document.getElementById('photo-initials').textContent =
        u.name ? u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '👤';
    }

    renderSkills();
    renderInterests();
    renderProjects();
    updatePreview();
  } catch (err) {
    toast.error('Failed to load profile: ' + err.message);
  }
}

// ── Photo preview ─────────────────────────────────────────────────
document.getElementById('photo-input').addEventListener('change', function () {
  if (!this.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('photo-preview').innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="Photo">`;
  };
  reader.readAsDataURL(this.files[0]);
});

// ── Skills ────────────────────────────────────────────────────────
function renderSkills() {
  const c = document.getElementById('skills-tags');
  c.innerHTML = skills.map((s, i) => `
    <span class="tag tag-removable">${s}
      <button class="tag-remove" type="button" data-index="${i}">✕</button>
    </span>`).join('');
  c.querySelectorAll('.tag-remove').forEach(b => b.addEventListener('click', () => {
    skills.splice(+b.dataset.index, 1); renderSkills();
  }));
  document.getElementById('skill-counter').textContent = `${skills.length} / 10 skills`;
}
document.getElementById('add-skill-btn').addEventListener('click', () => {
  const val = document.getElementById('skill-input').value.trim();
  if (!val) return;
  if (skills.length >= 10) { toast.warning('Maximum 10 skills allowed'); return; }
  if (!skills.includes(val)) { skills.push(val); renderSkills(); }
  document.getElementById('skill-input').value = '';
});
document.getElementById('skill-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('add-skill-btn').click(); }
});

// ── Interests ─────────────────────────────────────────────────────
function renderInterests() {
  const c = document.getElementById('interests-tags');
  c.innerHTML = interests.map((s, i) => `
    <span class="tag tag-removable" style="background:var(--success-soft);border-color:rgba(0,212,170,0.2);color:var(--success);">${s}
      <button class="tag-remove" type="button" data-index="${i}">✕</button>
    </span>`).join('');
  c.querySelectorAll('.tag-remove').forEach(b => b.addEventListener('click', () => {
    interests.splice(+b.dataset.index, 1); renderInterests(); updatePreview();
  }));
  document.getElementById('interest-counter').textContent = `${interests.length} interest${interests.length !== 1 ? 's' : ''} added`;
}
document.getElementById('add-interest-btn').addEventListener('click', () => {
  const val = document.getElementById('interest-input').value.trim();
  if (!val || interests.includes(val)) return;
  interests.push(val); renderInterests(); updatePreview();
  document.getElementById('interest-input').value = '';
});
document.getElementById('interest-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('add-interest-btn').click(); }
});

// ── Projects ──────────────────────────────────────────────────────
function renderProjects() {
  const container = document.getElementById('projects-list');
  if (!projects.length) {
    container.innerHTML = `<p class="text-muted text-sm" style="padding:16px 0;">No projects added yet. Click "Add a Project" below.</p>`;
    updatePreview();
    return;
  }
  container.innerHTML = projects.map((p, i) => `
    <div class="project-edit-card">
      <div class="project-edit-card-header">
        <span class="project-number">Project ${i + 1}</span>
        <button type="button" class="btn btn-danger btn-sm" data-del="${i}">🗑 Remove</button>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label">Title *</label>
        <input class="form-control" type="text" data-proj-title="${i}" value="${p.title || ''}" placeholder="e.g. Portfolio Website">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Description <span class="text-muted">(max 300 chars)</span></label>
        <textarea class="form-textarea" data-proj-desc="${i}" rows="2"
          maxlength="300" placeholder="Briefly describe what you built, the tech stack and your role…">${p.description || ''}</textarea>
      </div>
    </div>`).join('');

  container.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => { projects.splice(+btn.dataset.del, 1); renderProjects(); })
  );
  container.querySelectorAll('[data-proj-title]').forEach(inp =>
    inp.addEventListener('input', () => { projects[+inp.dataset.projTitle].title = inp.value; })
  );
  container.querySelectorAll('[data-proj-desc]').forEach(ta =>
    ta.addEventListener('input', () => { projects[+ta.dataset.projDesc].description = ta.value; })
  );
  updatePreview();
}
document.getElementById('add-project-btn').addEventListener('click', () => {
  if (projects.length >= 3) { toast.warning('Maximum 3 projects allowed'); return; }
  projects.push({ title: '', description: '' });
  renderProjects();
});

// ── Save ──────────────────────────────────────────────────────────
document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const btn     = document.getElementById('save-profile-btn');
  const barText = document.getElementById('save-bar-text');
  const name    = document.getElementById('p-name').value.trim();
  if (!name) { toast.warning('Full name is required'); return; }

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const fd = new FormData();
    const photoInput = document.getElementById('photo-input');
    if (photoInput.files[0]) fd.append('profilePhoto', photoInput.files[0]);

    fd.append('name',      name);
    fd.append('branch',    document.getElementById('p-branch').value.trim());
    fd.append('year',      document.getElementById('p-year').value);
    fd.append('cgpa',      document.getElementById('p-cgpa').value || '');
    fd.append('bio',       document.getElementById('p-bio').value.trim());
    fd.append('skills',    JSON.stringify(skills));
    fd.append('interests', JSON.stringify(interests));
    fd.append('projects',  JSON.stringify(projects));
    fd.append('links',     JSON.stringify({
      linkedin: document.getElementById('p-linkedin').value.trim(),
      github:   document.getElementById('p-github').value.trim()
    }));

    const { user: updated } = await updateProfile(fd);

    // Sync sidebar name & localStorage cache
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...stored, ...updated }));
    document.getElementById('sb-name').textContent = updated.name;

    toast.success('Profile saved successfully! ✓');
    barText.textContent = 'All changes saved ✓';
    barText.style.color = 'var(--success)';
    setTimeout(() => {
      barText.textContent = 'Changes are not saved yet';
      barText.style.color = '';
    }, 4000);
  } catch (err) {
    toast.error('Save failed: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = '💾 Save Changes';
  }
});

loadProfile();
