import { resetPassword } from './api.js';

const form = document.getElementById('reset-form');
const alert = document.getElementById('auth-alert');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');

// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
  showAlert('Invalid or missing reset token. Please request a new link.', 'error');
  form.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword.length < 6) {
    showAlert('Password must be at least 6 characters', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert('Passwords do not match', 'error');
    return;
  }

  setLoading(true);
  try {
    const data = await resetPassword(token, newPassword, confirmPassword);
    if (data.success) {
      showAlert(data.message, 'success');
      form.style.display = 'none';
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    setLoading(false);
  }
});

function showAlert(msg, type) {
  alert.textContent = msg;
  alert.className = `auth-alert show ${type}`;
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Resetting...' : 'Reset Password';
}
