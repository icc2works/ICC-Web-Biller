// ===================== CLOUD INVOICE GENERATOR =====================
// Uses Google Apps Script to generate invoices via Google Sheets/Drive
// Returns a Google Drive PDF URL for printing

(function () {
  'use strict';

  // ---- Google Apps Script Web App URL ----
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywJJGgEbpwMxQjPAHRh2cCmI-UpFZAZZpg6kYs4WGD_UHaYwdBADr162gVdLvXPW7RFg/exec';

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
    var params = {
      invoiceNo: bill.billNo || '',
      invoiceDate: formatDate(bill.createdAt || bill.billDate),
      name: bill.customerName || 'Customer',
      phoneNo: bill.customerPhone || '',
      productList: formatProductList(bill.items),
      totalPrice: (bill.subTotal || 0),
      discountPrice: (bill.discount || 0),
      finalPrice: (bill.totalAmount || 0),
      paymentMethod: bill.paymentMethod || 'Cash'
    };

    var queryString = Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');

    return APPS_SCRIPT_URL + '?' + queryString;
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

  /**
   * Generate invoice using Google Apps Script and open PDF for printing.
   * @param {string} billId - The bill ID to generate invoice for
   */
  window.generateCloudInvoice = function (billId) {
    try {
      // Fetch bill from cloud-backed Storage
      var bill = null;
      if (window.Storage && typeof window.Storage.getBillById === 'function') {
        bill = window.Storage.getBillById(billId);
      }

      if (!bill) {
        if (typeof showToast === 'function') showToast('Bill not found', 'error');
        console.error('Bill not found:', billId);
        return;
      }

      var url = buildInvoiceUrl(bill);

      // Show loading message
      if (typeof showToast === 'function') {
        showToast('Generating invoice... Please wait.', 'success');
      }

      console.log('Calling Apps Script URL:', url);

      fetch(url)
        .then(function (res) { return res.text(); })
        .then(function (data) {
          console.log('Apps Script Response:', data);

          // Check if response is a valid Drive URL
          if (!data || !data.startsWith('http')) {
            if (typeof showToast === 'function') {
              showToast('Error generating invoice: ' + data, 'error');
            }
            console.error('Invalid response from Apps Script:', data);
            return;
          }

          // Extract file ID from Google Drive URL
          var match = data.match(/\/d\/(.*?)\//);
          if (!match) {
            if (typeof showToast === 'function') {
              showToast('Invalid Drive URL received', 'error');
            }
            console.error('Could not extract file ID from:', data);
            return;
          }

          var fileId = match[1];

          // Build direct PDF download URL
          var pdfUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;

          saveInvoiceUrls(bill.id, data, pdfUrl, fileId);

          // Open PDF in new window
          var win = window.open(pdfUrl, '_blank');

          // Try auto-print after a delay (best effort — may be blocked by browser)
          setTimeout(function () {
            try {
              if (win && !win.closed) {
                win.print();
              }
            } catch (e) {
              console.log('Auto-print not available or blocked by browser');
            }
          }, 3000);

          if (typeof showToast === 'function') {
            showToast('Invoice generated and saved to bill #' + bill.billNo + '. If print dialog didn\'t appear, press Ctrl+P.', 'success');
          }

          if (typeof returnToHomeAfterInvoice === 'function') {
            returnToHomeAfterInvoice();
          }
        })
        .catch(function (err) {
          console.error('Invoice generation failed:', err);
          if (typeof showToast === 'function') {
            showToast('Invoice generation failed: ' + err.message, 'error');
          }
        });
    } catch (err) {
      console.error('Error in generateCloudInvoice:', err);
      if (typeof showToast === 'function') {
        showToast('Error generating invoice: ' + err.message, 'error');
      }
    }
  };

  // ---- Override the global generateXLSXInvoice to use cloud generation ----
  window.generateXLSXInvoice = function (billId) {
    window.generateCloudInvoice(billId);
  };

})();
