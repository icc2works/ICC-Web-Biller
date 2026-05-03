// ===================== CLOUD INVOICE GENERATOR =====================
// Uses Google Apps Script to generate invoices via Google Sheets/Drive
// Returns a Google Drive PDF URL for printing

(function () {
  'use strict';

  // ---- Google Apps Script Web App URL ----
  var DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywJJGgEbpwMxQjPAHRh2cCmI-UpFZAZZpg6kYs4WGD_UHaYwdBADr162gVdLvXPW7RFg/exec';

  function getAppsScriptUrl() {
    var settings = window.Storage && typeof Storage.getSettings === 'function' ? Storage.getSettings() : {};
    if (typeof settings.invoiceScriptUrl === 'string') return settings.invoiceScriptUrl.trim();
    return DEFAULT_APPS_SCRIPT_URL;
  }

  /**
   * Format a product list string for the Apps Script API.
   * Format: "ItemName UnitPrice - Qty - Subtotal" separated by " " (double space)
   * e.g. "Rice 1kg - 50 - 2 - 100  Sugar 1kg - 40 - 1 - 40"
   */
  function formatProductList(items) {
    if (!items || !items.length) return '';
    return items.map(function (item) {
      var name = (item.itemName || 'Item').replace(/\s+/g, ' ').trim();
      var price = (item.unitPrice || 0);
      var qty = (item.qty || 1);
      var subtotal = item.subtotal != null ? item.subtotal : (price * qty);
      return name + ' - ' + price + ' - ' + qty + ' - ' + subtotal;
    }).join('  '); // double space separator between items
  }

  function formatCarvinoProductList(items) {
    return JSON.stringify((items || []).map(function(item, index) {
      return {
        siNo: item.siNo || index + 1,
        description: item.description || item.category || '',
        material: item.material || item.itemName || '',
        unitPrice: Number(item.unitPrice || item.ratePerSqft || 0),
        quantity: Number(item.quantity || item.qty || 1),
        totalPrice: Number(item.totalPrice || item.subtotal || 0),
        height: Number(item.height || 0),
        width: Number(item.width || 0),
        unit: item.sizeUnit || '',
        sqft: Number(item.sqft || 0),
        autoSqft: !!item.autoSqft
      };
    }));
  }

  function numberToWords(num) {
    num = Math.round(Number(num || 0));
    if (num === 0) return 'Zero';
    var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function belowHundred(n) {
      return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }
    function belowThousand(n) {
      return n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + belowHundred(n % 100) : '') : belowHundred(n);
    }
    var parts = [];
    var crore = Math.floor(num / 10000000); num %= 10000000;
    var lakh = Math.floor(num / 100000); num %= 100000;
    var thousand = Math.floor(num / 1000); num %= 1000;
    if (crore) parts.push(belowThousand(crore) + ' Crore');
    if (lakh) parts.push(belowThousand(lakh) + ' Lakh');
    if (thousand) parts.push(belowThousand(thousand) + ' Thousand');
    if (num) parts.push(belowThousand(num));
    return parts.join(' ');
  }

  /**
   * Format date as YYYY-MM-DD
   */
  function formatDate(dateStr) {
    var d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  /**
   * Build the API URL with query parameters from a bill object.
   */
  function buildInvoiceUrl(bill) {
    var settings = window.Storage && typeof Storage.getSettings === 'function' ? Storage.getSettings() : {};
    var isCarvino = bill.billingMode === 'carvino' || settings.activeCompanyId === 'company2';
    var invoiceFileName = getInvoiceFileName(bill);
    var params = {
      invoiceNo: bill.billNo || '',
      fileName: invoiceFileName,
      invoiceFileName: invoiceFileName,
      invoiceDate: formatDate(bill.createdAt || bill.billDate),
      name: bill.customerName || 'Customer',
      phoneNo: bill.customerPhone || '',
      productList: isCarvino ? formatCarvinoProductList(bill.items) : formatProductList(bill.items),
      totalPrice: (bill.subTotal || 0),
      discountPrice: (bill.discount || 0),
      finalPrice: (bill.totalAmount || 0),
      finalPriceInWords: numberToWords(bill.totalAmount || 0),
      paymentMethod: bill.paymentMethod || 'Cash',
      gstin: bill.customerGST || '',
      companyName: settings.companyName || '',
      companyAddress: settings.companyAddress || '',
      companyPhone: settings.companyPhone || '',
      companyPhone2: settings.companyPhone2 || '',
      companyGST: settings.companyGST || '',
      website: settings.website || ''
    };

    var queryString = Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');

    return getAppsScriptUrl() + '?' + queryString;
  }

  function saveInvoiceUrls(billId, driveUrl, pdfUrl, fileId) {
    if (!window.Storage || typeof window.Storage.updateBill !== 'function') return;
    window.Storage.updateBill(billId, {
      invoiceDriveUrl: driveUrl,
      invoicePdfUrl: pdfUrl,
      invoiceFileId: fileId,
      invoiceGeneratedAt: new Date().toISOString()
    });
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currency(value) {
    return 'Rs.' + Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function sanitizeFileName(value) {
    return String(value || 'invoice').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  }

  function getInvoiceFileName(bill) {
    return sanitizeFileName((bill.billNo || 'Invoice') + ' - ' + (bill.customerName || 'Customer'));
  }

  function getScriptErrorMessage(data) {
    try {
      var parsed = JSON.parse(data);
      return parsed && parsed.message ? parsed.message : data;
    } catch (e) {
      return data;
    }
  }

  function buildFallbackRows(bill) {
    return (bill.items || []).map(function(item, index) {
      var isCarvino = bill.billingMode === 'carvino';
      var description = isCarvino ? (item.description || item.category || '') : (item.category || '');
      var material = isCarvino ? (item.material || item.itemName || '') : (item.itemName || '');
      var details = isCarvino
        ? [
            item.autoSqft ? 'Auto sqft' : '',
            item.height && item.width ? (item.height + ' x ' + item.width + ' ' + (item.sizeUnit || '')) : '',
            item.sqft ? (item.sqft + ' sqft') : ''
          ].filter(Boolean).join(' | ')
        : '';
      return '<tr>' +
        '<td>' + (index + 1) + '</td>' +
        '<td><strong>' + esc(description) + '</strong>' + (details ? '<small>' + esc(details) + '</small>' : '') + '</td>' +
        '<td>' + esc(material) + '</td>' +
        '<td class="num">' + currency(item.unitPrice || item.ratePerSqft || 0) + '</td>' +
        '<td class="num">' + esc(item.quantity || item.qty || 1) + '</td>' +
        '<td class="num">' + currency(item.totalPrice || item.subtotal || 0) + '</td>' +
      '</tr>';
    }).join('');
  }

  function buildFallbackInvoiceHTML(bill, scriptError) {
    var settings = window.Storage && typeof Storage.getSettings === 'function' ? Storage.getSettings() : {};
    var date = formatDate(bill.createdAt || bill.billDate);
    var invoiceFileName = getInvoiceFileName(bill);
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(invoiceFileName) + '</title>' +
      '<style>' +
      'body{font-family:Arial,sans-serif;margin:0;background:#f3f4f6;color:#111827}.page{max-width:900px;margin:24px auto;background:#fff;padding:34px;box-shadow:0 12px 40px rgba(0,0,0,.12)}' +
      '.top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111827;padding-bottom:18px;margin-bottom:22px}.brand h1{margin:0;font-size:24px}.brand p,.meta p{margin:4px 0;color:#4b5563;font-size:13px}.meta{text-align:right}' +
      '.warn{padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:8px;margin-bottom:18px;font-size:12px}' +
      '.party{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px}.box{border:1px solid #e5e7eb;border-radius:8px;padding:14px}.box h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#6b7280}' +
      'table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e5e7eb;padding:10px;text-align:left;font-size:13px}th{background:#f9fafb;text-transform:uppercase;font-size:11px;color:#374151}.num{text-align:right}small{display:block;margin-top:4px;color:#6b7280}' +
      '.totals{margin-left:auto;margin-top:18px;width:300px}.line{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb}.grand{font-weight:700;font-size:18px;border-bottom:0}' +
      '.actions{margin-top:22px;display:flex;gap:10px;justify-content:flex-end}.actions button{padding:10px 14px;border:0;border-radius:8px;background:#111827;color:white;cursor:pointer}' +
      '@media print{body{background:#fff}.page{margin:0;box-shadow:none}.actions,.warn{display:none}}' +
      '</style></head><body><div class="page">' +
      '<div class="warn">Cloud invoice failed: ' + esc(scriptError) + '. This is a local printable fallback.</div>' +
      '<div class="top"><div class="brand"><h1>' + esc(settings.companyName || 'Invoice') + '</h1><p>' + esc((settings.companyAddress || '').replace(/\n/g, ', ')) + '</p><p>' + esc([settings.companyPhone, settings.companyPhone2].filter(Boolean).join(' / ')) + '</p></div>' +
      '<div class="meta"><h2>INVOICE</h2><p><b>No:</b> ' + esc(bill.billNo || '') + '</p><p><b>Date:</b> ' + esc(date) + '</p><p><b>Payment:</b> ' + esc(bill.paymentMethod || 'Cash') + '</p></div></div>' +
      '<div class="party"><div class="box"><h3>Bill To</h3><strong>' + esc(bill.customerName || '') + '</strong><p>' + esc(bill.customerPhone || '') + '</p><p>' + esc(bill.customerGST || '') + '</p></div>' +
      '<div class="box"><h3>Amount In Words</h3><p>' + esc(numberToWords(bill.totalAmount || 0)) + '</p></div></div>' +
      '<table><thead><tr><th>#</th><th>Description</th><th>Material</th><th class="num">Rate</th><th class="num">Qty</th><th class="num">Total</th></tr></thead><tbody>' + buildFallbackRows(bill) + '</tbody></table>' +
      '<div class="totals"><div class="line"><span>Total Price</span><span>' + currency(bill.subTotal || 0) + '</span></div><div class="line"><span>Discount</span><span>' + currency(bill.discount || 0) + '</span></div><div class="line grand"><span>Final Price</span><span>' + currency(bill.totalAmount || 0) + '</span></div></div>' +
      '<div class="actions"><button onclick="window.print()">Print</button></div></div></body></html>';
  }

  function openFallbackInvoice(bill, scriptError) {
    var win = window.open('', '_blank');
    if (!win) {
      if (typeof showToast === 'function') showToast('Allow popups to open the invoice preview.', 'warning');
      return;
    }
    win.document.open();
    win.document.write(buildFallbackInvoiceHTML(bill, scriptError));
    win.document.close();
  }

  // ---- Progress Overlay Helpers ----
  function showProgressOverlay(title, sub) {
    var overlay = document.getElementById('invoiceProgressOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'invoiceProgressOverlay';
      overlay.className = 'progress-overlay';
      overlay.innerHTML = 
        '<div class="progress-card">' +
          '<div class="spinner"></div>' +
          '<div class="progress-title" id="progressTitle">Generating Invoice</div>' +
          '<div class="progress-sub" id="progressSub">Connecting to cloud server...</div>' +
          '<div class="progress-bar-wrap">' +
            '<div class="progress-bar-fill active" id="progressBar"></div>' +
          '</div>' +
          '<div id="manualDownloadArea" style="display:none;margin-top:24px;">' +
            '<p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">If your download didn\'t start, click below:</p>' +
            '<a id="manualDownloadBtn" class="btn btn-primary btn-sm" style="width:100%;text-decoration:none;">📥 Download PDF</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
    }
    document.getElementById('progressTitle').textContent = title || 'Generating Invoice';
    document.getElementById('progressSub').textContent = sub || 'Please wait...';
    document.getElementById('progressBar').style.width = '0%';
    
    // Trigger reflow for animation
    overlay.offsetHeight; 
    overlay.classList.add('show');
    return overlay;
  }

  function updateProgress(percent, sub) {
    var bar = document.getElementById('progressBar');
    var subEl = document.getElementById('progressSub');
    if (bar) bar.style.width = percent + '%';
    if (subEl && sub) subEl.textContent = sub;
  }

  function hideProgressOverlay() {
    var overlay = document.getElementById('invoiceProgressOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function forceDownload(url, filename) {
    try {
      var win = window.open(url, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        // If popup blocked, use a link
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = filename || 'invoice.pdf';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); }, 100);
      }
    } catch (e) {
      console.error('Download trigger failed:', e);
    }
  }

  /**
   * Generate invoice using Google Apps Script and open PDF for printing.
   * @param {string} billId - The bill ID to generate invoice for
   */
  window.generateCloudInvoice = function (billId) {
    try {
      var bill = null;
      if (window.Storage && typeof window.Storage.getBillById === 'function') {
        bill = window.Storage.getBillById(billId);
      }

      if (!bill) {
        if (typeof showToast === 'function') showToast('Bill not found', 'error');
        return;
      }

      var url = buildInvoiceUrl(bill);
      if (!getAppsScriptUrl()) {
        if (typeof showToast === 'function') showToast('Invoice URL is empty. Check Settings.', 'error');
        return;
      }

      // Show Progress Overlay
      showProgressOverlay('Generating Invoice', 'Connecting to cloud server...');
      updateProgress(30, 'Sending data to Google Drive...');

      fetch(url)
        .then(function (res) { return res.text(); })
        .then(function (data) {
          updateProgress(70, 'Building PDF document...');
          
          if (!data || !data.startsWith('http')) {
            hideProgressOverlay();
            var scriptError = getScriptErrorMessage(data || 'Unknown error');
            openFallbackInvoice(bill, scriptError);
            if (typeof showToast === 'function') showToast('Cloud invoice failed. Opened local preview.', 'warning');
            return;
          }

          var match = data.match(/\/d\/(.*?)\//);
          if (!match) {
            hideProgressOverlay();
            console.error('Invalid Drive URL');
            return;
          }

          var fileId = match[1];
          var pdfUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
          var fileName = getInvoiceFileName(bill) + '.pdf';

          saveInvoiceUrls(bill.id, data, pdfUrl, fileId);
          window.Storage.updateBill(bill.id, { invoiceFileName: getInvoiceFileName(bill) });

          updateProgress(100, 'Download starting...');
          
          // Setup manual button just in case
          var manualBtn = document.getElementById('manualDownloadBtn');
          var manualArea = document.getElementById('manualDownloadArea');
          if (manualBtn && manualArea) {
            manualBtn.href = pdfUrl;
            manualBtn.download = fileName;
            manualArea.style.display = 'block';
          }

          // Force download
          forceDownload(pdfUrl, fileName);
          
          setTimeout(function() {
            if (typeof showToast === 'function') {
              showToast('Invoice generated! Check your downloads.', 'success');
            }
            // Keep overlay open for a few seconds so they can see the manual button if needed
            setTimeout(function() {
              hideProgressOverlay();
              if (typeof returnToHomeAfterInvoice === 'function') {
                returnToHomeAfterInvoice();
              }
            }, 3000);
          }, 1000);
        })
        .catch(function (err) {
          hideProgressOverlay();
          console.error('Invoice generation failed:', err);
          if (typeof showToast === 'function') showToast('Generation failed: ' + err.message, 'error');
        });
    } catch (err) {
      hideProgressOverlay();
      console.error('Error in generateCloudInvoice:', err);
    }
  };

  // ---- Override the global generateXLSXInvoice to use cloud generation ----
  window.generateXLSXInvoice = function (billId) {
    window.generateCloudInvoice(billId);
  };

})();
