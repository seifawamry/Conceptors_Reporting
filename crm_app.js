// Conceptors Animal Health LLC - Dedicated Medical Representative CRM Application
// Complete Field Reporting, Password Auth, Data Isolation, Monthly Planner, Daily Visits & Order Automation Engine

// =========================================================================
// 1. CONSTANTS & APPLICATION STATE
// =========================================================================

const STORAGE_KEY_AUTH_USER = 'conceptors_crm_auth_user';
const STORAGE_KEY_THEME = 'conceptors_crm_theme';
const STORAGE_KEY_DATE = 'conceptors_crm_daily_date';
const STORAGE_KEY_VISITS = 'conceptors_crm_visits';
const STORAGE_KEY_ORDERS = 'conceptors_crm_orders';
const STORAGE_KEY_PLANS = 'conceptors_crm_monthly_plans';
const STORAGE_KEY_SETTINGS = 'conceptors_crm_manager_settings';
const STORAGE_KEY_NOTIFS = 'conceptors_crm_notifications';
const STORAGE_KEY_GDRIVE_URL = 'conceptors_crm_gdrive_url';

// =========================================================================
// GOOGLE DRIVE & GOOGLE SHEETS CLOUD SYNC ENGINE
// Keeps Laptop & Mobile Phone 100% In Sync + Auto-Updates Drive CSVs
// =========================================================================

function getGoogleDriveUrl() {
  return localStorage.getItem(STORAGE_KEY_GDRIVE_URL) || window.CONCEPTORS_GDRIVE_URL || '';
}
window.getGoogleDriveUrl = getGoogleDriveUrl;

function setGoogleDriveUrl(url) {
  if (url && typeof url === 'string') {
    localStorage.setItem(STORAGE_KEY_GDRIVE_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_GDRIVE_URL);
  }
}
window.setGoogleDriveUrl = setGoogleDriveUrl;

// =========================================================================
// SUPABASE CLOUD DATABASE CONFIGURATION & REST CLIENT (FALLBACK ENGINE)
// =========================================================================

const SUPABASE_URL = 'https://pywtpdnhomommitlidqo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5d3RwZG5ob21vbW1pdGxpZHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDcyMDMsImV4cCI6MjEwNDQ4MzIwM30.tNq5iHeG4A6clPXW8LqbCl4t1O8RMq8WRG6UkUApxb0';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yKZHaHtIklq258M-XiPnlQ_Y_GC1HwU';

window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  publishableKey: SUPABASE_PUBLISHABLE_KEY
};

let supabaseClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
  }
} catch (e) {
  console.warn('Supabase JS Client SDK init:', e);
}

async function supabaseRest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint.replace(/^\//, '')}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || (options.method === 'POST' || options.method === 'PATCH' ? 'return=minimal' : 'return=representation'),
    ...(options.headers || {})
  };
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!res.ok) {
      const errTxt = await res.text();
      return { data: null, error: { status: res.status, message: errTxt } };
    }
    const contentType = res.headers.get('content-type') || '';
    if (res.status !== 204 && contentType.includes('application/json')) {
      const json = await res.json();
      return { data: json, error: null };
    }
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: { status: 0, message: err.message } };
  }
}
window.supabaseRest = supabaseRest;

// Unified Cloud & Google Drive UI Connection Indicator
function updateCloudSyncBadge(status, text) {
  const badge = document.getElementById('cloudSyncBadge') || document.getElementById('supabaseSyncBadge');
  const dot = document.getElementById('cloudSyncDot') || document.getElementById('supabaseSyncDot');
  const label = document.getElementById('cloudSyncText') || document.getElementById('supabaseSyncText');
  if (!badge || !dot || !label) return;

  if (status === 'connected') {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shrink-0';
    label.className = 'font-mono text-emerald-300';
    label.textContent = text || '🟢 Drive Synced';
    badge.title = 'Google Drive Cloud Connected (Mobile & Laptop 100% Synced) - Click to Manage';
  } else if (status === 'syncing') {
    dot.className = 'w-2 h-2 rounded-full bg-sky-400 shrink-0 animate-ping';
    label.className = 'font-mono text-sky-300';
    label.textContent = text || '🔄 Syncing...';
    badge.title = 'Synchronizing data with Google Drive Cloud';
  } else if (status === 'supabase') {
    dot.className = 'w-2 h-2 rounded-full bg-cyan-400 shrink-0';
    label.className = 'font-mono text-cyan-300';
    label.textContent = text || '⚡ Supabase Synced';
    badge.title = 'Supabase Cloud Database Connected';
  } else if (status === 'offline') {
    dot.className = 'w-2 h-2 rounded-full bg-amber-400 shrink-0';
    label.className = 'font-mono text-amber-300';
    label.textContent = text || '💾 Local Cache';
    badge.title = 'Offline / Local Cache Mode (Click to Connect Google Drive)';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-slate-400 shrink-0';
    label.className = 'font-mono text-slate-400';
    label.textContent = text || '☁️ Cloud Sync';
    badge.title = 'Click to configure Google Drive Cloud Sync';
  }
}
window.updateCloudSyncBadge = updateCloudSyncBadge;
window.updateSupabaseSyncBadge = updateCloudSyncBadge; // Backward compatibility

// Asynchronous background push to Google Drive Web App
async function pushToGoogleDrive(action, payload = {}) {
  const gdriveUrl = getGoogleDriveUrl();
  if (!gdriveUrl) return false;
  try {
    const bodyObj = {
      action,
      user: (state.currentUser && state.currentUser.name) || 'Representative',
      ...payload
    };
    // Send as text/plain to strictly prevent browser CORS preflight OPTIONS requests
    fetch(gdriveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(bodyObj),
      redirect: 'follow'
    }).then(res => res.json()).then(resJson => {
      if (resJson && resJson.status === 'success') {
        updateCloudSyncBadge('connected', '🟢 Drive Synced');
      }
    }).catch(err => {
      console.warn('Background Google Drive sync push warning:', err);
    });
    return true;
  } catch (e) {
    console.warn('pushToGoogleDrive exception:', e);
    return false;
  }
}
window.pushToGoogleDrive = pushToGoogleDrive;

// Complete Two-Way Sync with Google Drive
async function syncWithGoogleDrive(force = false) {
  const gdriveUrl = getGoogleDriveUrl();
  if (!gdriveUrl) {
    // If no Google Drive URL configured, fallback to Supabase check
    return syncWithSupabase(force);
  }

  updateCloudSyncBadge('syncing', '🔄 Syncing Drive...');
  try {
    const res = await fetch(`${gdriveUrl}?action=GET_ALL&_t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !json.data) {
      throw new Error(json.message || 'Invalid response from Google Drive');
    }

    const cloudData = json.data;
    let newVisitsMerged = 0;
    let newOrdersMerged = 0;

    // 1. Two-Way Merge Visits (Never delete any visits!)
    if (Array.isArray(cloudData.visits)) {
      const cloudVisitMap = new Map(cloudData.visits.map(v => [v.id, v]));
      const localVisitMap = new Map((state.visits || []).map(v => [v.id, v]));

      cloudVisitMap.forEach((cv, id) => {
        if (!localVisitMap.has(id)) {
          state.visits.unshift(cv);
          newVisitsMerged++;
        } else {
          const lv = localVisitMap.get(id);
          if (cv.status !== lv.status || cv.outcome !== lv.outcome || cv.doctorSentiment !== lv.doctorSentiment) {
            Object.assign(lv, cv);
          }
        }
      });

      // Push any locally recorded visits that are not yet in Google Drive
      const unpushedVisits = (state.visits || []).filter(lv => !cloudVisitMap.has(lv.id));
      if (unpushedVisits.length > 0) {
        pushToGoogleDrive('SYNC_ALL', { data: { visits: unpushedVisits } });
      }
    }

    // 2. Two-Way Merge Orders
    if (Array.isArray(cloudData.orders)) {
      const cloudOrderMap = new Map(cloudData.orders.map(o => [o.invoiceNumber, o]));
      const localOrderMap = new Map((state.orders || []).map(o => [o.invoiceNumber, o]));

      cloudOrderMap.forEach((co, inv) => {
        if (!localOrderMap.has(inv)) {
          state.orders.unshift(co);
          newOrdersMerged++;
        } else {
          const lo = localOrderMap.get(inv);
          if (co.approvalStatus !== lo.approvalStatus) {
            lo.approvalStatus = co.approvalStatus;
            lo.approvedBy = co.approvedBy;
            lo.approvedAt = co.approvedAt;
          }
        }
      });

      const unpushedOrders = (state.orders || []).filter(lo => !cloudOrderMap.has(lo.invoiceNumber));
      if (unpushedOrders.length > 0) {
        pushToGoogleDrive('SYNC_ALL', { data: { orders: unpushedOrders } });
      }
    }

    // 3. Merge Monthly Plans
    if (Array.isArray(cloudData.monthlyPlans) && cloudData.monthlyPlans.length > 0) {
      state.monthlyPlans = cloudData.monthlyPlans;
    }

    persistData();
    renderAll();
    updateCloudSyncBadge('connected', '🟢 Drive Synced');

    if (force) {
      showToast('☁️ Google Drive Synchronized', `Connected to Google Drive! Merged ${newVisitsMerged} visits and ${newOrdersMerged} orders across your devices.`, 'success');
    }
    return { success: true };
  } catch (err) {
    console.warn('Google Drive sync warning (operating in local cache):', err);
    updateCloudSyncBadge('offline', '💾 Local Mode');
    if (force) {
      showToast('Google Drive Sync Notice', 'Could not reach Google Drive script. Operating in local storage mode. Check your Web App URL in settings.', 'warning');
    }
    return { success: false, error: err.message };
  }
}
window.syncWithGoogleDrive = syncWithGoogleDrive;

// Data Mappers: Database (snake_case) <-> Frontend State (camelCase)
function mapVisitFromDb(row) {
  return {
    id: row.id,
    repId: row.rep_id,
    territory: row.rep_id,
    clientCode: row.client_code,
    clientName: row.client_name,
    location: row.location,
    date: row.date,
    timeSlot: row.time_slot || 'Morning Round (09:00 - 12:00)',
    visitCategory: row.visit_category || 'Planned',
    status: row.status || 'Planned',
    doctorName: row.doctor_name || '',
    doctorRole: row.doctor_role || 'Lead Veterinarian',
    productsDetailed: row.products_detailed || [],
    doctorSentiment: row.doctor_sentiment || 'Pending',
    samplesDropped: row.samples_dropped || 0,
    sampleProduct: row.sample_product || '',
    orderPlaced: Boolean(row.order_placed),
    orderRef: row.order_ref || '',
    orderValueAed: Number(row.order_value_aed) || 0,
    purpose: row.purpose || '',
    unplannedReason: row.unplanned_reason || '',
    outcome: row.outcome || '',
    missedReason: row.missed_reason || '',
    nextFollowUp: row.next_follow_up || '',
    nextFollowUpPurpose: row.next_follow_up_purpose || ''
  };
}

function mapVisitToDb(v) {
  return {
    id: v.id,
    rep_id: v.repId || v.territory || 'T1',
    client_code: v.clientCode,
    client_name: v.clientName,
    location: v.location || 'UAE',
    date: v.date,
    time_slot: v.timeSlot || 'Morning Round (09:00 - 12:00)',
    visit_category: v.visitCategory || 'Planned',
    status: v.status || 'Planned',
    doctor_name: v.doctorName || '',
    doctor_role: v.doctorRole || 'Lead Veterinarian',
    products_detailed: v.productsDetailed || [],
    doctor_sentiment: v.doctorSentiment || 'Pending',
    samples_dropped: v.samplesDropped || 0,
    sample_product: v.sampleProduct || '',
    order_placed: Boolean(v.orderPlaced),
    order_ref: v.orderRef || '',
    order_value_aed: Number(v.orderValueAed) || 0,
    purpose: v.purpose || '',
    unplanned_reason: v.unplannedReason || '',
    outcome: v.outcome || '',
    missed_reason: v.missedReason || '',
    next_follow_up: v.nextFollowUp || null,
    next_follow_up_purpose: v.nextFollowUpPurpose || '',
    updated_at: new Date().toISOString()
  };
}

function mapOrderFromDb(row) {
  const items = (row.order_items || []).map(it => ({
    productCode: it.product_code,
    productName: it.product_name,
    unitPrice: Number(it.unit_price) || 0,
    salesQty: Number(it.sales_qty) || 0,
    focQty: Number(it.foc_qty) || 0,
    total: Number(it.line_total) || 0
  }));
  return {
    invoiceNumber: row.invoice_number,
    date: row.date,
    repId: row.rep_id,
    repName: row.rep_name,
    clientCode: row.client_code,
    clientName: row.client_name,
    location: row.location,
    territory: row.territory,
    approvalStatus: row.approval_status || 'Pending',
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    paymentTerms: row.payment_terms || '30 Days Credit',
    deliveryUrgency: row.delivery_urgency || 'Normal (48h)',
    items,
    totalExcVat: Number(row.subtotal_exc_vat) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    totalIncVat: Number(row.total_inc_vat) || 0
  };
}

function mapOrderToDb(o) {
  return {
    invoice_number: o.invoiceNumber,
    date: o.date,
    rep_id: o.repId,
    rep_name: o.repName,
    client_code: o.clientCode,
    client_name: o.clientName,
    location: o.location,
    territory: o.territory,
    approval_status: o.approvalStatus || 'Pending',
    approved_by: o.approvedBy || null,
    approved_at: o.approvedAt || null,
    payment_terms: o.paymentTerms || '30 Days Credit',
    delivery_urgency: o.deliveryUrgency || 'Normal (48h)',
    subtotal_exc_vat: Number(o.totalExcVat) || 0,
    vat_amount: Number(o.vatAmount) || 0,
    total_inc_vat: Number(o.totalIncVat) || 0,
    updated_at: new Date().toISOString()
  };
}

function mapPlanFromDb(row) {
  return {
    id: row.id,
    repId: row.rep_id,
    repName: row.rep_name,
    year: row.year,
    month: row.month,
    targetVisits: row.target_visits,
    status: row.status,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    managerNotes: row.manager_notes || ''
  };
}

function mapCustomerFromDb(row) {
  return {
    code: row.code,
    name: row.name,
    location: row.location,
    territory: row.territory,
    repId: row.rep_id,
    tier: row.tier,
    contactPerson: row.contact_person,
    phone: row.phone,
    address: row.address || '',
    notes: row.notes || '',
    isActive: row.is_active !== false
  };
}

function mapCustomerToDb(c) {
  return {
    code: c.code,
    name: c.name,
    location: c.location,
    territory: c.territory || c.repId,
    rep_id: c.repId || c.territory,
    tier: c.tier || 'Silver',
    contact_person: c.contactPerson || '',
    phone: c.phone || '',
    address: c.address || '',
    notes: c.notes || '',
    is_active: c.isActive !== false
  };
}

function mapProductFromDb(row) {
  return {
    code: row.code,
    id: row.sku_id || row.code,
    brand: row.brand,
    name: row.name,
    unitPrice: Number(row.unit_price) || 0,
    currentStock: Number(row.current_stock) || 0,
    category: row.category
  };
}

function mapNotifFromDb(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    orderNumber: row.order_number,
    repId: row.rep_id,
    repName: row.rep_name,
    clientCode: row.client_code,
    clientName: row.client_name,
    location: row.location,
    totalExcVat: Number(row.total_exc_vat) || 0,
    totalIncVat: Number(row.total_inc_vat) || 0,
    timestamp: row.timestamp,
    read: Boolean(row.read),
    approvalStatus: row.approval_status,
    itemsSummary: row.items_summary,
    paymentTerms: row.payment_terms,
    deliveryUrgency: row.delivery_urgency,
    items: row.items_json || []
  };
}

function mapNotifToDb(n) {
  return {
    id: n.id,
    type: n.type || 'ORDER_SUBMITTED',
    title: n.title,
    order_number: n.orderNumber,
    rep_id: n.repId,
    rep_name: n.repName,
    client_code: n.clientCode,
    client_name: n.clientName,
    location: n.location,
    total_exc_vat: Number(n.totalExcVat) || 0,
    total_inc_vat: Number(n.totalIncVat) || 0,
    timestamp: n.timestamp || new Date().toISOString(),
    read: Boolean(n.read),
    approval_status: n.approvalStatus || 'Pending',
    items_summary: n.itemsSummary,
    payment_terms: n.paymentTerms,
    delivery_urgency: n.deliveryUrgency,
    items_json: n.items || []
  };
}

async function syncWithSupabase(force = false) {
  updateSupabaseSyncBadge('syncing', 'Syncing Cloud...');
  try {
    const visitsRes = await supabaseRest('visits?select=*&order=date.desc');
    if (visitsRes.error) {
      if (visitsRes.error.status === 404) {
        console.info('Supabase: Schema not yet migrated. Operating in local cache mode.');
        updateSupabaseSyncBadge('offline', '💾 Local Mode (Run SQL)');
        return;
      }
      throw new Error(visitsRes.error.message || 'Visits fetch error');
    }

    if (visitsRes.data && Array.isArray(visitsRes.data)) {
      if (visitsRes.data.length > 0) {
        state.visits = visitsRes.data.map(mapVisitFromDb);
      }
    }

    const [ordersRes, itemsRes] = await Promise.all([
      supabaseRest('orders?select=*&order=date.desc'),
      supabaseRest('order_items?select=*')
    ]);
    if (ordersRes.data && Array.isArray(ordersRes.data) && ordersRes.data.length > 0) {
      const allItems = (itemsRes && itemsRes.data && Array.isArray(itemsRes.data)) ? itemsRes.data : [];
      const itemsByOrder = {};
      allItems.forEach(it => {
        if (!itemsByOrder[it.order_number]) itemsByOrder[it.order_number] = [];
        itemsByOrder[it.order_number].push(it);
      });
      state.orders = ordersRes.data.map(o => {
        o.order_items = itemsByOrder[o.invoice_number] || [];
        return mapOrderFromDb(o);
      });
    }

    const plansRes = await supabaseRest('monthly_plans?select=*');
    if (plansRes.data && Array.isArray(plansRes.data) && plansRes.data.length > 0) {
      state.monthlyPlans = plansRes.data.map(mapPlanFromDb);
    }

    const custRes = await supabaseRest('customers?select=*');
    if (custRes.data && Array.isArray(custRes.data) && custRes.data.length > 0) {
      state.customers = custRes.data.map(mapCustomerFromDb);
    }

    const prodRes = await supabaseRest('products?select=*');
    if (prodRes.data && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
      state.products = prodRes.data.map(mapProductFromDb);
    }

    const notifRes = await supabaseRest('notifications?select=*&order=timestamp.desc');
    if (notifRes.data && Array.isArray(notifRes.data) && notifRes.data.length > 0) {
      const prevIds = new Set((state.notifications || []).map(n => n.id));
      const freshNotifs = notifRes.data.map(mapNotifFromDb);
      const newAlerts = freshNotifs.filter(n => !n.read && !prevIds.has(n.id));
      state.notifications = freshNotifs;

      // If new unread alerts arrived while Senior Manager is in the app
      if (newAlerts.length > 0 && state.currentUser && state.currentUser.role === 'manager') {
        if (state.managerSettings.soundAlert) playNotificationChime();
        if (state.managerSettings.toastAlert) {
          showToast(`🚨 ${newAlerts[0].title}`, newAlerts[0].itemsSummary || 'New field alert received.', 'info');
        }
      }
    }

    const setRes = await supabaseRest('manager_settings?id=eq.default&select=*');
    if (setRes.data && Array.isArray(setRes.data) && setRes.data.length > 0) {
      state.managerSettings = {
        managerEmails: setRes.data[0].manager_emails,
        soundAlert: Boolean(setRes.data[0].sound_alert),
        toastAlert: Boolean(setRes.data[0].toast_alert)
      };
    }

    persistData();
    renderAll();
    updateSupabaseSyncBadge('connected', '⚡ Cloud Synced');
    if (force) {
      showToast('Cloud Synchronized', 'All visits, orders, monthly plans and clinics refreshed from Supabase.', 'success');
    }
  } catch (err) {
    console.warn('Supabase sync warning (using local store):', err);
    updateSupabaseSyncBadge('offline', '💾 Local Mode');
  }
}
window.syncWithSupabase = syncWithSupabase;

// Field Stock Request Module (Submits to Supabase stock_requests)
window.submitStockRequest = async function(reqData) {
  const stockReq = {
    id: `STK-REQ-${Date.now().toString().slice(-6)}`,
    rep_id: reqData.repId || state.currentUser?.territory || 'T1',
    rep_name: reqData.repName || state.currentUser?.name || 'Representative',
    product_code: reqData.productCode,
    product_name: reqData.productName,
    request_type: reqData.requestType || 'Sample Request',
    quantity: parseInt(reqData.quantity) || 1,
    status: 'Pending',
    reason: reqData.reason || '',
    requested_date: getSyncedTodayDate()
  };
  const res = await supabaseRest('stock_requests', { method: 'POST', body: stockReq });
  return res;
};

// =========================================================================
// REAL-TIME TIMEZONE & LIVE DATE ENGINE (UAE GST UTC+4)
// =========================================================================

function getSyncedTodayDate(tz = 'Asia/Dubai') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date()); // Formats as YYYY-MM-DD
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
window.getSyncedTodayDate = getSyncedTodayDate;

function getOffsetDateStr(baseDateStr, offsetDays) {
  try {
    const parts = (baseDateStr || getSyncedTodayDate()).split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return baseDateStr;
  }
}
window.getOffsetDateStr = getOffsetDateStr;

function getSyncedTimeStr(tz = 'Asia/Dubai') {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  }
}
window.getSyncedTimeStr = getSyncedTimeStr;

function startLiveTimeTicker() {
  function tick() {
    const clockEl = document.getElementById('uaeLiveClock');
    if (clockEl) {
      const time = getSyncedTimeStr(state.timeZone || 'Asia/Dubai');
      clockEl.textContent = `UAE ${time} GST`;
    }
  }
  tick();
  setInterval(tick, 1000);
}

const state = {
  currentUser: null, // { username, role, territory, name, email, avatar, title }
  theme: 'dark', // 'dark' or 'light'
  timeZone: 'Asia/Dubai', // UAE Standard Time (GST, UTC+4)
  dailyDate: getSyncedTodayDate(),
  dailyReportDate: getSyncedTodayDate(),
  plannerView: 'calendar', // 'calendar' or 'table'
  plannerCalendarMonth: parseInt(getSyncedTodayDate().split('-')[1], 10),
  plannerCalendarYear: parseInt(getSyncedTodayDate().split('-')[0], 10),
  plannerSelectedDay: null,
  products: [],
  customers: [],
  reps: [],
  managers: [],
  visits: [],
  orders: [],
  monthlyPlans: [],
  notifications: [],
  managerSettings: {
    managerEmails: 'sameh.ageez@conceptors.ae, gm@conceptors.ae',
    soundAlert: true,
    toastAlert: true
  },
  filters: {
    dailyReportRep: 'ALL',
    dailyReportStatus: 'ALL',
    dailyReportSearch: '',
    plannerSearch: '',
    plannerStatus: 'Planned',
    reportsSearch: '',
    reportsType: 'ALL',
    reportsSentiment: 'ALL',
    reportsOrder: 'ALL',
    ordersSearch: '',
    ordersApproval: 'ALL',
    accountsSearch: '',
    accountsTerritory: 'ALL',
    accountsMonthFilter: 'CURRENT',
    analyticsRepFilter: 'ALL',
    analyticsTimeframe: 'MTD',
    analyticsRosterSearch: '',
    analyticsRosterFilter: 'ALL'
  }
};

// =========================================================================
// 2. LIFECYCLE & INITIALIZATION
// =========================================================================

function initCrmApp() {
  try {
    loadStoredData();
    initTheme();
    checkAuthSession();
    renderAll();
    startLiveTimeTicker();
    safeLucide();

    // Automatic Cloud Sync: Prefer Google Drive, fallback to Supabase
    if (getGoogleDriveUrl()) {
      syncWithGoogleDrive();
    } else {
      syncWithSupabase();
    }

    // Auto-sync on window focus (so mobile phone and laptop sync automatically when switching tabs or unlocking phone)
    window.addEventListener('focus', () => {
      if (getGoogleDriveUrl()) {
        syncWithGoogleDrive(false);
      } else {
        syncWithSupabase(false);
      }
    });

    // Periodic background sync every 30s when tab is active
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (getGoogleDriveUrl()) {
          syncWithGoogleDrive(false);
        } else {
          syncWithSupabase(false);
        }
      }
    }, 30000);
  } catch (err) {
    console.error('CRITICAL: CRM App Initialization error:', err);
    try { renderAll(); } catch (renderErr) { console.error('Render fallback error:', renderErr); }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCrmApp);
} else {
  initCrmApp();
}

function safeLucide() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try {
      lucide.createIcons();
    } catch(e) {}
  }
}

function loadStoredData() {
  state.products = [...(window.INITIAL_PRODUCTS || [])];
  state.customers = [...(window.INITIAL_CUSTOMERS || [])];
  state.reps = [...(window.INITIAL_REPS || [])];
  state.managers = [...(window.INITIAL_SENIOR_MANAGERS || [])];

  const storedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  state.theme = storedTheme || 'dark';

  const storedUser = localStorage.getItem(STORAGE_KEY_AUTH_USER);
  if (storedUser) {
    try { state.currentUser = JSON.parse(storedUser); } catch (e) { state.currentUser = null; }
  }

  // AUTOMATIC DEMO ONBOARDING FOR GITHUB PAGES / FRESH BROWSERS:
  // If no user is stored in localStorage (first visit, incognito, or remote deployment),
  // automatically default to Senior Sales Manager (Dr. Sameh Ageez) so all data, tabs,
  // KPIs, daily reports, and monthly planner render immediately without showing a blank page!
  if (!state.currentUser && window.INITIAL_USERS && window.INITIAL_USERS.length > 0) {
    const defaultUser = window.INITIAL_USERS.find(u => u.username === 'manager') || window.INITIAL_USERS[0];
    state.currentUser = { ...defaultUser };
    state.filters.analyticsRepFilter = 'ALL';
    state.filters.dailyReportRep = 'ALL';
    try { localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(state.currentUser)); } catch(e) {}
  } else if (state.currentUser) {
    if (state.currentUser.role === 'manager') {
      state.filters.dailyReportRep = 'ALL';
    } else {
      state.filters.dailyReportRep = state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2');
    }
  }

  const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
  state.dailyDate = storedDate || getSyncedTodayDate();
  const dateParts = (state.dailyDate || getSyncedTodayDate()).split('-');
  state.plannerCalendarYear = parseInt(dateParts[0], 10);
  state.plannerCalendarMonth = parseInt(dateParts[1], 10);

  const storedVisits = localStorage.getItem(STORAGE_KEY_VISITS);
  let loadedVisits = storedVisits ? JSON.parse(storedVisits) : [];
  if (window.INITIAL_VISITS && Array.isArray(window.INITIAL_VISITS)) {
    const existingVisitIds = new Set(loadedVisits.map(v => v.id));
    window.INITIAL_VISITS.forEach(iv => {
      if (!existingVisitIds.has(iv.id)) {
        loadedVisits.push(iv);
      }
    });
  }
  state.visits = loadedVisits.length > 0 ? loadedVisits : [...(window.INITIAL_VISITS || [])];

  const storedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
  let loadedOrders = storedOrders ? JSON.parse(storedOrders) : [];
  if (window.INITIAL_ORDERS && Array.isArray(window.INITIAL_ORDERS)) {
    const existingOrderNos = new Set(loadedOrders.map(o => o.invoiceNumber));
    window.INITIAL_ORDERS.forEach(io => {
      if (!existingOrderNos.has(io.invoiceNumber)) {
        loadedOrders.push(io);
      }
    });
  }
  state.orders = loadedOrders.length > 0 ? loadedOrders : [...(window.INITIAL_ORDERS || [])];

  state.dailyReportDate = state.dailyReportDate || getSyncedTodayDate();

  // Ensure daily report date is initialized to UAE live today
  const todayStr = getSyncedTodayDate();
  if (!state.dailyReportDate) {
    state.dailyReportDate = todayStr;
  }

  const storedPlans = localStorage.getItem(STORAGE_KEY_PLANS);
  state.monthlyPlans = storedPlans ? JSON.parse(storedPlans) : [...(window.INITIAL_MONTHLY_PLANS || [])];

  const storedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
  state.notifications = storedNotifs ? JSON.parse(storedNotifs) : [...(window.INITIAL_NOTIFICATIONS || [])];

  const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (storedSettings) {
    try { state.managerSettings = JSON.parse(storedSettings); } catch (e) {}
  }
}

function persistData() {
  try {
    if (state.currentUser) {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    }
    localStorage.setItem(STORAGE_KEY_THEME, state.theme);
    localStorage.setItem(STORAGE_KEY_DATE, state.dailyDate);
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(state.visits));
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders));
    localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(state.monthlyPlans));
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(state.notifications));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.managerSettings));
  } catch (err) {
    console.error('Error persisting CRM state to localStorage:', err);
  }
}

function renderAll() {
  updateUserProfileDisplay();
  updateNotificationBell();
  renderDailyWorkspace();
  renderDailyReport();
  renderMonthlyPlanner();
  renderReportsTable();
  renderOrdersTable();
  renderAccountsGrid();
  renderAnalyticsDashboard();
  renderManagerHub();
  safeLucide();
}

// =========================================================================
// 3. THEME TOGGLE (DARK VS. BRIGHT SCREEN MODE)
// =========================================================================

function initTheme() {
  if (state.theme === 'light') {
    document.documentElement.classList.remove('dark');
    updateThemeButtonUI('light');
  } else {
    document.documentElement.classList.add('dark');
    updateThemeButtonUI('dark');
  }
}

window.toggleTheme = function() {
  if (state.theme === 'dark') {
    state.theme = 'light';
    document.documentElement.classList.remove('dark');
    updateThemeButtonUI('light');
    showToast('☀️ Bright Screen Active', 'Light high-contrast mode enabled for bright field conditions.', 'info');
  } else {
    state.theme = 'dark';
    document.documentElement.classList.add('dark');
    updateThemeButtonUI('dark');
    showToast('🌙 Dark Screen Active', 'Dark mode enabled.', 'info');
  }
  persistData();
  safeLucide();
};

function updateThemeButtonUI(theme) {
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (theme === 'light') {
    if (icon) {
      icon.setAttribute('data-lucide', 'moon');
      icon.className = 'w-4 h-4 text-indigo-500';
    }
    if (label) label.textContent = 'Dark Screen';
  } else {
    if (icon) {
      icon.setAttribute('data-lucide', 'sun');
      icon.className = 'w-4 h-4 text-amber-400';
    }
    if (label) label.textContent = 'Bright Screen';
  }
  const metaTheme = document.getElementById('themeColorMeta') || document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#eaf0f8' : '#070d19');
  }
  safeLucide();
}

// =========================================================================
// 4. PASSWORD AUTHENTICATION & SESSION MANAGEMENT
// =========================================================================

function checkAuthSession() {
  const overlay = document.getElementById('loginOverlay');
  if (!state.currentUser) {
    if (overlay) overlay.classList.remove('hidden');
  } else {
    if (overlay) overlay.classList.add('hidden');
    renderAll();
  }
}

window.handleLoginSubmit = function(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value.trim();
  performLogin(username, password);
};

window.quickLogin = function(username, password) {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) uInput.value = username;
  if (pInput) pInput.value = password;
  performLogin(username, password);
};

function performLogin(username, password) {
  const users = window.INITIAL_USERS || [];
  const foundUser = users.find(u => u.username.toLowerCase() === username && u.password === password);

  const errorEl = document.getElementById('loginErrorMessage');

  if (!foundUser) {
    if (errorEl) {
      errorEl.textContent = 'Invalid username or password. Please check credentials or use one-click test logins below.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  if (errorEl) errorEl.classList.add('hidden');

  state.currentUser = { ...foundUser };
  if (state.currentUser.role === 'manager') {
    state.filters.analyticsRepFilter = 'ALL';
    state.filters.dailyReportRep = 'ALL';
  } else {
    const userTerritory = state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2');
    state.filters.analyticsRepFilter = userTerritory;
    state.filters.dailyReportRep = userTerritory;
  }
  persistData();

  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.add('hidden');

  showToast(
    `Welcome, ${state.currentUser.name}!`,
    `Signed in as ${state.currentUser.title}. Data restricted strictly to ${state.currentUser.territory === 'ALL' ? 'All UAE Territories' : state.currentUser.territory}.`,
    'success'
  );

  // Switch to Daily tab upon login
  switchTab('daily');
  renderAll();
}

window.handleLogout = function() {
  state.currentUser = null;
  persistData();

  document.getElementById('loginPassword').value = '';
  const errorEl = document.getElementById('loginErrorMessage');
  if (errorEl) errorEl.classList.add('hidden');

  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.remove('hidden');

  showToast('Logged Out', 'Your session has ended. CRM locked.', 'info');
};

window.togglePasswordReveal = function() {
  const pwdInput = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  if (!pwdInput) return;

  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    pwdInput.type = 'password';
    if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye');
  }
  safeLucide();
};

function updateUserProfileDisplay() {
  if (!state.currentUser) return;

  const avatarBadge = document.getElementById('userAvatarBadge');
  const nameDisplay = document.getElementById('userNameDisplay');
  const rolePill = document.getElementById('userRolePill');

  if (avatarBadge) avatarBadge.textContent = state.currentUser.avatar || 'US';
  if (nameDisplay) nameDisplay.textContent = state.currentUser.name;

  if (rolePill) {
    if (state.currentUser.role === 'rep_t1') {
      rolePill.textContent = 'Rep T1 (DXB / AUH / Al Ain)';
      rolePill.className = 'text-[9px] text-sky-400 font-bold uppercase';
    } else if (state.currentUser.role === 'rep_t2') {
      rolePill.textContent = 'Rep T2 (Northern Emirates)';
      rolePill.className = 'text-[9px] text-purple-400 font-bold uppercase';
    } else {
      rolePill.textContent = 'Senior Sales Manager';
      rolePill.className = 'text-[9px] text-emerald-400 font-bold uppercase';
    }
  }

  // Hide or Show Senior Manager Tab based on authenticated role
  const managerTabBtn = document.getElementById('tabBtn-manager');
  const mobileManagerBtn = document.getElementById('mobileNavBtn-manager');
  if (state.currentUser && state.currentUser.role === 'manager') {
    if (managerTabBtn) managerTabBtn.classList.remove('hidden');
    if (mobileManagerBtn) mobileManagerBtn.classList.remove('hidden');
  } else {
    if (managerTabBtn) managerTabBtn.classList.add('hidden');
    if (mobileManagerBtn) mobileManagerBtn.classList.add('hidden');
  }

  // Update Daily Cockpit Greeting
  const greetingEl = document.getElementById('dailyGreeting');
  const dailyPill = document.getElementById('dailyRoleLivePill');
  const dateSubtitle = document.getElementById('dailyDateSubtitle');
  const formattedDate = formatDisplayDate(state.dailyDate);

  if (greetingEl) {
    greetingEl.textContent = state.currentUser.role === 'manager' 
      ? 'Executive Operations Command' 
      : `Welcome back, ${state.currentUser.name}`;
  }

  if (dailyPill) {
    if (state.currentUser.role === 'rep_t1') {
      dailyPill.className = 'px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold inline-flex items-center gap-1';
      dailyPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span> Rep T1 Active (DXB/AUH)';
    } else if (state.currentUser.role === 'rep_t2') {
      dailyPill.className = 'px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold inline-flex items-center gap-1';
      dailyPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span> Rep T2 Active (Northern Emirates)';
    } else {
      dailyPill.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1';
      dailyPill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Senior Management Hub';
    }
  }

  if (dateSubtitle) {
    dateSubtitle.textContent = `Itinerary & Execution for ${formattedDate}`;
  }
}

// =========================================================================
// 5. STRICT DATA SCOPING (ROLE-BASED ACCESS CONTROL)
// =========================================================================

function getScopedCustomers() {
  if (state.currentUser && state.currentUser.role === 'rep_t1') {
    return state.customers.filter(c => c.repId === 'T1' || c.territory === 'T1');
  }
  if (state.currentUser && state.currentUser.role === 'rep_t2') {
    return state.customers.filter(c => c.repId === 'T2' || c.territory === 'T2');
  }
  return state.customers || []; // Manager or default sees all
}
window.getScopedCustomers = getScopedCustomers;

function getScopedVisits() {
  if (state.currentUser && state.currentUser.role === 'rep_t1') {
    return (state.visits || []).filter(v => v.repId === 'T1' || v.territory === 'T1');
  }
  if (state.currentUser && state.currentUser.role === 'rep_t2') {
    return (state.visits || []).filter(v => v.repId === 'T2' || v.territory === 'T2');
  }
  return state.visits || []; // Manager or default sees all
}
window.getScopedVisits = getScopedVisits;

function getScopedOrders() {
  if (state.currentUser && state.currentUser.role === 'rep_t1') {
    return state.orders.filter(o => o.repId === 'T1' || o.territory === 'T1');
  }
  if (state.currentUser && state.currentUser.role === 'rep_t2') {
    return state.orders.filter(o => o.repId === 'T2' || o.territory === 'T2');
  }
  return state.orders || []; // Manager or default sees all
}

function getScopedPlans() {
  if (state.currentUser && state.currentUser.role === 'rep_t1') {
    return state.monthlyPlans.filter(p => p.repId === 'T1');
  }
  if (state.currentUser && state.currentUser.role === 'rep_t2') {
    return state.monthlyPlans.filter(p => p.repId === 'T2');
  }
  return state.monthlyPlans || []; // Manager or default sees all
}

// =========================================================================
// 5B. 3-DAY ADVANCE PLANNING UTILITY & INTERACTIVE CUSTOMER COMBOBOX ENGINE
// =========================================================================

/**
 * Calculates the earliest allowed date for a planned visit.
 * Under Conceptors policy, planned visits can NEVER be entered for past dates/times,
 * and must be scheduled at least 3 days in advance (plannedDate >= today + 3 days).
 */
function getMinPlannedDate(baseDateStr = null) {
  const base = baseDateStr || state.dailyDate || getSyncedTodayDate();
  const parts = base.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + 3);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
window.getMinPlannedDate = getMinPlannedDate;

window.openCustomerCombobox = function(modalKey) {
  const input = document.getElementById(`${modalKey}CustomerSearchInput`);
  const currentVal = input ? input.value : '';
  renderCustomerComboboxList(modalKey, currentVal);
  const dropdown = document.getElementById(`${modalKey}CustomerDropdownList`);
  if (dropdown) dropdown.classList.remove('hidden');
};

window.closeCustomerCombobox = function(modalKey) {
  const dropdown = document.getElementById(`${modalKey}CustomerDropdownList`);
  if (dropdown) dropdown.classList.add('hidden');
};

window.closeAllCustomerComboboxes = function() {
  ['unplanned', 'plan', 'order'].forEach(k => closeCustomerCombobox(k));
};

window.filterCustomerCombobox = function(modalKey, query) {
  renderCustomerComboboxList(modalKey, query);
  const dropdown = document.getElementById(`${modalKey}CustomerDropdownList`);
  if (dropdown) dropdown.classList.remove('hidden');

  const clearBtn = document.getElementById(`${modalKey}CustomerClearBtn`);
  if (clearBtn) {
    if (query && query.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  // If user clears or types custom text that doesn't match selected code, clear select
  const select = document.getElementById(`${modalKey}CustomerSelect`);
  if (select && select.value) {
    const currentCust = state.customers.find(c => c.code === select.value);
    const expectedLabel = currentCust ? `${currentCust.code} - ${currentCust.name} (${currentCust.location})` : '';
    if (query !== expectedLabel) {
      select.value = '';
    }
  }
};

window.selectCustomerCombobox = function(modalKey, code) {
  const cust = state.customers.find(c => c.code === code);
  const select = document.getElementById(`${modalKey}CustomerSelect`);
  const input = document.getElementById(`${modalKey}CustomerSearchInput`);
  const clearBtn = document.getElementById(`${modalKey}CustomerClearBtn`);

  if (select) {
    select.value = code;
  }
  if (input && cust) {
    input.value = `${cust.code} - ${cust.name} (${cust.location})`;
  }
  if (clearBtn) {
    clearBtn.classList.remove('hidden');
  }

  closeCustomerCombobox(modalKey);
};

window.clearCustomerCombobox = function(modalKey) {
  const select = document.getElementById(`${modalKey}CustomerSelect`);
  const input = document.getElementById(`${modalKey}CustomerSearchInput`);
  const clearBtn = document.getElementById(`${modalKey}CustomerClearBtn`);

  if (select) select.value = '';
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');

  renderCustomerComboboxList(modalKey, '');
  const dropdown = document.getElementById(`${modalKey}CustomerDropdownList`);
  if (dropdown) dropdown.classList.remove('hidden');
};

window.renderCustomerComboboxList = function(modalKey, query = '') {
  const dropdown = document.getElementById(`${modalKey}CustomerDropdownList`);
  if (!dropdown) return;

  const repSelect = document.getElementById(`${modalKey}RepSelect`);
  const repId = repSelect ? repSelect.value : '';

  const scoped = getScopedCustomers();
  let list = scoped.filter(c => (!repId || c.repId === repId || c.territory === repId) && c.isActive !== false);

  const q = (query || '').trim().toLowerCase();
  if (q) {
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.tier && c.tier.toLowerCase().includes(q))
    );
  }

  const selectedCode = document.getElementById(`${modalKey}CustomerSelect`)?.value;

  if (list.length === 0) {
    dropdown.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-400">
        <i data-lucide="search-x" class="w-5 h-5 mx-auto mb-1 text-slate-500 opacity-60"></i>
        No matching veterinary accounts found for <span class="text-amber-400 font-semibold">"${escapeHtml(query)}"</span>
      </div>
    `;
    safeLucide();
    return;
  }

  dropdown.innerHTML = list.slice(0, 40).map(c => {
    const isSelected = c.code === selectedCode;
    const tierColor = (c.tier && c.tier.includes('Platinum')) ? 'text-amber-300 bg-amber-950/60 border-amber-600/40' :
                      (c.tier && c.tier.includes('Gold')) ? 'text-yellow-300 bg-yellow-950/60 border-yellow-600/40' :
                      'text-slate-300 bg-slate-800/80 border-slate-700';

    return `
      <div 
        onclick="selectCustomerCombobox('${modalKey}', '${c.code}')" 
        class="p-2.5 px-3 hover:bg-indigo-600/20 cursor-pointer transition-colors flex items-center justify-between gap-2 text-left ${isSelected ? 'bg-indigo-900/40 border-l-2 border-indigo-400' : ''}"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-bold shrink-0">${c.code}</span>
            <span class="text-xs font-semibold text-slate-100 truncate">${escapeHtml(c.name)}</span>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-slate-400">
            <span class="truncate">📍 ${escapeHtml(c.location || c.city || 'UAE')}</span>
            <span class="text-slate-600">•</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full border font-bold inline-flex items-center justify-center leading-tight ${tierColor}">${escapeHtml(c.tier)}</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">${c.repId || c.territory}</span>
        </div>
      </div>
    `;
  }).join('');

  if (list.length > 40) {
    dropdown.innerHTML += `
      <div class="p-2 text-center text-[10px] text-slate-400 bg-slate-900/80 italic">
        Showing 40 of ${list.length} matches. Type more characters to refine search...
      </div>
    `;
  }

  safeLucide();
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.customer-combobox-wrapper')) {
    if (typeof closeAllCustomerComboboxes === 'function') {
      closeAllCustomerComboboxes();
    }
  }
});


// =========================================================================
// 6. TAB NAVIGATION
// =========================================================================

window.switchTab = function(tabId) {
  // If rep attempts to navigate to manager tab, redirect to daily
  if (tabId === 'manager' && state.currentUser && state.currentUser.role !== 'manager') {
    tabId = 'daily';
  }

  const tabs = ['daily', 'daily-report', 'planner', 'reports', 'orders', 'accounts', 'analytics', 'manager'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`tabBtn-${t}`);
    const mobileBtn = document.getElementById(`mobileNavBtn-${t}`);

    if (el) {
      if (t === tabId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabId) {
        btn.className = 'nav-tab flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all bg-brand-600 text-white shadow-md shadow-brand-600/30 whitespace-nowrap';
        try {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        } catch(e) {}
      } else {
        btn.className = 'nav-tab flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all text-slate-400 hover:text-white hover:bg-slate-800/60 whitespace-nowrap';
      }
    }
    if (mobileBtn) {
      if (t === tabId) {
        mobileBtn.classList.add('active');
        mobileBtn.classList.remove('text-slate-400');
        mobileBtn.classList.add('text-sky-400');
      } else {
        mobileBtn.classList.remove('active');
        mobileBtn.classList.remove('text-sky-400');
        mobileBtn.classList.add('text-slate-400');
      }
    }
  });

  if (tabId === 'analytics') {
    renderAnalyticsDashboard();
  } else if (tabId === 'planner') {
    renderMonthlyPlanner();
  } else if (tabId === 'accounts') {
    renderAccountsGrid();
  } else if (tabId === 'daily-report') {
    if (!state.dailyReportDate) {
      state.dailyReportDate = state.dailyDate || getSyncedTodayDate();
    }
    renderDailyReport();
  } else if (tabId === 'reports') {
    renderReportsTable();
  } else if (tabId === 'daily') {
    renderDailyWorkspace();
  } else if (tabId === 'orders') {
    renderOrdersTable();
  } else if (tabId === 'manager') {
    renderManagerHub();
  }

  safeLucide();
};

// =========================================================================
// 7. DAILY FIELD VISITS WORKSPACE (PLANNED & UNPLANNED BESIDE EACH OTHER)
// =========================================================================

window.setDailyDateToday = function() {
  state.dailyDate = getSyncedTodayDate();
  const input = document.getElementById('dailyDateInput');
  if (input) input.value = state.dailyDate;
  persistData();
  renderDailyWorkspace();
  showToast('Synced to UAE Live Today', `Date set to ${state.dailyDate} (GST, Asia/Dubai)`, 'info');
};

window.setDailyDateOffset = function(days) {
  const base = state.dailyDate || getSyncedTodayDate();
  const parts = base.split('-').map(Number);
  const cur = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  cur.setUTCDate(cur.getUTCDate() + days);
  state.dailyDate = cur.toISOString().split('T')[0];
  const input = document.getElementById('dailyDateInput');
  if (input) input.value = state.dailyDate;
  persistData();
  renderDailyWorkspace();
};

window.handleDailyDateChange = function(newDate) {
  if (!newDate) return;
  state.dailyDate = newDate;
  persistData();
  renderDailyWorkspace();
};

function renderDailyWorkspace() {
  updateUserProfileDisplay();

  // Use strictly scoped visits for the current logged-in user
  const scopedVisits = getScopedVisits();
  const dayVisits = scopedVisits.filter(v => v.date === state.dailyDate);

  // 1. Planned visits for this day
  const plannedList = dayVisits.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
  // 2. Unplanned visits submitted on this day beside the planned ones
  const unplannedList = dayVisits.filter(v => v.visitCategory === 'Unplanned');

  const plannedCompleted = plannedList.filter(v => v.status === 'Completed').length;
  const unplannedCompleted = unplannedList.length;
  const totalCompleted = plannedCompleted + unplannedCompleted;
  const totalVisits = plannedList.length + unplannedList.length;

  // Scoped orders calculation for today
  const scopedOrders = getScopedOrders();
  const dayOrders = scopedOrders.filter(o => o.date === state.dailyDate);
  const dayOrdersValue = dayOrders.reduce((sum, o) => sum + (o.totalIncVat || 0), 0);

  // Update KPIs
  const kpiTotal = document.getElementById('kpiDailyTotalVisits');
  if (kpiTotal) kpiTotal.textContent = totalVisits;

  const kpiSub = document.getElementById('kpiDailySubtext');
  if (kpiSub) kpiSub.textContent = `${totalCompleted} Completed • ${plannedList.length - plannedCompleted} Pending`;

  const kpiPlanned = document.getElementById('kpiDailyPlannedVisits');
  if (kpiPlanned) kpiPlanned.textContent = plannedList.length;

  const kpiPlannedStatus = document.getElementById('kpiDailyPlannedStatus');
  if (kpiPlannedStatus) kpiPlannedStatus.textContent = `${plannedCompleted} Completed • ${plannedList.length - plannedCompleted} Pending`;

  const kpiUnplanned = document.getElementById('kpiDailyUnplannedVisits');
  if (kpiUnplanned) kpiUnplanned.textContent = unplannedList.length;

  const kpiOrders = document.getElementById('kpiDailyOrdersBooked');
  if (kpiOrders) kpiOrders.textContent = `${dayOrders.length} Orders`;

  const kpiOrdersVal = document.getElementById('kpiDailyOrdersValue');
  if (kpiOrdersVal) kpiOrdersVal.textContent = `${formatCurrency(dayOrdersValue)} AED`;

  const navDailyBadge = document.getElementById('badgeDailyTotal');
  if (navDailyBadge) navDailyBadge.textContent = totalVisits;

  // Render Section A: Planned Visits for Today
  const plannedContainer = document.getElementById('plannedVisitsContainer');
  if (plannedContainer) {
    if (plannedList.length === 0) {
      plannedContainer.innerHTML = `
        <div class="py-10 px-4 rounded-xl border border-dashed border-slate-800 text-center bg-slate-900/30">
          <i data-lucide="calendar-x" class="w-8 h-8 text-slate-500 mx-auto mb-2"></i>
          <p class="text-xs font-bold text-slate-300">No planned calls scheduled for this date</p>
          <p class="text-[11px] text-slate-500 mt-1">Schedule target clinics via the Monthly Planner or click "+ Schedule Target" above.</p>
        </div>
      `;
    } else {
      plannedContainer.innerHTML = plannedList.map(v => {
        const isCompleted = v.status === 'Completed';

        return `
          <div class="glass-card rounded-xl p-4 border ${isCompleted ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800 bg-slate-900/80'} transition-all space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
                  <span class="text-[11px] text-sky-400 font-bold">${v.timeSlot || 'Day Round'}</span>
                  ${isCompleted ? `
                    <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                      <i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-400"></i> Completed
                    </span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-extrabold">
                      Planned
                    </span>
                  `}
                </div>
                <h4 class="font-bold text-white text-sm mt-1 truncate" title="${escapeHtml(v.clientName)}">${escapeHtml(v.clientName)}</h4>
                <p class="text-[11px] text-slate-400">${v.clientCode || ''} • ${v.location || 'UAE'}</p>
              </div>

              ${!isCompleted ? `
                <button onclick="openSubmitPlannedModal('${v.id}')" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 shrink-0">
                  <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>
                  <span>Check-in & Submit</span>
                </button>
              ` : `
                <button onclick="openSubmitPlannedModal('${v.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0">
                  Edit Report
                </button>
              `}
            </div>

            <div class="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
              <div class="text-slate-300 font-semibold truncate">
                <span class="text-slate-500">Doctor Met:</span> ${escapeHtml(v.doctorName || 'Lead Veterinarian')} ${v.doctorRole ? `(${escapeHtml(v.doctorRole)})` : ''}
              </div>
              <div class="text-slate-400 truncate">
                <span class="text-slate-500">Goal:</span> ${escapeHtml(v.purpose || 'Clinical Detailing')}
              </div>
              ${isCompleted && v.outcome ? `
                <div class="text-emerald-300/90 font-medium pt-1 border-t border-slate-800/80 line-clamp-2">
                  <span class="text-slate-500">Outcome:</span> ${escapeHtml(v.outcome)}
                </div>
              ` : ''}
            </div>

            ${isCompleted ? `
              <div class="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSentimentBadgeClass(v.doctorSentiment)}">
                    ${v.doctorSentiment || 'Positive'}
                  </span>
                  ${v.samplesDropped > 0 ? `
                    <span class="text-amber-400 font-semibold">💊 ${v.samplesDropped} Samples</span>
                  ` : ''}
                </div>
                ${v.orderPlaced ? `
                  <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                    🛒 Order: ${formatCurrency(v.orderValueAed)} AED
                  </span>
                ` : '<span class="text-slate-500">No order placed</span>'}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }
  }

  // Render Section B: Unplanned Visits for Today (Beside Planned Ones!)
  const unplannedContainer = document.getElementById('unplannedVisitsContainer');
  if (unplannedContainer) {
    if (unplannedList.length === 0) {
      unplannedContainer.innerHTML = `
        <div class="py-10 px-4 rounded-xl border border-dashed border-amber-500/30 text-center bg-amber-950/10">
          <i data-lucide="zap" class="w-8 h-8 text-amber-500/60 mx-auto mb-2"></i>
          <p class="text-xs font-bold text-amber-300">No unplanned visits logged for today yet</p>
          <p class="text-[11px] text-slate-400 mt-1">If you make spontaneous, nearby drop-ins or emergency visits on this day beside your planned calls, click <strong>"+ Add Unplanned Visit"</strong> above.</p>
        </div>
      `;
    } else {
      unplannedContainer.innerHTML = unplannedList.map(v => {
        return `
          <div class="glass-card rounded-xl p-4 border border-amber-500/40 bg-amber-950/15 transition-all space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
                  <span class="px-2.5 py-0.5 rounded-full badge-unplanned text-[10px] font-black inline-flex items-center gap-1">
                    <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i> [⚡ Unplanned]
                  </span>
                  <span class="text-[10px] font-bold text-amber-300">${escapeHtml(v.unplannedReason || 'Spontaneous Drop-in')}</span>
                </div>
                <h4 class="font-bold text-white text-sm mt-1 truncate" title="${escapeHtml(v.clientName)}">${escapeHtml(v.clientName)}</h4>
                <p class="text-[11px] text-slate-400">${v.clientCode || ''} • ${v.location || 'UAE'}</p>
              </div>

              <div class="text-right shrink-0">
                <span class="text-[10px] text-slate-400 font-mono block">${v.timeSlot ? v.timeSlot.split(' ')[0] : 'Today'}</span>
                ${v.orderPlaced ? `
                  <span class="mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] inline-block border border-emerald-500/30">
                    🛒 ${formatCurrency(v.orderValueAed)} AED
                  </span>
                ` : ''}
              </div>
            </div>

            <div class="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
              <div class="text-slate-300 font-semibold truncate">
                <span class="text-slate-500">Doctor Met:</span> ${escapeHtml(v.doctorName || 'Veterinarian')} (${escapeHtml(v.doctorRole || 'Doctor')})
              </div>
              <div class="text-slate-300/90 pt-1 border-t border-slate-800/80 line-clamp-2">
                <span class="text-slate-500">Outcome:</span> ${escapeHtml(v.outcome || 'Detailed doctor on clinical protocols.')}
              </div>
            </div>

            <div class="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSentimentBadgeClass(v.doctorSentiment)}">
                  ${v.doctorSentiment || 'Positive'}
                </span>
                ${v.samplesDropped > 0 ? `
                  <span class="text-amber-400 font-semibold">💊 ${v.samplesDropped} Samples</span>
                ` : ''}
              </div>

              <div class="flex items-center gap-1.5">
                ${!v.orderPlaced ? `
                  <button onclick="openOrderModal('${v.clientCode}', '${v.repId}')" class="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i> Book Order
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  safeLucide();
}

function getSentimentBadgeClass(sentiment) {
  if (sentiment === 'Enthusiastic') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  if (sentiment === 'Positive') return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
  if (sentiment === 'Neutral') return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
  if (sentiment === 'Price Sensitive') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
}

// =========================================================================
// 7.5 DAILY REPORT SECTOR (FIELD ACTIVITY & RETRIEVAL ENGINE)
// =========================================================================

function getRepName(repId) {
  if (!repId) return 'Medical Representative';
  const found = (state.reps || []).find(r => r.id === repId || r.territory === repId);
  if (found) return `Dr. ${found.name}`;
  if (repId === 'T1') return 'Dr. Shaimaa';
  if (repId === 'T2') return 'Dr. Marsel';
  return repId;
}

function getRepAvatar(repId) {
  const found = (state.reps || []).find(r => r.id === repId || r.territory === repId);
  return found ? (found.avatar || 'REP') : (repId === 'T1' ? 'SH' : (repId === 'T2' ? 'MR' : 'US'));
}

function getRepTerritoryStr(repId) {
  const found = (state.reps || []).find(r => r.id === repId || r.territory === repId);
  if (found) return `${found.territory} (${(found.emirates || []).slice(0, 2).join(', ')})`;
  return repId === 'T1' ? 'T1 (Dubai / Abu Dhabi)' : (repId === 'T2' ? 'T2 (Northern Emirates)' : repId);
}

window.setDailyReportDateToday = function() {
  state.dailyReportDate = getSyncedTodayDate();
  const input = document.getElementById('dailyReportDateInput');
  if (input) input.value = state.dailyReportDate;
  renderDailyReport();
  showToast('Synced to UAE Live Today', `Daily Report retrieved for ${state.dailyReportDate} (GST, Asia/Dubai)`, 'info');
};

window.setDailyReportDateOffset = function(days) {
  const base = state.dailyReportDate || getSyncedTodayDate();
  const parts = base.split('-').map(Number);
  const cur = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  cur.setUTCDate(cur.getUTCDate() + days);
  state.dailyReportDate = cur.toISOString().split('T')[0];
  const input = document.getElementById('dailyReportDateInput');
  if (input) input.value = state.dailyReportDate;
  renderDailyReport();
};

window.handleDailyReportDateChange = function(newDate) {
  if (!newDate) return;
  state.dailyReportDate = newDate;
  renderDailyReport();
};

window.handleDailyReportRepFilter = function(repId) {
  if (state.currentUser && state.currentUser.role === 'rep_t1') {
    state.filters.dailyReportRep = 'T1';
  } else if (state.currentUser && state.currentUser.role === 'rep_t2') {
    state.filters.dailyReportRep = 'T2';
  } else {
    state.filters.dailyReportRep = repId || 'ALL';
  }
  renderDailyReport();
};

window.handleDailyReportStatusFilter = function(status) {
  state.filters.dailyReportStatus = status || 'ALL';

  const statuses = ['ALL', 'VISITED', 'UNVISITED', 'UNPLANNED', 'PLANNED'];
  statuses.forEach(s => {
    const btn = document.getElementById(`dailyReportFilter-${s}`);
    if (btn) {
      if (s === state.filters.dailyReportStatus) {
        btn.className = 'daily-report-filter-pill active px-2.5 py-1 rounded-lg font-bold text-[11px] bg-brand-600 text-white transition-all whitespace-nowrap shadow-sm';
      } else {
        btn.className = 'daily-report-filter-pill px-2.5 py-1 rounded-lg font-medium text-[11px] text-slate-400 hover:text-white transition-all whitespace-nowrap';
      }
    }
  });

  renderDailyReportTableAndCards();
};

window.handleDailyReportSearch = function(query) {
  state.filters.dailyReportSearch = (query || '').toLowerCase().trim();
  renderDailyReportTableAndCards();
};

window.resetDailyReportFilters = function() {
  state.filters.dailyReportRep = 'ALL';
  state.filters.dailyReportStatus = 'ALL';
  state.filters.dailyReportSearch = '';
  const searchInput = document.getElementById('dailyReportSearch');
  if (searchInput) searchInput.value = '';
  const repFilter = document.getElementById('dailyReportRepFilter');
  if (repFilter) repFilter.value = 'ALL';
  handleDailyReportStatusFilter('ALL');
  renderDailyReport();
  showToast('Filters Reset', 'Showing all medical rep visits for selected date.', 'info');
};

// =========================================================================
// 8B. DYNAMIC MEDICAL REP DAILY REPORTING & HISTORY ENGINE
// =========================================================================

function ensureDailyReportDataForDate(dateStr) {
  if (!dateStr) dateStr = getSyncedTodayDate();
  
  // Check if we already have visits for this exact date
  const existingVisits = (state.visits || []).filter(v => v.date === dateStr);
  if (existingVisits.length > 0) {
    return existingVisits;
  }

  // Parse date components for deterministic pseudo-random seed
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 9;
  const day = parts[2] || 1;
  const daySeed = (year * 372) + (month * 31) + day;

  // Filter customers by territory
  const t1Customers = (state.customers || []).filter(c => c.repId === 'T1' || c.territory === 'T1');
  const t2Customers = (state.customers || []).filter(c => c.repId === 'T2' || c.territory === 'T2');

  const generatedVisits = [];
  const generatedOrders = [];

  function pick(arr, offset = 0) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.abs(daySeed + offset) % arr.length];
  }

  const doctorRoles = ['Clinical Director', 'Head Vet Surgeon', 'Small Animal Specialist', 'Equine Specialist', 'Senior Veterinarian', 'Practice Owner'];
  
  const missedReasonsT1 = [
    'Doctor called into emergency caesarean surgery at 11:30 AM; appointment rescheduled with clinic coordinator for next cycle.',
    'Head veterinarian attending urgent equine endoscopy at track; rescheduled with practice nurse.',
    'Clinic closed early for quarterly ministry inspection; product catalog and trial dossier handed to head nurse.',
    'Doctor delayed in severe highway congestion between Abu Dhabi and Dubai; follow-up scheduled for next field round.',
    'Attending critical inpatient canine parvovirus resuscitation in ICU ward; doctor requested reschedule via WhatsApp.'
  ];

  const missedReasonsT2 = [
    'Doctor on emergency farm callout in Al Dhaid for dairy cattle postpartum paresis; appointment deferred.',
    'Clinic experiencing unexpected network and power maintenance; practice manager requested visit next Tuesday.',
    'Veterinary surgeon occupied with continuous emergency orthopaedic surgery until late evening.',
    'Doctor called to equestrian endurance stable in Sharjah for urgent lameness examination.',
    'Annual regulatory audit in progress; clinic receptionist accepted promotional product literature and trial pack.'
  ];

  const unplannedReasonsT1 = [
    'Urgent stockout of Bravecto Spot-On reported by pharmacy director while rep was visiting neighboring clinic.',
    'Walk-in cold call to newly opened veterinary polyclinic branch on the same boulevard to introduce Conceptors portfolio.',
    'Emergency sample request for acute renal insufficiency treatment in hospitalized feline patient.',
    'Spontaneous follow-up visit requested via WhatsApp by clinical director regarding seasonal immunity protocols.'
  ];

  const unplannedReasonsT2 = [
    'Spontaneous visit to veterinary pharmacy adjacent to clinic to audit competitor pricing and retail display.',
    'Emergency clinical inquiry regarding Cepravin dry cow mastitis treatment protocol for commercial dairy client.',
    'Walk-in drop-in on private falcon and avian veterinary center while returning from Kalba field round.',
    'Clinic manager requested urgent in-person quotation for bulk canine vaccination campaign.'
  ];

  const productsList = [
    ['VIUSID 30 ml', 'ASBRIP 30 ml'],
    ['RENALOF 150 ml', 'ASBRIP 150 ml'],
    ['CARMINAL 30 ml', 'DIALIX Lespedeza 15'],
    ['VIUSID 150 ml', 'CARMINAL 150 ml'],
    ['BOVILIS BVD', 'CEPRAVIN Dry Cow'],
    ['CANIGEN DHPPi', 'VIUSID 30 ml']
  ];

  const isToday = (dateStr === getSyncedTodayDate());

  if (isToday) {
    // Territory T1 (Dr. Shaimaa - Dubai / Abu Dhabi) - 3 Pending Planned Visits for live field execution
    if (t1Customers.length >= 3) {
      const c1 = pick(t1Customers, 1);
      const c2 = pick(t1Customers, 3);
      const c3 = pick(t1Customers, 5);

      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-01`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c1.code,
        clientName: c1.name,
        location: c1.city || 'Dubai',
        date: dateStr,
        timeSlot: 'Morning (09:30 - 11:00)',
        visitCategory: 'Planned',
        status: 'Planned',
        doctorName: `Dr. ${c1.contactPerson || 'Sarah Al-Maktoum'}`,
        doctorRole: pick(doctorRoles, 1),
        productsDetailed: pick(productsList, 1),
        doctorSentiment: 'Pending',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Monthly scheduled clinical review & promotional detailing on immunity and recovery portfolio',
        outcome: '',
        nextFollowUp: getOffsetDateStr(dateStr, 14),
        nextFollowUpPurpose: 'Review patient clinical response & restock monitoring'
      });

      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-02`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c2.code,
        clientName: c2.name,
        location: c2.city || 'Dubai',
        date: dateStr,
        timeSlot: 'Midday (11:30 - 13:00)',
        visitCategory: 'Planned',
        status: 'Planned',
        doctorName: `Dr. ${c2.contactPerson || 'Karim Haddad'}`,
        doctorRole: pick(doctorRoles, 2),
        productsDetailed: pick(productsList, 2),
        doctorSentiment: 'Pending',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Present clinical trial literature on activated antioxidant molecules for nephrology management',
        outcome: '',
        nextFollowUp: getOffsetDateStr(dateStr, 7),
        nextFollowUpPurpose: 'Collect patient trial evaluation results'
      });

      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-03`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c3.code,
        clientName: c3.name,
        location: c3.city || 'Abu Dhabi',
        date: dateStr,
        timeSlot: 'Afternoon (14:30 - 15:30)',
        visitCategory: 'Planned',
        status: 'Planned',
        doctorName: `Dr. ${c3.contactPerson || 'Alexander White'}`,
        doctorRole: pick(doctorRoles, 3),
        productsDetailed: pick(productsList, 3),
        doctorSentiment: 'Pending',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Scheduled cycle visit to detail renal support and anti-inflammatory suspension',
        outcome: '',
        nextFollowUp: getOffsetDateStr(dateStr, 3),
        nextFollowUpPurpose: 'Rescheduled appointment follow-up'
      });
    }

    // Territory T2 (Dr. Marsel - Northern Emirates) - 3 Pending Planned Visits for live field execution
    if (t2Customers.length >= 3) {
      const c1 = pick(t2Customers, 2);
      const c2 = pick(t2Customers, 4);
      const c3 = pick(t2Customers, 6);

      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-01`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c1.code,
        clientName: c1.name,
        location: c1.city || 'Sharjah',
        date: dateStr,
        timeSlot: 'Morning (10:00 - 11:30)',
        visitCategory: 'Planned',
        status: 'Planned',
        doctorName: `Dr. ${c1.contactPerson || 'Mansoor Al-Zaabi'}`,
        doctorRole: pick(doctorRoles, 0),
        productsDetailed: pick(productsList, 4),
        doctorSentiment: 'Pending',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Field detailing on herd mastitis prevention and biological vaccine schedule',
        outcome: '',
        nextFollowUp: getOffsetDateStr(dateStr, 14),
        nextFollowUpPurpose: 'Delivery verification and protocol check'
      });

      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-02`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c2.code,
        clientName: c2.name,
        location: c2.city || 'Ajman',
        date: dateStr,
        timeSlot: 'Midday (12:30 - 14:00)',
        visitCategory: 'Planned',
        status: 'Planned',
        doctorName: `Dr. ${c2.contactPerson || 'Fatima Al-Nuaimi'}`,
        doctorRole: pick(doctorRoles, 1),
        productsDetailed: pick(productsList, 5),
        doctorSentiment: 'Pending',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Small animal respiratory and viral protection presentation',
        outcome: '',
        nextFollowUp: getOffsetDateStr(dateStr, 8),
        nextFollowUpPurpose: 'Assess trial cases outcome'
      });

      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-03`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c3.code,
        clientName: c3.name,
        location: c3.city || 'Ras Al Khaimah',
        date: dateStr,
        timeSlot: 'Afternoon (15:00 - 16:00)',
        visitCategory: 'Planned',
        status: 'Planned',
        doctorName: `Dr. ${c3.contactPerson || 'Rashid Al-Qasimi'}`,
        doctorRole: pick(doctorRoles, 2),
        productsDetailed: pick(productsList, 0),
        doctorSentiment: 'Pending',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Evaluate antibiotic and anti-infective treatment protocols',
        outcome: '',
        nextFollowUp: getOffsetDateStr(dateStr, 4),
        nextFollowUpPurpose: 'Rescheduled clinic visit'
      });
    }
  } else {
    // Territory T1 (Dr. Shaimaa - Dubai / Abu Dhabi) - Historical Demo Audit with completed calls & orders
    if (t1Customers.length >= 3) {
      const c1 = pick(t1Customers, 1);
      const c2 = pick(t1Customers, 3);
      const c3 = pick(t1Customers, 5); // Missed
      const c4 = pick(t1Customers, 7); // Unplanned

      // Visit 1: Planned & Visited (With Order)
      const orderVal1 = 1250 + ((daySeed * 73) % 1800);
      const orderRef1 = `ORD-${dateStr.replace(/-/g, '')}-T1`;
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-01`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c1.code,
        clientName: c1.name,
        location: c1.city || 'Dubai',
        date: dateStr,
        timeSlot: 'Morning (09:30 - 11:00)',
        visitCategory: 'Planned',
        status: 'Completed',
        doctorName: `Dr. ${c1.contactPerson || 'Sarah Al-Maktoum'}`,
        doctorRole: pick(doctorRoles, 1),
        productsDetailed: pick(productsList, 1),
        doctorSentiment: 'Enthusiastic',
        samplesDropped: 2,
        sampleProduct: pick(productsList, 1)[0],
        orderPlaced: true,
        orderRef: orderRef1,
        orderValueAed: orderVal1,
        purpose: 'Monthly scheduled clinical review & promotional detailing on immunity and recovery portfolio',
        outcome: `Conducted comprehensive detailing. Doctor confirmed excellent patient recovery and placed stocking order for AED ${formatCurrency(orderVal1)}.`,
        nextFollowUp: getOffsetDateStr(dateStr, 14),
        nextFollowUpPurpose: 'Review patient clinical response & restock monitoring'
      });

      generatedOrders.push({
        invoiceNumber: orderRef1,
        orderNumber: orderRef1,
        date: dateStr,
        time: '10:45:00',
        repId: 'T1',
        territory: 'T1',
        clientCode: c1.code,
        clientName: c1.name,
        location: c1.city || 'Dubai',
        items: [
          { productId: 'P001', productName: pick(productsList, 1)[0], unitPrice: 85, quantity: 12, bonusFoc: 2, lineTotal: 1020 },
          { productId: 'P002', productName: pick(productsList, 1)[1], unitPrice: 75, quantity: 5, bonusFoc: 0, lineTotal: 375 }
        ],
        subtotal: 1395,
        vatAmount: Math.round(1395 * 0.05 * 100) / 100,
        totalIncVat: Math.round(1395 * 1.05 * 100) / 100,
        status: 'Approved',
        paymentTerms: '30 Days Credit',
        notes: 'Generated via Field Call Detailing. Standard 10+1 bonus applied.'
      });

      // Visit 2: Planned & Visited (Clinical Discussion, No Order)
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-02`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c2.code,
        clientName: c2.name,
        location: c2.city || 'Dubai',
        date: dateStr,
        timeSlot: 'Midday (11:30 - 13:00)',
        visitCategory: 'Planned',
        status: 'Completed',
        doctorName: `Dr. ${c2.contactPerson || 'Karim Haddad'}`,
        doctorRole: pick(doctorRoles, 2),
        productsDetailed: pick(productsList, 2),
        doctorSentiment: 'Positive',
        samplesDropped: 1,
        sampleProduct: pick(productsList, 2)[0],
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Present clinical trial literature on activated antioxidant molecules for nephrology management',
        outcome: 'Shared clinical monographs. Doctor agreed to initiate patient trial on 4 surgical cases before next purchasing cycle.',
        nextFollowUp: getOffsetDateStr(dateStr, 7),
        nextFollowUpPurpose: 'Collect patient trial evaluation results'
      });

      // Visit 3: Planned but MISSED / UNVISITED
      const missedReason1 = pick(missedReasonsT1, 0);
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-03-MISSED`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c3.code,
        clientName: c3.name,
        location: c3.city || 'Abu Dhabi',
        date: dateStr,
        timeSlot: 'Afternoon (14:30 - 15:30)',
        visitCategory: 'Planned',
        status: 'Missed',
        missedReason: missedReason1,
        doctorName: `Dr. ${c3.contactPerson || 'Alexander White'}`,
        doctorRole: pick(doctorRoles, 3),
        productsDetailed: [],
        doctorSentiment: 'Neutral',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Scheduled cycle visit to detail renal support and anti-inflammatory suspension',
        outcome: `Visit could not be completed on this day. Reason: ${missedReason1}`,
        nextFollowUp: getOffsetDateStr(dateStr, 3),
        nextFollowUpPurpose: 'Rescheduled appointment follow-up'
      });

      // Visit 4: Spontaneous UNPLANNED Visit (Beside Planned)
      const unpReason1 = pick(unplannedReasonsT1, 0);
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T1-04-UNP`,
        repId: 'T1',
        territory: 'T1',
        clientCode: c4.code,
        clientName: c4.name,
        location: c4.city || 'Dubai',
        date: dateStr,
        timeSlot: 'Spontaneous Afternoon (16:00 - 17:00)',
        visitCategory: 'Unplanned',
        unplannedReason: unpReason1,
        status: 'Completed',
        doctorName: `Dr. ${c4.contactPerson || 'Elena Rostova'}`,
        doctorRole: pick(doctorRoles, 4),
        productsDetailed: pick(productsList, 3),
        doctorSentiment: 'Enthusiastic',
        samplesDropped: 2,
        sampleProduct: pick(productsList, 3)[0],
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: `Unplanned field call: ${unpReason1}`,
        outcome: `Dropped in spontaneously while in neighborhood. Met doctor, discussed gastrointestinal emergency protocols, and supplied sample starter packs.`,
        nextFollowUp: getOffsetDateStr(dateStr, 10),
        nextFollowUpPurpose: 'Formal procurement proposal review'
      });
    }

    // Territory T2 (Dr. Marsel - Northern Emirates) - Historical Demo Audit
    if (t2Customers.length >= 3) {
      const c1 = pick(t2Customers, 2);
      const c2 = pick(t2Customers, 4);
      const c3 = pick(t2Customers, 6); // Missed
      const c4 = pick(t2Customers, 8); // Unplanned

      // Visit 1: Planned & Visited
      const orderVal2 = 950 + ((daySeed * 47) % 1500);
      const orderRef2 = `ORD-${dateStr.replace(/-/g, '')}-T2`;
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-01`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c1.code,
        clientName: c1.name,
        location: c1.city || 'Sharjah',
        date: dateStr,
        timeSlot: 'Morning (10:00 - 11:30)',
        visitCategory: 'Planned',
        status: 'Completed',
        doctorName: `Dr. ${c1.contactPerson || 'Mansoor Al-Zaabi'}`,
        doctorRole: pick(doctorRoles, 0),
        productsDetailed: pick(productsList, 4),
        doctorSentiment: 'Enthusiastic',
        samplesDropped: 3,
        sampleProduct: pick(productsList, 4)[0],
        orderPlaced: true,
        orderRef: orderRef2,
        orderValueAed: orderVal2,
        purpose: 'Field detailing on herd mastitis prevention and biological vaccine schedule',
        outcome: `Productive session. Doctor approved stocking order for AED ${formatCurrency(orderVal2)} with delivery requested by Thursday.`,
        nextFollowUp: getOffsetDateStr(dateStr, 14),
        nextFollowUpPurpose: 'Delivery verification and protocol check'
      });

      generatedOrders.push({
        invoiceNumber: orderRef2,
        orderNumber: orderRef2,
        date: dateStr,
        time: '11:15:00',
        repId: 'T2',
        territory: 'T2',
        clientCode: c1.code,
        clientName: c1.name,
        location: c1.city || 'Sharjah',
        items: [
          { productId: 'P007', productName: pick(productsList, 4)[0], unitPrice: 110, quantity: 10, bonusFoc: 1, lineTotal: 1100 }
        ],
        subtotal: 1100,
        vatAmount: Math.round(1100 * 0.05 * 100) / 100,
        totalIncVat: Math.round(1100 * 1.05 * 100) / 100,
        status: 'Approved',
        paymentTerms: 'Cash On Delivery',
        notes: 'Territory T2 field booking. Standard 10+1 bonus included.'
      });

      // Visit 2: Planned & Visited
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-02`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c2.code,
        clientName: c2.name,
        location: c2.city || 'Ajman',
        date: dateStr,
        timeSlot: 'Midday (12:30 - 14:00)',
        visitCategory: 'Planned',
        status: 'Completed',
        doctorName: `Dr. ${c2.contactPerson || 'Fatima Al-Nuaimi'}`,
        doctorRole: pick(doctorRoles, 1),
        productsDetailed: pick(productsList, 5),
        doctorSentiment: 'Positive',
        samplesDropped: 1,
        sampleProduct: pick(productsList, 5)[0],
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Small animal respiratory and viral protection presentation',
        outcome: 'Presented trial efficacy data on Asbrip and Viusid. Samples handed over for kennel cough trial cases.',
        nextFollowUp: getOffsetDateStr(dateStr, 8),
        nextFollowUpPurpose: 'Assess trial cases outcome'
      });

      // Visit 3: Planned but MISSED / UNVISITED
      const missedReason2 = pick(missedReasonsT2, 0);
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-03-MISSED`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c3.code,
        clientName: c3.name,
        location: c3.city || 'Ras Al Khaimah',
        date: dateStr,
        timeSlot: 'Afternoon (15:00 - 16:00)',
        visitCategory: 'Planned',
        status: 'Missed',
        missedReason: missedReason2,
        doctorName: `Dr. ${c3.contactPerson || 'Rashid Al-Qasimi'}`,
        doctorRole: pick(doctorRoles, 2),
        productsDetailed: [],
        doctorSentiment: 'Neutral',
        samplesDropped: 0,
        sampleProduct: '',
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: 'Evaluate antibiotic and anti-infective treatment protocols',
        outcome: `Visit could not be performed on this date. Reason: ${missedReason2}`,
        nextFollowUp: getOffsetDateStr(dateStr, 4),
        nextFollowUpPurpose: 'Rescheduled clinic visit'
      });

      // Visit 4: Spontaneous UNPLANNED Visit (Beside Planned)
      const unpReason2 = pick(unplannedReasonsT2, 0);
      generatedVisits.push({
        id: `VIS-${dateStr.replace(/-/g, '')}-T2-04-UNP`,
        repId: 'T2',
        territory: 'T2',
        clientCode: c4.code,
        clientName: c4.name,
        location: c4.city || 'Sharjah',
        date: dateStr,
        timeSlot: 'Spontaneous Evening (17:00 - 18:00)',
        visitCategory: 'Unplanned',
        unplannedReason: unpReason2,
        status: 'Completed',
        doctorName: `Dr. ${c4.contactPerson || 'Zaid Al-Balooshi'}`,
        doctorRole: pick(doctorRoles, 5),
        productsDetailed: pick(productsList, 0),
        doctorSentiment: 'Positive',
        samplesDropped: 2,
        sampleProduct: pick(productsList, 0)[0],
        orderPlaced: false,
        orderRef: '',
        orderValueAed: 0,
        purpose: `Unplanned visit: ${unpReason2}`,
        outcome: 'Walked in spontaneously. Doctor was very receptive and expressed strong interest in seasonal recovery lines.',
        nextFollowUp: getOffsetDateStr(dateStr, 12),
        nextFollowUpPurpose: 'Present formal institutional agreement'
      });
    }
  }

  // Push new visits and orders into state
  generatedVisits.forEach(gv => {
    state.visits.push(gv);
  });
  generatedOrders.forEach(go => {
    state.orders.push(go);
  });

  persistData();
  return generatedVisits;
}

function renderDailyReportDateRibbon() {
  const container = document.getElementById('dailyReportDateRibbon');
  if (!container) return;

  const activeDate = state.dailyReportDate || getSyncedTodayDate();
  const todayStr = getSyncedTodayDate();

  // Get list of historical dates that have visits, plus recent days
  const recordedDates = new Set((state.visits || []).map(v => v.date));
  
  // Ensure today, yesterday, and past 10 days are in the ribbon
  for (let i = 0; i <= 10; i++) {
    const dStr = getOffsetDateStr(todayStr, -i);
    recordedDates.add(dStr);
  }

  // Sort descending
  const sortedDates = Array.from(recordedDates).sort().reverse().slice(0, 12);

  container.innerHTML = sortedDates.map(d => {
    const isSelected = d === activeDate;
    let label = d;
    if (d === todayStr) {
      label = 'Today (Live)';
    } else if (d === getOffsetDateStr(todayStr, -1)) {
      label = 'Yesterday';
    } else {
      const parts = d.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      label = `${monthNames[mIdx] || ''} ${dayNum}`;
    }

    return `
      <button type="button" onclick="handleDailyReportDateChange('${d}')" class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap touch-manipulation ${
        isSelected
          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400 ring-2 ring-cyan-500/20'
          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:text-white'
      }">
        ${label}
      </button>
    `;
  }).join('');
}

function renderDailyReport() {
  const dateStr = state.dailyReportDate || getSyncedTodayDate();

  // 1. GUARANTEE COMPLETE MEDICAL REP REPORTING HISTORY FOR ANY CHOSEN DATE
  ensureDailyReportDataForDate(dateStr);

  // 2. RENDER INTERACTIVE DATE HISTORY RIBBON
  renderDailyReportDateRibbon();

  // Sync Input & Select UI values
  const dateInput = document.getElementById('dailyReportDateInput');
  if (dateInput && dateInput.value !== dateStr) {
    dateInput.value = dateStr;
  }

  // 3. CONFIGURE REP FILTER ACCORDING TO USER ROLE
  const repFilter = document.getElementById('dailyReportRepFilter');
  const isManager = (state.currentUser && state.currentUser.role === 'manager');
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2')) : 'ALL';

  if (repFilter) {
    if (!isManager) {
      // Rep is strictly restricted to their own territory; cannot view peer reports
      state.filters.dailyReportRep = userTerritory;
      const repObj = (state.reps || []).find(r => r.id === userTerritory);
      const repLabel = repObj ? `Dr. ${repObj.name} (Territory ${repObj.territory})` : `My Territory (${userTerritory})`;
      repFilter.innerHTML = `<option value="${userTerritory}">${repLabel}</option>`;
      repFilter.disabled = true;
      repFilter.value = userTerritory;
    } else {
      // Senior Sales Manager has company-wide visibility across all representatives
      repFilter.disabled = false;
      repFilter.innerHTML = `
        <option value="ALL">👥 All Medical Representatives (Company-wide)</option>
        <option value="T1">Dr. Shaimaa (Rep T1 - DXB/AUH)</option>
        <option value="T2">Dr. Marsel (Rep T2 - Northern Emirates)</option>
      `;
      repFilter.value = state.filters.dailyReportRep || 'ALL';
    }
  }

  // 4. RETRIEVE STRICTLY SCOPED VISITS & ORDERS FOR CURRENT USER
  const scopedVisits = getScopedVisits();
  const scopedOrders = getScopedOrders();

  let dayVisits = scopedVisits.filter(v => v.date === dateStr);
  let dayOrders = scopedOrders.filter(o => o.date === dateStr);

  // If Senior Manager chose a specific representative in the filter, scope accordingly
  if (isManager && state.filters.dailyReportRep && state.filters.dailyReportRep !== 'ALL') {
    dayVisits = dayVisits.filter(v => v.repId === state.filters.dailyReportRep || v.territory === state.filters.dailyReportRep);
    dayOrders = dayOrders.filter(o => o.repId === state.filters.dailyReportRep || o.territory === state.filters.dailyReportRep);
  }

  const dayOrdersVal = dayOrders.reduce((sum, o) => sum + (o.totalIncVat || 0), 0);

  // Group Visits by User's Defined Categories:
  // 1. Planned Visits for this day
  const plannedVisits = dayVisits.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
  // 2. Visited (Planned Visits Completed)
  const visitedPlanned = plannedVisits.filter(v => v.status === 'Completed');
  // 3. Unvisited (Planned Visits Not Completed / Pending / Missed)
  const unvisitedPlanned = plannedVisits.filter(v => v.status !== 'Completed');
  // 4. Unplanned Visits (Spontaneous visits submitted on that day beside planned ones)
  const unplannedVisits = dayVisits.filter(v => v.visitCategory === 'Unplanned');

  // Total Field Execution
  const totalCallsDone = visitedPlanned.length + unplannedVisits.length;
  const adherencePct = plannedVisits.length > 0 
    ? Math.round((visitedPlanned.length / plannedVisits.length) * 100) 
    : (dayVisits.length > 0 ? 100 : 0);

  // Update Header Banner
  const bannerDate = document.getElementById('dailyReportBannerDate');
  if (bannerDate) {
    bannerDate.textContent = `Daily Field Audit for ${formatDisplayDate(dateStr)}`;
  }

  const bannerPills = document.getElementById('dailyReportBannerSummaryPills');
  if (bannerPills) {
    bannerPills.innerHTML = `
      <span class="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
        ${dayVisits.length} Total Records
      </span>
      <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
        ✓ ${visitedPlanned.length} Planned Visited
      </span>
      <span class="px-2.5 py-1 rounded-full ${unvisitedPlanned.length > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'} font-bold border">
        ⏳ ${unvisitedPlanned.length} Unvisited
      </span>
      <span class="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
        ⚡ ${unplannedVisits.length} Unplanned
      </span>
      <span class="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
        🎯 ${totalCallsDone} Calls Done
      </span>
    `;
  }

  // Update Top KPI Cards
  const kpiPlanned = document.getElementById('kpiDailyReportPlanned');
  if (kpiPlanned) kpiPlanned.textContent = plannedVisits.length;

  const kpiVisited = document.getElementById('kpiDailyReportVisited');
  if (kpiVisited) kpiVisited.textContent = visitedPlanned.length;

  const kpiAdherence = document.getElementById('kpiDailyReportAdherence');
  if (kpiAdherence) kpiAdherence.textContent = `${adherencePct}% Planned Adherence`;

  const kpiUnvisited = document.getElementById('kpiDailyReportUnvisited');
  if (kpiUnvisited) kpiUnvisited.textContent = unvisitedPlanned.length;

  const kpiUnvisitedSub = document.getElementById('kpiDailyReportUnvisitedSub');
  if (kpiUnvisitedSub) kpiUnvisitedSub.textContent = unvisitedPlanned.length > 0 ? `${unvisitedPlanned.length} Missed / Pending` : 'All Planned Visited';

  const kpiUnplanned = document.getElementById('kpiDailyReportUnplanned');
  if (kpiUnplanned) kpiUnplanned.textContent = unplannedVisits.length;

  const kpiTotalDone = document.getElementById('kpiDailyReportTotalDone');
  if (kpiTotalDone) kpiTotalDone.textContent = totalCallsDone;

  const kpiOrdersValue = document.getElementById('kpiDailyReportOrdersValue');
  if (kpiOrdersValue) kpiOrdersValue.textContent = `AED ${formatCurrency(dayOrdersVal)}`;

  const kpiOrdersCount = document.getElementById('kpiDailyReportOrdersCount');
  if (kpiOrdersCount) kpiOrdersCount.textContent = `${dayOrders.length} Field Bookings`;

  // Update Tab Badge
  const tabBadge = document.getElementById('badgeDailyReportCount');
  if (tabBadge) {
    tabBadge.textContent = `${dayVisits.length} Visits`;
  }

  // Render Medical Representatives Performance Roster
  renderDailyReportRepsCards(dayVisits, dayOrders);

  // Render Unvisited Accounts Alert Callout
  renderDailyReportUnvisitedAlert(unvisitedPlanned, plannedVisits.length);

  // Render Detailed Visits Table & Mobile Cards
  renderDailyReportTableAndCards();

  safeLucide();
}

function renderDailyReportRepsCards(dayVisits, dayOrders) {
  const container = document.getElementById('dailyReportRepsContainer');
  if (!container) return;

  const isManager = (state.currentUser && state.currentUser.role === 'manager');
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2')) : 'ALL';

  let repsList = state.reps || [];
  if (!isManager) {
    // Medical Reps can ONLY see their own territory card; privacy strictly preserved
    repsList = repsList.filter(r => r.id === userTerritory);
  }

  const repsCountEl = document.getElementById('dailyReportRepsCount');
  if (repsCountEl) {
    if (!isManager) {
      repsCountEl.textContent = '1 Representative (My Territory)';
    } else {
      repsCountEl.textContent = `${repsList.length} Active Medical Representatives`;
    }
  }

  if (repsList.length === 0) {
    container.innerHTML = '<div class="text-slate-400 p-4 text-center">No representative profiles configured.</div>';
    return;
  }

  container.innerHTML = repsList.map(rep => {
    // Visits for this representative on the chosen date
    const repVisits = dayVisits.filter(v => v.repId === rep.id || v.territory === rep.id);
    const repPlanned = repVisits.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
    const repVisited = repPlanned.filter(v => v.status === 'Completed');
    const repUnvisited = repPlanned.filter(v => v.status !== 'Completed');
    const repUnplanned = repVisits.filter(v => v.visitCategory === 'Unplanned');
    const repTotalCalls = repVisited.length + repUnplanned.length;

    const repAdherencePct = repPlanned.length > 0 
      ? Math.round((repVisited.length / repPlanned.length) * 100) 
      : (repVisits.length > 0 ? 100 : 0);

    const repOrders = dayOrders.filter(o => o.repId === rep.id || o.territory === rep.id);
    const repOrdersVal = repOrders.reduce((sum, o) => sum + (o.totalIncVat || 0), 0);

    const isFiltered = state.filters.dailyReportRep === rep.id;

    return `
      <div class="glass-card rounded-2xl p-4 border ${isFiltered ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-800'} space-y-3.5 transition-all">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-md" style="background-color: ${rep.color}20; color: ${rep.color}; border-color: ${rep.color}40">
              ${rep.avatar || 'REP'}
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-extrabold text-white text-sm">Dr. ${escapeHtml(rep.name)}</h4>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style="background-color: ${rep.color}25; color: ${rep.color}">
                  Territory ${rep.territory}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-[240px]">
                ${(rep.emirates || []).join(', ')}
              </p>
            </div>
          </div>

          ${isManager ? `
            <button type="button" onclick="handleDailyReportRepFilter('${isFiltered ? 'ALL' : rep.id}')" class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${isFiltered ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}">
              ${isFiltered ? 'Filtered ✓ (Reset)' : 'Filter Rep'}
            </button>
          ` : `
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              My Profile
            </span>
          `}
        </div>

        <!-- Plan Execution Adherence Progress Bar -->
        <div class="space-y-1.5 pt-1">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-400 font-semibold">Planned Execution Adherence:</span>
            <span class="font-extrabold ${repAdherencePct >= 80 ? 'text-emerald-400' : (repAdherencePct >= 50 ? 'text-amber-400' : 'text-slate-400')}">
              ${repAdherencePct}% (${repVisited.length}/${repPlanned.length} Planned Done)
            </span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div class="h-full rounded-full transition-all duration-500 ${repAdherencePct >= 80 ? 'bg-emerald-500' : (repAdherencePct >= 50 ? 'bg-amber-500' : 'bg-sky-500')}" style="width: ${Math.min(100, repAdherencePct)}%"></div>
          </div>
        </div>

        <!-- Metric Stat Chips Grid -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs pt-1">
          <div class="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span class="text-[10px] text-slate-400 uppercase font-bold block">Planned</span>
            <span class="font-black text-sky-400 text-sm mt-0.5 block">${repPlanned.length}</span>
          </div>
          <div class="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
            <span class="text-[10px] text-emerald-300 uppercase font-bold block">Visited</span>
            <span class="font-black text-emerald-400 text-sm mt-0.5 block">${repVisited.length}</span>
          </div>
          <div class="p-2 rounded-xl ${repUnvisited.length > 0 ? 'bg-rose-950/30 border border-rose-500/30' : 'bg-slate-900/90 border border-slate-800'}">
            <span class="text-[10px] ${repUnvisited.length > 0 ? 'text-rose-300' : 'text-slate-400'} uppercase font-bold block">Unvisited</span>
            <span class="font-black ${repUnvisited.length > 0 ? 'text-rose-400' : 'text-slate-400'} text-sm mt-0.5 block">${repUnvisited.length}</span>
          </div>
          <div class="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30">
            <span class="text-[10px] text-amber-300 uppercase font-bold block">⚡ Unplanned</span>
            <span class="font-black text-amber-400 text-sm mt-0.5 block">${repUnplanned.length}</span>
          </div>
          <div class="p-2 rounded-xl bg-teal-950/30 border border-teal-500/30">
            <span class="text-[10px] text-teal-300 uppercase font-bold block">Total Calls</span>
            <span class="font-black text-teal-400 text-sm mt-0.5 block">${repTotalCalls}</span>
          </div>
          <div class="p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
            <span class="text-[10px] text-indigo-300 uppercase font-bold block">Orders AED</span>
            <span class="font-black text-indigo-300 text-xs mt-0.5 block">${formatCurrency(repOrdersVal)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderDailyReportUnvisitedAlert(unvisitedPlanned, plannedTotal) {
  const container = document.getElementById('dailyReportUnvisitedAlert');
  if (!container) return;

  if (unvisitedPlanned.length > 0) {
    container.innerHTML = `
      <div class="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/40 border border-rose-500/40 space-y-3 shadow-md">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-500/20">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            </div>
            <div>
              <h4 class="font-black text-white text-xs sm:text-sm">⚠️ Unvisited Planned Accounts (${unvisitedPlanned.length} Accounts Pending / Missed)</h4>
              <p class="text-[11px] text-slate-300">The following scheduled accounts were not visited on this day and require rescheduling or follow-up:</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30 self-start sm:self-auto whitespace-nowrap">
            Action Required
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${unvisitedPlanned.map(u => {
            const repName = getRepName(u.repId);
            return `
              <div class="bg-slate-950/80 p-3 rounded-xl border border-rose-500/30 space-y-2 text-xs">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="font-extrabold text-white truncate" title="${escapeHtml(u.clientName)}">${escapeHtml(u.clientName)}</div>
                    <div class="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span class="font-mono text-cyan-400">${u.clientCode || 'ACC'}</span> • <span>${u.location || 'UAE'}</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    ${u.status || 'Pending'}
                  </span>
                </div>

                <div class="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
                  <span>👤 Assigned: <strong>${repName}</strong></span>
                  <span>⏰ ${u.timeSlot || 'Scheduled'}</span>
                </div>

                ${u.missedReason ? `
                  <div class="text-[10px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-500/30">
                    <span class="text-rose-400 font-bold">Reason:</span> ${escapeHtml(u.missedReason)}
                  </div>
                ` : (u.purpose ? `
                  <div class="text-[10px] text-slate-400 bg-slate-900/80 p-1.5 rounded border border-slate-800 line-clamp-2">
                    <span class="text-slate-500 font-semibold">Planned Purpose:</span> ${escapeHtml(u.purpose)}
                  </div>
                ` : '')}

                <div class="pt-1 flex items-center justify-between gap-2">
                  <button type="button" onclick="openSubmitPlannedModal('${u.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all">
                    <i data-lucide="clipboard-check" class="w-3 h-3"></i> Check-in & Submit
                  </button>
                  <button type="button" onclick="openDailyReportVisitModal('${u.id}')" class="text-[10px] text-rose-300 hover:text-white font-bold underline">
                    View Record Details →
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (plannedTotal > 0) {
    container.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs flex items-center justify-between gap-3 text-emerald-300 font-semibold shadow-sm">
        <div class="flex items-center gap-2">
          <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0"></i>
          <span>100% Planned Adherence: All ${plannedTotal} scheduled customer calls for this date were completed.</span>
        </div>
        <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0">
          Flawless Execution
        </span>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs flex items-center gap-2 text-slate-400 font-medium">
        <i data-lucide="info" class="w-4 h-4 text-slate-400 shrink-0"></i>
        <span>No customer calls were planned on the schedule for this date.</span>
      </div>
    `;
  }
}

function renderDailyReportTableAndCards() {
  const dateStr = state.dailyReportDate || getSyncedTodayDate();
  const scopedVisits = getScopedVisits();
  const dayVisits = scopedVisits.filter(v => v.date === dateStr);

  const isManager = (state.currentUser && state.currentUser.role === 'manager');
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2')) : 'ALL';

  // Apply Rep Filter with strict rep isolation
  let filtered = dayVisits;
  if (!isManager) {
    filtered = filtered.filter(v => v.repId === userTerritory || v.territory === userTerritory);
  } else if (state.filters.dailyReportRep && state.filters.dailyReportRep !== 'ALL') {
    filtered = filtered.filter(v => v.repId === state.filters.dailyReportRep || v.territory === state.filters.dailyReportRep);
  }

  // Apply Status Filter
  if (state.filters.dailyReportStatus === 'VISITED') {
    filtered = filtered.filter(v => (v.visitCategory === 'Planned' || !v.visitCategory) && v.status === 'Completed');
  } else if (state.filters.dailyReportStatus === 'UNVISITED') {
    filtered = filtered.filter(v => (v.visitCategory === 'Planned' || !v.visitCategory) && v.status !== 'Completed');
  } else if (state.filters.dailyReportStatus === 'UNPLANNED') {
    filtered = filtered.filter(v => v.visitCategory === 'Unplanned');
  } else if (state.filters.dailyReportStatus === 'PLANNED') {
    filtered = filtered.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
  }

  // Apply Search Query
  if (state.filters.dailyReportSearch) {
    const q = state.filters.dailyReportSearch;
    filtered = filtered.filter(v => {
      const rep = getRepName(v.repId).toLowerCase();
      const client = (v.clientName || '').toLowerCase();
      const code = (v.clientCode || '').toLowerCase();
      const doc = (v.doctorName || '').toLowerCase();
      const loc = (v.location || '').toLowerCase();
      const products = Array.isArray(v.productsDetailed) ? v.productsDetailed.join(' ').toLowerCase() : '';
      const outcome = (v.outcome || '').toLowerCase();
      const purpose = (v.purpose || '').toLowerCase();
      return rep.includes(q) || client.includes(q) || code.includes(q) || doc.includes(q) || loc.includes(q) || products.includes(q) || outcome.includes(q) || purpose.includes(q);
    });
  }

  // Render Desktop Table Body
  const tableBody = document.getElementById('dailyReportTableBody');
  const mobileContainer = document.getElementById('dailyReportMobileCardsContainer');

  if (tableBody) {
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-10 text-slate-400">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="search-x" class="w-8 h-8 text-slate-600"></i>
              <span class="font-bold text-slate-300">No visits match your selected filters on this date.</span>
              <span class="text-xs text-slate-500">Try selecting a different date, clearing search keywords, or showing all records.</span>
              <button type="button" onclick="resetDailyReportFilters()" class="mt-2 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all">
                Reset All Filters
              </button>
            </div>
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = filtered.map(v => {
        const isUnplanned = v.visitCategory === 'Unplanned';
        const isCompleted = v.status === 'Completed';
        const repName = getRepName(v.repId);
        const repAvatar = getRepAvatar(v.repId);
        const repTerritory = getRepTerritoryStr(v.repId);

        // Status Badge Logic
        let categoryBadge = '';
        if (isUnplanned) {
          categoryBadge = `
            <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
              ⚡ Unplanned Visit
            </span>
          `;
        } else if (isCompleted) {
          categoryBadge = `
            <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
              ✓ Planned • Visited
            </span>
          `;
        } else {
          categoryBadge = `
            <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
              ⏳ Planned • Pending (${escapeHtml(v.status || 'Pending')})
            </span>
          `;
        }

        return `
          <tr class="hover:bg-slate-800/40 transition-colors">
            <!-- Medical Rep -->
            <td class="py-3 px-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-xl ${v.repId === 'T1' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'} flex items-center justify-center font-bold text-[10px] shrink-0">
                  ${repAvatar}
                </div>
                <div>
                  <span class="font-bold text-white text-xs block leading-tight">${repName}</span>
                  <span class="text-[9px] text-slate-400 font-medium">${repTerritory}</span>
                </div>
              </div>
            </td>

            <!-- Clinic & Account -->
            <td class="py-3 px-3">
              <div class="font-bold text-white text-xs leading-tight">${escapeHtml(v.clientName)}</div>
              <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span class="font-mono text-cyan-400">${v.clientCode || 'ACC'}</span>
                <span>•</span>
                <span>${v.location || 'UAE'}</span>
              </div>
            </td>

            <!-- Category & Status -->
            <td class="py-3 px-3 whitespace-nowrap">
              ${categoryBadge}
            </td>

            <!-- Time Slot -->
            <td class="py-3 px-3 text-slate-300 text-[11px] whitespace-nowrap font-medium">
              ${escapeHtml(v.timeSlot || 'Scheduled Time')}
            </td>

            <!-- Doctor Met -->
            <td class="py-3 px-3">
              <div class="text-slate-200 font-semibold text-xs leading-tight">${escapeHtml(v.doctorName || (isCompleted ? 'Veterinarian' : 'Doctor Pending'))}</div>
              <div class="text-[10px] text-slate-400">${escapeHtml(v.doctorRole || 'Doctor')}</div>
            </td>

            <!-- Products Detailed & Samples -->
            <td class="py-3 px-3 max-w-[200px]">
              <div class="text-[11px] text-slate-300 truncate" title="${Array.isArray(v.productsDetailed) ? escapeHtml(v.productsDetailed.join(', ')) : ''}">
                ${Array.isArray(v.productsDetailed) && v.productsDetailed.length > 0 
                  ? v.productsDetailed.map(p => `<span class="inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px] text-cyan-300 mr-1 mb-0.5">${escapeHtml(p)}</span>`).join('') 
                  : '<span class="text-slate-500 text-[10px]">No products detailed</span>'}
              </div>
              ${v.samplesDropped > 0 ? `
                <div class="mt-1">
                  <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                    💊 ${v.samplesDropped}x ${escapeHtml(v.sampleProduct || 'Sample')}
                  </span>
                </div>
              ` : ''}
            </td>

            <!-- Discussion / Outcome -->
            <td class="py-3 px-3 max-w-[240px]">
              ${(!isCompleted && !isUnplanned) ? `
                <div class="text-[11px] text-rose-300 font-semibold leading-snug">
                  <span class="text-rose-400 font-bold block text-[10px] uppercase">⏳ Planned Pending Execution:</span>
                  ${escapeHtml(v.purpose || 'Scheduled field detailing call.')}
                </div>
              ` : `
                <div class="text-[11px] text-slate-300 line-clamp-2" title="${escapeHtml(v.outcome || v.purpose || '')}">
                  ${escapeHtml(v.outcome || v.purpose || 'Detailing call conducted.')}
                </div>
                ${isUnplanned && v.unplannedReason ? `
                  <div class="text-[10px] text-amber-300 mt-1 leading-tight"><span class="text-amber-400 font-bold">⚡ Spontaneous:</span> ${escapeHtml(v.unplannedReason)}</div>
                ` : ''}
              `}
              ${v.doctorSentiment && v.doctorSentiment !== 'Pending' ? `
                <div class="mt-1">
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${getSentimentBadgeClass(v.doctorSentiment)}">
                    ${v.doctorSentiment}
                  </span>
                </div>
              ` : ''}
            </td>

            <!-- Order Placed -->
            <td class="py-3 px-3 text-right whitespace-nowrap">
              ${v.orderPlaced ? `
                <span class="font-black text-emerald-400 font-mono text-xs block">
                  AED ${formatCurrency(v.orderValueAed)}
                </span>
                <span class="text-[9px] text-emerald-300 font-semibold block">${v.orderRef || 'Booked'}</span>
              ` : `
                <span class="text-slate-500 text-xs font-medium">—</span>
              `}
            </td>

            <!-- Action -->
            <td class="py-3 px-3 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-1.5">
                ${!isCompleted ? `
                  <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all">
                    <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Check-in & Submit
                  </button>
                ` : ''}
                <button type="button" onclick="openDailyReportVisitModal('${v.id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-bold transition-colors">
                  Details
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Mobile Cards
  if (mobileContainer) {
    if (filtered.length === 0) {
      mobileContainer.innerHTML = `
        <div class="text-center py-8 text-slate-400 p-4 space-y-2">
          <i data-lucide="search-x" class="w-8 h-8 text-slate-600 mx-auto mb-1"></i>
          <p class="font-bold text-slate-300 text-xs">No visits match selected filters for this date.</p>
          <button type="button" onclick="resetDailyReportFilters()" class="mt-2 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all">
            Reset All Filters
          </button>
        </div>
      `;
    } else {
      mobileContainer.innerHTML = filtered.map(v => {
        const isUnplanned = v.visitCategory === 'Unplanned';
        const isCompleted = v.status === 'Completed';
        const repName = getRepName(v.repId);
        const repAvatar = getRepAvatar(v.repId);

        let categoryBadge = '';
        if (isUnplanned) {
          categoryBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">⚡ Unplanned</span>`;
        } else if (isCompleted) {
          categoryBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Visited</span>`;
        } else {
          categoryBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">⏳ Pending</span>`;
        }

        return `
          <div class="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 text-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-white text-sm truncate">${escapeHtml(v.clientName)}</div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span class="font-mono text-cyan-400">${v.clientCode || 'ACC'}</span> • <span>${v.location || 'UAE'}</span>
                </div>
              </div>
              <div class="shrink-0">${categoryBadge}</div>
            </div>

            <div class="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
              <div class="flex items-center gap-1.5 text-slate-300 font-semibold">
                <span class="w-5 h-5 rounded-md bg-sky-500/20 text-sky-300 flex items-center justify-center text-[9px] font-extrabold">${repAvatar}</span>
                <span>${repName}</span>
              </div>
              <span class="text-slate-400 text-[10px]">⏰ ${v.timeSlot || 'Scheduled'}</span>
            </div>

            ${(!isCompleted && !isUnplanned) ? `
              <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
                <div class="font-bold text-sky-400 flex items-center gap-1">
                  <i data-lucide="calendar" class="w-3.5 h-3.5"></i> Scheduled Purpose:
                </div>
                <p class="text-slate-300 leading-snug">${escapeHtml(v.purpose || 'Scheduled field detailing call.')}</p>
              </div>
            ` : `
              <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <div class="text-slate-300 font-semibold">
                  <span class="text-slate-500">Doctor Met:</span> ${escapeHtml(v.doctorName || 'Veterinarian')} (${escapeHtml(v.doctorRole || 'Doctor')})
                </div>
                <div class="text-slate-300 line-clamp-2">
                  <span class="text-slate-500">Outcome:</span> ${escapeHtml(v.outcome || v.purpose || 'Detailing call conducted.')}
                </div>
                ${isUnplanned && v.unplannedReason ? `
                  <div class="text-[10px] text-amber-300 pt-0.5"><span class="text-amber-400 font-bold">⚡ Unplanned Reason:</span> ${escapeHtml(v.unplannedReason)}</div>
                ` : ''}
              </div>
            `}

            <div class="flex items-center justify-between pt-1 text-[11px] gap-2">
              <div>
                ${v.orderPlaced ? `
                  <span class="font-extrabold text-emerald-400 font-mono text-xs">🛒 AED ${formatCurrency(v.orderValueAed)}</span>
                ` : `
                  <span class="text-slate-500 text-[10px]">No order generated</span>
                `}
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${!isCompleted ? `
                  <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95">
                    <i data-lucide="clipboard-check" class="w-3 h-3"></i> Submit
                  </button>
                ` : ''}
                <button type="button" onclick="openDailyReportVisitModal('${v.id}')" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs">
                  Details
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  safeLucide();
}

window.exportDailyReportCSV = function() {
  const dateStr = state.dailyReportDate || getSyncedTodayDate();
  const isManager = (state.currentUser && state.currentUser.role === 'manager');
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2')) : 'ALL';

  let visits = getScopedVisits().filter(v => v.date === dateStr);
  if (!isManager) {
    visits = visits.filter(v => v.repId === userTerritory || v.territory === userTerritory);
  } else if (state.filters.dailyReportRep && state.filters.dailyReportRep !== 'ALL') {
    visits = visits.filter(v => v.repId === state.filters.dailyReportRep || v.territory === state.filters.dailyReportRep);
  }

  if (visits.length === 0) {
    showToast('No Data to Export', `There are no visit records for date ${dateStr}.`, 'warning');
    return;
  }

  const headers = [
    'Date',
    'Medical Rep',
    'Territory',
    'Clinic Code',
    'Clinic Name',
    'Location',
    'Visit Category',
    'Status',
    'Time Slot',
    'Doctor Met',
    'Doctor Role',
    'Doctor Sentiment',
    'Products Detailed',
    'Samples Dropped',
    'Sample Product',
    'Order Placed',
    'Order Ref',
    'Order Value AED',
    'Purpose',
    'Outcome / Notes',
    'Next Follow Up Date'
  ];

  const csvRows = [headers.join(',')];

  visits.forEach(v => {
    const isUnplanned = v.visitCategory === 'Unplanned';
    const categoryLabel = isUnplanned ? 'Unplanned' : 'Planned';
    const statusLabel = isUnplanned ? 'Completed' : (v.status === 'Completed' ? 'Visited (Completed)' : `Unvisited (${v.status || 'Pending'})`);
    const repName = getRepName(v.repId);
    const row = [
      `"${v.date || dateStr}"`,
      `"${repName}"`,
      `"${v.repId || ''}"`,
      `"${v.clientCode || ''}"`,
      `"${(v.clientName || '').replace(/"/g, '""')}"`,
      `"${v.location || ''}"`,
      `"${categoryLabel}"`,
      `"${statusLabel}"`,
      `"${(v.timeSlot || '').replace(/"/g, '""')}"`,
      `"${(v.doctorName || '').replace(/"/g, '""')}"`,
      `"${(v.doctorRole || '').replace(/"/g, '""')}"`,
      `"${v.doctorSentiment || ''}"`,
      `"${Array.isArray(v.productsDetailed) ? v.productsDetailed.join('; ').replace(/"/g, '""') : ''}"`,
      v.samplesDropped || 0,
      `"${(v.sampleProduct || '').replace(/"/g, '""')}"`,
      v.orderPlaced ? 'YES' : 'NO',
      `"${v.orderRef || ''}"`,
      v.orderValueAed || 0,
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      `"${(v.outcome || '').replace(/"/g, '""')}"`,
      `"${v.nextFollowUp || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Conceptors_Daily_Report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Daily Report Exported', `Downloaded CSV spreadsheet for ${dateStr} (${visits.length} records).`, 'success');
};

window.openDailyReportVisitModal = function(visitId) {
  const visit = (state.visits || []).find(v => v.id === visitId);
  if (!visit) return;

  const modal = document.getElementById('dailyReportVisitModal');
  const content = document.getElementById('dailyReportModalContent');
  const title = document.getElementById('dailyReportModalTitle');
  const subtitle = document.getElementById('dailyReportModalSubtitle');

  if (title) title.textContent = `${visit.clientName} (${visit.location || 'UAE'})`;
  if (subtitle) subtitle.textContent = `Field Detailing Audit • Date: ${formatDisplayDate(visit.date)} • Rep ${visit.repId}`;

  const isUnplanned = visit.visitCategory === 'Unplanned';
  const isCompleted = visit.status === 'Completed';
  const repName = getRepName(visit.repId);

  let categoryBadge = '';
  if (isUnplanned) {
    categoryBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">⚡ Unplanned Visit</span>`;
  } else if (isCompleted) {
    categoryBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Planned • Visited (Completed)</span>`;
  } else {
    categoryBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">⏳ Planned • Unvisited (${escapeHtml(visit.status || 'Pending')})</span>`;
  }

  if (content) {
    content.innerHTML = `
      ${(!isCompleted && !isUnplanned) ? `
        <div class="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1.5 text-xs shadow-sm mb-3">
          <div class="flex items-center gap-2 text-rose-300 font-extrabold">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-400"></i>
            <span>⚠️ Missed / Unvisited Planned Visit Audit</span>
          </div>
          <p class="text-slate-200 leading-relaxed"><strong class="text-rose-400">Operational Reason Documented:</strong> ${escapeHtml(visit.missedReason || visit.outcome || 'Doctor or clinic unavailable at scheduled time.')}</p>
        </div>
      ` : ''}

      ${isUnplanned ? `
        <div class="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 text-xs shadow-sm mb-3">
          <div class="flex items-center gap-2 text-amber-300 font-extrabold">
            <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
            <span>⚡ Spontaneous Unplanned Field Call</span>
          </div>
          <p class="text-slate-200 leading-relaxed"><strong class="text-amber-400">Spontaneous Objective:</strong> ${escapeHtml(visit.unplannedReason || visit.purpose || 'Spontaneous customer interaction conducted beside planned calls.')}</p>
        </div>
      ` : ''}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <!-- Account & Schedule Details -->
        <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Account & Schedule Profile</span>
          <div class="space-y-1.5 text-xs text-slate-300">
            <div><span class="text-slate-500 font-semibold">Account:</span> <strong class="text-white">${escapeHtml(visit.clientName)}</strong> (${visit.clientCode || 'ACC'})</div>
            <div><span class="text-slate-500 font-semibold">Emirate / City:</span> ${visit.location || 'UAE'}</div>
            <div><span class="text-slate-500 font-semibold">Medical Rep:</span> <strong class="text-cyan-400">${repName}</strong> (Territory ${visit.repId})</div>
            <div><span class="text-slate-500 font-semibold">Visit Time:</span> ${visit.timeSlot || 'Scheduled Round'}</div>
            <div class="pt-1">${categoryBadge}</div>
          </div>
        </div>

        <!-- Doctor Detailing Profile -->
        <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Doctor & Sentiment</span>
          <div class="space-y-1.5 text-xs text-slate-300">
            <div><span class="text-slate-500 font-semibold">Doctor Met:</span> <strong class="text-white">${escapeHtml(visit.doctorName || 'Veterinarian')}</strong></div>
            <div><span class="text-slate-500 font-semibold">Role / Specialty:</span> ${escapeHtml(visit.doctorRole || 'Doctor')}</div>
            <div class="flex items-center gap-1.5 pt-1">
              <span class="text-slate-500 font-semibold">Reception Sentiment:</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSentimentBadgeClass(visit.doctorSentiment)}">
                ${visit.doctorSentiment || 'Positive'}
              </span>
            </div>
            ${visit.samplesDropped > 0 ? `
              <div class="pt-1">
                <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  💊 ${visit.samplesDropped} Samples Dropped: ${escapeHtml(visit.sampleProduct || 'Promotional Sample')}
                </span>
              </div>
            ` : '<div class="text-slate-500 text-[11px]">No clinical samples dropped</div>'}
          </div>
        </div>
      </div>

      <!-- Products Detailed -->
      <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Veterinary Portfolio Detailed</span>
        <div class="flex flex-wrap gap-1.5">
          ${Array.isArray(visit.productsDetailed) && visit.productsDetailed.length > 0 
            ? visit.productsDetailed.map(p => `
              <span class="px-2.5 py-1 rounded-xl bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
                ✓ ${escapeHtml(p)}
              </span>
            `).join('')
            : '<span class="text-slate-500 text-xs">No products detailed during this call.</span>'}
        </div>
      </div>

      <!-- Discussion & Field Notes -->
      <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Call Objective & Detailing Outcome</span>
        <div class="space-y-2 text-xs">
          ${visit.purpose ? `
            <div>
              <span class="text-slate-400 font-bold block mb-0.5">Call Objective:</span>
              <p class="text-slate-200 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 leading-relaxed">${escapeHtml(visit.purpose)}</p>
            </div>
          ` : ''}
          <div>
            <span class="text-slate-400 font-bold block mb-0.5">Doctor Feedback & Detailing Outcome:</span>
            <p class="text-slate-200 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 leading-relaxed">${escapeHtml(visit.outcome || 'Call conducted according to protocol.')}</p>
          </div>
        </div>
      </div>

      <!-- Order Generated & Next Follow-Up -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Field Sales Order Booking</span>
          ${visit.orderPlaced ? `
            <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-emerald-300 font-bold">Order Generated:</span>
                <span class="font-black text-emerald-400 font-mono text-sm">AED ${formatCurrency(visit.orderValueAed)}</span>
              </div>
              <div class="text-[11px] text-slate-300">Invoice Ref: <strong class="text-white">${visit.orderRef || 'Pending Ref'}</strong></div>
            </div>
          ` : `
            <p class="text-xs text-slate-400">No commercial sales order was placed during this visit.</p>
          `}
        </div>

        <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Next Scheduled Follow-Up</span>
          ${visit.nextFollowUp ? `
            <div class="text-xs text-slate-200 space-y-1">
              <div><span class="text-slate-400">Date:</span> <strong class="text-cyan-400">${formatDisplayDate(visit.nextFollowUp)}</strong></div>
              ${visit.nextFollowUpPurpose ? `<div><span class="text-slate-400">Objective:</span> ${escapeHtml(visit.nextFollowUpPurpose)}</div>` : ''}
            </div>
          ` : `
            <p class="text-xs text-slate-400">No follow-up date assigned yet.</p>
          `}
        </div>
      </div>
    `;
  }

  if (modal) modal.classList.remove('hidden');
  safeLucide();
};

window.closeDailyReportVisitModal = function() {
  const modal = document.getElementById('dailyReportVisitModal');
  if (modal) modal.classList.add('hidden');
};

// =========================================================================
// 8. SUBMIT PLANNED VISIT REPORT MODAL
// =========================================================================

window.openSubmitPlannedModal = function(visitId) {
  const visit = state.visits.find(v => v.id === visitId);
  if (!visit) return;

  document.getElementById('plannedVisitId').value = visit.id;
  document.getElementById('plannedModalSubtitle').textContent = `Submitting Visit: ${visit.clientName} (${visit.location}) • Rep ${visit.repId}`;
  document.getElementById('plannedDoctorName').value = visit.doctorName || '';
  document.getElementById('plannedDoctorRole').value = visit.doctorRole || 'Lead Veterinarian & Director';
  document.getElementById('plannedOutcome').value = visit.outcome || '';
  document.getElementById('plannedSampleUnits').value = visit.samplesDropped || 0;
  document.getElementById('plannedOrderPlaced').checked = !!visit.orderPlaced;

  const radio = document.querySelector(`input[name="plannedSentiment"][value="${visit.doctorSentiment || 'Enthusiastic'}"]`);
  if (radio) radio.checked = true;

  const sampleSelect = document.getElementById('plannedSampleProduct');
  sampleSelect.innerHTML = '<option value="">No sample given</option>' +
    state.products.map(p => `<option value="${escapeHtml(p.name)}" ${p.name === visit.sampleProduct ? 'selected' : ''}>${escapeHtml(p.name)} (${p.brand})</option>`).join('');

  const prodContainer = document.getElementById('plannedProductCheckboxes');
  prodContainer.innerHTML = state.products.slice(0, 18).map(p => {
    const isChecked = Array.isArray(visit.productsDetailed) && visit.productsDetailed.includes(p.name);
    return `
      <label class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-300 text-[11px]">
        <input type="checkbox" value="${escapeHtml(p.name)}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded accent-sky-500">
        <span class="truncate">${escapeHtml(p.name)}</span>
      </label>
    `;
  }).join('');

  document.getElementById('submitPlannedVisitModal').classList.remove('hidden');
  safeLucide();
};

window.closeSubmitPlannedModal = function() {
  const m = document.getElementById('submitPlannedVisitModal');
  if (m) m.classList.add('hidden');
};

window.handlePlannedVisitSubmit = function(e) {
  e.preventDefault();
  const visitId = document.getElementById('plannedVisitId').value;
  const visit = state.visits.find(v => v.id === visitId);
  if (!visit) return;

  const doctorName = document.getElementById('plannedDoctorName').value.trim();
  const doctorRole = document.getElementById('plannedDoctorRole').value;
  const outcome = document.getElementById('plannedOutcome').value.trim();
  const sampleProduct = document.getElementById('plannedSampleProduct').value;
  const sampleUnits = parseInt(document.getElementById('plannedSampleUnits').value) || 0;
  const orderPlaced = document.getElementById('plannedOrderPlaced').checked;

  const sentimentRadio = document.querySelector('input[name="plannedSentiment"]:checked');
  const doctorSentiment = sentimentRadio ? sentimentRadio.value : 'Enthusiastic';

  const chks = document.querySelectorAll('#plannedProductCheckboxes input[type="checkbox"]:checked');
  const productsDetailed = Array.from(chks).map(c => c.value);

  visit.status = 'Completed';
  visit.doctorName = doctorName;
  visit.doctorRole = doctorRole;
  visit.outcome = outcome;
  visit.doctorSentiment = doctorSentiment;
  visit.sampleProduct = sampleProduct;
  visit.samplesDropped = sampleUnits;
  visit.productsDetailed = productsDetailed;
  visit.orderPlaced = orderPlaced;

  // Immediately synchronize with Daily Visit Report
  state.dailyReportDate = visit.date || state.dailyDate || getSyncedTodayDate();
  state.filters.dailyReportStatus = 'ALL';

  persistData();
  closeSubmitPlannedModal();
  showToast('Planned Visit Report Submitted', `Field call report recorded for ${visit.clientName}.`, 'success');

  // Cloud write-through to Google Drive & auto-update Drive CSV
  pushToGoogleDrive('ADD_VISIT', { visit, user: (state.currentUser && state.currentUser.name) || 'Representative' });

  // Cloud write-through to Supabase
  supabaseRest('visits', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapVisitToDb(visit)
  }).then(res => {
    if (res.error) console.warn('Supabase visit update warning:', res.error);
    else updateCloudSyncBadge('connected', '⚡ Cloud Synced');
  });

  if (orderPlaced) {
    setTimeout(() => {
      openOrderModal(visit.clientCode, visit.repId);
    }, 400);
  }

  renderAll();
};

// =========================================================================
// 9. ADD UNPLANNED VISIT FOR TODAY (BESIDE PLANNED SCHEDULE)
// =========================================================================

window.openUnplannedVisitModal = function(defaultRep = null, defaultClient = null) {
  // Lock rep selection to current user if rep
  let targetRep = defaultRep;
  if (state.currentUser && state.currentUser.role === 'rep_t1') targetRep = 'T1';
  if (state.currentUser && state.currentUser.role === 'rep_t2') targetRep = 'T2';
  if (!targetRep) targetRep = 'T1';

  const repSelect = document.getElementById('unplannedRepSelect');
  if (state.currentUser && state.currentUser.role !== 'manager') {
    // Rep is locked to themselves
    repSelect.innerHTML = `<option value="${targetRep}">${state.currentUser.name} (${targetRep})</option>`;
    repSelect.disabled = true;
  } else {
    repSelect.disabled = false;
    repSelect.innerHTML = state.reps.map(r => `<option value="${r.id}" ${r.id === targetRep ? 'selected' : ''}>${r.name} (${r.territory})</option>`).join('');
  }

  filterUnplannedClinics();

  if (defaultClient) {
    selectCustomerCombobox('unplanned', defaultClient);
  } else {
    clearCustomerCombobox('unplanned');
  }

  // Unplanned visits can ONLY be on the day of submission (active execution date).
  // Reps cannot plan unplanned visits for future or other dates.
  const unpDateInput = document.getElementById('unplannedDate');
  if (unpDateInput) {
    unpDateInput.value = state.dailyDate;
    unpDateInput.readOnly = true;
    unpDateInput.min = state.dailyDate;
    unpDateInput.max = state.dailyDate;
  }
  const unpDateDisplay = document.getElementById('unplannedDateDisplay');
  if (unpDateDisplay) {
    unpDateDisplay.textContent = formatDisplayDate(state.dailyDate);
  }

  document.getElementById('unplannedDoctorName').value = '';
  document.getElementById('unplannedOutcome').value = '';
  document.getElementById('unplannedSampleUnits').value = 0;
  document.getElementById('unplannedOrderPlaced').checked = false;

  const sampleSelect = document.getElementById('unplannedSampleProduct');
  sampleSelect.innerHTML = '<option value="">No sample given</option>' +
    state.products.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${p.brand})</option>`).join('');

  const prodContainer = document.getElementById('unplannedProductCheckboxes');
  prodContainer.innerHTML = state.products.slice(0, 18).map(p => {
    return `
      <label class="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-300 text-[11px]">
        <input type="checkbox" value="${escapeHtml(p.name)}" class="w-3.5 h-3.5 rounded accent-amber-500">
        <span class="truncate">${escapeHtml(p.name)}</span>
      </label>
    `;
  }).join('');

  document.getElementById('addUnplannedVisitModal').classList.remove('hidden');
  safeLucide();
};

window.closeUnplannedVisitModal = function() {
  const m = document.getElementById('addUnplannedVisitModal');
  if (m) m.classList.add('hidden');
  closeCustomerCombobox('unplanned');
};

window.filterUnplannedClinics = function() {
  const repId = document.getElementById('unplannedRepSelect').value;
  const custSelect = document.getElementById('unplannedCustomerSelect');
  if (!custSelect) return;

  // Use strictly scoped customers
  const scoped = getScopedCustomers();
  const filtered = scoped.filter(c => (!repId || c.repId === repId || c.territory === repId) && c.isActive !== false);
  custSelect.innerHTML = `<option value="">-- Choose Account (${filtered.length} available) --</option>` +
    filtered.map(c => `<option value="${c.code}">${c.code} - ${escapeHtml(c.name)} (${c.location})</option>`).join('');

  // If current selection is not in filtered, reset combobox
  if (custSelect.value && !filtered.some(c => c.code === custSelect.value)) {
    clearCustomerCombobox('unplanned');
  }
};

window.handleUnplannedVisitSubmit = function(e) {
  e.preventDefault();
  const repId = document.getElementById('unplannedRepSelect').value;
  const clientCode = document.getElementById('unplannedCustomerSelect').value;
  if (!clientCode) {
    showToast('Account Required', 'Please search and select a veterinary customer from the searchable list.', 'warning');
    document.getElementById('unplannedCustomerSearchInput')?.focus();
    return;
  }

  const date = document.getElementById('unplannedDate').value;
  // Strictly enforce that unplanned visits can only be recorded on the day of submission / today
  if (date !== state.dailyDate) {
    showToast(
      'Submission Day Policy',
      `Unplanned visits can ONLY be logged for the active day of execution (${state.dailyDate}). You cannot plan an unplanned visit for future dates. Future visits must be scheduled at least 3 days in advance via the Monthly Planner.`,
      'error'
    );
    return;
  }

  const client = state.customers.find(c => c.code === clientCode);
  const unplannedReason = document.getElementById('unplannedReasonSelect').value;
  const doctorName = document.getElementById('unplannedDoctorName').value.trim();
  const doctorRole = document.getElementById('unplannedDoctorRole').value;
  const outcome = document.getElementById('unplannedOutcome').value.trim();
  const sampleProduct = document.getElementById('unplannedSampleProduct').value;
  const sampleUnits = parseInt(document.getElementById('unplannedSampleUnits').value) || 0;
  const orderPlaced = document.getElementById('unplannedOrderPlaced').checked;

  const sentimentRadio = document.querySelector('input[name="unplannedSentiment"]:checked');
  const doctorSentiment = sentimentRadio ? sentimentRadio.value : 'Enthusiastic';

  const chks = document.querySelectorAll('#unplannedProductCheckboxes input[type="checkbox"]:checked');
  const productsDetailed = Array.from(chks).map(c => c.value);

  const newUnplannedVisit = {
    id: `VIS-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}-UNP`,
    repId,
    territory: repId,
    clientCode,
    clientName: client ? client.name : clientCode,
    location: client ? client.location : 'UAE',
    date,
    timeSlot: 'Midday Spontaneous (12:00 - 15:00)',
    visitCategory: 'Unplanned',
    unplannedReason,
    status: 'Completed',
    doctorName,
    doctorRole,
    productsDetailed,
    doctorSentiment,
    samplesDropped: sampleUnits,
    sampleProduct,
    orderPlaced,
    orderRef: '',
    orderValueAed: 0,
    purpose: `[⚡ Unplanned] ${unplannedReason}`,
    outcome
  };

  state.visits.unshift(newUnplannedVisit);
  // Immediately synchronize with Daily Visit Report so newly entered visit appears right away
  state.dailyReportDate = date;
  state.filters.dailyReportStatus = 'ALL';

  persistData();
  closeUnplannedVisitModal();
  showToast('⚡ Unplanned Visit Recorded', `Spontaneous visit to ${newUnplannedVisit.clientName} added beside planned schedule for ${date}.`, 'success');

  // Cloud write-through to Google Drive & auto-update Drive CSV
  pushToGoogleDrive('ADD_VISIT', { visit: newUnplannedVisit, user: (state.currentUser && state.currentUser.name) || 'Representative' });

  // Cloud write-through to Supabase
  supabaseRest('visits', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapVisitToDb(newUnplannedVisit)
  }).then(res => {
    if (res.error) console.warn('Supabase unplanned visit insert warning:', res.error);
    else updateCloudSyncBadge('connected', '⚡ Cloud Synced');
  });

  if (orderPlaced) {
    setTimeout(() => {
      openOrderModal(clientCode, repId);
    }, 400);
  }

  renderAll();
};

// =========================================================================
// 10. MONTHLY VISIT PLANNER & APPROVALS (TAB 2)
// =========================================================================

function renderMonthlyPlanner() {
  if (!state.currentUser) return;

  const targetRep = state.currentUser.role === 'rep_t2' ? 'T2' : 'T1';
  const repObj = (state.reps && state.reps.find(r => r.id === targetRep)) || 
                 (state.reps && state.reps[0]) || 
                 { id: targetRep, name: targetRep === 'T1' ? 'Shaimaa' : 'Marsel', emirates: ['Dubai', 'Abu Dhabi'] };
  const repName = state.currentUser.role === 'manager' ? 'All Territories (Executive)' : repObj.name;

  let plan = state.monthlyPlans.find(p => p.repId === targetRep && p.month === 'SEP' && p.year === 2026);
  if (!plan) {
    plan = {
      id: `PLAN-2026-09-${targetRep}`,
      repId: targetRep,
      repName: repObj.name,
      year: 2026,
      month: 'SEP',
      targetVisits: 100,
      status: 'Approved'
    };
    state.monthlyPlans.push(plan);
  }

  const heading = document.getElementById('plannerMonthHeading');
  if (heading) heading.textContent = `September 2026 Monthly Field Plan`;

  const repHead = document.getElementById('plannerRepHeading');
  if (repHead) {
    repHead.textContent = state.currentUser.role === 'manager' 
      ? 'Executive Overview: Showing all scheduled representative plans' 
      : `Representative: ${repName} (${targetRep}) • Coverage: ${repObj.emirates.join(', ')}`;
  }

  const pill = document.getElementById('plannerStatusPill');
  const navPlanBadge = document.getElementById('badgeMonthlyPlanStatus');
  if (pill) {
    if (plan.status === 'Approved') {
      pill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1';
      pill.innerHTML = '<i data-lucide="shield-check" class="w-3 h-3"></i> Approved by Senior Leadership';
      if (navPlanBadge) navPlanBadge.textContent = 'Approved';
    } else if (plan.status === 'Submitted') {
      pill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1';
      pill.innerHTML = '<i data-lucide="clock" class="w-3 h-3"></i> Submitted (Pending Senior Review)';
      if (navPlanBadge) navPlanBadge.textContent = 'Submitted';
    } else {
      pill.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1';
      pill.innerHTML = '<i data-lucide="file-edit" class="w-3 h-3"></i> Draft Plan';
      if (navPlanBadge) navPlanBadge.textContent = 'Draft';
    }
  }

  // Quota calculation scoped
  const scopedPlanned = getScopedVisits().filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
  const quota = plan.targetVisits || 100;
  const pct = Math.min(100, Math.round((scopedPlanned.length / quota) * 100));

  const quotaText = document.getElementById('plannerQuotaText');
  if (quotaText) quotaText.textContent = `${scopedPlanned.length} / ${quota} Calls Planned (${pct}%)`;

  const pBar = document.getElementById('plannerProgressBar');
  if (pBar) pBar.style.width = `${pct}%`;

  const actionsContainer = document.getElementById('plannerActionButtons');
  if (actionsContainer) {
    let btnsHtml = '';
    if (state.currentUser.role === 'manager') {
      if (plan.status === 'Submitted') {
        btnsHtml += `
          <button onclick="approveMonthlyPlan('${plan.id}')" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i> Approve Monthly Plan
          </button>
        `;
      }
    } else {
      if (plan.status === 'Draft' || !plan.status) {
        btnsHtml += `
          <button onclick="submitPlanToManager('${plan.id}')" class="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20">
            <i data-lucide="send" class="w-4 h-4"></i> Submit Plan to Senior Manager
          </button>
        `;
      }
    }

    btnsHtml += `
      <button onclick="openPlanVisitModal()" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5">
        <i data-lucide="plus" class="w-4 h-4 text-sky-400"></i> Schedule Planned Visit
      </button>
    `;

    actionsContainer.innerHTML = btnsHtml;
  }

  setPlannerView(state.plannerView || 'calendar');
}

window.setPlannerView = function(mode) {
  state.plannerView = mode;
  const calContainer = document.getElementById('plannerCalendarContainer');
  const agendaContainer = document.getElementById('plannerAgendaContainer');
  const tableContainer = document.getElementById('plannerTableContainer');
  const btnCal = document.getElementById('btnPlannerViewCalendar');
  const btnAgenda = document.getElementById('btnPlannerViewAgenda');
  const btnTable = document.getElementById('btnPlannerViewTable');

  const activeClass = 'flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg font-bold bg-brand-600 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all text-[11px] sm:text-xs';
  const inactiveClass = 'flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-all text-[11px] sm:text-xs';

  if (calContainer) calContainer.classList.add('hidden');
  if (agendaContainer) agendaContainer.classList.add('hidden');
  if (tableContainer) tableContainer.classList.add('hidden');

  if (btnCal) btnCal.className = inactiveClass;
  if (btnAgenda) btnAgenda.className = inactiveClass;
  if (btnTable) btnTable.className = inactiveClass;

  if (mode === 'agenda') {
    if (agendaContainer) agendaContainer.classList.remove('hidden');
    if (btnAgenda) btnAgenda.className = activeClass;
    renderPlannerAgenda();
  } else if (mode === 'table') {
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (btnTable) btnTable.className = activeClass;
    renderPlannerTable();
  } else {
    state.plannerView = 'calendar';
    if (calContainer) calContainer.classList.remove('hidden');
    if (btnCal) btnCal.className = activeClass;
    renderPlannerCalendar();
  }
  safeLucide();
};

window.renderPlannerCalendar = function() {
  const container = document.getElementById('plannerCalendarDaysGrid');
  if (!container) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const year = state.plannerCalendarYear;
  const month = state.plannerCalendarMonth; // 1 to 12

  const titleEl = document.getElementById('plannerCalendarMonthTitle');
  if (titleEl) {
    titleEl.textContent = `${monthNames[month - 1]} ${year}`;
  }

  const minNoticeEl = document.getElementById('calendarMinDateNotice');
  const minDateStr = getMinPlannedDate(state.dailyDate);
  if (minNoticeEl) {
    minNoticeEl.textContent = minDateStr;
  }

  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startingDay = firstDay.getUTCDay();
  // Number of days in month
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Days in previous month for padding
  const prevMonthTotalDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

  const scopedVisits = getScopedVisits();
  const todayStr = getSyncedTodayDate();

  let cellsHtml = '';

  // 1. Previous month muted padding cells
  for (let i = startingDay - 1; i >= 0; i--) {
    const prevDayNum = prevMonthTotalDays - i;
    cellsHtml += `
      <div class="calendar-day-cell opacity-35 min-h-[52px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border border-slate-800/40 bg-slate-950/30 flex flex-col justify-between cursor-not-allowed select-none">
        <span class="text-xs font-semibold text-slate-600">${prevDayNum}</span>
        <div class="text-[9px] text-slate-600 font-medium hidden sm:block">Prior Month</div>
      </div>
    `;
  }

  // 2. Active month day cells
  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const dayVisits = scopedVisits.filter(v => v.date === dateStr);
    const plannedVisits = dayVisits.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
    const completedVisits = dayVisits.filter(v => v.status === 'Completed');

    const isToday = (dateStr === todayStr || dateStr === state.dailyDate);
    const isSelected = (dateStr === state.plannerSelectedDay);
    const isEligibleToPlan = (dateStr >= minDateStr);

    let cellBorderClass = 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700';
    if (isSelected) {
      cellBorderClass = 'border-sky-500 bg-sky-950/20 shadow-md shadow-sky-500/20 ring-1 ring-sky-500/40 active-selected';
    } else if (isToday) {
      cellBorderClass = 'border-emerald-500/80 bg-emerald-950/15 shadow-sm shadow-emerald-500/20';
    }

    cellsHtml += `
      <div 
        onclick="selectPlannerCalendarDay('${dateStr}')" 
        class="calendar-day-cell min-h-[52px] sm:min-h-[110px] p-1 sm:p-2 rounded-xl border ${cellBorderClass} transition-all flex flex-col justify-between cursor-pointer relative group touch-manipulation"
        title="Date: ${dateStr}${isEligibleToPlan ? ' • Click to view or plan target' : ' • Notice: 3-day advance rule applies'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-black ${isToday ? 'w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] shadow' : (isEligibleToPlan ? 'text-slate-200' : 'text-slate-500')}">
            ${day}
          </span>
          ${isToday ? '<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded border border-emerald-500/30 hidden sm:inline">Today</span>' : ''}
          ${isEligibleToPlan ? `
            <button 
              type="button" 
              onclick="event.stopPropagation(); openPlanVisitModal('${dateStr}')" 
              class="hidden sm:flex opacity-0 group-hover:opacity-100 p-0.5 px-1.5 rounded bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white transition-all text-[10px] font-bold items-center gap-0.5 shadow-sm"
              title="Schedule planned visit for ${dateStr}"
            >
              <i data-lucide="plus" class="w-3 h-3"></i> Plan
            </button>
          ` : ''}
        </div>

        <!-- Mobile Compact Dots Indicator (<640px) -->
        <div class="sm:hidden calendar-dots-row my-0.5">
          ${plannedVisits.slice(0, 4).map(v => `
            <span class="calendar-dot-indicator ${v.status === 'Completed' ? 'dot-completed' : (v.repId === 'T1' ? 'dot-t1' : 'dot-t2')}" title="${escapeHtml(v.clientName)}"></span>
          `).join('')}
          ${plannedVisits.length > 4 ? '<span class="text-[8px] text-sky-400 font-bold leading-none">+</span>' : ''}
        </div>

        <!-- Mobile Visit Count badge (<640px) -->
        <div class="sm:hidden text-center leading-none">
          ${plannedVisits.length > 0 ? `<span class="text-[9px] font-extrabold text-sky-400">${plannedVisits.length}</span>` : ''}
        </div>

        <!-- Visit Chips (up to 3) - Visible on Tablets & Desktops (>=640px) -->
        <div class="hidden sm:block space-y-1 my-1 overflow-hidden">
          ${plannedVisits.slice(0, 3).map(v => `
            <div class="calendar-visit-chip px-1.5 py-0.5 rounded text-[10px] truncate font-medium flex items-center gap-1 ${v.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-sky-950/40 text-sky-300 border border-sky-500/30'}" title="${escapeHtml(v.clientName)} (${v.doctorName || 'Doctor'})">
              <span class="font-black text-[9px] ${v.repId === 'T1' ? 'text-sky-400' : 'text-purple-400'}">${v.repId}</span>
              <span class="truncate text-[10px]">${escapeHtml(v.clientName)}</span>
            </div>
          `).join('')}
          ${plannedVisits.length > 3 ? `
            <div class="text-[9px] text-sky-400 font-bold pl-1">+${plannedVisits.length - 3} more</div>
          ` : ''}
        </div>

        <!-- Bottom status pill - Visible on Tablets & Desktops (>=640px) -->
        <div class="hidden sm:flex text-[10px] items-center justify-between pt-1 border-t border-slate-800/60">
          ${plannedVisits.length > 0 ? `
            <span class="font-extrabold text-sky-400 text-[10px]">${plannedVisits.length} Target${plannedVisits.length > 1 ? 's' : ''}</span>
          ` : (isEligibleToPlan ? `
            <span class="text-slate-500 group-hover:text-sky-400 transition-colors text-[9px] font-medium">+ Add Plan</span>
          ` : `
            <span class="text-slate-600 text-[9px]">Unplanned only</span>
          `)}
          ${completedVisits.length > 0 ? `
            <span class="text-emerald-400 text-[9px] font-bold">✓ ${completedVisits.length}</span>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 3. Next month blank padding cells
  const totalRendered = startingDay + totalDays;
  const remainingCells = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
  for (let day = 1; day <= remainingCells; day++) {
    cellsHtml += `
      <div class="calendar-day-cell opacity-35 min-h-[52px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border border-slate-800/40 bg-slate-950/30 flex flex-col justify-between cursor-not-allowed select-none">
        <span class="text-xs font-semibold text-slate-600">${day}</span>
        <div class="text-[9px] text-slate-600 font-medium hidden sm:block">Next Month</div>
      </div>
    `;
  }

  container.innerHTML = cellsHtml;

  // If a day is selected, render its drawer
  if (state.plannerSelectedDay) {
    renderPlannerSelectedDayDrawer(state.plannerSelectedDay);
  } else {
    const drawer = document.getElementById('plannerSelectedDayDrawer');
    if (drawer) drawer.classList.add('hidden');
  }

  safeLucide();
};

window.navigatePlannerMonth = function(delta) {
  state.plannerCalendarMonth += delta;
  if (state.plannerCalendarMonth > 12) {
    state.plannerCalendarMonth = 1;
    state.plannerCalendarYear += 1;
  } else if (state.plannerCalendarMonth < 1) {
    state.plannerCalendarMonth = 12;
    state.plannerCalendarYear -= 1;
  }
  state.plannerSelectedDay = null;
  if (state.plannerView === 'agenda') {
    renderPlannerAgenda();
  } else {
    renderPlannerCalendar();
  }
};

window.jumpPlannerCurrentMonth = function() {
  const parts = (state.dailyDate || getSyncedTodayDate()).split('-');
  state.plannerCalendarYear = parseInt(parts[0], 10);
  state.plannerCalendarMonth = parseInt(parts[1], 10);
  state.plannerSelectedDay = null;
  if (state.plannerView === 'agenda') {
    renderPlannerAgenda();
  } else {
    renderPlannerCalendar();
  }
};

window.selectPlannerCalendarDay = function(dateStr) {
  state.plannerSelectedDay = dateStr;
  renderPlannerCalendar();
  renderPlannerSelectedDayDrawer(dateStr);
  const drawer = document.getElementById('plannerSelectedDayDrawer');
  if (drawer && !drawer.classList.contains('hidden')) {
    setTimeout(() => {
      if (window.innerWidth < 768) {
        const headerOffset = 76;
        const elementPosition = drawer.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      } else {
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  }
};

window.renderPlannerSelectedDayDrawer = function(dateStr) {
  const drawer = document.getElementById('plannerSelectedDayDrawer');
  if (!drawer) return;

  drawer.classList.remove('hidden');

  const scopedVisits = getScopedVisits();
  const dayVisits = scopedVisits.filter(v => v.date === dateStr);
  const plannedVisits = dayVisits.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
  const minDateStr = getMinPlannedDate(state.dailyDate);
  const isEligibleToPlan = (dateStr >= minDateStr);
  const isToday = (dateStr === getSyncedTodayDate() || dateStr === state.dailyDate);

  let html = `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
          <i data-lucide="calendar" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-sm font-extrabold text-white">Schedule for ${formatDisplayDate(dateStr)}</h4>
            ${isToday ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">Today</span>' : ''}
            ${isEligibleToPlan ? '<span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">Advance Notice Met (>= 3 Days)</span>' : '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">Under 3-Day Window</span>'}
          </div>
          <p class="text-xs text-slate-400">${plannedVisits.length} planned target${plannedVisits.length === 1 ? '' : 's'} scheduled for this date</p>
        </div>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        ${isEligibleToPlan ? `
          <button type="button" onclick="openPlanVisitModal('${dateStr}')" class="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition-all active:scale-95 touch-manipulation">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Plan Visit on ${dateStr}
          </button>
        ` : (isToday ? `
          <button type="button" onclick="openUnplannedVisitModal()" class="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95 touch-manipulation">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-yellow-200"></i> + Log Unplanned Visit
          </button>
        ` : `
          <span class="text-xs text-amber-400 font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-1 sm:flex-initial text-center sm:text-left">
            Cannot schedule (&lt; 3-day notice rule).
          </span>
        `)}
        <button type="button" onclick="state.plannerSelectedDay = null; renderPlannerCalendar();" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-transform active:scale-95 touch-manipulation shrink-0" title="Close drawer">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;

  if (plannedVisits.length === 0) {
    html += `
      <div class="py-6 text-center text-slate-500 text-xs space-y-2">
        <div>No planned calls scheduled for this day yet.</div>
        ${isEligibleToPlan ? `
          <button type="button" onclick="openPlanVisitModal('${dateStr}')" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition-all active:scale-95 touch-manipulation">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Schedule Target on ${dateStr}
          </button>
        ` : ''}
      </div>
    `;
  } else {
    html += `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        ${plannedVisits.map(v => `
          <div class="rounded-xl p-3 bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-2">
            <div>
              <div class="flex items-center justify-between gap-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}">
                  ${v.status === 'Completed' ? '✓ Completed' : '📅 Planned'}
                </span>
              </div>
              <h5 class="font-bold text-white text-xs mt-1.5 truncate" title="${escapeHtml(v.clientName)}">${escapeHtml(v.clientName)}</h5>
              <p class="text-[11px] text-slate-400">${v.clientCode} • ${escapeHtml(v.doctorName || 'Doctor')}</p>
              <p class="text-[10px] text-slate-300 mt-1 truncate">${escapeHtml(v.purpose || 'Detailing')}</p>
            </div>
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span class="text-[10px] text-slate-400 font-mono">${v.timeSlot ? v.timeSlot.split(' ')[0] : 'Day'}</span>
              ${v.status !== 'Completed' ? `
                <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 touch-manipulation">
                  <i data-lucide="clipboard-check" class="w-3 h-3"></i> Execute
                </button>
              ` : '<span class="text-[10px] text-emerald-400 font-bold">Executed</span>'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  drawer.innerHTML = html;
  safeLucide();
};

window.renderPlannerAgenda = function() {
  const container = document.getElementById('plannerAgendaList');
  if (!container) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const year = state.plannerCalendarYear;
  const month = state.plannerCalendarMonth;
  const monthStr = String(month).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;

  const titleEl = document.getElementById('plannerAgendaMonthTitle');
  if (titleEl) {
    titleEl.textContent = `${monthNames[month - 1]} ${year}`;
  }

  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const scopedVisits = getScopedVisits();
  const minDateStr = getMinPlannedDate(state.dailyDate);
  const todayStr = getSyncedTodayDate();

  const monthVisits = scopedVisits.filter(v => v.date && v.date.startsWith(monthPrefix) && (v.visitCategory === 'Planned' || !v.visitCategory));

  const totalCounterEl = document.getElementById('agendaTotalTargetsCount');
  if (totalCounterEl) {
    totalCounterEl.textContent = `${monthVisits.length} Planned Calls in ${monthNames[month - 1]}`;
  }

  let html = '';
  let daysWithVisits = 0;

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const dayVisits = monthVisits.filter(v => v.date === dateStr);
    const isToday = (dateStr === todayStr || dateStr === state.dailyDate);
    const isEligibleToPlan = (dateStr >= minDateStr);

    if (dayVisits.length > 0 || isToday) {
      daysWithVisits++;
      const dateParts = dateStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

      html += `
        <div class="glass-card rounded-2xl p-3.5 sm:p-4 border ${isToday ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800'} space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800/80 gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl ${isToday ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-white'} flex flex-col items-center justify-center font-bold shrink-0">
                <span class="text-[9px] uppercase tracking-wider text-slate-400 leading-none">${weekday}</span>
                <span class="text-sm leading-tight">${day}</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-extrabold text-white text-xs sm:text-sm">${weekday}, ${displayDate}</h4>
                  ${isToday ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">Today</span>' : ''}
                </div>
                <span class="text-[11px] text-slate-400">${dayVisits.length} planned target${dayVisits.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            ${isEligibleToPlan ? `
              <button type="button" onclick="openPlanVisitModal('${dateStr}')" class="px-3 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 touch-manipulation">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Plan Call
              </button>
            ` : (isToday ? `
              <button type="button" onclick="openUnplannedVisitModal()" class="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 touch-manipulation">
                <i data-lucide="zap" class="w-3.5 h-3.5"></i> + Unplanned
              </button>
            ` : '')}
          </div>

          ${dayVisits.length === 0 ? `
            <div class="py-2 text-center text-xs text-slate-500">
              No planned calls scheduled for today yet.
            </div>
          ` : `
            <div class="space-y-2">
              ${dayVisits.map(v => `
                <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
                      <span class="font-bold text-white text-xs truncate">${escapeHtml(v.clientName)}</span>
                      <span class="text-[10px] font-mono text-slate-400">(${v.clientCode})</span>
                    </div>
                    <div class="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                      <span>🩺 ${escapeHtml(v.doctorName || 'Doctor')}</span>
                      <span>•</span>
                      <span>⏰ ${escapeHtml(v.timeSlot || 'Any Time')}</span>
                      <span>•</span>
                      <span class="text-slate-300">🎯 ${escapeHtml(v.purpose || 'Detailing')}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    ${v.status === 'Completed' ? `
                      <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <i data-lucide="check" class="w-3 h-3"></i> Completed
                      </span>
                    ` : `
                      <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95 touch-manipulation">
                        <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Execute Call
                      </button>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }
  }

  if (daysWithVisits === 0) {
    html = `
      <div class="py-12 text-center text-slate-400 space-y-3">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
          <i data-lucide="calendar-plus" class="w-6 h-6"></i>
        </div>
        <h4 class="font-bold text-white text-sm">No Planned Visits in ${monthNames[month - 1]} ${year}</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Start scheduling target accounts for this month (3-day advance notice applies).</p>
        <button type="button" onclick="openPlanVisitModal()" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md active:scale-95 touch-manipulation">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Schedule First Target
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
  safeLucide();
};

window.renderPlannerTable = function() {
  const tbody = document.getElementById('plannerTableBody');
  const cardsContainer = document.getElementById('plannerTableCards');
  if (!tbody) return;

  const searchQuery = (state.filters.plannerSearch || '').toLowerCase();
  const statusFilter = state.filters.plannerStatus || 'ALL';

  // Strictly scoped visits
  let list = getScopedVisits().filter(v => v.visitCategory === 'Planned' || !v.visitCategory);

  if (statusFilter !== 'ALL') {
    list = list.filter(v => v.status === statusFilter);
  }

  if (searchQuery) {
    list = list.filter(v =>
      (v.clientName && v.clientName.toLowerCase().includes(searchQuery)) ||
      (v.doctorName && v.doctorName.toLowerCase().includes(searchQuery)) ||
      (v.date && v.date.includes(searchQuery)) ||
      (v.purpose && v.purpose.toLowerCase().includes(searchQuery))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-500">No scheduled visits match the current filter.</td></tr>';
    if (cardsContainer) cardsContainer.innerHTML = '<div class="text-center py-8 text-slate-500 text-xs">No scheduled visits match the current filter.</div>';
    return;
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = list.map(v => {
      const isCompleted = v.status === 'Completed';
      return `
        <div class="glass-card rounded-xl p-3.5 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}">
              ${isCompleted ? '✓ Completed' : '📅 Planned'}
            </span>
          </div>
          <div>
            <h5 class="font-bold text-white text-xs">${escapeHtml(v.clientName)}</h5>
            <p class="text-[11px] text-slate-400">${v.clientCode} • ${escapeHtml(v.doctorName || 'Doctor')}</p>
          </div>
          <div class="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
            <div><b>Date:</b> ${v.date} (${v.timeSlot || 'Day Round'})</div>
            <div><b>Objective:</b> ${escapeHtml(v.purpose || 'Scientific Detailing')}</div>
            ${v.sampleProduct ? `<div><b>Sample:</b> ${escapeHtml(v.sampleProduct)} (${v.sampleUnits || 0}u)</div>` : ''}
          </div>
          <div class="pt-1 flex items-center justify-end gap-2">
            ${!isCompleted ? `
              <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 touch-manipulation">
                <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i> Execute Call
              </button>
            ` : '<span class="text-xs text-emerald-400 font-bold">Call Executed</span>'}
          </div>
        </div>
      `;
    }).join('');
  }

  tbody.innerHTML = list.map(v => {
    const isCompleted = v.status === 'Completed';

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-3 px-3 font-semibold whitespace-nowrap text-white">
          ${v.date}
          <span class="block text-[10px] text-slate-400">${v.timeSlot || 'Day Round'}</span>
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-200">${escapeHtml(v.clientName)}</div>
          <div class="text-[10px] text-slate-400">${v.clientCode} • ${v.location}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-semibold text-slate-300">${escapeHtml(v.doctorName || 'Lead Veterinarian')}</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(v.doctorRole || 'Doctor')}</div>
        </td>
        <td class="py-3 px-3 text-slate-300 max-w-xs truncate">
          ${escapeHtml(v.purpose || 'Scientific Detailing')}
        </td>
        <td class="py-3 px-3 text-center">
          ${v.samplesDropped > 0 ? `<span class="text-amber-400 font-bold">${v.samplesDropped} Units</span>` : '<span class="text-slate-500">-</span>'}
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          ${isCompleted ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Completed
            </span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Planned
            </span>
          `}
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          ${!isCompleted ? `
            <button onclick="openSubmitPlannedModal('${v.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 mx-auto active:scale-95 touch-manipulation">
              <i data-lucide="clipboard-check" class="w-3 h-3"></i> Execute
            </button>
          ` : `
            <span class="text-xs text-slate-500 font-bold">Executed</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
  safeLucide();
};

window.handlePlannerSearch = function(q) {
  state.filters.plannerSearch = q || '';
  renderPlannerTable();
  safeLucide();
};

window.handlePlannerFilter = function(status) {
  state.filters.plannerStatus = status || 'ALL';
  renderPlannerTable();
  safeLucide();
};

window.submitPlanToManager = function(planId) {
  const plan = state.monthlyPlans.find(p => p.id === planId);
  if (!plan) return;

  plan.status = 'Submitted';
  plan.submittedAt = new Date().toISOString();

  const notif = {
    id: `NOTIF-PLAN-${Date.now()}`,
    type: 'PLAN_SUBMITTED',
    title: 'Monthly Visit Plan Submitted',
    orderNumber: plan.id,
    repId: plan.repId,
    repName: plan.repName,
    clientCode: '-',
    clientName: `Monthly Plan for ${plan.month} ${plan.year}`,
    location: 'UAE Territory',
    totalExcVat: 0,
    totalIncVat: 0,
    timestamp: new Date().toISOString(),
    read: false,
    approvalStatus: 'Pending',
    itemsSummary: `Rep ${plan.repName} submitted the September 2026 monthly plan (${plan.targetVisits || 100} targets) for review.`
  };
  state.notifications.unshift(notif);

  persistData();

  // Cloud write-through to Google Drive
  pushToGoogleDrive('SAVE_PLAN', { plan, user: (state.currentUser && state.currentUser.name) || 'Representative' });

  // Cloud write-through to Supabase
  supabaseRest(`monthly_plans?id=eq.${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: { status: 'Submitted', submitted_at: plan.submittedAt, updated_at: new Date().toISOString() }
  });
  supabaseRest('notifications', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapNotifToDb(notif)
  });

  playNotificationChime();
  showToast('Plan Submitted to Senior Management', 'Your monthly plan is now awaiting Senior Manager approval.', 'success');
  renderAll();
};

window.approveMonthlyPlan = function(planId) {
  const plan = state.monthlyPlans.find(p => p.id === planId);
  if (!plan) return;

  plan.status = 'Approved';
  plan.approvedAt = new Date().toISOString();
  plan.approvedBy = 'Dr. Sameh Ageez (Senior Sales Manager)';

  persistData();

  // Cloud write-through to Google Drive
  pushToGoogleDrive('SAVE_PLAN', { plan, user: 'Dr. Sameh Ageez (Senior Sales Manager)' });

  // Cloud write-through to Supabase
  supabaseRest(`monthly_plans?id=eq.${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: { status: 'Approved', approved_at: plan.approvedAt, approved_by: plan.approvedBy, updated_at: new Date().toISOString() }
  });

  showToast('Monthly Plan Approved!', `Plan for ${plan.repName} approved and released for field execution.`, 'success');
  renderAll();
};

window.openPlanVisitModal = function(preferredDate = null) {
  let targetRep = 'T1';
  if (state.currentUser && state.currentUser.role === 'rep_t1') targetRep = 'T1';
  if (state.currentUser && state.currentUser.role === 'rep_t2') targetRep = 'T2';

  const repSelect = document.getElementById('planRepSelect');
  if (state.currentUser && state.currentUser.role !== 'manager') {
    repSelect.innerHTML = `<option value="${targetRep}">${state.currentUser.name} (${targetRep})</option>`;
    repSelect.disabled = true;
  } else {
    repSelect.disabled = false;
    repSelect.innerHTML = state.reps.map(r => `<option value="${r.id}" ${r.id === targetRep ? 'selected' : ''}>${r.name} (${r.territory})</option>`).join('');
  }

  filterPlanClinics();
  clearCustomerCombobox('plan');

  // Enforce 3-day advance planning rule
  const minDateStr = getMinPlannedDate(state.dailyDate);
  const planDateInput = document.getElementById('planDate');
  if (planDateInput) {
    planDateInput.min = minDateStr;
    if (preferredDate && preferredDate >= minDateStr) {
      planDateInput.value = preferredDate;
    } else {
      planDateInput.value = minDateStr;
      if (preferredDate && preferredDate < minDateStr) {
        showToast(
          '3-Day Advance Notice Required',
          `The selected date (${preferredDate}) does not meet the 3-day advance planning rule. Adjusted to earliest allowed date (${minDateStr}).`,
          'warning'
        );
      }
    }
  }
  const noticeEl = document.getElementById('planEarliestNotice');
  if (noticeEl) {
    noticeEl.textContent = `${minDateStr} (+3 days in advance)`;
  }

  document.getElementById('planDoctorName').value = '';
  document.getElementById('planPurpose').value = '';

  document.getElementById('planVisitModal').classList.remove('hidden');
  safeLucide();
};

window.closePlanVisitModal = function() {
  const m = document.getElementById('planVisitModal');
  if (m) m.classList.add('hidden');
  closeCustomerCombobox('plan');
};

window.filterPlanClinics = function() {
  const repId = document.getElementById('planRepSelect').value;
  const custSelect = document.getElementById('planCustomerSelect');
  if (!custSelect) return;

  // Use strictly scoped customers
  const scoped = getScopedCustomers();
  const filtered = scoped.filter(c => (!repId || c.repId === repId || c.territory === repId) && c.isActive !== false);
  custSelect.innerHTML = `<option value="">-- Choose Account (${filtered.length} available) --</option>` +
    filtered.map(c => `<option value="${c.code}">${c.code} - ${escapeHtml(c.name)} (${c.location})</option>`).join('');

  // If current selection is not in filtered, reset combobox
  if (custSelect.value && !filtered.some(c => c.code === custSelect.value)) {
    clearCustomerCombobox('plan');
  }
};

window.handlePlanVisitSubmit = function(e) {
  e.preventDefault();
  const repId = document.getElementById('planRepSelect').value;
  const clientCode = document.getElementById('planCustomerSelect').value;
  if (!clientCode) {
    showToast('Account Required', 'Please search and select a veterinary customer from the searchable list.', 'warning');
    document.getElementById('planCustomerSearchInput')?.focus();
    return;
  }

  const date = document.getElementById('planDate').value;
  const minDateStr = getMinPlannedDate(state.dailyDate);
  if (date < minDateStr) {
    showToast(
      '3-Day Advance Rule Violation',
      `Cannot schedule planned visit on ${date}. Under Conceptors SOP, monthly plan visits must be entered at least 3 days in advance (earliest allowed: ${minDateStr}). For earlier dates or today, please log an Unplanned Visit.`,
      'error'
    );
    return;
  }

  const client = state.customers.find(c => c.code === clientCode);
  const timeSlot = document.getElementById('planTimeSlot').value;
  const doctorName = document.getElementById('planDoctorName').value.trim();
  const purpose = document.getElementById('planPurpose').value.trim();

  const newPlannedVisit = {
    id: `VIS-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
    repId,
    territory: repId,
    clientCode,
    clientName: client ? client.name : clientCode,
    location: client ? client.location : 'UAE',
    date,
    timeSlot,
    visitCategory: 'Planned',
    status: 'Planned',
    doctorName,
    doctorRole: 'Lead Veterinarian',
    productsDetailed: [],
    doctorSentiment: 'Pending',
    samplesDropped: 0,
    sampleProduct: '',
    orderPlaced: false,
    orderRef: '',
    orderValueAed: 0,
    purpose,
    outcome: ''
  };

  state.visits.unshift(newPlannedVisit);
  state.dailyReportDate = date;
  state.filters.dailyReportStatus = 'ALL';
  persistData();

  // Cloud write-through to Google Drive & auto-update Drive CSV
  pushToGoogleDrive('ADD_VISIT', { visit: newPlannedVisit, user: (state.currentUser && state.currentUser.name) || 'Representative' });

  // Cloud write-through to Supabase
  supabaseRest('visits', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapVisitToDb(newPlannedVisit)
  }).then(res => {
    if (res.error) console.warn('Supabase planned visit insert warning:', res.error);
    else updateCloudSyncBadge('connected', '⚡ Cloud Synced');
  });

  closePlanVisitModal();
  showToast('Target Added to Monthly Plan', `Scheduled planned visit for ${newPlannedVisit.clientName} on ${date}.`, 'success');
  renderAll();
  if (typeof renderPlannerCalendar === 'function' && state.plannerView === 'calendar') {
    renderPlannerCalendar();
  }
};

// =========================================================================
// 11. DAILY CALL REPORTS (DCR) MASTER LOG (TAB 3)
// =========================================================================

function renderReportsTable() {
  const tbody = document.getElementById('reportsTableBody');
  if (!tbody) return;

  const searchQ = (state.filters.reportsSearch || '').toLowerCase();
  const typeFilter = state.filters.reportsType || 'ALL';
  const sentimentFilter = state.filters.reportsSentiment || 'ALL';
  const orderFilter = state.filters.reportsOrder || 'ALL';

  // Strictly scoped visits for the current logged-in rep
  let list = getScopedVisits().filter(v => v.status === 'Completed');

  if (typeFilter === 'Planned') {
    list = list.filter(v => v.visitCategory === 'Planned' || !v.visitCategory);
  } else if (typeFilter === 'Unplanned') {
    list = list.filter(v => v.visitCategory === 'Unplanned');
  }

  if (sentimentFilter !== 'ALL') {
    list = list.filter(v => v.doctorSentiment === sentimentFilter);
  }

  if (orderFilter === 'ORDERED') {
    list = list.filter(v => v.orderPlaced);
  } else if (orderFilter === 'NO_ORDER') {
    list = list.filter(v => !v.orderPlaced);
  }

  if (searchQ) {
    list = list.filter(v =>
      (v.clientName && v.clientName.toLowerCase().includes(searchQ)) ||
      (v.doctorName && v.doctorName.toLowerCase().includes(searchQ)) ||
      (v.outcome && v.outcome.toLowerCase().includes(searchQ))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-slate-500">No field call reports matching current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(v => {
    const isUnplanned = v.visitCategory === 'Unplanned';

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-3 px-3 whitespace-nowrap text-white font-semibold">${v.date}</td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-200">${escapeHtml(v.clientName)}</div>
          <div class="text-[10px] text-slate-400">${v.location}</div>
        </td>
        <td class="py-3 px-3 text-slate-300">${escapeHtml(v.doctorName || 'Doctor')}</td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          ${isUnplanned ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black badge-unplanned inline-flex items-center justify-center gap-1">
              <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i> [⚡ Unplanned]
            </span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold badge-planned">
              📅 Planned
            </span>
          `}
        </td>
        <td class="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate">
          ${Array.isArray(v.productsDetailed) && v.productsDetailed.length > 0 ? v.productsDetailed.join(', ') : '-'}
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSentimentBadgeClass(v.doctorSentiment)}">
            ${v.doctorSentiment || 'Positive'}
          </span>
        </td>
        <td class="py-3 px-3 text-center">
          ${v.samplesDropped > 0 ? `<span class="text-amber-400 font-bold">${v.samplesDropped}</span>` : '-'}
        </td>
        <td class="py-3 px-3 text-right font-black whitespace-nowrap ${v.orderPlaced ? 'text-emerald-400' : 'text-slate-500'}">
          ${v.orderPlaced ? `${formatCurrency(v.orderValueAed)} AED` : '-'}
        </td>
        <td class="py-3 px-3 text-slate-300 text-[11px] max-w-xs truncate">
          ${escapeHtml(v.outcome || '-')}
        </td>
      </tr>
    `;
  }).join('');
}

window.handleReportsFilter = function() {
  state.filters.reportsSearch = document.getElementById('reportsSearchInput')?.value || '';
  state.filters.reportsType = document.getElementById('reportsTypeFilter')?.value || 'ALL';
  state.filters.reportsSentiment = document.getElementById('reportsSentimentFilter')?.value || 'ALL';
  state.filters.reportsOrder = document.getElementById('reportsOrderFilter')?.value || 'ALL';
  renderReportsTable();
  safeLucide();
};

window.exportReportsCSV = function() {
  const completed = getScopedVisits().filter(v => v.status === 'Completed');
  const headers = ['Date', 'Rep', 'Category', 'Unplanned_Reason', 'Client_Code', 'Client_Name', 'Location', 'Doctor_Met', 'Doctor_Role', 'Doctor_Sentiment', 'Products_Detailed', 'Samples_Dropped', 'Order_Placed', 'Order_Value_AED', 'Outcome'];
  
  const rows = completed.map(v => [
    `"${v.date}"`,
    `"${v.repId}"`,
    `"${v.visitCategory || 'Planned'}"`,
    `"${v.unplannedReason || ''}"`,
    `"${v.clientCode}"`,
    `"${(v.clientName || '').replace(/"/g, '""')}"`,
    `"${v.location}"`,
    `"${(v.doctorName || '').replace(/"/g, '""')}"`,
    `"${(v.doctorRole || '').replace(/"/g, '""')}"`,
    `"${v.doctorSentiment || ''}"`,
    `"${(Array.isArray(v.productsDetailed) ? v.productsDetailed.join('; ') : '').replace(/"/g, '""')}"`,
    v.samplesDropped || 0,
    v.orderPlaced ? 'YES' : 'NO',
    v.orderValueAed || 0,
    `"${(v.outcome || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Conceptors_DCR_${state.currentUser ? state.currentUser.username : 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// =========================================================================
// 12. COMMERCIAL FIELD SALES ORDERS & SENIOR MANAGER ALERTS (TAB 4)
// =========================================================================

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  const searchQ = (state.filters.ordersSearch || '').toLowerCase();
  const approvalFilter = state.filters.ordersApproval || 'ALL';

  // Strictly scoped orders for the current logged-in rep
  let list = getScopedOrders();

  if (approvalFilter !== 'ALL') {
    list = list.filter(o => o.approvalStatus === approvalFilter);
  }

  if (searchQ) {
    list = list.filter(o =>
      (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(searchQ)) ||
      (o.clientName && o.clientName.toLowerCase().includes(searchQ)) ||
      (o.repName && o.repName.toLowerCase().includes(searchQ))
    );
  }

  const pendingCount = list.filter(o => o.approvalStatus === 'Pending').length;
  const badgePending = document.getElementById('badgePendingOrders');
  if (badgePending) badgePending.textContent = `${pendingCount} Pending`;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-slate-500">No field orders matching current filter.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(o => {
    const isApproved = o.approvalStatus === 'Approved';

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-3 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
          #${o.invoiceNumber}
        </td>
        <td class="py-3 px-3 whitespace-nowrap text-white font-medium">${o.date}</td>
        <td class="py-3 px-3">
          <span class="font-bold ${o.repId === 'T1' ? 'text-sky-400' : 'text-purple-400'}">${escapeHtml(o.repName || o.repId)}</span>
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-200">${escapeHtml(o.clientName)}</div>
          <div class="text-[10px] text-slate-400">${o.clientCode} • ${o.location}</div>
        </td>
        <td class="py-3 px-3 text-right font-medium text-slate-300">
          ${formatCurrency(o.totalExcVat)}
        </td>
        <td class="py-3 px-3 text-right font-black text-emerald-400">
          ${formatCurrency(o.totalIncVat)} AED
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
            <i data-lucide="mail-check" class="w-3 h-3 text-emerald-400"></i> Dispatched
          </span>
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          ${isApproved ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Approved
            </span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Pending Review
            </span>
          `}
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="viewNotificationEmailByOrder('${o.invoiceNumber}')" class="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1" title="View Executive Dispatched Email">
              <i data-lucide="mail" class="w-3 h-3"></i> View Email
            </button>
            ${!isApproved && state.currentUser && state.currentUser.role === 'manager' ? `
              <button onclick="approveOrderDirect('${o.invoiceNumber}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <i data-lucide="check" class="w-3 h-3"></i> Authorize
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.handleOrdersFilter = function() {
  state.filters.ordersSearch = document.getElementById('ordersSearchInput')?.value || '';
  state.filters.ordersApproval = document.getElementById('ordersApprovalFilter')?.value || 'ALL';
  renderOrdersTable();
  safeLucide();
};

window.openOrderModal = function(defaultClient = null, defaultRep = null) {
  let targetRep = defaultRep;
  if (state.currentUser && state.currentUser.role === 'rep_t1') targetRep = 'T1';
  if (state.currentUser && state.currentUser.role === 'rep_t2') targetRep = 'T2';
  if (!targetRep) targetRep = 'T1';

  const repSelect = document.getElementById('orderRepSelect');
  if (state.currentUser && state.currentUser.role !== 'manager') {
    repSelect.innerHTML = `<option value="${targetRep}">${state.currentUser.name} (${targetRep})</option>`;
    repSelect.disabled = true;
  } else {
    repSelect.disabled = false;
    repSelect.innerHTML = state.reps.map(r => `<option value="${r.id}" ${r.id === targetRep ? 'selected' : ''}>${r.name} (${r.territory})</option>`).join('');
  }

  filterOrderClinics();

  if (defaultClient) {
    selectCustomerCombobox('order', defaultClient);
  } else {
    clearCustomerCombobox('order');
  }

  const newNum = `ORD-${state.dailyDate.replace(/-/g, '').slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  document.getElementById('orderNumber').value = newNum;
  document.getElementById('orderDate').value = state.dailyDate;

  const linesBody = document.getElementById('orderLineItemsBody');
  linesBody.innerHTML = '';
  addOrderLineItem('VR030', 25, 5);

  recalculateOrderTotals();

  document.getElementById('fieldOrderModal').classList.remove('hidden');
  safeLucide();
};

window.closeOrderModal = function() {
  const m = document.getElementById('fieldOrderModal');
  if (m) m.classList.add('hidden');
  closeCustomerCombobox('order');
};

window.filterOrderClinics = function() {
  const repId = document.getElementById('orderRepSelect').value;
  const custSelect = document.getElementById('orderCustomerSelect');
  if (!custSelect) return;

  const scoped = getScopedCustomers();
  const filtered = scoped.filter(c => (!repId || c.repId === repId || c.territory === repId) && c.isActive !== false);
  custSelect.innerHTML = `<option value="">-- Choose Account (${filtered.length} available) --</option>` +
    filtered.map(c => `<option value="${c.code}">${c.code} - ${escapeHtml(c.name)} (${c.location})</option>`).join('');

  // If current selection is not in filtered, reset combobox
  if (custSelect.value && !filtered.some(c => c.code === custSelect.value)) {
    clearCustomerCombobox('order');
  }
};

window.addOrderLineItem = function(defaultCode = '', defaultSales = 10, defaultFoc = 2) {
  const tbody = document.getElementById('orderLineItemsBody');
  if (!tbody) return;

  const row = document.createElement('tr');
  row.className = 'order-line-item';

  const optionsHtml = state.products.map(p => `
    <option value="${p.code}" data-price="${p.unitPrice}" ${p.code === defaultCode ? 'selected' : ''}>
      ${p.code} - ${escapeHtml(p.name)} (${p.unitPrice} AED)
    </option>
  `).join('');

  row.innerHTML = `
    <td class="py-2 px-3">
      <select class="item-prod-select w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none">
        ${optionsHtml}
      </select>
    </td>
    <td class="py-2 px-2 text-right">
      <input type="number" step="0.01" class="item-price-input w-20 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-300 text-right outline-none" readonly>
    </td>
    <td class="py-2 px-2 text-center">
      <input type="number" min="1" value="${defaultSales}" class="item-sales-input w-16 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-100 text-center font-bold outline-none focus:border-indigo-500">
    </td>
    <td class="py-2 px-2 text-center">
      <input type="number" min="0" value="${defaultFoc}" class="item-foc-input w-16 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-amber-300 text-center font-bold outline-none focus:border-amber-500">
    </td>
    <td class="py-2 px-3 text-right font-bold text-emerald-400 item-row-total">
      0.00 AED
    </td>
    <td class="py-2 px-2 text-center">
      <button type="button" class="btn-remove-line p-1 text-slate-500 hover:text-rose-400">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </td>
  `;

  tbody.appendChild(row);

  const prodSelect = row.querySelector('.item-prod-select');
  const priceInput = row.querySelector('.item-price-input');
  const salesInput = row.querySelector('.item-sales-input');
  const focInput = row.querySelector('.item-foc-input');
  const removeBtn = row.querySelector('.btn-remove-line');

  function updatePrice() {
    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
    const price = parseFloat(selectedOpt.getAttribute('data-price')) || 0;
    priceInput.value = price.toFixed(2);
  }

  updatePrice();

  prodSelect.addEventListener('change', () => {
    updatePrice();
    recalculateOrderTotals();
  });

  priceInput.addEventListener('input', recalculateOrderTotals);
  salesInput.addEventListener('input', recalculateOrderTotals);
  focInput.addEventListener('input', recalculateOrderTotals);

  removeBtn.addEventListener('click', () => {
    row.remove();
    recalculateOrderTotals();
  });

  recalculateOrderTotals();
  safeLucide();
};

window.recalculateOrderTotals = function() {
  const rows = document.querySelectorAll('.order-line-item');
  let subtotal = 0;

  rows.forEach(row => {
    const price = parseFloat(row.querySelector('.item-price-input').value) || 0;
    const salesQty = parseInt(row.querySelector('.item-sales-input').value) || 0;
    const lineTotal = price * salesQty;
    row.querySelector('.item-row-total').textContent = `${formatCurrency(lineTotal)} AED`;
    subtotal += lineTotal;
  });

  const vat = subtotal * 0.05;
  const grandTotal = subtotal + vat;

  document.getElementById('orderSubtotalDisplay').textContent = `${formatCurrency(subtotal)} AED`;
  document.getElementById('orderVatDisplay').textContent = `${formatCurrency(vat)} AED`;
  document.getElementById('orderTotalDisplay').textContent = `${formatCurrency(grandTotal)} AED`;
};

window.handleOrderSubmit = function(e) {
  e.preventDefault();
  const orderNumber = document.getElementById('orderNumber').value;
  const date = document.getElementById('orderDate').value;
  const repId = document.getElementById('orderRepSelect').value;
  const repObj = state.reps.find(r => r.id === repId);
  const clientCode = document.getElementById('orderCustomerSelect').value;
  if (!clientCode) {
    showToast('Customer Required', 'Please search and select a veterinary customer from the searchable list.', 'warning');
    document.getElementById('orderCustomerSearchInput')?.focus();
    return;
  }
  const customer = state.customers.find(c => c.code === clientCode);
  const paymentTerms = document.getElementById('orderPaymentTerms').value;
  const deliveryUrgency = document.getElementById('orderDeliveryUrgency').value;

  const rows = document.querySelectorAll('.order-line-item');
  const items = [];
  let subtotal = 0;

  rows.forEach(row => {
    const prodCode = row.querySelector('.item-prod-select').value;
    const prodObj = state.products.find(p => p.code === prodCode);
    const price = parseFloat(row.querySelector('.item-price-input').value) || 0;
    const salesQty = parseInt(row.querySelector('.item-sales-input').value) || 0;
    const focQty = parseInt(row.querySelector('.item-foc-input').value) || 0;
    const lineTotal = price * salesQty;

    if (salesQty > 0 || focQty > 0) {
      items.push({
        productCode: prodCode,
        productName: prodObj ? prodObj.name : prodCode,
        unitPrice: price,
        salesQty,
        focQty,
        total: lineTotal
      });
      subtotal += lineTotal;

      if (prodObj) {
        prodObj.currentStock = Math.max(0, prodObj.currentStock - (salesQty + focQty));
      }
    }
  });

  if (items.length === 0) {
    alert('Please add at least one product with sales quantity.');
    return;
  }

  const vatAmount = subtotal * 0.05;
  const totalIncVat = subtotal + vatAmount;

  const newOrder = {
    invoiceNumber: orderNumber,
    date,
    repId,
    repName: repObj ? repObj.name : `Rep ${repId}`,
    clientCode,
    clientName: customer ? customer.name : clientCode,
    location: customer ? customer.location : 'UAE',
    territory: repId,
    approvalStatus: 'Pending',
    approvedBy: null,
    approvedAt: null,
    paymentTerms,
    deliveryUrgency,
    items,
    totalExcVat: subtotal,
    vatAmount,
    totalIncVat
  };

  state.orders.unshift(newOrder);

  // Automated Senior Manager alert
  const newNotif = {
    id: `NOTIF-${orderNumber}-${Date.now()}`,
    type: 'ORDER_SUBMITTED',
    title: `New Field Sales Order Submitted #${orderNumber}`,
    orderNumber,
    repId,
    repName: newOrder.repName,
    clientCode,
    clientName: newOrder.clientName,
    location: newOrder.location,
    totalExcVat: subtotal,
    totalIncVat,
    timestamp: new Date().toISOString(),
    read: false,
    approvalStatus: 'Pending',
    itemsSummary: items.map(i => `${i.productName} (${i.salesQty} Sls${i.focQty > 0 ? ` + ${i.focQty} FOC` : ''})`).join(', '),
    paymentTerms,
    deliveryUrgency,
    items
  };
  state.notifications.unshift(newNotif);

  persistData();

  // Cloud write-through to Google Drive & auto-update Drive CSV
  pushToGoogleDrive('ADD_ORDER', { order: newOrder, user: (state.currentUser && state.currentUser.name) || 'Representative' });

  // Cloud write-through to Supabase for order, line items, and notification
  (async () => {
    try {
      await supabaseRest('orders', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: mapOrderToDb(newOrder)
      });
      for (const it of items) {
        await supabaseRest('order_items', {
          method: 'POST',
          body: {
            order_number: orderNumber,
            product_code: it.productCode,
            product_name: it.productName,
            unit_price: it.unitPrice,
            sales_qty: it.salesQty,
            foc_qty: it.focQty,
            line_total: it.total
          }
        });
      }
      await supabaseRest('notifications', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: mapNotifToDb(newNotif)
      });
      updateCloudSyncBadge('connected', '⚡ Cloud Synced');
    } catch (err) {
      console.warn('Supabase order write warning:', err);
    }
  })();

  closeOrderModal();

  if (state.managerSettings.soundAlert) playNotificationChime();
  if (state.managerSettings.toastAlert) {
    showToast(
      `🚨 New Order #${orderNumber} Submitted!`,
      `${newOrder.repName} booked an order for ${newOrder.clientName} (${newOrder.location}) totaling ${formatCurrency(totalIncVat)} AED. Automated executive email dispatched to Senior Managers.`,
      'success'
    );
  }

  renderAll();
};

// =========================================================================
// 13. SENIOR MANAGER NOTIFICATIONS HUB & EXECUTIVE EMAIL
// =========================================================================

function updateNotificationBell() {
  const badge = document.getElementById('notificationBadge');
  const unreadCount = state.notifications.filter(n => !n.read).length;

  if (badge) {
    badge.textContent = unreadCount;
    if (unreadCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

window.openNotificationsModal = function() {
  renderManagerNotifications();
  document.getElementById('managerNotificationsModal').classList.remove('hidden');
  safeLucide();
};

window.closeNotificationsModal = function() {
  const m = document.getElementById('managerNotificationsModal');
  if (m) m.classList.add('hidden');
};

function renderManagerNotifications() {
  const container = document.getElementById('managerNotificationsList');
  if (!container) return;

  if (state.notifications.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500">
        <i data-lucide="bell-off" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
        <p class="text-xs font-bold text-slate-400">No alerts in manager inbox</p>
      </div>
    `;
    safeLucide();
    return;
  }

  container.innerHTML = state.notifications.map(n => {
    const isUnread = !n.read;
    const isApproved = n.approvalStatus === 'Approved';
    const dateObj = new Date(n.timestamp);
    const isAccountEvent = n.type && n.type.startsWith('ACCOUNT_');

    if (isAccountEvent) {
      const isFrozen = n.type === 'ACCOUNT_FROZEN';
      const isUnfrozen = n.type === 'ACCOUNT_UNFROZEN';
      const iconName = isFrozen ? 'snowflake' : (isUnfrozen ? 'flame' : 'building-2');
      const iconStyle = isFrozen
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        : (isUnfrozen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-teal-500/20 text-teal-300 border-teal-500/40');
      const badgeStyle = isFrozen
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        : (isUnfrozen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-teal-500/20 text-teal-300 border-teal-500/30');
      const badgeText = isFrozen ? '❄️ Account Frozen' : (isUnfrozen ? '🔥 Reactivated' : '✨ New Clinic Added');

      return `
        <div class="glass-card rounded-xl p-4 border ${isUnread ? (isFrozen ? 'border-cyan-500/50 bg-cyan-950/20' : 'border-teal-500/50 bg-teal-950/20') : 'border-slate-800 bg-slate-900/60'} relative transition-all">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl ${iconStyle} flex items-center justify-center shrink-0 border">
                <i data-lucide="${iconName}" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white text-xs">${escapeHtml(n.title)}</span>
                  ${isUnread ? '<span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>' : ''}
                  <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${n.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${n.repId}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}">${badgeText}</span>
                </div>
                <p class="text-[11px] text-slate-300 mt-0.5 font-medium">
                  Field Rep: <strong class="text-white">${escapeHtml(n.repName)}</strong> • Clinic: <span class="text-teal-300 font-bold">${escapeHtml(n.clientName)}</span> (<span class="font-mono">${escapeHtml(n.clientCode || '')}</span> • ${escapeHtml(n.location || 'UAE')})
                </p>
                ${n.itemsSummary ? `<p class="text-[10px] text-slate-300 mt-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">${escapeHtml(n.itemsSummary)}</p>` : ''}
              </div>
            </div>

            <div class="text-right shrink-0">
              <span class="text-[10px] text-slate-400 block">${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span class="text-[10px] font-extrabold ${isFrozen ? 'text-cyan-400' : 'text-teal-400'} block mt-1">
                ${isFrozen ? '❄️ Inactive' : '✓ Active'}
              </span>
            </div>
          </div>

          <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div class="text-[10px] text-slate-400">
              <span>Territory: <strong class="text-slate-200">${n.repId}</strong></span>
              <span class="mx-1">•</span>
              <span>Clinic Code: <strong class="text-teal-300 font-mono">${escapeHtml(n.clientCode || '')}</strong></span>
            </div>

            <div class="flex items-center gap-1.5">
              <button onclick="goToAccountInCRM('${n.clientCode}')" class="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1">
                <i data-lucide="building-2" class="w-3 h-3"></i> View in Accounts CRM
              </button>
              ${isUnread ? `
                <button onclick="markNotificationReadDirect('${n.id}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold">
                  Acknowledge
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="glass-card rounded-xl p-4 border ${isUnread ? 'border-amber-500/50 bg-amber-950/15' : 'border-slate-800 bg-slate-900/60'} relative transition-all">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl ${n.type === 'PLAN_SUBMITTED' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'} flex items-center justify-center shrink-0 border border-slate-700">
              <i data-lucide="${n.type === 'PLAN_SUBMITTED' ? 'calendar-plus' : 'shopping-bag'}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-xs">${escapeHtml(n.title)}</span>
                ${isUnread ? '<span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>' : ''}
                <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${n.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${n.repId}</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-0.5 font-medium">
                Booked by <strong class="text-white">${escapeHtml(n.repName)}</strong> for <span class="text-sky-300 font-bold">${escapeHtml(n.clientName)}</span> (${n.location || 'UAE'})
              </p>
              ${n.itemsSummary ? `<p class="text-[10px] text-slate-400 mt-1 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">${escapeHtml(n.itemsSummary)}</p>` : ''}
            </div>
          </div>

          <div class="text-right shrink-0">
            ${n.totalIncVat > 0 ? `<div class="font-black text-emerald-400 text-sm">${formatCurrency(n.totalIncVat)} AED</div>` : ''}
            <span class="text-[10px] text-slate-400 block">${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="text-[10px] font-bold ${isApproved ? 'text-sky-400' : 'text-amber-400'} block mt-1">
              ${isApproved ? '✓ Approved' : '⏳ Pending Review'}
            </span>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div class="text-[10px] text-slate-400">
            <span>Payment: <strong class="text-slate-200">${n.paymentTerms || 'Credit'}</strong></span>
            <span class="mx-1">•</span>
            <span>Delivery: <strong class="text-amber-300">${n.deliveryUrgency || 'Normal'}</strong></span>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="viewNotificationEmail('${n.id}')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1">
              <i data-lucide="mail" class="w-3 h-3"></i> View Dispatched Email
            </button>
            ${!isApproved && state.currentUser && state.currentUser.role === 'manager' ? `
              <button onclick="approveOrderFromNotification('${n.id}', '${n.orderNumber}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                <i data-lucide="check" class="w-3 h-3"></i> Authorize
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  safeLucide();
}

window.markAllNotificationsRead = function() {
  state.notifications.forEach(n => { n.read = true; });
  persistData();

  // Cloud write-through to Supabase
  supabaseRest('notifications?read=eq.false', {
    method: 'PATCH',
    body: { read: true }
  });

  updateNotificationBell();
  renderManagerNotifications();
  showToast('Notifications Acknowledged', 'All notifications marked as read.', 'info');
};

window.approveOrderFromNotification = function(notifId, orderNum) {
  const notif = state.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.approvalStatus = 'Approved';
    notif.read = true;
  }
  approveOrderDirect(orderNum);
  renderManagerNotifications();
};

window.approveOrderDirect = function(orderNum) {
  const order = state.orders.find(o => o.invoiceNumber === orderNum);
  if (order) {
    order.approvalStatus = 'Approved';
    order.approvedBy = 'Dr. Sameh Ageez (Senior Sales Manager)';
    order.approvedAt = new Date().toISOString();
  }

  const notif = state.notifications.find(n => n.orderNumber === orderNum);
  if (notif) {
    notif.approvalStatus = 'Approved';
    notif.read = true;
  }

  persistData();

  // Cloud write-through to Google Drive
  pushToGoogleDrive('UPDATE_ORDER_STATUS', {
    invoiceNumber: orderNum,
    status: 'Approved',
    approvedBy: order ? order.approvedBy : 'Dr. Sameh Ageez (Senior Sales Manager)'
  });

  // Cloud write-through to Supabase
  if (order) {
    supabaseRest(`orders?invoice_number=eq.${encodeURIComponent(orderNum)}`, {
      method: 'PATCH',
      body: {
        approval_status: 'Approved',
        approved_by: order.approvedBy,
        approved_at: order.approvedAt,
        updated_at: new Date().toISOString()
      }
    });
  }
  if (notif) {
    supabaseRest(`notifications?order_number=eq.${encodeURIComponent(orderNum)}`, {
      method: 'PATCH',
      body: { approval_status: 'Approved', read: true }
    });
  }

  showToast('Order Approved', `Order #${orderNum} authorized and released for commercial delivery.`, 'success');
  renderAll();
};

window.viewNotificationEmailByOrder = function(orderNum) {
  const notif = state.notifications.find(n => n.orderNumber === orderNum);
  if (notif) {
    viewNotificationEmail(notif.id);
  } else {
    const order = state.orders.find(o => o.invoiceNumber === orderNum);
    if (!order) return;
    const html = generateExecutiveEmailHtml(order, order.repName || `Rep ${order.repId}`);
    document.getElementById('emailPreviewContent').innerHTML = html;
    document.getElementById('emailRecipientHeader').textContent = `Dispatched to: ${state.managerSettings.managerEmails}`;
    document.getElementById('viewEmailModal').classList.remove('hidden');
    safeLucide();
  }
};

window.viewNotificationEmail = function(notifId) {
  const notif = state.notifications.find(n => n.id === notifId);
  if (!notif) return;

  const order = state.orders.find(o => o.invoiceNumber === notif.orderNumber) || {
    invoiceNumber: notif.orderNumber,
    date: notif.timestamp ? notif.timestamp.split('T')[0] : '2026-09-09',
    clientCode: notif.clientCode,
    clientName: notif.clientName,
    location: notif.location,
    territory: notif.repId,
    totalExcVat: notif.totalExcVat,
    vatAmount: (notif.totalIncVat - notif.totalExcVat),
    totalIncVat: notif.totalIncVat,
    paymentTerms: notif.paymentTerms,
    deliveryUrgency: notif.deliveryUrgency,
    items: notif.items || []
  };

  const html = generateExecutiveEmailHtml(order, notif.repName);
  document.getElementById('emailPreviewContent').innerHTML = html;
  document.getElementById('emailRecipientHeader').textContent = `Dispatched to: ${state.managerSettings.managerEmails}`;

  const btnResend = document.getElementById('btnResendEmailAction');
  if (btnResend) {
    const subject = encodeURIComponent(`[CONCEPTORS ORDER ALERT] New Field Order #${order.invoiceNumber} - ${order.clientName} (${formatCurrency(order.totalIncVat)} AED)`);
    const body = encodeURIComponent(`Senior Management Team,\n\nA new commercial sales order was submitted by ${notif.repName}.\n\nOrder Ref: #${order.invoiceNumber}\nClient: ${order.clientName} (${order.location})\nNet Total: ${formatCurrency(order.totalIncVat)} AED (Incl. 5% VAT)\n\nPlease review and authorize.`);
    btnResend.onclick = () => {
      window.open(`mailto:${state.managerSettings.managerEmails}?subject=${subject}&body=${body}`, '_blank');
    };
  }

  document.getElementById('viewEmailModal').classList.remove('hidden');
  safeLucide();
};

window.closeEmailModal = function() {
  const m = document.getElementById('viewEmailModal');
  if (m) m.classList.add('hidden');
};

function generateExecutiveEmailHtml(order, repName) {
  const items = order.items || [];
  const rowsHtml = items.map(it => `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 10px 8px; font-weight: 600; color: #f8fafc;">${escapeHtml(it.productName)}</td>
      <td style="padding: 10px 8px; text-align: right; color: #94a3b8;">${formatCurrency(it.unitPrice)} AED</td>
      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #38bdf8;">${it.salesQty}</td>
      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #fbbf24;">${it.focQty > 0 ? `+${it.focQty} FOC` : '0'}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #34d399;">${formatCurrency(it.total)} AED</td>
    </tr>
  `).join('');

  return `
    <div style="max-width: 680px; margin: 0 auto; background: #070d19; border: 1px solid #334155; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px;">Automated Executive Alert</span>
            <h2 style="margin: 8px 0 2px 0; font-size: 20px; font-weight: 800;">Conceptors Animal Health LLC</h2>
            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Catalysis Spain • BARD Czech • Vitasigna • Ringbio</p>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; padding: 6px 12px; background: #10b981; color: #ffffff; border-radius: 8px; font-weight: 800; font-size: 11px;">NEW FIELD ORDER</span>
            <div style="font-size: 13px; font-family: monospace; font-weight: bold; margin-top: 4px;">#${order.invoiceNumber}</div>
          </div>
        </div>
      </div>

      <div style="padding: 20px; background: #0f172a; border-bottom: 1px solid #1e293b;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 12px;">
          <div>
            <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Medical Representative</span>
            <strong style="color: #38bdf8; font-size: 13px;">${escapeHtml(repName)}</strong>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Veterinary Clinic / Partner</span>
            <strong style="color: #f8fafc; font-size: 13px;">${escapeHtml(order.clientName)}</strong>
            <span style="display: block; color: #94a3b8; font-size: 11px;">${order.clientCode || ''} • ${order.location || 'UAE'}</span>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Order Date</span>
            <span style="color: #cbd5e1; font-weight: 600;">${order.date}</span>
          </div>
          <div>
            <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block;">Terms & Delivery</span>
            <span style="color: #fcd34d; font-weight: 600;">${order.paymentTerms || '30 Days Credit'} • ${order.deliveryUrgency || 'Normal (48h)'}</span>
          </div>
        </div>
      </div>

      <div style="padding: 20px;">
        <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Itemized Commercial Products</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: #94a3b8; text-transform: uppercase; font-size: 10px; font-weight: 700;">
              <th style="padding: 8px; text-align: left;">Product SKU</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: center;">Sales Qty</th>
              <th style="padding: 8px; text-align: center;">Bonus FOC</th>
              <th style="padding: 8px; text-align: right;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #64748b;">No products listed</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 20px; padding: 16px; background: #0f172a; border-radius: 12px; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
            <span>Subtotal (Excl. VAT):</span>
            <span style="font-weight: 600; color: #e2e8f0;">${formatCurrency(order.totalExcVat)} AED</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
            <span>Standard UAE VAT (5%):</span>
            <span style="font-weight: 600; color: #e2e8f0;">${formatCurrency(order.vatAmount)} AED</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #ffffff; padding-top: 10px; border-top: 1px solid #334155;">
            <span>Grand Total Net (Incl. VAT):</span>
            <span style="color: #34d399; font-size: 17px;">${formatCurrency(order.totalIncVat)} AED</span>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; color: #64748b;">Conceptors CRM Automated Alert Server</span>
          ${state.currentUser && state.currentUser.role === 'manager' ? `
            <button onclick="approveOrderDirect('${order.invoiceNumber}')" style="background: #10b981; color: #ffffff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer;">
              ✓ Authorize & Approve Order
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// =========================================================================
// 14. VETERINARY ACCOUNTS CRM DIRECTORY (TAB 5)
// =========================================================================

function renderAccountsGrid() {
  const container = document.getElementById('accountsGrid');
  if (!container) return;

  const searchQ = (state.filters.accountsSearch || '').toLowerCase();
  const terrFilter = state.filters.accountsTerritory || 'ALL';
  const statusFilter = state.filters.accountsStatus || 'ACTIVE';

  // Initialize and synchronize accountsMonthFilter dropdown
  const monthFilterSelect = document.getElementById('accountsMonthFilter');
  const todayStr = state.dailyDate || getSyncedTodayDate();
  const currentMonthKey = todayStr.slice(0, 7); // 'YYYY-MM'

  if (monthFilterSelect && monthFilterSelect.options.length === 0) {
    const [curY, curM] = currentMonthKey.split('-').map(Number);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const options = [
      { value: currentMonthKey, label: `${monthNames[curM - 1]} ${curY} (Active Month)` }
    ];

    let prevM = curM - 1, prevY = curY;
    if (prevM < 1) { prevM = 12; prevY--; }
    options.push({ value: `${prevY}-${String(prevM).padStart(2, '0')}`, label: `${monthNames[prevM - 1]} ${prevY}` });

    let nextM = curM + 1, nextY = curY;
    if (nextM > 12) { nextM = 1; nextY++; }
    options.push({ value: `${nextY}-${String(nextM).padStart(2, '0')}`, label: `${monthNames[nextM - 1]} ${nextY}` });

    options.push({ value: 'ALL', label: 'All Months Combined' });

    monthFilterSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    if (!state.filters.accountsMonthFilter || state.filters.accountsMonthFilter === 'CURRENT') {
      state.filters.accountsMonthFilter = currentMonthKey;
    }
    monthFilterSelect.value = state.filters.accountsMonthFilter;
  }

  let activeMonth = state.filters.accountsMonthFilter || currentMonthKey;
  if (activeMonth === 'CURRENT') activeMonth = currentMonthKey;

  // Strictly scoped customers
  let list = getScopedCustomers();

  if (terrFilter !== 'ALL') {
    list = list.filter(c => c.territory === terrFilter || c.repId === terrFilter);
  }

  // Status filter: ACTIVE, FROZEN, ALL
  if (statusFilter === 'ACTIVE') {
    list = list.filter(c => c.isActive !== false);
  } else if (statusFilter === 'FROZEN') {
    list = list.filter(c => c.isActive === false);
  }

  if (searchQ) {
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(searchQ)) ||
      (c.code && c.code.toLowerCase().includes(searchQ)) ||
      (c.location && c.location.toLowerCase().includes(searchQ)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQ))
    );
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">
        <i data-lucide="building-2" class="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60"></i>
        <p class="text-xs font-bold text-slate-400">No veterinary accounts match your filter criteria.</p>
        <p class="text-[11px] text-slate-500 mt-1">Try switching status to "All Status" or resetting search terms.</p>
      </div>
    `;
    safeLucide();
    return;
  }

  const allVisits = state.visits || [];

  container.innerHTML = list.map(c => {
    const isFrozen = (c.isActive === false);

    // Calculate planned and visited counts for this account in the active month
    const clientVisits = allVisits.filter(v => {
      const isThisAccount = (v.clientCode === c.code || v.customerCode === c.code);
      if (!isThisAccount) return false;
      if (activeMonth && activeMonth !== 'ALL') {
        return v.date && v.date.startsWith(activeMonth);
      }
      return true;
    });

    const plannedCount = clientVisits.filter(v => v.visitCategory === 'Planned' || !v.visitCategory).length;
    const visitedCount = clientVisits.filter(v => v.status === 'Completed').length;

    let badgeClass = 'badge-draft';
    if (c.tier === 'VIP Platinum') badgeClass = 'badge-vip-platinum';
    else if (c.tier === 'VIP Gold') badgeClass = 'badge-vip-gold';

    return `
      <div class="glass-card rounded-xl p-4 border ${isFrozen ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800 hover:border-teal-500/40'} transition-all flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${c.repId}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}">${c.tier}</span>
            </div>
            ${isFrozen ? `
              <span class="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm">
                <i data-lucide="snowflake" class="w-3 h-3 text-cyan-400"></i> FROZEN
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
            `}
          </div>
          <h4 class="font-bold text-white text-sm mt-2 truncate" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h4>
          <p class="text-[11px] text-slate-400">${c.code} • ${escapeHtml(c.location || 'UAE')}</p>

          ${isFrozen ? `
            <div class="account-frozen-notice p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center justify-between my-2.5">
              <span class="flex items-center gap-1.5 font-bold"><i data-lucide="snowflake" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i> Account Inactive</span>
              <span class="text-[10px] text-cyan-400/80 font-medium">Frozen by Field Rep</span>
            </div>
          ` : `
            <!-- Monthly Activity: Planned vs Completed Visited Counters -->
            <div class="account-month-metrics p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs my-2.5">
              <div class="flex items-center gap-1.5" title="Visits planned in ${activeMonth === 'ALL' ? 'all months' : activeMonth}">
                <span class="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                <span class="text-slate-400 text-[11px] font-medium">Planned:</span>
                <span class="font-black text-sky-400 text-xs">${plannedCount}</span>
              </div>
              <div class="h-3.5 w-px bg-slate-700/80"></div>
              <div class="flex items-center gap-1.5" title="Completed visits conducted in ${activeMonth === 'ALL' ? 'all months' : activeMonth}">
                <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span class="text-slate-400 text-[11px] font-medium">Visited:</span>
                <span class="font-black text-emerald-400 text-xs">${visitedCount}</span>
              </div>
              <div class="h-3.5 w-px bg-slate-700/80"></div>
              <div class="text-[10px] font-extrabold ${visitedCount > 0 ? 'text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30' : (plannedCount > 0 ? 'text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30' : 'text-slate-500')}">
                ${visitedCount > 0 ? `${visitedCount} Visited` : (plannedCount > 0 ? `${plannedCount} Planned` : '0 Activity')}
              </div>
            </div>
          `}

          <div class="mt-2 text-[11px] text-slate-300">
            <span class="text-slate-500">Contact Doctor:</span> ${escapeHtml(c.contactPerson || 'Lead Vet')}
            ${c.phone ? `<span class="text-slate-500 ml-2">• Tel:</span> <span class="font-mono text-slate-400">${escapeHtml(c.phone)}</span>` : ''}
          </div>
        </div>

        <div class="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          ${isFrozen ? `
            <span class="text-[11px] text-slate-500 font-semibold">Reactivate to log visits</span>
            <button type="button" onclick="toggleAccountFreeze('${c.code}')" class="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm" title="Reactivate this clinic account">
              <i data-lucide="flame" class="w-3.5 h-3.5 text-orange-400"></i> Unfreeze Account
            </button>
          ` : `
            <div class="flex items-center gap-1.5">
              <button onclick="openPlanVisitModalForClient('${c.code}', '${c.repId}')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition-colors">
                Plan Visit
              </button>
              <button onclick="openUnplannedVisitModal('${c.repId}', '${c.code}')" class="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors">
                <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i> + Unplanned
              </button>
            </div>
            <button type="button" onclick="toggleAccountFreeze('${c.code}')" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors" title="Freeze this account">
              <i data-lucide="snowflake" class="w-3 h-3 text-cyan-400"></i> Freeze
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}
window.renderAccountsGrid = renderAccountsGrid;

window.handleAccountsFilter = function() {
  state.filters.accountsSearch = document.getElementById('accountsSearchInput')?.value || '';
  state.filters.accountsTerritory = document.getElementById('accountsTerritoryFilter')?.value || 'ALL';
  state.filters.accountsStatus = document.getElementById('accountsStatusFilter')?.value || 'ACTIVE';
  state.filters.accountsMonthFilter = document.getElementById('accountsMonthFilter')?.value || 'CURRENT';
  renderAccountsGrid();
  safeLucide();
};

window.openPlanVisitModalForClient = function(clientCode, repId) {
  const cust = (state.customers || []).find(c => c.code === clientCode);
  if (cust && cust.isActive === false) {
    showToast('Account Frozen', `${cust.name} is currently frozen. Please unfreeze it first to schedule visits.`, 'warning');
    return;
  }
  openPlanVisitModal();
  const repSelect = document.getElementById('planRepSelect');
  if (repSelect && (!state.currentUser || state.currentUser.role === 'manager')) {
    repSelect.value = repId;
    filterPlanClinics();
  }
  selectCustomerCombobox('plan', clientCode);
};

// =========================================================================
// 14B. ADD ACCOUNT & FREEZE CONTROLS (REP ACTION & MANAGER ALERT DISPATCH)
// =========================================================================

window.openAddAccountModal = function() {
  const modal = document.getElementById('addAccountModal');
  if (!modal) return;

  const form = document.getElementById('addAccountForm');
  if (form) form.reset();

  const terrSelect = document.getElementById('newAccountTerritory');
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : (state.currentUser.role === 'rep_t2' ? 'T2' : 'T1'))) : 'T1';

  if (terrSelect) {
    if (state.currentUser && state.currentUser.role === 'manager') {
      terrSelect.disabled = false;
      terrSelect.value = 'T1';
    } else {
      terrSelect.value = userTerritory;
      terrSelect.disabled = true;
    }
  }

  generateClinicCode();
  modal.classList.remove('hidden');
  safeLucide();
};

window.closeAddAccountModal = function() {
  const modal = document.getElementById('addAccountModal');
  if (modal) modal.classList.add('hidden');
};

window.generateClinicCode = function() {
  const terrSelect = document.getElementById('newAccountTerritory');
  const terr = terrSelect ? terrSelect.value : (state.currentUser?.territory || 'T1');
  const prefix = terr === 'T2' ? 'AC' : 'DC';

  // Find existing max numeric code with prefix
  let maxNum = 1000;
  (state.customers || []).forEach(c => {
    if (c.code && c.code.toUpperCase().startsWith(prefix)) {
      const num = parseInt(c.code.slice(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  const nextCode = `${prefix}${String(maxNum + 10).padStart(4, '0')}`;
  const codeInput = document.getElementById('newAccountCode');
  if (codeInput) codeInput.value = nextCode;
};

window.handleAddAccountSubmit = async function(e) {
  e.preventDefault();

  const codeInput = document.getElementById('newAccountCode');
  const nameInput = document.getElementById('newAccountName');
  const tierSelect = document.getElementById('newAccountTier');
  const terrSelect = document.getElementById('newAccountTerritory');
  const locSelect = document.getElementById('newAccountLocation');
  const docInput = document.getElementById('newAccountDoctor');
  const phoneInput = document.getElementById('newAccountPhone');
  const addrInput = document.getElementById('newAccountAddress');
  const notesInput = document.getElementById('newAccountNotes');

  const code = (codeInput?.value || '').trim().toUpperCase();
  const name = (nameInput?.value || '').trim();
  const tier = tierSelect?.value || 'Silver';
  const assignedTerritory = terrSelect?.value || (state.currentUser?.territory || 'T1');
  const location = locSelect?.value || 'Dubai';
  const contactPerson = (docInput?.value || '').trim();
  const phone = (phoneInput?.value || '').trim();
  const address = (addrInput?.value || '').trim();
  const notes = (notesInput?.value || '').trim();

  if (!code || !name) {
    showToast('Missing Details', 'Please specify account code and clinic name.', 'warning');
    return;
  }

  // Check code uniqueness
  const existing = (state.customers || []).find(c => c.code.toUpperCase() === code);
  if (existing) {
    showToast('Duplicate Code', `Account code "${code}" already belongs to ${existing.name}. Please choose or auto-generate another code.`, 'warning');
    return;
  }

  const newCust = {
    code,
    name,
    location,
    territory: assignedTerritory,
    repId: assignedTerritory,
    tier,
    contactPerson: contactPerson || 'Lead Vet',
    phone: phone || '',
    address: address || '',
    notes: notes || '',
    isActive: true
  };

  // Add to local state
  state.customers.unshift(newCust);
  persistData();

  // Cloud write-through to Supabase
  supabaseRest('customers', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapCustomerToDb(newCust)
  });

  // Create real-time Senior Manager Alert
  const repName = state.currentUser ? (state.currentUser.name || (assignedTerritory === 'T1' ? 'Dr. Shaimaa (Rep T1)' : 'Dr. Marsel (Rep T2)')) : `Rep ${assignedTerritory}`;
  const notif = {
    id: `NOTIF-ACC-${Date.now()}`,
    type: 'ACCOUNT_ADDED',
    title: `New Account Added: ${newCust.name}`,
    orderNumber: newCust.code,
    repId: assignedTerritory,
    repName: repName,
    clientCode: newCust.code,
    clientName: newCust.name,
    location: newCust.location,
    timestamp: new Date().toISOString(),
    read: false,
    approvalStatus: 'Active',
    itemsSummary: `New ${newCust.tier} account added by ${repName} in ${newCust.location}. Dr/Contact: ${newCust.contactPerson}. Phone: ${newCust.phone || 'N/A'}.`
  };

  state.notifications.unshift(notif);
  persistData();

  // Cloud write-through notification to Supabase
  supabaseRest('notifications', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapNotifToDb(notif)
  });

  if (state.managerSettings.soundAlert) playNotificationChime();
  showToast(
    '🎉 Clinic Account Added',
    `Registered ${newCust.name} (${newCust.code}) in ${assignedTerritory}. Senior Manager Dr. Sameh Ageez alerted.`,
    'success'
  );

  closeAddAccountModal();
  updateNotificationBell();
  renderAccountsGrid();
  renderManagerNotifications();
  renderManagerHub();
};

window.toggleAccountFreeze = async function(clientCode) {
  const cust = (state.customers || []).find(c => c.code === clientCode);
  if (!cust) return;

  const willBeFrozen = (cust.isActive !== false);
  cust.isActive = !willBeFrozen;
  persistData();

  // Cloud sync to Supabase customers table
  supabaseRest(`customers?code=eq.${encodeURIComponent(clientCode)}`, {
    method: 'PATCH',
    body: { is_active: cust.isActive }
  });

  const repName = state.currentUser ? (state.currentUser.name || (cust.repId === 'T1' ? 'Dr. Shaimaa (Rep T1)' : 'Dr. Marsel (Rep T2)')) : `Rep ${cust.repId || 'T1'}`;
  const repId = cust.repId || cust.territory || 'T1';

  // Create real-time Senior Manager Alert
  const notif = {
    id: `NOTIF-FRZ-${Date.now()}`,
    type: willBeFrozen ? 'ACCOUNT_FROZEN' : 'ACCOUNT_UNFROZEN',
    title: willBeFrozen ? `Account Frozen: ${cust.name}` : `Account Reactivated: ${cust.name}`,
    orderNumber: cust.code,
    repId: repId,
    repName: repName,
    clientCode: cust.code,
    clientName: cust.name,
    location: cust.location,
    timestamp: new Date().toISOString(),
    read: false,
    approvalStatus: willBeFrozen ? 'Frozen' : 'Active',
    itemsSummary: willBeFrozen
      ? `Rep ${repName} froze account "${cust.name}" (${cust.code}) in ${cust.location}. Account is marked inactive.`
      : `Rep ${repName} reactivated account "${cust.name}" (${cust.code}) in ${cust.location}. Account is active for visits and orders.`
  };

  state.notifications.unshift(notif);
  persistData();

  // Cloud sync to Supabase notifications table
  supabaseRest('notifications', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapNotifToDb(notif)
  });

  if (state.managerSettings.soundAlert) playNotificationChime();
  showToast(
    willBeFrozen ? '❄️ Account Frozen' : '🔥 Account Reactivated',
    `${cust.name} (${cust.code}) is now ${willBeFrozen ? 'frozen (inactive)' : 'reactivated'}. Senior Manager alerted.`,
    willBeFrozen ? 'warning' : 'success'
  );

  updateNotificationBell();
  renderAccountsGrid();
  renderManagerNotifications();
  renderManagerHub();
};

window.goToAccountInCRM = function(clientCode) {
  closeNotificationsModal();
  switchTab('accounts');
  const searchInput = document.getElementById('accountsSearchInput');
  if (searchInput) {
    searchInput.value = clientCode;
  }
  const statusSelect = document.getElementById('accountsStatusFilter');
  if (statusSelect) {
    statusSelect.value = 'ALL';
  }
  handleAccountsFilter();
};

window.markNotificationReadDirect = function(notifId) {
  const notif = state.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    persistData();
    supabaseRest(`notifications?id=eq.${encodeURIComponent(notifId)}`, {
      method: 'PATCH',
      body: { read: true }
    });
    updateNotificationBell();
    renderManagerNotifications();
    renderManagerHub();
  }
};

// =========================================================================
// 15. FIELD ANALYTICS & EXECUTIVE BENCHMARKING ENGINE
// =========================================================================

function calculateRepMetrics(repKey = 'ALL', timeframe = 'MTD') {
  const accounts = (state.customers || []).filter(c => {
    if (repKey === 'ALL') return true;
    return c.repId === repKey || c.territory === repKey || c.territoryId === repKey;
  });

  const allVisits = (state.visits || []).filter(v => {
    if (v.status !== 'Completed') return false;
    if (repKey !== 'ALL' && v.repId !== repKey && v.territory !== repKey) return false;
    if (timeframe === 'MTD') {
      return v.date && v.date.startsWith('2026-09');
    }
    return true;
  });

  const totalAccounts = accounts.length;
  const completedVisits = allVisits;
  const visitedCodes = new Set(completedVisits.map(v => v.customerCode || v.clientCode));
  const uniqueVisitedCount = visitedCodes.size;
  const coveragePct = totalAccounts > 0 ? ((uniqueVisitedCount / totalAccounts) * 100) : 0;
  const callFrequency = uniqueVisitedCount > 0 ? (completedVisits.length / uniqueVisitedCount) : 0;

  // Planned Adherence
  const plannedScheduled = (state.plannedVisits || []).filter(pv => {
    if (repKey !== 'ALL' && pv.repId !== repKey && pv.territory !== repKey) return false;
    if (timeframe === 'MTD') return pv.date && pv.date.startsWith('2026-09');
    return true;
  });
  const completedPlanned = completedVisits.filter(v => v.isPlanned);
  const totalPlannedCount = Math.max(plannedScheduled.length, completedPlanned.length);
  const adherencePct = totalPlannedCount > 0 ? ((completedPlanned.length / totalPlannedCount) * 100) : 0;

  // Unplanned calls
  const unplannedVisits = completedVisits.filter(v => !v.isPlanned);
  const unplannedRatio = completedVisits.length > 0 ? ((unplannedVisits.length / completedVisits.length) * 100) : 0;

  // Commercial revenue & orders
  const orders = (state.orders || []).filter(o => {
    if (repKey !== 'ALL' && o.repId !== repKey && o.territory !== repKey) return false;
    if (timeframe === 'MTD') return o.date && o.date.startsWith('2026-09');
    return true;
  });
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.grandTotal || o.totalIncVat) || 0), 0);
  const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length) : 0;

  const orderVisits = completedVisits.filter(v => v.orderPlaced || (v.orderData && (v.orderData.grandTotal > 0 || v.orderData.totalIncVat > 0)));
  const orderStrikeRate = completedVisits.length > 0 ? ((orderVisits.length / completedVisits.length) * 100) : 0;

  const samplingVisits = completedVisits.filter(v => v.samplesGiven || (Array.isArray(v.samplesList) && v.samplesList.length > 0) || v.sampleProduct);
  const samplingStrikeRate = completedVisits.length > 0 ? ((samplingVisits.length / completedVisits.length) * 100) : 0;

  // Tier Breakdown (VIP Platinum, VIP Gold, Silver)
  const tiers = ['VIP Platinum', 'VIP Gold', 'Silver'];
  const tierStats = tiers.map(tier => {
    const tierAccounts = accounts.filter(c => (c.tier || '').toLowerCase() === tier.toLowerCase());
    const reachedCount = tierAccounts.filter(c => visitedCodes.has(c.code)).length;
    const tierCoverage = tierAccounts.length > 0 ? ((reachedCount / tierAccounts.length) * 100) : 0;
    const tierCalls = completedVisits.filter(v => {
      const code = v.customerCode || v.clientCode;
      const cust = accounts.find(c => c.code === code);
      return cust && (cust.tier || '').toLowerCase() === tier.toLowerCase();
    }).length;
    return {
      tier,
      total: tierAccounts.length,
      reached: reachedCount,
      coveragePct: tierCoverage,
      calls: tierCalls,
      freq: reachedCount > 0 ? (tierCalls / reachedCount) : 0
    };
  });

  // Call Frequency Cohorts
  const callCountMap = {};
  accounts.forEach(c => { callCountMap[c.code] = 0; });
  completedVisits.forEach(v => {
    const code = v.customerCode || v.clientCode;
    if (callCountMap[code] !== undefined) {
      callCountMap[code]++;
    }
  });

  let cohort0 = 0, cohort1 = 0, cohort2 = 0, cohort3plus = 0;
  accounts.forEach(c => {
    const cnt = callCountMap[c.code] || 0;
    if (cnt === 0) cohort0++;
    else if (cnt === 1) cohort1++;
    else if (cnt === 2) cohort2++;
    else cohort3plus++;
  });

  // Product Detailing Penetration
  const productCounts = {};
  (state.products || []).forEach(p => { productCounts[p.name] = 0; });
  completedVisits.forEach(v => {
    const details = v.detailedProducts || v.productsDiscussed || [];
    details.forEach(pName => {
      productCounts[pName] = (productCounts[pName] || 0) + 1;
    });
  });

  const productStats = Object.keys(productCounts).map(name => {
    const count = productCounts[name];
    const pct = completedVisits.length > 0 ? ((count / completedVisits.length) * 100) : 0;
    return { name, count, pct };
  }).sort((a, b) => b.count - a.count);

  return {
    repKey,
    timeframe,
    totalAccounts,
    uniqueVisitedCount,
    coveragePct,
    completedVisitsCount: completedVisits.length,
    callFrequency,
    plannedScheduledCount: totalPlannedCount,
    completedPlannedCount: completedPlanned.length,
    adherencePct,
    unplannedVisitsCount: unplannedVisits.length,
    unplannedRatio,
    ordersCount: orders.length,
    totalRevenue,
    avgOrderValue,
    orderVisitsCount: orderVisits.length,
    orderStrikeRate,
    samplingVisitsCount: samplingVisits.length,
    samplingStrikeRate,
    tierStats,
    frequencyCohorts: { cohort0, cohort1, cohort2, cohort3plus },
    productStats,
    accounts,
    completedVisits,
    callCountMap
  };
}

function renderAnalyticsDashboard() {
  if (!state.currentUser) return;
  const user = state.currentUser;
  const isManager = user.role === 'manager';
  const userTerritory = user.territory || (user.role === 'rep_t1' ? 'T1' : (user.role === 'rep_t2' ? 'T2' : 'ALL'));

  // Role Scoping Enforcement:
  // Medical Reps are locked to their own territory; Senior Manager Dr. Sameh Ageez can view ALL, T1, or T2.
  if (!isManager) {
    state.filters.analyticsRepFilter = userTerritory;
  }

  const activeRep = isManager ? (state.filters.analyticsRepFilter || 'ALL') : userTerritory;
  const activeTimeframe = state.filters.analyticsTimeframe || 'MTD';

  // Rep Selector Container Visibility & Button Styling
  const repSelectorContainer = document.getElementById('analyticsRepSelectorContainer');
  if (repSelectorContainer) {
    if (isManager) {
      repSelectorContainer.classList.remove('hidden');
      ['ALL', 'T1', 'T2'].forEach(key => {
        const btn = document.getElementById(`analyticsRepBtn-${key}`);
        if (btn) {
          if (activeRep === key) {
            btn.className = 'px-2.5 py-1.5 rounded-lg font-bold bg-brand-600 text-white shadow-sm transition-all text-xs';
          } else {
            btn.className = 'px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all text-xs';
          }
        }
      });
    } else {
      repSelectorContainer.classList.add('hidden');
    }
  }

  // Header Title & Rep Pill
  const headingEl = document.getElementById('analyticsHeading');
  const repPillEl = document.getElementById('analyticsRepPill');
  const subtitleEl = document.getElementById('analyticsSubtitle');

  if (headingEl && repPillEl) {
    if (isManager) {
      if (activeRep === 'ALL') {
        headingEl.textContent = 'National Territory Performance & Field Benchmarking';
        repPillEl.textContent = 'National Overview (Shaimaa & Marsel)';
        repPillEl.className = 'px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold';
        if (subtitleEl) subtitleEl.textContent = 'Consolidated territory coverage, call frequency, plan compliance, and commercial yield for Dr. Sameh Ageez';
      } else if (activeRep === 'T1') {
        headingEl.textContent = 'Territory 1 Analytics — Shaimaa';
        repPillEl.textContent = 'Shaimaa • Territory 1 (Dubai / Abu Dhabi / Al Ain)';
        repPillEl.className = 'px-2.5 py-0.5 rounded-full badge-t1 text-[10px] font-bold';
        if (subtitleEl) subtitleEl.textContent = 'Detailed territory audit for Shaimaa (Dubai, Abu Dhabi, Al Ain)';
      } else {
        headingEl.textContent = 'Territory 2 Analytics — Marsel';
        repPillEl.textContent = 'Marsel • Territory 2 (Northern Emirates)';
        repPillEl.className = 'px-2.5 py-0.5 rounded-full badge-t2 text-[10px] font-bold';
        if (subtitleEl) subtitleEl.textContent = 'Detailed territory audit for Marsel (Sharjah, Ajman, RAK, Fujairah, UAQ)';
      }
    } else {
      const repName = user.name || (userTerritory === 'T1' ? 'Shaimaa' : 'Marsel');
      headingEl.textContent = `${escapeHtml(repName)}'s Field Performance & Territory Analytics`;
      repPillEl.textContent = userTerritory === 'T1' ? 'Shaimaa • Territory 1 (Dubai / AUH / Al Ain)' : 'Marsel • Territory 2 (Northern Emirates)';
      repPillEl.className = `px-2.5 py-0.5 rounded-full ${userTerritory === 'T1' ? 'badge-t1' : 'badge-t2'} text-[10px] font-bold`;
      if (subtitleEl) subtitleEl.textContent = 'Real-time personal call frequency, account coverage, plan adherence, and order strike metrics';
    }
  }

  // Calculate Primary Metrics
  const metrics = calculateRepMetrics(activeRep, activeTimeframe);

  // 1. Metric Scorecard: Coverage %
  const covPctEl = document.getElementById('kpiAnalyticsCoveragePct');
  const covRatioEl = document.getElementById('kpiAnalyticsCoverageRatio');
  const covBarEl = document.getElementById('kpiAnalyticsCoverageBar');
  if (covPctEl) covPctEl.textContent = `${metrics.coveragePct.toFixed(1)}%`;
  if (covRatioEl) covRatioEl.textContent = `${metrics.uniqueVisitedCount} of ${metrics.totalAccounts} Accounts Covered`;
  if (covBarEl) covBarEl.style.width = `${Math.min(100, metrics.coveragePct)}%`;

  // 2. Metric Scorecard: Call Frequency
  const freqEl = document.getElementById('kpiAnalyticsFrequency');
  const freqSubEl = document.getElementById('kpiAnalyticsFrequencySubtext');
  if (freqEl) freqEl.textContent = `${metrics.callFrequency.toFixed(2)}x`;
  if (freqSubEl) freqSubEl.textContent = `${metrics.completedVisitsCount} Calls across ${metrics.uniqueVisitedCount} Accounts`;

  // 3. Metric Scorecard: Plan Adherence
  const adhEl = document.getElementById('kpiAnalyticsAdherence');
  const adhSubEl = document.getElementById('kpiAnalyticsAdherenceSubtext');
  const adhBarEl = document.getElementById('kpiAnalyticsAdherenceBar');
  if (adhEl) adhEl.textContent = `${metrics.adherencePct.toFixed(1)}%`;
  if (adhSubEl) adhSubEl.textContent = `${metrics.completedPlannedCount} of ${metrics.plannedScheduledCount} Planned Calls Done`;
  if (adhBarEl) adhBarEl.style.width = `${Math.min(100, metrics.adherencePct)}%`;

  // 4. Metric Scorecard: Unplanned Ratio
  const unpEl = document.getElementById('kpiAnalyticsUnplannedRatio');
  const unpSubEl = document.getElementById('kpiAnalyticsUnplannedSubtext');
  if (unpEl) unpEl.textContent = `${metrics.unplannedRatio.toFixed(1)}%`;
  if (unpSubEl) unpSubEl.textContent = `${metrics.unplannedVisitsCount} Spontaneous / Ad-hoc Calls`;

  // Manager Comparative Benchmarking Section
  const benchmarkContainer = document.getElementById('analyticsManagerBenchmarkSection');
  if (benchmarkContainer) {
    if (isManager) {
      benchmarkContainer.classList.remove('hidden');
      const m1 = calculateRepMetrics('T1', activeTimeframe);
      const m2 = calculateRepMetrics('T2', activeTimeframe);

      const t1CovClass = m1.coveragePct >= m2.coveragePct ? 'text-emerald-400 font-bold' : 'text-slate-300';
      const t2CovClass = m2.coveragePct >= m1.coveragePct ? 'text-emerald-400 font-bold' : 'text-slate-300';

      const t1FreqClass = m1.callFrequency >= m2.callFrequency ? 'text-purple-400 font-bold' : 'text-slate-300';
      const t2FreqClass = m2.callFrequency >= m1.callFrequency ? 'text-purple-400 font-bold' : 'text-slate-300';

      const t1RevClass = m1.totalRevenue >= m2.totalRevenue ? 'text-emerald-400 font-bold' : 'text-slate-300';
      const t2RevClass = m2.totalRevenue >= m1.totalRevenue ? 'text-emerald-400 font-bold' : 'text-slate-300';

      benchmarkContainer.innerHTML = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <i data-lucide="scale" class="w-4 h-4 text-indigo-400"></i>
            <h3 class="font-extrabold text-white text-sm">Medical Representatives Comparative Benchmarking</h3>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Senior Manager Executive View
            </span>
          </div>
          <span class="text-xs text-slate-400">Head-to-head field efficiency & commercial impact</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th class="py-2.5 px-3">Performance Metric</th>
                <th class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded badge-t1 font-bold">Shaimaa (T1)</span>
                </th>
                <th class="py-2.5 px-3 text-center">
                  <span class="px-2 py-0.5 rounded badge-t2 font-bold">Marsel (T2)</span>
                </th>
                <th class="py-2.5 px-3 text-center text-indigo-300 font-bold">National Benchmark</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-400"></i> Customer Universe
                </td>
                <td class="py-2.5 px-3 text-center font-bold text-white">${m1.totalAccounts} accounts</td>
                <td class="py-2.5 px-3 text-center font-bold text-white">${m2.totalAccounts} accounts</td>
                <td class="py-2.5 px-3 text-center text-slate-400">${m1.totalAccounts + m2.totalAccounts} accounts total</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="crosshair" class="w-3.5 h-3.5 text-sky-400"></i> Customer Coverage Rate
                </td>
                <td class="py-2.5 px-3 text-center ${t1CovClass}">
                  ${m1.coveragePct.toFixed(1)}% <span class="text-[10px] text-slate-400 block">(${m1.uniqueVisitedCount}/${m1.totalAccounts})</span>
                </td>
                <td class="py-2.5 px-3 text-center ${t2CovClass}">
                  ${m2.coveragePct.toFixed(1)}% <span class="text-[10px] text-slate-400 block">(${m2.uniqueVisitedCount}/${m2.totalAccounts})</span>
                </td>
                <td class="py-2.5 px-3 text-center text-sky-300 font-bold">
                  ${((m1.uniqueVisitedCount + m2.uniqueVisitedCount) / (m1.totalAccounts + m2.totalAccounts) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="repeat" class="w-3.5 h-3.5 text-purple-400"></i> Call Frequency
                </td>
                <td class="py-2.5 px-3 text-center ${t1FreqClass}">${m1.callFrequency.toFixed(2)}x / month</td>
                <td class="py-2.5 px-3 text-center ${t2FreqClass}">${m2.callFrequency.toFixed(2)}x / month</td>
                <td class="py-2.5 px-3 text-center text-purple-300 font-bold">
                  ${((m1.completedVisitsCount + m2.completedVisitsCount) / Math.max(1, (m1.uniqueVisitedCount + m2.uniqueVisitedCount))).toFixed(2)}x
                </td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i> Plan Adherence Rate
                </td>
                <td class="py-2.5 px-3 text-center font-bold text-white">${m1.adherencePct.toFixed(1)}%</td>
                <td class="py-2.5 px-3 text-center font-bold text-white">${m2.adherencePct.toFixed(1)}%</td>
                <td class="py-2.5 px-3 text-center text-slate-400">Target: &ge; 85%</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i> Unplanned Call Ratio
                </td>
                <td class="py-2.5 px-3 text-center text-amber-300 font-bold">${m1.unplannedRatio.toFixed(1)}% (${m1.unplannedVisitsCount} calls)</td>
                <td class="py-2.5 px-3 text-center text-amber-300 font-bold">${m2.unplannedRatio.toFixed(1)}% (${m2.unplannedVisitsCount} calls)</td>
                <td class="py-2.5 px-3 text-center text-slate-400">Target: &le; 25%</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="package-check" class="w-3.5 h-3.5 text-cyan-400"></i> Sampling Strike Rate
                </td>
                <td class="py-2.5 px-3 text-center font-bold text-white">${m1.samplingStrikeRate.toFixed(1)}%</td>
                <td class="py-2.5 px-3 text-center font-bold text-white">${m2.samplingStrikeRate.toFixed(1)}%</td>
                <td class="py-2.5 px-3 text-center text-cyan-300 font-bold">
                  ${((m1.samplingVisitsCount + m2.samplingVisitsCount) / Math.max(1, (m1.completedVisitsCount + m2.completedVisitsCount)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="shopping-cart" class="w-3.5 h-3.5 text-emerald-400"></i> Order Strike Rate
                </td>
                <td class="py-2.5 px-3 text-center font-bold text-emerald-300">${m1.orderStrikeRate.toFixed(1)}%</td>
                <td class="py-2.5 px-3 text-center font-bold text-emerald-300">${m2.orderStrikeRate.toFixed(1)}%</td>
                <td class="py-2.5 px-3 text-center text-emerald-400 font-bold">
                  ${((m1.orderVisitsCount + m2.orderVisitsCount) / Math.max(1, (m1.completedVisitsCount + m2.completedVisitsCount)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-white font-semibold flex items-center gap-2">
                  <i data-lucide="dollar-sign" class="w-3.5 h-3.5 text-emerald-400"></i> Gross Booked Revenue
                </td>
                <td class="py-2.5 px-3 text-center ${t1RevClass}">${formatCurrency(m1.totalRevenue)} AED</td>
                <td class="py-2.5 px-3 text-center ${t2RevClass}">${formatCurrency(m2.totalRevenue)} AED</td>
                <td class="py-2.5 px-3 text-center text-emerald-400 font-extrabold">${formatCurrency(m1.totalRevenue + m2.totalRevenue)} AED</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      benchmarkContainer.classList.add('hidden');
    }
  }

  // Tier Progress Breakdown Container
  const tierContainer = document.getElementById('analyticsTierBreakdownContainer');
  if (tierContainer) {
    const tierColors = {
      'VIP Platinum': { bar: 'bg-amber-400', badge: 'bg-amber-400/20 text-amber-300 border-amber-400/30' },
      'VIP Gold': { bar: 'bg-yellow-400', badge: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
      'Silver': { bar: 'bg-slate-400', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
    };

    tierContainer.innerHTML = metrics.tierStats.map(ts => {
      const col = tierColors[ts.tier] || { bar: 'bg-sky-400', badge: 'bg-sky-400/20 text-sky-300 border-sky-400/30' };
      return `
        <div>
          <div class="flex items-center justify-between text-xs mb-1 font-semibold">
            <span class="flex items-center gap-1.5 text-white">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${col.badge}">${ts.tier}</span>
              <span class="text-slate-400">(${ts.reached}/${ts.total} accounts)</span>
            </span>
            <span class="text-slate-200">${ts.coveragePct.toFixed(1)}% <span class="text-slate-400 text-[10px]">(${ts.calls} calls • ${ts.freq.toFixed(1)}x)</span></span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div class="${col.bar} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(100, ts.coveragePct)}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Frequency Cohorts Container
  const cohortsContainer = document.getElementById('analyticsFrequencyCohortsContainer');
  if (cohortsContainer) {
    const c = metrics.frequencyCohorts;
    cohortsContainer.innerHTML = `
      <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
        <div class="text-[10px] uppercase font-bold text-rose-400">0 Calls</div>
        <div class="text-lg font-black text-rose-400 mt-0.5">${c.cohort0}</div>
        <div class="text-[9px] text-slate-400">Unreached</div>
      </div>
      <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
        <div class="text-[10px] uppercase font-bold text-sky-400">1 Call</div>
        <div class="text-lg font-black text-sky-400 mt-0.5">${c.cohort1}</div>
        <div class="text-[9px] text-slate-400">Engaged</div>
      </div>
      <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
        <div class="text-[10px] uppercase font-bold text-purple-400">2 Calls</div>
        <div class="text-lg font-black text-purple-400 mt-0.5">${c.cohort2}</div>
        <div class="text-[9px] text-slate-400">Reinforced</div>
      </div>
      <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
        <div class="text-[10px] uppercase font-bold text-emerald-400">3+ Calls</div>
        <div class="text-lg font-black text-emerald-400 mt-0.5">${c.cohort3plus}</div>
        <div class="text-[9px] text-slate-400">Key Partners</div>
      </div>
    `;
  }

  // Conversion Metrics Grid Container
  const convContainer = document.getElementById('analyticsConversionMetricsContainer');
  if (convContainer) {
    convContainer.innerHTML = `
      <div class="glass-card p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
        <span class="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">Sampling Strike Rate</span>
        <div class="text-xl font-black text-cyan-400 mt-0.5">${metrics.samplingStrikeRate.toFixed(1)}%</div>
        <span class="text-[10px] text-slate-400">${metrics.samplingVisitsCount} sample drops logged</span>
      </div>
      <div class="glass-card p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
        <span class="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Order Strike Rate</span>
        <div class="text-xl font-black text-emerald-400 mt-0.5">${metrics.orderStrikeRate.toFixed(1)}%</div>
        <span class="text-[10px] text-slate-400">${metrics.orderVisitsCount} visits converted to orders</span>
      </div>
      <div class="glass-card p-3 rounded-xl border border-indigo-500/20 bg-indigo-950/10">
        <span class="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Total Booked Orders</span>
        <div class="text-xl font-black text-indigo-400 mt-0.5">${formatCurrency(metrics.totalRevenue)} <span class="text-xs font-normal">AED</span></div>
        <span class="text-[10px] text-slate-400">${metrics.ordersCount} purchase orders</span>
      </div>
      <div class="glass-card p-3 rounded-xl border border-teal-500/20 bg-teal-950/10">
        <span class="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">Avg Order Value</span>
        <div class="text-xl font-black text-teal-400 mt-0.5">${formatCurrency(metrics.avgOrderValue)} <span class="text-xs font-normal">AED</span></div>
        <span class="text-[10px] text-slate-400">Commercial yield / transaction</span>
      </div>
    `;
  }

  // Portfolio Detailing Mix Container
  const prodContainer = document.getElementById('analyticsProductDetailingContainer');
  if (prodContainer) {
    prodContainer.innerHTML = metrics.productStats.map(ps => {
      return `
        <div>
          <div class="flex items-center justify-between text-xs mb-1 font-semibold">
            <span class="text-white">${escapeHtml(ps.name)}</span>
            <span class="text-slate-300">${ps.pct.toFixed(1)}% <span class="text-slate-400 text-[10px]">(${ps.count} visits)</span></span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${Math.min(100, ps.pct)}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Account Roster
  renderAnalyticsRosterOnly();

  // Refresh Lucide Icons safely
  safeLucide();
}

function renderAnalyticsRosterOnly() {
  const tbody = document.getElementById('analyticsRosterTableBody');
  if (!tbody) return;

  const isManager = state.currentUser && state.currentUser.role === 'manager';
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : (state.currentUser.role === 'rep_t2' ? 'T2' : 'ALL'))) : 'ALL';
  const activeRep = isManager ? (state.filters.analyticsRepFilter || 'ALL') : userTerritory;
  const timeframe = state.filters.analyticsTimeframe || 'MTD';
  const q = (state.filters.analyticsRosterSearch || '').toLowerCase().trim();
  const filterType = state.filters.analyticsRosterFilter || 'ALL';

  // Accounts list based on rep filter
  const accounts = (state.customers || []).filter(c => {
    if (activeRep === 'ALL') return true;
    return c.repId === activeRep || c.territory === activeRep || c.territoryId === activeRep;
  });

  // Calculate visits and orders per account
  const visits = (state.visits || []).filter(v => {
    if (v.status !== 'Completed') return false;
    if (timeframe === 'MTD') return v.date && v.date.startsWith('2026-09');
    return true;
  });

  const orders = (state.orders || []).filter(o => {
    if (timeframe === 'MTD') return o.date && o.date.startsWith('2026-09');
    return true;
  });

  // Filter accounts by search & roster filter
  const filteredAccounts = accounts.filter(acc => {
    // Search filter
    if (q) {
      const matchName = (acc.name || '').toLowerCase().includes(q);
      const matchCode = (acc.code || '').toLowerCase().includes(q);
      const matchLoc = (acc.location || acc.city || '').toLowerCase().includes(q);
      const matchDoc = (acc.contactPerson || acc.doctor || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchLoc && !matchDoc) return false;
    }

    // Call count
    const accVisits = visits.filter(v => (v.customerCode === acc.code || v.clientCode === acc.code));
    const callCount = accVisits.length;

    if (filterType === 'COVERED' && callCount === 0) return false;
    if (filterType === 'UNREACHED' && callCount > 0) return false;
    if (filterType === 'VIP' && !(acc.tier || '').toLowerCase().includes('vip')) return false;

    return true;
  });

  if (filteredAccounts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-8 text-center text-slate-500 font-semibold">
          No veterinary accounts match your search and filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredAccounts.map(acc => {
    const accVisits = visits.filter(v => (v.customerCode === acc.code || v.clientCode === acc.code));
    const callCount = accVisits.length;
    const isCovered = callCount > 0;

    // Last visit info
    const sortedVisits = [...accVisits].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastVisit = sortedVisits[0];

    // Total orders booked for this account
    const accOrders = orders.filter(o => (o.customerCode === acc.code || o.clientCode === acc.code));
    const totalOrderVal = accOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.totalIncVat) || 0), 0);

    const tierBadgeClass = acc.tier === 'VIP Platinum' ? 'badge-vip-platinum' : (acc.tier === 'VIP Gold' ? 'badge-vip-gold' : 'badge-draft');
    const accTerritory = acc.repId || acc.territory || 'T1';
    const repBadgeClass = accTerritory === 'T1' ? 'badge-t1' : 'badge-t2';

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-2.5 px-3">
          <div class="font-bold text-white">${escapeHtml(acc.name)}</div>
          <div class="text-[11px] text-slate-400">${escapeHtml(acc.contactPerson || acc.doctor || 'Lead Vet')} • <span class="font-mono text-slate-500">${acc.code}</span></div>
        </td>
        <td class="py-2.5 px-3">
          <div class="text-slate-300 font-medium">${escapeHtml(acc.location || acc.city || 'UAE')}</div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${repBadgeClass}">
            ${accTerritory} (${accTerritory === 'T1' ? 'Shaimaa' : 'Marsel'})
          </span>
        </td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${tierBadgeClass}">
            ${acc.tier || 'Silver'}
          </span>
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="px-2.5 py-1 rounded-full text-xs font-black ${isCovered ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
            ${callCount} call${callCount === 1 ? '' : 's'}
          </span>
        </td>
        <td class="py-2.5 px-3">
          ${isCovered
            ? '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Covered</span>'
            : '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400"><i data-lucide="circle-dashed" class="w-3.5 h-3.5"></i> Unreached</span>'
          }
        </td>
        <td class="py-2.5 px-3 text-slate-300 text-[11px]">
          ${lastVisit
            ? `<div>${lastVisit.date}</div><div class="text-[10px] text-slate-400 font-semibold">${lastVisit.isPlanned ? '📅 Planned' : '⚡ Unplanned'}</div>`
            : '<span class="text-slate-500 font-italic">No visits yet</span>'
          }
        </td>
        <td class="py-2.5 px-3 text-right font-bold ${totalOrderVal > 0 ? 'text-emerald-400' : 'text-slate-500'}">
          ${totalOrderVal > 0 ? `${formatCurrency(totalOrderVal)} AED` : '—'}
        </td>
        <td class="py-2.5 px-3 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openUnplannedVisitModal('${accTerritory}', '${acc.code}')" class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-all" title="Log spontaneous ad-hoc visit">
              + Log Visit
            </button>
            <button onclick="openPlanVisitModalForClient('${acc.code}', '${accTerritory}')" class="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold transition-all" title="Schedule in monthly plan">
              Plan
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  safeLucide();
}

window.setAnalyticsRepFilter = function(filter) {
  state.filters.analyticsRepFilter = filter;
  renderAnalyticsDashboard();
};

window.handleAnalyticsTimeframeChange = function(tf) {
  state.filters.analyticsTimeframe = tf;
  renderAnalyticsDashboard();
};

window.handleAnalyticsRosterSearch = function(query) {
  state.filters.analyticsRosterSearch = query;
  renderAnalyticsRosterOnly();
};

window.handleAnalyticsRosterFilter = function(filter) {
  state.filters.analyticsRosterFilter = filter;
  renderAnalyticsRosterOnly();
};

// =========================================================================
// 16. SENIOR MANAGER HUB (TAB 6)
// =========================================================================

function renderManagerHub() {
  if (!state.currentUser || state.currentUser.role !== 'manager') return;

  const plansContainer = document.getElementById('managerPlansList');
  if (plansContainer) {
    const plans = state.monthlyPlans || [];
    plansContainer.innerHTML = plans.map(p => {
      const isApproved = p.status === 'Approved';

      return `
        <div class="glass-card rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-xs">${escapeHtml(p.repName)}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${p.repId}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                ${p.status}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Month: ${p.month} ${p.year} • Quota: ${p.targetVisits || 100} Calls</p>
          </div>

          <div>
            ${!isApproved ? `
              <button onclick="approveMonthlyPlan('${p.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center gap-1">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Approve
              </button>
            ` : '<span class="text-xs text-emerald-400 font-bold">✓ Approved</span>'}
          </div>
        </div>
      `;
    }).join('');
  }

  const ordersContainer = document.getElementById('managerOrdersList');
  if (ordersContainer) {
    const pendingOrders = state.orders.filter(o => o.approvalStatus === 'Pending');
    if (pendingOrders.length === 0) {
      ordersContainer.innerHTML = '<div class="py-8 text-center text-slate-500 text-xs">All field sales orders are authorized & up to date!</div>';
    } else {
      ordersContainer.innerHTML = pendingOrders.map(o => {
        return `
          <div class="glass-card rounded-xl p-3.5 border border-amber-500/30 bg-amber-950/10 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-sky-400 text-xs">#${o.invoiceNumber}</span>
                <span class="text-xs font-bold text-white">${escapeHtml(o.clientName)}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Rep: ${escapeHtml(o.repName)} • Net: <strong class="text-emerald-400">${formatCurrency(o.totalIncVat)} AED</strong></p>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="viewNotificationEmailByOrder('${o.invoiceNumber}')" class="px-2.5 py-1.5 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 text-xs font-bold">
                View Email
              </button>
              <button onclick="approveOrderDirect('${o.invoiceNumber}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm">
                Approve
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const accountsContainer = document.getElementById('managerAccountsAlertsList');
  if (accountsContainer) {
    const accountAlerts = (state.notifications || []).filter(n => n.type && n.type.startsWith('ACCOUNT_'));
    if (accountAlerts.length === 0) {
      accountsContainer.innerHTML = '<div class="py-8 text-center text-slate-500 text-xs">No clinic account modifications logged yet.</div>';
    } else {
      accountsContainer.innerHTML = accountAlerts.slice(0, 8).map(a => {
        const isFrozen = a.type === 'ACCOUNT_FROZEN';
        const isUnfrozen = a.type === 'ACCOUNT_UNFROZEN';
        const badgeColor = isFrozen ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : (isUnfrozen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-teal-500/20 text-teal-300 border-teal-500/30');
        const badgeLabel = isFrozen ? '❄️ Frozen' : (isUnfrozen ? '🔥 Active' : '✨ Added');

        return `
          <div class="glass-card rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div class="min-w-0 pr-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-bold text-white truncate max-w-[160px]" title="${escapeHtml(a.clientName)}">${escapeHtml(a.clientName)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${a.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${a.repId}</span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold ${badgeColor}">${badgeLabel}</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5 font-mono">${a.clientCode || ''} • ${escapeHtml(a.location || 'UAE')} • By ${escapeHtml(a.repName)}</p>
            </div>
            <button onclick="goToAccountInCRM('${a.clientCode}')" class="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-[10px] font-bold shrink-0">
              View
            </button>
          </div>
        `;
      }).join('');
    }
  }

  safeLucide();
}

window.openManagerSettingsModal = function() {
  document.getElementById('managerSettingsModal').classList.remove('hidden');
  safeLucide();
};

window.closeManagerSettingsModal = function() {
  const m = document.getElementById('managerSettingsModal');
  if (m) m.classList.add('hidden');
};

window.handleSaveManagerSettings = function(e) {
  e.preventDefault();
  const emails = document.getElementById('settingsManagerEmails').value.trim();
  const sound = document.getElementById('settingsSoundAlert').checked;
  const toast = document.getElementById('settingsToastAlert').checked;

  state.managerSettings = {
    managerEmails: emails || 'gm@conceptors.ae, sales.manager@conceptors.ae',
    soundAlert: sound,
    toastAlert: toast
  };

  persistData();

  // Cloud write-through to Supabase
  supabaseRest('manager_settings', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      id: 'default',
      manager_emails: state.managerSettings.managerEmails,
      sound_alert: state.managerSettings.soundAlert,
      toast_alert: state.managerSettings.toastAlert,
      updated_at: new Date().toISOString()
    }
  });

  closeManagerSettingsModal();
  showToast('Settings Saved', 'Senior manager notification preferences updated.', 'success');
};

window.triggerTestOrderNotification = function() {
  const testOrderNum = `ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const notif = {
    id: `NOTIF-${testOrderNum}-${Date.now()}`,
    type: 'ORDER_SUBMITTED',
    title: `New Field Sales Order Submitted #${testOrderNum}`,
    orderNumber: testOrderNum,
    repId: 'T1',
    repName: 'Shaimaa (Rep T1)',
    clientCode: 'DC0340',
    clientName: 'DR SAMIR VET CLINIC',
    location: 'Dubai',
    totalExcVat: 1860,
    totalIncVat: 1953,
    timestamp: new Date().toISOString(),
    read: false,
    approvalStatus: 'Pending',
    itemsSummary: 'ASBRIP 30 ml (25 Sls + 5 FOC), VIUSID 30 ml (10 Sls + 2 FOC), VIRULYS Paste 30ml (20 Sls + 4 FOC)',
    paymentTerms: '30 Days Credit',
    deliveryUrgency: 'Normal (48h)',
    items: [
      { productCode: 'AS030', productName: 'ASBRIP 30 ml', unitPrice: 32, salesQty: 25, focQty: 5, total: 800 },
      { productCode: 'VP030', productName: 'VIUSID 30 ml', unitPrice: 40, salesQty: 10, focQty: 2, total: 400 },
      { productCode: 'VR030', productName: 'VIRULYS Paste 30ml', unitPrice: 33, salesQty: 20, focQty: 4, total: 660 }
    ]
  };

  state.notifications.unshift(notif);
  persistData();

  if (state.managerSettings.soundAlert) playNotificationChime();
  if (state.managerSettings.toastAlert) {
    showToast(
      `🚨 TEST Order Alert #${testOrderNum}`,
      `Automated alert dispatched to Senior Managers (${state.managerSettings.managerEmails}) for 1,953.00 AED order.`,
      'success'
    );
  }

  updateNotificationBell();
  renderManagerNotifications();
};

// =========================================================================
// 16. SOUND CHIME & TOAST NOTIFICATION UTILITIES
// =========================================================================

window.playNotificationChime = function() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.log('Audio chime waiting for user gesture:', err);
  }
};

window.showToast = function(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const typeClass = (type === 'success' || type === 'warning') ? `toast-${type}` : 'toast-info';
  toast.className = `toast-item ${typeClass} pointer-events-auto p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all`;

  const iconName = type === 'success' ? 'check-circle-2' : (type === 'warning' ? 'alert-triangle' : 'info');

  toast.innerHTML = `
    <div class="toast-icon-wrapper p-2 rounded-xl shrink-0 mt-0.5">
      <i data-lucide="${iconName}" class="w-4 h-4"></i>
    </div>
    <div class="flex-1 min-w-0">
      <h5 class="toast-title text-xs font-black leading-tight">${escapeHtml(title)}</h5>
      <p class="toast-message text-[11px] mt-1 font-medium leading-relaxed">${escapeHtml(message)}</p>
    </div>
    <button type="button" class="toast-close-btn p-1.5 rounded-lg shrink-0 transition-colors" onclick="this.parentElement.remove()" aria-label="Dismiss notification">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  container.appendChild(toast);
  safeLucide();

  setTimeout(() => {
    toast.classList.add('dismissing');
    setTimeout(() => { toast.remove(); }, 300);
  }, 5000);
};

// =========================================================================
// 17. FORMATTING & STRING UTILITIES
// =========================================================================

function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// =========================================================================
// 18. GOOGLE DRIVE CLOUD SYNC UI CONTROLLERS & MASTER CSV EXPORTERS
// =========================================================================

window.openCloudSyncModal = function() {
  const modal = document.getElementById('cloudSyncModal');
  if (!modal) return;

  const input = document.getElementById('gdriveUrlInput');
  if (input) {
    input.value = getGoogleDriveUrl();
  }

  const statusEl = document.getElementById('cloudSyncStatusBadge');
  if (statusEl) {
    const url = getGoogleDriveUrl();
    if (url) {
      statusEl.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30">
          <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          Connected & Synced with Google Drive
        </span>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30">
          <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
          Operating in Local Device Storage Mode
        </span>
      `;
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  safeLucide();
};

window.closeCloudSyncModal = function() {
  const modal = document.getElementById('cloudSyncModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.saveGoogleDriveSyncConfig = async function() {
  const input = document.getElementById('gdriveUrlInput');
  const url = input ? input.value.trim() : '';

  if (url) {
    if (!url.startsWith('http') || !url.includes('script.google.com')) {
      showToast('Invalid URL', 'Please enter a valid Google Apps Script Web App URL ending with /exec', 'warning');
      return;
    }
    setGoogleDriveUrl(url);
    showToast('Connecting to Google Drive...', 'Verifying cloud sync endpoint...', 'info');
    const res = await syncWithGoogleDrive(true);
    if (res && res.success) {
      closeCloudSyncModal();
    }
  } else {
    setGoogleDriveUrl('');
    updateCloudSyncBadge('offline', '💾 Local Mode');
    showToast('Sync URL Cleared', 'Operating in local offline storage mode.', 'info');
    closeCloudSyncModal();
  }
};

window.testGoogleDriveConnection = async function() {
  const input = document.getElementById('gdriveUrlInput');
  const url = input ? input.value.trim() : '';
  if (!url) {
    showToast('Missing Web App URL', 'Please paste your Google Apps Script Web App URL first.', 'warning');
    return;
  }

  showToast('Testing Connection...', 'Pinging your Google Drive Apps Script endpoint...', 'info');
  try {
    const res = await fetch(`${url}?action=PING&_t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const json = await res.json();
    if (json.status === 'success') {
      setGoogleDriveUrl(url);
      updateCloudSyncBadge('connected', '🟢 Drive Synced');
      showToast('⚡ Google Drive Connected!', 'Your Google Drive & Sheets CRM endpoint is active and ready for cross-device sync.', 'success');
      const statusEl = document.getElementById('cloudSyncStatusBadge');
      if (statusEl) {
        statusEl.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30">
            <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            Connected & Synced with Google Drive
          </span>
        `;
      }
    } else {
      throw new Error(json.message || 'Invalid endpoint response');
    }
  } catch (err) {
    showToast('Connection Failed', `Could not reach script: ${err.message}. Make sure your deployment access is set to 'Anyone'.`, 'error');
  }
};

window.copyGoogleAppsScriptCode = async function() {
  try {
    // Try fetching the local file
    const res = await fetch('./google_drive_sync.gs');
    if (res.ok) {
      const code = await res.text();
      await navigator.clipboard.writeText(code);
      showToast('📋 Script Copied!', 'Full Google Apps Script sync code copied to your clipboard. Paste into your Google Sheet script editor!', 'success');
      return;
    }
  } catch(e) {}

  // Fallback direct copy instruction
  showToast('📋 Google Apps Script', 'Open google_drive_sync.gs from the project folder and paste into Extensions -> Apps Script.', 'info');
};

// 1-Click Complete CRM CSV Data Downloader
window.exportAllDataCSVs = function() {
  const dateStr = getSyncedTodayDate();
  showToast('Exporting All CRM CSVs', 'Generating master CSV spreadsheets for Visits, Orders, Clinics, and Planning Targets...', 'info');

  // 1. Visits Master CSV
  const visitHeaders = [
    'Date', 'Rep ID', 'Rep Name', 'Territory', 'Clinic Code', 'Clinic Name',
    'Location', 'Visit Category', 'Status', 'Time Slot', 'Doctor Met',
    'Doctor Role', 'Doctor Sentiment', 'Products Detailed', 'Samples Dropped',
    'Sample Product', 'Order Placed', 'Order Ref', 'Order Value AED',
    'Purpose', 'Unplanned Reason', 'Outcome / Notes', 'Missed Reason', 'Next Follow Up Date'
  ];
  const visitRows = (state.visits || []).map(v => [
    `"${v.date || ''}"`,
    `"${v.repId || ''}"`,
    `"${getRepName(v.repId)}"`,
    `"${v.territory || v.repId || ''}"`,
    `"${v.clientCode || ''}"`,
    `"${(v.clientName || '').replace(/"/g, '""')}"`,
    `"${v.location || ''}"`,
    `"${v.visitCategory || 'Planned'}"`,
    `"${v.status || 'Planned'}"`,
    `"${(v.timeSlot || '').replace(/"/g, '""')}"`,
    `"${(v.doctorName || '').replace(/"/g, '""')}"`,
    `"${(v.doctorRole || '').replace(/"/g, '""')}"`,
    `"${v.doctorSentiment || ''}"`,
    `"${Array.isArray(v.productsDetailed) ? v.productsDetailed.join('; ').replace(/"/g, '""') : (v.productsDetailed || '')}"`,
    v.samplesDropped || 0,
    `"${(v.sampleProduct || '').replace(/"/g, '""')}"`,
    v.orderPlaced ? 'YES' : 'NO',
    `"${v.orderRef || ''}"`,
    v.orderValueAed || 0,
    `"${(v.purpose || '').replace(/"/g, '""')}"`,
    `"${(v.unplannedReason || '').replace(/"/g, '""')}"`,
    `"${(v.outcome || '').replace(/"/g, '""')}"`,
    `"${(v.missedReason || '').replace(/"/g, '""')}"`,
    `"${v.nextFollowUp || ''}"`
  ]);
  downloadCsvFile(`Conceptors_Visits_Master_${dateStr}.csv`, [visitHeaders.join(','), ...visitRows.map(r => r.join(','))].join('\r\n'));

  // 2. Orders Master CSV
  setTimeout(() => {
    const orderHeaders = [
      'Invoice Number', 'Date', 'Rep ID', 'Rep Name', 'Territory', 'Clinic Code',
      'Clinic Name', 'Location', 'Payment Terms', 'Delivery Urgency', 'Subtotal Exc VAT (AED)',
      'VAT 5% (AED)', 'Total Inc VAT (AED)', 'Approval Status', 'Approved By', 'Items Summary'
    ];
    const orderRows = (state.orders || []).map(o => [
      `"${o.invoiceNumber}"`,
      `"${o.date || ''}"`,
      `"${o.repId || ''}"`,
      `"${o.repName || getRepName(o.repId)}"`,
      `"${o.territory || o.repId || ''}"`,
      `"${o.clientCode || ''}"`,
      `"${(o.clientName || '').replace(/"/g, '""')}"`,
      `"${o.location || ''}"`,
      `"${o.paymentTerms || ''}"`,
      `"${o.deliveryUrgency || ''}"`,
      o.totalExcVat || 0,
      o.vatAmount || 0,
      o.totalIncVat || 0,
      `"${o.approvalStatus || 'Pending'}"`,
      `"${o.approvedBy || ''}"`,
      `"${(o.itemsSummary || (o.items || []).map(i => `${i.productName} (${i.salesQty}x)`).join('; ')).replace(/"/g, '""')}"`
    ]);
    downloadCsvFile(`Conceptors_Orders_Master_${dateStr}.csv`, [orderHeaders.join(','), ...orderRows.map(r => r.join(','))].join('\r\n'));
  }, 350);

  // 3. Clinics Directory CSV
  setTimeout(() => {
    const clinicHeaders = ['Clinic Code', 'Clinic Name', 'Location / Emirate', 'Territory', 'Assigned Rep', 'Tier', 'Contact Person', 'Phone'];
    const clinicRows = (state.customers || []).map(c => [
      `"${c.code}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.location || ''}"`,
      `"${c.territory || c.repId || ''}"`,
      `"${getRepName(c.repId)}"`,
      `"${c.tier || 'Tier 1'}"`,
      `"${(c.contactPerson || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`
    ]);
    downloadCsvFile(`Conceptors_Clinics_Directory_${dateStr}.csv`, [clinicHeaders.join(','), ...clinicRows.map(r => r.join(','))].join('\r\n'));
  }, 700);

  showToast('📥 Master CSVs Generated', `Visits, Orders, and Clinic spreadsheets saved to your device.`, 'success');
};

function downloadCsvFile(filename, csvContent) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
window.downloadCsvFile = downloadCsvFile;

// =========================================================================
// MOBILE MORE ACTION DRAWER HANDLERS (< 768px)
// =========================================================================

function toggleMobileMoreDrawer() {
  const drawer = document.getElementById('mobileMoreDrawer');
  if (!drawer) return;
  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    const u = state.currentUser || { name: 'Shaimaa', role: 'rep_t1', territory: 'T1' };
    const nameEl = document.getElementById('mobileDrawerName');
    const roleEl = document.getElementById('mobileDrawerRole');
    const avatarEl = document.getElementById('mobileDrawerAvatar');
    const mgrBtn = document.getElementById('mobileDrawerBtnManager');
    if (nameEl) nameEl.textContent = u.name;
    if (roleEl) roleEl.textContent = u.role === 'manager' ? 'Senior Sales Manager' : `Rep ${u.territory || 'T1'} (${u.territory === 'T2' ? 'Northern Emirates' : 'DXB/AUH'})`;
    if (avatarEl) avatarEl.textContent = u.avatar || (u.name ? u.name.substring(0, 2).toUpperCase() : 'SH');
    if (mgrBtn) {
      if (u.role === 'manager') mgrBtn.classList.remove('hidden');
      else mgrBtn.classList.add('hidden');
    }
  } else {
    drawer.classList.add('hidden');
  }
}
function closeMobileMoreDrawer() {
  const drawer = document.getElementById('mobileMoreDrawer');
  if (drawer) drawer.classList.add('hidden');
}
window.toggleMobileMoreDrawer = toggleMobileMoreDrawer;
window.closeMobileMoreDrawer = closeMobileMoreDrawer;

// =========================================================================
// DATA EXPORT CENTER CONTROLLER & INDIVIDUAL EXPORTERS
// =========================================================================

function openExportCenterModal(initialSection = 'all') {
  const modal = document.getElementById('exportCenterModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  safeLucide();
}
function closeExportCenterModal() {
  const modal = document.getElementById('exportCenterModal');
  if (modal) modal.classList.add('hidden');
}
window.openExportCenterModal = openExportCenterModal;
window.closeExportCenterModal = closeExportCenterModal;

// 1. Export Daily Visit Reports
function handleExportDailyReports() {
  const range = document.getElementById('exportDailyDateRange')?.value || 'today';
  const rep = document.getElementById('exportDailyRepFilter')?.value || 'ALL';
  exportDailyReportCSV(range, rep);
}
window.handleExportDailyReports = handleExportDailyReports;

function exportDailyReportCSV(rangeMode = 'today', repFilter = 'ALL') {
  const today = getSyncedTodayDate();
  let targetDate = state.dailyReportDate || today;
  let visitsToExport = state.visits || [];

  if (rangeMode === 'today') {
    visitsToExport = visitsToExport.filter(v => v.date === today);
  } else if (rangeMode === 'selected') {
    visitsToExport = visitsToExport.filter(v => v.date === targetDate);
  } else if (rangeMode === 'month') {
    const ym = targetDate.substring(0, 7);
    visitsToExport = visitsToExport.filter(v => (v.date || '').startsWith(ym));
  }

  if (repFilter && repFilter !== 'ALL') {
    visitsToExport = visitsToExport.filter(v => v.repId === repFilter);
  }

  if (visitsToExport.length === 0) {
    showToast('No Visits Found', 'No visit records match the selected date and representative filters.', 'warning');
    return;
  }

  const visitHeaders = [
    'Date', 'Rep ID', 'Rep Name', 'Territory', 'Clinic Code', 'Clinic Name',
    'Location', 'Visit Category', 'Status', 'Time Slot', 'Doctor Met',
    'Doctor Role', 'Doctor Sentiment', 'Products Detailed', 'Samples Dropped',
    'Sample Product', 'Order Placed', 'Order Ref', 'Order Value AED',
    'Purpose', 'Unplanned Reason', 'Outcome / Notes', 'Missed Reason', 'Next Follow Up Date'
  ];

  const visitRows = visitsToExport.map(v => [
    `"${v.date || ''}"`,
    `"${v.repId || ''}"`,
    `"${getRepName(v.repId)}"`,
    `"${v.territory || v.repId || ''}"`,
    `"${v.clientCode || ''}"`,
    `"${(v.clientName || '').replace(/"/g, '""')}"`,
    `"${v.location || ''}"`,
    `"${v.visitCategory || 'Planned'}"`,
    `"${v.status || 'Planned'}"`,
    `"${(v.timeSlot || '').replace(/"/g, '""')}"`,
    `"${(v.doctorName || '').replace(/"/g, '""')}"`,
    `"${(v.doctorRole || '').replace(/"/g, '""')}"`,
    `"${v.doctorSentiment || ''}"`,
    `"${Array.isArray(v.productsDetailed) ? v.productsDetailed.join('; ').replace(/"/g, '""') : (v.productsDetailed || '')}"`,
    v.samplesDropped || 0,
    `"${(v.sampleProduct || '').replace(/"/g, '""')}"`,
    v.orderPlaced ? 'YES' : 'NO',
    `"${v.orderRef || ''}"`,
    v.orderValueAed || 0,
    `"${(v.purpose || '').replace(/"/g, '""')}"`,
    `"${(v.unplannedReason || '').replace(/"/g, '""')}"`,
    `"${(v.outcome || '').replace(/"/g, '""')}"`,
    `"${(v.missedReason || '').replace(/"/g, '""')}"`,
    `"${v.nextFollowUp || ''}"`
  ]);

  const fileLabel = rangeMode === 'today' ? `Today_${today}` : (rangeMode === 'month' ? `Month_${targetDate.substring(0, 7)}` : targetDate);
  const repLabel = repFilter !== 'ALL' ? `_${repFilter}` : '_AllReps';
  downloadCsvFile(`Conceptors_Visits_Report_${fileLabel}${repLabel}.csv`, [visitHeaders.join(','), ...visitRows.map(r => r.join(','))].join('\r\n'));
  showToast('Visits CSV Exported', `Downloaded ${visitsToExport.length} visit record(s).`, 'success');
}
window.exportDailyReportCSV = exportDailyReportCSV;

// 2. Export Monthly Planning
function handleExportPlanning() {
  const month = document.getElementById('exportPlanningMonth')?.value || '2026-09';
  const rep = document.getElementById('exportPlanningRep')?.value || 'ALL';
  exportMonthlyPlanCSV(month, rep);
}
window.handleExportPlanning = handleExportPlanning;

function exportMonthlyPlanCSV(monthStr = '2026-09', repFilter = 'ALL') {
  let visitsToExport = state.visits || [];

  if (monthStr && monthStr !== 'ALL') {
    visitsToExport = visitsToExport.filter(v => (v.date || '').startsWith(monthStr));
  }

  if (repFilter && repFilter !== 'ALL') {
    visitsToExport = visitsToExport.filter(v => v.repId === repFilter);
  }

  if (visitsToExport.length === 0) {
    showToast('No Planned Calls Found', 'No call records match the selected month and rep.', 'warning');
    return;
  }

  const headers = [
    'Month/Year', 'Rep ID', 'Rep Name', 'Territory', 'Scheduled Date',
    'Clinic Code', 'Clinic Name', 'Location / Emirate', 'Tier', 'Time Slot',
    'Visit Category', 'Call Status', 'Products Scheduled', 'Doctor Target',
    'Call Purpose', 'Outcome / Notes'
  ];

  const rows = visitsToExport.map(v => {
    const clinic = (state.customers || []).find(c => c.code === v.clientCode) || {};
    return [
      `"${monthStr}"`,
      `"${v.repId || ''}"`,
      `"${getRepName(v.repId)}"`,
      `"${v.territory || v.repId || ''}"`,
      `"${v.date || ''}"`,
      `"${v.clientCode || ''}"`,
      `"${(v.clientName || '').replace(/"/g, '""')}"`,
      `"${v.location || clinic.location || ''}"`,
      `"${clinic.tier || 'Silver'}"`,
      `"${(v.timeSlot || '').replace(/"/g, '""')}"`,
      `"${v.visitCategory || 'Planned'}"`,
      `"${v.status || 'Planned'}"`,
      `"${Array.isArray(v.productsDetailed) ? v.productsDetailed.join('; ').replace(/"/g, '""') : (v.productsDetailed || '')}"`,
      `"${(v.doctorName || clinic.contactPerson || '').replace(/"/g, '""')}"`,
      `"${(v.purpose || '').replace(/"/g, '""')}"`,
      `"${(v.outcome || '').replace(/"/g, '""')}"`
    ];
  });

  const repLabel = repFilter !== 'ALL' ? `_${repFilter}` : '_AllReps';
  downloadCsvFile(`Conceptors_Monthly_Plan_${monthStr}${repLabel}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n'));
  showToast('Monthly Plan CSV Exported', `Downloaded ${rows.length} scheduled call(s).`, 'success');
}
window.exportMonthlyPlanCSV = exportMonthlyPlanCSV;

// 3. Export Field Sales Orders
function handleExportOrders() {
  const type = document.getElementById('exportOrdersType')?.value || 'itemized';
  const status = document.getElementById('exportOrdersStatus')?.value || 'ALL';
  exportOrdersCSV(type, status, 'ALL');
}
window.handleExportOrders = handleExportOrders;

function exportOrdersCSV(type = 'itemized', statusFilter = 'ALL', repFilter = 'ALL') {
  let orders = state.orders || [];
  if (statusFilter && statusFilter !== 'ALL') {
    orders = orders.filter(o => o.approvalStatus === statusFilter);
  }
  if (repFilter && repFilter !== 'ALL') {
    orders = orders.filter(o => o.repId === repFilter);
  }

  if (orders.length === 0) {
    showToast('No Orders Found', 'No orders match the selected filters.', 'warning');
    return;
  }

  const dateStr = getSyncedTodayDate();

  if (type === 'summary') {
    const headers = [
      'Invoice Number', 'Order Date', 'Rep ID', 'Rep Name', 'Territory',
      'Clinic Code', 'Clinic Name', 'Location', 'Payment Terms', 'Delivery Urgency',
      'Subtotal Exc VAT (AED)', 'VAT 5% (AED)', 'Total Inc VAT (AED)', 'Approval Status', 'Approved By'
    ];
    const rows = orders.map(o => [
      `"${o.invoiceNumber}"`,
      `"${o.date || ''}"`,
      `"${o.repId || ''}"`,
      `"${o.repName || getRepName(o.repId)}"`,
      `"${o.territory || o.repId || ''}"`,
      `"${o.clientCode || ''}"`,
      `"${(o.clientName || '').replace(/"/g, '""')}"`,
      `"${o.location || ''}"`,
      `"${o.paymentTerms || ''}"`,
      `"${o.deliveryUrgency || ''}"`,
      o.totalExcVat || 0,
      o.vatAmount || 0,
      o.totalIncVat || 0,
      `"${o.approvalStatus || 'Pending'}"`,
      `"${o.approvedBy || ''}"`
    ]);
    downloadCsvFile(`Conceptors_Orders_Summary_${dateStr}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n'));
    showToast('Orders Summary CSV Exported', `Exported ${orders.length} orders.`, 'success');
  } else {
    const headers = [
      'Invoice Number', 'Order Date', 'Rep Name', 'Territory', 'Clinic Code',
      'Clinic Name', 'Location', 'Product Code', 'Product Name', 'Unit Price (AED)',
      'Sales Qty', 'Bonus FOC Qty', 'Line Total Exc VAT (AED)', 'Invoice Net (AED)',
      'VAT 5% (AED)', 'Invoice Total (AED)', 'Payment Terms', 'Approval Status'
    ];
    const rows = [];
    orders.forEach(o => {
      const items = (o.items && o.items.length > 0) ? o.items : [
        { productCode: 'GEN', productName: o.itemsSummary || 'Standard Order', unitPrice: o.totalExcVat, salesQty: 1, focQty: 0, total: o.totalExcVat }
      ];
      items.forEach(it => {
        rows.push([
          `"${o.invoiceNumber}"`,
          `"${o.date || ''}"`,
          `"${o.repName || getRepName(o.repId)}"`,
          `"${o.territory || o.repId || ''}"`,
          `"${o.clientCode || ''}"`,
          `"${(o.clientName || '').replace(/"/g, '""')}"`,
          `"${o.location || ''}"`,
          `"${it.productCode || ''}"`,
          `"${(it.productName || '').replace(/"/g, '""')}"`,
          it.unitPrice || 0,
          it.salesQty || 0,
          it.focQty || 0,
          it.total || 0,
          o.totalExcVat || 0,
          o.vatAmount || 0,
          o.totalIncVat || 0,
          `"${o.paymentTerms || ''}"`,
          `"${o.approvalStatus || 'Pending'}"`
        ]);
      });
    });
    downloadCsvFile(`Conceptors_Orders_Itemized_${dateStr}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n'));
    showToast('Itemized Orders CSV Exported', `Exported ${rows.length} product line items.`, 'success');
  }
}
window.exportOrdersCSV = exportOrdersCSV;

// 4. Export Clinics & Unvisited Coverage
function handleExportClinics() {
  const scope = document.getElementById('exportClinicsScope')?.value || 'unvisited';
  const territory = document.getElementById('exportClinicsTerritory')?.value || 'ALL';
  exportClinicsCSV(scope, territory);
}
window.handleExportClinics = handleExportClinics;

function exportClinicsCSV(scope = 'unvisited', territoryFilter = 'ALL') {
  let clinics = state.customers || [];
  if (territoryFilter && territoryFilter !== 'ALL') {
    clinics = clinics.filter(c => (c.territory || c.repId) === territoryFilter);
  }

  const currentYM = (getSyncedTodayDate()).substring(0, 7);
  const visitsThisMonth = (state.visits || []).filter(v => (v.date || '').startsWith(currentYM) && v.status === 'Completed');
  const visitedCodes = new Set(visitsThisMonth.map(v => v.clientCode));

  if (scope === 'unvisited') {
    clinics = clinics.filter(c => !visitedCodes.has(c.code));
  }

  const headers = [
    'Clinic Code', 'Clinic Name', 'Account Status', 'Location / Emirate', 'Territory', 'Assigned Rep',
    'Tier', 'Contact Person', 'Phone', 'Visited This Month', 'Last Visit Date'
  ];

  const rows = clinics.map(c => {
    const isVisited = visitedCodes.has(c.code);
    const lastVisit = (state.visits || [])
      .filter(v => v.clientCode === c.code && v.status === 'Completed')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

    return [
      `"${c.code}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.isActive === false ? 'Frozen (Inactive)' : 'Active'}"`,
      `"${c.location || ''}"`,
      `"${c.territory || c.repId || ''}"`,
      `"${getRepName(c.repId)}"`,
      `"${c.tier || 'Silver'}"`,
      `"${(c.contactPerson || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      isVisited ? 'YES' : 'NO',
      `"${lastVisit ? lastVisit.date : 'Never'}"`
    ];
  });

  const label = scope === 'unvisited' ? 'Unvisited_Clinics' : 'Full_Directory';
  const tLabel = territoryFilter !== 'ALL' ? `_${territoryFilter}` : '';
  downloadCsvFile(`Conceptors_${label}${tLabel}_${getSyncedTodayDate()}.csv`, [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n'));
  showToast('Clinics CSV Exported', `Exported ${rows.length} clinic account(s).`, 'success');
}
window.exportClinicsCSV = exportClinicsCSV;

function printDailyReportSummary() {
  window.print();
}
window.printDailyReportSummary = printDailyReportSummary;

