/* =============================================
   ScreenGuard – app.js  (Auto-Lock Edition)
   ============================================= */

// ========== STATE ==========
const state = {
  apps: [
    { id: 1, name: 'Instagram', emoji: '📸', bg: 'linear-gradient(135deg,#f56040,#E1306C)', category: 'social',         limitMin: 90,  usedMin: 90, enabled: true,  locked: true  },
    { id: 2, name: 'YouTube',   emoji: '▶',  bg: 'linear-gradient(135deg,#FF0000,#cc0000)', category: 'entertainment',  limitMin: 90,  usedMin: 72, enabled: true,  locked: false },
    { id: 3, name: 'TikTok',   emoji: '🎵', bg: 'linear-gradient(135deg,#69C9D0,#010101)', category: 'social',         limitMin: 90,  usedMin: 54, enabled: true,  locked: false },
    { id: 4, name: 'Twitter',  emoji: '🐦', bg: 'linear-gradient(135deg,#1DA1F2,#0d8ed9)', category: 'social',         limitMin: 90,  usedMin: 45, enabled: true,  locked: false },
    { id: 5, name: 'Facebook', emoji: '👍', bg: 'linear-gradient(135deg,#1877F2,#0a5bb5)', category: 'social',         limitMin: 60,  usedMin: 20, enabled: true,  locked: false },
    { id: 6, name: 'Netflix',  emoji: '🎬', bg: 'linear-gradient(135deg,#E50914,#b2070f)', category: 'entertainment',  limitMin: 120, usedMin: 38, enabled: false, locked: false },
    { id: 7, name: 'Reddit',   emoji: '🤖', bg: 'linear-gradient(135deg,#FF4500,#cc3700)', category: 'social',         limitMin: 45,  usedMin: 12, enabled: true,  locked: false },
    { id: 8, name: 'Snapchat', emoji: '👻', bg: 'linear-gradient(135deg,#FFFC00,#f0e800)', category: 'social',         limitMin: 30,  usedMin: 8,  enabled: false, locked: false },
  ],
  schedule: [
    { id: 1, name: 'Morning Focus', time: '07:00 – 09:00', days: ['Mon','Tue','Wed','Thu','Fri'], enabled: true },
    { id: 2, name: 'Work Hours',   time: '09:00 – 18:00', days: ['Mon','Tue','Wed','Thu','Fri'], enabled: true },
    { id: 3, name: 'Family Time',  time: '19:00 – 21:00', days: ['Sat','Sun'],                   enabled: false },
    { id: 4, name: 'Study Block',  time: '15:00 – 17:00', days: ['Mon','Wed','Fri'],             enabled: true },
  ],
  badges: [
    { emoji: '🌱', name: 'First Step',     desc: 'Set your first limit',  earned: true  },
    { emoji: '🔥', name: 'Week Streak',    desc: '7-day goal streak',     earned: true  },
    { emoji: '🧘', name: 'Focused',        desc: 'Completed Focus Mode',  earned: true  },
    { emoji: '💪', name: 'Half Time',      desc: 'Reduced usage by 50%',  earned: true  },
    { emoji: '⭐', name: 'Overachiever',   desc: 'Beat goal for 30 days', earned: false },
    { emoji: '🏆', name: 'Screen Zen',     desc: 'Under 2h for 7 days',   earned: false },
    { emoji: '🌙', name: 'Night Owl Gone', desc: 'No phone after 10pm',   earned: false },
    { emoji: '🚀', name: 'Digital Detox',  desc: 'Full day offline',      earned: false },
  ],
  challenges: [
    { emoji: '📵', name: 'No Social Sunday', desc: 'Avoid social media all day', progress: 0.6,  reward: '+200 XP' },
    { emoji: '⏰', name: 'Under 2 Hours',    desc: 'Keep total usage under 2h',  progress: 0.4,  reward: '+150 XP' },
    { emoji: '🧘', name: 'Focus Marathon',   desc: 'Complete 3 focus sessions',  progress: 0.33, reward: '+300 XP' },
  ],
  hourlyData:  [0,0,0,0,0,0,5,22,35,28,15,40,55,48,20,30,45,62,78,90,72,55,30,10],
  weeklyData: [
    { day:'Mon', min:280 }, { day:'Tue', min:310 }, { day:'Wed', min:195 },
    { day:'Thu', min:340 }, { day:'Fri', min:260 }, { day:'Sat', min:420 }, { day:'Sun', min:204 },
  ],
  focusActive:       false,
  focusInterval:     null,
  focusSecondsLeft:  0,
  focusTotalSeconds: 0,
  currentPage:       'dashboard',
  currentFilter:     'all',
  streak:            7,
  // Auto-Lock
  lockScreenApp:     null,   // which app triggered the lock screen
  bypassCooldown:    false,  // prevents immediate bypass spam
  midnightUnlockTimer: null, // setInterval for midnight reset
};

// ========== UTILS ==========
function minToStr(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function pct(used, limit) { return Math.min(100, Math.round((used / limit) * 100)); }
function progressColor(p) {
  if (p >= 100) return '#ef4444';
  if (p >= 80)  return '#f59e0b';
  return '#34d399';
}
function showToast(msg, icon = '✅') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.querySelector('.toast-icon').textContent = icon;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

// ========== TIME UNTIL MIDNIGHT ==========
function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}

function formatCountdown(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ========== AUTO-LOCK CORE ==========
function isAppLocked(app) {
  return app.enabled && app.locked;
}

/** Called whenever usedMin reaches limitMin for an enabled app */
function triggerAutoLock(app) {
  if (app.locked) return; // already locked
  app.locked = true;
  showLockScreen(app);
  showToast(`🔒 ${app.name} locked — limit reached!`, '🔒');
  updateDashboardAlerts();
  if (state.currentPage === 'apps') renderAppsGrid();
}

/** Unlock one app */
function unlockApp(app) {
  app.locked  = false;
  app.usedMin = 0; // reset usage for the new day
  showToast(`🔓 ${app.name} unlocked — new day started!`, '🔓');
  updateDashboardAlerts();
  if (state.currentPage === 'apps') renderAppsGrid();
}

/** Unlock all apps (daily midnight reset) */
function dailyReset() {
  let anyLocked = false;
  state.apps.forEach(app => {
    if (app.locked) { anyLocked = true; }
    app.locked  = false;
    app.usedMin = 0;
  });
  if (anyLocked) {
    hideLockScreen();
    showToast('🌅 Good morning! All apps unlocked for the new day.', '🌅');
  }
  updateDashboardAlerts();
  if (state.currentPage === 'apps') renderAppsGrid();
}

// Midnight reset loop
function scheduleMidnightReset() {
  const secs = secondsUntilMidnight();
  setTimeout(() => {
    dailyReset();
    // Then repeat every 24 h
    state.midnightUnlockTimer = setInterval(dailyReset, 24 * 3600 * 1000);
  }, secs * 1000);
}

// ========== LOCK SCREEN UI ==========
function showLockScreen(app) {
  state.lockScreenApp = app;
  const el = document.getElementById('autoLockOverlay');
  document.getElementById('lockAppEmoji').textContent = app.emoji;
  document.getElementById('lockAppName').textContent  = app.name;
  document.getElementById('lockLimitTime').textContent = minToStr(app.limitMin);

  // reset bypass button
  resetBypassButton();

  el.classList.add('active');
  startLockCountdown();
}

function hideLockScreen() {
  document.getElementById('autoLockOverlay').classList.remove('active');
  state.lockScreenApp = null;
  stopLockCountdown();
}

let lockCountdownInterval = null;

function startLockCountdown() {
  stopLockCountdown();
  const el = document.getElementById('lockCountdown');
  function tick() {
    const s = secondsUntilMidnight();
    el.textContent = formatCountdown(s);
  }
  tick();
  lockCountdownInterval = setInterval(tick, 1000);
}

function stopLockCountdown() {
  if (lockCountdownInterval) { clearInterval(lockCountdownInterval); lockCountdownInterval = null; }
}

// Bypass button — 5-second hold to override (discourage casual tap)
let bypassHoldTimer = null;
let bypassProgress  = 0;

function resetBypassButton() {
  const btn  = document.getElementById('bypassBtn');
  const fill = document.getElementById('bypassFill');
  btn.disabled = false;
  bypassProgress = 0;
  fill.style.width = '0%';
  btn.textContent = 'Hold to Override (5s)';
  state.bypassCooldown = false;
}

function initBypassButton() {
  const btn  = document.getElementById('bypassBtn');
  const fill = document.getElementById('bypassFill');

  // Touch & Mouse hold
  function startHold(e) {
    e.preventDefault();
    if (state.bypassCooldown) return;
    bypassProgress = 0;
    bypassHoldTimer = setInterval(() => {
      bypassProgress += 20; // 100% in 5 s (20 steps × 250ms)
      fill.style.width = bypassProgress + '%';
      btn.textContent = `Hold… ${Math.ceil((100 - bypassProgress) / 20)}s`;
      if (bypassProgress >= 100) {
        clearInterval(bypassHoldTimer);
        confirmBypass();
      }
    }, 250);
  }

  function cancelHold() {
    clearInterval(bypassHoldTimer);
    if (bypassProgress < 100) {
      bypassProgress = 0;
      fill.style.width = '0%';
      btn.textContent = 'Hold to Override (5s)';
    }
  }

  btn.addEventListener('mousedown',  startHold);
  btn.addEventListener('touchstart', startHold, { passive: false });
  btn.addEventListener('mouseup',    cancelHold);
  btn.addEventListener('mouseleave', cancelHold);
  btn.addEventListener('touchend',   cancelHold);
}

function confirmBypass() {
  const app = state.lockScreenApp;
  if (!app) return;

  state.bypassCooldown = true;
  app.locked  = false;
  // Give 10 extra minutes of grace
  app.limitMin += 10;

  hideLockScreen();
  showToast(`⚠️ Override activated: 10 min grace for ${app.name}`, '⚠️');
  updateDashboardAlerts();
  if (state.currentPage === 'apps') renderAppsGrid();
}

// ========== NAVIGATION ==========
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p  => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.getElementById(`nav-${page}`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');
  state.currentPage = page;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  if (page === 'apps')     renderAppsGrid();
  if (page === 'stats')    renderStats();
  if (page === 'schedule') renderSchedule();
  if (page === 'rewards')  renderRewards();
}

// ========== HOURLY CHART ==========
function renderHourlyChart(data) {
  const chart  = document.getElementById('hourlyChart');
  const labels = document.getElementById('hourlyLabels');
  chart.innerHTML = labels.innerHTML = '';
  const max = Math.max(...data, 1);
  const cur  = new Date().getHours();
  data.forEach((val, i) => {
    const h   = `${(val / max) * 100}%`;
    const bar = document.createElement('div');
    bar.className = 'hour-bar';
    bar.style.height    = h;
    bar.style.minHeight = '4px';
    bar.style.background =
      i === cur ? 'linear-gradient(180deg,#a78bfa,#60a5fa)' :
      i < cur   ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)';
    if (i === cur) bar.style.boxShadow = '0 0 12px rgba(167,139,250,0.6)';
    const tip = document.createElement('div');
    tip.className = 'hour-bar-tooltip';
    tip.textContent = val > 0 ? `${val}m` : 'No usage';
    bar.appendChild(tip);
    chart.appendChild(bar);
    const lbl = document.createElement('div');
    lbl.className  = 'hour-label';
    lbl.textContent = i % 4 === 0 ? (i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i-12}p`) : '';
    labels.appendChild(lbl);
  });
}

// ========== DASHBOARD ALERTS ==========
function updateDashboardAlerts() {
  const list = document.getElementById('alertsList');
  if (!list) return;
  list.innerHTML = '';
  state.apps.filter(a => a.enabled).forEach(app => {
    const p     = pct(app.usedMin, app.limitMin);
    const color = progressColor(p);
    const locked = isAppLocked(app);
    let cls, statusIcon, timeText;
    if (locked || p >= 100) {
      cls = 'critical'; statusIcon = '🔴'; timeText = `<span class="critical-text">🔒 LOCKED — opens at midnight</span>`;
    } else if (p >= 80) {
      cls = 'warning';  statusIcon = '🟡'; timeText = `<span class="warning-text">${minToStr(app.usedMin)} / ${minToStr(app.limitMin)} — ${minToStr(app.limitMin - app.usedMin)} remaining</span>`;
    } else {
      cls = 'safe';     statusIcon = '🟢'; timeText = `<span class="safe-text">${minToStr(app.usedMin)} / ${minToStr(app.limitMin)} — ${minToStr(app.limitMin - app.usedMin)} remaining</span>`;
    }
    const item = document.createElement('div');
    item.className = `alert-item ${cls}`;
    item.innerHTML = `
      <div class="alert-app-icon" style="background:${app.bg}">${app.emoji}</div>
      <div class="alert-info">
        <span class="alert-app-name">${app.name} ${locked ? '<span class="lock-badge">🔒 LOCKED</span>' : ''}</span>
        <div class="alert-progress-bar">
          <div class="alert-progress-fill" style="width:${p}%;background:${color}"></div>
        </div>
        ${timeText}
      </div>
      <div class="alert-status">${statusIcon}</div>
    `;
    // Click a locked app → show lock screen
    if (locked) {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => showLockScreen(app));
    }
    list.appendChild(item);
  });
}

// Update the Dashboard stat cards
function updateDashboardStats() {
  const totalMin = state.apps.reduce((s, a) => s + a.usedMin, 0);
  const limited  = state.apps.filter(a => a.enabled && a.locked).length;
  const el1 = document.getElementById('totalTimeToday');
  const el2 = document.getElementById('appsLimited');
  if (el1) el1.textContent = minToStr(totalMin);
  if (el2) el2.textContent = limited;
}

// ========== APPS GRID ==========
function renderAppsGrid() {
  const grid = document.getElementById('appsGrid');
  grid.innerHTML = '';
  const filtered = state.currentFilter === 'all'
    ? state.apps
    : state.apps.filter(a => a.category === state.currentFilter);

  filtered.forEach(app => {
    const p      = pct(app.usedMin, app.limitMin);
    const color  = progressColor(p);
    const locked = isAppLocked(app);

    const card = document.createElement('div');
    card.className = `app-card ${locked ? 'app-card-locked' : ''}`;
    card.innerHTML = `
      ${locked ? '<div class="lock-overlay"><div class="lock-overlay-icon">🔒</div><div class="lock-overlay-text">LOCKED</div><div class="lock-overlay-sub">Opens at midnight</div></div>' : ''}
      <div class="app-card-header">
        <div class="app-icon" style="background:${app.bg}">${app.emoji}</div>
        <div class="app-card-info">
          <div class="app-card-name">${app.name}</div>
          <div class="app-card-category">${locked ? '🔒 Limit Reached' : app.category}</div>
        </div>
        <label class="toggle-switch app-card-toggle">
          <input type="checkbox" ${app.enabled ? 'checked' : ''} data-id="${app.id}" class="app-toggle-input" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="app-usage-row">
        <span class="app-usage-time">${minToStr(app.usedMin)} used</span>
        <span class="app-usage-percent" style="color:${color}">${p}%</span>
      </div>
      <div class="app-progress">
        <div class="app-progress-fill" style="width:${p}%;background:${color}"></div>
      </div>
      <div class="app-limit-row">
        <span class="app-limit-label">Daily Limit</span>
        <div class="limit-input-group">
          <button class="limit-btn" data-id="${app.id}" data-action="dec">−</button>
          <span class="limit-time-display" id="limit-${app.id}">${minToStr(app.limitMin)}</span>
          <button class="limit-btn" data-id="${app.id}" data-action="inc">+</button>
        </div>
      </div>
      ${locked ? `
      <button class="unlock-early-btn" data-id="${app.id}">
        🔓 Unlock Early (override)
      </button>` : ''}
    `;

    // Click locked card body → show lock screen
    if (locked) {
      card.addEventListener('click', e => {
        if (!e.target.closest('.toggle-switch') && !e.target.closest('.limit-btn') && !e.target.closest('.unlock-early-btn')) {
          showLockScreen(app);
        }
      });
    }
    grid.appendChild(card);
  });

  // Toggle listeners
  document.querySelectorAll('.app-toggle-input').forEach(toggle => {
    toggle.addEventListener('change', function() {
      const id  = parseInt(this.dataset.id);
      const app = state.apps.find(a => a.id === id);
      if (app) {
        app.enabled = this.checked;
        if (!app.enabled) { app.locked = false; }
        showToast(`${app.name} limit ${app.enabled ? 'enabled' : 'disabled'}`, app.enabled ? '✅' : '🚫');
        renderAppsGrid();
      }
    });
  });

  // Limit adjust
  document.querySelectorAll('.limit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id     = parseInt(this.dataset.id);
      const action = this.dataset.action;
      const app    = state.apps.find(a => a.id === id);
      if (!app) return;
      if (action === 'inc') app.limitMin = Math.min(480, app.limitMin + 15);
      if (action === 'dec') app.limitMin = Math.max(5,   app.limitMin - 15);
      // If increasing limit → may unlock the app
      if (app.limitMin > app.usedMin && app.locked) {
        app.locked = false;
        showToast(`${app.name} unlocked (limit increased)`);
      }
      document.getElementById(`limit-${id}`).textContent = minToStr(app.limitMin);
      showToast(`${app.name} limit updated to ${minToStr(app.limitMin)}`);
      renderAppsGrid();
      updateDashboardAlerts();
    });
  });

  // Unlock Early buttons
  document.querySelectorAll('.unlock-early-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id  = parseInt(this.dataset.id);
      const app = state.apps.find(a => a.id === id);
      if (app) showLockScreen(app); // let them go through hold-to-override
    });
  });
}

// ========== STATS ==========
function renderStats() {
  renderWeeklyBarChart();
  renderTopApps();
  renderHeatmap();
}
function renderWeeklyBarChart() {
  const container = document.getElementById('weeklyBarChart');
  container.innerHTML = '';
  const max  = Math.max(...state.weeklyData.map(d => d.min));
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = days[new Date().getDay()];
  state.weeklyData.forEach(d => {
    const isToday = d.day === today;
    const wrap = document.createElement('div');
    wrap.className = 'week-bar-wrap';
    wrap.innerHTML = `
      <div class="week-bar ${isToday ? 'today' : ''}"
        style="height:${(d.min / max) * 100}%;${isToday ? '' : 'background:rgba(167,139,250,0.3)'}"
        title="${minToStr(d.min)}"></div>
      <span class="week-bar-label">${d.day}</span>`;
    container.appendChild(wrap);
  });
}
function renderTopApps() {
  const list = document.getElementById('topAppsList');
  list.innerHTML = '';
  const sorted = [...state.apps].sort((a, b) => b.usedMin - a.usedMin).slice(0, 5);
  const maxMin = sorted[0].usedMin || 1;
  sorted.forEach((app, i) => {
    const div = document.createElement('div');
    div.className = 'top-app-item';
    div.innerHTML = `
      <div class="top-app-rank">${i + 1}</div>
      <div class="top-app-info">
        <span class="top-app-name">${app.emoji} ${app.name} ${app.locked ? '🔒' : ''}</span>
        <div class="top-app-bar-wrap">
          <div class="top-app-bar" style="width:${(app.usedMin/maxMin)*100}%;background:${app.bg}"></div>
        </div>
      </div>
      <span class="top-app-time">${minToStr(app.usedMin)}</span>`;
    list.appendChild(div);
  });
}
function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  container.innerHTML = '';
  for (let i = 0; i < 28; i++) {
    const intensity = Math.random();
    const cell = document.createElement('div');
    cell.className = 'heat-cell';
    cell.style.background = `rgba(139,92,246,${intensity.toFixed(2)})`;
    cell.title = `${Math.round(intensity * 6)}h usage`;
    container.appendChild(cell);
  }
}

// ========== SCHEDULE ==========
function renderSchedule() {
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = '';
  state.schedule.forEach(s => {
    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.innerHTML = `
      <div class="schedule-card-header">
        <span class="schedule-name">${s.name}</span>
        <label class="toggle-switch">
          <input type="checkbox" ${s.enabled ? 'checked' : ''} data-sid="${s.id}" class="schedule-toggle" />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="schedule-time">🕐 ${s.time}</div>
      <div class="schedule-days">${s.days.map(d => `<span class="day-chip">${d}</span>`).join('')}</div>`;
    grid.appendChild(card);
  });
  document.querySelectorAll('.schedule-toggle').forEach(t => {
    t.addEventListener('change', function() {
      const s = state.schedule.find(x => x.id === parseInt(this.dataset.sid));
      if (s) { s.enabled = this.checked; showToast(`${s.name} ${s.enabled ? 'enabled' : 'disabled'}`); }
    });
  });
}

// ========== REWARDS ==========
function renderRewards() {
  const bg = document.getElementById('badgesGrid');
  bg.innerHTML = '';
  state.badges.forEach(b => {
    const c = document.createElement('div');
    c.className = `badge-card ${b.earned ? 'earned' : 'locked'}`;
    c.innerHTML = `<span class="badge-emoji">${b.emoji}</span><div class="badge-name">${b.name}</div><div class="badge-desc">${b.earned ? b.desc : '🔒 Locked'}</div>`;
    bg.appendChild(c);
  });
  const cl = document.getElementById('challengesList');
  cl.innerHTML = '';
  state.challenges.forEach(c => {
    const card = document.createElement('div');
    card.className = 'challenge-card';
    card.innerHTML = `
      <span class="challenge-icon">${c.emoji}</span>
      <div class="challenge-info">
        <div class="challenge-name">${c.name}</div>
        <div class="challenge-desc">${c.desc}</div>
        <div class="challenge-progress-bar"><div class="challenge-progress-fill" style="width:${c.progress*100}%"></div></div>
      </div>
      <span class="challenge-reward">${c.reward}</span>`;
    cl.appendChild(card);
  });
}

// ========== FOCUS MODE ==========
function startFocusMode(minutes) {
  state.focusActive      = true;
  state.focusTotalSeconds = minutes * 60;
  state.focusSecondsLeft  = minutes * 60;
  const overlay = document.getElementById('focusOverlay');
  const fill    = document.getElementById('focusTimerFill');
  overlay.classList.add('active');
  fill.style.width = '100%';
  updateFocusTimer();
  state.focusInterval = setInterval(() => {
    state.focusSecondsLeft--;
    updateFocusTimer();
    fill.style.width = (state.focusSecondsLeft / state.focusTotalSeconds * 100) + '%';
    if (state.focusSecondsLeft <= 0) endFocusMode();
  }, 1000);
}
function updateFocusTimer() {
  const m = Math.floor(state.focusSecondsLeft / 60).toString().padStart(2, '0');
  const s = (state.focusSecondsLeft % 60).toString().padStart(2, '0');
  document.getElementById('focusTimer').textContent = `${m}:${s}`;
}
function endFocusMode() {
  clearInterval(state.focusInterval);
  state.focusActive = false;
  document.getElementById('focusOverlay').classList.remove('active');
  showToast('Focus session complete! 🎉', '🎉');
}

// ========== ADD APP MODAL ==========
let limitSliderMin = 60;
function openAddAppModal()  { document.getElementById('addAppModal').classList.add('open'); }
function closeAddAppModal() { document.getElementById('addAppModal').classList.remove('open'); }
function confirmAddApp() {
  const name = document.getElementById('newAppSelect').value;
  const cat  = document.getElementById('newAppCategory').value;
  if (!name) { showToast('Please select an app!', '⚠️'); return; }
  const emojis = { Facebook:'👍', Snapchat:'👻', Reddit:'🤖', Pinterest:'📌', LinkedIn:'💼', Netflix:'🎬', Spotify:'🎵', WhatsApp:'💬', Telegram:'✈️', Discord:'🎮' };
  const bgs    = {
    Facebook:'linear-gradient(135deg,#1877F2,#0a5bb5)', Snapchat:'linear-gradient(135deg,#FFFC00,#f0e800)',
    Reddit:'linear-gradient(135deg,#FF4500,#cc3700)', Pinterest:'linear-gradient(135deg,#E60023,#ad001a)',
    LinkedIn:'linear-gradient(135deg,#0077B5,#005f94)', Netflix:'linear-gradient(135deg,#E50914,#b2070f)',
    Spotify:'linear-gradient(135deg,#1DB954,#158a3e)', WhatsApp:'linear-gradient(135deg,#25D366,#1aaa52)',
    Telegram:'linear-gradient(135deg,#0088cc,#006fa6)', Discord:'linear-gradient(135deg,#5865F2,#404EED)',
  };
  state.apps.push({ id: Date.now(), name, emoji: emojis[name]||'📱', bg: bgs[name]||'linear-gradient(135deg,#a78bfa,#60a5fa)', category: cat, limitMin: limitSliderMin, usedMin: 0, enabled: true, locked: false });
  closeAddAppModal();
  renderAppsGrid();
  showToast(`${name} limit added ✅`);
}

// ========== SYNC ==========
function triggerSync() {
  const btn = document.getElementById('syncBtn');
  btn.style.opacity = '0.5';
  btn.style.pointerEvents = 'none';
  setTimeout(() => {
    btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
    showToast('Screen time synced! 📡', '📡');
  }, 1400);
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('timeGreeting').textContent = greeting();
  document.getElementById('streakDays').textContent   = `${state.streak} Days`;

  renderHourlyChart(state.hourlyData);
  updateDashboardAlerts();
  updateDashboardStats();

  // Nav
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.page); });
  });
  document.querySelectorAll('.btn-ghost[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Mobile
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('overlay');
  hamburger.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('active'); });
  overlay.addEventListener('click',   () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); });

  // Sync
  document.getElementById('syncBtn').addEventListener('click', triggerSync);

  // Focus
  document.getElementById('startFocusBtn').addEventListener('click', () => startFocusMode(parseInt(document.getElementById('focusDuration').value)));
  document.getElementById('endFocusBtn').addEventListener('click', endFocusMode);

  // Hourly toggle
  document.getElementById('toggleToday').addEventListener('click', function() {
    this.classList.add('active'); document.getElementById('toggleWeek').classList.remove('active');
    renderHourlyChart(state.hourlyData);
  });
  document.getElementById('toggleWeek').addEventListener('click', function() {
    this.classList.add('active'); document.getElementById('toggleToday').classList.remove('active');
    renderHourlyChart(state.hourlyData.map(v => Math.round(v * 0.85 + Math.random() * 10)));
  });

  // Filter tabs
  document.getElementById('filterTabs').addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentFilter = tab.dataset.filter;
    renderAppsGrid();
  });

  // Add App Modal
  document.getElementById('addAppBtn').addEventListener('click', openAddAppModal);
  document.getElementById('closeAddAppModal').addEventListener('click', closeAddAppModal);
  document.getElementById('cancelAddApp').addEventListener('click', closeAddAppModal);
  document.getElementById('confirmAddApp').addEventListener('click', confirmAddApp);
  document.getElementById('addAppModal').addEventListener('click', e => {
    if (e.target === document.getElementById('addAppModal')) closeAddAppModal();
  });
  document.getElementById('limitSlider').addEventListener('input', function() {
    limitSliderMin = parseInt(this.value);
    document.getElementById('sliderValue').textContent = minToStr(limitSliderMin);
  });
  document.querySelectorAll('.day-btn').forEach(btn => btn.addEventListener('click', function() { this.classList.toggle('active'); }));

  // Schedule
  document.getElementById('addScheduleBtn').addEventListener('click', () => {
    const names = ['Evening Wind-down', 'Lunch Break', 'Weekend Free', 'Morning Routine'];
    const hours = ['18:00–20:00', '12:00–13:00', '10:00–12:00', '06:00–08:00'];
    const i = Math.floor(Math.random() * names.length);
    state.schedule.push({ id: Date.now(), name: names[i], time: hours[i], days: ['Mon','Wed','Fri'], enabled: true });
    renderSchedule(); showToast('Schedule rule added!');
  });

  // ===== AUTO-LOCK OVERLAY BUTTONS =====
  // "Unlock at Midnight" just closes and shows countdown in overlay
  document.getElementById('lockCloseBtn').addEventListener('click', hideLockScreen);

  // Bypass hold button
  initBypassButton();

  // Theme
  document.getElementById('darkThemeBtn').addEventListener('click', function() {
    document.body.removeAttribute('data-theme');
    this.classList.add('active'); document.getElementById('lightThemeBtn').classList.remove('active');
    showToast('Dark mode activated 🌙', '🌙');
  });
  document.getElementById('lightThemeBtn').addEventListener('click', function() {
    document.body.setAttribute('data-theme', 'light');
    this.classList.add('active'); document.getElementById('darkThemeBtn').classList.remove('active');
    showToast('Light mode activated ☀️', '☀️');
  });
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', function() {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      this.classList.add('active'); showToast('Accent color updated!', '🎨');
    });
  });

  // Export
  document.getElementById('exportBtn').addEventListener('click', () => {
    const rows = ['App,Used (min),Limit (min),Category,Locked'];
    state.apps.forEach(a => rows.push(`${a.name},${a.usedMin},${a.limitMin},${a.category},${a.locked}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'screenguard-data.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported!', '📁');
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all statistics?')) {
      state.apps.forEach(a => { a.usedMin = 0; a.locked = false; });
      hideLockScreen();
      updateDashboardAlerts(); updateDashboardStats();
      showToast('All statistics reset!', '🔄');
    }
  });
  document.getElementById('bedtimeToggle').addEventListener('change', function() { showToast(`Bedtime mode ${this.checked ? 'enabled 🌙' : 'disabled'}`, '🌙'); });
  document.getElementById('dailyGoalSelect').addEventListener('change', function() { showToast(`Daily goal set to ${minToStr(parseInt(this.value))}`, '🎯'); });
  document.getElementById('notifToggle').addEventListener('change',  function() { showToast(`Notifications ${this.checked ? 'enabled' : 'disabled'}`); });
  document.getElementById('strictToggle').addEventListener('change', function() { showToast(`Strict mode ${this.checked ? 'enabled 🔒' : 'disabled'}`, this.checked ? '🔒' : '🔓'); });
  document.getElementById('statsPeriod').addEventListener('change',  function() { renderStats(); showToast('Statistics updated'); });

  // ========== LIVE TICK ==========
  // Simulate usage increasing every ~5 seconds (fast demo mode)
  setInterval(() => {
    if (state.focusActive) return;
    state.apps.forEach(app => {
      if (!app.enabled || app.locked) return;
      // randomly increment usage
      if (Math.random() < 0.25) {
        app.usedMin = Math.min(app.limitMin, app.usedMin + 1);
        // AUTO-LOCK when limit is reached!
        if (app.usedMin >= app.limitMin && !app.locked) {
          triggerAutoLock(app);
        }
      }
    });
    updateDashboardStats();
    updateDashboardAlerts();
    if (state.currentPage === 'apps') renderAppsGrid();
    const h = new Date().getHours();
    if (Math.random() < 0.1) state.hourlyData[h] = Math.min(100, state.hourlyData[h] + 1);
  }, 5000);

  // Schedule midnight auto-unlock
  scheduleMidnightReset();

  // "Test Lock" button on dashboard (demo convenience)
  const testLockBtn = document.getElementById('testLockBtn');
  if (testLockBtn) {
    testLockBtn.addEventListener('click', () => {
      // Lock the first enabled+unlocked app for demo
      const app = state.apps.find(a => a.enabled && !a.locked);
      if (app) {
        app.usedMin = app.limitMin;
        triggerAutoLock(app);
      } else {
        showToast('All active apps are already locked!', '🔒');
      }
    });
  }
});
