// ===================== BILLING MODULE =====================
// ICC format: Category | Item Name | Unit Price | Qty | Subtotal
// Carvino format: Cutting Type | Material | Size | Sqft | Rate/Sqft | Qty | Subtotal

let itemCounter = 0;

function isCarvinoBilling() {
  var settings = Storage.getSettings();
  return settings.activeCompanyId === 'company2' || settings.colorTone === 'carvino';
}

function money(amount) {
  return 'Rs.' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// ---- Build category options ----
function buildCategoryOptions(selectedCat) {
  const catalog = Storage.getCatalog();
  return Object.keys(catalog).map(cat =>
    '<option value="' + cat + '"' + (selectedCat === cat ? ' selected' : '') + '>' + cat + '</option>'
  ).join('');
}

// ---- Build item/material options for a category ----
function buildItemOptions(category, selectedItem) {
  const items = Storage.getCatalogItems(category);
  if (!items.length) return '<option value="">- No items -</option>';
  return items.map(function(it) {
    return '<option value="' + it.name + '" data-price="' + it.price + '"' +
      (selectedItem === it.name ? ' selected' : '') + '>' + it.name + '</option>';
  }).join('');
}

function updateBillingModeUI() {
  var carvino = isCarvinoBilling();
  var header = document.querySelector('.item-header');
  var subtitle = document.querySelector('.items-box .section-label + div');
  var help = document.querySelector('.card [style*="text-align:center"]');

  if (header) {
    header.classList.toggle('carvino-item-header', carvino);
    header.innerHTML = carvino
      ? '<span>Item</span><span>Material</span><span>Unit</span><span>Height</span><span>Width</span><span>Sqft</span><span>Rate/Sqft</span><span>Qty</span><span>Total</span><span></span>'
      : '<span>Category</span><span>Item Name</span><span>Unit Price</span><span>Qty</span><span>Subtotal</span><span></span>';
  }
  if (subtitle) {
    subtitle.innerHTML = carvino
      ? '<span id="itemCount">0</span> items - Height x Width to Sqft x Rate x Qty'
      : '<span id="itemCount">0</span> items - Unit Price x Qty = Subtotal';
  }
  if (help) {
    help.innerHTML = carvino
      ? 'Auto sets sqft to 1 for fixed-rate work<br>Discount applied on final total'
      : 'Unit Price x Qty = Subtotal<br>Discount applied on final total';
  }
}

// ---- Add Item Row ----
function addItem(prefill) {
  return isCarvinoBilling() ? addCarvinoItem(prefill) : addStandardItem(prefill);
}

function addStandardItem(prefill) {
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
      ' value="' + defPrice + '" oninput="calculateTotal()" title="Unit Price">' +
    '<input type="number" class="item-qty" placeholder="Qty" min="1" step="1"' +
      ' value="' + defQty + '" oninput="calculateTotal()" title="Quantity">' +
    '<span class="item-total">Rs.0</span>' +
    '<button class="remove-btn" onclick="removeItem(\'' + id + '\')" title="Remove">x</button>';

  document.getElementById('billItems').appendChild(div);

  if (defPrice === '' && defCat) {
    var firstItem  = defItem || (catalog[defCat] && catalog[defCat][0] ? catalog[defCat][0].name : '');
    var firstPrice = Storage.getItemPrice(defCat, firstItem);
    if (firstItem) div.querySelector('.item-name').value = firstItem;
    div.querySelector('.item-price').value = firstPrice > 0 ? firstPrice : '';
  }

  calculateTotal();
}

function addCarvinoItem(prefill) {
  prefill = prefill || {};
  itemCounter++;
  var id = 'item-' + itemCounter;

  var catalog = Storage.getCatalog();
  var categories = Object.keys(catalog);
  var defCat = prefill.category || categories[0] || 'CNC Cutting';
  var defItem = prefill.itemName || prefill.material || '';
  var defUnit = prefill.sizeUnit || 'inch';
  var autoSqft = prefill.autoSqft === true;

  var div = document.createElement('div');
  div.className = 'item-row carvino-item-row fade-in';
  div.id = id;
  div.dataset.itemId = itemCounter;

  div.innerHTML =
    '<select class="item-cat" onchange="onCategoryChange(this,\'' + id + '\')">' +
      buildCategoryOptions(defCat) +
    '</select>' +
    '<select class="item-name" onchange="onItemChange(this,\'' + id + '\')">' +
      buildItemOptions(defCat, defItem) +
    '</select>' +
    '<select class="size-unit" onchange="onUnitChange(this,\'' + id + '\')">' +
      '<option value="inch"' + (defUnit === 'inch' ? ' selected' : '') + '>Inch</option>' +
      '<option value="mm"' + (defUnit === 'mm' ? ' selected' : '') + '>MM</option>' +
      '<option value="auto"' + (defUnit === 'auto' || autoSqft ? ' selected' : '') + '>Auto</option>' +
    '</select>' +
    '<input type="number" class="item-height" placeholder="Height" min="0" step="0.01" value="' + (prefill.height || '') + '" oninput="calculateTotal()">' +
    '<input type="number" class="item-width" placeholder="Width" min="0" step="0.01" value="' + (prefill.width || '') + '" oninput="calculateTotal()">' +
    '<div class="sqft-box">' +
      '<input type="number" class="item-sqft" placeholder="Sqft" min="0" step="0.01" value="' + (prefill.sqft || '') + '" oninput="calculateTotal()">' +
    '</div>' +
    '<input type="number" class="item-price" placeholder="Rate" min="0" step="0.01" value="' + (prefill.unitPrice || '') + '" oninput="calculateTotal()" title="Rate per sqft">' +
    '<input type="number" class="item-qty" placeholder="Qty" min="1" step="1" value="' + (prefill.qty || 1) + '" oninput="calculateTotal()">' +
    '<span class="item-total">Rs.0</span>' +
    '<button class="remove-btn" onclick="removeItem(\'' + id + '\')" title="Remove">x</button>';

  document.getElementById('billItems').appendChild(div);
  if (!defItem && catalog[defCat] && catalog[defCat][0]) div.querySelector('.item-name').value = catalog[defCat][0].name;
  applyAutoSqftState(div);
  calculateTotal();
}

// ---- Category changed ----
function onCategoryChange(catSelect, rowId) {
  var row = document.getElementById(rowId);
  if (!row) return;
  var itemSel = row.querySelector('.item-name');
  var priceInp = row.querySelector('.item-price');

  itemSel.innerHTML = buildItemOptions(catSelect.value, '');

  if (!isCarvinoBilling()) {
    var firstOpt = itemSel.querySelector('option[data-price]');
    if (firstOpt) {
      var price = parseFloat(firstOpt.dataset.price) || 0;
      priceInp.value = price > 0 ? price : '';
    } else {
      priceInp.value = '';
    }
  }
  calculateTotal();
}

// ---- Item changed: auto-fill price for ICC only ----
function onItemChange(itemSelect, rowId) {
  var row = document.getElementById(rowId);
  if (!row || isCarvinoBilling()) {
    calculateTotal();
    return;
  }
  var selected = itemSelect.options[itemSelect.selectedIndex];
  var price = parseFloat(selected && selected.dataset ? selected.dataset.price : 0) || 0;
  row.querySelector('.item-price').value = price > 0 ? price : '';
  calculateTotal();
}

function onUnitChange(select, rowId) {
  var row = document.getElementById(rowId);
  if (!row) return;
  applyAutoSqftState(row);
  calculateTotal();
}

function applyAutoSqftState(row) {
  var unitSelect = row.querySelector('.size-unit');
  var isAuto = unitSelect && unitSelect.value === 'auto';
  
  ['.item-height', '.item-width'].forEach(function(selector) {
    var el = row.querySelector(selector);
    if (el) el.disabled = isAuto;
  });
  
  var sqft = row.querySelector('.item-sqft');
  if (sqft) {
    sqft.readOnly = !isAuto;
    if (isAuto && (!sqft.value || sqft.value === '0')) sqft.value = '1';
  }
}

// ---- Remove Row ----
function removeItem(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'fadeOut 0.2s ease forwards';
  setTimeout(function() { el.remove(); calculateTotal(); }, 200);
}

function getCarvinoSqft(row) {
  var unitSelect = row.querySelector('.size-unit');
  var unit = unitSelect ? unitSelect.value : 'inch';
  var sqftInput = row.querySelector('.item-sqft');
  
  if (unit === 'auto') {
    var val = parseFloat(sqftInput ? sqftInput.value : 0) || 1;
    return val;
  }

  var height = parseFloat(row.querySelector('.item-height') && row.querySelector('.item-height').value) || 0;
  var width = parseFloat(row.querySelector('.item-width') && row.querySelector('.item-width').value) || 0;
  var unit = row.querySelector('.size-unit') && row.querySelector('.size-unit').value || 'inch';
  var sqft = unit === 'mm' ? (height * width / 92903.04) : (height * width / 144);
  sqft = +sqft.toFixed(3);
  if (sqftInput) sqftInput.value = sqft > 0 ? sqft : '';
  return sqft;
}

// ---- Calculation ----
function calculateTotal() {
  var rows = document.querySelectorAll('.item-row');
  var settings = Storage.getSettings();
  var taxRate = parseFloat(settings.taxRate) || 0;
  var subTotal = 0;
  var carvino = isCarvinoBilling();

  rows.forEach(function(row) {
    var price = parseFloat(row.querySelector('.item-price') && row.querySelector('.item-price').value) || 0;
    var qty = parseFloat(row.querySelector('.item-qty') && row.querySelector('.item-qty').value) || 0;
    var rowTotal;

    if (carvino) {
      var sqft = getCarvinoSqft(row);
      rowTotal = sqft * price * qty;
    } else {
      rowTotal = price * qty;
    }

    var totalSpan = row.querySelector('.item-total');
    if (totalSpan) {
      totalSpan.textContent = money(rowTotal);
      totalSpan.style.color = rowTotal > 0 ? 'var(--accent-3)' : 'var(--text-muted)';
    }
    subTotal += rowTotal;
  });

  var discount = parseFloat(document.getElementById('billDiscount') && document.getElementById('billDiscount').value) || 0;
  var taxAmt = subTotal * (taxRate / 100);
  var finalTotal = subTotal + taxAmt - discount;
  if (finalTotal < 0) finalTotal = 0;

  var elSub = document.getElementById('subTotal');
  var elTax = document.getElementById('taxAmount');
  var elDisc = document.getElementById('discountDisplay');
  var elTotal = document.getElementById('grandTotal');
  var elCount = document.getElementById('itemCount');

  if (elSub) elSub.textContent = money(subTotal);
  if (elTax) elTax.textContent = money(taxAmt);
  if (elDisc) elDisc.textContent = money(discount);
  if (elTotal) elTotal.textContent = money(finalTotal);
  if (elCount) elCount.textContent = rows.length;

  return { subTotal, taxAmt, discount, finalTotal, rows: rows.length };
}

// ---- Save Bill ----
function saveBill() {
  var customerId = document.getElementById('billCustomer') && document.getElementById('billCustomer').value;
  var note = (document.getElementById('billNote') && document.getElementById('billNote').value || '').trim();
  var status = document.getElementById('billStatus') && document.getElementById('billStatus').value || 'paid';
  var payMethod = document.getElementById('billPayMethod') && document.getElementById('billPayMethod').value || 'Cash';
  var customerGST = (document.getElementById('billCustomerGST') && document.getElementById('billCustomerGST').value || '').trim();
  var discount = parseFloat(document.getElementById('billDiscount') && document.getElementById('billDiscount').value) || 0;
  var rows = document.querySelectorAll('.item-row');
  var carvino = isCarvinoBilling();

  if (!customerId) { showToast('Please select a customer', 'warning'); return; }
  if (rows.length === 0) { showToast('Please add at least one item', 'warning'); return; }

  var hasInvalid = false;
  var settings = Storage.getSettings();
  var taxRate = parseFloat(settings.taxRate) || 0;
  var items = [];
  var subTotal = 0;

  rows.forEach(function(row, index) {
    var category = row.querySelector('.item-cat') && row.querySelector('.item-cat').value || '';
    var itemName = row.querySelector('.item-name') && row.querySelector('.item-name').value || '';
    var unitPrice = parseFloat(row.querySelector('.item-price') && row.querySelector('.item-price').value) || 0;
    var qty = parseFloat(row.querySelector('.item-qty') && row.querySelector('.item-qty').value) || 1;
    var rowTotal;

    if (carvino) {
      var sizeUnit = row.querySelector('.size-unit') && row.querySelector('.size-unit').value || 'inch';
      var isAuto = sizeUnit === 'auto';
      var height = parseFloat(row.querySelector('.item-height') && row.querySelector('.item-height').value) || 0;
      var width = parseFloat(row.querySelector('.item-width') && row.querySelector('.item-width').value) || 0;
      var sqft = getCarvinoSqft(row);
      rowTotal = sqft * unitPrice * qty;
      if (!category || !itemName || unitPrice <= 0 || qty <= 0 || (!isAuto && (height <= 0 || width <= 0 || sqft <= 0))) hasInvalid = true;
      items.push({
        siNo: index + 1,
        category,
        itemName,
        description: category,
        material: itemName,
        sizeUnit,
        height,
        width,
        sqft,
        autoSqft: isAuto,
        unitPrice,
        ratePerSqft: unitPrice,
        qty,
        quantity: qty,
        subtotal: +rowTotal.toFixed(2),
        totalPrice: +rowTotal.toFixed(2)
      });
    } else {
      rowTotal = unitPrice * qty;
      if (unitPrice <= 0 || qty <= 0) hasInvalid = true;
      items.push({ category, itemName, unitPrice, qty, subtotal: +rowTotal.toFixed(2) });
    }
    subTotal += rowTotal;
  });

  if (hasInvalid) {
    showToast(carvino ? 'Fill material, size/rate and quantity for all rows' : 'Please fill Unit Price & Qty for all items', 'warning');
    return;
  }

  var taxAmt = subTotal * taxRate / 100;
  var totalAmount = +(subTotal + taxAmt - discount).toFixed(2);
  if (totalAmount < 0) totalAmount = 0;

  var customer = Storage.getCustomerById(customerId);
  var bill = Storage.addBill({
    billingMode: carvino ? 'carvino' : 'standard',
    customerId,
    customerName: customer && customer.name || 'Unknown',
    customerPhone: customer && customer.phone || '',
    customerGST: customerGST || (customer && customer.gstin) || '',
    items,
    subTotal: +subTotal.toFixed(2),
    taxRate,
    taxAmount: +taxAmt.toFixed(2),
    discount: +discount.toFixed(2),
    paymentMethod: payMethod,
    totalAmount,
    note,
    status
  });

  showToast('Bill ' + bill.billNo + ' saved! ' + money(totalAmount), 'success');

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
  document.getElementById('billCustomer').value = '';
  document.getElementById('billNote').value = '';
  if (document.getElementById('billCustomerGST')) document.getElementById('billCustomerGST').value = '';
  document.getElementById('billStatus').value = 'paid';
  if (document.getElementById('billDiscount')) document.getElementById('billDiscount').value = '';
  if (document.getElementById('billPayMethod')) document.getElementById('billPayMethod').value = 'Cash';
  itemCounter = 0;
  updateBillingModeUI();
  calculateTotal();
  addItem();
}

// ---- Generate Invoice via Cloud (Google Apps Script) ----
function returnToHomeAfterInvoice() {
  var path = window.location.pathname || '';
  if (!/create-bill\.html$/i.test(path)) return;

  setTimeout(function() {
    window.location.href = 'index.html';
  }, 700);
}

function printBill(billId) {
  var bill = window.Storage && typeof Storage.getBillById === 'function' ? Storage.getBillById(billId) : null;

  if (bill && bill.invoicePdfUrl) {
    window.open(bill.invoicePdfUrl, '_blank');
    returnToHomeAfterInvoice();
    return;
  }

  if (typeof generateCloudInvoice === 'function') {
    generateCloudInvoice(billId);
  } else if (typeof generateXLSXInvoice === 'function') {
    generateXLSXInvoice(billId);
  } else {
    showToast('Invoice generator not loaded', 'error');
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', function() {
  window._billingCompanyId = Storage.getActiveCompanyId();
  updateBillingModeUI();
  populateCustomerSelect('billCustomer');
  addItem();
  calculateTotal();
});
