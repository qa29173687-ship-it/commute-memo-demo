import * as D from './data.js';

const KEY = 'commute-memo-demo-v2';
const WELCOME_KEY = 'commute-memo-demo-welcome-v2';

const $ = (s, r = document) => r.querySelector(s);
let state, toastTimer, highlightList = null;
let audioCtx = null, beepTimer = null, alarmListening = false;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === D.VERSION && Array.isArray(s.items) && s.settings?.morning && s.settings?.evening) {
        state = s;
        state.settings.morning = { ...D.SEED_SETTINGS.morning, ...s.settings.morning, weekdays: [...(s.settings.morning.weekdays || D.SEED_SETTINGS.morning.weekdays)] };
        state.settings.evening = { ...D.SEED_SETTINGS.evening, ...s.settings.evening, weekdays: [...(s.settings.evening.weekdays || D.SEED_SETTINGS.evening.weekdays)] };
        return;
      }
    }
  } catch (_) { /* 用範例資料 */ }
  state = D.seedState();
  save();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* 忽略配額 */ }
}

function resetAll() {
  stopBeep();
  hideAlarm();
  hideBanner();
  state = D.seedState();
  save();
  toast('已恢復範例資料');
  go('#/');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

function openSheet(html) {
  const dlg = $('#dlg');
  dlg.innerHTML = `<div class="sheet">${html}</div>`;
  dlg.classList.remove('hidden');
  dlg.onclick = e => { if (e.target === dlg) closeSheet(); };
}

function closeSheet() {
  const dlg = $('#dlg');
  dlg.classList.add('hidden');
  dlg.innerHTML = '';
  dlg.onclick = null;
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function pathParts() {
  return (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
}

function now() { return new Date(); }
function today() { return D.todayISO(now()); }
function todayDow() { return D.dow(now()); }
function itemById(id) { return state.items.find(it => it.id === id); }
function slotOf(name) { return state.settings[name] || D.SEED_SETTINGS[name]; }

function itemsOf(list) {
  return state.items.filter(it => it.list === list);
}

function todayItems(list) {
  const d = today(), day = todayDow();
  return itemsOf(list).filter(it => D.stillVisibleToday(it, d, day));
}

function remaining(list) {
  const d = today();
  return todayItems(list).filter(it => !D.isDoneOn(it, d));
}

function uid() {
  return 'i-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function navHtml(active) {
  const items = [
    ['home', '桌面', '📱', '#/'],
    ['morning', '出門', '👜', '#/morning'],
    ['evening', '順便', '🛒', '#/evening'],
    ['buy', '想買', '🛍️', '#/buy'],
    ['remind', '提醒', '⏰', '#/remind']
  ];
  return `<nav class="nav">${items.map(([k, lab, ico, href]) =>
    `<a href="${href}" class="${k === active ? 'on' : ''}"><span class="ico">${ico}</span>${lab}</a>`
  ).join('')}</nav>`;
}

function topBar(title, sub, back) {
  return `<div class="demo-banner">這是可點的 DEMO · 以下皆為範例資料，不是正式 App</div>
  <div class="top">
    ${back ? `<button class="back" data-act="back" aria-label="返回">←</button>` : `<span class="back" aria-hidden="true">📱</span>`}
    <div class="t"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
  </div>`;
}

function fab(list) {
  const plum = list === 'buy' ? ' plum' : '';
  return `<button class="fab${plum}" data-act="add" data-list="${esc(list || '')}" aria-label="新增項目">＋</button>`;
}

function itemRow(it, opts = {}) {
  const d = today();
  const day = todayDow();
  const done = D.isDoneOn(it, d);
  const showOff = opts.showOff && !D.isDueOn(it, d, day) && !(it.repeat === 'once' && it.completedOnce);
  const hideOnceDone = it.repeat === 'once' && it.completedOnce && opts.hideOnce;
  if (hideOnceDone) return '';
  const meta = [D.repeatLabel(it), it.note, showOff ? '今天不用提醒' : ''].filter(Boolean).join(' · ');
  return `<div class="card item-card ${showOff ? 'off' : ''}">
    <div class="check">
      <button class="chk ${done ? 'on' : ''}" data-act="toggle" data-id="${esc(it.id)}" aria-label="${done ? '取消打勾' : '打勾'}" aria-pressed="${done}">${done ? '✓' : ''}</button>
      <div class="grow body-t" data-act="edit" data-id="${esc(it.id)}">
        <div class="iname ${done ? 'done' : ''}">${esc(it.emoji || '')} ${esc(it.title)}</div>
        <div class="item-meta">${esc(meta)}</div>
      </div>
      <button class="more" data-act="edit" data-id="${esc(it.id)}" aria-label="編輯">⋯</button>
    </div>
  </div>`;
}

function buyRow(it) {
  const d = today();
  const bought = !!it.boughtOn;
  const due = D.isSaleRemindDue(it, d);
  const tags = [];
  if (it.saleDate) {
    tags.push(`<span class="badge ${due && !bought ? 'due' : 'plum'}">${esc(it.saleName || '打折')} ${esc(D.isoLabel(it.saleDate))}</span>`);
    if (!bought && it.saleDate >= d) tags.push(`<span class="badge amber">${esc(D.saleCountdown(it.saleDate, d))}</span>`);
    if (!bought) tags.push(`<span class="badge mute">${esc(D.remindDaysLabel(it.remindDays))} · ${esc(D.modeLabel(it.remindMode))}</span>`);
    if (!bought && due) tags.push(`<span class="badge due">今天該提醒</span>`);
  }
  if (bought) tags.push(`<span class="badge ok">已買 · ${esc(D.isoLabel(it.boughtOn))}</span>`);
  return `<div class="card item-card sale-row ${bought ? 'off' : ''}">
    <div class="check">
      <button class="chk ${bought ? 'on' : ''}" data-act="toggle" data-id="${esc(it.id)}" aria-label="${bought ? '改回想買' : '標記已買'}" aria-pressed="${bought}">${bought ? '✓' : ''}</button>
      <div class="grow body-t" data-act="edit" data-id="${esc(it.id)}">
        <div class="iname ${bought ? 'done' : ''}">${esc(it.emoji || '')} ${esc(it.title)}</div>
        ${it.note ? `<div class="item-meta">${esc(it.note)}</div>` : ''}
        ${tags.length ? `<div class="meta-tags">${tags.join('')}</div>` : `<div class="item-meta">還沒有設定打折日期</div>`}
      </div>
      <button class="more" data-act="edit" data-id="${esc(it.id)}" aria-label="編輯">⋯</button>
    </div>
  </div>`;
}

function widgetBlock() {
  const d = today();
  const morn = todayItems('morning');
  const eve = todayItems('evening');
  const left = remaining('morning').length + remaining('evening').length;
  const rows = (arr) => arr.length
    ? arr.map(it => {
        const done = D.isDoneOn(it, d);
        return `<button type="button" class="wrow ${done ? 'done' : ''}" data-act="toggle" data-id="${esc(it.id)}">
          <span class="wchk">${done ? '✓' : ''}</span>
          <span class="wname">${esc(it.emoji || '')} ${esc(it.title)}</span>
        </button>`;
      }).join('')
    : `<div class="hint">今天沒有項目</div>`;
  return `<div class="widget">
    <div class="wh"><div class="wt">出門備忘</div><div class="wd">${esc(D.shortDate(now()))}</div></div>
    <div class="remain">${left ? `今天還有 ${left} 件沒打勾` : '今天都打完了'}</div>
    <div class="sec-l">👜 上班帶出門</div>
    ${rows(morn)}
    <div class="sec-l">🛒 下班順便做</div>
    ${rows(eve)}
    <div class="add"><button class="wadd" data-act="add" data-list="" type="button">＋ 新增</button></div>
  </div>`;
}

function renderHome() {
  return `${topBar('出門備忘', `${D.dateLabel(now())} · 桌面小工具`)}
  <div class="body home">
    <div class="homescreen">
      <div class="hs-bar"><span>9:41</span><span>▮▮▮ 🔋</span></div>
      ${widgetBlock()}
      <div class="icons">
        <button type="button" class="ico-app" data-act="noop"><span class="sq">📱</span>出門備忘</button>
        <button type="button" class="ico-app" data-act="go" data-hash="#/buy"><span class="sq">🛍️</span>想買</button>
        <button type="button" class="ico-app" data-act="go" data-hash="#/remind"><span class="sq">⏰</span>提醒</button>
        <button type="button" class="ico-app" data-act="noop"><span class="sq">📷</span>相機</button>
      </div>
    </div>
    <div class="note">正式 App 可把小工具放在桌面，直接打勾或新增。想買的東西只在 App 裡，不會出現在小工具上。</div>
    <button class="link" data-act="reset">恢復範例資料</button>
  </div>
  ${fab('')}
  ${navHtml('home')}`;
}

function renderList(list) {
  const meta = D.LISTS[list];
  const d = today(), day = todayDow();
  const all = itemsOf(list);
  const due = all.filter(it => D.stillVisibleToday(it, d, day));
  const onceDone = all.filter(it => it.repeat === 'once' && it.completedOnce);
  const rest = all.filter(it => !D.stillVisibleToday(it, d, day) && !(it.repeat === 'once' && it.completedOnce));
  const sub = `今天 ${due.length} 件要${meta.verb} · 共 ${all.length - onceDone.length} 項`;
  return `${topBar(meta.name, sub, true)}
  <div class="body">
    <div class="note ${list === 'evening' ? 'amber' : ''}">今天只會提醒到期的項目。例如「週三倒垃圾」在別的日子不會出現在今天清單，也不會出現在桌面小工具。</div>
    ${due.length ? `<div class="sec"><span class="ttl">今天要${meta.verb}</span></div>` : ''}
    ${due.length ? due.map(it => itemRow(it)).join('') : `<div class="card empty"><div class="e">${meta.emoji}</div>還沒有今天的項目，按右下角＋新增</div>`}
    ${rest.length ? `<div class="sec"><span class="ttl">其他日子</span><span>今天不用提醒</span></div>${rest.map(it => itemRow(it, { showOff: true })).join('')}` : ''}
    ${onceDone.length ? `<div class="sec"><span class="ttl">已完成、不再提醒</span></div>${onceDone.map(it => itemRow(it)).join('')}` : ''}
  </div>
  ${fab(list)}
  ${navHtml(list)}`;
}

function renderBuy() {
  const d = today();
  const all = itemsOf('buy');
  const upcoming = D.upcomingSales(all, d);
  const want = all.filter(it => !it.boughtOn);
  const noSale = want.filter(it => !it.saleDate);
  const past = want.filter(it => it.saleDate && it.saleDate < d);
  const bought = all.filter(it => it.boughtOn);
  return `${topBar('想買的東西', `${want.length} 件想買 · ${bought.length} 件已買`, true)}
  <div class="body">
    <div class="note plum">打折日期請自己輸入，這個 DEMO 不會自動抓商店檔期。想買的東西只在 App 裡，不會出現在桌面小工具。</div>
    <div class="sec"><span class="ttl">即將打折</span><span>${upcoming.length} 件</span></div>
    ${upcoming.length ? upcoming.map(buyRow).join('') : `<div class="card empty"><div class="e">🏷️</div>還沒有即將到來的檔期</div>`}
    ${noSale.length ? `<div class="sec"><span class="ttl">還沒有檔期</span></div>${noSale.map(buyRow).join('')}` : ''}
    ${past.length ? `<div class="sec"><span class="ttl">檔期已過</span></div>${past.map(buyRow).join('')}` : ''}
    ${bought.length ? `<div class="sec"><span class="ttl">已買</span></div>${bought.map(buyRow).join('')}` : ''}
    <button class="btn plum" data-act="sim" data-kind="sale">模擬打折提醒</button>
    <div class="hint">會用最接近、且已到提前提醒日的商品來示範；沒有的話就用最近一檔。</div>
  </div>
  ${fab('buy')}
  ${navHtml('buy')}`;
}

function timeSelects(slot, value) {
  const [h, m] = String(value || '07:30').split(':');
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const mm = String(m || '00').padStart(2, '0');
  const minOpts = mins.includes(mm) ? mins : [...mins, mm].sort();
  const opt = (arr, cur) => arr.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v}</option>`).join('');
  return `<div class="times">
    <select data-bind-time="${esc(slot)}" data-part="h" aria-label="時">${opt(hours, String(h).padStart(2, '0'))}</select>
    <span class="colon">:</span>
    <select data-bind-time="${esc(slot)}" data-part="m" aria-label="分">${opt(minOpts, mm)}</select>
  </div>`;
}

function slotCard(key, title, emoji) {
  const s = slotOf(key);
  const day = todayDow();
  const on = D.isSlotDay(s, day);
  const dayPills = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button type="button" class="pill ${s.weekdays.includes(d) ? 'on' : ''}" data-act="toggle-day" data-slot="${key}" data-d="${d}">週${D.WEEKDAYS[d]}</button>`
  ).join('');
  return `<div class="card">
    <div class="lab" style="font-weight:900;font-size:16px;margin-bottom:4px">${emoji} ${esc(title)}</div>
    <div class="hint" style="margin-bottom:10px">${esc(D.workdaysLabel(s.weekdays))} ${esc(D.formatTime(s.time))} · ${esc(D.modeLabel(s.mode))}${on ? ' · 今天會提醒' : ' · 今天不在提醒日'}</div>
    <div class="field"><span class="lbl">時間</span>${timeSelects(key, s.time)}</div>
    <div class="lbl" style="margin:14px 0 8px">哪些天要提醒</div>
    <div class="pills wrap">${dayPills}</div>
    <div class="lbl" style="margin:14px 0 8px">提醒方式</div>
    <div class="pills wrap">
      <button type="button" class="pill ${s.mode === 'notify' ? 'on' : ''}" data-act="set-mode" data-slot="${key}" data-v="notify">通知</button>
      <button type="button" class="pill ${s.mode === 'alarm' ? 'on amber' : ''}" data-act="set-mode" data-slot="${key}" data-v="alarm">鬧鐘</button>
    </div>
    <button class="btn ${s.mode === 'alarm' ? 'amber' : ''}" style="margin-top:14px" data-act="sim" data-kind="${key}">模擬${s.mode === 'alarm' ? '鬧鐘' : '通知'}</button>
  </div>`;
}

function renderRemind() {
  return `${topBar('提醒設定', '每個時段可選通知或鬧鐘', true)}
  <div class="body">
    <div class="note">每個時段自己設定時間、星期和方式。「通知」會在畫面上跳出一則提醒；「鬧鐘」會全螢幕響起，要按關閉或稍後才會停。正式 App 的鬧鐘會持續響到你關掉為止。</div>
    ${slotCard('morning', '上班帶出門', '👜')}
    ${slotCard('evening', '下班順便做', '🛒')}
    <div class="card">
      <div class="lab" style="font-weight:800">想買的東西 · 打折提醒</div>
      <div class="hint" style="margin:6px 0 10px">在「想買」清單為單一商品設定打折日期、提前幾天，以及通知或鬧鐘。日期要自己輸入。</div>
      <button class="btn plum" data-act="sim" data-kind="sale">模擬打折提醒</button>
    </div>
    <div class="card">
      <div class="lab" style="font-weight:800">瀏覽器通知（選用）</div>
      <div class="hint" style="margin:6px 0 10px">${notifyPermLabel()}</div>
      ${typeof Notification !== 'undefined' && Notification.permission === 'default' ? `<button class="btn ghost" data-act="ask-notify">允許瀏覽器通知</button>` : ''}
    </div>
    <button class="link" data-act="reset">恢復範例資料</button>
  </div>
  ${navHtml('remind')}`;
}

function notifyPermLabel() {
  if (typeof Notification === 'undefined') return '這個瀏覽器沒有通知功能，請用畫面上的模擬。';
  const p = Notification.permission;
  if (p === 'granted') return '已允許。模擬「通知」時也會跳出瀏覽器通知。';
  if (p === 'denied') return '已拒絕，不影響畫面上的模擬。';
  return '尚未詢問。沒開也可以用畫面上的模擬。';
}

function namesOf(arr) {
  return arr.map(it => it.title).slice(0, 3).join('、') + (arr.length > 3 ? '…' : '');
}

function pickSaleItem() {
  const d = today();
  const upcoming = D.upcomingSales(itemsOf('buy'), d);
  return upcoming.find(it => D.isSaleRemindDue(it, d)) || upcoming[0] || null;
}

function remindCopy(kind) {
  if (kind === 'sale') {
    const it = pickSaleItem();
    if (!it) {
      return { kind, mode: 'notify', list: 'buy', title: '目前沒有即將打折的商品', body: '先在想買的東西裡加上打折日期', sysTitle: '出門備忘 · 打折提醒', time: '' };
    }
    const due = D.isSaleRemindDue(it, today());
    return {
      kind, mode: it.remindMode === 'alarm' ? 'alarm' : 'notify', list: 'buy', itemId: it.id,
      headline: `${it.title}｜${it.saleName || '打折'}快到了`,
      title: `${it.emoji || ''} ${it.title}｜${it.saleName || '打折'}快到了`.trim(),
      body: `${D.isoLabel(it.saleDate)} ${D.saleCountdown(it.saleDate, today())} · ${D.remindDaysLabel(it.remindDays)}${due ? ' · 今天該提醒' : ''}${it.note ? ' · ' + it.note : ''}`,
      sysTitle: '出門備忘 · 打折提醒',
      time: ''
    };
  }
  const slot = kind === 'evening' ? 'evening' : 'morning';
  const s = slotOf(slot);
  const left = remaining(slot);
  const n = left.length;
  const isEve = slot === 'evening';
  const headline = isEve ? '下班順便記得' : '出門前別忘了';
  return {
    kind: slot,
    mode: s.mode === 'alarm' ? 'alarm' : 'notify',
    list: slot,
    headline,
    title: `${D.formatTime(s.time)}，${headline}`,
    body: n ? `${namesOf(left)}，還有 ${n} 件` : (isEve ? '今天要順便做的都打過勾了' : '今天要帶的都打過勾了'),
    sysTitle: isEve ? '出門備忘 · 下班順便做' : '出門備忘 · 上班帶出門',
    time: s.time
  };
}

function hideBanner() {
  const el = $('#nban');
  if (!el) return;
  el.classList.add('hidden');
  el.hidden = true;
  el.innerHTML = '';
  el.onclick = null;
}

function showBanner(copy) {
  hideAlarm();
  const el = $('#nban');
  const plum = copy.kind === 'sale' ? ' plum' : '';
  el.innerHTML = `<div class="app"><span class="dot${plum}">${copy.kind === 'sale' ? '🏷️' : '☀️'}</span>出門備忘<span class="when">現在</span></div>
    <div class="ttl">${esc(copy.title)}</div>
    <div class="bd">${esc(copy.body)}</div>`;
  el.classList.remove('hidden');
  el.hidden = false;
  el.onclick = ev => {
    ev.preventDefault();
    openFromRemind(copy);
  };
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(copy.sysTitle, { body: `${copy.title}｜${copy.body}`, icon: 'favicon.svg' }); } catch (_) { /* 忽略 */ }
  }
}

function hideAlarm() {
  stopBeep();
  const el = $('#alarm');
  if (!el) return;
  el.classList.add('hidden');
  el.hidden = true;
  el.innerHTML = '';
}

function showAlarm(copy) {
  hideBanner();
  const el = $('#alarm');
  el.innerHTML = `<div class="alarm-inner">
    <div class="bell" aria-hidden="true">⏰</div>
    <div class="who">出門備忘 · 鬧鐘</div>
    <div class="clock">${esc(copy.time || (copy.kind === 'sale' ? '打折' : '鬧鐘'))}</div>
    <div class="attl">${esc(copy.headline || copy.title)}</div>
    <div class="abd">${esc(copy.body)}</div>
    <div class="ahint">正式 App 會響鈴直到你關掉。這個 DEMO 要先按「聽鬧鐘」，才會用提示音示範（瀏覽器規定要先點一下）。</div>
    <div class="btns" style="flex-direction:column">
      <button class="btn listen" type="button" data-act="listen-alarm">聽鬧鐘</button>
      <div class="btns">
        <button class="btn ghost" type="button" data-act="alarm-snooze">稍後</button>
        <button class="btn amber" type="button" data-act="alarm-off" data-list="${esc(copy.list || '')}" data-id="${esc(copy.itemId || '')}">關閉</button>
      </div>
    </div>
  </div>`;
  el.classList.remove('hidden');
  el.hidden = false;
  alarmListening = false;
  bind(el);
}

function startBeep() {
  stopBeep();
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { toast('這個瀏覽器不能播提示音，不影響畫面示範'); return; }
    audioCtx = new Ctx();
    const beep = () => {
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, t);
      o.frequency.setValueAtTime(1174, t + 0.18);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.38);
    };
    const kick = () => {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      beep();
    };
    kick();
    beepTimer = setInterval(kick, 700);
    alarmListening = true;
    const btn = document.querySelector('[data-act=listen-alarm]');
    if (btn) btn.textContent = '正在響鈴… 再點可停止試聽';
  } catch {
    toast('無法播放提示音，不影響畫面示範');
  }
}

function stopBeep() {
  if (beepTimer) { clearInterval(beepTimer); beepTimer = null; }
  if (audioCtx) {
    try { audioCtx.close(); } catch (_) { /* 忽略 */ }
    audioCtx = null;
  }
  alarmListening = false;
  const btn = document.querySelector('[data-act=listen-alarm]');
  if (btn) btn.textContent = '聽鬧鐘';
}

function openFromRemind(copy) {
  hideBanner();
  hideAlarm();
  if (copy.list === 'buy') { go('#/buy'); return; }
  highlightList = copy.list === 'evening' ? 'evening' : 'morning';
  go(copy.list === 'evening' ? '#/evening' : '#/morning');
  setTimeout(() => { highlightList = null; }, 2000);
}

function simulate(kind) {
  const copy = remindCopy(kind);
  if (kind !== 'sale') {
    const slot = slotOf(kind === 'evening' ? 'evening' : 'morning');
    if (!D.isSlotDay(slot, todayDow())) {
      toast('今天不在你選的提醒日（DEMO 還是示範給你看）');
    }
  } else if (!pickSaleItem()) {
    toast('先在想買的東西裡加上打折日期');
  }
  if (copy.mode === 'alarm') showAlarm(copy);
  else showBanner(copy);
}

function sheetItem(existing, defaultList) {
  const isEdit = !!(existing && existing.id);
  if ((existing && existing.list === 'buy') || defaultList === 'buy') {
    sheetBuy(existing);
    return;
  }
  const it = existing || {
    list: defaultList || 'morning',
    title: '',
    emoji: '',
    repeat: 'daily',
    weekdays: [1, 2, 3, 4, 5],
    note: ''
  };
  const list = it.list === 'evening' ? 'evening' : 'morning';
  const emojis = D.EMOJIS[list];
  const dayPills = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button type="button" class="pill ${(it.weekdays || []).includes(d) ? 'on' : ''}" data-act="form-day" data-d="${d}">週${D.WEEKDAYS[d]}</button>`
  ).join('');
  openSheet(`
    <h2>${isEdit ? '編輯項目' : '新增項目'}</h2>
    <div class="field"><span class="lbl">要做什麼</span>
      <input type="text" id="f-title" value="${esc(it.title)}" placeholder="例如：鑰匙、買牛奶" maxlength="30">
    </div>
    <div class="lbl">加到哪個清單</div>
    <div class="pills wrap">
      <button type="button" class="pill ${list === 'morning' ? 'on' : ''}" data-act="form-list" data-v="morning">👜 上班帶出門</button>
      <button type="button" class="pill ${list === 'evening' ? 'on amber' : ''}" data-act="form-list" data-v="evening">🛒 下班順便做</button>
    </div>
    <div class="hint">想買的東西請到「想買」分頁新增，不會出現在桌面小工具。</div>
    <div class="lbl">圖示</div>
    <div class="pills wrap">
      ${emojis.map(e => `<button type="button" class="pill emoji ${it.emoji === e ? 'on' : ''}" data-act="form-emoji" data-v="${esc(e)}">${e}</button>`).join('')}
    </div>
    <div class="lbl">什麼時候提醒</div>
    <div class="pills wrap">
      <button type="button" class="pill ${it.repeat === 'daily' ? 'on' : ''}" data-act="form-repeat" data-v="daily">每天</button>
      <button type="button" class="pill ${it.repeat === 'weekly' ? 'on' : ''}" data-act="form-repeat" data-v="weekly">指定星期幾</button>
      <button type="button" class="pill ${it.repeat === 'once' ? 'on amber' : ''}" data-act="form-repeat" data-v="once">只提醒一次</button>
    </div>
    <div id="f-days" class="${it.repeat === 'weekly' ? '' : 'hidden'}">
      <div class="lbl" style="margin-bottom:8px">選要提醒的星期</div>
      <div class="pills wrap">${dayPills}</div>
    </div>
    <div class="field"><span class="lbl">備註（選填）</span>
      <input type="text" id="f-note" value="${esc(it.note || '')}" placeholder="例如：超商取件" maxlength="40">
    </div>
    <div class="btns">
      <button class="btn" type="button" data-act="save-item" data-id="${esc(isEdit ? existing.id : '')}">儲存</button>
      <button class="btn ghost" type="button" data-act="close-sheet">取消</button>
    </div>
    ${isEdit ? `<button class="link red" type="button" data-act="delete-item" data-id="${esc(existing.id)}">刪除這個項目</button>` : ''}
  `);
  bind($('#dlg'));
  const title = $('#f-title');
  if (title) { title.focus(); title.select(); }
  $('#dlg')._form = {
    kind: 'commute',
    list,
    emoji: it.emoji || (emojis[0] || '📝'),
    repeat: it.repeat || 'daily',
    weekdays: [...(it.weekdays || [])]
  };
}

function sheetBuy(existing) {
  const isEdit = !!(existing && existing.id);
  const it = existing || {
    list: 'buy', title: '', emoji: '🧥', note: '',
    saleName: '', saleDate: '', remindDays: 3, remindMode: 'notify'
  };
  const hasSale = !!(it.saleDate || it.saleName);
  const emojis = D.EMOJIS.buy;
  const salePills = D.SALE_NAMES.map(n =>
    `<button type="button" class="pill ${it.saleName === n ? 'on plum' : ''}" data-act="form-sale-name" data-v="${esc(n)}">${esc(n)}</button>`
  ).join('');
  openSheet(`
    <h2>${isEdit ? '編輯想買的東西' : '新增想買的東西'}</h2>
    <div class="field"><span class="lbl">名稱</span>
      <input type="text" id="f-title" value="${esc(it.title)}" placeholder="例如：冬季外套" maxlength="30">
    </div>
    <div class="lbl">圖示</div>
    <div class="pills wrap">
      ${emojis.map(e => `<button type="button" class="pill emoji ${it.emoji === e ? 'on' : ''}" data-act="form-emoji" data-v="${esc(e)}">${e}</button>`).join('')}
    </div>
    <div class="field"><span class="lbl">備註（哪裡買、大概多少錢）</span>
      <input type="text" id="f-note" value="${esc(it.note || '')}" placeholder="例如：百貨公司，預算 3000" maxlength="40">
    </div>
    <div class="set-row">
      <div class="grow"><div class="lab">有打折日期</div><div class="desc">日期要自己輸入，不會自動抓檔期</div></div>
      <button class="sw ${hasSale ? 'on' : ''}" data-act="form-sale-on" role="switch" aria-checked="${hasSale}" aria-label="有打折日期"></button>
    </div>
    <div id="f-sale" class="${hasSale ? '' : 'hidden'}">
      <div class="lbl">檔期名稱</div>
      <div class="pills wrap">${salePills}</div>
      <div class="field" style="margin-top:10px"><span class="lbl">或自己填</span>
        <input type="text" id="f-sale-name" value="${esc(it.saleName || '')}" placeholder="例如：週年慶" maxlength="16">
      </div>
      <div class="field" style="margin-top:10px"><span class="lbl">打折日期（請手動輸入）</span>
        <input type="date" id="f-sale-date" value="${esc(it.saleDate || '')}">
      </div>
      <div class="lbl" style="margin:12px 0 8px">提前幾天提醒</div>
      <div class="pills wrap">
        ${[0, 1, 3, 7].map(n => `<button type="button" class="pill ${(Number(it.remindDays) || 0) === n ? 'on' : ''}" data-act="form-remind-days" data-n="${n}">${n === 0 ? '當天' : n + ' 天'}</button>`).join('')}
      </div>
      <div class="lbl" style="margin:12px 0 8px">提醒方式</div>
      <div class="pills wrap">
        <button type="button" class="pill ${it.remindMode !== 'alarm' ? 'on' : ''}" data-act="form-remind-mode" data-v="notify">通知</button>
        <button type="button" class="pill ${it.remindMode === 'alarm' ? 'on amber' : ''}" data-act="form-remind-mode" data-v="alarm">鬧鐘</button>
      </div>
    </div>
    <div class="btns">
      <button class="btn plum" type="button" data-act="save-item" data-id="${esc(isEdit ? existing.id : '')}">儲存</button>
      <button class="btn ghost" type="button" data-act="close-sheet">取消</button>
    </div>
    ${isEdit ? `<button class="link red" type="button" data-act="delete-item" data-id="${esc(existing.id)}">刪除這個項目</button>` : ''}
  `);
  bind($('#dlg'));
  const title = $('#f-title');
  if (title) { title.focus(); title.select(); }
  $('#dlg')._form = {
    kind: 'buy',
    emoji: it.emoji || '🧥',
    saleOn: hasSale,
    saleName: it.saleName || '',
    remindDays: Number(it.remindDays) || 0,
    remindMode: it.remindMode === 'alarm' ? 'alarm' : 'notify'
  };
}

function rebuildForm() {
  const form = $('#dlg')?._form;
  if (!form) return;
  const title = $('#f-title')?.value || '';
  const note = $('#f-note')?.value || '';
  const sid = $('[data-act=save-item]')?.dataset.id || '';
  const saleName = $('#f-sale-name')?.value ?? form.saleName ?? '';
  const saleDate = $('#f-sale-date')?.value || '';
  if (form.kind === 'buy') {
    const base = sid ? { ...itemById(sid) } : { list: 'buy' };
    sheetBuy({
      ...base,
      id: sid || undefined,
      title, note,
      emoji: form.emoji,
      saleName: form.saleOn ? saleName : '',
      saleDate: form.saleOn ? saleDate : '',
      remindDays: form.remindDays,
      remindMode: form.remindMode
    });
    if ($('#f-title')) $('#f-title').value = title;
    if ($('#f-note')) $('#f-note').value = note;
    if ($('#f-sale-name')) $('#f-sale-name').value = saleName;
    if ($('#f-sale-date') && saleDate) $('#f-sale-date').value = saleDate;
    $('#dlg')._form = { ...form, saleName };
    return;
  }
  const base = sid ? { ...itemById(sid) } : { title: '', note: '', weekdays: form.weekdays };
  sheetItem({ ...base, title, note, ...form, id: sid || undefined }, form.list);
  if ($('#f-title')) $('#f-title').value = title;
  if ($('#f-note')) $('#f-note').value = note;
  $('#dlg')._form = form;
}

function saveItem(id) {
  const form = $('#dlg')._form || {};
  const title = ($('#f-title')?.value || '').trim();
  if (!title) { toast('先寫名稱'); $('#f-title')?.focus(); return; }
  const note = ($('#f-note')?.value || '').trim();
  if (form.kind === 'buy') {
    const saleOn = !!form.saleOn;
    const saleName = saleOn ? (($('#f-sale-name')?.value || form.saleName || '').trim()) : '';
    const saleDate = saleOn ? ($('#f-sale-date')?.value || '') : '';
    if (saleOn && !saleDate) { toast('請輸入打折日期，或關掉打折日期'); return; }
    const payload = {
      list: 'buy', title, note,
      emoji: form.emoji || '🧥',
      saleName, saleDate,
      remindDays: Number(form.remindDays) || 0,
      remindMode: form.remindMode === 'alarm' ? 'alarm' : 'notify'
    };
    if (id) {
      const it = itemById(id);
      if (!it) return;
      Object.assign(it, payload);
      save(); closeSheet(); toast('已更新'); render(); return;
    }
    state.items.push({ id: uid(), boughtOn: null, ...payload });
    save(); closeSheet(); toast('已加入想買的東西'); render(); return;
  }
  const list = form.list === 'evening' ? 'evening' : 'morning';
  const repeat = form.repeat || 'daily';
  const weekdays = repeat === 'weekly' ? [...(form.weekdays || [])].sort((a, b) => a - b) : [];
  if (repeat === 'weekly' && !weekdays.length) { toast('先選要提醒的星期'); return; }
  const emoji = form.emoji || (D.EMOJIS[list][0] || '📝');
  if (id) {
    const it = itemById(id);
    if (!it) return;
    Object.assign(it, { title, note, list, repeat, weekdays, emoji });
    if (repeat !== 'once') it.completedOnce = false;
    save(); closeSheet(); toast('已更新'); render(); return;
  }
  state.items.push({ id: uid(), list, title, note, emoji, repeat, weekdays, doneOn: null, completedOnce: false });
  save(); closeSheet(); toast('已加入' + D.LISTS[list].name); render();
}

function toggleItem(id) {
  const it = itemById(id);
  if (!it) return;
  if (it.list === 'buy') {
    if (it.boughtOn) {
      it.boughtOn = null;
      save(); toast('已改回想買'); render(); return;
    }
    it.boughtOn = today();
    save(); toast(`「${it.title}」已移到已買`); render(); return;
  }
  const d = today();
  if (D.isDoneOn(it, d)) {
    it.doneOn = null;
    if (it.repeat === 'once') it.completedOnce = false;
    save(); render(); return;
  }
  it.doneOn = d;
  if (it.repeat === 'once') {
    it.completedOnce = true;
    save(); toast(`「${it.title}」已完成，不會再提醒`); render(); return;
  }
  save(); render();
}

function deleteItem(id) {
  const it = itemById(id);
  if (!it) return;
  if (!confirm(`確定刪除「${it.title}」？`)) return;
  state.items = state.items.filter(x => x.id !== id);
  save(); closeSheet(); toast('已刪除'); render();
}

function maybeWelcome() {
  try {
    if (localStorage.getItem(WELCOME_KEY)) return;
  } catch { return; }
  localStorage.setItem(WELCOME_KEY, '1');
  openSheet(`
    <h2>這是可點的 DEMO</h2>
    <div class="muted">看看改過的「出門備忘」。內容都是範例資料，不是正式 App。</div>
    <div class="note">主角是桌面小工具：今天要帶出門、下班順便做的項目可以直接在小工具上打勾或新增。想買的東西只在 App 裡，不會出現在小工具。</div>
    <div class="note amber">早上、下班都可以自己設定時間和星期，並選擇「通知」或「鬧鐘」。打折日期請自己輸入，到了提前提醒日可以用通知或鬧鐘提醒你。</div>
    <button class="btn" data-act="close-sheet">開始用</button>
  `);
  bind($('#dlg'));
}

function bind(root) {
  root.querySelectorAll('[data-act]').forEach(el => {
    el.addEventListener('click', ev => {
      onAct(el.dataset.act, el, ev);
    });
  });
  root.querySelectorAll('[data-bind-time]').forEach(el => {
    el.addEventListener('change', () => {
      const slot = el.dataset.bindTime;
      const box = el.closest('.times');
      if (!box || !state.settings[slot]) return;
      const h = box.querySelector('[data-part=h]')?.value || '07';
      const m = box.querySelector('[data-part=m]')?.value || '00';
      state.settings[slot].time = `${h}:${m}`;
      save();
    });
  });
}

function onAct(act, el, ev) {
  const id = el.dataset.id;
  if (act === 'back') {
    ev.preventDefault();
    if (history.length > 1) history.back();
    else go('#/');
  } else if (act === 'noop') {
    ev.preventDefault();
  } else if (act === 'go') {
    ev.preventDefault();
    go(el.dataset.hash || '#/');
  } else if (act === 'toggle') {
    ev.preventDefault();
    ev.stopPropagation();
    toggleItem(id);
  } else if (act === 'edit') {
    ev.preventDefault();
    const it = itemById(id);
    if (it) sheetItem(it);
  } else if (act === 'add') {
    ev.preventDefault();
    ev.stopPropagation();
    sheetItem(null, el.dataset.list || '');
  } else if (act === 'close-sheet') {
    closeSheet();
  } else if (act === 'save-item') {
    ev.preventDefault();
    saveItem(id);
  } else if (act === 'delete-item') {
    ev.preventDefault();
    deleteItem(id);
  } else if (act === 'form-list' || act === 'form-repeat') {
    const form = $('#dlg')._form;
    if (act === 'form-list') form.list = el.dataset.v;
    else form.repeat = el.dataset.v;
    if (act === 'form-list' && !D.EMOJIS[form.list].includes(form.emoji)) form.emoji = D.EMOJIS[form.list][0];
    rebuildForm();
  } else if (act === 'form-emoji') {
    const form = $('#dlg')._form;
    form.emoji = el.dataset.v;
    $('#dlg').querySelectorAll('[data-act=form-emoji]').forEach(b => b.classList.toggle('on', b.dataset.v === form.emoji));
  } else if (act === 'form-day') {
    const form = $('#dlg')._form;
    const d = Number(el.dataset.d);
    const has = (form.weekdays || []).includes(d);
    form.weekdays = has ? form.weekdays.filter(x => x !== d) : [...(form.weekdays || []), d].sort((a, b) => a - b);
    el.classList.toggle('on', !has);
  } else if (act === 'form-sale-on') {
    const form = $('#dlg')._form;
    form.saleOn = !form.saleOn;
    if (form.saleOn && !form.saleName) form.saleName = '週年慶';
    rebuildForm();
  } else if (act === 'form-sale-name') {
    const form = $('#dlg')._form;
    form.saleName = el.dataset.v;
    if ($('#f-sale-name')) $('#f-sale-name').value = form.saleName;
    $('#dlg').querySelectorAll('[data-act=form-sale-name]').forEach(b => b.classList.toggle('on', b.dataset.v === form.saleName));
  } else if (act === 'form-remind-days') {
    const form = $('#dlg')._form;
    form.remindDays = Number(el.dataset.n) || 0;
    $('#dlg').querySelectorAll('[data-act=form-remind-days]').forEach(b => b.classList.toggle('on', Number(b.dataset.n) === form.remindDays));
  } else if (act === 'form-remind-mode') {
    const form = $('#dlg')._form;
    form.remindMode = el.dataset.v;
    $('#dlg').querySelectorAll('[data-act=form-remind-mode]').forEach(b => {
      b.classList.toggle('on', b.dataset.v === form.remindMode);
      b.classList.toggle('amber', b.dataset.v === 'alarm' && form.remindMode === 'alarm');
    });
  } else if (act === 'reset') {
    if (confirm('要恢復成原本的範例資料嗎？你在 DEMO 裡新增或修改的內容會被清掉。')) resetAll();
  } else if (act === 'sim') {
    ev.preventDefault();
    simulate(el.dataset.kind);
  } else if (act === 'toggle-day') {
    const slot = state.settings[el.dataset.slot];
    if (!slot) return;
    const d = Number(el.dataset.d);
    const w = slot.weekdays || [];
    slot.weekdays = w.includes(d) ? w.filter(x => x !== d) : [...w, d].sort((a, b) => a - b);
    save();
    render();
  } else if (act === 'set-mode') {
    const slot = state.settings[el.dataset.slot];
    if (!slot) return;
    slot.mode = el.dataset.v === 'alarm' ? 'alarm' : 'notify';
    save();
    render();
  } else if (act === 'listen-alarm') {
    ev.preventDefault();
    if (alarmListening) { stopBeep(); return; }
    startBeep();
  } else if (act === 'alarm-off') {
    ev.preventDefault();
    hideAlarm();
    toast('已關閉鬧鐘');
    if (el.dataset.list === 'buy') go('#/buy');
    else if (el.dataset.list === 'evening' || el.dataset.list === 'morning') go('#/' + el.dataset.list);
    else if (pathParts()[0] === 'sim') go('#/');
  } else if (act === 'alarm-snooze') {
    ev.preventDefault();
    hideAlarm();
    toast('已設稍後再響（DEMO 只模擬畫面，不會真的倒數）');
    if (pathParts()[0] === 'sim') go('#/');
  } else if (act === 'ask-notify') {
    ev.preventDefault();
    askNotify();
  }
}

async function askNotify() {
  if (typeof Notification === 'undefined') { toast('這個瀏覽器沒有通知功能，請用畫面上的模擬'); return; }
  try {
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? '已允許瀏覽器通知（僅此 DEMO 分頁）' : '沒有開通知也可以用畫面上的模擬');
    render();
  } catch {
    toast('沒有開通知也可以用畫面上的模擬');
  }
}

function render() {
  const app = $('#app');
  const parts = pathParts();
  const root = parts[0] || '';
  hideBanner();
  hideAlarm();
  if (root === 'morning') app.innerHTML = renderList('morning');
  else if (root === 'evening') app.innerHTML = renderList('evening');
  else if (root === 'buy') app.innerHTML = renderBuy();
  else if (root === 'remind') app.innerHTML = renderRemind();
  else if (root === 'widget') { go('#/'); return; }
  else app.innerHTML = renderHome();
  bind(app);
  maybeWelcome();
  if (root === 'sim') {
    const kind = parts[1] === 'evening' || parts[1] === 'sale' || parts[1] === 'morning' ? parts[1] : 'morning';
    if (kind === 'sale') {
      app.innerHTML = renderBuy();
      bind(app);
    }
    simulate(kind);
  }
}

load();
window.addEventListener('hashchange', render);
render();
