import * as D from './data.js';

const KEY = 'commute-memo-demo-v4';
const WELCOME_KEY = 'commute-memo-demo-welcome-v4';

const $ = (s, r = document) => r.querySelector(s);
let state, toastTimer, highlightList = null;
let audioCtx = null, beepTimer = null, alarmListening = false;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === D.VERSION && Array.isArray(s.items) && s.settings?.evening && s.settings?.night) {
        state = s;
        for (const k of ['evening', 'night']) {
          state.settings[k] = { ...D.SEED_SETTINGS[k], ...s.settings[k], weekdays: [...(s.settings[k].weekdays || D.SEED_SETTINGS[k].weekdays)] };
        }
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

function isViewTomorrow() {
  return (pathParts()[0] || '') === 'tomorrow';
}

function viewISO() {
  return isViewTomorrow() ? D.addDays(today(), 1) : today();
}

function viewDay() {
  return D.dow(D.dateFromISO(viewISO()));
}

function addTargetISO() {
  if (isViewTomorrow()) return D.addDays(today(), 1);
  return D.defaultWhen(now()) === 'tomorrow' ? D.addDays(today(), 1) : today();
}

function itemsDue(list, dateStr, day) {
  return itemsOf(list).filter(it => D.stillVisibleToday(it, dateStr, day));
}

function todayItems(list) {
  return itemsDue(list, today(), todayDow());
}

function remaining(list, dateStr) {
  const d = dateStr || today();
  const day = D.dow(D.dateFromISO(d));
  return itemsDue(list, d, day).filter(it => !D.isDoneOn(it, d));
}

function whenWord(dateStr) {
  if (dateStr === today()) return '今天';
  if (dateStr === D.addDays(today(), 1)) return '明天';
  return D.isoLabel(dateStr);
}

function uid() {
  return 'i-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function typeBadge(it, cls = 'badge') {
  const lab = D.typeLabel(it.type);
  if (!lab) return '';
  const kind = it.type === 'buy' ? 'buytag' : 'take';
  return `<span class="${cls} ${kind}">${lab}</span>`;
}

function navHtml(active) {
  const items = [
    ['home', '桌面', '📱', '#/'],
    ['evening', '順便', '🛒', '#/evening'],
    ['morning', '出門', '👜', '#/morning'],
    ['buy', '淘寶', '📦', '#/buy'],
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
  return `<button class="fab${plum}" data-act="add" data-list="${esc(list || 'evening')}" aria-label="新增項目">＋</button>`;
}

function itemRow(it, opts = {}) {
  const d = opts.date || today();
  const day = opts.day ?? D.dow(D.dateFromISO(d));
  const done = D.isDoneOn(it, d);
  const showOff = opts.showOff && !D.isDueOn(it, d, day) && !(it.repeat === 'once' && it.completedOnce);
  if (it.repeat === 'once' && it.completedOnce && opts.hideOnce) return '';
  const when = D.whenLabel(it, today());
  const meta = [when, it.note, showOff ? '今天不用提醒' : ''].filter(Boolean).join(' · ');
  const badge = it.list === 'evening' ? typeBadge(it) : '';
  return `<div class="card item-card ${showOff ? 'off' : ''}">
    <div class="check">
      <button class="chk ${done ? 'on' : ''}" data-act="toggle" data-id="${esc(it.id)}" aria-label="${done ? '取消打勾' : '打勾'}" aria-pressed="${done}">${done ? '✓' : ''}</button>
      <div class="grow body-t" data-act="edit" data-id="${esc(it.id)}">
        <div class="iname ${done ? 'done' : ''}">${esc(it.emoji || '')} ${esc(it.title)}${badge ? ` <span class="tag">${badge}</span>` : ''}</div>
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
  if (bought) tags.push(`<span class="badge ok">已買${it.boughtOn ? ' · ' + esc(D.isoLabel(it.boughtOn)) : ''}</span>`);
  return `<div class="card item-card sale-row ${bought ? 'off' : ''}">
    <div class="check">
      <button class="chk ${bought ? 'on' : ''}" data-act="toggle" data-id="${esc(it.id)}" aria-label="${bought ? '改回未買' : '標記已買'}" aria-pressed="${bought}">${bought ? '✓' : ''}</button>
      <div class="grow body-t" data-act="edit" data-id="${esc(it.id)}">
        <div class="iname ${bought ? 'done' : ''}">${esc(it.emoji || '')} ${esc(it.title)}</div>
        ${it.note ? `<div class="item-meta">${esc(it.note)}</div>` : ''}
        ${tags.length ? `<div class="meta-tags">${tags.join('')}</div>` : `<div class="item-meta">還沒有設定打折日期</div>`}
      </div>
      <button class="more" data-act="edit" data-id="${esc(it.id)}" aria-label="編輯">⋯</button>
    </div>
  </div>`;
}

function frequentBlock(list, compact) {
  const d = addTargetISO(), day = D.dow(D.dateFromISO(d));
  const word = whenWord(d);
  const chips = (D.FREQUENT[list] || []).map((f, i) => {
    const exists = itemsOf(list).some(it => it.title === f.title && D.stillVisibleToday(it, d, day));
    const on = exists ? 'used' : (list === 'evening' ? 'on amber' : 'on');
    return `<button type="button" class="pill ${on}" data-act="add-freq" data-list="${list}" data-i="${i}">${esc(f.emoji || '')} ${esc(f.title)}</button>`;
  }).join('');
  const label = compact
    ? (list === 'evening' ? `下班常用 · 加入${word}` : `出門常用 · 加入${word}`)
    : `常用項目，點一下加入${word}`;
  return `<div class="freq">
    <div class="lbl">${label}</div>
    <div class="pills wrap">${chips}</div>
  </div>`;
}

function widgetBlock() {
  const d = viewISO();
  const day = viewDay();
  const preview = isViewTomorrow();
  const eve = itemsDue('evening', d, day);
  const morn = itemsDue('morning', d, day);
  const leftE = remaining('evening', d).length;
  const leftM = remaining('morning', d).length;
  const word = preview ? '明天' : '今天';
  const rows = (arr) => arr.length
    ? arr.map(it => {
        const done = D.isDoneOn(it, d);
        const tag = it.list === 'evening' && D.typeLabel(it.type)
          ? `<span class="wtag ${it.type === 'buy' ? 'buytag' : 'take'}">${D.typeLabel(it.type)}</span>`
          : '';
        return `<button type="button" class="wrow ${done ? 'done' : ''}" data-act="toggle" data-id="${esc(it.id)}">
          <span class="wchk">${done ? '✓' : ''}</span>
          <span class="wname">${esc(it.emoji || '')} ${esc(it.title)}</span>
          ${tag}
        </button>`;
      }).join('')
    : `<div class="hint">${word}沒有項目</div>`;
  const remain = (leftE || leftM)
    ? `${word}順便還有 ${leftE} 件 · 出門 ${leftM} 件`
    : `${word}都打完了`;
  return `<div class="widget">
    <div class="wh"><div class="wt">出門備忘</div><div class="wd">${esc(D.shortDate(D.dateFromISO(d)))}</div></div>
    <div class="view-pills" role="tablist" aria-label="預覽日期">
      <button type="button" class="vpill ${preview ? '' : 'on'}" data-act="go" data-hash="#/">看今天</button>
      <button type="button" class="vpill ${preview ? 'on' : ''}" data-act="go" data-hash="#/tomorrow">看明天</button>
    </div>
    <div class="remain eve">${remain}</div>
    <div class="sec-l eve">🛒 下班順便做</div>
    ${rows(eve)}
    <div class="sec-l">👜 上班帶出門</div>
    ${rows(morn)}
    <div class="add"><button class="wadd" data-act="add" data-list="evening" type="button">＋ 新增順便</button></div>
  </div>`;
}

function renderHome() {
  const preview = isViewTomorrow();
  const d = viewISO();
  const sub = preview
    ? `正在看明天 · ${D.dateLabel(D.dateFromISO(d))}`
    : `${D.dateLabel(now())} · 先看下班順便做`;
  return `${topBar('出門備忘', sub)}
  <div class="body home">
    <div class="homescreen">
      <div class="hs-bar"><span>9:41</span><span>▮▮▮ 🔋</span></div>
      ${widgetBlock()}
    </div>
    <div class="sim-row">
      <button class="btn ghost" type="button" data-act="sim" data-kind="night">模擬前一晚提醒</button>
      <button class="btn amber" type="button" data-act="sim" data-kind="tomorrow">模擬明天下班提醒</button>
    </div>
    <div class="card freq-card">
      ${frequentBlock('evening', true)}
      <div style="height:8px"></div>
      ${frequentBlock('morning', true)}
    </div>
    <div class="note amber">今晚先把明天的順便事項加進去，可用「看明天」預覽。前一晚提醒會列出明天出門帶和明天下班順便；隔天下班提醒會再列出當天要順便做的（含昨晚加的）。淘寶清單不在小工具上。</div>
    <button class="link" data-act="reset">恢復範例資料</button>
  </div>
  ${navHtml('home')}`;
}

function renderList(list) {
  const meta = D.LISTS[list];
  const d = today(), day = todayDow();
  const tm = D.tomorrowOf(now());
  const all = itemsOf(list);
  const due = all.filter(it => D.stillVisibleToday(it, d, day));
  const dueTmr = all.filter(it => D.stillVisibleToday(it, tm.date, tm.day) && !D.stillVisibleToday(it, d, day) && !(it.repeat === 'once' && it.completedOnce));
  const overdue = all.filter(it => D.isOverdue(it, d));
  const onceDone = all.filter(it => it.repeat === 'once' && it.completedOnce);
  const rest = all.filter(it =>
    !D.stillVisibleToday(it, d, day) &&
    !D.stillVisibleToday(it, tm.date, tm.day) &&
    !D.isOverdue(it, d) &&
    !(it.repeat === 'once' && it.completedOnce)
  );
  const sub = `今天 ${due.length} 件要${meta.verb} · 明天 ${dueTmr.length} 件`;
  const note = list === 'evening'
    ? '這是這個 App 的主力：下班回家順路要「拿」或「買」的事。新增時可選今天、明天、指定日期或重複；晚上 6 點後新增，預設是明天。'
    : '上班帶出門只在前一晚提醒，沒有早上鬧鐘。新增時同樣可選今天、明天、指定日期或重複。例如週二才帶的筆記本，其他日子不會出現在今天清單。';
  return `${topBar(meta.name, sub, true)}
  <div class="body">
    <div class="note ${list === 'evening' ? 'amber' : ''}">${note}</div>
    <div class="card">${frequentBlock(list)}</div>
    ${due.length ? `<div class="sec${highlightList === list ? ' hi' : ''}"><span class="ttl">今天要${meta.verb}</span></div>` : ''}
    ${due.length ? due.map(it => itemRow(it)).join('') : `<div class="card empty"><div class="e">${meta.emoji}</div>還沒有今天的項目，按常用項目或右下角＋新增</div>`}
    ${dueTmr.length ? `<div class="sec"><span class="ttl">明天要${meta.verb}</span><span>${esc(tm.short)}</span></div>${dueTmr.map(it => itemRow(it, { date: tm.date, day: tm.day })).join('')}` : ''}
    ${overdue.length ? `<div class="sec"><span class="ttl">已過期</span></div>${overdue.map(it => itemRow(it, { showOff: true })).join('')}` : ''}
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
  return `${topBar('淘寶採購清單', `${want.length} 件要買 · ${bought.length} 件已買`, true)}
  <div class="body">
    <div class="note plum">大量採購時的備忘。打折日期請自己輸入，到了提前提醒日可以用通知或鬧鐘。只在 App 裡，不會出現在桌面小工具。</div>
    <div class="sec"><span class="ttl">即將打折</span><span>${upcoming.length} 件</span></div>
    ${upcoming.length ? upcoming.map(buyRow).join('') : `<div class="card empty"><div class="e">🏷️</div>還沒有即將到來的檔期</div>`}
    ${noSale.length ? `<div class="sec"><span class="ttl">還沒有檔期</span></div>${noSale.map(buyRow).join('')}` : ''}
    ${past.length ? `<div class="sec"><span class="ttl">檔期已過</span></div>${past.map(buyRow).join('')}` : ''}
    ${bought.length ? `<div class="sec"><span class="ttl">已買</span></div>${bought.map(buyRow).join('')}
      <button class="btn ghost" data-act="clear-bought">清除已買</button>` : ''}
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

function slotCard(key, title, emoji, hint, featured) {
  const s = slotOf(key);
  const day = todayDow();
  const on = D.isSlotDay(s, day);
  const dayPills = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button type="button" class="pill ${s.weekdays.includes(d) ? 'on' : ''}" data-act="toggle-day" data-slot="${key}" data-d="${d}">週${D.WEEKDAYS[d]}</button>`
  ).join('');
  const simLab = key === 'night' ? '模擬前一晚提醒' : `模擬${s.mode === 'alarm' ? '鬧鐘' : '通知'}`;
  return `<div class="card ${featured ? 'feat' : ''}">
    <div class="lab" style="font-weight:900;font-size:16px;margin-bottom:4px">${emoji} ${esc(title)}${featured ? ' <span class="badge amber">主力</span>' : ''}</div>
    <div class="hint" style="margin-bottom:10px">${esc(D.workdaysLabel(s.weekdays))} ${esc(D.formatTime(s.time))} · ${esc(D.modeLabel(s.mode))}${on ? ' · 今天會提醒' : ' · 今天不在提醒日'}</div>
    ${hint ? `<div class="hint" style="margin-bottom:10px">${hint}</div>` : ''}
    <div class="field"><span class="lbl">時間</span>${timeSelects(key, s.time)}</div>
    <div class="lbl" style="margin:14px 0 8px">哪些天要提醒</div>
    <div class="pills wrap">${dayPills}</div>
    <div class="lbl" style="margin:14px 0 8px">提醒方式</div>
    <div class="pills wrap">
      <button type="button" class="pill ${s.mode === 'notify' ? 'on' : ''}" data-act="set-mode" data-slot="${key}" data-v="notify">通知</button>
      <button type="button" class="pill ${s.mode === 'alarm' ? 'on amber' : ''}" data-act="set-mode" data-slot="${key}" data-v="alarm">鬧鐘</button>
    </div>
    <button class="btn ${s.mode === 'alarm' ? 'amber' : ''}" style="margin-top:14px" data-act="sim" data-kind="${key}">${simLab}</button>
  </div>`;
}

function renderRemind() {
  return `${topBar('提醒設定', '下班順便做是主力，前一晚再準備明天', true)}
  <div class="body">
    <div class="note amber">先設定下班順便做的提醒。前一晚通知（預設 22:00）會同時列出明天出門帶和明天下班順便。沒有早上鬧鐘。</div>
    ${slotCard('evening', '下班順便做', '🛒', '這是主力提醒，列出當天還沒做完的順便事項（含前一晚先加進明天的）。', true)}
    ${slotCard('night', '前一晚提醒', '🌙', '在你選的這幾天晚上提醒，分成「明天出門帶」和「明天下班順便」兩段。預設週日到週四晚（準備隔天上班）。上班帶出門沒有早上鬧鐘。')}
    <div class="card">
      <div class="lab" style="font-weight:800">預覽明天的下班提醒</div>
      <div class="hint" style="margin:6px 0 10px">示範今晚先加的項目，隔天下班 17:50 會再出現。也可到桌面按「看明天」。</div>
      <button class="btn amber" data-act="sim" data-kind="tomorrow">模擬明天下班提醒</button>
    </div>
    <div class="card">
      <div class="lab" style="font-weight:800">淘寶採購 · 打折提醒</div>
      <div class="hint" style="margin:6px 0 10px">在淘寶清單為單一商品設定打折日期、提前幾天，以及通知或鬧鐘。日期要自己輸入，不會出現在小工具。</div>
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
      return { kind, mode: 'notify', list: 'buy', title: '目前沒有即將打折的商品', body: '先在淘寶清單裡加上打折日期', sysTitle: '出門備忘 · 打折提醒', time: '' };
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
  if (kind === 'night') {
    const s = slotOf('night');
    const tm = D.tomorrowOf(now());
    const morn = itemsDue('morning', tm.date, tm.day);
    const eve = itemsDue('evening', tm.date, tm.day);
    const sections = [
      { label: '明天出門帶', text: morn.length ? `${namesOf(morn)}（${morn.length} 件）` : '沒有項目' },
      { label: '明天下班順便', text: eve.length ? `${namesOf(eve)}（${eve.length} 件）` : '沒有項目' }
    ];
    return {
      kind: 'night',
      mode: s.mode === 'alarm' ? 'alarm' : 'notify',
      list: 'tomorrow',
      headline: '明天要準備的東西',
      title: `${D.formatTime(s.time)}，明天要準備的東西`,
      body: `明天（${tm.short}）｜明天出門帶：${sections[0].text}｜明天下班順便：${sections[1].text}`,
      sections,
      sysTitle: '出門備忘 · 前一晚提醒',
      time: s.time
    };
  }
  const forTomorrow = kind === 'tomorrow';
  const slot = kind === 'morning' ? 'morning' : 'evening';
  const s = slotOf(slot);
  const tm = D.tomorrowOf(now());
  const dateStr = forTomorrow ? tm.date : today();
  const left = remaining(slot, dateStr);
  const n = left.length;
  const isEve = slot === 'evening';
  const headline = forTomorrow ? '明天下班順便記得' : (isEve ? '下班順便記得' : '出門前別忘了');
  const empty = forTomorrow ? '明天要順便做的都打過勾了' : (isEve ? '今天要順便做的都打過勾了' : '今天要帶的都打過勾了');
  return {
    kind: forTomorrow ? 'tomorrow' : slot,
    mode: s.mode === 'alarm' ? 'alarm' : 'notify',
    list: forTomorrow ? 'tomorrow' : slot,
    headline,
    title: `${D.formatTime(s.time)}，${headline}`,
    body: n ? `${namesOf(left)}，${forTomorrow ? '明天' : '還'}有 ${n} 件` : empty,
    sysTitle: isEve || forTomorrow ? '出門備忘 · 下班順便做' : '出門備忘 · 上班帶出門',
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
  const ico = copy.kind === 'sale' ? '🏷️' : copy.kind === 'night' ? '🌙' : copy.kind === 'evening' ? '🛒' : '☀️';
  const bodyHtml = copy.sections
    ? copy.sections.map(s => `<div class="bd-sec"><b>${esc(s.label)}</b> ${esc(s.text)}</div>`).join('')
    : `<div class="bd">${esc(copy.body)}</div>`;
  el.innerHTML = `<div class="app"><span class="dot${plum}">${ico}</span>出門備忘<span class="when">現在</span></div>
    <div class="ttl">${esc(copy.title)}</div>
    ${bodyHtml}`;
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
    ${copy.sections
      ? `<div class="asecs">${copy.sections.map(s => `<div class="abd-sec"><b>${esc(s.label)}</b><span>${esc(s.text)}</span></div>`).join('')}</div>`
      : `<div class="abd">${esc(copy.body)}</div>`}
    <div class="ahint">正式 App 會響鈴直到你關掉。這個 DEMO 要先按「聽鬧鐘」，才會用提示音示範（瀏覽器規定要先點一下）。</div>
    <div class="btns" style="flex-direction:column">
      <button class="btn listen" type="button" data-act="listen-alarm">聽鬧鐘</button>
      <div class="btns">
        <button class="btn ghost" type="button" data-act="alarm-snooze">稍後</button>
        <button class="btn amber" type="button" data-act="alarm-off" data-list="${esc(copy.list || '')}">關閉</button>
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
  if (copy.kind === 'night' || copy.kind === 'tomorrow' || copy.list === 'tomorrow') {
    go('#/tomorrow');
    return;
  }
  highlightList = copy.list === 'evening' ? 'evening' : 'morning';
  go(copy.list === 'evening' ? '#/evening' : '#/morning');
  setTimeout(() => { highlightList = null; }, 2000);
}

function simulate(kind) {
  const copy = remindCopy(kind);
  if (kind === 'sale') {
    if (!pickSaleItem()) toast('先在淘寶清單裡加上打折日期');
  } else if (kind === 'tomorrow') {
    const slot = slotOf('evening');
    const tm = D.tomorrowOf(now());
    if (slot && !D.isSlotDay(slot, tm.day)) {
      toast('明天不在你選的提醒日（DEMO 還是示範給你看）');
    }
  } else {
    const slotName = kind === 'night' ? 'night' : 'evening';
    const slot = slotOf(slotName);
    if (slot && !D.isSlotDay(slot, todayDow())) {
      toast('今天不在你選的提醒日（DEMO 還是示範給你看）');
    }
  }
  if (copy.mode === 'alarm') showAlarm(copy);
  else showBanner(copy);
}

function addFrequent(list, index) {
  const freq = (D.FREQUENT[list] || [])[Number(index)];
  if (!freq) return;
  const d = addTargetISO(), day = D.dow(D.dateFromISO(d));
  const word = whenWord(d);
  const dated = (freq.repeat || 'once') === 'once';
  const sameTitle = itemsOf(list).filter(it => it.title === freq.title);
  const onDay = sameTitle.find(it => D.stillVisibleToday(it, d, day));
  if (onDay) {
    toast(`「${freq.title}」已經在${word}的清單`);
    return;
  }
  if (dated) {
    const doneSame = sameTitle.find(it => it.repeat === 'once' && it.completedOnce && (it.dueDate === d || it.doneOn === d));
    if (doneSame) {
      doneSame.completedOnce = false;
      doneSame.doneOn = null;
      doneSame.dueDate = d;
      save();
      toast(`已把「${freq.title}」加回${word}`);
      render();
      return;
    }
  } else {
    const existing = sameTitle[0];
    if (existing && existing.repeat === 'weekly') {
      toast(`「${freq.title}」已在清單裡，但${word}不是它的提醒日`);
      return;
    }
    if (existing) {
      toast(`「${freq.title}」已經在清單裡`);
      return;
    }
  }
  state.items.push({
    id: uid(),
    list,
    title: freq.title,
    emoji: freq.emoji || '📝',
    type: list === 'evening' ? (freq.type || D.inferType(freq.title)) : '',
    repeat: freq.repeat || 'once',
    weekdays: [...(freq.weekdays || [])],
    dueDate: dated ? d : null,
    note: '',
    doneOn: null,
    completedOnce: false
  });
  save();
  toast(`已加入「${freq.title}」到${word}`);
  render();
}

function sheetItem(existing, defaultList) {
  const isEdit = !!(existing && existing.id);
  if ((existing && existing.list === 'buy') || defaultList === 'buy') {
    sheetBuy(existing);
    return;
  }
  const defWhen = D.defaultWhen(now());
  const it = existing || {
    list: defaultList === 'morning' ? 'morning' : 'evening',
    title: '',
    emoji: '',
    type: defaultList === 'morning' ? '' : 'take',
    when: defWhen,
    dueDate: defWhen === 'tomorrow' ? D.addDays(today(), 1) : today(),
    repeat: 'once',
    weekdays: [1, 2, 3, 4, 5],
    note: ''
  };
  const list = it.list === 'morning' ? 'morning' : 'evening';
  const when = it.when || (it.id ? D.inferWhen(it, today()) : defWhen);
  const dueDate = it.dueDate || (when === 'tomorrow' ? D.addDays(today(), 1) : when === 'date' ? D.addDays(today(), 1) : today());
  const emojis = D.EMOJIS[list];
  const dayPills = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<button type="button" class="pill ${(it.weekdays || []).includes(d) ? 'on' : ''}" data-act="form-day" data-d="${d}">週${D.WEEKDAYS[d]}</button>`
  ).join('');
  openSheet(`
    <h2>${isEdit ? '編輯項目' : '新增項目'}</h2>
    <div class="field"><span class="lbl">要做什麼</span>
      <input type="text" id="f-title" value="${esc(it.title)}" placeholder="${list === 'evening' ? '例如：拿包裹、買牛奶' : '例如：鑰匙、雨傘'}" maxlength="30">
    </div>
    <div class="lbl">加到哪個清單</div>
    <div class="pills wrap">
      <button type="button" class="pill ${list === 'evening' ? 'on amber' : ''}" data-act="form-list" data-v="evening">🛒 下班順便做</button>
      <button type="button" class="pill ${list === 'morning' ? 'on' : ''}" data-act="form-list" data-v="morning">👜 上班帶出門</button>
    </div>
    <div class="hint">淘寶採購請到「淘寶」分頁新增，不會出現在小工具，也不會提醒。</div>
    ${list === 'evening' ? `
    <div class="lbl">類型</div>
    <div class="pills wrap">
      <button type="button" class="pill ${it.type !== 'buy' ? 'on' : ''}" data-act="form-type" data-v="take">拿</button>
      <button type="button" class="pill ${it.type === 'buy' ? 'on amber' : ''}" data-act="form-type" data-v="buy">買</button>
    </div>` : ''}
    <div class="lbl">圖示</div>
    <div class="pills wrap">
      ${emojis.map(e => `<button type="button" class="pill emoji ${it.emoji === e ? 'on' : ''}" data-act="form-emoji" data-v="${esc(e)}">${e}</button>`).join('')}
    </div>
    <div class="lbl">什麼時候</div>
    <div class="pills wrap">
      <button type="button" class="pill ${when === 'today' ? 'on amber' : ''}" data-act="form-when" data-v="today">今天</button>
      <button type="button" class="pill ${when === 'tomorrow' ? 'on amber' : ''}" data-act="form-when" data-v="tomorrow">明天</button>
      <button type="button" class="pill ${when === 'date' ? 'on amber' : ''}" data-act="form-when" data-v="date">指定日期</button>
      <button type="button" class="pill ${when === 'repeat' ? 'on' : ''}" data-act="form-when" data-v="repeat">重複</button>
    </div>
    <div class="hint">晚上 6 點後新增，預設是明天。</div>
    <div id="f-due" class="${when === 'date' ? '' : 'hidden'}">
      <div class="field"><span class="lbl">指定日期</span>
        <input type="date" id="f-due-date" value="${esc(dueDate)}">
      </div>
    </div>
    <div id="f-repeat" class="${when === 'repeat' ? '' : 'hidden'}">
      <div class="lbl">重複方式</div>
      <div class="pills wrap">
        <button type="button" class="pill ${it.repeat === 'daily' ? 'on' : ''}" data-act="form-repeat" data-v="daily">每天</button>
        <button type="button" class="pill ${it.repeat === 'weekly' ? 'on' : ''}" data-act="form-repeat" data-v="weekly">指定星期幾</button>
        <button type="button" class="pill ${it.repeat === 'once' ? 'on amber' : ''}" data-act="form-repeat" data-v="once">只提醒一次</button>
      </div>
    </div>
    <div id="f-days" class="${when === 'repeat' && it.repeat === 'weekly' ? '' : 'hidden'}">
      <div class="lbl" style="margin-bottom:8px">選要提醒的星期</div>
      <div class="pills wrap">${dayPills}</div>
    </div>
    <div class="field"><span class="lbl">備註（選填）</span>
      <input type="text" id="f-note" value="${esc(it.note || '')}" placeholder="例如：超商取件" maxlength="40">
    </div>
    <div class="btns">
      <button class="btn ${list === 'evening' ? 'amber' : ''}" type="button" data-act="save-item" data-id="${esc(isEdit ? existing.id : '')}">儲存</button>
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
    type: list === 'evening' ? (it.type || 'take') : '',
    when,
    dueDate,
    repeat: it.repeat || (when === 'repeat' && list === 'morning' ? 'daily' : 'once'),
    weekdays: [...(it.weekdays || [])]
  };
}

function sheetBuy(existing) {
  const isEdit = !!(existing && existing.id);
  const it = existing || {
    list: 'buy', title: '', emoji: '📦', note: '',
    saleName: '', saleDate: '', remindDays: 3, remindMode: 'notify'
  };
  const hasSale = !!(it.saleDate || it.saleName);
  const emojis = D.EMOJIS.buy;
  const salePills = D.SALE_NAMES.map(n =>
    `<button type="button" class="pill ${it.saleName === n ? 'on plum' : ''}" data-act="form-sale-name" data-v="${esc(n)}">${esc(n)}</button>`
  ).join('');
  openSheet(`
    <h2>${isEdit ? '編輯採購項目' : '新增採購項目'}</h2>
    <div class="field"><span class="lbl">名稱</span>
      <input type="text" id="f-title" value="${esc(it.title)}" placeholder="例如：冬季拖鞋" maxlength="30">
    </div>
    <div class="lbl">圖示</div>
    <div class="pills wrap">
      ${emojis.map(e => `<button type="button" class="pill emoji ${it.emoji === e ? 'on' : ''}" data-act="form-emoji" data-v="${esc(e)}">${e}</button>`).join('')}
    </div>
    <div class="field"><span class="lbl">備註（選填，例如規格、賣家）</span>
      <input type="text" id="f-note" value="${esc(it.note || '')}" placeholder="例如：看評價再下單" maxlength="40">
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
    emoji: it.emoji || '📦',
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
  const dueDate = $('#f-due-date')?.value || form.dueDate || '';
  const base = sid ? { ...itemById(sid) } : { title: '', note: '', weekdays: form.weekdays };
  sheetItem({ ...base, title, note, ...form, dueDate, id: sid || undefined }, form.list);
  if ($('#f-title')) $('#f-title').value = title;
  if ($('#f-note')) $('#f-note').value = note;
  if ($('#f-due-date') && dueDate) $('#f-due-date').value = dueDate;
  $('#dlg')._form = { ...form, dueDate };
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
      list: 'buy', title, note, emoji: form.emoji || '📦',
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
    save(); closeSheet(); toast('已加入淘寶採購清單'); render(); return;
  }
  const list = form.list === 'morning' ? 'morning' : 'evening';
  const when = form.when || 'today';
  let dueDate = null;
  let repeat = form.repeat || 'once';
  if (when === 'today') { dueDate = today(); repeat = 'once'; }
  else if (when === 'tomorrow') { dueDate = D.addDays(today(), 1); repeat = 'once'; }
  else if (when === 'date') {
    dueDate = ($('#f-due-date')?.value || form.dueDate || '').trim();
    if (!dueDate) { toast('請選指定日期'); return; }
    repeat = 'once';
  } else {
    dueDate = null;
    repeat = form.repeat || (list === 'morning' ? 'daily' : 'once');
  }
  const weekdays = repeat === 'weekly' ? [...(form.weekdays || [])].sort((a, b) => a - b) : [];
  if (when === 'repeat' && repeat === 'weekly' && !weekdays.length) { toast('先選要提醒的星期'); return; }
  const emoji = form.emoji || (D.EMOJIS[list][0] || '📝');
  const type = list === 'evening' ? (form.type || D.inferType(title)) : '';
  if (id) {
    const it = itemById(id);
    if (!it) return;
    Object.assign(it, { title, note, list, repeat, weekdays, emoji, type, dueDate });
    if (repeat !== 'once') it.completedOnce = false;
    save(); closeSheet(); toast('已更新'); render(); return;
  }
  state.items.push({ id: uid(), list, title, note, emoji, type, repeat, weekdays, dueDate, doneOn: null, completedOnce: false });
  const whenTip = dueDate ? '（' + whenWord(dueDate) + '）' : '';
  save(); closeSheet(); toast('已加入' + D.LISTS[list].name + whenTip); render();
}

function toggleItem(id) {
  const it = itemById(id);
  if (!it) return;
  if (it.list === 'buy') {
    if (it.boughtOn) {
      it.boughtOn = null;
      save(); toast('已改回要買'); render(); return;
    }
    it.boughtOn = today();
    save(); toast(`「${it.title}」已移到已買`); render(); return;
  }
  const d = (pathParts()[0] || '') === 'tomorrow' ? D.addDays(today(), 1) : today();
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

function clearBought() {
  const n = itemsOf('buy').filter(it => it.boughtOn).length;
  if (!n) { toast('沒有已買項目'); return; }
  if (!confirm(`要清除 ${n} 件已買項目嗎？`)) return;
  state.items = state.items.filter(it => !(it.list === 'buy' && it.boughtOn));
  save(); toast('已清除已買'); render();
}

function maybeWelcome() {
  try {
    if (localStorage.getItem(WELCOME_KEY)) return;
  } catch { return; }
  localStorage.setItem(WELCOME_KEY, '1');
  openSheet(`
    <h2>這是可點的 DEMO</h2>
    <div class="muted">看看改過的「出門備忘」。內容都是範例資料，不是正式 App。</div>
    <div class="note amber">新增下班順便做或上班帶出門時，可選今天、明天、指定日期或重複。晚上 6 點後新增，預設是明天。範例裡有「明天下班買牛奶」。</div>
    <div class="note">前一晚提醒（預設 22:00 通知）會分成「明天出門帶」和「明天下班順便」。隔天下班 17:50 會再列出當天要順便做的（含昨晚先加的）。沒有早上鬧鐘。</div>
    <div class="note plum">桌面可用「看明天」預覽，或按「模擬前一晚提醒／模擬明天下班提醒」走一遍流程。淘寶採購清單只在 App 裡，打折日期要自己輸入。</div>
    <button class="btn amber" data-act="close-sheet">開始用</button>
  `);
  bind($('#dlg'));
}

function bind(root) {
  root.querySelectorAll('[data-act]').forEach(el => {
    el.addEventListener('click', ev => { onAct(el.dataset.act, el, ev); });
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
    sheetItem(null, el.dataset.list || 'evening');
  } else if (act === 'add-freq') {
    ev.preventDefault();
    addFrequent(el.dataset.list, el.dataset.i);
  } else if (act === 'close-sheet') {
    closeSheet();
  } else if (act === 'save-item') {
    ev.preventDefault();
    saveItem(id);
  } else if (act === 'delete-item') {
    ev.preventDefault();
    deleteItem(id);
  } else if (act === 'clear-bought') {
    ev.preventDefault();
    clearBought();
  } else if (act === 'form-when') {
    const form = $('#dlg')._form;
    form.when = el.dataset.v;
    if (form.when === 'today') { form.dueDate = today(); form.repeat = 'once'; }
    else if (form.when === 'tomorrow') { form.dueDate = D.addDays(today(), 1); form.repeat = 'once'; }
    else if (form.when === 'date') {
      form.dueDate = $('#f-due-date')?.value || form.dueDate || D.addDays(today(), 1);
      form.repeat = 'once';
    } else {
      form.dueDate = null;
      if (!form.repeat) form.repeat = form.list === 'morning' ? 'daily' : 'once';
    }
    rebuildForm();
  } else if (act === 'form-list' || act === 'form-repeat') {
    const form = $('#dlg')._form;
    if (act === 'form-list') {
      form.list = el.dataset.v;
      if (!D.EMOJIS[form.list].includes(form.emoji)) form.emoji = D.EMOJIS[form.list][0];
      if (form.list === 'evening' && !form.type) form.type = 'take';
      if (form.list === 'morning') form.type = '';
    } else form.repeat = el.dataset.v;
    rebuildForm();
  } else if (act === 'form-type') {
    const form = $('#dlg')._form;
    form.type = el.dataset.v;
    $('#dlg').querySelectorAll('[data-act=form-type]').forEach(b => {
      b.classList.toggle('on', b.dataset.v === form.type);
      b.classList.toggle('amber', b.dataset.v === 'buy' && form.type === 'buy');
    });
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
    else if (el.dataset.list === 'tomorrow' || (pathParts()[0] === 'sim' && pathParts()[1] === 'tomorrow')) go('#/tomorrow');
    else if (el.dataset.list === 'evening' || el.dataset.list === 'morning') go('#/' + el.dataset.list);
    else if (pathParts()[0] === 'sim') go('#/');
  } else if (act === 'alarm-snooze') {
    ev.preventDefault();
    hideAlarm();
    toast('已設稍後再響（DEMO 只模擬畫面，不會真的倒數）');
    if (pathParts()[0] === 'sim' && pathParts()[1] === 'tomorrow') go('#/tomorrow');
    else if (pathParts()[0] === 'sim') go('#/');
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
    const kind = parts[1] === 'night' || parts[1] === 'sale' || parts[1] === 'evening' || parts[1] === 'morning' || parts[1] === 'tomorrow' ? parts[1] : 'evening';
    if (kind === 'sale') {
      app.innerHTML = renderBuy();
      bind(app);
    } else if (kind === 'tomorrow' || kind === 'night') {
      app.innerHTML = renderHome();
      bind(app);
    }
    simulate(kind);
  }
}

load();
window.addEventListener('hashchange', render);
render();
