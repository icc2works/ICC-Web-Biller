// ===================== CUSTOMERS MODULE =====================

function loadCustomers(filterText = '') {
  const list = Storage.getCustomers();
  const tbody = document.getElementById('customerTableBody');
  const countEl = document.getElementById('customerCount');
  if (!tbody) return;

  const filtered = filterText
    ? list.filter(c =>
        c.name.toLowerCase().includes(filterText.toLowerCase()) ||
        (c.phone||'').includes(filterText) ||
        (c.address||'').toLowerCase().includes(filterText.toLowerCase())
      )
    : list;

  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <p>${filterText ? 'No customers found for "'+filterText+'"' : 'No customers yet. Add your first customer!'}</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((c, i) => `
    <tr class="fade-in">
      <td data-label="Customer">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#4f9eff,#7c5cfc);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">
            ${c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;">${escHtml(c.name)}</div>
            <div style="font-size:11px;color:var(--text-muted);">${escHtml(c.address||'')}</div>
          </div>
        </div>
      </td>
      <td data-label="Phone" style="font-family:'JetBrains Mono',monospace;">${escHtml(c.phone||'—')}</td>
      <td data-label="Added On" style="color:var(--text-secondary);font-size:12px;">${formatDate(c.createdAt)}</td>
      <td data-label="Bills">
        <span class="badge badge-blue">${getBillCountForCustomer(c.id)} bills</span>
      </td>
      <td data-label="Actions">
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary" onclick="editCustomer('${c.id}')" title="Edit">✏️</button>
          <button class="btn btn-sm btn-secondary" onclick="viewCustomerBills('${c.id}')" title="Bills">🧾</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomerConfirm('${c.id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getBillCountForCustomer(customerId) {
  return Storage.getBills().filter(b => b.customerId === customerId).length;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

function addCustomer() {
  const name    = document.getElementById('custName').value.trim();
  const phone   = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const email   = document.getElementById('custEmail').value.trim();

  if (!name) { showToast('Please enter customer name', 'warning'); return; }
  if (phone && !/^\+?[\d\s\-]{7,15}$/.test(phone)) {
    showToast('Please enter a valid phone number', 'warning'); return;
  }

  Storage.addCustomer({ name, phone, address, email });
  showToast(`Customer "${name}" added successfully!`, 'success');
  closeModal('addCustomerModal');
  clearCustomerForm();
  loadCustomers();
}

function clearCustomerForm() {
  ['custName','custPhone','custAddress','custEmail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('editCustomerId').value = '';
  const saveBtn = document.getElementById('saveCustomerBtn');
  if (saveBtn) saveBtn.textContent = '✅ Save Customer';
}

function editCustomer(id) {
  const customer = Storage.getCustomerById(id);
  if (!customer) return;
  document.getElementById('custName').value    = customer.name || '';
  document.getElementById('custPhone').value   = customer.phone || '';
  document.getElementById('custAddress').value = customer.address || '';
  document.getElementById('custEmail').value   = customer.email || '';
  document.getElementById('editCustomerId').value = id;
  const saveBtn = document.getElementById('saveCustomerBtn');
  if (saveBtn) saveBtn.textContent = '💾 Update Customer';
  openModal('addCustomerModal');
}

function saveCustomer() {
  const editId = document.getElementById('editCustomerId').value;
  if (editId) {
    const name    = document.getElementById('custName').value.trim();
    const phone   = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const email   = document.getElementById('custEmail').value.trim();
    if (!name) { showToast('Please enter customer name', 'warning'); return; }
    Storage.updateCustomer(editId, { name, phone, address, email });
    showToast(`Customer updated successfully!`, 'success');
    closeModal('addCustomerModal');
    clearCustomerForm();
    loadCustomers();
  } else {
    addCustomer();
  }
}

function deleteCustomerConfirm(id) {
  const c = Storage.getCustomerById(id);
  if (!c) return;
  const billCount = getBillCountForCustomer(id);
  const msg = billCount > 0
    ? `Delete "${c.name}"? They have ${billCount} bill(s) on record.`
    : `Delete customer "${c.name}"?`;
  confirmAction(msg, () => {
    Storage.deleteCustomer(id);
    showToast('Customer deleted', 'error');
    loadCustomers();
  });
}

function viewCustomerBills(id) {
  window.location.href = `reports.html?customer=${id}`;
}

// Init page
document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();

  const searchBox = document.getElementById('customerSearch');
  if (searchBox) {
    searchBox.addEventListener('input', () => loadCustomers(searchBox.value));
  }
});
