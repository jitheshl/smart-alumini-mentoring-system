import {
  requireAuth, logout, createJob, getMyJobs, deleteJob,
  avatarHtml, formatDate, toast
} from '/js/api.js';

const user = requireAuth(['alumni']);
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

async function loadMyJobs() {
  const container = document.getElementById('my-jobs-list');
  try {
    const { jobs } = await getMyJobs();
    if (!jobs.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No jobs posted yet</h3>
        <p>Use the form to post your first opportunity</p>
      </div>`; return;
    }
    container.innerHTML = jobs.map(j => `
      <div class="job-card" style="margin-bottom:14px;">
        <div class="job-card-header">
          <div>
            <div class="job-card-title">${j.title}</div>
            <div class="job-card-company">🏢 ${j.company}</div>
          </div>
          <span class="badge ${j.type === 'internship' ? 'badge-info' : 'badge-accent'}">${j.type}</span>
        </div>
        <div class="job-card-desc">${j.description}</div>
        <div class="job-card-footer">
          <span class="text-xs text-muted">📅 ${formatDate(j.createdAt)} · 📍 ${j.location || 'Remote'}</span>
          <button class="btn btn-danger btn-sm delete-job-btn" data-id="${j._id}">🗑 Delete</button>
        </div>
      </div>`).join('');

    container.querySelectorAll('.delete-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this job listing?')) return;
        btn.disabled = true;
        try {
          await deleteJob(btn.dataset.id);
          toast.success('Job deleted');
          loadMyJobs();
        } catch (err) {
          toast.error(err.message);
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    toast.error('Failed to load jobs: ' + err.message);
  }
}

document.getElementById('post-job-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('post-job-btn');
  const title       = document.getElementById('job-title').value.trim();
  const company     = document.getElementById('job-company').value.trim();
  const description = document.getElementById('job-desc').value.trim();

  if (!title || !company || !description) {
    toast.warning('Title, company, and description are required'); return;
  }
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    await createJob({
      title, company, description,
      type:     document.getElementById('job-type').value,
      location: document.getElementById('job-location').value.trim() || 'Remote'
    });
    toast.success('Job posted successfully!');
    document.getElementById('post-job-form').reset();
    loadMyJobs();
  } catch (err) {
    toast.error(err.message);
  } finally {
    btn.disabled = false; btn.textContent = '📤 Post Opportunity';
  }
});

loadMyJobs();
