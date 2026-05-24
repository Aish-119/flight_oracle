/* ============================================================
   PROFILE.JS — Drawer, History, Favorites, Settings
   Flight Oracle
============================================================ */

// ── OPEN / CLOSE DRAWER ───────────────────────────────────
function openProfile() {
  const drawer = document.getElementById('profile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  drawer.classList.add('open');
  overlay.classList.add('active');

  // Refresh data if user is logged in
  if (typeof currentUser !== 'undefined' && currentUser) {
    refreshProfileData();
  }
}

function closeProfile() {
  const drawer = document.getElementById('profile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  drawer.classList.remove('open');
  overlay.classList.remove('active');
}

// ── DRAWER TABS ───────────────────────────────────────────
function switchDrawerTab(tab) {
  // Tab buttons
  document.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`[onclick="switchDrawerTab('${tab}')"]`);
  if (activeTab) activeTab.classList.add('active');

  // Tab content
  document.getElementById('drawer-history').classList.add('hidden');
  document.getElementById('drawer-favorites').classList.add('hidden');
  document.getElementById('drawer-settings').classList.add('hidden');
  document.getElementById(`drawer-${tab}`).classList.remove('hidden');
}

// ── REFRESH DATA ──────────────────────────────────────────
async function refreshProfileData() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateUIForUser(data.user);
      renderHistory(data.user.predictions || []);
      renderFavorites(data.user.favorite_routes || []);
    }
  } catch {}
}

// ── RENDER HISTORY ────────────────────────────────────────
function renderHistory(predictions) {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (!predictions || predictions.length === 0) {
    list.innerHTML = '<div class="empty-state">No predictions yet.<br>Run a prediction to see history here.</div>';
    return;
  }

  list.innerHTML = predictions.map(p => {
    const input = p.input || {};
    const route = `${input.source_city || '?'} → ${input.destination_city || '?'}`;
    const airline = input.airline || '—';
    const cls = input.class || '—';
    const stops = formatStops(input.stops);
    const date = formatRelativeTime(p.timestamp);
    const tierColor = { budget: '#22d37a', moderate: '#6c8dff', premium: '#f59e0b', luxury: '#ff4f6a' };
    const color = tierColor[p.tier] || '#6c8dff';

    return `
      <div class="history-item" style="border-left: 3px solid ${color}; cursor:default;">
        <div class="history-route">${route}</div>
        <div class="history-price">${p.formatted}</div>
        <div class="history-meta">${airline} · ${cls} · ${stops} · ${date}</div>
      </div>
    `;
  }).join('');
}

// ── RENDER FAVORITES ──────────────────────────────────────
function renderFavorites(favorites) {
  const list = document.getElementById('fav-list');
  if (!list) return;

  if (!favorites || favorites.length === 0) {
    list.innerHTML = '<div class="empty-state">No saved routes yet.<br>Save a route from the Predictor tab.</div>';
    return;
  }

  list.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:8px;">
      ${favorites.map(r => `
        <div class="fav-chip">
          <span>✈</span>
          <span>${r}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ── HELPERS ───────────────────────────────────────────────
function formatStops(stops) {
  if (!stops) return '—';
  if (stops === 'zero') return 'Direct';
  if (stops === 'one') return '1 Stop';
  return '2+ Stops';
}

function formatRelativeTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const date = new Date(isoStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

// ── ESC KEY to close drawer ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProfile();
    // Also close chat if open
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel && chatPanel.classList.contains('open')) {
      toggleChat();
    }
  }
});
