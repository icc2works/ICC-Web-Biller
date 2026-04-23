// ===================== STORAGE MODULE =====================
// Centralized LocalStorage abstraction for all data operations

const KEYS = {
  CUSTOMERS: 'cnc_customers',
  BILLS: 'cnc_bills',
  SETTINGS: 'cnc_settings',
  BILL_SEQ: 'cnc_bill_sequence'
};

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

const Storage = {
  // ---- GENERIC ----
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  },

  // ---- CUSTOMERS ----
  getCustomers() {
    return this.get(KEYS.CUSTOMERS, []);
  },

  saveCustomers(list) {
    return this.set(KEYS.CUSTOMERS, list);
  },

  addCustomer(customer) {
    const list = this.getCustomers();
    customer.id = 'CUST-' + Date.now();
    customer.createdAt = new Date().toISOString();
    list.push(customer);
    this.saveCustomers(list);
    return customer;
  },

  updateCustomer(id, data) {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.id === id);
    if (idx > -1) { list[idx] = { ...list[idx], ...data }; this.saveCustomers(list); }
  },

  deleteCustomer(id) {
    const list = this.getCustomers().filter(c => c.id !== id);
    this.saveCustomers(list);
  },

  getCustomerById(id) {
    return this.getCustomers().find(c => c.id === id) || null;
  },

  // ---- BILLS ----
  getBills() {
    return this.get(KEYS.BILLS, []);
  },

  saveBills(list) {
    return this.set(KEYS.BILLS, list);
  },

  getNextBillNumber() {
    const seq = this.get(KEYS.BILL_SEQ, 0) + 1;
    this.set(KEYS.BILL_SEQ, seq);
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return 'ICC-' + mm + dd + '-' + String(seq).padStart(3, '0');
  },

  addBill(bill) {
    const list = this.getBills();
    bill.id = 'BILL-' + Date.now();
    bill.billNo = this.getNextBillNumber();
    bill.createdAt = new Date().toISOString();
    bill.status = bill.status || 'paid';
    list.unshift(bill);
    this.saveBills(list);
    return bill;
  },

  updateBill(id, data) {
    const list = this.getBills();
    const idx = list.findIndex(b => b.id === id);
    if (idx > -1) { list[idx] = { ...list[idx], ...data }; this.saveBills(list); }
  },

  deleteBill(id) {
    const list = this.getBills().filter(b => b.id !== id);
    this.saveBills(list);
  },

  getBillById(id) {
    return this.getBills().find(b => b.id === id) || null;
  },

  // ---- SETTINGS (with catalog) ----
  getSettings() {
    const saved = this.get(KEYS.SETTINGS, null);
    const defaults = {
      companyName: 'Indian CNC Carving',
      companyAddress: '45, French Teacher St,\nKaraikal, Puducherry 609602',
      companyPhone: '8870415956',
      companyPhone2: '9786876576',
      website: 'https://indiancnccarving.com/',
      companyGST: '',
      currency: '₹',
      defaultRate: '',
      taxRate: 0,
      qrCode: '',
      itemCatalog: DEFAULT_CATALOG
    };
    if (!saved) return defaults;
    // Merge — always ensure itemCatalog exists
    if (!saved.itemCatalog) saved.itemCatalog = DEFAULT_CATALOG;
    return { ...defaults, ...saved };
  },

  saveSettings(settings) {
    return this.set(KEYS.SETTINGS, settings);
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
    const items = this.getCatalogItems(category);
    const found = items.find(i => i.name === itemName);
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
    // Avoid duplicate names
    if (!catalog[category].find(i => i.name === name)) {
      catalog[category].push({ name, price: parseFloat(price) || 0 });
    }
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
    const totalBills = bills.length;

    return { todaySales, pendingAmt, monthSales, totalBills, bills_today: bills_today.length };
  },

  // ---- EXPORT / IMPORT ----
  exportAll() {
    return {
      customers: this.getCustomers(),
      bills: this.getBills(),
      settings: this.getSettings(),
      exportedAt: new Date().toISOString()
    };
  },

  importAll(data) {
    if (data.customers) this.saveCustomers(data.customers);
    if (data.bills) this.saveBills(data.bills);
    if (data.settings) this.saveSettings(data.settings);
  },

  // ---- INVOICE TEMPLATE ----
  getInvoiceTemplate() {
    return this.get('cnc_invoice_template', null);
  },

  saveInvoiceTemplate(tpl) {
    this.set('cnc_invoice_template', tpl);
  },

  resetInvoiceTemplate() {
    localStorage.removeItem('cnc_invoice_template');
  }
};

// Make globally available
window.Storage = Storage;
window.KEYS = KEYS;
window.DEFAULT_CATALOG = DEFAULT_CATALOG;
