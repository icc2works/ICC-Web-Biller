// ===================== APP CORE UTILITIES =====================

// ---- Navigation ----
function goTo(page) {
  window.location.href = page;
}

// ---- Date Utilities ----
function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount, sym = '₹') {
  if (isNaN(amount)) return sym + '0';
  return sym + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ---- Toast Notifications ----
function showToast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- Modal Helpers ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ---- Active Nav Link ----
function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href.includes(path));
  });
}

// ---- Live Clock ----
function startClock(elementId) {
  function update() {
    const el = document.getElementById(elementId);
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }
  update();
  setInterval(update, 60000);
}

// ---- Customer select populate ----
function populateCustomerSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const customers = Storage.getCustomers();
  sel.innerHTML = '<option value="">— Select Customer —</option>';
  customers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.phone || 'No phone'})`;
    if (c.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ---- Confirm Dialog ----
function confirmAction(message, onConfirm) {
  if (window.confirm(message)) onConfirm();
}

// ---- Animate count up ----
function animateCount(el, target, prefix = '₹', duration = 900) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = prefix + Math.round(start).toLocaleString('en-IN');
  }, 16);
}

// ---- Theme Management ----
function initTheme() {
  var saved = localStorage.getItem('cnc_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('cnc_theme', theme);
  // Update toggle buttons if they exist on the page
  var darkBtn = document.getElementById('themeDarkBtn');
  var lightBtn = document.getElementById('themeLightBtn');
  if (darkBtn && lightBtn) {
    darkBtn.classList.toggle('active', theme === 'dark');
    lightBtn.classList.toggle('active', theme === 'light');
  }
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function setTheme(theme) {
  applyTheme(theme);
  if (typeof showToast === 'function') {
    showToast((theme === 'dark' ? '🌙 Dark' : '☀️ Light') + ' theme applied', 'success');
  }
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setActiveNav();
  startClock('navClock');
});
