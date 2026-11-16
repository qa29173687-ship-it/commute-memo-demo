import * as D from './data.js';

const KEY = 'commute-memo-demo-v1';
const WELCOME_KEY = 'commute-memo-demo-welcome';

const $ = (s, r = document) => r.querySelector(s);
let state, toastTimer, highlightList = null, lastNotify = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === D.VERSION && Array.isArray(s.items) && s.settings) {
        state = s;
        state.settings = { ...D.SEED_SETTINGS, ...s.settings, workdays: [...(s.settings.workdays || D.SEED_SETTINGS.workdays)] };
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
    ['today', '今天', '☀️', '#/'],
    ['morning', '出門', '👜', '#/morning'],
    ['evening', '順便', '🛒', '#/evening'],
    ['remind', '提醒', '⏰', '#/remind']
  ];
  return `<nav class="nav">${items.map(([k, lab, ico, href]) =>
    `<a href="${href}" class="${k === active ? 'on' : ''}"><span class="ico">${ico}</span>${lab}</a>`
  ).join('')}</nav>`;
}

function topBar(title, sub, back) {
  return `<div class="demo-banner">這是可點的 DEMO · 以下皆為範例資料，不是正式 App</div>
  <div class="top">
    ${back ? `<button class="back" data-act="back" aria-label="返回">←</button>` : `<span class="back" aria-hidden="true">☀️</span>`}
    <div class="t"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
  </div>`;
}

function fab(list) {
  return `<button class="fab" data-act="add" data-list="${esc(list || '')}" aria-label="新增項目">＋</button>`;
}

function itemRow(it, opts = {}) {
  const d = today();
  const day = todayDow();
  const done = D.isDoneOn(it, d);
  const due = D.stillVisibleToday(it, d, day) || (it.repeat === 'once' && it.completedOnce && it.doneOn === d);
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

function sectionList(list, items, emptyText) {
  return items.length
    ? items.map(it => itemRow(it, { showOff: true })).join('')
    : `<div class="card empty"><div class="e">${D.LISTS[list].emoji}</div>${esc(emptyText)}</div>`;
}

function renderToday() {
  const d = today(), day = todayDow();
  const morn = todayItems('morning');
  const eve = todayItems('evening');
  const leftM = remaining('morning').length;
  const leftE = remaining('evening').length;
  const left = leftM + leftE;
  const work = D.isWorkday(state.settings, day);
  const hero = left === 0
    ? `<div class="hero done"><div class="s">${esc(D.dateLabel(now()))}</div><div class="big">今天都打完了</div><div class="s">明天清單會自動再出現。一次性的項目完成後就不會再提醒。</div></div>`
    : `<div class="hero"><div class="s">${esc(D.dateLabel(now()))}</div><div class="big">今天還有 ${left} 件沒打勾</div><div class="s">出門帶 ${leftM} · 順便做 ${leftE}${work ? '' : ' · 今天不在固定提醒日'}</div></div>`;

  const hiM = highlightList === 'morning' ? ' hi' : '';
  const hiE = highlightList === 'evening' ? ' hi' : '';

  return `${topBar('出門備忘', '上班帶出門 · 下班順便做')}
  <div class="body">
    ${hero}
    <div class="sec${hiM}" id="sec-morning"><a href="#/morning" class="ttl">👜 上班帶出門 <span class="count">${morn.filter(i => D.isDoneOn(i, d)).length}/${morn.length}</span></a></div>
    ${morn.length ? morn.map(it => itemRow(it)).join('') : `<div class="card empty"><div class="e">👜</div>今天沒有要帶出門的項目</div>`}
    <div class="sec${hiE}" id="sec-evening"><a href="#/evening" class="ttl">🛒 下班順便做 <span class="count">${eve.filter(i => D.isDoneOn(i, d)).length}/${eve.length}</span></a></div>
    ${eve.length ? eve.map(it => itemRow(it)).join('') : `<div class="card empty"><div class="e">🛒</div>今天沒有要順便做的事</div>`}
    ${widgetCard(true)}
    ${simCard()}
    <button class="link" data-act="reset">恢復範例資料</button>
  </div>
  ${fab('')}
  ${navHtml('today')}`;
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
    <div class="note ${list === 'evening' ? 'amber' : ''}">今天只會提醒到期的項目。例如「週三倒垃圾」在別的日子不會出現在今天清單。</div>
    ${due.length ? `<div class="sec"><span class="ttl">今天要${meta.verb}</span></div>` : ''}
    ${sectionList(list, due, '還沒有今天的項目，按右下角＋新增')}
    ${rest.length ? `<div class="sec"><span class="ttl">其他日子</span><span>今天不用提醒</span></div>${rest.map(it => itemRow(it, { showOff: true })).join('')}` : ''}
    ${onceDone.length ? `<div class="sec"><span class="ttl">已完成、不再提醒</span></div>${onceDone.map(it => itemRow(it, { showOff: false })).join('')}` : ''}
  </div>
  ${fab(list)}
  ${navHtml(list)}`;
}

function widgetCard(compact) {
  const leftM = remaining('morning');
  const leftE = remaining('evening');
  const n = leftM.length + leftE.length;
  const chips = (arr) => arr.length
    ? `<div class="wgrid">${arr.map(it => `<span class="wchip"><span class="dot"></span>${esc(it.emoji || '')} ${esc(it.title)}</span>`).join('')}</div>`
    : `<div class="hint">都打完了</div>`;
  const inner = `<div class="widget" ${compact ? 'data-act="open-widget"' : ''}>
    <div class="wh"><div class="wt">出門備忘</div><div class="wd">${esc(D.shortDate(now()))}</div></div>
    <div class="remain">${n ? `今天還有 ${n} 件` : '今天都打完了'}</div>
    <div class="sec-l">👜 上班帶出門</div>
    ${chips(leftM)}
    <div class="sec-l">🛒 下班順便做</div>
    ${chips(leftE)}
    <div class="add"><button class="wadd" data-act="add" data-list="" data-stop="1">＋ 新增</button></div>
  </div>`;
  if (!compact) return inner;
  return `<div class="sec"><span class="ttl">桌面小工具預覽</span><a href="#/widget">完整預覽</a></div>
    <div class="card tap" data-act="open-widget" style="padding:12px;background:linear-gradient(180deg,#E8F2FB,#FFF3E0)">${inner}</div>`;
}

function renderWidget() {
  return `${topBar('桌面小工具預覽', '正式 App 可放在手機桌面', true)}
  <div class="body">
    <div class="homescreen">
      <div class="hs-bar"><span>9:41</span><span>▮▮▮ 🔋</span></div>
      ${widgetCard(false)}
      <div class="icons">
        <div class="ico-app"><div class="sq">☀️</div>出門備忘</div>
        <div class="ico-app"><div class="sq" style="background:#fff">📞</div>電話</div>
        <div class="ico-app"><div class="sq">💬</div>訊息</div>
        <div class="ico-app"><div class="sq">📷</div>相機</div>
      </div>
    </div>
    <div class="note">正式 Android App 可以把這個小工具放在桌面，打開就能看到今天還沒做的，也可以按「＋」快速新增。這個 DEMO 只是預覽畫面。</div>
  </div>
  ${navHtml('today')}`;
}

function simCard() {
  const s = state.settings;
  return `<div class="sec"><span class="ttl">模擬通知</span></div>
  <div class="card">
    <div class="muted" style="margin-bottom:10px">這是 DEMO，不會真的設定系統鬧鐘。點下面按鈕看看通知長什麼樣子，再點通知就能打開清單。</div>
    <div class="sim-grid">
      <button class="btn" data-act="sim" data-kind="morning">早上 ${esc(s.morningTime)} 出門前</button>
      <button class="btn amber" data-act="sim" data-kind="evening">下班 ${esc(s.eveningTime)} 前提醒</button>
      <button class="btn ghost" data-act="sim" data-kind="leave">離開「${esc(s.officeName)}」時</button>
    </div>
    ${s.snoozeOn ? `<div class="hint" style="margin-top:10px">若沒打勾，${s.snoozeMin} 分鐘後會再提醒一次。模擬完通知後，可再按「模擬再提醒」看看。</div>
      <button class="link" data-act="sim" data-kind="snooze">模擬：${s.snoozeMin} 分鐘後再提醒</button>` : ''}
  </div>`;
}


function timeSelects(key, value) {
  const [h, m] = String(value || '07:30').split(':');
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const mm = String(m || '00').padStart(2, '0');
  const minOpts = mins.includes(mm) ? mins : [...mins, mm].sort();
  const opt = (arr, cur) => arr.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v}</option>`).join('');
  return `<div class="times">
    <select data-bind-time="${esc(key)}" data-part="h" aria-label="時">${opt(hours, String(h).padStart(2, '0'))}</select>
    <span class="colon">:</span>
    <select data-bind-time="${esc(key)}" data-part="m" aria-label="分">${opt(minOpts, mm)}</select>
  </div>`;
}

function renderRemind() {
  const s = state.settings;
  const day = todayDow();
  const work = D.isWorkday(s, day);
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const permLab = perm === 'granted' ? '已允許（模擬時也會跳出瀏覽器通知）' : perm === 'denied' ? '已拒絕，不影響畫面上的模擬' : '尚未詢問。沒開也可以用畫面上的模擬。';
  const dayPills = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button type="button" class="pill ${s.workdays.includes(d) ? 'on' : ''}" data-act="toggle-workday" data-d="${d}">週${D.WEEKDAYS[d]}</button>`
  ).join('');
  const snoozePills = [5, 10, 15, 30].map(n =>
    `<button type="button" class="pill ${s.snoozeMin === n ? 'on amber' : ''}" data-act="set-snooze" data-n="${n}">${n} 分鐘</button>`
  ).join('');
  return `${topBar('提醒設定', '時間是主力，離開地點當保險', true)}
  <div class="body">
    <div class="note">建議兩種一起用：固定時間最穩也最省電；離開家或公司時再補一槍，不怕今天比較早走。今天是${esc(D.dateLabel(now()))}，${work ? '會發固定時間通知' : '不在你選的提醒日，不會發固定時間通知'}。</div>
    <div class="card">
      <div class="lbl" style="margin-bottom:8px">固定時間通知（上班日）</div>
      <div class="field"><span class="lbl">早上出門前</span>
        ${timeSelects('morningTime', s.morningTime)}
      </div>
      <div class="field" style="margin-top:10px"><span class="lbl">下班前</span>
        ${timeSelects('eveningTime', s.eveningTime)}
      </div>
      <div class="lbl" style="margin:14px 0 8px">哪些天要提醒</div>
      <div class="pills wrap">${dayPills}</div>
    </div>
    <div class="card">
      <div class="set-row">
        <div class="grow"><div class="lab">離開地點提醒</div><div class="desc">偵測到你離開家或公司就跳通知</div></div>
        <button class="sw ${s.geoRemind ? 'on' : ''}" data-act="toggle-geo" role="switch" aria-checked="${s.geoRemind}" aria-label="離開地點提醒"></button>
      </div>
      <div class="field" style="margin-top:12px"><span class="lbl">家</span>
        <input type="text" data-bind="homeName" value="${esc(s.homeName)}" maxlength="20">
      </div>
      <div class="field" style="margin-top:10px"><span class="lbl">公司</span>
        <input type="text" data-bind="officeName" value="${esc(s.officeName)}" maxlength="20">
      </div>
      <div class="hint" style="margin-top:10px">正式 Android App 會用地理圍欄：離開「家」時提醒帶出門的東西，離開「公司」時提醒順便要做的事。這個 DEMO 只模擬畫面，<b>不會追蹤你的位置</b>，請用「模擬通知」體驗。</div>
    </div>
    <div class="card">
      <div class="set-row">
        <div class="grow"><div class="lab">沒打勾再提醒</div><div class="desc">通知滑掉就再叫一次</div></div>
        <button class="sw ${s.snoozeOn ? 'on' : ''}" data-act="toggle-snooze" role="switch" aria-checked="${s.snoozeOn}" aria-label="沒打勾再提醒"></button>
      </div>
      ${s.snoozeOn ? `<div class="lbl" style="margin:14px 0 8px">幾分鐘後再提醒</div><div class="pills wrap">${snoozePills}</div>` : ''}
    </div>
    <div class="card">
      <div class="lab">瀏覽器通知（選用）</div>
      <div class="hint" style="margin:6px 0 10px">${esc(permLab)}</div>
      ${perm === 'default' ? `<button class="btn ghost" data-act="ask-notify">允許瀏覽器通知</button>` : ''}
      ${perm === 'granted' ? `<div class="badge ok">已允許</div>` : ''}
    </div>
    ${simCard()}
    <button class="link" data-act="reset">恢復範例資料</button>
  </div>
  ${navHtml('remind')}`;
}

function notifyCopy(kind) {
  const s = state.settings;
  const morn = remaining('morning');
  const eve = remaining('evening');
  const names = (arr) => arr.map(it => it.title).slice(0, 3).join('、') + (arr.length > 3 ? '…' : '');
  if (kind === 'morning') {
    const n = morn.length;
    return {
      list: 'morning',
      title: `${D.formatTime(s.morningTime)}，出門前別忘了`,
      body: n ? `${names(morn)}，還有 ${n} 件要帶` : '今天要帶的都打過勾了',
      sysTitle: '出門備忘 · 上班帶出門'
    };
  }
  if (kind === 'evening') {
    const n = eve.length;
    return {
      list: 'evening',
      title: `${D.formatTime(s.eveningTime)}，下班順便記得`,
      body: n ? `${names(eve)}，還有 ${n} 件` : '今天要順便做的都打過勾了',
      sysTitle: '出門備忘 · 下班順便做'
    };
  }
  if (kind === 'leave') {
    const n = eve.length;
    return {
      list: 'evening',
      title: `你離開「${s.officeName}」了`,
      body: n ? `回家順便：${names(eve)}，還有 ${n} 件` : '今天要順便做的都打過勾了',
      sysTitle: '出門備忘 · 離開地點'
    };
  }
  const all = [...morn, ...eve];
  const n = all.length;
  return {
    list: morn.length ? 'morning' : 'evening',
    title: `再提醒一次，還有 ${n} 件沒打勾`,
    body: n ? names(all) : '都打完了，不會再叫你',
    sysTitle: '出門備忘 · 再提醒'
  };
}

function hideBanner() {
  const el = $('#nban');
  el.classList.add('hidden');
  el.hidden = true;
  el.innerHTML = '';
  el.onclick = null;
}

function showBanner(kind) {
  const c = notifyCopy(kind);
  lastNotify = kind;
  const el = $('#nban');
  el.innerHTML = `<div class="app"><span class="dot">☀️</span>出門備忘<span class="when">現在</span></div>
    <div class="ttl">${esc(c.title)}</div>
    <div class="bd">${esc(c.body)}</div>`;
  el.classList.remove('hidden');
  el.hidden = false;
  el.setAttribute('data-act', 'open-from-notify');
  el.setAttribute('data-list', c.list);
  el.onclick = ev => {
    ev.preventDefault();
    openFromNotify(c.list);
  };
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(c.sysTitle, { body: `${c.title}｜${c.body}`, icon: 'favicon.svg' }); } catch (_) { /* 忽略 */ }
  }
}

function openFromNotify(list) {
  hideBanner();
  highlightList = list === 'evening' ? 'evening' : 'morning';
  const parts = pathParts();
  if (parts[0] === 'notify' || location.hash !== '#/' && location.hash !== '') {
    go('#/');
  } else {
    render();
  }
  setTimeout(() => {
    const id = highlightList === 'evening' ? 'sec-evening' : 'sec-morning';
    const node = document.getElementById(id);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { highlightList = null; }, 2000);
  }, 80);
}

function simulate(kind) {
  if (kind === 'leave' && !state.settings.geoRemind) {
    toast('先到提醒設定打開「離開地點提醒」');
    return;
  }
  if (kind === 'snooze' && !state.settings.snoozeOn) {
    toast('先到提醒設定打開「沒打勾再提醒」');
    return;
  }
  if (kind !== 'snooze' && !D.isWorkday(state.settings) && (kind === 'morning' || kind === 'evening')) {
    toast('今天不在你選的提醒日（DEMO 還是示範給你看）');
  }
  showBanner(kind);
}

function sheetItem(existing, defaultList) {
  const isEdit = !!(existing && existing.id);
  const it = existing || {
    list: defaultList || 'morning',
    title: '',
    emoji: '',
    repeat: 'daily',
    weekdays: [1, 2, 3, 4, 5],
    note: ''
  };
  const list = it.list || 'morning';
  const emojis = D.EMOJIS[list] || D.EMOJIS.morning;
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
    <div class="lbl">圖示</div>
    <div class="pills wrap" id="f-emojis">
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
    list,
    emoji: it.emoji || (emojis[0] || '📝'),
    repeat: it.repeat || 'daily',
    weekdays: [...(it.weekdays || [])]
  };
}

function refreshFormSheet() {
  const form = $('#dlg') && $('#dlg')._form;
  if (!form) return;
  const title = $('#f-title')?.value || '';
  const note = $('#f-note')?.value || '';
  const id = $('[data-act=save-item]')?.dataset.id || '';
  const existing = id ? { ...itemById(id), title, note, ...form } : null;
  sheetItem(existing || null, form.list);
  const f = $('#dlg')._form;
  if (f) Object.assign(f, form);
  if ($('#f-title')) $('#f-title').value = title;
  if ($('#f-note')) $('#f-note').value = note;
  // re-apply visual state after rebuild
  $('#dlg')._form = form;
  // The sheet was rebuilt from existing which now has form fields; days visibility etc. ok.
}

function saveItem(id) {
  const form = $('#dlg')._form || {};
  const title = ($('#f-title')?.value || '').trim();
  if (!title) { toast('先寫要做什麼'); $('#f-title')?.focus(); return; }
  const note = ($('#f-note')?.value || '').trim();
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
    save();
    closeSheet();
    toast('已更新');
    render();
    return;
  }
  state.items.push({
    id: uid(), list, title, note, emoji, repeat, weekdays,
    doneOn: null, completedOnce: false
  });
  save();
  closeSheet();
  toast('已加入' + D.LISTS[list].name);
  const parts = pathParts();
  if (parts[0] !== list && parts[0] !== undefined && parts.length) {
    /* stay */
  }
  render();
}

function toggleItem(id) {
  const it = itemById(id);
  if (!it) return;
  const d = today();
  if (D.isDoneOn(it, d)) {
    it.doneOn = null;
    if (it.repeat === 'once') it.completedOnce = false;
    save();
    render();
    return;
  }
  it.doneOn = d;
  if (it.repeat === 'once') {
    it.completedOnce = true;
    save();
    toast(`「${it.title}」已完成，不會再提醒`);
    render();
    return;
  }
  save();
  render();
}

function deleteItem(id) {
  const it = itemById(id);
  if (!it) return;
  if (!confirm(`確定刪除「${it.title}」？`)) return;
  state.items = state.items.filter(x => x.id !== id);
  save();
  closeSheet();
  toast('已刪除');
  render();
}

function maybeWelcome() {
  try {
    if (localStorage.getItem(WELCOME_KEY)) return;
  } catch { return; }
  localStorage.setItem(WELCOME_KEY, '1');
  openSheet(`
    <h2>這是可點的 DEMO</h2>
    <div class="muted">看看「出門備忘」可以怎麼用，內容都是範例資料，不是正式 App。</div>
    <div class="note">你可以：查看今天的清單並打勾、新增或編輯項目、設定每天／指定星期／只一次、調整提醒時間、模擬早上、下班前或離開公司的通知、預覽桌面小工具。</div>
    <div class="note amber">建議提醒方式：上班日固定時間當主力（早上 ${esc(D.SEED_SETTINGS.morningTime)}、下班 ${esc(D.SEED_SETTINGS.eveningTime)}），離開地點當保險；沒打勾就 ${D.SEED_SETTINGS.snoozeMin} 分鐘後再叫一次。</div>
    <button class="btn" data-act="close-sheet">開始用</button>
  `);
  bind($('#dlg'));
}

function bind(root) {
  root.querySelectorAll('[data-act]').forEach(el => {
    el.addEventListener('click', ev => {
      if (el.dataset.stop && ev.target.closest('[data-stop="1"]') !== el && ev.target.closest('button')) return;
      onAct(el.dataset.act, el, ev);
    });
  });
  root.querySelectorAll('[data-stop="1"]').forEach(el => {
    el.addEventListener('click', ev => ev.stopPropagation());
  });
  root.querySelectorAll('[data-bind]').forEach(el => {
    const apply = () => {
      const k = el.dataset.bind;
      if (!k) return;
      state.settings[k] = el.value;
      save();
    };
    el.addEventListener('change', apply);
    el.addEventListener('input', apply);
  });
  root.querySelectorAll('[data-bind-time]').forEach(el => {
    el.addEventListener('change', () => {
      const key = el.dataset.bindTime;
      const box = el.closest('.times');
      if (!box) return;
      const h = box.querySelector('[data-part=h]')?.value || '07';
      const m = box.querySelector('[data-part=m]')?.value || '00';
      state.settings[key] = `${h}:${m}`;
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
  } else if (act === 'form-list') {
    const form = $('#dlg')._form;
    form.list = el.dataset.v;
    if (!D.EMOJIS[form.list].includes(form.emoji)) form.emoji = D.EMOJIS[form.list][0];
    const title = $('#f-title')?.value || '';
    const note = $('#f-note')?.value || '';
    const sid = $('[data-act=save-item]')?.dataset.id || '';
    const base = sid ? { ...itemById(sid) } : { title: '', note: '', weekdays: form.weekdays };
    sheetItem({ ...base, title, note, ...form, id: sid || undefined }, form.list);
    if ($('#f-title')) $('#f-title').value = title;
    if ($('#f-note')) $('#f-note').value = note;
    $('#dlg')._form = form;
  } else if (act === 'form-emoji') {
    const form = $('#dlg')._form;
    form.emoji = el.dataset.v;
    $('#dlg').querySelectorAll('[data-act=form-emoji]').forEach(b => b.classList.toggle('on', b.dataset.v === form.emoji));
  } else if (act === 'form-repeat') {
    const form = $('#dlg')._form;
    form.repeat = el.dataset.v;
    const title = $('#f-title')?.value || '';
    const note = $('#f-note')?.value || '';
    const sid = $('[data-act=save-item]')?.dataset.id || '';
    const base = sid ? { ...itemById(sid) } : { title: '', note: '', weekdays: form.weekdays };
    sheetItem({ ...base, title, note, ...form, id: sid || undefined }, form.list);
    if ($('#f-title')) $('#f-title').value = title;
    if ($('#f-note')) $('#f-note').value = note;
    $('#dlg')._form = form;
  } else if (act === 'form-day') {
    const form = $('#dlg')._form;
    const d = Number(el.dataset.d);
    const has = (form.weekdays || []).includes(d);
    form.weekdays = has ? form.weekdays.filter(x => x !== d) : [...(form.weekdays || []), d].sort((a, b) => a - b);
    el.classList.toggle('on', !has);
  } else if (act === 'reset') {
    if (confirm('要恢復成原本的範例資料嗎？你在 DEMO 裡新增或修改的內容會被清掉。')) resetAll();
  } else if (act === 'sim') {
    ev.preventDefault();
    simulate(el.dataset.kind);
  } else if (act === 'open-from-notify') {
    ev.preventDefault();
    openFromNotify(el.dataset.list);
  } else if (act === 'open-widget') {
    go('#/widget');
  } else if (act === 'toggle-workday') {
    const d = Number(el.dataset.d);
    const w = state.settings.workdays || [];
    state.settings.workdays = w.includes(d) ? w.filter(x => x !== d) : [...w, d].sort((a, b) => a - b);
    save();
    render();
  } else if (act === 'toggle-geo') {
    state.settings.geoRemind = !state.settings.geoRemind;
    save();
    render();
  } else if (act === 'toggle-snooze') {
    state.settings.snoozeOn = !state.settings.snoozeOn;
    save();
    render();
  } else if (act === 'set-snooze') {
    state.settings.snoozeMin = Number(el.dataset.n) || 10;
    save();
    render();
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
  if (root === 'morning') app.innerHTML = renderList('morning');
  else if (root === 'evening') app.innerHTML = renderList('evening');
  else if (root === 'remind') app.innerHTML = renderRemind();
  else if (root === 'widget') app.innerHTML = renderWidget();
  else if (root === 'notify') {
    app.innerHTML = renderToday();
  } else {
    app.innerHTML = renderToday();
  }
  bind(app);
  maybeWelcome();
  if (root === 'notify') {
    const kind = parts[1] === 'evening' || parts[1] === 'leave' || parts[1] === 'snooze' || parts[1] === 'morning' ? parts[1] : 'morning';
    highlightList = kind === 'evening' || kind === 'leave' ? 'evening' : 'morning';
    showBanner(kind);
  }
}

load();
window.addEventListener('hashchange', render);
render();
