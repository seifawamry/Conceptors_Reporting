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
  loadStoredData();
  initTheme();
  checkAuthSession();
  startLiveTimeTicker();
  safeLucide();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCrmApp);
} else {
  initCrmApp();
}

function safeLucide() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
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

  const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
  state.dailyDate = storedDate || getSyncedTodayDate();
  const dateParts = (state.dailyDate || getSyncedTodayDate()).split('-');
  state.plannerCalendarYear = parseInt(dateParts[0], 10);
  state.plannerCalendarMonth = parseInt(dateParts[1], 10);

  const storedVisits = localStorage.getItem(STORAGE_KEY_VISITS);
  state.visits = storedVisits ? JSON.parse(storedVisits) : [...(window.INITIAL_VISITS || [])];

  const storedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
  state.orders = storedOrders ? JSON.parse(storedOrders) : [...(window.INITIAL_ORDERS || [])];

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
  } else {
    state.filters.analyticsRepFilter = state.currentUser.territory || (state.currentUser.role === 'rep_t1' ? 'T1' : 'T2');
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
  if (!state.currentUser) return [];
  if (state.currentUser.role === 'rep_t1') {
    return state.customers.filter(c => c.repId === 'T1' || c.territory === 'T1');
  }
  if (state.currentUser.role === 'rep_t2') {
    return state.customers.filter(c => c.repId === 'T2' || c.territory === 'T2');
  }
  return state.customers; // Manager sees all
}
window.getScopedCustomers = getScopedCustomers;

function getScopedVisits() {
  if (!state.currentUser) return [];
  if (state.currentUser.role === 'rep_t1') {
    return state.visits.filter(v => v.repId === 'T1');
  }
  if (state.currentUser.role === 'rep_t2') {
    return state.visits.filter(v => v.repId === 'T2');
  }
  return state.visits; // Manager sees all
}
window.getScopedVisits = getScopedVisits;

function getScopedOrders() {
  if (!state.currentUser) return [];
  if (state.currentUser.role === 'rep_t1') {
    return state.orders.filter(o => o.repId === 'T1' || o.territory === 'T1');
  }
  if (state.currentUser.role === 'rep_t2') {
    return state.orders.filter(o => o.repId === 'T2' || o.territory === 'T2');
  }
  return state.orders; // Manager sees all
}

function getScopedPlans() {
  if (!state.currentUser) return [];
  if (state.currentUser.role === 'rep_t1') {
    return state.monthlyPlans.filter(p => p.repId === 'T1');
  }
  if (state.currentUser.role === 'rep_t2') {
    return state.monthlyPlans.filter(p => p.repId === 'T2');
  }
  return state.monthlyPlans; // Manager sees all
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
  let list = scoped.filter(c => !repId || c.repId === repId || c.territory === repId);

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

  const tabs = ['daily', 'planner', 'reports', 'orders', 'accounts', 'analytics', 'manager'];
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

  persistData();
  closeSubmitPlannedModal();
  showToast('Planned Visit Report Submitted', `Field call report recorded for ${visit.clientName}.`, 'success');

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
  const filtered = scoped.filter(c => !repId || c.repId === repId || c.territory === repId);
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
  persistData();
  closeUnplannedVisitModal();
  showToast('⚡ Unplanned Visit Recorded', `Spontaneous visit to ${newUnplannedVisit.clientName} added beside planned schedule for ${date}.`, 'success');

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
  const tableContainer = document.getElementById('plannerTableContainer');
  const btnCal = document.getElementById('btnPlannerViewCalendar');
  const btnTable = document.getElementById('btnPlannerViewTable');

  if (mode === 'calendar') {
    if (calContainer) calContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (btnCal) {
      btnCal.className = 'px-3 py-1.5 rounded-lg font-bold bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-all';
    }
    if (btnTable) {
      btnTable.className = 'px-3 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-all';
    }
    renderPlannerCalendar();
  } else {
    if (calContainer) calContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (btnCal) {
      btnCal.className = 'px-3 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-all';
    }
    if (btnTable) {
      btnTable.className = 'px-3 py-1.5 rounded-lg font-bold bg-brand-600 text-white shadow-sm flex items-center gap-1.5 transition-all';
    }
    renderPlannerTable();
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
  renderPlannerCalendar();
};

window.jumpPlannerCurrentMonth = function() {
  const parts = (state.dailyDate || getSyncedTodayDate()).split('-');
  state.plannerCalendarYear = parseInt(parts[0], 10);
  state.plannerCalendarMonth = parseInt(parts[1], 10);
  state.plannerSelectedDay = null;
  renderPlannerCalendar();
};

window.selectPlannerCalendarDay = function(dateStr) {
  state.plannerSelectedDay = dateStr;
  renderPlannerCalendar();
  renderPlannerSelectedDayDrawer(dateStr);
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
        <div class="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
          <i data-lucide="calendar" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-extrabold text-white">Schedule for ${formatDisplayDate(dateStr)}</h4>
            ${isToday ? '<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">Today</span>' : ''}
            ${isEligibleToPlan ? '<span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">Advance Notice Met (>= 3 Days)</span>' : '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">Under 3-Day Window</span>'}
          </div>
          <p class="text-xs text-slate-400">${plannedVisits.length} planned targets scheduled for this date</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        ${isEligibleToPlan ? `
          <button onclick="openPlanVisitModal('${dateStr}')" class="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Plan Visit on ${dateStr}
          </button>
        ` : (isToday ? `
          <button onclick="openUnplannedVisitModal()" class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-yellow-200"></i> + Log Unplanned Visit for Today
          </button>
        ` : `
          <span class="text-xs text-amber-400 font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            Cannot schedule planned visit (&lt; 3 days).
          </span>
        `)}
        <button onclick="state.plannerSelectedDay = null; renderPlannerCalendar();" class="p-1.5 text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;

  if (plannedVisits.length === 0) {
    html += `
      <div class="py-6 text-center text-slate-500 text-xs">
        No planned calls scheduled for this day yet.
        ${isEligibleToPlan ? ` Click <b class="text-sky-400 cursor-pointer" onclick="openPlanVisitModal('${dateStr}')">Plan Visit on ${dateStr}</b> to schedule your first clinic target.` : ''}
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
              <p class="text-[11px] text-slate-400">${v.clientCode} • ${v.doctorName || 'Doctor'}</p>
              <p class="text-[10px] text-slate-300 mt-1 truncate">${escapeHtml(v.purpose || 'Detailing')}</p>
            </div>
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span class="text-[10px] text-slate-400 font-mono">${v.timeSlot ? v.timeSlot.split(' ')[0] : 'Day'}</span>
              ${v.status !== 'Completed' ? `
                <button onclick="openSubmitPlannedModal('${v.id}')" class="px-2 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
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

window.renderPlannerTable = function() {
  const tbody = document.getElementById('plannerTableBody');
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
    return;
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
            <button onclick="openSubmitPlannedModal('${v.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 mx-auto">
              <i data-lucide="clipboard-check" class="w-3 h-3"></i> Execute
            </button>
          ` : `
            <span class="text-xs text-slate-500 font-bold">Executed</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
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
  const filtered = scoped.filter(c => !repId || c.repId === repId || c.territory === repId);
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
  persistData();
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
  const filtered = scoped.filter(c => !repId || c.repId === repId || c.territory === repId);
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

  if (searchQ) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(searchQ) ||
      c.code.toLowerCase().includes(searchQ) ||
      c.location.toLowerCase().includes(searchQ) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQ))
    );
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500">No veterinary accounts match current search.</div>';
    return;
  }

  const allVisits = state.visits || [];

  container.innerHTML = list.map(c => {
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
      <div class="glass-card rounded-xl p-4 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-start justify-between gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.repId === 'T1' ? 'badge-t1' : 'badge-t2'}">${c.repId}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}">${c.tier}</span>
          </div>
          <h4 class="font-bold text-white text-sm mt-2 truncate" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h4>
          <p class="text-[11px] text-slate-400">${c.code} • ${c.location}</p>

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

          <div class="mt-2 text-[11px] text-slate-300">
            <span class="text-slate-500">Contact Doctor:</span> ${escapeHtml(c.contactPerson || 'Lead Vet')}
          </div>
        </div>

        <div class="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <button onclick="openPlanVisitModalForClient('${c.code}', '${c.repId}')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition-colors">
            Plan Visit
          </button>
          <button onclick="openUnplannedVisitModal('${c.repId}', '${c.code}')" class="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors">
            <i data-lucide="zap" class="w-3 h-3 text-yellow-300"></i> + Unplanned Visit
          </button>
        </div>
      </div>
    `;
  }).join('');
}
window.renderAccountsGrid = renderAccountsGrid;

window.handleAccountsFilter = function() {
  state.filters.accountsSearch = document.getElementById('accountsSearchInput')?.value || '';
  state.filters.accountsTerritory = document.getElementById('accountsTerritoryFilter')?.value || 'ALL';
  state.filters.accountsMonthFilter = document.getElementById('accountsMonthFilter')?.value || 'CURRENT';
  renderAccountsGrid();
  safeLucide();
};

window.openPlanVisitModalForClient = function(clientCode, repId) {
  openPlanVisitModal();
  const repSelect = document.getElementById('planRepSelect');
  if (repSelect && (!state.currentUser || state.currentUser.role === 'manager')) {
    repSelect.value = repId;
    filterPlanClinics();
  }
  selectCustomerCombobox('plan', clientCode);
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
  toast.className = 'toast-item pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md transition-all';

  if (type === 'success') {
    toast.className += ' bg-slate-900/95 border-emerald-500/50 text-white';
  } else if (type === 'warning') {
    toast.className += ' bg-slate-900/95 border-amber-500/50 text-white';
  } else {
    toast.className += ' bg-slate-900/95 border-sky-500/50 text-white';
  }

  const iconName = type === 'success' ? 'check-circle-2' : (type === 'warning' ? 'alert-triangle' : 'info');
  const iconColor = type === 'success' ? 'text-emerald-400' : (type === 'warning' ? 'text-amber-400' : 'text-sky-400');

  toast.innerHTML = `
    <div class="p-1 rounded-lg bg-slate-800 ${iconColor} shrink-0 mt-0.5">
      <i data-lucide="${iconName}" class="w-4 h-4"></i>
    </div>
    <div class="flex-1 min-w-0">
      <h5 class="text-xs font-bold text-white">${escapeHtml(title)}</h5>
      <p class="text-[11px] text-slate-300 mt-0.5 font-medium leading-relaxed">${escapeHtml(message)}</p>
    </div>
    <button type="button" class="text-slate-400 hover:text-white p-1 shrink-0" onclick="this.parentElement.remove()">
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
