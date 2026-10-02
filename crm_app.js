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
    accountCode: row.client_code,
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
    client_code: o.clientCode || o.accountCode,
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
    accountCode: row.client_code,
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
    client_code: n.clientCode || n.accountCode,
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
      state.visits = visitsRes.data.map(mapVisitFromDb);
      try { localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(state.visits)); } catch(e) {}
    }

    const [ordersRes, itemsRes] = await Promise.all([
      supabaseRest('orders?select=*&order=date.desc'),
      supabaseRest('order_items?select=*')
    ]);
    if (ordersRes.data && Array.isArray(ordersRes.data)) {
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
      try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch(e) {}
    }

    const plansRes = await supabaseRest('monthly_plans?select=*');
    if (plansRes.data && Array.isArray(plansRes.data)) {
      state.monthlyPlans = plansRes.data.map(mapPlanFromDb);
      try { localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(state.monthlyPlans)); } catch(e) {}
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
      let hydratedEmails = setRes.data[0].manager_emails || state.managerSettings.managerEmails;
      if (hydratedEmails && hydratedEmails.includes('@conceptors.ae')) {
        hydratedEmails = 's.ageez@the-conceptors.com';
      }
      let hydratedPhone = setRes.data[0].whatsapp_phone || state.managerSettings.whatsappPhone;
      if (!hydratedPhone || hydratedPhone === '+971501234567') {
        hydratedPhone = '+971 52 533 3329';
      }
      state.managerSettings = {
        ...state.managerSettings,
        managerEmails: hydratedEmails || 's.ageez@the-conceptors.com',
        managerCcEmails: setRes.data[0].manager_cc_emails || state.managerSettings.managerCcEmails || 'a.tharayil@the-conceptors.com',
        soundAlert: setRes.data[0].sound_alert !== undefined ? Boolean(setRes.data[0].sound_alert) : state.managerSettings.soundAlert,
        toastAlert: setRes.data[0].toast_alert !== undefined ? Boolean(setRes.data[0].toast_alert) : state.managerSettings.toastAlert,
        whatsappPhone: hydratedPhone,
        whatsappApiKey: setRes.data[0].whatsapp_api_key || state.managerSettings.whatsappApiKey,
        ntfyTopic: setRes.data[0].ntfy_topic || state.managerSettings.ntfyTopic,
        webhookUrl: setRes.data[0].webhook_url || state.managerSettings.webhookUrl
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

// =========================================================================
// SUPABASE REALTIME WEBSOCKET SUBSCRIPTION (INSTANT CROSS-DEVICE SYNC)
// =========================================================================

let realtimeChannel = null;
let realtimeDebounceTimer = null;

function initSupabaseRealtime() {
  if (!supabaseClient) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;
      } catch (e) {
        console.warn('Realtime init: supabase client create failed:', e);
        return;
      }
    } else {
      return;
    }
  }

  try {
    if (realtimeChannel) {
      try { supabaseClient.removeChannel(realtimeChannel); } catch (_) {}
    }

    realtimeChannel = supabaseClient
      .channel('conceptors-crm-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.info('[Supabase Realtime] Event detected:', payload.table, payload.eventType);
          if (payload.table === 'orders' && payload.eventType === 'INSERT') {
            if (typeof triggerManagerOrderAlert === 'function') {
              triggerManagerOrderAlert(payload.new || {});
            }
          } else if (payload.table === 'notifications' && payload.eventType === 'INSERT') {
            if (payload.new && payload.new.type === 'ORDER_SUBMITTED') {
              if (typeof triggerManagerOrderAlert === 'function') {
                triggerManagerOrderAlert(payload.new || {});
              }
            }
          }
          if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
          realtimeDebounceTimer = setTimeout(() => {
            syncWithSupabase(false);
          }, 350);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Supabase Realtime] Connected to live PostgreSQL database stream.');
          updateSupabaseSyncBadge('connected', '⚡ Live Connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Supabase Realtime] Channel subscription error:', err);
        }
      });
  } catch (err) {
    console.warn('[Supabase Realtime] Setup exception:', err);
  }
}
window.initSupabaseRealtime = initSupabaseRealtime;

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
  let lastKnownDate = getSyncedTodayDate();
  function tick() {
    const clockEl = document.getElementById('uaeLiveClock');
    if (clockEl) {
      const time = getSyncedTimeStr(state.timeZone || 'Asia/Dubai');
      clockEl.textContent = `UAE ${time} GST`;
    }
    const currentLiveDate = getSyncedTodayDate();
    if (currentLiveDate !== lastKnownDate) {
      lastKnownDate = currentLiveDate;
      state.dailyDate = currentLiveDate;
      state.dailyReportDate = currentLiveDate;
      localStorage.setItem(STORAGE_KEY_DATE, currentLiveDate);
      renderAll();
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
    managerEmails: 's.ageez@the-conceptors.com',
    managerCcEmails: 'a.tharayil@the-conceptors.com',
    soundAlert: true,
    toastAlert: true,
    whatsappPhone: '+971 52 533 3329',
    whatsappApiKey: '',
    ntfyTopic: 'conceptors-orders-sameh',
    webhookUrl: ''
  },
  editingOrderInvoiceNumber: null,
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
    analyticsTimeframe: 'SEP_2026',
    analyticsDateFrom: '2026-09-01',
    analyticsDateTo: '2026-09-30',
    analyticsRosterSearch: '',
    analyticsRosterFilter: 'ALL'
  }
};
window.state = state;

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

    // 1. Supabase Cloud Database: Primary real-time multi-device sync
    syncWithSupabase();
    initSupabaseRealtime();

    // Register Service Worker for mobile push and lockscreen alerts
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Service worker registration note:', err);
      });
    }
    if (typeof updateMobilePushBadge === 'function') {
      updateMobilePushBadge();
    }

    // 2. Google Drive: Secondary optional cloud sync if configured
    if (getGoogleDriveUrl()) {
      syncWithGoogleDrive(false);
    }

    // Auto-sync on window focus (so mobile phone and laptop sync automatically when switching tabs or unlocking phone)
    window.addEventListener('focus', () => {
      syncWithSupabase(false);
      if (getGoogleDriveUrl()) {
        syncWithGoogleDrive(false);
      }
    });

    // Periodic background sync every 30s when tab is active (heartbeat fallback)
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncWithSupabase(false);
        if (getGoogleDriveUrl()) {
          syncWithGoogleDrive(false);
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
  // If no user is stored in localStorage and user hasn't explicitly logged out,
  // default to Senior Sales Manager (Dr. Sameh Ageez) so data renders immediately.
  const hasLoggedOut = localStorage.getItem('conceptors_crm_logged_out');
  if (!state.currentUser && !hasLoggedOut && window.INITIAL_USERS && window.INITIAL_USERS.length > 0) {
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

  const todayStr = getSyncedTodayDate();
  const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
  // Default strictly to live today if stored date is outdated from previous sessions/days
  if (!storedDate || storedDate !== todayStr) {
    state.dailyDate = todayStr;
    localStorage.setItem(STORAGE_KEY_DATE, todayStr);
  } else {
    state.dailyDate = storedDate;
  }
  state.dailyReportDate = todayStr;
  const dateParts = state.dailyDate.split('-');
  state.plannerCalendarYear = parseInt(dateParts[0], 10);
  state.plannerCalendarMonth = parseInt(dateParts[1], 10);

  const storedVisits = localStorage.getItem(STORAGE_KEY_VISITS);
  if (storedVisits !== null) {
    try {
      state.visits = JSON.parse(storedVisits) || [];
    } catch (e) {
      state.visits = [];
    }
  } else {
    state.visits = [...(window.INITIAL_VISITS || [])];
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(state.visits));
  }

  const storedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
  if (storedOrders !== null) {
    try {
      state.orders = JSON.parse(storedOrders) || [];
    } catch (e) {
      state.orders = [];
    }
  } else {
    state.orders = [...(window.INITIAL_ORDERS || [])];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders));
  }

  const storedPlans = localStorage.getItem(STORAGE_KEY_PLANS);
  if (storedPlans !== null) {
    try {
      state.monthlyPlans = JSON.parse(storedPlans) || [];
    } catch (e) {
      state.monthlyPlans = [];
    }
  } else {
    state.monthlyPlans = [...(window.INITIAL_MONTHLY_PLANS || [])];
    localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(state.monthlyPlans));
  }

  const storedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
  if (storedNotifs !== null) {
    try {
      state.notifications = JSON.parse(storedNotifs) || [];
    } catch (e) {
      state.notifications = [];
    }
  } else {
    state.notifications = [...(window.INITIAL_NOTIFICATIONS || [])];
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(state.notifications));
  }

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

  localStorage.removeItem('conceptors_crm_logged_out');
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
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
  }

  showToast(
    `Welcome, ${state.currentUser.name}!`,
    `Signed in as ${state.currentUser.title}. Data restricted strictly to ${state.currentUser.territory === 'ALL' ? 'All UAE Territories' : state.currentUser.territory}.`,
    'success'
  );

  // Switch to Daily tab upon login
  switchTab('daily');
  renderAll();
}

window.quickSwitchUser = function(username) {
  const users = window.INITIAL_USERS || [];
  const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!foundUser) {
    showToast('User Not Found', `Profile ${username} not found.`, 'warning');
    return;
  }

  localStorage.removeItem('conceptors_crm_logged_out');
  state.currentUser = { ...foundUser };

  if (state.currentUser.role === 'manager') {
    state.filters.analyticsRepFilter = 'ALL';
    state.filters.dailyReportRep = 'ALL';
  } else {
    const userTerritory = state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2');
    state.filters.analyticsRepFilter = userTerritory;
    state.filters.dailyReportRep = userTerritory;

    // If currently on manager tab, redirect to daily
    const currentTabManager = document.getElementById('tab-manager');
    if (currentTabManager && !currentTabManager.classList.contains('hidden')) {
      switchTab('daily');
    }
  }

  persistData();

  const overlay = document.getElementById('loginOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
  }
  closeProfileSwitcherModal();
  if (typeof closeMobileMoreDrawer === 'function') closeMobileMoreDrawer();

  showToast(
    `Switched to ${state.currentUser.name}`,
    `Active Profile: ${state.currentUser.title}. Data restricted to ${state.currentUser.territory === 'ALL' ? 'All UAE Territories' : state.currentUser.territory}.`,
    'success'
  );

  renderAll();
};

window.openProfileSwitcherModal = function() {
  const m = document.getElementById('profileSwitcherModal');
  if (!m) return;
  updateProfileSwitcherModalContent();
  m.style.display = 'flex';
  m.classList.remove('hidden');
  safeLucide();
};

window.closeProfileSwitcherModal = function() {
  const m = document.getElementById('profileSwitcherModal');
  if (m) {
    m.style.display = 'none';
    m.classList.add('hidden');
  }
};

function updateProfileSwitcherModalContent() {
  if (!state.currentUser) return;
  const avatar = document.getElementById('activeProfileAvatar');
  const name = document.getElementById('activeProfileName');
  const role = document.getElementById('activeProfileRole');
  if (avatar) avatar.textContent = state.currentUser.avatar || 'US';
  if (name) name.textContent = state.currentUser.name;
  if (role) role.textContent = `${state.currentUser.title} (${state.currentUser.territory === 'ALL' ? 'All UAE' : state.currentUser.territory})`;
}

window.handleLogout = function() {
  state.currentUser = null;
  localStorage.setItem('conceptors_crm_logged_out', 'true');
  persistData();

  const pwdInput = document.getElementById('loginPassword');
  if (pwdInput) pwdInput.value = '';
  const errorEl = document.getElementById('loginErrorMessage');
  if (errorEl) errorEl.classList.add('hidden');

  switchTab('daily');

  const overlay = document.getElementById('loginOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
  }

  const switcherModal = document.getElementById('profileSwitcherModal');
  if (switcherModal) {
    switcherModal.style.display = 'none';
    switcherModal.classList.add('hidden');
  }
  if (typeof closeMobileMoreDrawer === 'function') closeMobileMoreDrawer();

  showToast('Logged Out', 'Your session has ended. CRM locked.', 'info');
  safeLucide();
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

  // Restrict Add Account options strictly to Senior Sales Manager
  const isManager = (state.currentUser && state.currentUser.role === 'manager');
  const addAccountHeaderBtn = document.getElementById('addAccountBtnHeader');
  if (addAccountHeaderBtn) {
    if (isManager) addAccountHeaderBtn.classList.remove('hidden');
    else addAccountHeaderBtn.classList.add('hidden');
  }
  const mobileDrawerAddAccountBtn = document.getElementById('mobileDrawerAddAccountBtn');
  if (mobileDrawerAddAccountBtn) {
    if (isManager) mobileDrawerAddAccountBtn.classList.remove('hidden');
    else mobileDrawerAddAccountBtn.classList.add('hidden');
  }
  const repHubAddClinicBtn = document.getElementById('repHubAddClinicBtn');
  if (repHubAddClinicBtn) {
    if (isManager) repHubAddClinicBtn.classList.remove('hidden');
    else repHubAddClinicBtn.classList.add('hidden');
  }
  if (typeof updateMobilePushBadge === 'function') {
    updateMobilePushBadge();
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
// 5B. 1-DAY (24-HOUR) ADVANCE PLANNING UTILITY & INTERACTIVE CUSTOMER COMBOBOX ENGINE
// =========================================================================

/**
 * Calculates the earliest allowed date for a planned visit.
 * Under Conceptors SOP, planned visits must be scheduled at least 1 day
 * in advance (1-day advance planning rule: plannedDate >= today + 1 day).
 */
function getMinPlannedDate() {
  const base = getSyncedTodayDate();
  const parts = base.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + 1); // Strictly 1 day in advance (tomorrow)
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
          <div class="glass-card visit-card-item rounded-xl p-4 border ${isCompleted ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800 bg-slate-900/80'} transition-all space-y-3">
            <!-- Badges & Time Slot Row -->
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
                <span class="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">${v.timeSlot || 'Day Round'}</span>
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
              <span class="text-[10px] font-mono text-slate-400">${v.clientCode || ''}</span>
            </div>

            <!-- Clinic Name & Location (Full Width - Zero Collision) -->
            <div>
              <h4 class="font-extrabold text-white text-sm leading-snug break-words" title="${escapeHtml(v.clientName)}">${escapeHtml(v.clientName)}</h4>
              <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i>
                <span>${escapeHtml(v.location || 'UAE')}</span>
              </p>
            </div>

            <!-- Detail Box (Doctor Met & Detailing Purpose) -->
            <div class="visit-detail-box bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
              <div class="text-slate-300 font-semibold">
                <span class="text-slate-500 font-medium">Doctor Met:</span> ${escapeHtml(v.doctorName || 'Lead Veterinarian')} ${v.doctorRole ? `(${escapeHtml(v.doctorRole)})` : ''}
              </div>
              <div class="text-slate-400">
                <span class="text-slate-500 font-medium">Goal:</span> ${escapeHtml(v.purpose || 'Clinical Detailing')}
              </div>
              ${isCompleted && v.outcome ? `
                <div class="text-emerald-300/90 font-medium pt-1 border-t border-slate-800/80">
                  <span class="text-slate-500 font-medium">Outcome:</span> ${escapeHtml(v.outcome)}
                </div>
              ` : ''}
            </div>

            <!-- Card Footer: Dedicated Action Row -->
            <div class="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              ${!isCompleted ? `
                <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Awaiting Check-in</span>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  <button type="button" onclick="openAmendPlannedModal('${v.id}')" class="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 touch-manipulation" title="Freely edit target doctor, time round, or detailing goals">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5 text-cyan-400"></i>
                    <span>Edit Plan</span>
                  </button>
                  <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 touch-manipulation">
                    <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>
                    <span>Check-in & Submit</span>
                  </button>
                </div>
              ` : `
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSentimentBadgeClass(v.doctorSentiment)}">
                    ${v.doctorSentiment || 'Positive'}
                  </span>
                  ${v.samplesDropped > 0 ? `
                    <span class="text-amber-400 font-semibold">💊 ${v.samplesDropped} Samples</span>
                  ` : ''}
                  ${v.orderPlaced ? `
                    <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                      🛒 Order: ${formatCurrency(v.orderValueAed)} AED
                    </span>
                  ` : '<span class="text-slate-500">No order placed</span>'}
                </div>
                <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all">
                  Edit Report
                </button>
              `}
            </div>
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
          <div class="glass-card visit-card-item rounded-xl p-4 border border-amber-500/40 bg-amber-950/15 transition-all space-y-3">
            <!-- Badges & Time Slot Row -->
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${v.repId}</span>
                <span class="px-2.5 py-0.5 rounded-full badge-unplanned text-[10px] font-black inline-flex items-center gap-1">
                  <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i> [⚡ Unplanned]
                </span>
                <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">${escapeHtml(v.unplannedReason || 'Spontaneous Drop-in')}</span>
              </div>
              <span class="text-[10px] font-mono text-slate-400">${v.timeSlot ? v.timeSlot.split(' ')[0] : 'Today'}</span>
            </div>

            <!-- Clinic Name & Location (Full Width) -->
            <div>
              <h4 class="font-extrabold text-white text-sm leading-snug break-words" title="${escapeHtml(v.clientName)}">${escapeHtml(v.clientName)}</h4>
              <p class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i>
                <span>${v.clientCode || ''} • ${escapeHtml(v.location || 'UAE')}</span>
              </p>
            </div>

            <!-- Detail Box -->
            <div class="visit-detail-box bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
              <div class="text-slate-300 font-semibold">
                <span class="text-slate-500 font-medium">Doctor Met:</span> ${escapeHtml(v.doctorName || 'Veterinarian')} (${escapeHtml(v.doctorRole || 'Doctor')})
              </div>
              <div class="text-slate-300/90 pt-1 border-t border-slate-800/80">
                <span class="text-slate-500 font-medium">Outcome:</span> ${escapeHtml(v.outcome || 'Detailed doctor on clinical protocols.')}
              </div>
            </div>

            <!-- Card Footer: Dedicated Action Row -->
            <div class="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getSentimentBadgeClass(v.doctorSentiment)}">
                  ${v.doctorSentiment || 'Positive'}
                </span>
                ${v.samplesDropped > 0 ? `
                  <span class="text-amber-400 font-semibold">💊 ${v.samplesDropped} Samples</span>
                ` : ''}
                ${v.orderPlaced ? `
                  <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] inline-block border border-emerald-500/30">
                    🛒 ${formatCurrency(v.orderValueAed)} AED
                  </span>
                ` : ''}
              </div>

              <div class="flex items-center gap-1.5">
                ${!v.orderPlaced ? `
                  <button type="button" onclick="openOrderModal('${v.clientCode}', '${v.repId}')" class="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all">
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
  // Strictly return only real visits recorded for this date.
  // NEVER synthesize, fabricate, or inject artificial visits or orders into state or cloud.
  return (state.visits || []).filter(v => v.date === dateStr);
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

  const purgeBtn = document.getElementById('dailyReportManagerPurgeBtn');
  if (purgeBtn) {
    if (isManager) {
      purgeBtn.classList.remove('hidden');
    } else {
      purgeBtn.classList.add('hidden');
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

  const managerActions = document.getElementById('dailyReportModalManagerActions');
  if (managerActions) {
    if (state.currentUser && state.currentUser.role === 'manager') {
      managerActions.innerHTML = `
        <button type="button" onclick="handleManagerDeleteSingleVisit('${visit.id}')" class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation" title="Permanently delete this individual visit record from Supabase Cloud & local storage">
          <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-400"></i> Delete Record (Manager)
        </button>
      `;
    } else {
      managerActions.innerHTML = '';
    }
  }

  if (modal) modal.classList.remove('hidden');
  safeLucide();
};

window.closeDailyReportVisitModal = function() {
  const modal = document.getElementById('dailyReportVisitModal');
  if (modal) modal.classList.add('hidden');
};

// =========================================================================
// 8A. SENIOR SALES MANAGER: PILOT DATA RESET & AUDIT PURGE ENGINE
// =========================================================================

window.handleManagerDeleteSingleVisit = async function(visitId) {
  if (!state.currentUser || state.currentUser.role !== 'manager') {
    showToast('Permission Denied', 'Only Senior Sales Manager can delete historical or planned records.', 'error');
    return;
  }
  const visit = (state.visits || []).find(v => v.id === visitId);
  if (!visit) return;

  const desc = `${visit.clientName} (${visit.date}, Rep ${visit.repId})`;
  if (!confirm(`Are you sure you want to permanently delete this visit record for "${desc}"?\n\nThis will remove it from both Supabase Cloud Database and local storage as if it never happened.`)) {
    return;
  }

  // Remove from in-memory state
  state.visits = (state.visits || []).filter(v => v.id !== visitId);
  persistData();

  // Cloud delete from Supabase
  try {
    await supabaseRest(`visits?id=eq.${visitId}`, { method: 'DELETE' });
    updateCloudSyncBadge('connected', '⚡ Cloud Synced');
  } catch (err) {
    console.warn('Supabase delete single visit warning:', err);
  }

  closeDailyReportVisitModal();
  renderAll();
  showToast('Record Deleted', `Permanently removed visit record for ${desc}.`, 'success');
};

window.openManagerPurgeModal = function() {
  if (!state.currentUser || state.currentUser.role !== 'manager') {
    showToast('Restricted Access', 'This tool is restricted to Senior Sales Manager (Dr. Sameh Ageez).', 'warning');
    return;
  }
  const modal = document.getElementById('managerPurgeDataModal');
  if (!modal) return;

  const activeDate = state.dailyReportDate || state.dailyDate || getSyncedTodayDate();

  // Set default values
  const repSelect = document.getElementById('purgeRepSelect');
  if (repSelect) {
    repSelect.value = state.filters.dailyReportRep || 'ALL';
  }

  // Set mode to single date by default
  const modeSingle = document.getElementById('purgeModeSingle');
  const modeRange = document.getElementById('purgeModeRange');
  if (modeSingle) modeSingle.checked = true;
  if (modeRange) modeRange.checked = false;

  setPurgeDateMode('single');

  const singleDateInput = document.getElementById('purgeSingleDate');
  if (singleDateInput) singleDateInput.value = activeDate;

  const dateFromInput = document.getElementById('purgeDateFrom');
  if (dateFromInput) dateFromInput.value = activeDate;

  const dateToInput = document.getElementById('purgeDateTo');
  if (dateToInput) dateToInput.value = activeDate;

  // Check all category checkboxes
  const chkPlanned = document.getElementById('purgeTypePlanned');
  if (chkPlanned) chkPlanned.checked = true;
  const chkCompleted = document.getElementById('purgeTypeCompleted');
  if (chkCompleted) chkCompleted.checked = true;
  const chkUnplanned = document.getElementById('purgeTypeUnplanned');
  if (chkUnplanned) chkUnplanned.checked = true;
  const chkOrders = document.getElementById('purgeTypeOrders');
  if (chkOrders) chkOrders.checked = true;

  // Reset confirmation
  const confirmChk = document.getElementById('purgeConfirmCheckbox');
  if (confirmChk) confirmChk.checked = false;
  togglePurgeSubmitBtn();

  updatePurgePreviewCount();

  modal.classList.remove('hidden');
  safeLucide();
};

window.closeManagerPurgeModal = function() {
  const modal = document.getElementById('managerPurgeDataModal');
  if (modal) modal.classList.add('hidden');
};

window.setPurgeDateMode = function(mode) {
  const singleRow = document.getElementById('purgeSingleDateRow');
  const rangeRow = document.getElementById('purgeDateRangeRow');
  if (mode === 'single') {
    if (singleRow) singleRow.classList.remove('hidden');
    if (rangeRow) rangeRow.classList.add('hidden');
  } else {
    if (singleRow) singleRow.classList.add('hidden');
    if (rangeRow) rangeRow.classList.remove('hidden');
  }
  updatePurgePreviewCount();
};

function getPurgeMatchingRecords() {
  const repScope = document.getElementById('purgeRepSelect')?.value || 'ALL';
  const isRange = document.getElementById('purgeModeRange')?.checked;
  const singleDate = document.getElementById('purgeSingleDate')?.value;
  const dateFrom = document.getElementById('purgeDateFrom')?.value;
  const dateTo = document.getElementById('purgeDateTo')?.value;

  const typePlanned = document.getElementById('purgeTypePlanned')?.checked;
  const typeCompleted = document.getElementById('purgeTypeCompleted')?.checked;
  const typeUnplanned = document.getElementById('purgeTypeUnplanned')?.checked;
  const typeOrders = document.getElementById('purgeTypeOrders')?.checked;

  const dateMatch = (d) => {
    if (!d) return false;
    if (isRange) {
      if (dateFrom && dateTo) return d >= dateFrom && d <= dateTo;
      if (dateFrom) return d >= dateFrom;
      if (dateTo) return d <= dateTo;
      return true;
    }
    return d === singleDate;
  };

  const repMatch = (rId, terr) => {
    if (repScope === 'ALL') return true;
    return rId === repScope || terr === repScope;
  };

  // Filter visits
  const matchingVisits = (state.visits || []).filter(v => {
    if (!repMatch(v.repId, v.territory)) return false;
    if (!dateMatch(v.date)) return false;

    const isPlanned = v.visitCategory === 'Planned' || !v.visitCategory;
    const isUnplanned = v.visitCategory === 'Unplanned';
    const isCompleted = v.status === 'Completed';
    const isMissed = v.status === 'Missed';

    if (isPlanned && !isCompleted && !isMissed && !typePlanned) return false;
    if (isCompleted && !typeCompleted) return false;
    if ((isMissed || isUnplanned) && !typeUnplanned) return false;

    return true;
  });

  // Filter orders
  let matchingOrders = [];
  if (typeOrders) {
    matchingOrders = (state.orders || []).filter(o => {
      if (!repMatch(o.repId, o.territory)) return false;
      if (!dateMatch(o.date)) return false;
      return true;
    });
  }

  return { matchingVisits, matchingOrders, repScope, isRange, singleDate, dateFrom, dateTo };
}

window.updatePurgePreviewCount = function() {
  const impactBox = document.getElementById('purgeImpactBox');
  if (!impactBox) return;

  const { matchingVisits, matchingOrders, repScope, isRange, singleDate, dateFrom, dateTo } = getPurgeMatchingRecords();

  const plannedCount = matchingVisits.filter(v => (v.visitCategory === 'Planned' || !v.visitCategory) && v.status !== 'Completed').length;
  const completedCount = matchingVisits.filter(v => v.status === 'Completed').length;
  const unplannedCount = matchingVisits.filter(v => v.visitCategory === 'Unplanned' || v.status === 'Missed').length;

  const ordersVal = matchingOrders.reduce((sum, o) => sum + (o.totalIncVat || 0), 0);

  const dateDesc = isRange 
    ? `From <strong>${dateFrom || 'start'}</strong> to <strong>${dateTo || 'end'}</strong>` 
    : `Date: <strong>${singleDate || 'Not selected'}</strong>`;

  const repDesc = repScope === 'ALL' 
    ? 'All Representatives (Company-wide)' 
    : (repScope === 'T1' ? 'Dr. Shaimaa (T1 - DXB/AUH)' : 'Dr. Marsel (T2 - Northern Emirates)');

  if (matchingVisits.length === 0 && matchingOrders.length === 0) {
    impactBox.innerHTML = `
      <div class="text-slate-400 text-xs flex items-center gap-2">
        <i data-lucide="info" class="w-4 h-4 text-slate-500 shrink-0"></i>
        <span>No visits or orders found matching this scope (${repDesc} • ${dateDesc}).</span>
      </div>
    `;
  } else {
    impactBox.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-bold text-white">
          <span class="flex items-center gap-1.5 text-rose-400">
            <i data-lucide="alert-octagon" class="w-4 h-4"></i> Records Identified for Permanent Deletion:
          </span>
          <span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
            ${matchingVisits.length} Visits + ${matchingOrders.length} Orders
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Planned Calls:</span>
            <strong class="text-amber-400 font-mono text-sm">${plannedCount}</strong>
          </div>
          <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Completed Calls:</span>
            <strong class="text-emerald-400 font-mono text-sm">${completedCount}</strong>
          </div>
          <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Missed/Unplanned:</span>
            <strong class="text-sky-400 font-mono text-sm">${unplannedCount}</strong>
          </div>
          <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px]">Orders Booked:</span>
            <strong class="text-rose-400 font-mono text-sm">${matchingOrders.length} <span class="text-[10px] text-slate-400 font-normal">(${formatCurrency(ordersVal)} AED)</span></strong>
          </div>
        </div>
        <div class="text-[10px] text-slate-400">
          Scope: <strong>${repDesc}</strong> • Period: ${dateDesc}
        </div>
      </div>
    `;
  }
  safeLucide();
};

window.togglePurgeSubmitBtn = function() {
  const chk = document.getElementById('purgeConfirmCheckbox');
  const btn = document.getElementById('purgeExecuteBtn');
  if (btn) {
    btn.disabled = !chk || !chk.checked;
  }
};

window.handleManagerPurgeSubmit = async function() {
  if (!state.currentUser || state.currentUser.role !== 'manager') {
    showToast('Unauthorized', 'Only Senior Sales Manager can execute pilot data resets.', 'error');
    return;
  }

  const { matchingVisits, matchingOrders, repScope, isRange, singleDate, dateFrom, dateTo } = getPurgeMatchingRecords();

  if (matchingVisits.length === 0 && matchingOrders.length === 0) {
    showToast('Nothing to Purge', 'No records match the selected scope.', 'info');
    return;
  }

  const btn = document.getElementById('purgeExecuteBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Purging Cloud & Local...`;
  }

  const visitIds = matchingVisits.map(v => v.id);
  const orderNumbers = matchingOrders.map(o => o.invoiceNumber || o.orderNumber).filter(Boolean);

  // 1. Remove from in-memory state
  const visitIdSet = new Set(visitIds);
  const orderNumSet = new Set(orderNumbers);

  state.visits = (state.visits || []).filter(v => !visitIdSet.has(v.id));
  state.orders = (state.orders || []).filter(o => !orderNumSet.has(o.invoiceNumber) && !orderNumSet.has(o.orderNumber));

  // Also clean up notifications relating to these orders/visits
  if (orderNumbers.length > 0 || visitIds.length > 0) {
    state.notifications = (state.notifications || []).filter(n => {
      const txt = (n.title || '') + ' ' + (n.itemsSummary || '') + ' ' + (n.message || '');
      for (const on of orderNumbers) {
        if (txt.includes(on)) return false;
      }
      return true;
    });
  }

  // 2. Persist to localStorage immediately
  persistData();

  // 3. Cloud DELETE from Supabase
  try {
    // Delete order items in batches
    if (orderNumbers.length > 0) {
      for (let i = 0; i < orderNumbers.length; i += 20) {
        const chunk = orderNumbers.slice(i, i + 20);
        await supabaseRest(`order_items?order_number=in.(${chunk.join(',')})`, { method: 'DELETE' });
        await supabaseRest(`orders?invoice_number=in.(${chunk.join(',')})`, { method: 'DELETE' });
      }
    }

    // Delete visits in batches
    if (visitIds.length > 0) {
      for (let i = 0; i < visitIds.length; i += 20) {
        const chunk = visitIds.slice(i, i + 20);
        await supabaseRest(`visits?id=in.(${chunk.join(',')})`, { method: 'DELETE' });
      }
    }
    updateCloudSyncBadge('connected', '⚡ Cloud Synced');
  } catch (err) {
    console.warn('Supabase purge error:', err);
  }

  closeManagerPurgeModal();
  renderAll();

  const periodLabel = isRange ? `${dateFrom} to ${dateTo}` : singleDate;
  showToast(
    'Data Reset Successful',
    `Permanently purged ${matchingVisits.length} visits and ${matchingOrders.length} orders for ${periodLabel}.`,
    'success'
  );
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
// 8B. FREE EDIT PLANNED VISITS (DOCTOR, TIME WINDOW, GOALS, DATE & CANCELLATION)
// =========================================================================

window.openAmendPlannedModal = function(visitId) {
  const visit = (state.visits || []).find(v => v.id === visitId);
  if (!visit) {
    showToast('Visit Not Found', 'Could not locate the planned visit details.', 'error');
    return;
  }

  if (visit.status === 'Completed') {
    showToast('Already Completed', 'This visit report has already been executed and completed.', 'info');
    return;
  }

  const modal = document.getElementById('amendPlannedVisitModal');
  if (!modal) {
    console.error('amendPlannedVisitModal not found in DOM');
    return;
  }

  document.getElementById('amendVisitId').value = visit.id;
  const clinicEl = document.getElementById('amendClinicName');
  if (clinicEl) clinicEl.textContent = `${visit.clientName} (${visit.clientCode})`;
  const repEl = document.getElementById('amendRepTerritory');
  if (repEl) repEl.textContent = `Rep ${visit.repId || 'T1'} • ${visit.location || 'UAE'}`;

  const todayStr = getSyncedTodayDate();
  const dateInput = document.getElementById('amendDate');
  if (dateInput) {
    // Medical reps can freely keep current date or reschedule
    dateInput.value = visit.date || todayStr;
    dateInput.min = visit.date < todayStr ? visit.date : todayStr;
  }
  const noticeEl = document.getElementById('amendEarliestNotice');
  if (noticeEl) {
    noticeEl.textContent = `Current Plan Date: ${visit.date}`;
  }

  const slotInput = document.getElementById('amendTimeSlot');
  if (slotInput) slotInput.value = visit.timeSlot || 'Morning Round (09:00 - 12:00)';
  const docInput = document.getElementById('amendDoctorName');
  if (docInput) docInput.value = visit.doctorName || '';
  const purpInput = document.getElementById('amendPurpose');
  if (purpInput) purpInput.value = visit.purpose || '';
  const reasonInput = document.getElementById('amendReason');
  if (reasonInput) reasonInput.value = visit.amendmentReason || '';

  modal.classList.remove('hidden');
  safeLucide();
};
window.openEditPlannedModal = window.openAmendPlannedModal;

window.closeAmendPlannedModal = function() {
  const modal = document.getElementById('amendPlannedVisitModal');
  if (modal) modal.classList.add('hidden');
};

window.handleDeletePlannedVisit = async function() {
  const visitId = document.getElementById('amendVisitId').value;
  const visit = (state.visits || []).find(v => v.id === visitId);
  if (!visit) return;

  if (!confirm(`Are you sure you want to remove the planned call for "${visit.clientName}" on ${visit.date}?`)) {
    return;
  }

  // Remove from state
  const idx = (state.visits || []).findIndex(v => v.id === visitId);
  if (idx !== -1) {
    state.visits.splice(idx, 1);
  }
  persistData();

  // Cloud delete from Supabase
  try {
    await supabaseRest(`visits?id=eq.${visitId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Supabase delete planned visit warning:', err);
  }

  closeAmendPlannedModal();
  renderAll();
  showToast('Plan Removed', `Visit for ${visit.clientName} removed from schedule.`, 'info');
};

window.handleAmendPlannedVisitSubmit = async function(e) {
  e.preventDefault();
  const visitId = document.getElementById('amendVisitId').value;
  const visit = (state.visits || []).find(v => v.id === visitId);
  if (!visit) return;

  const newDate = document.getElementById('amendDate').value;
  if (!newDate) {
    showToast('Date Required', 'Please select a valid scheduled date.', 'error');
    return;
  }

  const oldDate = visit.date;
  const oldTimeSlot = visit.timeSlot;
  const newTimeSlot = document.getElementById('amendTimeSlot').value;
  const newDoctor = document.getElementById('amendDoctorName').value.trim();
  const newPurpose = document.getElementById('amendPurpose').value.trim();
  const reason = document.getElementById('amendReason').value.trim();

  // Update in-memory visit
  visit.date = newDate;
  visit.timeSlot = newTimeSlot;
  if (newDoctor) visit.doctorName = newDoctor;
  if (newPurpose) visit.purpose = newPurpose;
  visit.amendedAt = new Date().toISOString();
  visit.amendedBy = state.currentUser ? state.currentUser.name : 'Representative';
  if (reason) visit.amendmentReason = reason;

  persistData();

  // Cloud write-through to Supabase
  supabaseRest('visits', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapVisitToDb(visit)
  });

  // Notification for Senior Manager
  const repName = state.currentUser ? state.currentUser.name : `Rep ${visit.repId}`;
  const notif = {
    id: `NOTIF-AMEND-${Date.now()}`,
    type: 'PLAN_AMENDED',
    title: `Planned Call Updated: ${visit.clientName}`,
    orderNumber: visit.clientCode,
    repId: visit.repId,
    repName: repName,
    clientCode: visit.clientCode,
    clientName: visit.clientName,
    location: visit.location,
    timestamp: new Date().toISOString(),
    read: false,
    approvalStatus: 'Updated',
    itemsSummary: `${repName} updated planned call to ${visit.clientName} on ${newDate} (${newTimeSlot}). Doctor: ${newDoctor || visit.doctorName || 'Doctor'}.${reason ? ` Notes: ${reason}` : ''}`
  };
  state.notifications.unshift(notif);
  persistData();

  supabaseRest('notifications', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: mapNotifToDb(notif)
  });

  closeAmendPlannedModal();
  renderAll();
  showToast('Planned Visit Amended', `Visit for ${visit.clientName} successfully rescheduled to ${newDate} (${newTimeSlot}).`, 'success');
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
      `Unplanned visits can ONLY be logged for the active day of execution (${state.dailyDate}). You cannot plan an unplanned visit for future dates. Future visits must be scheduled at least 24 hours (1 day) in advance via the Monthly Planner.`,
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
  const minDateStr = getMinPlannedDate();
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
        title="Date: ${dateStr}${isEligibleToPlan ? ' • Click to view or plan target' : ' • Notice: 24h advance rule applies'}"
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
  const minDateStr = getMinPlannedDate();
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
            ${isEligibleToPlan ? '<span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">Advance Notice Met (>= 1 Day)</span>' : '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">Planned Day</span>'}
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
            Under 1-day planning advance rule.
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
                <div class="flex items-center gap-1.5">
                  <button type="button" onclick="openAmendPlannedModal('${v.id}')" class="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 touch-manipulation" title="Freely edit target doctor, time round, or detailing goals">
                    <i data-lucide="edit-3" class="w-3 h-3 text-cyan-400"></i> Edit Plan
                  </button>
                  <button type="button" onclick="openSubmitPlannedModal('${v.id}')" class="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 touch-manipulation">
                    <i data-lucide="clipboard-check" class="w-3 h-3"></i> Execute
                  </button>
                </div>
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
  const minDateStr = getMinPlannedDate();
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
                      <button type="button" onclick="openAmendPlannedModal('${v.id}')" class="px-2.5 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 touch-manipulation" title="Freely edit target doctor, time round, or detailing goals">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5 text-cyan-400"></i> Edit Plan
                      </button>
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
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Start scheduling target accounts for this month (24-hour advance notice applies).</p>
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
              <button type="button" onclick="openAmendPlannedModal('${v.id}')" class="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 active:scale-95 touch-manipulation" title="Freely edit plan (doctor, round, goals)">
                <i data-lucide="edit-3" class="w-3.5 h-3.5 text-cyan-400"></i> Edit Plan
              </button>
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
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="openAmendPlannedModal('${v.id}')" class="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 touch-manipulation" title="Freely edit plan (doctor, round, goals)">
                <i data-lucide="edit-3" class="w-3 h-3 text-cyan-400"></i> Edit Plan
              </button>
              <button onclick="openSubmitPlannedModal('${v.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95 touch-manipulation">
                <i data-lucide="clipboard-check" class="w-3 h-3"></i> Execute
              </button>
            </div>
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

  // Enforce 1-day (24h) advance planning rule
  const minDateStr = getMinPlannedDate();
  const planDateInput = document.getElementById('planDate');
  if (planDateInput) {
    planDateInput.min = minDateStr;
    if (preferredDate && preferredDate >= minDateStr) {
      planDateInput.value = preferredDate;
    } else {
      planDateInput.value = minDateStr;
      if (preferredDate && preferredDate < minDateStr) {
        showToast(
          '1-Day Advance Notice Required',
          `The selected date (${preferredDate}) does not meet the 1-day advance planning rule. Adjusted to earliest allowed date (${minDateStr}).`,
          'warning'
        );
      }
    }
  }
  const noticeEl = document.getElementById('planEarliestNotice');
  if (noticeEl) {
    noticeEl.textContent = `${minDateStr} (+1 day / 24h advance)`;
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
  const minDateStr = getMinPlannedDate();
  if (date < minDateStr) {
    showToast(
      '1-Day Advance Rule Violation',
      `Cannot schedule planned visit on ${date}. Under Conceptors SOP, monthly plan visits must be entered at least 1 day in advance (earliest allowed: ${minDateStr}). For earlier dates or today, please log an Unplanned Visit.`,
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
      (o.clientCode && o.clientCode.toLowerCase().includes(searchQ)) ||
      (o.accountCode && o.accountCode.toLowerCase().includes(searchQ)) ||
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
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ✓ Approved
            </span>
          ` : (o.approvalStatus === 'Rejected' ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ✕ Rejected
            </span>
          ` : `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ⏳ Pending Review
            </span>
          `)}
        </td>
        <td class="py-3 px-3 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <button onclick="openWhatsappOrderShare('${o.invoiceNumber}')" class="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95" title="Share Order to WhatsApp">
              <i data-lucide="message-circle" class="w-3 h-3 text-emerald-400"></i> WA
            </button>
            <button onclick="viewNotificationEmailByOrder('${o.invoiceNumber}')" class="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1" title="View Executive Dispatched Email">
              <i data-lucide="mail" class="w-3 h-3"></i> View Email
            </button>
            ${state.currentUser && state.currentUser.role === 'manager' ? `
              ${!isApproved ? `
                <button onclick="approveOrderDirect('${o.invoiceNumber}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm" title="Authorize & Release Order">
                  <i data-lucide="check" class="w-3 h-3"></i> Authorize
                </button>
              ` : ''}
              <button onclick="openAmendOrderModal('${o.invoiceNumber}')" class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shadow-sm" title="Amend Order Quantities / Items (Zero Duplication)">
                <i data-lucide="edit-3" class="w-3 h-3"></i> Amend
              </button>
              ${o.approvalStatus !== 'Rejected' ? `
                <button onclick="rejectOrderDirect('${o.invoiceNumber}')" class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 shadow-sm" title="Reject Order (Zero Duplication)">
                  <i data-lucide="x" class="w-3 h-3"></i> Reject
                </button>
              ` : ''}
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
  state.editingOrderInvoiceNumber = null;
  const numInput = document.getElementById('orderNumber');
  if (numInput) {
    numInput.removeAttribute('readonly');
    numInput.classList.remove('bg-slate-800', 'cursor-not-allowed');
  }
  const modalTitle = document.getElementById('orderModalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = `<i data-lucide="shopping-bag" class="w-5 h-5 text-indigo-400 inline mr-2"></i> Book Commercial Field Sales Order`;
  }
  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4 mr-1"></i> Submit Order & Alert Senior Managers`;
    submitBtn.className = 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2';
  }

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

window.openAmendOrderModal = function(orderNum) {
  const order = state.orders.find(o => o.invoiceNumber === orderNum);
  if (!order) {
    showToast('Order Not Found', `Cannot locate order #${orderNum} to amend.`, 'error');
    return;
  }

  state.editingOrderInvoiceNumber = orderNum;

  // Set rep
  const repSelect = document.getElementById('orderRepSelect');
  if (repSelect) {
    repSelect.disabled = false;
    repSelect.innerHTML = state.reps.map(r => `<option value="${r.id}" ${r.id === order.repId ? 'selected' : ''}>${r.name} (${r.territory})</option>`).join('');
  }

  filterOrderClinics();

  // Set client
  const clientCode = order.clientCode || order.accountCode;
  if (clientCode) {
    selectCustomerCombobox('order', clientCode);
  }

  // Lock order reference number so it cannot be altered, ensuring zero duplication
  const numInput = document.getElementById('orderNumber');
  if (numInput) {
    numInput.value = order.invoiceNumber;
    numInput.setAttribute('readonly', 'true');
    numInput.classList.add('bg-slate-800', 'cursor-not-allowed');
  }

  // Set date, terms, urgency
  const dateInput = document.getElementById('orderDate');
  if (dateInput) dateInput.value = order.date || state.dailyDate;

  const termsSelect = document.getElementById('orderPaymentTerms');
  if (termsSelect) termsSelect.value = order.paymentTerms || '30 Days Credit';

  const urgencySelect = document.getElementById('orderDeliveryUrgency');
  if (urgencySelect) urgencySelect.value = order.deliveryUrgency || 'Normal (48h)';

  // Populate line items
  const linesBody = document.getElementById('orderLineItemsBody');
  if (linesBody) {
    linesBody.innerHTML = '';
    const items = order.items || [];
    if (items.length > 0) {
      items.forEach(it => {
        addOrderLineItem(it.productCode, it.salesQty, it.focQty);
      });
    } else {
      addOrderLineItem('VR030', 10, 2);
    }
  }

  recalculateOrderTotals();

  // Update modal title & submit button
  const modalTitle = document.getElementById('orderModalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-amber-400 inline mr-2"></i> Amend Order <span class="font-mono text-amber-300">#${order.invoiceNumber}</span>`;
  }
  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4 mr-1"></i> Save Order Amendments (No Duplicate)`;
    submitBtn.className = 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2';
  }

  document.getElementById('fieldOrderModal').classList.remove('hidden');
  safeLucide();
};

window.closeOrderModal = function() {
  const m = document.getElementById('fieldOrderModal');
  if (m) m.classList.add('hidden');
  closeCustomerCombobox('order');
  state.editingOrderInvoiceNumber = null;
  const numInput = document.getElementById('orderNumber');
  if (numInput) {
    numInput.removeAttribute('readonly');
    numInput.classList.remove('bg-slate-800', 'cursor-not-allowed');
  }
  const modalTitle = document.getElementById('orderModalTitle');
  if (modalTitle) {
    modalTitle.innerHTML = `<i data-lucide="shopping-bag" class="w-5 h-5 text-indigo-400 inline mr-2"></i> Book Commercial Field Sales Order`;
  }
  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4 mr-1"></i> Submit Order & Alert Senior Managers`;
    submitBtn.className = 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2';
  }
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

  const isAmending = !!state.editingOrderInvoiceNumber;

  if (isAmending) {
    const existingOrder = state.orders.find(o => o.invoiceNumber === state.editingOrderInvoiceNumber);
    if (existingOrder) {
      existingOrder.date = date;
      existingOrder.repId = repId;
      existingOrder.repName = repObj ? repObj.name : `Rep ${repId}`;
      existingOrder.clientCode = clientCode;
      existingOrder.accountCode = clientCode;
      existingOrder.clientName = customer ? customer.name : clientCode;
      existingOrder.location = customer ? customer.location : 'UAE';
      existingOrder.territory = repId;
      existingOrder.paymentTerms = paymentTerms;
      existingOrder.deliveryUrgency = deliveryUrgency;
      existingOrder.items = items;
      existingOrder.totalExcVat = subtotal;
      existingOrder.vatAmount = vatAmount;
      existingOrder.totalIncVat = totalIncVat;
      existingOrder.amendedAt = new Date().toISOString();
      existingOrder.amendedBy = (state.currentUser && state.currentUser.name) || 'Dr. Sameh Ageez (Senior Sales Manager)';
    }

    const notif = state.notifications.find(n => n.orderNumber === state.editingOrderInvoiceNumber);
    if (notif) {
      notif.totalExcVat = subtotal;
      notif.totalIncVat = totalIncVat;
      notif.itemsSummary = items.map(i => `${i.productName} (${i.salesQty} Sls${i.focQty > 0 ? ` + ${i.focQty} FOC` : ''})`).join(', ');
      notif.paymentTerms = paymentTerms;
      notif.deliveryUrgency = deliveryUrgency;
      notif.items = items;
      notif.clientCode = clientCode;
      notif.accountCode = clientCode;
      notif.clientName = customer ? customer.name : clientCode;
    }

    persistData();

    const amendedOrder = existingOrder || { invoiceNumber: state.editingOrderInvoiceNumber, totalIncVat };

    // Cloud write-through to Google Drive (upsertOrderRow overwrites in-place by invoice number)
    pushToGoogleDrive('ADD_ORDER', {
      order: amendedOrder,
      user: (state.currentUser && state.currentUser.name) || 'Senior Manager'
    });

    // Cloud write-through to Supabase
    (async () => {
      try {
        await supabaseRest(`orders?invoice_number=eq.${encodeURIComponent(amendedOrder.invoiceNumber)}`, {
          method: 'PATCH',
          body: mapOrderToDb(amendedOrder)
        });
        await supabaseRest(`order_items?order_invoice_number=eq.${encodeURIComponent(amendedOrder.invoiceNumber)}`, {
          method: 'DELETE'
        });
        for (const it of items) {
          await supabaseRest('order_items', {
            method: 'POST',
            body: {
              order_invoice_number: amendedOrder.invoiceNumber,
              order_number: amendedOrder.invoiceNumber,
              product_code: it.productCode,
              product_name: it.productName,
              unit_price: it.unitPrice,
              sales_qty: it.salesQty,
              foc_qty: it.focQty,
              line_total: it.total,
              total_price: it.total
            }
          });
        }
        updateCloudSyncBadge('connected', '⚡ Cloud Synced');
      } catch (err) {
        console.warn('Amended order Supabase sync warning:', err);
      }
    })();

    const amendedInvoiceNum = state.editingOrderInvoiceNumber;
    closeOrderModal();

    showToast(
      'Order Amended',
      `Order #${amendedInvoiceNum} amended successfully. Quantities and terms updated without creating duplicate orders.`,
      'success'
    );

    renderAll();
    return;
  }

  const newOrder = {
    invoiceNumber: orderNumber,
    orderNumber: orderNumber,
    date,
    repId,
    repName: repObj ? repObj.name : `Rep ${repId}`,
    clientCode,
    accountCode: clientCode,
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
    accountCode: clientCode,
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

  // Dispatch to external mobile channels immediately (WhatsApp, ntfy iOS lock-screen push & Webhook)
  if (typeof sendWhatsappOrderAlert === 'function') {
    sendWhatsappOrderAlert(newOrder, items);
  }
  if (typeof sendNtfyOrderAlert === 'function') {
    sendNtfyOrderAlert(newOrder, items);
  }
  if (typeof sendWebhookOrderAlert === 'function') {
    sendWebhookOrderAlert(newOrder, items);
  }

  if (typeof triggerManagerOrderAlert === 'function') {
    triggerManagerOrderAlert(newOrder);
  } else {
    if (state.managerSettings.soundAlert) playNotificationChime();
    if (state.managerSettings.toastAlert) {
      showToast(
        `🚨 New Order #${orderNumber} Submitted!`,
        `${newOrder.repName} booked an order for ${newOrder.clientName} [Account: ${clientCode}] (${newOrder.location}) totaling ${formatCurrency(totalIncVat)} AED.`,
        'success',
        {
          label: 'Send to Dr. Sameh on WhatsApp',
          onClick: `openWhatsappOrderShare('${orderNumber}')`
        }
      );
    }
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
                Booked by <strong class="text-white">${escapeHtml(n.repName)}</strong> for <span class="text-sky-300 font-bold">${escapeHtml(n.clientName)}</span> ${(n.accountCode || n.clientCode) ? `<span class="text-teal-300 font-mono font-bold text-[10px] ml-1 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-500/30">${escapeHtml(n.accountCode || n.clientCode)}</span>` : ''} (${n.location || 'UAE'})
              </p>
              ${n.itemsSummary ? `<p class="text-[10px] text-slate-400 mt-1 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">${escapeHtml(n.itemsSummary)}</p>` : ''}
            </div>
          </div>

          <div class="text-right shrink-0">
            ${n.totalIncVat > 0 ? `<div class="font-black text-emerald-400 text-sm">${formatCurrency(n.totalIncVat)} AED</div>` : ''}
            <span class="text-[10px] text-slate-400 block">${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ${isApproved ? `
              <span class="text-[10px] font-bold text-emerald-400 block mt-1">✓ Approved</span>
            ` : (n.approvalStatus === 'Rejected' ? `
              <span class="text-[10px] font-bold text-rose-400 block mt-1">✕ Rejected</span>
            ` : `
              <span class="text-[10px] font-bold text-amber-400 block mt-1">⏳ Pending Review</span>
            `)}
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div class="text-[10px] text-slate-400">
            <span>Payment: <strong class="text-slate-200">${n.paymentTerms || 'Credit'}</strong></span>
            <span class="mx-1">•</span>
            <span>Delivery: <strong class="text-amber-300">${n.deliveryUrgency || 'Normal'}</strong></span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <button onclick="viewNotificationEmail('${n.id}')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1">
              <i data-lucide="mail" class="w-3 h-3"></i> View Dispatched Email
            </button>
            ${state.currentUser && state.currentUser.role === 'manager' && n.type === 'ORDER_SUBMITTED' ? `
              ${!isApproved ? `
                <button onclick="approveOrderFromNotification('${n.id}', '${n.orderNumber}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm" title="Authorize & Release Order">
                  <i data-lucide="check" class="w-3 h-3"></i> Authorize
                </button>
              ` : ''}
              <button onclick="openAmendOrderModal('${n.orderNumber}')" class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 shadow-sm" title="Amend Order Quantities / Items (Zero Duplication)">
                <i data-lucide="edit-3" class="w-3 h-3"></i> Amend
              </button>
              ${n.approvalStatus !== 'Rejected' ? `
                <button onclick="rejectOrderFromNotification('${n.id}', '${n.orderNumber}')" class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 shadow-sm" title="Reject Order (Zero Duplication)">
                  <i data-lucide="x" class="w-3 h-3"></i> Reject
                </button>
              ` : ''}
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

window.rejectOrderFromNotification = function(notifId, orderNum) {
  const notif = state.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.approvalStatus = 'Rejected';
    notif.read = true;
  }
  rejectOrderDirect(orderNum);
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

  // If email modal is open, refresh it
  const emailModal = document.getElementById('viewEmailModal');
  if (emailModal && !emailModal.classList.contains('hidden')) {
    viewNotificationEmailByOrder(orderNum);
  }
};

window.rejectOrderDirect = function(orderNum, reason = null) {
  const order = state.orders.find(o => o.invoiceNumber === orderNum);
  if (!order) {
    showToast('Order Not Found', `Cannot locate order #${orderNum}.`, 'error');
    return;
  }

  let rejectReason = reason;
  if (!rejectReason) {
    const inputReason = prompt(`Reject Commercial Order #${orderNum}?\nEnter reason for rejection (optional):`, 'Commercial adjustment / pricing review');
    if (inputReason === null) return;
    rejectReason = inputReason.trim() || 'Rejected by Senior Sales Manager';
  }

  const managerName = (state.currentUser && state.currentUser.name) || 'Dr. Sameh Ageez (Senior Sales Manager)';
  const nowIso = new Date().toISOString();

  order.approvalStatus = 'Rejected';
  order.approvedBy = null;
  order.approvedAt = null;
  order.rejectedBy = managerName;
  order.rejectedAt = nowIso;
  order.rejectionReason = rejectReason;

  const notif = state.notifications.find(n => n.orderNumber === orderNum);
  if (notif) {
    notif.approvalStatus = 'Rejected';
    notif.read = true;
    notif.rejectionReason = rejectReason;
  }

  persistData();

  // Cloud write-through to Google Drive
  pushToGoogleDrive('UPDATE_ORDER_STATUS', {
    invoiceNumber: orderNum,
    status: 'Rejected',
    approvedBy: managerName,
    rejectionReason: rejectReason
  });

  // Cloud write-through to Supabase
  supabaseRest(`orders?invoice_number=eq.${encodeURIComponent(orderNum)}`, {
    method: 'PATCH',
    body: {
      approval_status: 'Rejected',
      approved_by: managerName,
      approved_at: nowIso,
      updated_at: nowIso
    }
  });

  if (notif) {
    supabaseRest(`notifications?order_number=eq.${encodeURIComponent(orderNum)}`, {
      method: 'PATCH',
      body: { approval_status: 'Rejected', read: true }
    });
  }

  showToast('Order Rejected', `Order #${orderNum} marked as Rejected without duplicating order records.`, 'warning');
  renderAll();

  // If email modal is open for this order, refresh its preview
  const emailModal = document.getElementById('viewEmailModal');
  if (emailModal && !emailModal.classList.contains('hidden')) {
    viewNotificationEmailByOrder(orderNum);
  }
};

window.viewNotificationEmailByOrder = function(orderNum) {
  const notif = state.notifications.find(n => n.orderNumber === orderNum);
  const order = state.orders.find(o => o.invoiceNumber === orderNum);
  if (!order && !notif) return;

  const targetOrder = order || {
    invoiceNumber: notif.orderNumber,
    date: notif.timestamp ? notif.timestamp.split('T')[0] : getSyncedTodayDate(),
    clientCode: notif.clientCode || notif.accountCode,
    accountCode: notif.accountCode || notif.clientCode,
    clientName: notif.clientName,
    location: notif.location,
    territory: notif.repId,
    totalExcVat: notif.totalExcVat,
    vatAmount: ((notif.totalIncVat || 0) - (notif.totalExcVat || 0)),
    totalIncVat: notif.totalIncVat,
    approvalStatus: notif.approvalStatus || 'Pending',
    paymentTerms: notif.paymentTerms,
    deliveryUrgency: notif.deliveryUrgency,
    items: notif.items || []
  };

  const repName = targetOrder.repName || (notif ? notif.repName : `Rep ${targetOrder.repId}`);
  const html = generateExecutiveEmailHtml(targetOrder, repName);
  const previewEl = document.getElementById('emailPreviewContent');
  if (previewEl) previewEl.innerHTML = html;

  const toEmail = state.managerSettings.managerEmails || 's.ageez@the-conceptors.com';
  const ccEmail = state.managerSettings.managerCcEmails || 'a.tharayil@the-conceptors.com';
  const ccText = ccEmail ? ` (CC: ${ccEmail})` : '';
  const recipientEl = document.getElementById('emailRecipientHeader');
  if (recipientEl) recipientEl.textContent = `Dispatched to: ${toEmail}${ccText}`;

  // Update status badge
  const badge = document.getElementById('emailModalStatusBadge');
  if (badge) {
    if (targetOrder.approvalStatus === 'Approved') {
      badge.textContent = '✓ Approved';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else if (targetOrder.approvalStatus === 'Rejected') {
      badge.textContent = '✕ Rejected';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
    } else {
      badge.textContent = '⏳ Dispatched';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
  }

  // Configure action toolbar buttons
  const btnWa = document.getElementById('btnWhatsappShareAction');
  if (btnWa) {
    btnWa.onclick = () => openWhatsappOrderShare(targetOrder.invoiceNumber);
  }

  const btnResend = document.getElementById('btnResendEmailAction');
  if (btnResend) {
    const accountCode = targetOrder.accountCode || targetOrder.clientCode || '';
    const accountTag = accountCode ? ` [Account: ${accountCode}]` : '';
    const subject = encodeURIComponent(`[CONCEPTORS ORDER ALERT] New Field Order #${targetOrder.invoiceNumber} - ${targetOrder.clientName}${accountTag} (${formatCurrency(targetOrder.totalIncVat)} AED)`);
    const body = encodeURIComponent(`Senior Management Team,\n\nA new commercial sales order was submitted by ${repName}.\n\nOrder Ref: #${targetOrder.invoiceNumber}\nClient: ${targetOrder.clientName}\nAccount Code: ${accountCode || 'N/A'}\nLocation: ${targetOrder.location}\nNet Total: ${formatCurrency(targetOrder.totalIncVat)} AED (Incl. 5% VAT)\n\nPlease review and authorize.`);
    btnResend.onclick = () => {
      const ccParam = ccEmail ? `&cc=${encodeURIComponent(ccEmail)}` : '';
      window.open(`mailto:${toEmail}?subject=${subject}${ccParam}&body=${body}`, '_blank');
    };
  }

  const isManager = state.currentUser && state.currentUser.role === 'manager';
  const btnAuth = document.getElementById('btnModalAuthorizeOrder');
  if (btnAuth) {
    if (isManager && targetOrder.approvalStatus !== 'Approved') {
      btnAuth.classList.remove('hidden');
      btnAuth.onclick = () => {
        approveOrderDirect(targetOrder.invoiceNumber);
      };
    } else {
      btnAuth.classList.add('hidden');
    }
  }

  const btnAmend = document.getElementById('btnModalAmendOrder');
  if (btnAmend) {
    if (isManager) {
      btnAmend.classList.remove('hidden');
      btnAmend.onclick = () => {
        closeEmailModal();
        openAmendOrderModal(targetOrder.invoiceNumber);
      };
    } else {
      btnAmend.classList.add('hidden');
    }
  }

  const btnReject = document.getElementById('btnModalRejectOrder');
  if (btnReject) {
    if (isManager && targetOrder.approvalStatus !== 'Rejected') {
      btnReject.classList.remove('hidden');
      btnReject.onclick = () => {
        rejectOrderDirect(targetOrder.invoiceNumber);
      };
    } else {
      btnReject.classList.add('hidden');
    }
  }

  const modal = document.getElementById('viewEmailModal');
  if (modal) modal.classList.remove('hidden');
  safeLucide();
};

window.viewNotificationEmail = function(notifId) {
  const notif = state.notifications.find(n => n.id === notifId);
  if (!notif) return;
  viewNotificationEmailByOrder(notif.orderNumber);
};

window.closeEmailModal = function() {
  const m = document.getElementById('viewEmailModal');
  if (m) m.classList.add('hidden');
};

function generateExecutiveEmailHtml(order, repName) {
  const isDay = !document.documentElement.classList.contains('dark') || (window.state && window.state.theme === 'light');
  const items = order.items || [];
  const status = order.approvalStatus || 'Pending';
  const isApproved = status === 'Approved';
  const isRejected = status === 'Rejected';

  // Colors based on theme
  const bgCard = isDay ? '#ffffff' : '#070d19';
  const borderCard = isDay ? '#cbd5e1' : '#334155';
  const bgHeader = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
  const bgMeta = isDay ? '#f8fafc' : '#0f172a';
  const borderMeta = isDay ? '#e2e8f0' : '#1e293b';
  const labelColor = isDay ? '#64748b' : '#94a3b8';
  const textPrimary = isDay ? '#0f172a' : '#f8fafc';
  const textMuted = isDay ? '#475569' : '#cbd5e1';
  const bgTableHead = isDay ? '#f1f5f9' : '#1e293b';
  const textTableHead = isDay ? '#475569' : '#94a3b8';
  const borderRow = isDay ? '#e2e8f0' : '#1e293b';
  const bgTotalBox = isDay ? '#f8fafc' : '#0f172a';
  const borderTotalBox = isDay ? '#e2e8f0' : '#1e293b';
  const grandTotalColor = isDay ? '#059669' : '#34d399';
  const footerBorder = isDay ? '#e2e8f0' : '#1e293b';

  let statusBadgeHtml = '';
  if (isApproved) {
    statusBadgeHtml = '<span style="display: inline-block; padding: 6px 12px; background: #10b981; color: #ffffff; border-radius: 8px; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;">✓ AUTHORIZED & APPROVED</span>';
  } else if (isRejected) {
    statusBadgeHtml = '<span style="display: inline-block; padding: 6px 12px; background: #ef4444; color: #ffffff; border-radius: 8px; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;">✕ REJECTED ORDER</span>';
  } else {
    statusBadgeHtml = '<span style="display: inline-block; padding: 6px 12px; background: #f59e0b; color: #ffffff; border-radius: 8px; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;">⏳ PENDING AUTHORIZATION</span>';
  }

  const rowsHtml = items.map(it => `
    <tr style="border-bottom: 1px solid ${borderRow};">
      <td style="padding: 10px 8px; font-weight: 700; color: ${textPrimary};">${escapeHtml(it.productName || it.productCode)}</td>
      <td style="padding: 10px 8px; text-align: right; color: ${textMuted}; font-family: monospace;">${formatCurrency(it.unitPrice)} AED</td>
      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #0284c7;">${it.salesQty}</td>
      <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: #d97706;">${it.focQty > 0 ? `+${it.focQty} FOC` : '0'}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: ${grandTotalColor}; font-family: monospace;">${formatCurrency(it.total)} AED</td>
    </tr>
  `).join('');

  return `
    <div style="max-width: 680px; margin: 0 auto; background: ${bgCard}; border: 1px solid ${borderCard}; border-radius: 16px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);">
      <div style="background: ${bgHeader}; padding: 22px 24px; color: #ffffff;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; background: rgba(255,255,255,0.22); padding: 4px 10px; border-radius: 20px; display: inline-block;">Automated Executive Alert</span>
            <h2 style="margin: 8px 0 2px 0; font-size: 20px; font-weight: 800; color: #ffffff;">Conceptors Animal Health LLC</h2>
            <p style="margin: 0; font-size: 12px; color: #e0f2fe; opacity: 0.95;">Catalysis Spain • BARD Czech • Vitasigna • Ringbio</p>
          </div>
          <div style="text-align: right;">
            ${statusBadgeHtml}
            <div style="font-size: 13px; font-family: monospace; font-weight: bold; margin-top: 5px; color: #ffffff;">#${escapeHtml(order.invoiceNumber)}</div>
          </div>
        </div>
      </div>

      <div style="padding: 20px; background: ${bgMeta}; border-bottom: 1px solid ${borderMeta};">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; font-size: 12px;">
          <div>
            <span style="color: ${labelColor}; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Medical Representative</span>
            <strong style="color: #0284c7; font-size: 13px;">${escapeHtml(repName)}</strong>
          </div>
          <div>
            <span style="color: ${labelColor}; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Veterinary Clinic / Partner</span>
            <strong style="color: ${textPrimary}; font-size: 13px;">${escapeHtml(order.clientName)}</strong>
            <span style="display: block; color: ${textMuted}; font-size: 11px; margin-top: 2px;">Account Code: <strong style="color: #0284c7; font-family: monospace;">${escapeHtml(order.accountCode || order.clientCode || 'N/A')}</strong> • ${escapeHtml(order.location || 'UAE')}</span>
          </div>
          <div>
            <span style="color: ${labelColor}; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Order Date</span>
            <span style="color: ${textPrimary}; font-weight: 600;">${order.date}</span>
          </div>
          <div>
            <span style="color: ${labelColor}; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px;">Commercial Terms & Delivery</span>
            <span style="color: #d97706; font-weight: 700;">${escapeHtml(order.paymentTerms || '30 Days Credit')} • ${escapeHtml(order.deliveryUrgency || 'Normal (48h)')}</span>
          </div>
        </div>
        ${isRejected && order.rejectionReason ? `
          <div style="margin-top: 14px; padding: 10px 14px; background: ${isDay ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'}; border: 1px solid #f87171; border-radius: 8px; color: #b91c1c; font-size: 11px;">
            <strong>Rejection Reason:</strong> ${escapeHtml(order.rejectionReason)}
            ${order.rejectedBy ? `<span style="display: block; margin-top: 2px; color: #dc2626;">By: ${escapeHtml(order.rejectedBy)}</span>` : ''}
          </div>
        ` : ''}
        ${isApproved && order.approvedBy ? `
          <div style="margin-top: 14px; padding: 10px 14px; background: ${isDay ? '#d1fae5' : 'rgba(16, 185, 129, 0.15)'}; border: 1px solid #34d399; border-radius: 8px; color: #047857; font-size: 11px;">
            <strong>Authorized By:</strong> ${escapeHtml(order.approvedBy)}
          </div>
        ` : ''}
      </div>

      <div style="padding: 20px;">
        <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${labelColor}; font-weight: 700;">Itemized Commercial Products</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: ${bgTableHead}; color: ${textTableHead}; text-transform: uppercase; font-size: 10px; font-weight: 700;">
                <th style="padding: 10px 8px; text-align: left;">Product SKU</th>
                <th style="padding: 10px 8px; text-align: right;">Unit Price</th>
                <th style="padding: 10px 8px; text-align: center;">Sales Qty</th>
                <th style="padding: 10px 8px; text-align: center;">Bonus FOC</th>
                <th style="padding: 10px 8px; text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="5" style="text-align: center; padding: 14px; color: ${labelColor};">No products listed</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 20px; padding: 16px; background: ${bgTotalBox}; border-radius: 12px; border: 1px solid ${borderTotalBox};">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: ${labelColor}; margin-bottom: 6px;">
            <span>Subtotal (Excl. VAT):</span>
            <span style="font-weight: 700; color: ${textPrimary}; font-family: monospace;">${formatCurrency(order.totalExcVat)} AED</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: ${labelColor}; margin-bottom: 6px;">
            <span>Standard UAE VAT (5%):</span>
            <span style="font-weight: 700; color: ${textPrimary}; font-family: monospace;">${formatCurrency(order.vatAmount)} AED</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: ${textPrimary}; padding-top: 10px; border-top: 1px solid ${borderTotalBox};">
            <span>Grand Total Net (Incl. VAT):</span>
            <span style="color: ${grandTotalColor}; font-size: 18px; font-weight: 800; font-family: monospace;">${formatCurrency(order.totalIncVat)} AED</span>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid ${footerBorder}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 11px; color: ${labelColor};">Conceptors CRM Senior Manager Dispatch Engine</span>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${state.currentUser && state.currentUser.role === 'manager' ? `
              ${!isApproved ? `
                <button type="button" onclick="approveOrderDirect('${escapeHtml(order.invoiceNumber)}')" style="background: #10b981; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  ✓ Authorize
                </button>
              ` : ''}
              <button type="button" onclick="closeEmailModal(); openAmendOrderModal('${escapeHtml(order.invoiceNumber)}');" style="background: #f59e0b; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                ✏️ Amend Order
              </button>
              ${!isRejected ? `
                <button type="button" onclick="rejectOrderDirect('${escapeHtml(order.invoiceNumber)}')" style="background: #ef4444; color: #ffffff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  ✕ Reject Order
                </button>
              ` : ''}
            ` : ''}
          </div>
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
            <span class="text-[11px] text-slate-500 font-semibold">Account Inactive (Frozen)</span>
            ${state.currentUser && state.currentUser.role === 'manager' ? `
              <button type="button" onclick="toggleAccountFreeze('${c.code}')" class="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm" title="Reactivate this clinic account">
                <i data-lucide="flame" class="w-3.5 h-3.5 text-orange-400"></i> Unfreeze Account
              </button>
            ` : '<span class="text-[10px] text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/60">Manager Controlled</span>'}
          ` : `
            <div class="flex items-center gap-1.5">
              <button onclick="openPlanVisitModalForClient('${c.code}', '${c.repId}')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition-colors">
                Plan Visit
              </button>
              <button onclick="openUnplannedVisitModal('${c.repId}', '${c.code}')" class="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors">
                <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i> + Unplanned
              </button>
            </div>
            ${state.currentUser && state.currentUser.role === 'manager' ? `
              <button type="button" onclick="toggleAccountFreeze('${c.code}')" class="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors" title="Freeze this account">
                <i data-lucide="snowflake" class="w-3 h-3 text-cyan-400"></i> Freeze
              </button>
            ` : ''}
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
  if (!state.currentUser || state.currentUser.role !== 'manager') {
    showToast('Permission Denied', 'Only the Senior Sales Manager is authorized to add new clinic accounts.', 'error');
    return;
  }

  const modal = document.getElementById('addAccountModal');
  if (!modal) {
    console.error('addAccountModal not found in DOM');
    return;
  }

  const form = document.getElementById('addAccountForm');
  if (form) form.reset();

  const terrSelect = document.getElementById('newAccountTerritory');
  let userTerritory = 'T1';
  if (state.currentUser) {
    if (state.currentUser.role === 'rep_t1') userTerritory = 'T1';
    else if (state.currentUser.role === 'rep_t2') userTerritory = 'T2';
    else userTerritory = state.currentUser.territory || 'T1';
  }
  if (userTerritory === 'ALL') userTerritory = 'T1';

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
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  safeLucide();
};

window.closeAddAccountModal = function() {
  const modal = document.getElementById('addAccountModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }
};

window.generateClinicCode = function() {
  const terrSelect = document.getElementById('newAccountTerritory');
  let terr = terrSelect ? terrSelect.value : (state.currentUser?.territory || 'T1');
  if (!terr || terr === 'ALL') terr = 'T1';
  const prefix = terr === 'T2' ? 'AC' : 'DC';

  // Find existing max numeric code with prefix
  let maxNum = 900;
  (state.customers || []).forEach(c => {
    if (c && c.code && typeof c.code === 'string' && c.code.toUpperCase().startsWith(prefix)) {
      const num = parseInt(c.code.slice(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  const nextCode = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
  const codeInput = document.getElementById('newAccountCode');
  if (codeInput) codeInput.value = nextCode;
};

window.handleAddAccountSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();

  try {
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
    let assignedTerritory = terrSelect?.value || (state.currentUser?.territory || 'T1');
    if (!assignedTerritory || assignedTerritory === 'ALL') assignedTerritory = 'T1';
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
    const existing = (state.customers || []).find(c => c && c.code && c.code.toUpperCase() === code);
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
      contactPerson: contactPerson || 'Lead Veterinarian',
      phone: phone || '',
      address: address || '',
      notes: notes || '',
      isActive: true
    };

    // Add to local state
    state.customers.unshift(newCust);
    persistData();

    // Cloud write-through to Supabase
    try {
      supabaseRest('customers', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: mapCustomerToDb(newCust)
      });
    } catch(err) {
      console.warn('Customer cloud sync skipped:', err);
    }

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
      itemsSummary: `New ${newCust.tier} account added by ${repName} in ${newCust.location}. Dr: ${newCust.contactPerson}. Tel: ${newCust.phone || 'N/A'}.`
    };

    state.notifications.unshift(notif);
    persistData();

    // Cloud write-through notification to Supabase
    try {
      supabaseRest('notifications', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: mapNotifToDb(notif)
      });
    } catch(err) {
      console.warn('Notification cloud sync skipped:', err);
    }

    if (state.managerSettings && state.managerSettings.soundAlert && typeof playNotificationChime === 'function') {
      playNotificationChime();
    }
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
  } catch (ex) {
    console.error('Error submitting add account form:', ex);
    showToast('Submission Error', ex.message, 'error');
  }
};

window.toggleAccountFreeze = async function(clientCode) {
  if (!state.currentUser || state.currentUser.role !== 'manager') {
    showToast('Permission Denied', 'Only the Senior Sales Manager is authorized to freeze or reactivate clinic accounts.', 'error');
    return;
  }

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

  const dateFrom = state.filters.analyticsDateFrom || '';
  const dateTo = state.filters.analyticsDateTo || '';

  const inRange = (d) => {
    if (!d) return false;
    const dateStr = String(d).slice(0, 10);
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  };

  const allVisits = (state.visits || []).filter(v => {
    if (v.status !== 'Completed') return false;
    if (repKey !== 'ALL' && v.repId !== repKey && v.territory !== repKey) return false;
    return inRange(v.date);
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
    return inRange(pv.date);
  });
  const completedPlanned = completedVisits.filter(v => v.isPlanned);
  const totalPlannedCount = Math.max(plannedScheduled.length, completedPlanned.length);
  const adherencePct = totalPlannedCount > 0 ? ((completedPlanned.length / totalPlannedCount) * 100) : 0;

  // Unplanned calls
  const unplannedVisits = completedVisits.filter(v => !v.isPlanned);
  const unplannedRatio = completedVisits.length > 0 ? ((unplannedVisits.length / completedVisits.length) * 100) : 0;

  // Commercial revenue & orders (exclude Rejected)
  const orders = (state.orders || []).filter(o => {
    if (repKey !== 'ALL' && o.repId !== repKey && o.territory !== repKey) return false;
    if (o.approvalStatus === 'Rejected') return false;
    return inRange(o.date);
  });
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.grandTotal || o.totalIncVat) || 0), 0);
  const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length) : 0;

  const orderVisits = completedVisits.filter(v => {
    if (v.orderPlaced) return true;
    if (v.orderData && (v.orderData.grandTotal > 0 || v.orderData.totalIncVat > 0)) {
      if (v.orderData.approvalStatus !== 'Rejected') return true;
    }
    return false;
  });
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
  const activeTimeframe = state.filters.analyticsTimeframe || 'SEP_2026';
  const curFrom = state.filters.analyticsDateFrom || '2026-09-01';
  const curTo = state.filters.analyticsDateTo || '2026-09-30';

  // Synchronize Calendar Inputs & Preset Dropdown if not currently focused
  const dateFromInput = document.getElementById('analyticsDateFrom');
  const dateToInput = document.getElementById('analyticsDateTo');
  const presetSelect = document.getElementById('analyticsTimeframeSelect');
  if (dateFromInput && document.activeElement !== dateFromInput) {
    dateFromInput.value = curFrom;
  }
  if (dateToInput && document.activeElement !== dateToInput) {
    dateToInput.value = curTo;
  }
  if (presetSelect && document.activeElement !== presetSelect) {
    presetSelect.value = activeTimeframe;
  }

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
  const dateRangeLabel = curFrom && curTo ? `${curFrom} to ${curTo}` : (curFrom ? `From ${curFrom}` : (curTo ? `Up to ${curTo}` : 'All Time'));

  if (headingEl && repPillEl) {
    if (isManager) {
      if (activeRep === 'ALL') {
        headingEl.textContent = 'National Territory Performance & Field Benchmarking';
        repPillEl.textContent = 'National Overview (Shaimaa & Marsel)';
        repPillEl.className = 'px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold';
        if (subtitleEl) subtitleEl.textContent = `Period: ${dateRangeLabel} • Consolidated territory coverage, call frequency, plan compliance, and commercial yield for Dr. Sameh Ageez`;
      } else if (activeRep === 'T1') {
        headingEl.textContent = 'Territory 1 Analytics — Shaimaa';
        repPillEl.textContent = 'Shaimaa • Territory 1 (Dubai / Abu Dhabi / Al Ain)';
        repPillEl.className = 'px-2.5 py-0.5 rounded-full badge-t1 text-[10px] font-bold';
        if (subtitleEl) subtitleEl.textContent = `Period: ${dateRangeLabel} • Detailed territory audit for Shaimaa (Dubai, Abu Dhabi, Al Ain)`;
      } else {
        headingEl.textContent = 'Territory 2 Analytics — Marsel';
        repPillEl.textContent = 'Marsel • Territory 2 (Northern Emirates)';
        repPillEl.className = 'px-2.5 py-0.5 rounded-full badge-t2 text-[10px] font-bold';
        if (subtitleEl) subtitleEl.textContent = `Period: ${dateRangeLabel} • Detailed territory audit for Marsel (Sharjah, Ajman, RAK, Fujairah, UAQ)`;
      }
    } else {
      const repName = user.name || (userTerritory === 'T1' ? 'Shaimaa' : 'Marsel');
      headingEl.textContent = `${escapeHtml(repName)}'s Field Performance & Territory Analytics`;
      repPillEl.textContent = userTerritory === 'T1' ? 'Shaimaa • Territory 1 (Dubai / AUH / Al Ain)' : 'Marsel • Territory 2 (Northern Emirates)';
      repPillEl.className = `px-2.5 py-0.5 rounded-full ${userTerritory === 'T1' ? 'badge-t1' : 'badge-t2'} text-[10px] font-bold`;
      if (subtitleEl) subtitleEl.textContent = `Period: ${dateRangeLabel} • Real-time personal call frequency, account coverage, plan adherence, and order strike metrics`;
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
  const dateFrom = state.filters.analyticsDateFrom || '';
  const dateTo = state.filters.analyticsDateTo || '';

  const inRange = (d) => {
    if (!d) return false;
    const dateStr = String(d).slice(0, 10);
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  };

  const q = (state.filters.analyticsRosterSearch || '').toLowerCase().trim();
  const filterType = state.filters.analyticsRosterFilter || 'ALL';

  // Accounts list based on rep filter
  const accounts = (state.customers || []).filter(c => {
    if (activeRep === 'ALL') return true;
    return c.repId === activeRep || c.territory === activeRep || c.territoryId === activeRep;
  });

  // Calculate visits and orders per account in selected period
  const visits = (state.visits || []).filter(v => {
    if (v.status !== 'Completed') return false;
    return inRange(v.date);
  });

  const orders = (state.orders || []).filter(o => {
    if (o.approvalStatus === 'Rejected') return false;
    return inRange(o.date);
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

window.handleAnalyticsPresetChange = function(preset) {
  state.filters.analyticsTimeframe = preset;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (preset === 'SEP_2026') {
    state.filters.analyticsDateFrom = '2026-09-01';
    state.filters.analyticsDateTo = '2026-09-30';
  } else if (preset === 'OCT_2026') {
    state.filters.analyticsDateFrom = '2026-10-01';
    state.filters.analyticsDateTo = '2026-10-31';
  } else if (preset === 'THIS_MONTH') {
    const firstDay = `${yyyy}-${mm}-01`;
    const lastDayNum = new Date(yyyy, now.getMonth() + 1, 0).getDate();
    const lastDay = `${yyyy}-${mm}-${String(lastDayNum).padStart(2, '0')}`;
    state.filters.analyticsDateFrom = firstDay;
    state.filters.analyticsDateTo = lastDay;
  } else if (preset === 'LAST_30') {
    const past = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const py = past.getFullYear();
    const pm = String(past.getMonth() + 1).padStart(2, '0');
    const pd = String(past.getDate()).padStart(2, '0');
    state.filters.analyticsDateFrom = `${py}-${pm}-${pd}`;
    state.filters.analyticsDateTo = todayStr;
  } else if (preset === 'TODAY') {
    state.filters.analyticsDateFrom = todayStr;
    state.filters.analyticsDateTo = todayStr;
  } else if (preset === 'ALL_TIME') {
    state.filters.analyticsDateFrom = '';
    state.filters.analyticsDateTo = '';
  }

  // Update calendar inputs in DOM if present
  const fromEl = document.getElementById('analyticsDateFrom');
  const toEl = document.getElementById('analyticsDateTo');
  if (fromEl) fromEl.value = state.filters.analyticsDateFrom;
  if (toEl) toEl.value = state.filters.analyticsDateTo;

  renderAnalyticsDashboard();
};

window.handleAnalyticsTimeframeChange = window.handleAnalyticsPresetChange;

window.handleAnalyticsDateRangeChange = function() {
  const fromEl = document.getElementById('analyticsDateFrom');
  const toEl = document.getElementById('analyticsDateTo');
  const presetEl = document.getElementById('analyticsTimeframeSelect');

  const fromVal = fromEl ? fromEl.value : '';
  const toVal = toEl ? toEl.value : '';

  state.filters.analyticsDateFrom = fromVal;
  state.filters.analyticsDateTo = toVal;
  state.filters.analyticsTimeframe = 'CUSTOM';
  if (presetEl) presetEl.value = 'CUSTOM';

  renderAnalyticsDashboard();
};

window.exportAnalyticsPeriodCSV = function() {
  const isManager = state.currentUser && state.currentUser.role === 'manager';
  const userTerritory = state.currentUser ? (state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : (state.currentUser.role === 'rep_t2' ? 'T2' : 'ALL'))) : 'ALL';
  const activeRep = isManager ? (state.filters.analyticsRepFilter || 'ALL') : userTerritory;
  
  const m = calculateRepMetrics(activeRep, state.filters.analyticsTimeframe);
  const curFrom = state.filters.analyticsDateFrom || 'AllTime';
  const curTo = state.filters.analyticsDateTo || 'AllTime';
  const periodLabel = `${curFrom}_to_${curTo}`;
  const repLabel = activeRep === 'ALL' ? 'National' : (activeRep === 'T1' ? 'Shaimaa_T1' : 'Marsel_T2');

  const rows = [];
  rows.push(['CONCEPTORS VETERINARY CRM - EXECUTIVE FIELD ANALYTICS & KPI REPORT']);
  rows.push(['Report Period', `"${curFrom} to ${curTo}"`]);
  rows.push(['Territory / Rep Filter', `"${repLabel}"`]);
  rows.push(['Generated By', `"${state.currentUser?.name || 'Authorized User'}"`]);
  rows.push(['Generated At', `"${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })} GST"`]);
  rows.push([]);

  // Section 1: KPI Summary Scorecard
  rows.push(['--- EXECUTIVE KPI SCORECARD ---']);
  rows.push(['Metric Name', 'Value', 'Unit / Benchmark', 'Detail']);
  rows.push(['Account Universe', m.totalAccounts, 'Clinics / Pharmacies', 'Total accounts assigned']);
  rows.push(['Accounts Covered', m.uniqueVisitedCount, 'Clinics Visited', `${m.coveragePct.toFixed(1)}% Coverage`]);
  rows.push(['Customer Coverage Rate', `${m.coveragePct.toFixed(1)}%`, 'Target >= 85%', `${m.uniqueVisitedCount} of ${m.totalAccounts} accounts reached`]);
  rows.push(['Completed Field Visits', m.completedVisitsCount, 'Visits Conducted', `${m.callFrequency.toFixed(2)} calls per covered account`]);
  rows.push(['Call Frequency', `${m.callFrequency.toFixed(2)}x`, 'Calls/Account', 'Call repetition intensity']);
  rows.push(['Planned Calls Scheduled', m.plannedScheduledCount, 'Calls in Plan', 'Monthly plan target']);
  rows.push(['Planned Calls Completed', m.completedPlannedCount, 'Visits', 'Plan execution count']);
  rows.push(['Plan Adherence Rate', `${m.adherencePct.toFixed(1)}%`, 'Target >= 85%', `${m.completedPlannedCount} of ${m.plannedScheduledCount} planned calls`]);
  rows.push(['Unplanned / Ad-hoc Calls', m.unplannedVisitsCount, 'Calls', `${m.unplannedRatio.toFixed(1)}% of total visits`]);
  rows.push(['Sampling Strike Rate', `${m.samplingStrikeRate.toFixed(1)}%`, 'Visits with Samples', `${m.samplingVisitsCount} sampling interactions`]);
  rows.push(['Order Strike Rate', `${m.orderStrikeRate.toFixed(1)}%`, 'Visits with Orders', `${m.orderVisitsCount} commercial conversions`]);
  rows.push(['Total Booked Orders', m.ordersCount, 'Purchase Orders', 'Approved/Pending orders in period']);
  rows.push(['Gross Booked Revenue (AED)', m.totalRevenue.toFixed(2), 'AED Total Inc VAT', 'Commercial yield (excluding rejected)']);
  rows.push(['Average Order Value (AED)', m.avgOrderValue.toFixed(2), 'AED / Order', 'Transaction average']);
  rows.push([]);

  // Section 2: Manager Head-to-Head Benchmark (if Manager)
  if (isManager && activeRep === 'ALL') {
    const m1 = calculateRepMetrics('T1', state.filters.analyticsTimeframe);
    const m2 = calculateRepMetrics('T2', state.filters.analyticsTimeframe);
    rows.push(['--- HEAD-TO-HEAD TERRITORY BENCHMARK ---']);
    rows.push(['Performance Metric', 'Shaimaa (T1 - Dubai/AUH/Al Ain)', 'Marsel (T2 - Northern Emirates)', 'National Total']);
    rows.push(['Account Universe', `${m1.totalAccounts} accounts`, `${m2.totalAccounts} accounts`, `${m1.totalAccounts + m2.totalAccounts} accounts`]);
    rows.push(['Coverage Rate', `${m1.coveragePct.toFixed(1)}% (${m1.uniqueVisitedCount}/${m1.totalAccounts})`, `${m2.coveragePct.toFixed(1)}% (${m2.uniqueVisitedCount}/${m2.totalAccounts})`, `${((m1.uniqueVisitedCount + m2.uniqueVisitedCount) / Math.max(1, m1.totalAccounts + m2.totalAccounts) * 100).toFixed(1)}%`]);
    rows.push(['Completed Visits', m1.completedVisitsCount, m2.completedVisitsCount, m1.completedVisitsCount + m2.completedVisitsCount]);
    rows.push(['Call Frequency', `${m1.callFrequency.toFixed(2)}x`, `${m2.callFrequency.toFixed(2)}x`, `${((m1.completedVisitsCount + m2.completedVisitsCount) / Math.max(1, m1.uniqueVisitedCount + m2.uniqueVisitedCount)).toFixed(2)}x`]);
    rows.push(['Plan Adherence', `${m1.adherencePct.toFixed(1)}%`, `${m2.adherencePct.toFixed(1)}%`, `${((m1.completedPlannedCount + m2.completedPlannedCount) / Math.max(1, m1.plannedScheduledCount + m2.plannedScheduledCount) * 100).toFixed(1)}%`]);
    rows.push(['Unplanned Ratio', `${m1.unplannedRatio.toFixed(1)}%`, `${m2.unplannedRatio.toFixed(1)}%`, `${((m1.unplannedVisitsCount + m2.unplannedVisitsCount) / Math.max(1, m1.completedVisitsCount + m2.completedVisitsCount) * 100).toFixed(1)}%`]);
    rows.push(['Sampling Strike Rate', `${m1.samplingStrikeRate.toFixed(1)}%`, `${m2.samplingStrikeRate.toFixed(1)}%`, `${((m1.samplingVisitsCount + m2.samplingVisitsCount) / Math.max(1, m1.completedVisitsCount + m2.completedVisitsCount) * 100).toFixed(1)}%`]);
    rows.push(['Order Strike Rate', `${m1.orderStrikeRate.toFixed(1)}%`, `${m2.orderStrikeRate.toFixed(1)}%`, `${((m1.orderVisitsCount + m2.orderVisitsCount) / Math.max(1, m1.completedVisitsCount + m2.completedVisitsCount) * 100).toFixed(1)}%`]);
    rows.push(['Total Booked Orders', m1.ordersCount, m2.ordersCount, m1.ordersCount + m2.ordersCount]);
    rows.push(['Gross Booked Revenue (AED)', m1.totalRevenue.toFixed(2), m2.totalRevenue.toFixed(2), (m1.totalRevenue + m2.totalRevenue).toFixed(2)]);
    rows.push([]);
  }

  // Section 3: Itemized Account Performance Table
  rows.push(['--- ITEMIZED ACCOUNT ROSTER PERFORMANCE ---']);
  rows.push([
    'Account Code', 'Clinic Name', 'Contact Person', 'Territory', 'Medical Rep',
    'Location / City', 'Tier', 'Period Visits Count', 'Coverage Status',
    'Last Visit Date', 'Period Orders Count', 'Period Revenue (AED)'
  ]);

  const dateFrom = state.filters.analyticsDateFrom || '';
  const dateTo = state.filters.analyticsDateTo || '';
  const inRange = (d) => {
    if (!d) return false;
    const dateStr = String(d).slice(0, 10);
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  };

  const periodVisits = (state.visits || []).filter(v => v.status === 'Completed' && inRange(v.date));
  const periodOrders = (state.orders || []).filter(o => o.approvalStatus !== 'Rejected' && inRange(o.date));

  m.accounts.forEach(acc => {
    const accVisits = periodVisits.filter(v => (v.customerCode === acc.code || v.clientCode === acc.code));
    const sortedVisits = [...accVisits].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastVisit = sortedVisits[0];
    const accOrders = periodOrders.filter(o => (o.customerCode === acc.code || o.clientCode === acc.code));
    const totalOrderVal = accOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.totalIncVat) || 0), 0);
    const accTerritory = acc.repId || acc.territory || 'T1';

    rows.push([
      `"${acc.code}"`,
      `"${(acc.name || '').replace(/"/g, '""')}"`,
      `"${(acc.contactPerson || acc.doctor || '').replace(/"/g, '""')}"`,
      `"${accTerritory}"`,
      `"${accTerritory === 'T1' ? 'Shaimaa' : 'Marsel'}"`,
      `"${(acc.location || acc.city || 'UAE').replace(/"/g, '""')}"`,
      `"${acc.tier || 'Silver'}"`,
      accVisits.length,
      accVisits.length > 0 ? 'Covered' : 'Unreached',
      `"${lastVisit ? lastVisit.date : 'Never'}"`,
      accOrders.length,
      totalOrderVal.toFixed(2)
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\r\n');
  const filename = `Conceptors_Analytics_KPI_${repLabel}_${periodLabel}.csv`;
  downloadCsvFile(filename, csvContent);
  showToast('📥 Analytics Period CSV Exported', `Generated KPI & performance report for ${periodLabel}.`, 'success');
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

window.openIosAlertGuideModal = function() {
  const m = document.getElementById('iosAlertGuideModal');
  if (m) m.classList.remove('hidden');
  safeLucide();
};

window.closeIosAlertGuideModal = function() {
  const m = document.getElementById('iosAlertGuideModal');
  if (m) m.classList.add('hidden');
};

window.openManagerSettingsModal = function() {
  const emailsInput = document.getElementById('settingsManagerEmails');
  let currentEmails = state.managerSettings.managerEmails || 's.ageez@the-conceptors.com';
  if (currentEmails.includes('@conceptors.ae')) {
    currentEmails = 's.ageez@the-conceptors.com';
    state.managerSettings.managerEmails = currentEmails;
  }
  if (emailsInput) emailsInput.value = currentEmails;
  
  const ccEmailsInput = document.getElementById('settingsManagerCcEmails');
  if (ccEmailsInput) ccEmailsInput.value = state.managerSettings.managerCcEmails || 'a.tharayil@the-conceptors.com';

  const soundInput = document.getElementById('settingsSoundAlert');
  if (soundInput) soundInput.checked = state.managerSettings.soundAlert !== false;

  const toastInput = document.getElementById('settingsToastAlert');
  if (toastInput) toastInput.checked = state.managerSettings.toastAlert !== false;

  const whatsappPhoneInput = document.getElementById('settingsWhatsappPhone');
  if (whatsappPhoneInput) whatsappPhoneInput.value = state.managerSettings.whatsappPhone || '+971 52 533 3329';

  const whatsappApiKeyInput = document.getElementById('settingsWhatsappApiKey');
  if (whatsappApiKeyInput) whatsappApiKeyInput.value = state.managerSettings.whatsappApiKey || '';

  const ntfyTopicInput = document.getElementById('settingsNtfyTopic');
  if (ntfyTopicInput) ntfyTopicInput.value = state.managerSettings.ntfyTopic || 'conceptors-orders-sameh';

  const webhookInput = document.getElementById('settingsWebhookUrl');
  if (webhookInput) webhookInput.value = state.managerSettings.webhookUrl || '';

  const modal = document.getElementById('managerSettingsModal');
  if (modal) modal.classList.remove('hidden');
  if (typeof updateMobilePushBadge === 'function') updateMobilePushBadge();
  safeLucide();
};

window.closeManagerSettingsModal = function() {
  const m = document.getElementById('managerSettingsModal');
  if (m) m.classList.add('hidden');
};

window.handleSaveManagerSettings = function(e) {
  e.preventDefault();
  const emails = document.getElementById('settingsManagerEmails')?.value.trim();
  const ccEmails = document.getElementById('settingsManagerCcEmails')?.value.trim();
  const sound = document.getElementById('settingsSoundAlert')?.checked;
  const toast = document.getElementById('settingsToastAlert')?.checked;
  const whatsappPhone = document.getElementById('settingsWhatsappPhone')?.value.trim();
  const whatsappApiKey = document.getElementById('settingsWhatsappApiKey')?.value.trim();
  const ntfyTopic = document.getElementById('settingsNtfyTopic')?.value.trim();
  const webhook = document.getElementById('settingsWebhookUrl')?.value.trim();

  state.managerSettings = {
    ...state.managerSettings,
    managerEmails: emails || 's.ageez@the-conceptors.com',
    managerCcEmails: ccEmails || 'a.tharayil@the-conceptors.com',
    soundAlert: Boolean(sound),
    toastAlert: Boolean(toast),
    whatsappPhone: whatsappPhone || '+971 52 533 3329',
    whatsappApiKey: whatsappApiKey || '',
    ntfyTopic: ntfyTopic || 'conceptors-orders-sameh',
    webhookUrl: webhook || ''
  };

  persistData();

  // Cloud write-through to Supabase
  supabaseRest('manager_settings', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: {
      id: 'default',
      manager_emails: state.managerSettings.managerEmails,
      manager_cc_emails: state.managerSettings.managerCcEmails,
      sound_alert: state.managerSettings.soundAlert,
      toast_alert: state.managerSettings.toastAlert,
      whatsapp_phone: state.managerSettings.whatsappPhone,
      updated_at: new Date().toISOString()
    }
  });

  closeManagerSettingsModal();
  showToast('Settings Saved', 'Senior manager notification preferences & mobile channels updated.', 'success');
};

// =========================================================================
// 15B. WHATSAPP & NTFY MOBILE PHONE ORDER ALERTS (UAE STANDARD & FREE IOS PUSH)
// =========================================================================

function formatWhatsappOrderMessage(orderData, items = []) {
  const orderNum = orderData.orderNumber || orderData.order_number || orderData.invoiceNumber || 'New Order';
  const repName = orderData.repName || orderData.rep_name || (orderData.repId ? `Rep ${orderData.repId}` : 'Medical Rep');
  let accountCode = orderData.accountCode || orderData.account_code || orderData.clientCode || orderData.client_code || '';
  if (!accountCode && orderData.clientName && Array.isArray(state.customers)) {
    const cust = state.customers.find(c => c.name === orderData.clientName || c.clientName === orderData.clientName);
    if (cust) accountCode = cust.code || cust.clientCode || '';
  }
  const clientName = orderData.clientName || orderData.client_name || 'Clinic Account';
  const location = orderData.location || 'UAE';
  const total = Number(orderData.totalIncVat || orderData.total_inc_vat || orderData.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const delivery = orderData.deliveryUrgency || orderData.delivery_urgency || 'Normal (48h)';
  const terms = orderData.paymentTerms || orderData.payment_terms || '30 Days Credit';

  let itemsText = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsText = '\n\n*📦 Itemized Products:*\n' + items.map(it => {
      const bonusStr = (it.focQty > 0 || it.foc_qty > 0) ? ` (+${it.focQty || it.foc_qty} FOC Bonus)` : '';
      return `• ${it.productName || it.product_name || it.productCode}: *${it.salesQty || it.sales_qty} units*${bonusStr}`;
    }).join('\n');
  }

  const timeStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai' });

  return `🚨 *NEW CONCEPTORS FIELD ORDER*
━━━━━━━━━━━━━━━━━━━━━━━
📋 *Invoice:* #${orderNum}
👤 *Representative:* ${repName}
🏥 *Clinic Account:* ${clientName}
🏷️ *Account Code:* ${accountCode || 'N/A'}
📍 *Location:* ${location}
💰 *Net Total:* *${total} AED* (Incl. 5% VAT)
⏱️ *Delivery Urgency:* ${delivery}
💳 *Payment Terms:* ${terms}${itemsText}
━━━━━━━━━━━━━━━━━━━━━━━
📅 ${timeStr} GST
⚡ _Conceptors Field Sales CRM • Senior Manager Push_`;
}

window.openWhatsappOrderShare = function(orderNumber) {
  let order = (state.orders || []).find(o => (o.orderNumber === orderNumber || o.invoiceNumber === orderNumber));
  if (!order) {
    order = (state.notifications || []).find(n => n.orderNumber === orderNumber);
  }
  const items = order?.order_items || order?.items || [];
  const text = formatWhatsappOrderMessage(order || { orderNumber }, items);
  
  const rawPhone = state.managerSettings?.whatsappPhone || '+971 52 533 3329';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  
  const targetUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  
  window.open(targetUrl, '_blank');
};

window.sendWhatsappOrderAlert = async function(orderData, items = []) {
  const phone = state.managerSettings?.whatsappPhone;
  const apiKey = state.managerSettings?.whatsappApiKey;

  if (!phone) {
    console.info('[WhatsApp Alert] No Senior Manager WhatsApp phone configured.');
    return { success: false, reason: 'no_phone' };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const text = formatWhatsappOrderMessage(orderData, items);

  if (apiKey) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
      await fetch(url, { method: 'GET', mode: 'no-cors' });
      console.info('[WhatsApp Alert] Dispatched automated WhatsApp alert via CallMeBot gateway to:', cleanPhone);
      return { success: true };
    } catch (err) {
      console.warn('[WhatsApp Alert] Background CallMeBot dispatch error:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: true, manualRequired: true };
};

window.testWhatsappPhoneAlert = async function() {
  const phoneInput = document.getElementById('settingsWhatsappPhone')?.value.trim() || state.managerSettings?.whatsappPhone;
  const apiKeyInput = document.getElementById('settingsWhatsappApiKey')?.value.trim() || state.managerSettings?.whatsappApiKey;

  if (!phoneInput) {
    showToast('Phone Number Required', 'Please enter Senior Manager WhatsApp phone number (e.g. +971 52 533 3329) to test.', 'warning');
    document.getElementById('settingsWhatsappPhone')?.focus();
    return;
  }

  state.managerSettings.whatsappPhone = phoneInput;
  state.managerSettings.whatsappApiKey = apiKeyInput || '';
  persistData();

  const testOrder = {
    orderNumber: 'ORD-TEST-ALERT',
    repName: 'Dr. Shaimaa (Rep T1)',
    clientCode: 'DC0340',
    accountCode: 'DC0340',
    clientName: 'Al Barsha Veterinary Clinic',
    location: 'Dubai - Al Barsha',
    totalIncVat: 2450,
    deliveryUrgency: 'Normal (48h)',
    paymentTerms: '30 Days Credit'
  };
  const testItems = [
    { productName: 'Viusid Pets 150ml', salesQty: 10, focQty: 2 },
    { productName: 'Asbrip Pets 150ml', salesQty: 5, focQty: 0 }
  ];

  const text = formatWhatsappOrderMessage(testOrder, testItems);
  const cleanPhone = phoneInput.replace(/[^0-9]/g, '');

  if (apiKeyInput) {
    showToast('Sending WhatsApp Alert...', `Dispatching automated WhatsApp message via CallMeBot to +${cleanPhone}...`, 'info');
    try {
      await fetch(`https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKeyInput)}`, {
        method: 'GET',
        mode: 'no-cors'
      });
      showToast('WhatsApp Alert Dispatched! 📲', `Test message sent to +${cleanPhone}. Check Dr. Sameh's WhatsApp on iPhone!`, 'success');
      if ('vibrate' in navigator) navigator.vibrate([300, 150, 300]);
    } catch (e) {
      showToast('WhatsApp Error', 'Could not reach WhatsApp gateway: ' + e.message, 'error');
    }
  } else {
    showToast('Opening WhatsApp...', 'Opening WhatsApp chat with test invoice summary for Dr. Sameh...', 'info');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    showToast('WhatsApp Ready 📲', 'Tapped directly into WhatsApp with formatted order summary for Senior Manager.', 'success');
  }
};

window.sendNtfyOrderAlert = async function(orderData, items = []) {
  const topic = state.managerSettings?.ntfyTopic || 'conceptors-orders-sameh';
  if (!topic) {
    console.info('[ntfy Push] No ntfy topic configured. Skipping.');
    return { success: false, reason: 'no_topic' };
  }

  const orderNum = orderData.orderNumber || orderData.order_number || orderData.invoiceNumber || 'New Order';
  const repName = orderData.repName || orderData.rep_name || (orderData.repId ? `Rep ${orderData.repId}` : 'Medical Rep');
  let accountCode = orderData.accountCode || orderData.account_code || orderData.clientCode || orderData.client_code || '';
  if (!accountCode && orderData.clientName && Array.isArray(state.customers)) {
    const cust = state.customers.find(c => c.name === orderData.clientName || c.clientName === orderData.clientName);
    if (cust) accountCode = cust.code || cust.clientCode || '';
  }
  const clientName = orderData.clientName || orderData.client_name || 'Clinic Account';
  const location = orderData.location || 'UAE';
  const total = Number(orderData.totalIncVat || orderData.total_inc_vat || orderData.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const delivery = orderData.deliveryUrgency || orderData.delivery_urgency || 'Normal (48h)';

  let itemsSummary = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsSummary = '\n' + items.slice(0, 3).map(it => `• ${it.productName || it.product_name || it.productCode}: ${it.salesQty || it.sales_qty} units`).join('\n');
    if (items.length > 3) itemsSummary += `\n...and ${items.length - 3} more items`;
  }

  const accountTag = accountCode ? ` [${accountCode}]` : '';
  const bodyText = `${repName} logged order #${orderNum} for ${clientName}${accountTag} (${location}). Net: ${total} AED (5% VAT incl). Urgency: ${delivery}.${itemsSummary}`;

  try {
    const res = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: topic,
        title: `🚨 Field Order #${orderNum} (${total} AED)`,
        message: bodyText,
        priority: 5,
        tags: ['rotating_light', 'moneybag', 'hospital'],
        click: 'https://seifawamry.github.io/Conceptors_Reporting/#orders'
      })
    });
    if (res.ok) {
      console.info('[ntfy Push] Alert published successfully to topic:', topic);
      return { success: true };
    } else {
      console.warn('[ntfy Push] ntfy server returned status:', res.status);
      return { success: false, status: res.status };
    }
  } catch (err) {
    console.warn('[ntfy Push] Network error dispatching ntfy alert:', err);
    return { success: false, error: err.message };
  }
};

window.testNtfyPhoneAlert = async function() {
  const topicInput = document.getElementById('settingsNtfyTopic')?.value.trim() || state.managerSettings?.ntfyTopic || 'conceptors-orders-sameh';
  
  if (!topicInput) {
    showToast('Topic Name Required', 'Please enter a topic name (e.g. conceptors-orders-sameh) to test.', 'warning');
    document.getElementById('settingsNtfyTopic')?.focus();
    return;
  }

  state.managerSettings.ntfyTopic = topicInput;
  persistData();

  showToast('Publishing Push Alert...', `Sending urgent chime to ntfy topic: ${topicInput}...`, 'info');

  const testOrder = {
    orderNumber: 'ORD-TEST-CHIME',
    repName: 'Dr. Shaimaa (Rep T1)',
    clientCode: 'DC0340',
    accountCode: 'DC0340',
    clientName: 'Al Barsha Veterinary Clinic',
    location: 'Dubai - Al Barsha',
    totalIncVat: 2450,
    deliveryUrgency: 'Normal (48h)'
  };
  const testItems = [
    { productName: 'Viusid Pets 150ml', salesQty: 10 },
    { productName: 'Asbrip Pets 150ml', salesQty: 5 }
  ];

  const res = await sendNtfyOrderAlert(testOrder, testItems);
  if (res.success) {
    showToast('Push Alert Delivered! 🔔', `Published to topic "${topicInput}". If you subscribed in the free "ntfy" app on your iPhone, your phone just chimed!`, 'success');
    if ('vibrate' in navigator) navigator.vibrate([300, 150, 300]);
  } else {
    showToast('Push Delivery Failed', `Error publishing alert: ${res.error || res.status || 'Network error'}`, 'error');
  }
};

window.sendWebhookOrderAlert = async function(orderData, items = []) {
  const webhookUrl = state.managerSettings?.webhookUrl;
  if (!webhookUrl) return;

  let accountCode = orderData.accountCode || orderData.account_code || orderData.clientCode || orderData.client_code || '';
  if (!accountCode && orderData.clientName && Array.isArray(state.customers)) {
    const cust = state.customers.find(c => c.name === orderData.clientName || c.clientName === orderData.clientName);
    if (cust) accountCode = cust.code || cust.clientCode || '';
  }

  const payload = {
    event: 'ORDER_SUBMITTED',
    orderNumber: orderData.orderNumber || orderData.invoiceNumber,
    repName: orderData.repName || 'Medical Rep',
    clientCode: accountCode || orderData.clientCode || '',
    accountCode: accountCode || orderData.clientCode || '',
    clientName: orderData.clientName || 'Clinic Account',
    location: orderData.location || 'UAE',
    totalIncVat: Number(orderData.totalIncVat || orderData.total || 0),
    currency: 'AED',
    deliveryUrgency: orderData.deliveryUrgency || 'Normal (48h)',
    paymentTerms: orderData.paymentTerms || '30 Days Credit',
    items: items,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.info('[Webhook Alert] Successfully posted order alert to webhook.');
  } catch (err) {
    console.warn('[Webhook Alert] Error posting order alert to webhook:', err);
  }
};

let activeWakeupOrderNumber = null;

window.showWakeupOrderBanner = function(notif) {
  const banner = document.getElementById('wakeupOrderAlertBanner');
  const textEl = document.getElementById('wakeupOrderBannerText');
  if (!banner || !notif) return;

  activeWakeupOrderNumber = notif.orderNumber;
  if (textEl) {
    const totalStr = notif.totalIncVat ? `${formatCurrency(notif.totalIncVat)} AED` : '';
    const accountCode = notif.accountCode || notif.clientCode || '';
    const accountTag = accountCode ? ` [${accountCode}]` : '';
    textEl.textContent = `${notif.orderNumber || 'New Order'} • ${notif.clientName || 'Clinic'}${accountTag}${totalStr ? ` • ${totalStr}` : ''}`;
  }
  banner.classList.remove('hidden');
  safeLucide();
};

window.dismissWakeupOrderBanner = function() {
  const banner = document.getElementById('wakeupOrderAlertBanner');
  if (banner) banner.classList.add('hidden');
};

window.inspectWakeupOrder = function() {
  dismissWakeupOrderBanner();
  switchTab('executive');
  if (activeWakeupOrderNumber) {
    const notif = (state.notifications || []).find(n => n.orderNumber === activeWakeupOrderNumber);
    if (notif && typeof viewNotificationEmail === 'function') viewNotificationEmail(notif.id);
  }
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
    accountCode: 'DC0340',
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

  if (typeof triggerManagerOrderAlert === 'function') {
    triggerManagerOrderAlert(notif);
  } else {
    if (state.managerSettings.soundAlert) playNotificationChime();
    if (state.managerSettings.toastAlert) {
      showToast(
        `🚨 TEST Order Alert #${testOrderNum}`,
        `Automated alert dispatched to Senior Managers (${state.managerSettings.managerEmails}) for 1,953.00 AED order.`,
        'success'
      );
    }
  }

  // Dispatch to external mobile channels (WhatsApp / ntfy / Webhook)
  if (typeof sendWhatsappOrderAlert === 'function') {
    sendWhatsappOrderAlert(notif, notif.items);
  }
  if (typeof sendNtfyOrderAlert === 'function') {
    sendNtfyOrderAlert(notif, notif.items);
  }
  if (typeof sendWebhookOrderAlert === 'function') {
    sendWebhookOrderAlert(notif, notif.items);
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

window.showToast = function(title, message, type = 'info', action = null) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const typeClass = (type === 'success' || type === 'warning') ? `toast-${type}` : 'toast-info';
  toast.className = `toast-item ${typeClass} pointer-events-auto p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all`;

  const iconName = type === 'success' ? 'check-circle-2' : (type === 'warning' ? 'alert-triangle' : 'info');

  let actionHtml = '';
  if (action && action.label && action.onClick) {
    actionHtml = `
      <div class="mt-2 pt-2 border-t border-slate-700/60 flex items-center gap-2">
        <button type="button" onclick="${action.onClick}; this.closest('.toast-item').remove()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform">
          <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> ${escapeHtml(action.label)}
        </button>
      </div>
    `;
  }

  toast.innerHTML = `
    <div class="toast-icon-wrapper p-2 rounded-xl shrink-0 mt-0.5">
      <i data-lucide="${iconName}" class="w-4 h-4"></i>
    </div>
    <div class="flex-1 min-w-0">
      <h5 class="toast-title text-xs font-black leading-tight">${escapeHtml(title)}</h5>
      <p class="toast-message text-[11px] mt-1 font-medium leading-relaxed">${escapeHtml(message)}</p>
      ${actionHtml}
    </div>
    <button type="button" class="toast-close-btn p-1.5 rounded-lg shrink-0 transition-colors" onclick="this.parentElement.remove()" aria-label="Dismiss notification">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  container.appendChild(toast);
  safeLucide();

  const dismissDelay = action ? 10000 : 5000;
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('dismissing');
      setTimeout(() => { toast.remove(); }, 300);
    }
  }, dismissDelay);
};

// =========================================================================
// 16B. MANAGER MOBILE PHONE ORDER ALERTS & WEB PUSH NOTIFICATION ENGINE
// =========================================================================

window.triggerManagerOrderAlert = function(orderData) {
  if (!orderData) return;

  const orderNumber = orderData.orderNumber || orderData.order_number || 'New Order';
  const repName = orderData.repName || orderData.rep_name || (orderData.repId ? `Rep ${orderData.repId}` : 'Medical Rep');
  let accountCode = orderData.accountCode || orderData.account_code || orderData.clientCode || orderData.client_code || '';
  if (!accountCode && orderData.clientName && Array.isArray(state.customers)) {
    const cust = state.customers.find(c => c.name === orderData.clientName || c.clientName === orderData.clientName);
    if (cust) accountCode = cust.code || cust.clientCode || '';
  }
  const clientName = orderData.clientName || orderData.client_name || 'Clinic Account';
  const totalIncVat = Number(orderData.totalIncVat || orderData.total_inc_vat || orderData.total || 0);
  const formattedTotal = totalIncVat > 0 ? `${totalIncVat.toLocaleString()} AED` : '';
  const accountTag = accountCode ? ` [${accountCode}]` : '';

  // 1. Mobile Phone Haptic Vibration (distinct 3-burst pulse: 300ms on, 150ms off, 300ms on, 150ms off, 450ms on)
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 450]);
    }
  } catch (e) {
    console.warn('Vibration API error:', e);
  }

  // 2. Audio Chime (if enabled in manager settings)
  if (!state.managerSettings || state.managerSettings.soundAlert !== false) {
    if (typeof playNotificationChime === 'function') {
      playNotificationChime();
    }
  }

  // 3. Web & Mobile Phone Lock-Screen Push Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notifTitle = `🚨 New Field Order: #${orderNumber}`;
      const notifBody = `${repName} closed order for ${clientName}${accountTag}${formattedTotal ? ` • ${formattedTotal}` : ''}. Tap to inspect.`;
      const notifOptions = {
        body: notifBody,
        icon: './icon-192.png',
        badge: './favicon.png',
        tag: `order-${orderNumber}`,
        renotify: true,
        vibrate: [300, 150, 300, 150, 450],
        data: { url: window.location.href, orderNumber }
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(notifTitle, notifOptions);
        }).catch(() => {
          new Notification(notifTitle, notifOptions);
        });
      } else {
        new Notification(notifTitle, notifOptions);
      }
    } catch (err) {
      console.warn('Web notification dispatch error:', err);
    }
  }

  // 4. In-App Banner Toast
  if (typeof showToast === 'function') {
    showToast(
      `🚨 New Order #${orderNumber} Submitted!`,
      `${repName} logged an order with ${clientName}${accountTag}${formattedTotal ? ` totaling ${formattedTotal}` : ''}.`,
      'success',
      {
        label: 'Open in WhatsApp',
        onClick: `openWhatsappOrderShare('${orderNumber}')`
      }
    );
  }

  // 5. Update UI bell badge and executive notification list
  if (typeof updateNotificationBell === 'function') updateNotificationBell();
  if (typeof renderManagerNotifications === 'function') renderManagerNotifications();
};

window.requestMobilePushPermissions = async function() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') {
      showToast('Notifications Unsupported', 'Your browser does not support web notifications. If using iOS Safari, tap Share > Add to Home Screen first.', 'warning');
    }
    return false;
  }

  if (Notification.permission === 'granted') {
    if (typeof showToast === 'function') {
      showToast('Phone Alerts Active', 'Lock-screen push notifications & haptic vibration are already activated!', 'success');
    }
    if ('vibrate' in navigator) navigator.vibrate([150, 80, 150]);
    updateMobilePushBadge();
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if (typeof showToast === 'function') {
        showToast('Push Alerts Activated! 🔔', 'Senior Manager will now receive lock-screen alerts & vibrations whenever an order is submitted.', 'success');
      }
      if ('vibrate' in navigator) navigator.vibrate([300, 150, 300]);
      if (typeof playNotificationChime === 'function') playNotificationChime();
      updateMobilePushBadge();
      return true;
    } else {
      if (typeof showToast === 'function') {
        showToast('Permission Blocked', 'Push notifications were declined. Enable notifications in your mobile browser site settings to receive order alerts.', 'warning');
      }
      updateMobilePushBadge();
      return false;
    }
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return false;
  }
};

window.updateMobilePushBadge = function() {
  const badge = document.getElementById('mobilePushStatusBadge');
  const btn = document.getElementById('enablePushBtn');
  const modalBadge = document.getElementById('managerModalPushStatus');

  const isSupported = ('Notification' in window);
  const isGranted = isSupported && Notification.permission === 'granted';
  const isDenied = isSupported && Notification.permission === 'denied';

  const badgeHtml = isGranted 
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i data-lucide="bell-ring" class="w-3 h-3 text-emerald-400"></i> Push Alerts ON</span>`
    : isDenied 
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30"><i data-lucide="bell-off" class="w-3 h-3 text-rose-400"></i> Alerts Blocked</span>`
    : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"><i data-lucide="bell" class="w-3 h-3 text-amber-300"></i> Push Alerts OFF</span>`;

  if (badge) badge.innerHTML = badgeHtml;
  if (modalBadge) modalBadge.innerHTML = badgeHtml;
  if (btn) {
    if (isGranted) {
      btn.innerHTML = `<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i> Push Enabled`;
      btn.className = "px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5";
    } else {
      btn.innerHTML = `<i data-lucide="bell-ring" class="w-3.5 h-3.5"></i> Enable Phone Alerts`;
      btn.className = "px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition-all";
    }
  }
  safeLucide();
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
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold text-xs border border-cyan-500/30">
          <span class="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
          Connected & Synced with Supabase Cloud (Live)
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
    syncWithSupabase(true);
    showToast('Switched to Supabase', 'Operating with Supabase Live Cloud Database.', 'info');
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
      'Account Code', 'Clinic Name', 'Location', 'Payment Terms', 'Delivery Urgency',
      'Subtotal Exc VAT (AED)', 'VAT 5% (AED)', 'Total Inc VAT (AED)', 'Approval Status', 'Approved By'
    ];
    const rows = orders.map(o => [
      `"${o.invoiceNumber}"`,
      `"${o.date || ''}"`,
      `"${o.repId || ''}"`,
      `"${o.repName || getRepName(o.repId)}"`,
      `"${o.territory || o.repId || ''}"`,
      `"${o.clientCode || o.accountCode || ''}"`,
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
      'Invoice Number', 'Order Date', 'Rep Name', 'Territory', 'Account Code',
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
          `"${o.clientCode || o.accountCode || ''}"`,
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

// =========================================================================
// 19. APP FOREGROUND RESUME & DEVICE UNLOCK WAKEUP RADAR
// =========================================================================

let lastResumeTimestamp = Date.now();
let lastAlertedWakeupId = null;

async function checkForegroundOrders() {
  const now = Date.now();
  if (now - lastResumeTimestamp < 2500) return; // Prevent rapid debounce
  lastResumeTimestamp = now;

  console.info('[Foreground Radar] App resumed in foreground or screen unlocked. Checking for recent orders...');
  
  if (typeof syncWithSupabase === 'function') {
    try {
      await syncWithSupabase(false);
    } catch (_) {}
  }

  // Check for unread orders
  const unreadOrders = (state.notifications || []).filter(n => !n.read && (n.type === 'ORDER_SUBMITTED' || n.title?.includes('Order')));
  if (unreadOrders.length > 0) {
    const latest = unreadOrders[0];
    if (latest.id !== lastAlertedWakeupId) {
      lastAlertedWakeupId = latest.id;
      if (typeof showWakeupOrderBanner === 'function') {
        showWakeupOrderBanner(latest);
      }
      if (state.managerSettings && state.managerSettings.soundAlert && typeof playNotificationChime === 'function') {
        playNotificationChime();
      }
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 450]);
      }
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkForegroundOrders();
  }
});
window.addEventListener('focus', () => {
  checkForegroundOrders();
});

