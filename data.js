/** 出門備忘 DEMO — 範例資料與純函式。所有項目皆為範例。 */

export const VERSION = 4;
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const LISTS = {
  evening: { id: 'evening', name: '下班順便做', short: '順便', emoji: '🛒', verb: '順便做' },
  morning: { id: 'morning', name: '上班帶出門', short: '出門', emoji: '👜', verb: '帶出門' },
  buy: { id: 'buy', name: '淘寶採購清單', short: '淘寶', emoji: '📦', verb: '採購' }
};

export const EMOJIS = {
  evening: ['📦', '🥛', '👔', '🗑️', '⛽', '🥬', '🍞', '🧺', '📮', '🍱', '📝'],
  morning: ['🔑', '🪪', '☂️', '🍱', '🔌', '📓', '🧴', '💊', '🎧', '🥤', '📝'],
  buy: ['🎧', '🔌', '📦', '🩴', '📱', '🧥', '📚', '🧴', '🧸', '💡', '📝']
};

export const SALE_NAMES = ['雙11', '雙12', '週年慶', '歲末特賣', '品牌日'];

export const SEED_SETTINGS = {
  evening: { time: '17:50', weekdays: [1, 2, 3, 4, 5], mode: 'alarm' },
  night: { time: '22:00', weekdays: [0, 1, 2, 3, 4], mode: 'notify' }
};

export const FREQUENT = {
  evening: [
    { title: '拿包裹', emoji: '📦', type: 'take', repeat: 'once' },
    { title: '買牛奶', emoji: '🥛', type: 'buy', repeat: 'once' },
    { title: '拿乾洗衣服', emoji: '👔', type: 'take', repeat: 'once' },
    { title: '買晚餐', emoji: '🍱', type: 'buy', repeat: 'once' }
  ],
  morning: [
    { title: '鑰匙', emoji: '🔑', repeat: 'daily' },
    { title: '識別證', emoji: '🪪', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5] },
    { title: '雨傘', emoji: '☂️', repeat: 'daily' },
    { title: '充電線', emoji: '🔌', repeat: 'daily' },
    { title: '便當', emoji: '🍱', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5] }
  ]
};

export const SEED_ITEMS = [
  { id: 'e1', list: 'evening', title: '買牛奶', emoji: '🥛', type: 'buy', repeat: 'once', weekdays: [], dueOffset: 0, note: '全聯或家樂福都可以', doneOn: null, completedOnce: false },
  { id: 'e2', list: 'evening', title: '拿包裹', emoji: '📦', type: 'take', repeat: 'once', weekdays: [], dueOffset: 0, note: '超商取件', doneOn: null, completedOnce: false },
  { id: 'e3', list: 'evening', title: '拿乾洗衣服', emoji: '👔', type: 'take', repeat: 'once', weekdays: [], dueOffset: 0, note: '', doneOn: null, completedOnce: false },
  { id: 'e6', list: 'evening', title: '明天下班買牛奶', emoji: '🥛', type: 'buy', repeat: 'once', weekdays: [], dueOffset: 1, note: '今晚先加進清單，明天下班再買', doneOn: null, completedOnce: false },
  { id: 'e4', list: 'evening', title: '倒垃圾', emoji: '🗑️', type: 'take', repeat: 'weekly', weekdays: [3], note: '週三晚上拿到樓下', doneOn: null, completedOnce: false },
  { id: 'e5', list: 'evening', title: '加油', emoji: '⛽', type: 'buy', repeat: 'weekly', weekdays: [5], note: '週五下班順路', doneOn: null, completedOnce: false },
  { id: 'm1', list: 'morning', title: '鑰匙', emoji: '🔑', repeat: 'daily', weekdays: [], note: '', doneOn: null, completedOnce: false },
  { id: 'm2', list: 'morning', title: '識別證', emoji: '🪪', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5], note: '記得刷卡', doneOn: null, completedOnce: false },
  { id: 'm3', list: 'morning', title: '雨傘', emoji: '☂️', repeat: 'daily', weekdays: [], note: '最近常下雨', doneOn: null, completedOnce: false },
  { id: 'm4', list: 'morning', title: '便當', emoji: '🍱', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5], note: '', doneOn: null, completedOnce: false },
  { id: 'm5', list: 'morning', title: '充電線', emoji: '🔌', repeat: 'daily', weekdays: [], note: '', doneOn: null, completedOnce: false },
  { id: 'm6', list: 'morning', title: '筆記本', emoji: '📓', repeat: 'weekly', weekdays: [2], note: '週二開會用', doneOn: null, completedOnce: false },
  { id: 'b1', list: 'buy', title: '冬季拖鞋', emoji: '🩴', note: '看評價再下單', saleName: '週年慶', saleDate: '2026-11-20', remindDays: 7, remindMode: 'notify', boughtOn: null },
  { id: 'b2', list: 'buy', title: 'Type-C 充電線 三條', emoji: '🔌', note: '選好評賣家', saleName: '雙12', saleDate: '2026-12-12', remindDays: 3, remindMode: 'notify', boughtOn: null },
  { id: 'b3', list: 'buy', title: '廚房密封盒', emoji: '🥡', note: '一套六件', saleName: '歲末特賣', saleDate: '2026-12-01', remindDays: 0, remindMode: 'alarm', boughtOn: null },
  { id: 'b4', list: 'buy', title: '桌面收納盒', emoji: '📦', note: '', saleName: '', saleDate: '', remindDays: 3, remindMode: 'notify', boughtOn: null },
  { id: 'b5', list: 'buy', title: '手機殼', emoji: '📱', note: '已下單，等到貨', saleName: '雙11', saleDate: '2026-11-11', remindDays: 1, remindMode: 'notify', boughtOn: '2026-11-12' }
];

export function seedState() {
  return {
    version: VERSION,
    items: SEED_ITEMS.map(it => {
      const copy = { ...it, weekdays: [...(it.weekdays || [])] };
      if (it.dueOffset === 0) copy.dueDate = todayISO();
      else if (it.dueOffset === 1) copy.dueDate = addDays(todayISO(), 1);
      delete copy.dueOffset;
      return copy;
    }),
    settings: {
      evening: { ...SEED_SETTINGS.evening, weekdays: [...SEED_SETTINGS.evening.weekdays] },
      night: { ...SEED_SETTINGS.night, weekdays: [...SEED_SETTINGS.night.weekdays] }
    }
  };
}

export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dow(d = new Date()) {
  return d.getDay();
}

export function dateLabel(d = new Date()) {
  return `${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS[d.getDay()]}`;
}

export function shortDate(d = new Date()) {
  return `${d.getMonth() + 1}/${d.getDate()} 週${WEEKDAYS[d.getDay()]}`;
}

export function isoLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}月${d}日 週${WEEKDAYS[dt.getDay()]}`;
}

export function tomorrowOf(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { date: todayISO(t), day: t.getDay(), label: dateLabel(t), short: shortDate(t) };
}

export function formatTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const n = Number(h);
  if (!Number.isFinite(n)) return t;
  const period = n < 12 ? '早上' : n === 12 ? '中午' : n < 18 ? '下午' : '晚上';
  const h12 = n % 12 === 0 ? 12 : n % 12;
  return `${period} ${h12}:${m}`;
}

export function modeLabel(mode) {
  return mode === 'alarm' ? '鬧鐘' : '通知';
}

export function typeLabel(type) {
  return type === 'buy' ? '買' : type === 'take' ? '拿' : '';
}

export function inferType(title) {
  const t = String(title || '');
  if (/^買/.test(t) || /加油/.test(t)) return 'buy';
  return 'take';
}

export function isDueOn(item, dateStr, day) {
  if (item.list === 'buy') return false;
  if (item.completedOnce) return item.doneOn === dateStr;
  if (item.dueDate) return item.dueDate === dateStr;
  if (item.repeat === 'daily') return true;
  if (item.repeat === 'once') return true;
  if (item.repeat === 'weekly') return (item.weekdays || []).includes(day);
  return false;
}

export function isOverdue(item, dateStr) {
  return !!(item.dueDate && item.dueDate < dateStr && !item.completedOnce && item.list !== 'buy');
}

export function defaultWhen(d = new Date()) {
  return d.getHours() >= 18 ? 'tomorrow' : 'today';
}

export function inferWhen(item, todayStr) {
  if (!item || !item.dueDate) return 'repeat';
  if (item.dueDate === todayStr) return 'today';
  if (item.dueDate === addDays(todayStr, 1)) return 'tomorrow';
  return 'date';
}

export function whenLabel(item, todayStr) {
  if (item.dueDate) {
    if (item.dueDate === todayStr) return '今天';
    if (item.dueDate === addDays(todayStr, 1)) return '明天';
    if (item.dueDate < todayStr) return (item.completedOnce ? '' : '已過期 · ') + isoLabel(item.dueDate);
    return isoLabel(item.dueDate);
  }
  return repeatLabel(item);
}

export function dateFromISO(iso) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDoneOn(item, dateStr) {
  return item.doneOn === dateStr;
}

export function stillVisibleToday(item, dateStr, day) {
  if (!isDueOn(item, dateStr, day)) return false;
  if (item.repeat === 'once' && item.completedOnce) return false;
  return true;
}

export function repeatLabel(item) {
  if (item.repeat === 'daily') return '每天';
  if (item.repeat === 'once') return '只提醒一次';
  const days = [...(item.weekdays || [])].sort((a, b) => a - b);
  if (!days.length) return '指定星期（還沒選）';
  if (days.length === 7) return '每天';
  if (eqDays(days, [1, 2, 3, 4, 5])) return '週一至週五';
  if (eqDays(days, [1, 2, 3, 4, 5, 6])) return '週一至週六';
  if (eqDays(days, [0, 6])) return '週六、週日';
  return days.map(d => '週' + WEEKDAYS[d]).join('、');
}

function eqDays(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function workdaysLabel(days) {
  const d = [...(days || [])].sort((a, b) => a - b);
  if (!d.length) return '還沒選提醒日';
  if (eqDays(d, [1, 2, 3, 4, 5])) return '週一至週五';
  if (eqDays(d, [0, 1, 2, 3, 4])) return '週日至週四晚';
  if (d.length === 7) return '每天';
  return d.map(x => '週' + WEEKDAYS[x]).join('、');
}

export function isSlotDay(slot, day = dow()) {
  return (slot.weekdays || []).includes(day);
}

export function remindDaysLabel(n) {
  const d = Number(n) || 0;
  return d === 0 ? '當天提醒' : `提前 ${d} 天`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayISO(dt);
}

export function daysUntil(iso, fromIso) {
  const a = new Date(`${fromIso}T00:00:00`);
  const b = new Date(`${iso}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

export function remindDate(item) {
  if (!item.saleDate) return null;
  return addDays(item.saleDate, -(Number(item.remindDays) || 0));
}

export function isSaleRemindDue(item, dateStr) {
  if (item.boughtOn || !item.saleDate) return false;
  const rd = remindDate(item);
  return rd && dateStr >= rd && dateStr <= item.saleDate;
}

export function upcomingSales(items, dateStr) {
  return items
    .filter(it => it.list === 'buy' && !it.boughtOn && it.saleDate && it.saleDate >= dateStr)
    .sort((a, b) => a.saleDate.localeCompare(b.saleDate) || a.title.localeCompare(b.title, 'zh-Hant'));
}

export function saleCountdown(iso, dateStr) {
  const n = daysUntil(iso, dateStr);
  if (n === 0) return '今天開始打折';
  if (n === 1) return '還有 1 天';
  return `還有 ${n} 天`;
}
