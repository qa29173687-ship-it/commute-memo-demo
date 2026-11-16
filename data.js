/** 出門備忘 DEMO — 範例資料與純函式。所有項目皆為範例。 */

export const VERSION = 2;
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const LISTS = {
  morning: { id: 'morning', name: '上班帶出門', short: '出門', emoji: '👜', verb: '帶出門' },
  evening: { id: 'evening', name: '下班順便做', short: '順便', emoji: '🛒', verb: '順便做' },
  buy: { id: 'buy', name: '想買的東西', short: '想買', emoji: '🛍️', verb: '買' }
};

export const EMOJIS = {
  morning: ['🔑', '🪪', '☂️', '🍱', '🔌', '📓', '🧴', '💊', '🎧', '🥤', '📝'],
  evening: ['🥛', '📦', '👔', '🗑️', '⛽', '🥬', '💊', '📮', '🧺', '🍞', '📝'],
  buy: ['🧥', '👟', '🧹', '🥛', '🔌', '🎧', '📱', '💄', '📚', '🎁', '📝']
};

export const SALE_NAMES = ['雙11', '雙12', '週年慶', '歲末特賣', '品牌日'];

export const SEED_SETTINGS = {
  morning: { time: '07:30', weekdays: [1, 2, 3, 4, 5], mode: 'notify' },
  evening: { time: '17:50', weekdays: [1, 2, 3, 4, 5], mode: 'alarm' }
};

export const SEED_ITEMS = [
  { id: 'm1', list: 'morning', title: '鑰匙', emoji: '🔑', repeat: 'daily', weekdays: [], note: '', doneOn: null, completedOnce: false },
  { id: 'm2', list: 'morning', title: '識別證', emoji: '🪪', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5], note: '記得刷卡', doneOn: null, completedOnce: false },
  { id: 'm3', list: 'morning', title: '雨傘', emoji: '☂️', repeat: 'daily', weekdays: [], note: '最近常下雨', doneOn: null, completedOnce: false },
  { id: 'm4', list: 'morning', title: '便當', emoji: '🍱', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5], note: '', doneOn: null, completedOnce: false },
  { id: 'm5', list: 'morning', title: '充電線', emoji: '🔌', repeat: 'daily', weekdays: [], note: '', doneOn: null, completedOnce: false },
  { id: 'm6', list: 'morning', title: '筆記本', emoji: '📓', repeat: 'weekly', weekdays: [2], note: '週二開會用', doneOn: null, completedOnce: false },
  { id: 'e1', list: 'evening', title: '買牛奶', emoji: '🥛', repeat: 'once', weekdays: [], note: '全聯或家樂福都可以', doneOn: null, completedOnce: false },
  { id: 'e2', list: 'evening', title: '領包裹', emoji: '📦', repeat: 'once', weekdays: [], note: '超商取件', doneOn: null, completedOnce: false },
  { id: 'e3', list: 'evening', title: '拿乾洗衣服', emoji: '👔', repeat: 'once', weekdays: [], note: '', doneOn: null, completedOnce: false },
  { id: 'e4', list: 'evening', title: '倒垃圾', emoji: '🗑️', repeat: 'weekly', weekdays: [3], note: '週三晚上拿到樓下', doneOn: null, completedOnce: false },
  { id: 'e5', list: 'evening', title: '加油', emoji: '⛽', repeat: 'weekly', weekdays: [5], note: '週五下班順路', doneOn: null, completedOnce: false },
  { id: 'b1', list: 'buy', title: '冬季外套', emoji: '🧥', note: '百貨公司，預算 3000 左右', saleName: '週年慶', saleDate: '2026-11-20', remindDays: 7, remindMode: 'notify', boughtOn: null },
  { id: 'b2', list: 'buy', title: '跑步鞋', emoji: '👟', note: '運動品牌官網，預算 2500', saleName: '歲末特賣', saleDate: '2026-12-01', remindDays: 0, remindMode: 'alarm', boughtOn: null },
  { id: 'b3', list: 'buy', title: '吸塵器濾網', emoji: '🧹', note: '官方商城', saleName: '雙12', saleDate: '2026-12-12', remindDays: 3, remindMode: 'notify', boughtOn: null },
  { id: 'b4', list: 'buy', title: '牛奶優格', emoji: '🥛', note: '全聯就好，沒有特定檔期', saleName: '', saleDate: '', remindDays: 3, remindMode: 'notify', boughtOn: null },
  { id: 'b5', list: 'buy', title: '無線充電盤', emoji: '🔌', note: '蝦皮，看 500 左右', saleName: '雙11', saleDate: '2026-11-11', remindDays: 1, remindMode: 'notify', boughtOn: '2026-11-11' }
];

export function seedState() {
  return {
    version: VERSION,
    items: SEED_ITEMS.map(it => ({
      ...it,
      weekdays: [...(it.weekdays || [])]
    })),
    settings: {
      morning: { ...SEED_SETTINGS.morning, weekdays: [...SEED_SETTINGS.morning.weekdays] },
      evening: { ...SEED_SETTINGS.evening, weekdays: [...SEED_SETTINGS.evening.weekdays] }
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

export function remindDaysLabel(n) {
  const d = Number(n) || 0;
  return d === 0 ? '當天提醒' : `提前 ${d} 天`;
}

export function isDueOn(item, dateStr, day) {
  if (item.list === 'buy') return false;
  if (item.completedOnce) return item.doneOn === dateStr;
  if (item.repeat === 'daily') return true;
  if (item.repeat === 'once') return true;
  if (item.repeat === 'weekly') return (item.weekdays || []).includes(day);
  return false;
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
  if (d.length === 7) return '每天';
  return d.map(x => '週' + WEEKDAYS[x]).join('、');
}

export function isSlotDay(slot, day = dow()) {
  return (slot.weekdays || []).includes(day);
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
