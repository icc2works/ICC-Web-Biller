// ===================== STORAGE MODULE =====================
// Centralized storage abstraction for all data operations.
// Data is stored exclusively in CloudDB (Firebase Realtime Database).
// An in-memory cache is used for fast synchronous reads.

const KEYS = {
  CUSTOMERS: 'cnc_customers',
  BILLS: 'cnc_bills',
  SETTINGS: 'cnc_settings',
  BILL_SEQ: 'cnc_bill_sequence',
  INVOICE_TEMPLATE: 'cnc_invoice_template',
  ADMIN_PASSWORD: 'cnc_admin_password'
};

const SYNC_KEYS = [KEYS.CUSTOMERS, KEYS.BILLS, KEYS.SETTINGS, KEYS.BILL_SEQ, KEYS.INVOICE_TEMPLATE, KEYS.ADMIN_PASSWORD];
const DEFAULT_COMPANY_ID = 'icc';

// ===================== DEFAULT ITEM CATALOG =====================
const DEFAULT_CATALOG = {
  "Door": [
    { name: "Single Door", price: 4500 },
    { name: "Double Door", price: 4000 },
    { name: "Swamy Door", price: 8000 },
    { name: "Pavai Door", price: 4500 },
    { name: "Kaveri Pavai Door", price: 8000 },
    { name: "Mayil Door", price: 4500 },
    { name: "Panel Door", price: 4500 }
  ],
  "Jannel": [
    { name: "Jannel Set", price: 2800 },
    { name: "Jannel Sillu", price: 800 }
  ],
  "Bero": [
    { name: "Bero Door", price: 1500 },
    { name: "Bero Top", price: 500 },
    { name: "Bero Side", price: 500 }
  ],
  "Vasamalai": [
    { name: "Vasamalai", price: 3600 },
    { name: "Vasamalai Side", price: 3200 },
    { name: "5 pcs AT Vasamalai", price: 4000 }
  ],
  "Sofa": [
    { name: "Sofa", price: 700 }
  ],
  "Ventilator": [
    { name: "Gajalakshmi", price: 3500 },
    { name: "3 Swamy", price: 6000 },
    { name: "Thirukudumbam", price: 4500 },
    { name: "Letter", price: 2500 }
  ],
  "Vasamalai Top": [
    { name: "VM Top Gajalakshmi", price: 4500 },
    { name: "VM Top 3 Swamy Yanai", price: 7500 },
    { name: "VM Top Thirukudumbam", price: 5000 },
    { name: "VM Top Letter", price: 2500 },
    { name: "VM Top Flower", price: 1500 }
  ],
  "Kattil": [
    { name: "Kattil Top", price: 0 },
    { name: "Kattil Bottom", price: 0 }
  ],
  "CNC Cutting": [
    { name: "CNC Cutting 1", price: 0 }
  ]
};

const DEFAULT_INVOICE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywJJGgEbpwMxQjPAHRh2cCmI-UpFZAZZpg6kYs4WGD_UHaYwdBADr162gVdLvXPW7RFg/exec';
const OLD_CARVINO_INVOICE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwyindIJu6i6kYiUpUW1uXoechVjWmDxpqpZqaM6vKHEo6Kl34lk1K5AHBPj95fvk7ktg/exec';
const CARVINO_INVOICE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYQ-Wps0lYkeocemJ9dVRneRLpWR-rpYbMyYqAJaa6_aJZJvgKM1voETrSFejrgw43rA/exec';
const CARVINO_CATALOG = {
  "CNC Cutting": [
    { name: "WPC", price: 0 },
    { name: "ACP", price: 0 },
    { name: "Plywood", price: 0 },
    { name: "Korean sheet", price: 0 },
    { name: "Milk White Sheet", price: 0 }
  ],
  "Laser Cutting": [
    { name: "MS", price: 0 },
    { name: "Sheet", price: 0 }
  ]
};

const DEFAULT_COMPANY_PROFILE = {
  id: DEFAULT_COMPANY_ID,
  label: 'ICC',
  companyName: 'Indian CNC Carving',
  companyAddress: '45, French Teacher St,\nKaraikal, Puducherry 609602',
  companyPhone: '8870415956',
  companyPhone2: '9786876576',
  website: 'https://indiancnccarving.com/',
  companyGST: '',
  billPrefix: 'ICC',
  colorTone: 'icc',
  invoiceScriptUrl: DEFAULT_INVOICE_SCRIPT_URL,
  itemCatalog: DEFAULT_CATALOG
};

const SECOND_COMPANY_PROFILE = {
  id: 'company2',
  label: 'Carvino',
  companyName: 'Carvino',
  companyAddress: '',
  companyPhone: '',
  companyPhone2: '',
  website: '',
  companyGST: '',
  billPrefix: 'CNO',
  colorTone: 'carvino',
  invoiceScriptUrl: CARVINO_INVOICE_SCRIPT_URL,
  itemCatalog: CARVINO_CATALOG
};

// ===================== IN-MEMORY CACHE =====================
// All reads go through this cache. Writes update both the cache and CloudDB.
const _cache = {};

function cloneCatalog(catalog) {
  return JSON.parse(JSON.stringify(catalog || DEFAULT_CATALOG));
}

function normalizeCarvinoCatalog(existingCatalog) {
  const existing = existingCatalog || {};
  const catalog = cloneCatalog(CARVINO_CATALOG);
  Object.keys(catalog).forEach(function(category) {
    catalog[category] = catalog[category].map(function(item) {
      var saved = existing[category] && existing[category].find(function(oldItem) {
        return oldItem && oldItem.name === item.name;
      });
      return saved ? { ...item, price: Number(saved.price || 0) } : item;
    });
  });
  Object.keys(existing).forEach(function(category) {
    if (!catalog[category]) catalog[category] = cloneCatalog(existing[category]);
  });
  return catalog;
}

function normalizeCompanyProfile(profile, index) {
  const base = index === 0 ? DEFAULT_COMPANY_PROFILE : SECOND_COMPANY_PROFILE;
  const normalized = {
    ...base,
    ...profile,
    id: profile.id || base.id || 'company' + (index + 1),
    label: profile.label || base.label,
    itemCatalog: cloneCatalog(profile.itemCatalog || base.itemCatalog || DEFAULT_CATALOG)
  };

  if (normalized.id === DEFAULT_COMPANY_ID && (!normalized.label || normalized.label === 'Company 1')) {
    normalized.label = 'ICC';
  }
  if (normalized.id === 'company2') {
    if (!normalized.label || normalized.label === 'Company 2') normalized.label = 'Carvino';
    if (!normalized.companyName || normalized.companyName === 'Second Company') normalized.companyName = 'Carvino';
    if (!normalized.billPrefix || normalized.billPrefix === 'C2' || normalized.billPrefix === 'CAR') normalized.billPrefix = 'CNO';
    if (!normalized.invoiceScriptUrl || normalized.invoiceScriptUrl === OLD_CARVINO_INVOICE_SCRIPT_URL) {
      normalized.invoiceScriptUrl = CARVINO_INVOICE_SCRIPT_URL;
    }
    normalized.itemCatalog = normalizeCarvinoCatalog(profile.itemCatalog);
    normalized.colorTone = 'carvino';
  }
  if (normalized.id === DEFAULT_COMPANY_ID) normalized.colorTone = 'icc';

  return normalized;
}

function getRememberedActiveCompanyId() {
  try {
    return window.localStorage && window.localStorage.getItem('cnc_active_company_id');
  } catch (e) {
    return null;
  }
}

function rememberActiveCompanyId(companyId) {
  try {
    if (window.localStorage && companyId) window.localStorage.setItem('cnc_active_company_id', companyId);
  } catch (e) {}
}

const Storage = {
  cloudReady: false,
  _lastCloudWrite: Promise.resolve(),

  // ---- GENERIC (in-memory cache) ----
  get(key, fallback = null) {
    try {
      const val = _cache[key];
      return val !== undefined && val !== null ? val : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      _cache[key] = value;
      this._saveToCloud(key, value);
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  },

  remove(key) {
    delete _cache[key];
    if (window.CloudDB) {
      this._lastCloudWrite = window.CloudDB.removeData(key).catch(error => {
        console.error('Cloud DB remove failed:', error);
        return false;
      });
    }
  },

  _saveToCloud(key, value) {
    if (!SYNC_KEYS.includes(key) || !window.CloudDB) return Promise.resolve(false);
    this._lastCloudWrite = window.CloudDB.setData(key, value).catch(error => {
      console.error('Cloud DB save failed:', error);
      return false;
    });
    return this._lastCloudWrite;
  },

  whenCloudIdle() {
    return this._lastCloudWrite || Promise.resolve();
  },

  getLocalCloudPayload() {
    return SYNC_KEYS.reduce((out, key) => {
      const value = this.get(key, null);
      if (value !== null && value !== undefined) out[key] = value;
      return out;
    }, {});
  },

  mergeListsById(localList, cloudList) {
    const map = new Map();
    (cloudList || []).forEach(item => { if (item && item.id) map.set(item.id, item); });
    (localList || []).forEach(item => { if (item && item.id) map.set(item.id, { ...map.get(item.id), ...item }); });
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  mergeCloudPayload(localData, cloudData) {
    const merged = { ...(cloudData || {}), ...(localData || {}) };
    merged[KEYS.CUSTOMERS] = this.mergeListsById(localData[KEYS.CUSTOMERS], cloudData && cloudData[KEYS.CUSTOMERS]);
    merged[KEYS.BILLS] = this.mergeListsById(localData[KEYS.BILLS], cloudData && cloudData[KEYS.BILLS]);
    const cloudSettings = (cloudData && cloudData[KEYS.SETTINGS]) || {};
    const localSettings = (localData && localData[KEYS.SETTINGS]) || {};
    merged[KEYS.SETTINGS] = {
      ...cloudSettings,
      ...localSettings,
      companySequences: {
        ...(cloudSettings.companySequences || {}),
        ...(localSettings.companySequences || {})
      }
    };
    merged[KEYS.BILL_SEQ] = Math.max(
      Number(localData[KEYS.BILL_SEQ] || 0),
      Number(cloudData && cloudData[KEYS.BILL_SEQ] || 0)
    );
    if (localData[KEYS.INVOICE_TEMPLATE] === undefined && cloudData && cloudData[KEYS.INVOICE_TEMPLATE] !== undefined) {
      merged[KEYS.INVOICE_TEMPLATE] = cloudData[KEYS.INVOICE_TEMPLATE];
    }
    return merged;
  },

  applyCloudPayload(data) {
    try {
      SYNC_KEYS.forEach(key => {
        if (data && data[key] !== undefined && data[key] !== null) _cache[key] = data[key];
      });
    } catch (e) {
      console.error('Error applying cloud payload:', e);
    }
  },

  async initCloudSync() {
    if (!window.CloudDB) return false;
    const connected = await window.CloudDB.init();
    if (!connected) return false;

    const cloudData = await window.CloudDB.getAll();
    if (cloudData) this.applyCloudPayload(cloudData);

    window.CloudDB.subscribe(data => {
      this.applyCloudPayload(data || {});
      window.dispatchEvent(new CustomEvent('storage-cloud-ready', { detail: window.CloudDB.status() }));
    });

    this.cloudReady = true;
    window.dispatchEvent(new CustomEvent('storage-cloud-ready', { detail: window.CloudDB.status() }));
    return true;
  },

  // ---- COMPANY PROFILES ----
  getRawSettings() {
    const saved = this.get(KEYS.SETTINGS, null) || {};
    const legacyProfile = {
      ...DEFAULT_COMPANY_PROFILE,
      companyName: saved.companyName || DEFAULT_COMPANY_PROFILE.companyName,
      companyAddress: saved.companyAddress || DEFAULT_COMPANY_PROFILE.companyAddress,
      companyPhone: saved.companyPhone || DEFAULT_COMPANY_PROFILE.companyPhone,
      companyPhone2: saved.companyPhone2 || DEFAULT_COMPANY_PROFILE.companyPhone2,
      website: saved.website || DEFAULT_COMPANY_PROFILE.website,
      companyGST: saved.companyGST || '',
      billPrefix: saved.billPrefix || DEFAULT_COMPANY_PROFILE.billPrefix,
      invoiceScriptUrl: saved.invoiceScriptUrl || DEFAULT_INVOICE_SCRIPT_URL,
      itemCatalog: cloneCatalog(saved.itemCatalog || DEFAULT_CATALOG)
    };
    const sourceProfiles = Array.isArray(saved.companyProfiles) && saved.companyProfiles.length
      ? saved.companyProfiles
      : [legacyProfile, SECOND_COMPANY_PROFILE];
    const companyProfiles = sourceProfiles.map((profile, index) => normalizeCompanyProfile(profile || {}, index));

    if (!companyProfiles.find(p => p.id === DEFAULT_COMPANY_ID)) companyProfiles.unshift(legacyProfile);
    if (companyProfiles.length < 2) companyProfiles.push({ ...SECOND_COMPANY_PROFILE, itemCatalog: cloneCatalog(DEFAULT_CATALOG) });

    const rememberedActiveCompanyId = getRememberedActiveCompanyId();
    const requestedActiveCompanyId = rememberedActiveCompanyId || saved.activeCompanyId;
    const activeCompanyId = companyProfiles.find(p => p.id === requestedActiveCompanyId)
      ? requestedActiveCompanyId
      : companyProfiles[0].id;
    const legacySeq = Number(this.get(KEYS.BILL_SEQ, 0)) || 0;

    return {
      theme: saved.theme || 'dark',
      currency: saved.currency || 'Rs.',
      defaultRate: saved.defaultRate || '',
      taxRate: saved.taxRate || 0,
      qrCode: saved.qrCode || '',
      activeCompanyId,
      companyProfiles,
      companySequences: { [DEFAULT_COMPANY_ID]: legacySeq, ...(saved.companySequences || {}) }
    };
  },

  saveRawSettings(settings) {
    if (settings && settings.activeCompanyId) rememberActiveCompanyId(settings.activeCompanyId);
    return this.set(KEYS.SETTINGS, settings);
  },

  getCompanyProfiles() {
    return this.getRawSettings().companyProfiles;
  },

  getActiveCompanyId() {
    return this.getRawSettings().activeCompanyId || DEFAULT_COMPANY_ID;
  },

  getActiveCompanyProfile() {
    const raw = this.getRawSettings();
    return raw.companyProfiles.find(p => p.id === raw.activeCompanyId) || raw.companyProfiles[0] || DEFAULT_COMPANY_PROFILE;
  },

  belongsToActiveCompany(record) {
    return (record && (record.companyId || DEFAULT_COMPANY_ID)) === this.getActiveCompanyId();
  },

  setActiveCompanyId(companyId) {
    const raw = this.getRawSettings();
    if (!raw.companyProfiles.find(p => p.id === companyId)) return false;
    rememberActiveCompanyId(companyId);
    this.saveRawSettings({ ...raw, activeCompanyId: companyId });
    window.dispatchEvent(new CustomEvent('active-company-changed', { detail: { companyId } }));
    return true;
  },

  getBillSequence(companyId) {
    const raw = this.getRawSettings();
    return Number(raw.companySequences[companyId || raw.activeCompanyId] || 0);
  },

  setBillSequence(companyId, sequence) {
    const raw = this.getRawSettings();
    const targetId = companyId || raw.activeCompanyId;
    const companySequences = { ...raw.companySequences, [targetId]: Number(sequence) || 0 };
    if (targetId === DEFAULT_COMPANY_ID) this.set(KEYS.BILL_SEQ, Number(sequence) || 0);
    return this.saveRawSettings({ ...raw, companySequences });
  },

  previewBillNumber(sequence) {
    const now = new Date();
    const activeId = this.getActiveCompanyId();
    if (activeId === 'company2') {
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      return 'CNO-' + yy + mm + '-' + String(sequence).padStart(3, '0');
    }
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = (this.getActiveCompanyProfile().billPrefix || 'INV').trim() || 'INV';
    return prefix + '-' + mm + dd + '-' + String(sequence).padStart(3, '0');
  },

  // ---- CUSTOMERS ----
  getAllCustomers() {
    return this.get(KEYS.CUSTOMERS, []);
  },

  getCustomers() {
    return this.getAllCustomers().filter(c => this.belongsToActiveCompany(c));
  },

  saveAllCustomers(list) {
    return this.set(KEYS.CUSTOMERS, Array.isArray(list) ? list : []);
  },

  saveCustomers(list) {
    const activeId = this.getActiveCompanyId();
    const others = this.getAllCustomers().filter(c => (c.companyId || DEFAULT_COMPANY_ID) !== activeId);
    const active = (Array.isArray(list) ? list : []).map(c => ({ ...c, companyId: c.companyId || activeId }));
    return this.saveAllCustomers(others.concat(active));
  },

  addCustomer(customer) {
    const list = this.getAllCustomers();
    customer.id = 'CUST-' + Date.now();
    customer.companyId = this.getActiveCompanyId();
    customer.createdAt = new Date().toISOString();
    list.push(customer);
    this.saveAllCustomers(list);
    return customer;
  },

  updateCustomer(id, data) {
    const list = this.getAllCustomers();
    const idx = list.findIndex(c => c.id === id);
    if (idx > -1) { list[idx] = { ...list[idx], ...data }; this.saveAllCustomers(list); }
  },

  deleteCustomer(id) {
    this.saveAllCustomers(this.getAllCustomers().filter(c => c.id !== id));
  },

  getCustomerById(id) {
    return this.getAllCustomers().find(c => c.id === id && this.belongsToActiveCompany(c)) || null;
  },

  // ---- BILLS ----
  getAllBills() {
    return this.get(KEYS.BILLS, []);
  },

  getBills() {
    return this.getAllBills().filter(b => this.belongsToActiveCompany(b));
  },

  saveAllBills(list) {
    return this.set(KEYS.BILLS, Array.isArray(list) ? list : []);
  },

  saveBills(list) {
    const activeId = this.getActiveCompanyId();
    const others = this.getAllBills().filter(b => (b.companyId || DEFAULT_COMPANY_ID) !== activeId);
    const active = (Array.isArray(list) ? list : []).map(b => ({ ...b, companyId: b.companyId || activeId }));
    return this.saveAllBills(others.concat(active));
  },

  getNextBillNumber() {
    const activeId = this.getActiveCompanyId();
    const seq = this.getBillSequence(activeId) + 1;
    this.setBillSequence(activeId, seq);
    return this.previewBillNumber(seq);
  },

  addBill(bill) {
    const list = this.getAllBills();
    bill.id = 'BILL-' + Date.now();
    bill.companyId = this.getActiveCompanyId();
    bill.billNo = this.getNextBillNumber();
    bill.createdAt = new Date().toISOString();
    bill.status = bill.status || 'paid';
    list.unshift(bill);
    this.saveAllBills(list);
    return bill;
  },

  updateBill(id, data) {
    const list = this.getAllBills();
    const idx = list.findIndex(b => b.id === id);
    if (idx > -1) { list[idx] = { ...list[idx], ...data }; this.saveAllBills(list); }
  },

  deleteBill(id) {
    this.saveAllBills(this.getAllBills().filter(b => b.id !== id));
  },

  getBillById(id) {
    return this.getAllBills().find(b => b.id === id && this.belongsToActiveCompany(b)) || null;
  },

  // ---- SETTINGS (active company + global appearance) ----
  getSettings() {
    const raw = this.getRawSettings();
    const profile = this.getActiveCompanyProfile();
    return { ...raw, ...profile, itemCatalog: cloneCatalog(profile.itemCatalog || DEFAULT_CATALOG) };
  },

  saveSettings(settings) {
    const raw = this.getRawSettings();
    const activeId = settings.activeCompanyId || raw.activeCompanyId;
    const companyFields = [
      'label', 'companyName', 'companyAddress', 'companyPhone', 'companyPhone2',
      'website', 'companyGST', 'billPrefix', 'colorTone', 'invoiceScriptUrl', 'itemCatalog'
    ];
    const profilePatch = {};
    companyFields.forEach(key => {
      if (settings[key] !== undefined) profilePatch[key] = settings[key];
    });
    const companyProfiles = raw.companyProfiles.map(profile =>
      profile.id === activeId ? { ...profile, ...profilePatch, id: profile.id } : profile
    );
    return this.saveRawSettings({
      ...raw,
      theme: settings.theme !== undefined ? settings.theme : raw.theme,
      currency: settings.currency !== undefined ? settings.currency : raw.currency,
      defaultRate: settings.defaultRate !== undefined ? settings.defaultRate : raw.defaultRate,
      taxRate: settings.taxRate !== undefined ? settings.taxRate : raw.taxRate,
      qrCode: settings.qrCode !== undefined ? settings.qrCode : raw.qrCode,
      activeCompanyId: activeId,
      companyProfiles
    });
  },

  // ---- CATALOG HELPERS ----
  getCatalog() {
    return this.getSettings().itemCatalog || DEFAULT_CATALOG;
  },

  getCatalogCategories() {
    return Object.keys(this.getCatalog());
  },

  getCatalogItems(category) {
    const catalog = this.getCatalog();
    return catalog[category] || [];
  },

  getItemPrice(category, itemName) {
    const found = this.getCatalogItems(category).find(i => i.name === itemName);
    return found ? found.price : 0;
  },

  saveCatalog(catalog) {
    const settings = this.getSettings();
    settings.itemCatalog = catalog;
    return this.saveSettings(settings);
  },

  addCatalogItem(category, name, price) {
    const catalog = this.getCatalog();
    if (!catalog[category]) catalog[category] = [];
    if (!catalog[category].find(i => i.name === name)) catalog[category].push({ name, price: parseFloat(price) || 0 });
    return this.saveCatalog(catalog);
  },

  updateCatalogItemPrice(category, itemName, newPrice) {
    const catalog = this.getCatalog();
    if (catalog[category]) {
      const item = catalog[category].find(i => i.name === itemName);
      if (item) item.price = parseFloat(newPrice) || 0;
    }
    return this.saveCatalog(catalog);
  },

  deleteCatalogItem(category, itemName) {
    const catalog = this.getCatalog();
    if (catalog[category]) {
      catalog[category] = catalog[category].filter(i => i.name !== itemName);
      if (catalog[category].length === 0) delete catalog[category];
    }
    return this.saveCatalog(catalog);
  },

  addCatalogCategory(category) {
    const catalog = this.getCatalog();
    if (!catalog[category]) {
      catalog[category] = [];
      return this.saveCatalog(catalog);
    }
    return false;
  },

  deleteCatalogCategory(category) {
    const catalog = this.getCatalog();
    delete catalog[category];
    return this.saveCatalog(catalog);
  },

  // ---- ANALYTICS ----
  getDashboardStats() {
    const bills = this.getBills();
    const today = new Date().toDateString();
    const bills_today = bills.filter(b => new Date(b.createdAt).toDateString() === today);
    const this_month = new Date();
    const todaySales = bills_today.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const pendingAmt = bills.filter(b => b.status === 'pending').reduce((s, b) => s + (b.totalAmount || 0), 0);
    const monthSales = bills
      .filter(b => {
        const d = new Date(b.createdAt);
        return d.getMonth() === this_month.getMonth() && d.getFullYear() === this_month.getFullYear();
      })
      .reduce((s, b) => s + (b.totalAmount || 0), 0);
    return { todaySales, pendingAmt, monthSales, totalBills: bills.length, bills_today: bills_today.length };
  },

  // ---- EXPORT / IMPORT ----
  exportAll() {
    return {
      customers: this.getAllCustomers(),
      bills: this.getAllBills(),
      settings: this.getRawSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  importAll(data) {
    if (data.customers) this.saveAllCustomers(data.customers);
    if (data.bills) this.saveAllBills(data.bills);
    if (data.settings) this.saveRawSettings(data.settings);
  },

  // ---- INVOICE TEMPLATE ----
  getInvoiceTemplate() {
    return this.get(KEYS.INVOICE_TEMPLATE, null);
  },

  saveInvoiceTemplate(tpl) {
    this.set(KEYS.INVOICE_TEMPLATE, tpl);
  },

  resetInvoiceTemplate() {
    this.remove(KEYS.INVOICE_TEMPLATE);
  },

  // ---- ADMIN PASSWORD ----
  getAdminPassword() {
    const stored = this.get(KEYS.ADMIN_PASSWORD, null);
    if (stored === null) {
      this.set(KEYS.ADMIN_PASSWORD, 'icc2025');
      return 'icc2025';
    }
    return stored;
  },

  setAdminPassword(password) {
    return this.set(KEYS.ADMIN_PASSWORD, password);
  },

  clearAll() {
    SYNC_KEYS.forEach(key => delete _cache[key]);
    if (window.CloudDB) window.CloudDB.setAll({});
  }
};

window.Storage = Storage;
window.KEYS = KEYS;
window.DEFAULT_CATALOG = DEFAULT_CATALOG;
window.CARVINO_CATALOG = CARVINO_CATALOG;
window.DEFAULT_COMPANY_ID = DEFAULT_COMPANY_ID;

Storage.initCloudSync().catch(error => console.error('Cloud sync failed:', error));
