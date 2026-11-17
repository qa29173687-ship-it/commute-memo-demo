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

function rowHtml(it) {
  const done = it.done;
  return `<div class="row ${done ? 'done' : ''}" data-id="${it.id}">
    <button class="cb" data-act="check" data-id="${it.id}" aria-label="完成">${done ? '✓' : ''}</button>
    <span class="tag ${it.type}">${it.type === 'buy' ? '買' : '拿'}</span>
    <span class="txt"><span class="nm">${esc(it.title)}</span>${it.note ? `<span class="nt">${esc(it.note)}</span>` : ''}</span>
  </div>`;
}

function widget(size) {
  const left = remaining().length;
  const list = shown();
  const head = `<div class="wh">
      <button class="open" data-act="open"><span class="t">今天下班順便做</span>
        <span class="c">${left ? `還有 ${left} 項` : '全部完成'}</span></button>
      <button class="plus" data-act="add" aria-label="新增">＋</button>
    </div>`;
  if (!list.length) {
    return `<div class="w ${size}">${head}<div class="empty"><div><b>今天沒有要順便做的 🎉</b>${size === 'small' ? '' : '想到什麼按 ＋ 新增'}</div></div></div>`;
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
  const doneN = state.items.filter(i => i.done).length;
  const foot = size === 'large'
    ? `${doneN ? `<div class="doneline">✓ 今天已完成 ${doneN} 項</div>` : ''}
       <div class="foot"><button class="addbtn" data-act="add">＋ 新增順便做</button></div>` : '';
  return `<div class="w ${size}">${head}${body}${foot}</div>`;
}

function screenFor(size) {
  if (size === 'small') return `<div class="grid">${widget('small')}${APPS.slice(0, 4).map(app).join('')}${APPS.slice(4, 8).map(app).join('')}<div class="search">🔍 搜尋</div></div>`;
  if (size === 'medium') return `<div class="grid">${widget('medium')}${APPS.slice(0, 8).map(app).join('')}<div class="search">🔍 搜尋</div></div>`;
  return `<div class="grid">${widget('large')}${APPS.slice(0, 4).map(app).join('')}</div>`;
}

function render() {
  const now = new Date();
  const hm = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  let content;
  if (state.size === 'all') {
    content = `<div class="lbl">小 2×2 · 顯示前 3 項 + 剩幾項</div>
      <div class="grid">${widget('small')}${APPS.slice(0, 4).map(app).join('')}</div>
      <div class="lbl" style="margin-top:12px">中 4×2 · 全部項目可捲動、含備註</div>
      <div class="grid">${widget('medium')}</div>
      <div class="lbl" style="margin-top:12px">大 4×4 · 加上已完成數和新增按鈕</div>
      <div class="grid">${widget('large')}</div>`;
  } else content = screenFor(state.size);
  document.getElementById('home').innerHTML = `
    <div class="statusbar"><span>${hm}</span><span>5G ▮▮▮ 🔋 82%</span></div>
    <div class="clock"><b>${hm}</b><span>${now.getMonth() + 1}月${now.getDate()}日 週${WEEK[now.getDay()]}</span></div>
    ${content}
    <div class="caption">📌 這是示意圖，用範例資料。實機上：打勾、點標題打開 App 都可以直接在小工具上做；
      按 <b>＋</b> 會跳出一個小輸入視窗（Android 小工具本身不能放輸入框打字）。採購清單不會出現在小工具。
      <br><a href="./">← 回到 App DEMO</a></div>
    <button class="reset" data-act="reset">恢復範例資料</button>
    ${state.size === 'all' ? '' : `<div class="dock">${DOCK.map(app).join('')}</div>`}`;
  document.querySelectorAll('.sizes button').forEach(b => b.classList.toggle('on', b.dataset.size === state.size));
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
    setTimeout(() => { recent.delete(id); render(); }, 380);
  }, 1300);
}

function openAdd() {
  let type = 'take', typeTouched = false;
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<div class="dlg" role="dialog">
      <h3>新增今天下班順便做</h3>
      <div class="sub">實機上按小工具的 ＋ 會跳出這個小視窗</div>
      <input id="nt" placeholder="要做什麼？例如：買衛生紙" autocomplete="off">
      <div class="seg"><button data-t="take" class="on">拿</button><button data-t="buy">買</button></div>
      <input id="nn" placeholder="備註（選填）例如：在哪裡買" autocomplete="off">
      <div class="chips">${FREQ.map(f => `<button data-f="${esc(f.title)}" data-ft="${f.type}">＋ ${esc(f.title)}</button>`).join('')}</div>
      <div class="acts"><button class="cancel" data-x="cancel">取消</button><button class="ok" data-x="ok" disabled>加到今天</button></div>
    </div>`;
  sheet.classList.remove('hidden');
  const nt = sheet.querySelector('#nt'), nn = sheet.querySelector('#nn'), ok = sheet.querySelector('.ok');
  const setType = t => { type = t; sheet.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); };
  nt.addEventListener('input', () => { ok.disabled = !nt.value.trim(); if (!typeTouched) setType(inferType(nt.value)); });
  const close = () => { sheet.classList.add('hidden'); sheet.innerHTML = ''; };
  const add = (title, t, note) => {
    state.items.push({ id: 'u' + Date.now(), title, type: t, note: note || '', done: false });
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
  else if (act === 'open') toast(`實機會打開「順便備忘」App <a href="./">看 App DEMO →</a>`);
  else if (act === 'reset') { state = { items: SEED.map(x => ({ ...x, done: false })), size: state.size }; recent.clear(); save(); render(); toast('已恢復範例資料'); }
});

const hashSize = location.hash.replace('#', '');
if (['small', 'medium', 'large', 'all'].includes(hashSize)) state.size = hashSize;
render();
setInterval(render.bind(null), 60000);
