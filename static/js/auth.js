/* ============================================================
   AUTH.JS — Login / Signup / Session Management
   Flight Oracle
============================================================ */

let currentUser = null;

// ── INIT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      hideAuthOverlay();
      updateUIForUser(data.user);
    } else {
      showAuthOverlay();
    }
  } catch {
    showAuthOverlay();
  }

  // Live clock
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const el = document.getElementById('live-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ── OVERLAY ───────────────────────────────────────────────
function showAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('hidden');
}
function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.add('hidden');
}

function switchAuth(mode) {
  document.getElementById('login-form').classList.toggle('active', mode === 'login');
  document.getElementById('signup-form').classList.toggle('active', mode === 'signup');
  clearErrors();
}

function clearErrors() {
  document.getElementById('login-error').textContent = '';
  document.getElementById('signup-error').textContent = '';
}

function togglePw(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      hideAuthOverlay();
      updateUIForUser(data.user);
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}! ✈️`, 'success');
    } else {
      errEl.textContent = data.error;
    }
  } catch {
    errEl.textContent = 'Server error. Please try again.';
  }
}

// ── SIGNUP ────────────────────────────────────────────────
async function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');

  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  try {
    const res = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      hideAuthOverlay();
      updateUIForUser(data.user);
      showToast(`Account created! Welcome, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
    } else {
      errEl.textContent = data.error;
    }
  } catch {
    errEl.textContent = 'Server error. Please try again.';
  }
}

// ── GUEST ─────────────────────────────────────────────────
function skipAuth() {
  currentUser = null;
  hideAuthOverlay();
  updateUIForUser(null);
  showToast('Continuing as guest — sign up to save your history!', 'info');
}

// ── LOGOUT ────────────────────────────────────────────────
async function doLogout() {
  try {
    await fetch('/auth/logout', { method: 'POST' });
  } catch {}
  currentUser = null;
  updateUIForUser(null);
  closeProfile();
  showToast('Signed out successfully.', 'info');
}

// ── UI UPDATE ─────────────────────────────────────────────
function updateUIForUser(user) {
  const avatar = document.getElementById('profile-avatar');
  const name = document.getElementById('profile-name');
  const sub = document.getElementById('profile-sub');
  const drawAvatar = document.getElementById('drawer-avatar');
  const drawName = document.getElementById('drawer-name');
  const drawEmail = document.getElementById('drawer-email');

  if (user) {
    const initials = user.avatar_initials || user.name.substring(0, 2).toUpperCase();
    if (avatar) avatar.textContent = initials;
    if (name) name.textContent = user.name;
    if (sub) sub.textContent = user.email;
    if (drawAvatar) drawAvatar.textContent = initials;
    if (drawName) drawName.textContent = user.name;
    if (drawEmail) drawEmail.textContent = user.email;

    // Drawer stats
    const dsSearches = document.getElementById('ds-searches');
    const dsFavs = document.getElementById('ds-favs');
    const dsChats = document.getElementById('ds-chats');
    if (dsSearches) dsSearches.textContent = user.total_searches || 0;
    if (dsFavs) dsFavs.textContent = (user.favorite_routes || []).length;
    if (dsChats) dsChats.textContent = (user.chat_history || []).length;

    // Settings
    const settingsName = document.getElementById('settings-name');
    if (settingsName) settingsName.value = user.name;

    // History
    renderHistory(user.predictions || []);
    renderFavorites(user.favorite_routes || []);
  } else {
    if (avatar) avatar.textContent = '?';
    if (name) name.textContent = 'Guest';
    if (sub) sub.textContent = 'Click to sign in';
    if (drawAvatar) drawAvatar.textContent = '?';
    if (drawName) drawName.textContent = 'Guest';
    if (drawEmail) drawEmail.textContent = 'Not signed in';
  }
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;

  const colors = { success: '#22d37a', info: '#6c8dff', warn: '#f59e0b', error: '#ff4f6a' };
  toast.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:var(--surface); border:1px solid ${colors[type]||colors.info};
    color:var(--text); border-radius:24px; padding:12px 24px;
    font-size:13px; font-weight:500; z-index:9999;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);
    animation:toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
  `;

  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Enter key on auth forms ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (loginForm && loginForm.classList.contains('active')) doLogin();
    else if (signupForm && signupForm.classList.contains('active')) doSignup();
  }
});

async function saveSettings() {
  const name = document.getElementById('settings-name').value.trim();
  if (!name) return;
  try {
    const res = await fetch('/auth/update_profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateUIForUser(data.user);
      showToast('Profile updated!', 'success');
    }
  } catch {}
}
