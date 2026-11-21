/** 順便備忘 · 桌面小工具 DEMO（半透明＋時鐘版）。所有項目都是範例資料，只存在這個瀏覽器（localStorage）。 */
const KEY = 'commute-memo-widget-demo-v3';
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
];
const DOCK = [['📞', '', '#3fb26b'], ['💬', '', '#06c755'], ['🌐', '', '#4a8ff0'], ['📷', '', '#5b6577']];
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const EMPTY_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="34" r="20" fill="var(--ok)" opacity=".22"/>
  <path d="M22 34.5l7 7 13-14" fill="none" stroke="var(--ok)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="11" cy="16" r="2.6" fill="#7fd3cf"/><circle cx="53" cy="12" r="2.2" fill="#f6a6c1"/>
  <circle cx="56" cy="44" r="2.6" fill="#ffc46b"/><circle cx="8" cy="46" r="2" fill="#8f7ff0"/></svg>`;
const OPTS = { size: ['medium', 'large', 'all'], tint: ['light', 'dark'], alpha: ['high', 'mid', 'low'], wall: ['grad', 'city', 'flowers'] };

let state = load();
const recent = new Set(); // 剛打勾、還在變灰的
const fresh = new Set();  // 剛新增（進場動畫）
let toastTimer = null;

function load() {
  const def = { items: SEED.map(x => ({ ...x, done: false })), size: 'medium', tint: 'light', alpha: 'mid', wall: 'city' };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.items)) return { ...def, ...s };
  } catch (_) {}
  return def;
}
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shown = () => state.items.filter(i => !i.done || recent.has(i.id));
const inferType = t => (/^\s*買/.test(t) || /加油/.test(t)) ? 'buy' : 'take';
const pad = n => String(n).padStart(2, '0');
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const md = d => `${d.getMonth() + 1}月${d.getDate()}日`;
const wk = d => `週${WEEK[d.getDay()]}`;
const app = ([icon, name, color]) => `<div class="app"><i style="background:${color}">${icon}</i><span>${esc(name)}</span></div>`;

function rowHtml(it, withNote) {
  return `<div class="row ${it.done ? 'done' : ''} ${fresh.has(it.id) ? 'enter' : ''}" data-id="${it.id}">
    <button class="cb" data-act="check" data-id="${it.id}" aria-label="完成">${CHECK}</button>
    <span class="tag ${it.type}">${it.type === 'buy' ? '買' : '拿'}</span>
    <span class="txt"><span class="nm">${esc(it.title)}</span>${withNote && it.note ? `<span class="nt">${esc(it.note)}</span>` : ''}</span>
  </div>`;
}

function widget(size) {
  const now = new Date();
  const total = state.items.length;
  const doneN = state.items.filter(i => i.done).length;
  const left = total - doneN;
  const list = shown();
  const status = !total ? '今天沒有要做的' : left ? `還有 <em>${left}</em> 項` : '<em>全部完成</em>';
  const prog = size === 'large' ? `<div class="prog ${total && !left ? 'full' : ''}">
      <span class="pl">今天完成</span><span class="pn">${doneN}<small> / ${total}</small></span>
      <div class="bar"><i style="width:${total ? doneN / total * 100 : 0}%"></i></div></div>` : '';
  const clock = `<button class="wc" data-act="open" aria-label="打開順便備忘">
      <span><b class="hm" data-hm>${hm(now)}</b><span class="md" data-md style="display:block">${md(now)}</span><span class="wk" data-wk style="display:block">${wk(now)}</span></span>${prog}</button>`;
  const head = `<div class="wh"><button class="open" data-act="open"><span class="t">今天下班順便做</span><span class="d">${status}</span></button>
      <button class="plus" data-act="add" aria-label="新增">＋</button></div>`;
  const body = list.length
    ? `<div class="wl">${list.map(it => rowHtml(it, size === 'large')).join('')}</div>`
    : `<div class="empty">${EMPTY_SVG}<b>今天沒有要順便做的 🎉</b>${size === 'large' ? '<span>想到什麼，按右上角 ＋ 新增</span>' : ''}</div>`;
  return `<div class="w ${size}">${clock}<div class="wr">${head}${body}</div></div>`;
}

const search = '<div class="search"><span class="g"></span>搜尋<span class="mic">🎙️</span></div>';
function render() {
  const now = new Date();
  let content;
  if (state.size === 'all') {
    content = `<div class="lbl"><span>4×2</span>最小尺寸：時鐘＋清單（可捲動）</div><div class="grid">${widget('medium')}</div>
      <div class="lbl" style="margin-top:14px"><span>4×4</span>清單更長、有備註、今天完成 N/M</div><div class="grid">${widget('large')}</div>`;
  } else if (state.size === 'large') {
    content = `<div class="grid">${widget('large')}${APPS.slice(0, 4).map(app).join('')}</div>`;
  } else {
    content = `<div class="grid">${widget('medium')}${APPS.map(app).join('')}${search}</div>`;
  }
  const home = document.getElementById('home');
  home.className = `home ${state.wall}`;
  home.innerHTML = `
    <div class="statusbar"><span data-hm>${hm(now)}</span><span>5G ▮▮▮ 🔋 82%</span></div>
    ${content}
    <div class="caption">
      <div class="note">🪟 <b>關於半透明：</b>Android 實機小工具只能做「半透明底色」，沒辦法像毛玻璃那樣把後面的桌布模糊。所以這個 DEMO 也只用半透明，你看到的就是實機能做到的樣子。</div>
      📌 示意圖・範例資料
      <ul><li>上面可以切換 <b>淺色／深色</b>、<b>透明度 高／中／低</b>、<b>桌布</b>，挑最好讀的組合。</li>
      <li>左邊時鐘會即時走（實機用系統時鐘），點時間或標題會打開 App。</li>
      <li>點圓圈打勾，可以按「復原」；按 <b>＋</b> 會跳出小輸入視窗。</li>
      <li>最小 4×2（時鐘需要寬度，所以不做 2×2）；只顯示今天的下班順便做。</li></ul></div>
    <div class="links"><a class="reset" href="./">‹ 回到 App DEMO</a><button class="reset" data-act="reset">恢復範例資料</button></div>
    ${state.size === 'all' ? '' : `<div class="dock">${DOCK.map(app).join('')}</div>`}`;
  document.body.className = `tint-${state.tint} a-${state.alpha}`;
  document.querySelectorAll('.seg3').forEach(n => n.querySelectorAll('button').forEach(b => b.classList.toggle('on', state[n.dataset.k] === b.dataset.v)));
  fresh.clear();
}

let lastDay = new Date().toDateString();
function tick() {
  const now = new Date();
  if (now.toDateString() !== lastDay) { lastDay = now.toDateString(); render(); return; }
  document.querySelectorAll('[data-hm]').forEach(e => { const v = hm(now); if (e.textContent !== v) e.textContent = v; });
  document.querySelectorAll('[data-md]').forEach(e => { e.textContent = md(now); });
  document.querySelectorAll('[data-wk]').forEach(e => { e.textContent = wk(now); });
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
    if (!recent.has(id)) return;
    document.querySelectorAll(`.row[data-id="${id}"]`).forEach(r => r.classList.add('leaving'));
    setTimeout(() => { if (recent.delete(id)) render(); }, 520);
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
      <div class="seg"><button data-t="take" class="on">📦 拿</button><button data-t="buy">🛒 買</button></div>
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
  const opt = e.target.closest('.seg3 button');
  if (opt) { state[opt.parentElement.dataset.k] = opt.dataset.v; save(); render(); return; }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'check') check(b.dataset.id);
  else if (act === 'undo') { const it = state.items.find(i => i.id === b.dataset.id); if (it) { it.done = false; recent.delete(it.id); save(); render(); } document.getElementById('toast').classList.add('hidden'); }
  else if (act === 'add') openAdd();
  else if (act === 'open') toast('實機會打開「順便備忘」App <a href="./">看 App DEMO →</a>');
  else if (act === 'reset') { state = { ...state, items: SEED.map(x => ({ ...x, done: false })) }; recent.clear(); save(); render(); toast('已恢復範例資料'); }
});

// 網址 #large-dark-high-flowers 之類可直接指定
for (const tok of location.hash.replace('#', '').split('-')) {
  for (const [k, vals] of Object.entries(OPTS)) if (vals.includes(tok)) state[k] = tok;
}
render();
setInterval(tick, 1000);
