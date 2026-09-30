/**
 * =========================================================================
 * CONCEPTORS ANIMAL HEALTH LLC - CRM GOOGLE DRIVE & SHEETS SYNC ENGINE
 * =========================================================================
 * 
 * This Google Apps Script connects your Conceptors Medical Rep CRM directly
 * to your Google Drive and Google Sheets.
 * 
 * FEATURES:
 * 1. Real-Time Multi-Device Sync: Keeps Laptop and Mobile Phone 100% in sync!
 * 2. Auto-Updating CSV Files: Automatically generates and saves master CSV files
 *    in your Google Drive folder ("Conceptors CRM Data"):
 *      - Conceptors_Visits_Master.csv
 *      - Conceptors_Orders_Master.csv
 *      - Conceptors_Daily_Reports.csv
 *      - Conceptors_Monthly_Plans.csv
 * 3. Live Google Spreadsheet Tabs:
 *      - Visits, Orders, MonthlyPlans, StockRequests, AuditLogs
 * 4. Zero Maintenance & 100% Free: Hosted directly on your personal Google Drive.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new) or create a new Sheet in your Google Drive.
 * 2. Click: Extensions -> Apps Script.
 * 3. Paste this entire code, replacing any placeholder code.
 * 4. Click: Deploy -> New deployment.
 * 5. Choose type: "Web app".
 *    - Description: Conceptors CRM Sync
 *    - Execute as: "Me" (your email)
 *    - Who has access: "Anyone"
 * 6. Click "Deploy", approve permissions, and COPY the Web App URL.
 * 7. In the CRM, click the "☁️ Google Drive Sync" badge in the top bar and paste your URL!
 */

const FOLDER_NAME = 'Conceptors CRM Data';

// =========================================================================
// 1. WEB APP API ENDPOINTS (GET & POST)
// =========================================================================

function getOrCreateSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch(e) {}

  const files = DriveApp.getFilesByName('Conceptors CRM Master Database');
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }

  // Auto-create spreadsheet if starting from a standalone script (script.new)
  const ss = SpreadsheetApp.create('Conceptors CRM Master Database');
  try {
    const folder = getOrCreateFolder(FOLDER_NAME);
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
  } catch(e) {}
  return ss;
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'GET_ALL';
    const ss = getOrCreateSpreadsheet();
    setupSheetsIfMissing(ss);

    if (action === 'PING') {
      return jsonResponse({ status: 'success', message: 'Conceptors CRM Google Drive Sync is Live!', timestamp: new Date().toISOString() });
    }

    if (action === 'EXPORT_CSV') {
      const csvResults = exportAllCsvsToDrive(ss);
      return jsonResponse({ status: 'success', message: 'CSVs refreshed in Google Drive', files: csvResults });
    }

    // Default: Return complete CRM master data
    const data = getAllMasterData(ss);
    return jsonResponse({
      status: 'success',
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const ss = getOrCreateSpreadsheet();
    setupSheetsIfMissing(ss);

    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = { raw: e.postData.contents };
      }
    }

    const action = payload.action || 'SYNC_ALL';
    let result = null;

    if (action === 'ADD_VISIT') {
      result = upsertVisitRow(ss, payload.visit);
      logAudit(ss, payload.user || 'Rep', 'ADD_VISIT', payload.visit ? payload.visit.id : '', 'Visit logged');
      exportAllCsvsToDrive(ss);
    } else if (action === 'ADD_ORDER') {
      result = upsertOrderRow(ss, payload.order);
      logAudit(ss, payload.user || 'Rep', 'ADD_ORDER', payload.order ? payload.order.invoiceNumber : '', 'Order submitted');
      exportAllCsvsToDrive(ss);
    } else if (action === 'UPDATE_ORDER_STATUS') {
      result = updateOrderStatus(ss, payload.invoiceNumber, payload.status, payload.approvedBy);
      logAudit(ss, payload.approvedBy || 'Manager', 'UPDATE_ORDER_STATUS', payload.invoiceNumber, `Status set to ${payload.status}`);
      exportAllCsvsToDrive(ss);
    } else if (action === 'SAVE_PLAN') {
      result = upsertPlanRow(ss, payload.plan);
      logAudit(ss, payload.user || 'User', 'SAVE_PLAN', payload.plan ? payload.plan.id : '', 'Monthly plan updated');
      exportAllCsvsToDrive(ss);
    } else if (action === 'ADD_STOCK_REQUEST') {
      result = upsertStockRequestRow(ss, payload.stockRequest);
      logAudit(ss, payload.user || 'Rep', 'ADD_STOCK_REQUEST', payload.stockRequest ? payload.stockRequest.id : '', 'Stock request submitted');
    } else if (action === 'SYNC_ALL') {
      // Two-way synchronization: Merge incoming client visits/orders with Google Sheet
      result = syncAllData(ss, payload.data || {});
      exportAllCsvsToDrive(ss);
    } else {
      result = { message: 'Action processed', action: action };
    }

    // Always return updated master data back to the client
    const masterData = getAllMasterData(ss);

    return jsonResponse({
      status: 'success',
      action: action,
      result: result,
      data: masterData,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// 2. AUTOMATIC SPREADSHEET TABS & HEADERS SETUP
// =========================================================================

function setupSheetsIfMissing(ss) {
  const definitions = [
    {
      name: 'Visits',
      headers: [
        'id', 'date', 'rep_id', 'rep_name', 'territory', 'client_code', 'client_name',
        'location', 'visit_category', 'status', 'time_slot', 'doctor_name', 'doctor_role',
        'doctor_sentiment', 'products_detailed', 'samples_dropped', 'sample_product',
        'order_placed', 'order_ref', 'order_value_aed', 'purpose', 'unplanned_reason',
        'outcome', 'missed_reason', 'next_follow_up', 'next_follow_up_purpose', 'updated_at'
      ]
    },
    {
      name: 'Orders',
      headers: [
        'invoice_number', 'date', 'rep_id', 'rep_name', 'territory', 'client_code',
        'client_name', 'location', 'subtotal_exc_vat', 'vat_amount', 'total_inc_vat',
        'payment_terms', 'delivery_urgency', 'approval_status', 'approved_by',
        'approved_at', 'items_summary', 'items_json', 'updated_at'
      ]
    },
    {
      name: 'MonthlyPlans',
      headers: [
        'id', 'rep_id', 'rep_name', 'year', 'month', 'target_visits', 'status',
        'submitted_at', 'approved_at', 'approved_by', 'manager_notes', 'updated_at'
      ]
    },
    {
      name: 'StockRequests',
      headers: [
        'id', 'rep_id', 'rep_name', 'product_code', 'product_name', 'request_type',
        'quantity', 'status', 'reason', 'requested_date', 'updated_at'
      ]
    },
    {
      name: 'AuditLogs',
      headers: ['timestamp', 'user', 'action', 'record_id', 'details']
    }
  ];

  definitions.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
}

// =========================================================================
// 3. MASTER DATA EXTRACTION (DATABASE -> JSON FOR CRM CLIENTS)
// =========================================================================

function getAllMasterData(ss) {
  return {
    visits: getSheetRowsAsObjects(ss, 'Visits', mapVisitFromSheet),
    orders: getSheetRowsAsObjects(ss, 'Orders', mapOrderFromSheet),
    monthlyPlans: getSheetRowsAsObjects(ss, 'MonthlyPlans', mapPlanFromSheet),
    stockRequests: getSheetRowsAsObjects(ss, 'StockRequests', mapStockRequestFromSheet)
  };
}

function getSheetRowsAsObjects(ss, sheetName, mapperFn) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx];
    });
    rows.push(mapperFn ? mapperFn(obj) : obj);
  }
  return rows;
}

// Data Mappers: Sheet Columns (snake_case) -> CRM Frontend Format (camelCase)
function mapVisitFromSheet(r) {
  let products = [];
  try {
    if (typeof r.products_detailed === 'string' && r.products_detailed.startsWith('[')) {
      products = JSON.parse(r.products_detailed);
    } else if (r.products_detailed) {
      products = String(r.products_detailed).split(';').map(s => s.trim()).filter(Boolean);
    }
  } catch(e) { products = []; }

  return {
    id: String(r.id),
    date: formatDateIso(r.date),
    repId: String(r.rep_id || 'T1'),
    territory: String(r.territory || r.rep_id || 'T1'),
    clientCode: String(r.client_code || ''),
    clientName: String(r.client_name || ''),
    location: String(r.location || 'UAE'),
    visitCategory: String(r.visit_category || 'Planned'),
    status: String(r.status || 'Planned'),
    timeSlot: String(r.time_slot || 'Morning Round (09:00 - 12:00)'),
    doctorName: String(r.doctor_name || ''),
    doctorRole: String(r.doctor_role || 'Lead Veterinarian'),
    doctorSentiment: String(r.doctor_sentiment || 'Pending'),
    productsDetailed: products,
    samplesDropped: Number(r.samples_dropped) || 0,
    sampleProduct: String(r.sample_product || ''),
    orderPlaced: String(r.order_placed).toUpperCase() === 'TRUE' || String(r.order_placed).toUpperCase() === 'YES',
    orderRef: String(r.order_ref || ''),
    orderValueAed: Number(r.order_value_aed) || 0,
    purpose: String(r.purpose || ''),
    unplannedReason: String(r.unplanned_reason || ''),
    outcome: String(r.outcome || ''),
    missedReason: String(r.missed_reason || ''),
    nextFollowUp: r.next_follow_up ? formatDateIso(r.next_follow_up) : '',
    nextFollowUpPurpose: String(r.next_follow_up_purpose || '')
  };
}

function mapOrderFromSheet(r) {
  let items = [];
  try {
    if (typeof r.items_json === 'string' && r.items_json.startsWith('[')) {
      items = JSON.parse(r.items_json);
    }
  } catch(e) { items = []; }

  return {
    invoiceNumber: String(r.invoice_number),
    date: formatDateIso(r.date),
    repId: String(r.rep_id || 'T1'),
    repName: String(r.rep_name || ''),
    territory: String(r.territory || r.rep_id || 'T1'),
    clientCode: String(r.client_code || ''),
    clientName: String(r.client_name || ''),
    location: String(r.location || 'UAE'),
    totalExcVat: Number(r.subtotal_exc_vat) || 0,
    vatAmount: Number(r.vat_amount) || 0,
    totalIncVat: Number(r.total_inc_vat) || 0,
    paymentTerms: String(r.payment_terms || '30 Days Credit'),
    deliveryUrgency: String(r.delivery_urgency || 'Normal (48h)'),
    approvalStatus: String(r.approval_status || 'Pending'),
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    itemsSummary: String(r.items_summary || ''),
    items: items
  };
}

function mapPlanFromSheet(r) {
  return {
    id: String(r.id),
    repId: String(r.rep_id),
    repName: String(r.rep_name || ''),
    year: Number(r.year) || 2026,
    month: Number(r.month) || 9,
    targetVisits: Number(r.target_visits) || 120,
    status: String(r.status || 'Draft'),
    submittedAt: r.submitted_at ? String(r.submitted_at) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    managerNotes: String(r.manager_notes || '')
  };
}

function mapStockRequestFromSheet(r) {
  return {
    id: String(r.id),
    repId: String(r.rep_id),
    repName: String(r.rep_name),
    productCode: String(r.product_code),
    productName: String(r.product_name),
    requestType: String(r.request_type),
    quantity: Number(r.quantity) || 1,
    status: String(r.status || 'Pending'),
    reason: String(r.reason || ''),
    requestedDate: formatDateIso(r.requested_date)
  };
}

function formatDateIso(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).split('T')[0];
}

// =========================================================================
// 4. DATA UPSERTION (APPEND OR UPDATE ROWS WITHOUT DUPLICATES)
// =========================================================================

function upsertVisitRow(ss, v) {
  if (!v || !v.id) return { error: 'No visit ID' };
  const sheet = ss.getSheetByName('Visits');
  const data = sheet.getDataRange().getValues();
  const idCol = 0;

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(v.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  const productsStr = Array.isArray(v.productsDetailed) ? v.productsDetailed.join('; ') : (v.productsDetailed || '');
  const rowValues = [
    v.id,
    v.date || '',
    v.repId || v.territory || 'T1',
    getRepName(v.repId || v.territory),
    v.territory || v.repId || 'T1',
    v.clientCode || '',
    v.clientName || '',
    v.location || 'UAE',
    v.visitCategory || 'Planned',
    v.status || 'Planned',
    v.timeSlot || 'Morning Round (09:00 - 12:00)',
    v.doctorName || '',
    v.doctorRole || 'Lead Veterinarian',
    v.doctorSentiment || 'Pending',
    productsStr,
    v.samplesDropped || 0,
    v.sampleProduct || '',
    v.orderPlaced ? 'YES' : 'NO',
    v.orderRef || '',
    v.orderValueAed || 0,
    v.purpose || '',
    v.unplannedReason || '',
    v.outcome || '',
    v.missedReason || '',
    v.nextFollowUp || '',
    v.nextFollowUpPurpose || '',
    new Date().toISOString()
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return { status: 'updated', id: v.id, row: rowIndex };
  } else {
    sheet.appendRow(rowValues);
    return { status: 'inserted', id: v.id };
  }
}

function upsertOrderRow(ss, o) {
  if (!o || !o.invoiceNumber) return { error: 'No order invoiceNumber' };
  const sheet = ss.getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(o.invoiceNumber)) {
      rowIndex = i + 1;
      break;
    }
  }

  const itemsJson = JSON.stringify(o.items || []);
  const itemsSummary = o.itemsSummary || (o.items || []).map(it => `${it.productName || it.productCode} (${it.salesQty || 0}x)`).join(', ');

  const rowValues = [
    o.invoiceNumber,
    o.date || '',
    o.repId || 'T1',
    o.repName || getRepName(o.repId),
    o.territory || o.repId || 'T1',
    o.clientCode || '',
    o.clientName || '',
    o.location || 'UAE',
    o.totalExcVat || 0,
    o.vatAmount || 0,
    o.totalIncVat || 0,
    o.paymentTerms || '30 Days Credit',
    o.deliveryUrgency || 'Normal (48h)',
    o.approvalStatus || 'Pending',
    o.approvedBy || '',
    o.approvedAt || '',
    itemsSummary,
    itemsJson,
    new Date().toISOString()
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return { status: 'updated', id: o.invoiceNumber, row: rowIndex };
  } else {
    sheet.appendRow(rowValues);
    return { status: 'inserted', id: o.invoiceNumber };
  }
}

function updateOrderStatus(ss, invoiceNumber, newStatus, approvedBy) {
  const sheet = ss.getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(invoiceNumber)) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, 14).setValue(newStatus); // approval_status
      sheet.getRange(rowIndex, 15).setValue(approvedBy || 'Manager'); // approved_by
      sheet.getRange(rowIndex, 16).setValue(new Date().toISOString()); // approved_at
      sheet.getRange(rowIndex, 19).setValue(new Date().toISOString()); // updated_at
      return { status: 'success', invoiceNumber: invoiceNumber, newStatus: newStatus };
    }
  }
  return { error: 'Order not found: ' + invoiceNumber };
}

function upsertPlanRow(ss, p) {
  if (!p || !p.id) return { error: 'No plan ID' };
  const sheet = ss.getSheetByName('MonthlyPlans');
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    p.id,
    p.repId || 'T1',
    p.repName || getRepName(p.repId),
    p.year || 2026,
    p.month || 9,
    p.targetVisits || 120,
    p.status || 'Draft',
    p.submittedAt || '',
    p.approvedAt || '',
    p.approvedBy || '',
    p.managerNotes || '',
    new Date().toISOString()
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return { status: 'updated', id: p.id };
  } else {
    sheet.appendRow(rowValues);
    return { status: 'inserted', id: p.id };
  }
}

function upsertStockRequestRow(ss, s) {
  if (!s || !s.id) return { error: 'No stock request ID' };
  const sheet = ss.getSheetByName('StockRequests');
  const rowValues = [
    s.id,
    s.repId || 'T1',
    s.repName || getRepName(s.repId),
    s.productCode || '',
    s.productName || '',
    s.requestType || 'Sample Request',
    s.quantity || 1,
    s.status || 'Pending',
    s.reason || '',
    s.requestedDate || '',
    new Date().toISOString()
  ];
  sheet.appendRow(rowValues);
  return { status: 'inserted', id: s.id };
}

function syncAllData(ss, clientData) {
  let visitsCount = 0;
  let ordersCount = 0;

  if (Array.isArray(clientData.visits)) {
    clientData.visits.forEach(v => {
      upsertVisitRow(ss, v);
      visitsCount++;
    });
  }

  if (Array.isArray(clientData.orders)) {
    clientData.orders.forEach(o => {
      upsertOrderRow(ss, o);
      ordersCount++;
    });
  }

  if (Array.isArray(clientData.monthlyPlans)) {
    clientData.monthlyPlans.forEach(p => {
      upsertPlanRow(ss, p);
    });
  }

  return { visitsSynced: visitsCount, ordersSynced: ordersCount };
}

function logAudit(ss, user, action, recordId, details) {
  try {
    const sheet = ss.getSheetByName('AuditLogs');
    if (sheet) {
      sheet.appendRow([new Date().toISOString(), user, action, recordId, details]);
    }
  } catch(e) {}
}

function getRepName(repId) {
  if (repId === 'T1' || repId === 'rep_t1') return 'Dr. Shaimaa Al-Zahra';
  if (repId === 'T2' || repId === 'rep_t2') return 'Dr. Omnia Essam';
  if (repId === 'ALL') return 'All Medical Representatives';
  return repId || 'Representative';
}

// =========================================================================
// 5. AUTO-UPDATING CSV EXPORT TO GOOGLE DRIVE FOLDER
// =========================================================================

function exportAllCsvsToDrive(ss) {
  try {
    const folder = getOrCreateFolder(FOLDER_NAME);
    const results = {};

    // 1. Export Visits CSV
    const visitsSheet = ss.getSheetByName('Visits');
    if (visitsSheet) {
      const visitsCsv = sheetToCsv(visitsSheet);
      const file = saveCsvFile(folder, 'Conceptors_Visits_Master.csv', visitsCsv);
      results.visitsCsv = file.getUrl();
    }

    // 2. Export Orders CSV
    const ordersSheet = ss.getSheetByName('Orders');
    if (ordersSheet) {
      const ordersCsv = sheetToCsv(ordersSheet);
      const file = saveCsvFile(folder, 'Conceptors_Orders_Master.csv', ordersCsv);
      results.ordersCsv = file.getUrl();
    }

    // 3. Export Monthly Plans CSV
    const plansSheet = ss.getSheetByName('MonthlyPlans');
    if (plansSheet) {
      const plansCsv = sheetToCsv(plansSheet);
      const file = saveCsvFile(folder, 'Conceptors_Monthly_Plans.csv', plansCsv);
      results.plansCsv = file.getUrl();
    }

    return results;
  } catch (err) {
    Logger.log('CSV Export to Drive error: ' + err);
    return { error: err.toString() };
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function saveCsvFile(folder, fileName, csvContent) {
  const files = folder.getFilesByName(fileName);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(csvContent);
    return file;
  }
  return folder.createFile(fileName, csvContent, MimeType.CSV);
}

function sheetToCsv(sheet) {
  const data = sheet.getDataRange().getValues();
  const csvRows = [];
  data.forEach(row => {
    const cleanRow = row.map(cell => {
      let str = '';
      if (cell instanceof Date) {
        str = formatDateIso(cell);
      } else {
        str = String(cell === null || cell === undefined ? '' : cell);
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    });
    csvRows.push(cleanRow.join(','));
  });
  // Include UTF-8 BOM for Excel Arabic / international character compatibility
  return '\uFEFF' + csvRows.join('\r\n');
}
