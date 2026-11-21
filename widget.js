/** 順便備忘 · 桌面小工具 DEMO。所有項目都是範例資料，只存在這個瀏覽器（localStorage）。 */
const KEY = 'commute-memo-widget-demo-v1';
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const SEED = [
  { id: 'w1', title: '買牛奶', type: 'buy', note: '全聯或家樂福' },
  { id: 'w2', title: '拿包裹', type: 'take', note: '7-11 取件，末三碼 482' },
  { id: 'w3', title: '拿乾洗衣服', type: 'take', note: '巷口洗衣店' },
  { id: 'w4', title: '買晚餐', type: 'buy', note: '' },
  { id: 'w5', title: '買電池', type: 'buy', note: 'AA 四顆' },
];
const FREQ = [
  { title: '拿包裹', type: 'take' }, { title: '買牛奶', type: 'buy' },
  { title: '拿乾洗衣服', type: 'take' }, { title: '買晚餐', type: 'buy' },
];
const APPS = [
  ['📞', '電話', '#3fb26b'], ['💬', 'LINE', '#06c755'], ['📷', '相機', '#5b6577'], ['🗺️', '地圖', '#4a8ff0'],
  ['📅', '日曆', '#f05d4a'], ['🎵', '音樂', '#ef4b7b'], ['☁️', '天氣', '#57a9f0'], ['⚙️', '設定', '#7a7f8a'],
  ['🛒', '蝦皮', '#ee4d2d'], ['📺', 'YouTube', '#ff2a2a'], ['🏦', '銀行', '#2f6db5'], ['🧾', '發票', '#f2a33a'],
];
const DOCK = [['📞', '', '#3fb26b'], ['💬', '', '#06c755'], ['🌐', '', '#4a8ff0'], ['📷', '', '#5b6577']];

const ICON = {
  take: '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  buy: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};
const EMPTY_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="34" r="20" fill="var(--accent-tonal)"/>
  <path d="M22 34.5l7 7 13-14" fill="none" stroke="var(--accent)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="11" cy="16" r="2.6" fill="#7fd3cf"/><circle cx="53" cy="12" r="2.2" fill="#f6a6c1"/>
  <circle cx="56" cy="44" r="2.6" fill="#ffc46b"/><circle cx="8" cy="46" r="2" fill="#8f7ff0"/>
  <path d="M46 22l2-5M50 27l5-1M17 23l-4-3" stroke="var(--accent-2)" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

let state = load();
const recent = new Set(); // 剛打勾、還在變灰動畫中的
let toastTimer = null;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.items)) return s;
  } catch (_) {}
  return { items: SEED.map(x => ({ ...x, done: false })), size: 'medium' };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const remaining = () => state.items.filter(i => !i.done);
const shown = () => state.items.filter(i => !i.done || recent.has(i.id));
const inferType = t => (/^\s*買/.test(t) || /加油/.test(t)) ? 'buy' : 'take';

function app([icon, name, color]) {
  return `<div class="app"><i style="background:${color}">${icon}</i><span>${esc(name)}</span></div>`;
}

const fresh = new Set(); // 剛新增（進場動畫）
function rowHtml(it) {
  const done = it.done;
  return `<div class="row ${done ? 'done' : ''} ${fresh.has(it.id) ? 'enter' : ''}" data-id="${it.id}">
    <button class="cb" data-act="check" data-id="${it.id}" aria-label="完成">${ICON.check}</button>
    <span class="tag ${it.type}">${ICON[it.type]}${it.type === 'buy' ? '買' : '拿'}</span>
    <span class="txt"><span class="nm">${esc(it.title)}</span>${it.note ? `<span class="nt">${esc(it.note)}</span>` : ''}</span>
  </div>`;
}

function ring(done, total, r = 16) {
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return `<span class="ring ${total && done === total ? 'full' : ''}"><svg viewBox="0 0 40 40">
      <circle class="trk" cx="20" cy="20" r="${r}"/>
      <circle class="val" cx="20" cy="20" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/>
    </svg><b>${done}/${total}</b></span>`;
}

function widget(size) {
  const total = state.items.length;
  const doneN = state.items.filter(i => i.done).length;
  const left = total - doneN;
  const list = shown();
  const now = new Date();
  const date = `${now.getMonth() + 1}/${now.getDate()} 週${WEEK[now.getDay()]}`;
  const status = left ? `還有 <em>${left}</em> 項` : '<em>全部完成</em>';
  const head = `<div class="wh">
      <button class="open" data-act="open" aria-label="打開順便備忘">${ring(doneN, total)}
        <span class="hd"><span class="t">${size === 'small' ? '下班順便做' : '今天下班順便做'}</span>
        <span class="d">${size === 'small' ? status : `${date} · ${status}`}</span></span></button>
      <button class="plus" data-act="add" aria-label="新增">＋</button>
    </div>`;
  if (!list.length) {
    return `<div class="w ${size}">${head}<div class="empty">${EMPTY_SVG}<b>今天沒有要順便做的 🎉</b>${size === 'small' ? '' : '<span>想到什麼，按右上角 ＋ 新增</span>'}</div></div>`;
  }
  let body;
  if (size === 'small') {
    const top = list.slice(0, 3);
    const more = list.length - top.length;
    body = `<div class="wl">${top.map(it => rowHtml({ ...it, note: '' })).join('')}</div>
      ${more > 0 ? `<div class="more">還有 ${more} 項…</div>` : ''}`;
  } else {
    body = `<div class="wl">${list.map(rowHtml).join('')}</div>`;
  }
  const foot = size === 'large'
    ? `<div class="foot">
         <div class="barline"><span>今天完成 ${doneN} / ${total}</span><span>${total ? Math.round(doneN / total * 100) : 0}%</span></div>
         <div class="bar"><i style="width:${total ? doneN / total * 100 : 0}%"></i></div>
         <button class="addbtn" data-act="add">＋ 新增順便做</button>
       </div>` : '';
  return `<div class="w ${size}">${head}${body}${foot}</div>`;
}

function screenFor(size) {
  if (size === 'small') return `<div class="grid">${widget('small')}${APPS.slice(0, 4).map(app).join('')}${APPS.slice(4, 8).map(app).join('')}<div class="search"><span class="g"></span>搜尋<span class="mic">🎙️</span></div></div>`;
  if (size === 'medium') return `<div class="grid">${widget('medium')}${APPS.slice(0, 8).map(app).join('')}<div class="search"><span class="g"></span>搜尋<span class="mic">🎙️</span></div></div>`;
  return `<div class="grid">${widget('large')}${APPS.slice(0, 4).map(app).join('')}</div>`;
}

function render() {
  const now = new Date();
  const hm = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  let content;
  if (state.size === 'all') {
    content = `<div class="lbl"><span>小 2×2</span>前 3 項 + 剩幾項</div>
      <div class="grid">${widget('small')}${APPS.slice(0, 4).map(app).join('')}</div>
      <div class="lbl" style="margin-top:14px"><span>中 4×2</span>全部可捲動、含備註</div>
      <div class="grid">${widget('medium')}</div>
      <div class="lbl" style="margin-top:14px"><span>大 4×4</span>加上完成進度和新增按鈕</div>
      <div class="grid">${widget('large')}</div>`;
  } else content = screenFor(state.size);
  document.getElementById('home').innerHTML = `
    <div class="statusbar"><span>${hm}</span><span>5G ▮▮▮ 🔋 82%</span></div>
    <div class="clock"><b>${hm}</b><span>${now.getMonth() + 1}月${now.getDate()}日 週${WEEK[now.getDay()]}</span></div>
    ${content}
    <div class="caption">📌 示意圖・範例資料
      <ul><li>打勾、點標題打開 App：實機可直接在小工具上做。</li>
      <li>按 <b>＋</b> 會跳出小輸入視窗（Android 小工具本身不能打字）。</li>
      <li>動畫是示意，實機小工具的動畫會比較簡單。</li>
      <li>只顯示今天的下班順便做，採購清單不會出現。</li></ul></div>
    <div class="links"><a class="reset" href="./">‹ 回到 App DEMO</a><button class="reset" data-act="reset">恢復範例資料</button></div>
    ${state.size === 'all' ? '' : `<div class="dock">${DOCK.map(app).join('')}</div>`}`;
  document.querySelectorAll('.sizes button').forEach(b => b.classList.toggle('on', b.dataset.size === state.size));
  document.body.classList.toggle('dark', state.theme === 'dark');
  document.querySelector('.theme').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  fresh.clear();
}

function toast(html, ms = 3200) {
  const t = document.getElementById('toast');
  t.innerHTML = html; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

function check(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  if (it.done) { it.done = false; recent.delete(id); save(); render(); return; }
  it.done = true; recent.add(id); save(); render();
  toast(`已完成：${esc(it.title)} <button data-act="undo" data-id="${id}">復原</button>`);
  setTimeout(() => {
    document.querySelectorAll(`.row[data-id="${id}"]`).forEach(r => r.classList.add('leaving'));
    setTimeout(() => { recent.delete(id); render(); }, 520);
  }, 1300);
}

function openAdd() {
  let type = 'take', typeTouched = false;
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<div class="dlg" role="dialog" aria-label="新增">
      <div class="handle"></div>
      <h3>新增今天下班順便做</h3>
      <div class="sub">實機：按小工具的 ＋ 會跳出這個小視窗</div>
      <div class="field"><input id="nt" placeholder="要做什麼？例如：買衛生紙" autocomplete="off"></div>
      <div class="seg"><button data-t="take" class="on">${ICON.take}拿</button><button data-t="buy">${ICON.buy}買</button></div>
      <div class="field"><input id="nn" placeholder="備註（選填）：在哪裡買、取件碼…" autocomplete="off"></div>
      <div class="chips-t">常用項目・點一下直接加入</div>
      <div class="chips">${FREQ.map(f => `<button data-f="${esc(f.title)}" data-ft="${f.type}"><i class="${f.type}">${f.type === 'buy' ? '買' : '拿'}</i>${esc(f.title)}</button>`).join('')}</div>
      <div class="acts"><button class="cancel" data-x="cancel">取消</button><button class="ok" data-x="ok" disabled>加到今天</button></div>
    </div>`;
  sheet.classList.remove('hidden');
  const nt = sheet.querySelector('#nt'), nn = sheet.querySelector('#nn'), ok = sheet.querySelector('.ok');
  const setType = t => { type = t; sheet.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
  nt.addEventListener('input', () => { ok.disabled = !nt.value.trim(); if (!typeTouched) setType(inferType(nt.value)); });
  const close = () => { sheet.classList.add('hidden'); sheet.innerHTML = ''; };
  const add = (title, t, note) => {
    const id = 'u' + Date.now();
    state.items.push({ id, title, type: t, note: note || '', done: false });
    fresh.add(id);
    save(); close(); render(); toast(`已加到今天：${esc(title)}`);
  };
  sheet.onclick = e => {
    const b = e.target.closest('button');
    if (e.target === sheet) return close();
    if (!b) return;
    if (b.dataset.t) { typeTouched = true; setType(b.dataset.t); }
    else if (b.dataset.f) add(b.dataset.f, b.dataset.ft, '');
    else if (b.dataset.x === 'cancel') close();
    else if (b.dataset.x === 'ok' && nt.value.trim()) add(nt.value.trim(), type, nn.value.trim());
  };
  nt.addEventListener('keydown', e => { if (e.key === 'Enter' && nt.value.trim()) add(nt.value.trim(), type, nn.value.trim()); });
  setTimeout(() => nt.focus(), 50);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act], .sizes button');
  if (!b) return;
  if (b.dataset.size) { state.size = b.dataset.size; save(); render(); window.scrollTo(0, 0); return; }
  const act = b.dataset.act;
  if (act === 'check') check(b.dataset.id);
  else if (act === 'undo') { const it = state.items.find(i => i.id === b.dataset.id); if (it) { it.done = false; recent.delete(it.id); save(); render(); } document.getElementById('toast').classList.add('hidden'); }
  else if (act === 'add') openAdd();
  else if (act === 'theme') { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); render(); }
  else if (act === 'open') toast(`實機會打開「順便備忘」App <a href="./">看 App DEMO →</a>`);
  else if (act === 'reset') { state = { items: SEED.map(x => ({ ...x, done: false })), size: state.size, theme: state.theme }; recent.clear(); save(); render(); toast('已恢復範例資料'); }
});

const [hashSize, hashTheme] = location.hash.replace('#', '').split('-');
if (hashTheme === 'dark' || hashTheme === 'light') state.theme = hashTheme;
if (['small', 'medium', 'large', 'all'].includes(hashSize)) state.size = hashSize;
render();
setInterval(render.bind(null), 60000);
