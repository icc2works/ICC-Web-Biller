// ===================== BILLING MODULE =====================
// Product format: Category | Item Name | Unit Price | Qty | Subtotal

let itemCounter = 0;

// ---- Build category options ----
function buildCategoryOptions(selectedCat) {
  const catalog = Storage.getCatalog();
  return Object.keys(catalog).map(cat =>
    '<option value="' + cat + '"' + (selectedCat === cat ? ' selected' : '') + '>' + cat + '</option>'
  ).join('');
}

// ---- Build item options for a category ----
function buildItemOptions(category, selectedItem) {
  const items = Storage.getCatalogItems(category);
  if (!items.length) return '<option value="">— No items —</option>';
  return items.map(function(it) {
    return '<option value="' + it.name + '" data-price="' + it.price + '"' +
      (selectedItem === it.name ? ' selected' : '') + '>' + it.name + '</option>';
  }).join('');
}

// ---- Add Item Row ----
function addItem(prefill) {
  prefill = prefill || {};
  itemCounter++;
  var id = 'item-' + itemCounter;

  var catalog    = Storage.getCatalog();
  var categories = Object.keys(catalog);
  var defCat     = prefill.category || categories[0] || '';
  var defItem    = prefill.itemName || '';
  var defPrice   = prefill.unitPrice !== undefined ? prefill.unitPrice : '';
  var defQty     = prefill.qty !== undefined ? prefill.qty : 1;

  var div = document.createElement('div');
  div.className      = 'item-row fade-in';
  div.id             = id;
  div.dataset.itemId = itemCounter;

  div.innerHTML =
    '<select class="item-cat" onchange="onCategoryChange(this,\'' + id + '\')">' +
      buildCategoryOptions(defCat) +
    '</select>' +
    '<select class="item-name" onchange="onItemChange(this,\'' + id + '\')">' +
      buildItemOptions(defCat, defItem) +
    '</select>' +
    '<input type="number" class="item-price" placeholder="Price" min="0" step="1"' +
      ' value="' + defPrice + '" oninput="calculateTotal()" title="Unit Price (₹)">' +
    '<input type="number" class="item-qty" placeholder="Qty" min="1" step="1"' +
      ' value="' + defQty + '" oninput="calculateTotal()" title="Quantity">' +
    '<span class="item-total">₹0</span>' +
    '<button class="remove-btn" onclick="removeItem(\'' + id + '\')" title="Remove">✕</button>';

  document.getElementById('billItems').appendChild(div);

  // Auto-fill price from catalog
  if (defPrice === '' && defCat) {
    var firstItem  = defItem || (catalog[defCat] && catalog[defCat][0] ? catalog[defCat][0].name : '');
    var firstPrice = Storage.getItemPrice(defCat, firstItem);
    if (firstItem) div.querySelector('.item-name').value = firstItem;
    div.querySelector('.item-price').value = firstPrice > 0 ? firstPrice : '';
  }

  calculateTotal();
}

// ---- Category changed ----
function onCategoryChange(catSelect, rowId) {
  var row      = document.getElementById(rowId);
  if (!row) return;
  var itemSel  = row.querySelector('.item-name');
  var priceInp = row.querySelector('.item-price');

  itemSel.innerHTML = buildItemOptions(catSelect.value, '');

  var firstOpt = itemSel.querySelector('option[data-price]');
  if (firstOpt) {
    var price = parseFloat(firstOpt.dataset.price) || 0;
    priceInp.value = price > 0 ? price : '';
  } else {
    priceInp.value = '';
  }
  calculateTotal();
}

// ---- Item changed → auto-fill price ----
function onItemChange(itemSelect, rowId) {
  var row      = document.getElementById(rowId);
  if (!row) return;
  var selected = itemSelect.options[itemSelect.selectedIndex];
  var price    = parseFloat(selected && selected.dataset ? selected.dataset.price : 0) || 0;
  row.querySelector('.item-price').value = price > 0 ? price : '';
  calculateTotal();
}

// ---- Remove Row ----
function removeItem(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'fadeOut 0.2s ease forwards';
  setTimeout(function() { el.remove(); calculateTotal(); }, 200);
}

// ---- Calculation: Unit Price × Qty ----
function calculateTotal() {
  var rows     = document.querySelectorAll('.item-row');
  var settings = Storage.getSettings();
  var taxRate  = parseFloat(settings.taxRate) || 0;
  var subTotal = 0;

  rows.forEach(function(row) {
    var price    = parseFloat(row.querySelector('.item-price') && row.querySelector('.item-price').value) || 0;
    var qty      = parseFloat(row.querySelector('.item-qty')   && row.querySelector('.item-qty').value)   || 0;
    var rowTotal = price * qty;
    var totalSpan = row.querySelector('.item-total');
    if (totalSpan) {
      totalSpan.textContent = '₹' + rowTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      totalSpan.style.color = rowTotal > 0 ? 'var(--accent-3)' : 'var(--text-muted)';
    }
    subTotal += rowTotal;
  });

  var discount   = parseFloat(document.getElementById('billDiscount') && document.getElementById('billDiscount').value) || 0;
  var taxAmt     = subTotal * (taxRate / 100);
  var finalTotal = subTotal + taxAmt - discount;
  if (finalTotal < 0) finalTotal = 0;

  var elSub   = document.getElementById('subTotal');
  var elTax   = document.getElementById('taxAmount');
  var elDisc  = document.getElementById('discountDisplay');
  var elTotal = document.getElementById('grandTotal');
  var elCount = document.getElementById('itemCount');

  if (elSub)   elSub.textContent   = '₹' + subTotal.toLocaleString('en-IN',   { maximumFractionDigits: 2 });
  if (elTax)   elTax.textContent   = '₹' + taxAmt.toLocaleString('en-IN',     { maximumFractionDigits: 2 });
  if (elDisc)  elDisc.textContent  = '₹' + discount.toLocaleString('en-IN',   { maximumFractionDigits: 2 });
  if (elTotal) elTotal.textContent = '₹' + finalTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (elCount) elCount.textContent = rows.length;

  return { subTotal, taxAmt, discount, finalTotal, rows: rows.length };
}

// ---- Save Bill ----
function saveBill() {
  var customerId = document.getElementById('billCustomer') && document.getElementById('billCustomer').value;
  var note       = (document.getElementById('billNote') && document.getElementById('billNote').value || '').trim();
  var status     = document.getElementById('billStatus') && document.getElementById('billStatus').value || 'paid';
  var payMethod  = document.getElementById('billPayMethod') && document.getElementById('billPayMethod').value || 'Cash';
  var discount   = parseFloat(document.getElementById('billDiscount') && document.getElementById('billDiscount').value) || 0;
  var rows       = document.querySelectorAll('.item-row');

  if (!customerId) { showToast('Please select a customer', 'warning'); return; }
  if (rows.length === 0) { showToast('Please add at least one item', 'warning'); return; }

  var hasInvalid = false;
  rows.forEach(function(row) {
    var price = parseFloat(row.querySelector('.item-price').value) || 0;
    var qty   = parseFloat(row.querySelector('.item-qty').value)   || 0;
    if (price === 0 || qty === 0) hasInvalid = true;
  });
  if (hasInvalid) { showToast('Please fill Unit Price & Qty for all items', 'warning'); return; }

  var settings    = Storage.getSettings();
  var taxRate     = parseFloat(settings.taxRate) || 0;
  var items       = [];
  var subTotal    = 0;

  rows.forEach(function(row) {
    var category  = row.querySelector('.item-cat')  && row.querySelector('.item-cat').value  || '';
    var itemName  = row.querySelector('.item-name') && row.querySelector('.item-name').value || '';
    var unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
    var qty       = parseFloat(row.querySelector('.item-qty').value)   || 1;
    var rowTotal  = unitPrice * qty;
    subTotal     += rowTotal;
    items.push({ category, itemName, unitPrice, qty, subtotal: +rowTotal.toFixed(2) });
  });

  var taxAmt      = subTotal * taxRate / 100;
  var totalAmount = +(subTotal + taxAmt - discount).toFixed(2);
  if (totalAmount < 0) totalAmount = 0;

  var customer = Storage.getCustomerById(customerId);
  var bill = Storage.addBill({
    customerId,
    customerName:  customer && customer.name  || 'Unknown',
    customerPhone: customer && customer.phone || '',
    items,
    subTotal:      +subTotal.toFixed(2),
    taxRate,
    taxAmount:     +taxAmt.toFixed(2),
    discount:      +discount.toFixed(2),
    paymentMethod: payMethod,
    totalAmount,
    note,
    status
  });

  showToast('Bill ' + bill.billNo + ' saved! ₹' + totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }), 'success');

  setTimeout(function() {
    if (window.confirm('Bill ' + bill.billNo + ' saved!\n\nPrint / preview now?')) {
      printBill(bill.id);
    } else {
      resetBillForm();
    }
  }, 400);
}

// ---- Reset ----
function resetBillForm() {
  document.getElementById('billItems').innerHTML = '';
  document.getElementById('billCustomer').value  = '';
  document.getElementById('billNote').value      = '';
  document.getElementById('billStatus').value    = 'paid';
  if (document.getElementById('billDiscount'))  document.getElementById('billDiscount').value  = '';
  if (document.getElementById('billPayMethod')) document.getElementById('billPayMethod').value = 'Cash';
  itemCounter = 0;
  calculateTotal();
  addItem();
}

// ---- Generate Invoice via Cloud (Google Apps Script) ----
function printBill(billId) {
  // Delegate to the cloud invoice generator (invoice-cloud.js)
  if (typeof generateCloudInvoice === 'function') {
    generateCloudInvoice(billId);
  } else if (typeof generateXLSXInvoice === 'function') {
    generateXLSXInvoice(billId);
  } else {
    showToast('Invoice generator not loaded', 'error');
  }
}

// ---- Generate Test Invoice (for testing) ----
function generateTestInvoice() {
  // Build a sample bill with dummy data
  var testBill = {
    id: 'TEST-' + Date.now(),
    billNo: 'TEST-' + String(Math.floor(Math.random() * 9000) + 1000),
    customerName: 'Test Customer',
    customerPhone: '9876543210',
    note: 'Test invoice — generated for testing purposes',
    status: 'paid',
    paymentMethod: 'Cash',
    billDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    items: [
      { category: 'Products', itemName: 'Sample Item 1', unitPrice: 500, qty: 2, subtotal: 1000 },
      { category: 'Products', itemName: 'Sample Item 2', unitPrice: 250, qty: 3, subtotal: 750 },
      { category: 'Products', itemName: 'Sample Item 3', unitPrice: 1200, qty: 1, subtotal: 1200 }
    ],
    subTotal: 2950,
    taxRate: 0,
    taxAmount: 0,
    discount: 150,
    totalAmount: 2800
  };

  // Temporarily store the test bill so the invoice generator can find it
  try {
    var bills = Storage.getBills();
    bills.push(testBill);
    Storage.saveBills(bills);
    console.log('Test bill stored:', testBill.id);
  } catch (e) {
    console.error('Error storing test bill:', e);
    showToast('Failed to create test bill', 'error');
    return;
  }

  showToast('Generating test invoice via cloud...', 'success');

  // Trigger the cloud invoice generator
  if (typeof generateCloudInvoice === 'function') {
    generateCloudInvoice(testBill.id);
  } else if (typeof generateXLSXInvoice === 'function') {
    generateXLSXInvoice(testBill.id);
  } else {
    showToast('Invoice generator not loaded', 'error');
  }

  // Clean up: remove the test bill from storage after a delay
  setTimeout(function() {
    try {
      var storedBills = Storage.getBills();
      storedBills = storedBills.filter(function(b) { return b.id !== testBill.id; });
      Storage.saveBills(storedBills);
      console.log('Test bill cleaned up');
    } catch (e) {
      console.error('Error cleaning up test bill:', e);
    }
  }, 10000); // 10 seconds to allow cloud generation to complete
}


// ---- Init ----
document.addEventListener('DOMContentLoaded', function() {
  populateCustomerSelect('billCustomer');
  addItem();
  calculateTotal();
});
