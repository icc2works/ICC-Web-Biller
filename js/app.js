// ===================== APP CORE UTILITIES =====================

function goTo(page) {
  window.location.href = page;
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount, sym = 'Rs.') {
  if (isNaN(amount)) return sym + '0';
  return sym + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: 'OK', error: '!', warning: '!', info: 'i' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'i'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href.includes(path));
  });
}

function startClock(elementId) {
  function update() {
    const el = document.getElementById(elementId);
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }
  update();
  setInterval(update, 60000);
}

function populateCustomerSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel || !window.Storage) return;
  const customers = Storage.getCustomers();
  sel.innerHTML = '<option value="">- Select Customer -</option>';
  customers.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.phone || 'No phone'})`;
    if (c.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function confirmAction(message, onConfirm) {
  if (window.confirm(message)) onConfirm();
}

function animateCount(el, target, prefix = 'Rs.', duration = 900) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = prefix + Math.round(start).toLocaleString('en-IN');
  }, 16);
}

function initTheme() {
  var settings = window.Storage && typeof Storage.getSettings === 'function' ? Storage.getSettings() : {};
  applyTheme(settings.theme || 'dark', false);
}

function applyTheme(theme, persist) {
  document.documentElement.setAttribute('data-theme', theme);
  applyCompanyTone();
  if (persist && window.Storage && typeof Storage.saveSettings === 'function') {
    var settings = Storage.getSettings();
    Storage.saveSettings({ ...settings, theme: theme });
  }
  var darkBtn = document.getElementById('themeDarkBtn');
  var lightBtn = document.getElementById('themeLightBtn');
  if (darkBtn && lightBtn) {
    darkBtn.classList.toggle('active', theme === 'dark');
    lightBtn.classList.toggle('active', theme === 'light');
  }
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark', true);
}

function setTheme(theme) {
  applyTheme(theme, true);
  if (typeof showToast === 'function') showToast((theme === 'dark' ? 'Dark' : 'Light') + ' theme applied', 'success');
}

function renderCompanySwitcher() {
  if (!window.Storage || typeof Storage.getCompanyProfiles !== 'function') return;
  
  // Only show switcher on Home page
  const isHomePage = /index\.html$|^ \/ $/.test(window.location.pathname) || document.body.classList.contains('simple-home');
  if (!isHomePage) return;

  if (document.getElementById('companySwitcher')) return;
  const profiles = Storage.getCompanyProfiles();
  if (!profiles || profiles.length < 2) return;

  const wrap = document.createElement('div');
  wrap.id = 'companySwitcher';
  wrap.className = 'company-switcher';

  const label = document.createElement('span');
  label.textContent = 'Company';

  const options = document.createElement('div');
  options.className = 'company-switch-options';
  profiles.forEach(profile => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'company-switch-option';
    btn.dataset.companyId = profile.id;
    btn.textContent = profile.label || profile.companyName || profile.id;
    btn.classList.toggle('active', profile.id === Storage.getActiveCompanyId());
    btn.addEventListener('click', () => switchCompanyWithEffect(profile.id));
    options.appendChild(btn);
  });

  wrap.appendChild(label);
  wrap.appendChild(options);
  document.body.appendChild(wrap);
}

function switchCompanyWithEffect(companyId) {
  if (!window.Storage || companyId === Storage.getActiveCompanyId()) return;
  const targetProfile = Storage.getCompanyProfiles().find(profile => profile.id === companyId);
  document.documentElement.setAttribute('data-switch-target', (targetProfile && targetProfile.colorTone) || companyId);
  document.body.classList.add('company-switching');
  setTimeout(() => {
    Storage.setActiveCompanyId(companyId);
    const active = Storage.getActiveCompanyProfile();
    applyCompanyTone();
    refreshActiveCompanyViews({ resetBillForm: true });
    showToast('Switched to ' + (active.label || active.companyName), 'success');
    setTimeout(() => {
      document.body.classList.remove('company-switching');
      document.documentElement.removeAttribute('data-switch-target');
    }, 540);
  }, 260);
}

function refreshCompanyLabels() {
  if (!window.Storage || typeof Storage.getSettings !== 'function') return;
  const settings = Storage.getSettings();
  document.querySelectorAll('.brand-name').forEach(el => { el.textContent = settings.companyName || 'Billing'; });
  document.querySelectorAll('.home-brand strong').forEach(el => { el.textContent = settings.companyName || 'Billing'; });
}

function applyCompanyTone() {
  if (!window.Storage || typeof Storage.getSettings !== 'function') return;
  const settings = Storage.getSettings();
  document.documentElement.setAttribute('data-company-tone', settings.colorTone || settings.activeCompanyId || 'icc');
}

function refreshCompanySwitcherState() {
  if (!window.Storage) return;
  document.querySelectorAll('.company-switch-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.companyId === Storage.getActiveCompanyId());
  });
}

function refreshActiveCompanyViews(options) {
  options = options || {};
  refreshCompanyLabels();
  refreshCompanySwitcherState();
  if (typeof updateBillingModeUI === 'function') updateBillingModeUI();
  if (typeof resetBillForm === 'function' && /create-bill\.html$/i.test(window.location.pathname || '')) {
    var activeBillingCompany = Storage.getActiveCompanyId();
    if (options.resetBillForm || (window._billingCompanyId && window._billingCompanyId !== activeBillingCompany)) {
      resetBillForm();
    }
    window._billingCompanyId = activeBillingCompany;
  }
  if (typeof loadDashboard === 'function') loadDashboard();
  if (typeof loadCustomers === 'function') loadCustomers(document.getElementById('customerSearch')?.value || '');
  if (typeof populateReportCustomerFilter === 'function') populateReportCustomerFilter();
  if (typeof loadReports === 'function') loadReports();
  if (typeof renderCatalog === 'function') renderCatalog();
  if (typeof refreshCatalogRows === 'function') refreshCatalogRows();
  if (typeof populateQuickItemCategories === 'function') populateQuickItemCategories(document.getElementById('quickItemCat')?.value || '');
  if (typeof loadSettings === 'function') loadSettings();
  if (typeof updateStorageStats === 'function') updateStorageStats();
  if (typeof populateCustomerSelect === 'function') {
    populateCustomerSelect('billCustomer', document.getElementById('billCustomer')?.value || '');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  applyCompanyTone();
  renderCompanySwitcher();
  refreshCompanyLabels();
  setActiveNav();
  startClock('navClock');
});

window.addEventListener('storage-cloud-ready', () => {
  initTheme();
  applyCompanyTone();
  refreshCompanyLabels();
  const switcher = document.getElementById('companySwitcher');
  if (switcher) switcher.remove();
  renderCompanySwitcher();
  refreshActiveCompanyViews();
});

window.addEventListener('active-company-changed', refreshCompanyLabels);
