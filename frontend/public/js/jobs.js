import { requireAuth, logout, getJobs, avatarHtml, formatDate, toast } from '/js/api.js';

const user = requireAuth(['student', 'alumni', 'admin']);
if (!user) throw new Error('Unauthorized');

document.getElementById('sb-name').textContent = user.name;
document.getElementById('sb-avatar').innerHTML = avatarHtml(user, 'sm');
document.getElementById('logout-btn').addEventListener('click', logout);

const sidebar = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
  sidebar.classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
});

let allJobs = [];
let currentType = 'all';
let searchQ = '';

function renderJobs(jobs) {
  const grid = document.getElementById('jobs-grid');
  if (!jobs.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon">💼</div>
      <h3>No jobs found</h3>
      <p>Check back later for new opportunities</p>
    </div>`;
    return;
  }
  grid.innerHTML = jobs.map(j => `
    <div class="job-card">
      <div class="job-card-header">
        <div>
          <div class="job-card-title">${j.title}</div>
          <div class="job-card-company">🏢 ${j.company}</div>
        </div>
        <span class="badge ${j.type === 'internship' ? 'badge-info' : 'badge-accent'}">${j.type}</span>
      </div>
      <div class="job-card-desc">${j.description}</div>
      <div class="job-card-footer">
        <div class="job-card-meta">
          ${j.postedBy?.name ? `<span>👤 ${j.postedBy.name}</span>` : ''}
        </div>
        <div class="job-card-meta">
          📅 ${formatDate(j.createdAt)}
        </div>
      </div>
    </div>`).join('');
}

function applyFilters() {
  let filtered = allJobs;
  if (currentType !== 'all') filtered = filtered.filter(j => j.type === currentType);
  if (searchQ) {
    filtered = filtered.filter(j =>
      j.title?.toLowerCase().includes(searchQ) ||
      j.company?.toLowerCase().includes(searchQ) ||
      j.description?.toLowerCase().includes(searchQ)
    );
  }
  renderJobs(filtered);
}

document.getElementById('search-input').addEventListener('input', function () {
  searchQ = this.value.toLowerCase();
  applyFilters();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    applyFilters();
  });
});

async function load() {
  try {
    const { jobs } = await getJobs();
    allJobs = jobs || [];
    renderJobs(allJobs);
  } catch (err) {
    toast.error('Failed to load jobs: ' + err.message);
  }
}

load();
