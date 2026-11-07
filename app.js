'use strict';
/* CarBook: vehicle ownership companion for Sri Lanka.
   Data lives on this device (localStorage for records, IndexedDB for photos).
   All visible text comes from strings.js through t().
   See CLAUDE.md for the roadmap and design rules. */

// ---------- language ----------
const LANG_KEY = 'carbook.lang';
// A language shows in the picker once its translation has started (it has a langName).
const languages = () => Object.keys(STRINGS).filter(k => k === 'en' || STRINGS[k].langName);
let lang = (() => { try { const l = localStorage.getItem(LANG_KEY); if (l && languages().includes(l)) return l; } catch (e) {} return 'en'; })();
function t(key, ...args) {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key];
  if (s == null) { console.warn('Missing string:', key); return key; }
  return typeof s === 'function' ? s(...args) : s;
}
function setLang(l) { lang = l; try { localStorage.setItem(LANG_KEY, l); } catch (e) {} document.documentElement.lang = l; }
document.documentElement.lang = lang;

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const daysTo = iso => Math.round((new Date(iso + 'T00:00') - new Date(todayISO() + 'T00:00')) / 864e5);
const loc = () => LOCALES[lang] || 'en-GB';
const fmtD = iso => new Date(iso + 'T00:00').toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' });
const n0 = n => Math.round(n).toLocaleString(loc());
const n1 = n => n.toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const addMonthsISO = (iso, m) => { const d = new Date(iso + 'T00:00'); d.setMonth(d.getMonth() + m); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const yearsSince = iso => (new Date(todayISO() + 'T00:00') - new Date(iso + 'T00:00')) / 864e5 / 365.25;

// ---------- data ----------
const KEY = 'carbook.v1';
let db = load();
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 1) return upgrade(d); } catch (e) {}
  return { v: 1, active: null, vehicles: [], docs: [], fuel: [], service: [] };
}
// Fill in fields added after a record was first saved. Never removes anything.
function upgrade(d) {
  ['docs', 'fuel', 'service'].forEach(k => (d[k] || (d[k] = [])).forEach(r => { if (!r.visibility) r.visibility = 'private'; }));
  return d;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast(t('storageFull')); }
}
const veh = () => db.vehicles.find(v => v.id === db.active) || db.vehicles[0] || null;
const mine = (arr, v) => arr.filter(x => x.vid === v.id);
const newRecord = v => ({ id: uid(), vid: v.id, createdAt: Date.now(), source: 'owner', visibility: 'private' });

// photos (IndexedDB)
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open('carbook', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('photos');
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function putPhoto(id, file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.72));
  const d = await idb();
  return new Promise((res, rej) => { const tx = d.transaction('photos', 'readwrite'); tx.objectStore('photos').put(blob, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function getPhoto(id) {
  const d = await idb();
  return new Promise((res, rej) => { const q = d.transaction('photos').objectStore('photos').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function delPhoto(id) { try { const d = await idb(); d.transaction('photos', 'readwrite').objectStore('photos').delete(id); } catch (e) {} }

// ---------- rules ----------
// Default intervals only. The owner's manual always comes first.
const INTERVALS = {
  oil: { km: 5000, months: 6 },
  battery: { soonYears: 3, dueYears: 4.5 },
  brakes: { km: 30000 },
  tyres: { km: 40000, years: 5 },
  plugs: { km: 30000 },
  alignment: { km: 10000, months: 12 }
};
// Stored values. Labels come from strings.js.
const DOC_KINDS = ['emission', 'insurance', 'revenue', 'driving', 'warranty', 'other'];
const HINTED = ['emission', 'insurance', 'revenue'];
const VEHICLE_TYPES = ['Car', 'Motorbike', 'Three-wheeler', 'Van'];
const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const SERVICE_KINDS = ['Oil change', 'Brake pads', 'Tyres', 'Wheel alignment', 'Battery', 'Spark plugs', 'Other'];
const PARTS = ['Genuine', 'Aftermarket', 'Used'];
const FILTERS = ['Changed', 'Not changed'];

const kindName = k => t('kind_' + k);
const kindHint = k => HINTED.includes(k) ? t('hint_' + k) : '';
const label = (prefix, value) => STRINGS.en[prefix + value] ? t(prefix + value) : value;
const exemptEmission = v => v.fuel === 'Electric' || v.fuel === 'Hybrid';
const requiredKinds = v => exemptEmission(v) ? ['insurance', 'revenue'] : ['emission', 'insurance', 'revenue'];
const docTitle = d => d.title || kindName(d.kind);

function status(days) {
  if (days < 0) return { c: 'bad', t: t('overdueBy', Math.abs(days)) };
  if (days === 0) return { c: 'bad', t: t('today') };
  if (days <= 14) return { c: 'bad', t: t('days', days) };
  if (days <= 45) return { c: 'warn', t: t('days', days) };
  if (days < 120) return { c: 'ok', t: t('days', days) };
  return { c: 'ok', t: t('months', Math.round(days / 30)) };
}

function fuelRows(v) {
  const f = mine(db.fuel, v).sort((a, b) => a.odo - b.odo || a.date.localeCompare(b.date));
  return f.map((x, i) => ({ ...x, kpl: i && x.litres > 0 && x.odo > f[i - 1].odo ? (x.odo - f[i - 1].odo) / x.litres : null }));
}
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;

function lastService(v, kind) {
  return mine(db.service, v).filter(s => s.kind === kind).sort((a, b) => b.odo - a.odo || b.date.localeCompare(a.date))[0];
}

// Each item: kind (the service kind to log), name, s (ok, warn, bad, none), text.
function health(v) {
  const out = [];
  const none = (kind, name) => out.push({ kind, name, s: 'none', text: t('noRecordYet') });
  // oil
  const o = lastService(v, 'Oil change');
  if (!o) none('Oil change', t('engineOil')); else {
    const due = addMonthsISO(o.date, INTERVALS.oil.months);
    const kmLeft = o.odo + INTERVALS.oil.km - v.odo, dLeft = daysTo(due);
    const s = (kmLeft <= 0 || dLeft <= 0) ? 'bad' : (kmLeft <= 800 || dLeft <= 30) ? 'warn' : 'ok';
    out.push({ kind: 'Oil change', name: t('engineOil'), s, text: s === 'bad' ? t('oilDueNow') : t('oilNext', n0(Math.max(kmLeft, 0)), fmtD(due)) });
  }
  // battery
  const b = lastService(v, 'Battery');
  if (!b) none('Battery', label('svc_', 'Battery')); else {
    const yrs = yearsSince(b.date);
    const s = yrs >= INTERVALS.battery.dueYears ? 'bad' : yrs >= INTERVALS.battery.soonYears ? 'warn' : 'ok';
    out.push({ kind: 'Battery', name: label('svc_', 'Battery'), s, text: t('batteryAge', n1(yrs)) + (s !== 'ok' ? '. ' + t('batteryLoadTest') : '') });
  }
  // by distance
  [['Brake pads', INTERVALS.brakes.km, 'actBrakes'], ['Tyres', INTERVALS.tyres.km, 'actTyres'], ['Spark plugs', INTERVALS.plugs.km, 'actPlugs']].forEach(([kind, km, act]) => {
    const name = label('svc_', kind), r = lastService(v, kind);
    if (!r) return none(kind, name);
    const used = v.odo - r.odo, s = used >= km ? 'bad' : used >= km * 0.8 ? 'warn' : 'ok';
    out.push({ kind, name, s, text: t('kmSince', n0(used)) + (s === 'ok' ? '' : '. ' + t(act)) });
  });
  return out;
}

function questions(v) {
  const q = [];
  const o = lastService(v, 'Oil change'), br = lastService(v, 'Brake pads'), bat = lastService(v, 'Battery'), ty = lastService(v, 'Tyres');
  if (o) q.push([t('qOil', n0(v.odo - o.odo), o.oil), t('bOil', fmtD(o.date), n0(o.odo))]);
  else q.push([t('qNoOil'), t('bNoOil')]);
  if (o && o.oil) q.push([t('qOilType', o.oil), t('bOilType')]);
  q.push(br ? [t('qBrakes', n0(br.odo)), t('bLog')] : [t('qNoBrakes'), t('bNoBrakes')]);
  if (bat) { const y = yearsSince(bat.date); if (y >= INTERVALS.battery.soonYears) q.push([t('qBattery', n1(y)), t('bBattery', fmtD(bat.date))]); }
  if (!ty) q.push([t('qNoTyres'), t('bNoTyres')]);
  const k = fuelRows(v).map(x => x.kpl).filter(Boolean);
  if (k.length >= 4) { const rec = avg(k.slice(-2)), old = avg(k.slice(0, -2)); if (rec < old * 0.92) q.push([t('qFuel', n1(rec), n1(old)), t('bFuel')]); }
  mine(db.docs, v).filter(d => d.kind === 'emission').forEach(d => { const n = daysTo(d.expiry); if (n >= 0 && n <= 30) q.push([t('qEmission', n), t('bEmission', fmtD(d.expiry))]); });
  if (mine(db.service, v).length === 0) q.push([t('qEmpty'), t('bEmpty')]);
  return q;
}


// ---------- reminders and the 12-month roadmap ----------
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + Math.round(n)); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const isoOf = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

// Average km driven per day over the last year, from fill-ups and services. Null when there is too little to go on.
function kmPerDay(v) {
  const since = addDaysISO(todayISO(), -365);
  const pts = [...mine(db.fuel, v), ...mine(db.service, v)].filter(x => x.date >= since && x.odo > 0).map(x => [x.date, x.odo]);
  if (v.odo) pts.push([todayISO(), v.odo]);
  if (pts.length < 2) return null;
  pts.sort((a, b) => a[0].localeCompare(b[0]));
  const days = daysTo(pts.at(-1)[0]) - daysTo(pts[0][0]), km = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
  return days >= 21 && km > 0 ? km / days : null;
}

// fine / soon / due, from days left and km left (either may be null).
function urgency(days, km) {
  if ((days != null && days < 0) || (km != null && km <= 0)) return 'bad';
  if ((days != null && days <= 14) || (km != null && km <= 500)) return 'bad';
  if ((days != null && days <= 45) || (km != null && km <= 1500)) return 'warn';
  return 'ok';
}

// Everything with a date or distance attached, most urgent first.
// Item: key, cat (doc | warranty | service), title, sub, date, days, kmLeft, byKm, est, s, act, id, kind
function reminders(v) {
  const out = [], rate = kmPerDay(v), today = todayISO();
  const kmDate = km => rate ? addDaysISO(today, km / rate) : null;
  // documents
  mine(db.docs, v).forEach(d => {
    const days = daysTo(d.expiry), renewable = ['emission', 'insurance', 'revenue', 'driving'].includes(d.kind);
    out.push({ key: 'doc-' + d.id, cat: d.kind === 'warranty' ? 'warranty' : 'doc', title: docTitle(d), sub: kindHint(d.kind) || (d.kind === 'warranty' ? t('warrantySub') : ''),
      date: d.expiry, days, kmLeft: null, est: false, s: status(days).c, act: renewable && days <= 45 ? 'renew' : 'doc', id: d.id, kind: d.kind });
  });
  const have = new Set(mine(db.docs, v).map(d => d.kind));
  requiredKinds(v).filter(k => !have.has(k)).forEach(k => out.push({ key: 'missing-' + k, cat: 'doc', title: kindName(k), sub: t('notAddedYet'), date: null, days: null, kmLeft: null, s: 'none', act: 'addDoc', kind: k }));
  // engine oil (not for electric cars)
  if (v.fuel !== 'Electric') {
    const o = lastService(v, 'Oil change');
    if (!o) out.push({ key: 'oil', cat: 'service', title: t('svc_Oil change'), sub: t('noRecordYet'), date: null, days: null, kmLeft: null, s: 'none', act: 'addService', kind: 'Oil change' });
    else {
      const byDate = addMonthsISO(o.date, INTERVALS.oil.months), kmLeft = o.odo + INTERVALS.oil.km - v.odo, byKmDate = kmDate(kmLeft);
      const byKm = !!byKmDate && byKmDate < byDate, date = byKm ? byKmDate : byDate;
      out.push({ key: 'oil', cat: 'service', title: t('svc_Oil change'), sub: t('oilRule', n0(INTERVALS.oil.km), INTERVALS.oil.months), date, days: daysTo(date), kmLeft, byKm, est: byKm,
        s: urgency(daysTo(byDate), kmLeft), act: 'addService', kind: 'Oil change' });
    }
  }
  // battery: load test from 3 years, replacement around 4.5 years (defaults)
  const b = lastService(v, 'Battery');
  if (b) {
    const yrs = yearsSince(b.date), age = t('batteryAge', n1(yrs));
    const testDate = addMonthsISO(b.date, Math.round(INTERVALS.battery.soonYears * 12)), replDate = addMonthsISO(b.date, Math.round(INTERVALS.battery.dueYears * 12));
    if (yrs < INTERVALS.battery.soonYears)
      out.push({ key: 'battery-test', cat: 'service', title: t('batteryCheck'), sub: age, date: testDate, days: daysTo(testDate), kmLeft: null, est: false, s: urgency(daysTo(testDate), null), act: 'addService', kind: 'Battery' });
    else if (yrs < INTERVALS.battery.dueYears)
      out.push({ key: 'battery-test', cat: 'service', title: t('batteryCheck'), sub: age, date: null, days: null, kmLeft: null, est: false, s: 'warn', act: 'addService', kind: 'Battery', checkNow: true });
    out.push({ key: 'battery', cat: 'service', title: t('batteryReplace'), sub: age, date: replDate, days: daysTo(replDate), kmLeft: null, est: false,
      s: yrs >= INTERVALS.battery.dueYears ? 'bad' : urgency(daysTo(replDate), null), act: 'addService', kind: 'Battery' });
  }
  // wheel alignment: by distance or months, whichever comes first (defaults)
  const al = lastService(v, 'Wheel alignment');
  if (al) {
    const byDate = addMonthsISO(al.date, INTERVALS.alignment.months), kmLeft = al.odo + INTERVALS.alignment.km - v.odo, byKmDate = kmDate(kmLeft);
    const byKm = !!byKmDate && byKmDate < byDate, date = byKm ? byKmDate : byDate;
    out.push({ key: 'alignment', cat: 'service', title: label('svc_', 'Wheel alignment'), sub: '', date, days: daysTo(date), kmLeft, byKm, est: byKm, s: urgency(daysTo(byDate), kmLeft), act: 'addService', kind: 'Wheel alignment' });
  }
  // by distance (and tyre age)
  [['Brake pads', INTERVALS.brakes.km], ['Tyres', INTERVALS.tyres.km], ['Spark plugs', INTERVALS.plugs.km]].forEach(([kind, km]) => {
    if (kind === 'Spark plugs' && (v.fuel === 'Electric' || v.fuel === 'Diesel')) return;
    const r = lastService(v, kind); if (!r) return;
    const kmLeft = r.odo + km - v.odo, used = v.odo - r.odo;
    let date = kmDate(kmLeft), byKm = !!date;
    if (kind === 'Tyres') { const age = addMonthsISO(r.date, INTERVALS.tyres.years * 12); if (!date || age < date) { date = age; byKm = false; } }
    out.push({ key: kind, cat: 'service', title: label('svc_', kind), sub: t('kmSince', n0(used)), date, days: date ? daysTo(date) : null, kmLeft, byKm, est: byKm,
      s: used >= km ? 'bad' : used >= km * 0.8 ? 'warn' : 'ok', act: 'addService', kind });
  });
  const rank = x => x.s === 'none' ? 1e5 : (x.s === 'bad' ? -1e5 : x.s === 'warn' ? -5e4 : 0) + (x.days ?? (x.kmLeft != null ? x.kmLeft / (rate || 40) : 9e4));
  return out.sort((a, b) => rank(a) - rank(b));
}

// The big value shown for a reminder: { big, unit, small }.
function valueOf(x) {
  if (x.s === 'none') return { big: t('add'), unit: '', small: '' };
  if (x.checkNow) return { big: t('checkNow'), unit: '', small: t('atNextService') };
  const kmFirst = x.kmLeft != null && (x.byKm || x.days == null || x.kmLeft <= 1500);
  if (kmFirst) {
    if (x.kmLeft <= 0) return { big: t('overdue'), unit: '', small: t('overByKm', n0(-x.kmLeft)) };
    return { big: n0(x.kmLeft), unit: t('km'), small: x.date ? t('aroundDate', fmtD(x.date)) : t('noDrivingRate') };
  }
  if (x.days < 0) return { big: t('overdue'), unit: '', small: t('overByDays', -x.days) };
  if (x.days === 0) return { big: t('today'), unit: '', small: fmtD(x.date) };
  if (x.days < 120) return { big: n0(x.days), unit: t(x.days === 1 ? 'dayUnit' : 'daysUnit'), small: fmtD(x.date) };
  return { big: n0(Math.round(x.days / 30)), unit: t('monthsUnit'), small: fmtD(x.date) };
}

// ---------- fuel periods ----------
const PERIODS = ['1M', '6M', '1Y', '2Y', '5Y'];
// Calendar buckets for a period, oldest first: { start, end (exclusive), label }
function buckets(p) {
  const now = new Date(todayISO() + 'T00:00'), y = now.getFullYear(), m = now.getMonth(), out = [];
  const mLabel = (d, yr) => d.toLocaleDateString(loc(), yr ? { month: 'short', year: '2-digit' } : { month: 'short' });
  if (p === '1M') {
    const end = new Date(now); end.setDate(end.getDate() + 1);
    for (let i = 4; i >= 0; i--) { const e = new Date(end); e.setDate(e.getDate() - 6 * i); const s = new Date(e); s.setDate(s.getDate() - 6);
      out.push({ start: isoOf(s), end: isoOf(e), label: s.toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) }); }
  } else if (p === '5Y') {
    const qs = Math.floor(m / 3) * 3;
    for (let i = 19; i >= 0; i--) { const s = new Date(y, qs - 3 * i, 1), e = new Date(y, qs - 3 * i + 3, 1);
      out.push({ start: isoOf(s), end: isoOf(e), label: t('quarter', Math.floor(s.getMonth() / 3) + 1, String(s.getFullYear()).slice(2)) }); }
  } else {
    const n = { '6M': 6, '1Y': 12, '2Y': 24 }[p];
    for (let i = n - 1; i >= 0; i--) { const s = new Date(y, m - i, 1), e = new Date(y, m - i + 1, 1);
      out.push({ start: isoOf(s), end: isoOf(e), label: mLabel(s, n > 12 || s.getMonth() === 0) }); }
  }
  return out;
}
// Totals for fill-ups dated in [start, end).
function fuelStats(v, start, end) {
  const rows = fuelRows(v).filter(x => x.date >= start && x.date < end);
  const spent = rows.reduce((s, x) => s + x.total, 0), litres = rows.reduce((s, x) => s + x.litres, 0), k = rows.map(x => x.kpl).filter(Boolean);
  return { fills: rows.length, spent, litres, price: litres ? spent / litres : null, kpl: k.length ? avg(k) : null };
}
function periodData(v, p) {
  const bs = buckets(p), start = bs[0].start, end = bs.at(-1).end;
  const span = daysTo(end) - daysTo(start), prevStart = addDaysISO(start, -span);
  // Only compare when the records reach back far enough to cover the whole earlier period.
  const first = mine(db.fuel, v).map(x => x.date).sort()[0], covered = first && daysTo(first) <= daysTo(prevStart) + 20;
  const prev = covered ? fuelStats(v, prevStart, start) : { fills: 0, spent: 0, litres: 0, price: null, kpl: null };
  return { bs: bs.map(b => ({ ...b, ...fuelStats(v, b.start, b.end) })), cur: fuelStats(v, start, end), prev };
}

// ---------- ui state ----------
let tab = 'home', asked = null, mech = false, period = '6M', fsel = null, showYear = false;
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const ICONS = {
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  car: '<path d="M4 15l1.6-4.4A2 2 0 0 1 7.5 9h9a2 2 0 0 1 1.9 1.6L20 15v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-9v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 15h16"/><circle cx="7.5" cy="15" r=".5"/><circle cx="16.5" cy="15" r=".5"/>',
  money: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 9.5h6M9 12.5h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  oil: '<path d="M3 10.5h8.5l2.5 2.5h3.5l3-3v6.5a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3z"/><path d="M7 10.5V8h4M8 8V6.5h2M20.5 5.5c0 1.2.9 1.7.9 2.6a.9.9 0 0 1-1.8 0c0-.9.9-1.4.9-2.6z"/>',
  smoke: '<path d="M7 18.5h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4-1A4.5 4.5 0 0 0 7 18.5z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>',
  disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M10 11h4M10.5 13.5h3"/>',
  idcard: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.8 15.8c.6-1.2 1.5-1.8 2.7-1.8s2.1.6 2.7 1.8M14 10h4M14 13h3"/>',
  ribbon: '<circle cx="12" cy="9" r="5.5"/><path d="M9 13.8L8 21l4-2 4 2-1-7.2"/><path d="M10 9l1.4 1.4L14 7.8"/>',
  align: '<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.8"/><path d="M12 6.5v3.7M12 13.8v3.7M1.5 12h3M19.5 12h3M3.5 9.5L1.5 12l2 2.5M20.5 9.5l2 2.5-2 2.5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
  bot: '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 7V4M9 12.5h.01M15 12.5h.01M9.5 16h5"/>',
  battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 12h4M9 10v4"/>',
  brake: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M12 17v3"/>',
  tyre: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5"/>',
  plug: '<path d="M13 3L6 13h5l-1 8 7-10h-5z"/>',
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M5 21h10M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M8 8h4"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
};
const TABS = [['home', 'tabHome'], ['car', 'tabCar'], ['money', 'tabMoney'], ['ask', 'tabAsk']];
function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2400); }
// ---------- assistant ----------
// Real AI answers where the page can reach Claude (the claude.ai preview).
// Everywhere else, simple answers worked out from the records. A real AI needs a small CarBook server (roadmap).
let aiSample = null, chat = [], chatBusy = false, chatCtl = null;
(async () => { try { if (window.claude?.use) { aiSample = await window.claude.use('sample'); if (tab === 'ask') render(); } } catch (e) { aiSample = null; } })();

const AI_RULES = `You are the assistant inside CarBook, a vehicle records app for owners in Sri Lanka.
Answer the owner's question using ONLY the JSON records below. Rules:
- Be short and plain: 1 to 4 sentences, or a short list. Use Rs for money and km for distance. Round sensibly.
- If the records do not hold the answer, say so and suggest what to log.
- Dates marked "estimated" come from the owner's average driving; say "around" for them.
- Service intervals are CarBook defaults. The owner's manual comes first. Never state specs as fact.
- Never diagnose a fault. Suggest questions to ask a mechanic instead. For brakes or tyres, always recommend a professional check.
- Reply in the language the owner writes in.`;

function aiContext(v) {
  const months = [];
  const now = new Date(todayISO() + 'T00:00');
  for (let i = 59; i >= 0; i--) {
    const s = isoOf(new Date(now.getFullYear(), now.getMonth() - i, 1)), e = isoOf(new Date(now.getFullYear(), now.getMonth() - i + 1, 1)), st = fuelStats(v, s, e);
    if (st.fills) months.push({ month: s.slice(0, 7), spentRs: Math.round(st.spent), litres: +st.litres.toFixed(1), avgPricePerLitreRs: +st.price.toFixed(1), fillUps: st.fills, kmPerLitre: st.kpl ? +st.kpl.toFixed(1) : null });
  }
  const rate = kmPerDay(v);
  return JSON.stringify({
    today: todayISO(),
    vehicle: { name: v.name, plate: v.plate, year: v.year, type: v.type, fuel: v.fuel, odometerKm: v.odo, averageKmPerDay: rate ? Math.round(rate) : null },
    documents: mine(db.docs, v).map(d => ({ type: kindName(d.kind), name: d.title || undefined, expires: d.expiry, daysLeft: daysTo(d.expiry), earlierExpiries: (d.history || []).map(h => h.expiry) })),
    upcoming: reminders(v).map(x => ({ item: x.title, due: x.date, daysLeft: x.days, kmLeft: x.kmLeft, estimated: !!x.est, status: { bad: 'due', warn: 'soon', ok: 'fine', none: 'no record' }[x.s] })),
    services: mine(db.service, v).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map(s => ({ date: s.date, work: s.kind, odometerKm: s.odo, costRs: s.cost, garage: s.garage || undefined, oil: s.oil || undefined, parts: s.part || undefined, note: s.note || undefined })),
    fuelByMonth: months,
    defaultIntervals: INTERVALS
  });
}

// Answers worked out from the records when AI is not available.
function localAnswer(v, q) {
  q = q.toLowerCase();
  const R = reminders(v), find = re => R.find(x => re.test((x.kind || '') + ' ' + x.title.toLowerCase()));
  const when = x => { const val = valueOf(x); return x.s === 'none' ? t('laNoRecord', x.title) : t('laDue', x.title, val.big + (val.unit ? ' ' + val.unit : ''), val.small); };
  const per = /5 ?year|five year/.test(q) ? '5Y' : /2 ?year|two year/.test(q) ? '2Y' : /6 ?month|six month|half/.test(q) ? '6M' : /month/.test(q) ? '1M' : '1Y';
  if (/brake/.test(q)) { const x = find(/brake/i); return (x ? when(x) + ' ' : t('laNoRecord', label('svc_', 'Brake pads')) + ' ') + t('laPro'); }
  if (/tyre|tire/.test(q)) { const x = find(/tyre/i); return (x ? when(x) + ' ' : t('laNoRecord', label('svc_', 'Tyres')) + ' ') + t('laPro'); }
  if (/price|per litre|per liter|rate/.test(q)) {
    const d = periodData(v, per), c = d.cur, p = d.prev;
    return c.price ? t('laPrice', t('per_' + per), n0(c.price), p.price ? n0(p.price) : null) : t('laNoFuel');
  }
  if (/km\/l|economy|mileage|efficien|consum/.test(q)) {
    const d = periodData(v, per); return d.cur.kpl ? t('laKpl', t('per_' + per), n1(d.cur.kpl), d.prev.kpl ? n1(d.prev.kpl) : null) : t('laNoFuel');
  }
  if (/spen|spent|cost|fuel|petrol|diesel/.test(q)) {
    const d = periodData(v, per), c = d.cur; return c.fills ? t('laSpend', t('per_' + per), n0(c.spent), n0(c.litres), c.fills, d.prev.fills ? n0(d.prev.spent) : null) : t('laNoFuel');
  }
  for (const [re, rk] of [[/oil/, /oil/i], [/battery/, /battery/i], [/plug/, /plug/i], [/emission|smoke/, /emission/i], [/insurance/, /insurance/i], [/licen[cs]e|revenue/, /revenue|driving/i], [/warrant/, /warranty/i]]) {
    if (re.test(q)) { const x = find(rk); return x ? when(x) : t('laNotFound'); }
  }
  if (/due|next|coming|upcoming|remind|soon|plan|month/.test(q)) {
    const list = R.filter(x => x.s !== 'none').slice(0, 4).map(x => '• ' + when(x)).join('\n'); return list ? t('laNext') + '\n' + list : t('laNotFound');
  }
  return t('laHelp');
}

async function sendChat(text) {
  const v = veh(); text = (text || '').trim(); if (!text || chatBusy) return;
  chat.push({ role: 'user', text });
  const reply = { role: 'assistant', text: '', src: aiSample ? 'ai' : 'local', pending: true };
  chat.push(reply); chatBusy = true; render(); scrollChat();
  if (!aiSample) { reply.text = localAnswer(v, text); reply.pending = false; chatBusy = false; render(); scrollChat(); return; }
  chatCtl = new AbortController();
  const turns = [{ role: 'user', content: AI_RULES + '\n\nRecords (JSON):\n' + aiContext(v) }];
  chat.slice(-11, -1).forEach(m => m.text && turns.push({ role: m.role, content: m.text }));
  try {
    const res = await aiSample(turns, { cache: false, signal: chatCtl.signal, onText: ({ text: s }) => { reply.text = s; reply.pending = false; paintBubble(chat.length - 1); } });
    reply.text = res.text;
  } catch (e) {
    if (e?.code === 'cancelled') reply.text = e.text || t('chatStopped');
    else if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e?.code)) { aiSample = null; reply.src = 'local'; reply.text = localAnswer(v, text); }
    else if (e?.code === 'rate_limited') reply.text = (e.text ? e.text + '\n\n' : '') + t('chatBusyErr');
    else reply.text = (e?.text ? e.text + '\n\n' : '') + t('chatError');
  }
  reply.pending = false; chatBusy = false; chatCtl = null; render(); scrollChat();
}
function paintBubble(i) { const el = document.querySelector(`[data-bubble="${i}"]`); if (el) el.textContent = chat[i].text; else render(); scrollChat(); }
function scrollChat() { if (tab === 'ask') { const c = $('#composer'); if (c) window.scrollTo(0, document.body.scrollHeight); } }
// ---------- sheets ----------
const dlg = $('#dlg');
function sheet(title, body, onSave, opts = {}) {
  dlg.innerHTML = `<form><div class="sheet-h"><h3>${esc(title)}</h3><button type="button" class="x" aria-label="${esc(t('close'))}" data-close>&times;</button></div>${body}<div class="err" id="err" role="alert"></div>
  <div class="actions">${opts.del ? `<button type="button" class="btn danger" data-del>${esc(t('delete'))}</button>` : ''}<button class="btn" type="submit">${esc(opts.save || t('save'))}</button></div></form>`;
  const f = dlg.querySelector('form');
  f.querySelector('[data-close]').onclick = () => dlg.close();
  if (opts.del) f.querySelector('[data-del]').onclick = async () => { if (await confirmSheet(t('confirmDeleteTitle'), t('confirmDelete'), t('delete'), true)) { await opts.del(); render(); toast(t('deleted')); } dlg.close(); };
  f.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(f), err = $('#err');
    try { const msg = await onSave(fd); if (msg) { err.textContent = msg; return; } dlg.close(); render(); toast(t('saved')); }
    catch (x) { err.textContent = t('couldNotSave'); console.error(x); }
  };
  if (!dlg.open) dlg.showModal();
  const first = f.querySelector('input:not([type=hidden]),select'); if (first && matchMedia('(pointer:fine)').matches) first.focus();
  if (opts.after) opts.after(f);
}
// Our own "Are you sure?" sheet. The browser's built-in pop-up is blocked in some places (previews, app wrappers).
function confirmSheet(title, msg, okLabel, danger) {
  return new Promise(res => {
    dlg.innerHTML = `<form><div class="sheet-h"><h3>${esc(title)}</h3><button type="button" class="x" aria-label="${esc(t('close'))}" data-close>&times;</button></div><p class="confirm-msg">${esc(msg)}</p>
    <div class="actions"><button type="button" class="btn quiet" data-no>${esc(t('cancel'))}</button><button type="submit" class="btn ${danger ? 'danger' : ''}">${esc(okLabel)}</button></div></form>`;
    const f = dlg.querySelector('form'), no = () => { dlg.close(); res(false); };
    f.querySelector('[data-close]').onclick = no; f.querySelector('[data-no]').onclick = no;
    f.onsubmit = e => { e.preventDefault(); res(true); };
    if (!dlg.open) dlg.showModal();
  });
}
const field = (lbl, name, o = {}) => `<label for="f_${name}">${esc(lbl)}</label><input id="f_${name}" name="${name}" ${o.type ? `type="${o.type}"` : ''} ${o.step ? `step="${o.step}"` : ''} ${o.min != null ? `min="${o.min}"` : ''} value="${esc(o.value ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.req ? 'required' : ''} ${o.mode ? `inputmode="${o.mode}"` : ''} autocomplete="off">${o.help ? `<div class="help">${esc(o.help)}</div>` : ''}`;
// A dropdown whose stored values stay the same in every language.
const select = (lbl, name, values, current, prefix, blank) => `<label for="f_${name}">${esc(lbl)}</label><select id="f_${name}" name="${name}">${blank ? `<option value="">${esc(blank)}</option>` : ''}${values.map(x => `<option value="${esc(x)}" ${x === current ? 'selected' : ''}>${esc(prefix ? label(prefix, x) : x)}</option>`).join('')}</select>`;
const photoField = hasPhoto => `<label for="f_photo">${esc(t(hasPhoto ? 'photoReplace' : 'photoOptional'))}</label><input id="f_photo" name="photo" type="file" accept="image/*" capture="environment"><div id="thumb"></div>`;
async function showThumb(f, id) { try { const b = await getPhoto(id); if (b) { const i = document.createElement('img'); i.className = 'photo-thumb'; i.alt = t('attachedPhoto'); i.src = URL.createObjectURL(b); f.querySelector('#thumb').append(i); } } catch (e) {} }
async function savePhoto(fd, rec) { const file = fd.get('photo'); if (file && file.size) { await putPhoto(rec.id, file); rec.photo = true; } }

// ---------- forms ----------
function vehicleForm(v) {
  const isNew = !v;
  sheet(t(isNew ? 'addVehicleTitle' : 'editVehicleTitle'),
    field(t('vName'), 'name', { value: v?.name, ph: t('vNamePh'), req: true }) +
    `<div class="two"><div>${field(t('plate'), 'plate', { value: v?.plate, ph: 'CAB-1234' })}</div><div>${field(t('year'), 'year', { type: 'number', mode: 'numeric', value: v?.year, ph: '2016' })}</div></div>
     <div class="two"><div>${select(t('type'), 'type', VEHICLE_TYPES, v?.type, 'type_')}</div>
     <div>${select(t('fuel'), 'fuel', FUELS, v?.fuel, 'fuel_')}</div></div>` +
    field(t('odometer'), 'odo', { type: 'number', mode: 'numeric', min: 0, value: v?.odo, req: true }) +
    `<div class="help">${esc(t('exemptHelp'))}</div>`,
    fd => {
      const odo = +fd.get('odo'); if (!(odo >= 0)) return t('errOdo');
      const rec = v || { id: uid(), createdAt: Date.now() };
      Object.assign(rec, { name: fd.get('name').trim(), plate: fd.get('plate').trim().toUpperCase(), year: +fd.get('year') || '', type: fd.get('type'), fuel: fd.get('fuel'), odo });
      if (isNew) { db.vehicles.push(rec); db.active = rec.id; } else rec.updatedAt = Date.now();
      save();
    },
    { save: isNew ? t('addVehicleBtn') : t('save'), del: !isNew && db.vehicles.length > 1 ? () => {
      db.vehicles = db.vehicles.filter(x => x.id !== v.id);
      ['docs', 'fuel', 'service'].forEach(k => { db[k].filter(x => x.vid === v.id && x.photo).forEach(x => delPhoto(x.id)); db[k] = db[k].filter(x => x.vid !== v.id); });
      db.active = db.vehicles[0].id; save();
    } : null });
}

function docForm(d, kind) {
  const v = veh(), isNew = !d;
  kind = d?.kind || kind || 'emission';
  const past = (d?.history || []).map(h => fmtD(h.expiry)).reverse().join(', ');
  sheet(t(isNew ? 'addDocTitle' : 'editDocTitle'),
    `<label for="f_kind">${esc(t('type'))}</label><select id="f_kind" name="kind">${DOC_KINDS.map(k => `<option value="${k}" ${k === kind ? 'selected' : ''}>${esc(kindName(k))}</option>`).join('')}</select>` +
    field(t('docName'), 'title', { value: d?.title, ph: t('docNamePh') }) +
    field(t('expiresOn'), 'expiry', { type: 'date', value: d?.expiry, req: true, help: past ? t('previousExpiries', past) : '' }) +
    field(t('note'), 'note', { value: d?.note, ph: t('docNotePh') }) + photoField(d?.photo),
    async fd => {
      if (!fd.get('expiry')) return t('errExpiry');
      const rec = d || newRecord(v);
      Object.assign(rec, { kind: fd.get('kind'), title: fd.get('title').trim(), expiry: fd.get('expiry'), note: fd.get('note').trim(), updatedAt: Date.now() });
      await savePhoto(fd, rec); if (isNew) db.docs.push(rec); save();
    },
    { del: !isNew && (async () => { db.docs = db.docs.filter(x => x.id !== d.id); if (d.photo) delPhoto(d.id); save(); }), after: f => d?.photo && showThumb(f, d.id) });
}

function renewForm(d) {
  const next = addMonthsISO(d.expiry, 12);
  sheet(t('renewedTitle', docTitle(d)), field(t('newExpiry'), 'expiry', { type: 'date', value: next, req: true, help: t('renewHelp') }),
    fd => {
      if (!fd.get('expiry')) return t('errNewExpiry');
      // Keep the old expiry instead of overwriting it.
      d.history = (d.history || []).concat({ expiry: d.expiry, renewedAt: Date.now() });
      d.expiry = fd.get('expiry'); d.updatedAt = Date.now(); save();
    }, { save: t('saveRenewal') });
}

function fuelForm(r) {
  const v = veh(), isNew = !r;
  sheet(t(isNew ? 'addFuelTitle' : 'editFuelTitle'),
    `<div class="two"><div>${field(t('litres'), 'litres', { type: 'number', step: '0.01', mode: 'decimal', value: r?.litres, req: true })}</div><div>${field(t('totalRs'), 'total', { type: 'number', step: '0.01', mode: 'decimal', value: r?.total, req: true })}</div></div>` +
    field(t('odometer'), 'odo', { type: 'number', mode: 'numeric', value: r?.odo ?? v.odo, req: true }) +
    field(t('date'), 'date', { type: 'date', value: r?.date || todayISO(), req: true }) + photoField(r?.photo) +
    `<div class="help">${esc(t('fuelPhotoHelp'))}</div>`,
    async fd => {
      const litres = +fd.get('litres'), total = +fd.get('total'), odo = +fd.get('odo');
      if (!(litres > 0) || !(total > 0) || !(odo > 0)) return t('errFuel');
      const rec = r || newRecord(v);
      Object.assign(rec, { litres, total, odo, date: fd.get('date') });
      if (!isNew) rec.updatedAt = Date.now();
      await savePhoto(fd, rec); if (isNew) db.fuel.push(rec); v.odo = Math.max(v.odo, odo); save();
    },
    { del: !isNew && (async () => { db.fuel = db.fuel.filter(x => x.id !== r.id); if (r.photo) delPhoto(r.id); save(); }), after: f => r?.photo && showThumb(f, r.id) });
}

function serviceForm(s, kind) {
  const v = veh(), isNew = !s;
  kind = s?.kind || kind || 'Oil change';
  sheet(t(isNew ? 'addServiceTitle' : 'editServiceTitle'),
    select(t('whatDone'), 'kind', SERVICE_KINDS, kind, 'svc_') +
    `<div id="oilbox">${field(t('oilType'), 'oil', { value: s?.oil, ph: t('oilTypePh') })}${select(t('oilFilter'), 'filter', FILTERS, s?.filter, 'filter_', t('notRecorded'))}</div>` +
    `<div class="two"><div>${field(t('odometer'), 'odo', { type: 'number', mode: 'numeric', value: s?.odo ?? v.odo, req: true })}</div><div>${field(t('costRs'), 'cost', { type: 'number', mode: 'decimal', value: s?.cost })}</div></div>` +
    field(t('date'), 'date', { type: 'date', value: s?.date || todayISO(), req: true }) + field(t('garage'), 'garage', { value: s?.garage }) +
    select(t('partsUsed'), 'part', PARTS, s?.part, 'part_', t('notRecorded')) +
    field(t('note'), 'note', { value: s?.note }) + photoField(s?.photo),
    async fd => {
      const odo = +fd.get('odo'); if (!(odo > 0)) return t('errOdo');
      const rec = s || newRecord(v);
      const k = fd.get('kind');
      Object.assign(rec, { kind: k, oil: k === 'Oil change' ? fd.get('oil').trim() : '', filter: k === 'Oil change' ? fd.get('filter') : '', odo, cost: +fd.get('cost') || 0, date: fd.get('date'), garage: fd.get('garage').trim(), part: fd.get('part'), note: fd.get('note').trim() });
      if (!isNew) rec.updatedAt = Date.now();
      await savePhoto(fd, rec); if (isNew) db.service.push(rec); v.odo = Math.max(v.odo, odo); save();
    },
    { del: !isNew && (async () => { db.service = db.service.filter(x => x.id !== s.id); if (s.photo) delPhoto(s.id); save(); }),
      after: f => { const sel = f.querySelector('#f_kind'), box = f.querySelector('#oilbox'); const toggle = () => box.style.display = sel.value === 'Oil change' ? '' : 'none'; sel.onchange = toggle; toggle(); s?.photo && showThumb(f, s.id); } });
}

function odoForm() {
  const v = veh();
  sheet(t('updateOdoTitle'), field(t('odometer'), 'odo', { type: 'number', mode: 'numeric', value: v.odo, req: true, help: t('odoHelp') }),
    fd => { const o = +fd.get('odo'); if (!(o > 0)) return t('errReading'); if (o < v.odo) return t('errLower', n0(v.odo)); v.odo = o; save(); });
}

function switchVehicle() {
  const list = db.vehicles.map(x => `<li><button type="button" class="row" data-v="${x.id}"><span class="l"><span class="t">${esc(x.name)}</span><br><span class="d">${esc(x.plate || label('type_', x.type))}</span></span><span class="r ok">${x.id === veh().id ? esc(t('selected')) : ''}</span></button></li>`).join('');
  dlg.innerHTML = `<form method="dialog"><div class="sheet-h"><h3>${esc(t('yourVehicles'))}</h3><button type="button" class="x" aria-label="${esc(t('close'))}" data-close>&times;</button></div><ul class="rows">${list}</ul>
  <div class="actions"><button type="button" class="btn quiet" data-edit>${esc(t('editThisVehicle'))}</button><button type="button" class="btn" data-add>${esc(t('addAVehicle'))}</button></div></form>`;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  dlg.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { db.active = b.dataset.v; save(); dlg.close(); render(); });
  dlg.querySelector('[data-edit]').onclick = () => vehicleForm(veh());
  dlg.querySelector('[data-add]').onclick = () => vehicleForm(null);
  if (!dlg.open) dlg.showModal();
}


// A sample vehicle with about three years of records, so people can see how CarBook works. They can delete it later.
function addExample() {
  const day = n => addDaysISO(todayISO(), n);
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const v = { id: uid(), createdAt: Date.now(), name: t('exampleName'), plate: 'CAB-1234', year: 2016, type: 'Car', fuel: 'Petrol', odo: 52480 };
  db.vehicles.push(v); db.active = v.id;
  [['emission', 12, ''], ['insurance', 64, ''], ['revenue', 140, ''], ['driving', 610, ''], ['warranty', 150, t('exampleBatteryWarranty')], ['warranty', 290, t('exampleTyreWarranty')]]
    .forEach(([kind, n, title]) => db.docs.push({ ...newRecord(v), kind, title, expiry: day(n), note: '' }));
  // Fill-ups every 12 to 16 days going back about three years. Example prices only, drifting down over time.
  const fills = []; let d = -6, odo = 51900;
  while (d > -1100) {
    const litres = +(24 + rnd() * 8).toFixed(1), price = 296 + Math.max(0, -d - 120) * 0.055 + (rnd() - 0.5) * 8;
    fills.push({ ...newRecord(v), litres, total: Math.round(litres * price), odo, date: day(d) });
    const gap = 12 + Math.round(rnd() * 4); d -= gap; odo -= Math.round(litres * (12.4 + rnd() * 1.6));
  }
  db.fuel.push(...fills);
  const svc = (kind, n, odo, cost, extra = {}) => db.service.push({ ...newRecord(v), kind, oil: '', filter: '', odo, cost, date: day(n), garage: t('exampleGarage'), part: 'Genuine', note: '', ...extra });
  const oil = { oil: '10W-40 semi-synthetic', filter: 'Changed' };
  svc('Oil change', -150, 48200, 14500, oil); svc('Oil change', -330, 43300, 13800, oil); svc('Oil change', -520, 38500, 13200, oil); svc('Oil change', -710, 33600, 12900, oil);
  svc('Battery', -1240, 31000, 28000, { part: 'Aftermarket', garage: '' });
  svc('Brake pads', -560, 37200, 11500);
  svc('Tyres', -640, 35100, 76000);
  svc('Spark plugs', -980, 24800, 6400);
  svc('Wheel alignment', -300, 43700, 3500, { part: '' });
  save();
}

// ---------- items: one list of everything to keep on track ----------
const KIND_INFO = { 'Oil change': 'oil', 'Battery': 'battery', 'Brake pads': 'brakes', 'Tyres': 'tyres', 'Spark plugs': 'plugs', 'Wheel alignment': 'alignment' };
const KIND_ICON = { emission: 'smoke', insurance: 'shield', revenue: 'disc', driving: 'idcard', other: 'doc', warranty: 'ribbon', 'Oil change': 'oil', 'Battery': 'battery', 'Brake pads': 'brake', 'Tyres': 'tyre', 'Spark plugs': 'plug', 'Wheel alignment': 'align' };
const iconOf = x => svg(ICONS[KIND_ICON[x.kind] || 'doc']);
const maintKinds = v => ['Oil change', 'Tyres', 'Wheel alignment', 'Battery', 'Brake pads', 'Spark plugs'].filter(k => !(k === 'Oil change' && v.fuel === 'Electric') && !(k === 'Spark plugs' && (v.fuel === 'Electric' || v.fuel === 'Diesel')));

// Reminders plus a "no record yet" item for any maintenance part with no history.
function allItems(v) {
  const R = reminders(v);
  maintKinds(v).forEach(k => { if (!R.some(x => x.kind === k)) R.push({ key: 'none-' + k, cat: 'service', title: label('svc_', k), sub: '', date: null, days: null, kmLeft: null, s: 'none', act: 'addService', kind: k }); });
  return R;
}
const findItem = (v, key) => allItems(v).find(x => x.key === key);

// A short plain status line, e.g. "In 12 days" or "720 km to go".
function whenText(x) {
  if (x.s === 'none') return t('noRecordYet');
  if (x.checkNow) return t('askAtService');
  const kmFirst = x.kmLeft != null && (x.byKm || x.days == null || x.kmLeft <= 1500);
  if (kmFirst) return x.kmLeft <= 0 ? t('overByKmShort', n0(-x.kmLeft)) : t('kmToGo', n0(x.kmLeft));
  if (x.days < 0) return t('overByDaysShort', -x.days);
  if (x.days === 0) return t('dueToday');
  return t('inTime', x.days < 60 ? t('days', x.days) : t('months', Math.round(x.days / 30)));
}
const TAG = { bad: 'tagNow', warn: 'tagSoon', ok: 'tagOk', none: 'tagAdd' };
const tag = s => `<span class="tag ${s}">${esc(t(TAG[s]))}</span>`;

function itemRow(x, extra = '') {
  return `<li><button class="item" data-act="detail" data-key="${esc(x.key)}">
    <span class="ic ${x.s}">${iconOf(x)}</span>
    <span class="it"><span class="t">${esc(x.title)}</span><span class="s">${esc(extra || whenText(x))}</span></span>
    ${tag(x.s)}<span class="chev">${svg(ICONS.chev)}</span></button></li>`;
}

// ---------- views ----------
function header(v) {
  const h = new Date().getHours(), hi = t(h < 12 ? 'hiMorning' : h < 17 ? 'hiAfternoon' : 'hiEvening');
  return `<header class="top"><button class="vehicle-btn" data-act="switch" aria-label="${esc(t('switchVehicle'))}"><span class="hello">${esc(hi)}</span><span class="vname">${esc(v.name)}<span class="vchev">${svg('<path d="M7 10l5 5 5-5"/>')}</span></span></button></header>`;
}

// Shown only once a second language has a translation started in strings.js.
function langPicker() {
  const ls = languages(); if (ls.length < 2) return '';
  return `<h2>${esc(t('language'))}</h2><div class="actions" style="margin-top:0">${ls.map(l => `<button class="btn ${l === lang ? '' : 'quiet'}" data-act="lang" data-lang="${l}" lang="${l}" ${l === lang ? 'aria-pressed="true"' : ''}>${esc(STRINGS[l].langName)}</button>`).join('')}</div>`;
}

function viewOnboard() {
  return `<div class="welcome"><div class="badge">${svg(ICONS.car)}</div>
  <h1>${esc(t('appName'))}</h1>
  <p class="tag-line">${esc(t('tagline'))}</p>
  <div class="go"><button class="btn wide" data-act="addVehicle">${esc(t('addYourVehicle'))}</button>
  <button class="btn quiet wide" data-act="example">${esc(t('tryExample'))}</button></div>
  <p class="small mut">${esc(t('onDevice'))}</p>${langPicker()}</div>`;
}

function viewHome(v) {
  const R = allItems(v), active = R.filter(x => x.s !== 'none'), missing = R.filter(x => x.s === 'none');
  const hero = active[0], next = active.slice(1, 8);
  const now = new Date(todayISO() + 'T00:00'), mStart = isoOf(new Date(now.getFullYear(), now.getMonth(), 1));
  const month = fuelStats(v, mStart, addDaysISO(todayISO(), 1));
  const worst = list => list.some(x => x.s === 'bad') ? 'bad' : list.some(x => x.s === 'warn') ? 'warn' : 'ok';
  const papers = active.filter(x => x.cat !== 'service'), maint = active.filter(x => x.cat === 'service');
  let heroHtml;
  if (!hero) heroHtml = `<section class="hero setup"><div class="hero-art">${svg(ICONS.car)}</div><div class="hero-txt"><p class="hero-label">${esc(t('heroSetupLabel'))}</p><p class="hero-title">${esc(t('heroSetupTitle'))}</p></div><button class="hero-btn" data-act="add">${esc(t('heroSetupBtn'))}</button></section>`;
  else {
    const val = valueOf(hero);
    heroHtml = `<section class="hero ${hero.s}">
      <p class="hero-label">${esc(t(hero.s === 'bad' ? 'heroNow' : hero.s === 'warn' ? 'heroSoon' : 'heroNext'))}</p>
      <div class="hero-row"><div class="hero-art">${iconOf(hero)}</div>
        <div class="hero-txt"><p class="hero-title">${esc(hero.title)}</p><p class="hero-val">${esc(val.big)}${val.unit ? `<small>${esc(val.unit)}</small>` : ''}</p>${val.small ? `<p class="hero-when">${esc(val.small)}${hero.est ? ' · ' + esc(t('estimated')) : ''}</p>` : ''}</div></div>
      <button class="hero-btn" data-act="detail" data-key="${esc(hero.key)}">${esc(t('heroWhatToDo'))}</button></section>`;
  }
  const card = x => { const val = valueOf(x); return `<button class="mini ${x.s}" data-act="detail" data-key="${esc(x.key)}"><span class="mini-ic">${iconOf(x)}</span><span class="mini-t">${esc(x.title)}</span><span class="mini-v">${esc(val.big)}${val.unit ? ` <small>${esc(val.unit)}</small>` : ''}</span>${tag(x.s)}</button>`; };
  const tile = (icon, label, value, extra, attrs) => `<button class="glance" ${attrs}><span class="g-ic">${svg(ICONS[icon])}</span><span class="g-v">${value}</span><span class="g-l">${esc(label)}</span>${extra || ''}</button>`;
  return `${header(v)}
  ${heroHtml}
  ${next.length ? `<div class="sec-h"><h2>${esc(t('comingUp'))}</h2><button class="link-btn" data-tab="car">${esc(t('seeAll'))}</button></div><div class="cards" role="list">${next.map(card).join('')}</div>` : ''}
  ${missing.length ? `<button class="setup-card" data-tab="car"><span class="setup-icons">${missing.slice(0, 4).map(x => `<span>${iconOf(x)}</span>`).join('')}</span><span class="it"><span class="t">${esc(t('finishSetup'))}</span><span class="s">${esc(t('finishSetupCount', missing.length))}</span></span><span class="chev">${svg(ICONS.chev)}</span></button>` : ''}
  <h2>${esc(t('atAGlance'))}</h2>
  <div class="glances">
    ${tile('doc', t('papers'), esc(String(papers.length)), tag(worst(papers)), 'data-tab="car"')}
    ${tile('wrench', t('maintenance'), esc(String(maint.length)), tag(worst(maint)), 'data-tab="car"')}
    ${tile('fuel', t('fuelThisMonth'), esc(t('rs', n0(month.spent))), '', 'data-tab="money"')}
    ${tile('gauge', t('odometerShort'), `${n0(v.odo)}<small> ${esc(t('km'))}</small>`, '', 'data-act="odo"')}
  </div>`;
}

function viewCar(v) {
  const R = allItems(v), papers = R.filter(x => x.cat !== 'service').sort((a, b) => (a.days ?? -1e9) - (b.days ?? -1e9)), maint = maintKinds(v).map(k => R.filter(x => x.kind === k).sort((a, b) => ({ bad: 0, warn: 1, ok: 2, none: 3 })[a.s] - ({ bad: 0, warn: 1, ok: 2, none: 3 })[b.s])[0]).filter(Boolean);
  const nSvc = mine(db.service, v).length, nFuel = mine(db.fuel, v).length;
  return `${header(v)}
  <section class="car-card">
    <div class="car-ic">${svg(ICONS.car)}</div>
    <div class="car-main"><p class="car-name">${esc(v.name)}</p><p class="car-sub">${esc([v.plate, v.year, v.fuel && label('fuel_', v.fuel)].filter(Boolean).join(' · '))}</p></div>
    <button class="link-btn" data-act="editVehicle">${esc(t('edit'))}</button>
  </section>
  <h2>${esc(t('papers'))}</h2>
  <ul class="list">${papers.map(x => itemRow(x)).join('')}</ul>
  <button class="link-btn" data-act="addDoc">${svg(ICONS.plus)}${esc(t('addADocument'))}</button>
  <h2>${esc(t('maintenance'))}</h2>
  <ul class="list">${maint.map(x => itemRow(x)).join('')}</ul>
  <h2>${esc(t('records'))}</h2>
  <ul class="list">
    <li><button class="item" data-act="serviceList"><span class="ic plain">${svg(ICONS.wrench)}</span><span class="it"><span class="t">${esc(t('serviceHistory'))}</span><span class="s">${esc(t('nRecords', nSvc))}</span></span><span class="chev">${svg(ICONS.chev)}</span></button></li>
    <li><button class="item" data-tab="money"><span class="ic plain">${svg(ICONS.fuel)}</span><span class="it"><span class="t">${esc(t('fuelHistory'))}</span><span class="s">${esc(t('nFillups', nFuel))}</span></span><span class="chev">${svg(ICONS.chev)}</span></button></li>
    <li><button class="item" data-act="odo"><span class="ic plain">${svg(ICONS.gauge)}</span><span class="it"><span class="t">${esc(t('odometerShort'))}</span><span class="s">${n0(v.odo)} ${esc(t('km'))}</span></span><span class="chev">${svg(ICONS.chev)}</span></button></li>
  </ul>
  <h2>${esc(t('settings'))}</h2>
  <ul class="list">
    <li><button class="item" data-act="export"><span class="ic plain">${svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}</span><span class="it"><span class="t">${esc(t('export'))}</span><span class="s">${esc(t('dataNote'))}</span></span></button></li>
    <li><button class="item" data-act="import"><span class="ic plain">${svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>')}</span><span class="it"><span class="t">${esc(t('import'))}</span></span></button></li>
    <li><a class="item" href="privacy.html"><span class="ic plain">${svg(ICONS.shield)}</span><span class="it"><span class="t">${esc(t('privacyPolicy'))}</span></span><span class="chev">${svg(ICONS.chev)}</span></a></li>
  </ul>
  ${langPicker()}
  <input type="file" id="imp" accept="application/json" hidden>`;
}

// Change vs the previous period, as a small note. goodWhenUp: is a rise good news?
function delta(cur, prev, goodWhenUp, per) {
  if (cur == null || !prev) return `<span class="cmp">${esc(t('noPrevious'))}</span>`;
  const pct = (cur - prev) / prev * 100, r = Math.round(pct);
  if (Math.abs(pct) < 1) return `<span class="cmp">${esc(t('sameAsBefore', t('prev_' + per)))}</span>`;
  const good = (pct > 0) === goodWhenUp;
  return `<span class="cmp"><span class="chg ${good ? 'up' : 'down'}">${pct > 0 ? '↑' : '↓'} ${Math.abs(r)}%</span> ${esc(t('vsPrev', t('prev_' + per)))}</span>`;
}

function viewMoney(v) {
  const rows = fuelRows(v).reverse();
  const yearAgo = addDaysISO(todayISO(), -365), svcSpent = mine(db.service, v).filter(s => s.date >= yearAgo).reduce((s, x) => s + (x.cost || 0), 0);
  if (!rows.length) return `${header(v)}<div class="empty"><b>${esc(t('noFuelTitle'))}</b>${esc(t('noFuelText'))}</div><div class="actions"><button class="btn wide" data-act="addFuel">${esc(t('addFuelTitle'))}</button></div>`;
  const d = periodData(v, period), c = d.cur, p = d.prev;
  return `${header(v)}
  <div class="seg" role="group" aria-label="${esc(t('periodLabel'))}">${PERIODS.map(k => `<button data-act="period" data-p="${k}" ${k === period ? 'aria-pressed="true"' : ''}>${esc(t('p_' + k))}</button>`).join('')}</div>
  <section class="hero-num"><p class="l">${esc(t('spentIn', t('per_' + period)))}</p><p class="n">${esc(t('rs', n0(c.spent)))}</p>${delta(c.spent, p.spent, false, period)}</section>
  <div class="stats three">
    <div class="stat"><span class="n">${c.price ? esc(t('rs', n0(c.price))) : '–'}</span><span class="l">${esc(t('perLitre'))}</span></div>
    <div class="stat"><span class="n">${c.kpl ? n1(c.kpl) : '–'}</span><span class="l">${esc(t('kplUnit'))}</span></div>
    <div class="stat"><span class="n">${n0(c.litres)}</span><span class="l">${esc(t('litresWord'))}</span></div>
  </div>
  <section class="chart-card">
    <div class="readout" id="readout" aria-live="polite"></div>
    <p class="chart-h">${esc(t('chartSpent'))}</p><div class="chart" id="ch-spent"></div>
    <p class="chart-h">${esc(t('chartPrice'))}</p><div class="chart" id="ch-price"></div>
    <details class="tbl"><summary>${esc(t('seeNumbers'))}</summary><div class="tbl-wrap"><table><thead><tr><th>${esc(t('colPeriod'))}</th><th>${esc(t('colSpent'))}</th><th>${esc(t('colPrice'))}</th><th>${esc(t('colFills'))}</th></tr></thead>
      <tbody>${d.bs.slice().reverse().map(b => `<tr><td>${esc(b.label)}</td><td>${b.fills ? esc(t('rs', n0(b.spent))) : '–'}</td><td>${b.price ? esc(t('rs', n1(b.price))) : '–'}</td><td>${b.fills}</td></tr>`).join('')}</tbody></table></div></details>
  </section>
  <div class="stats one"><div class="stat"><span class="n">${esc(t('rs', n0(svcSpent)))}</span><span class="l">${esc(t('svcSpent12'))}</span></div></div>
  <h2>${esc(t('fillUps'))}</h2>
  <ul class="list">${rows.slice(0, 20).map(x => `<li><button class="item" data-act="fuelDetail" data-id="${x.id}"><span class="ic plain">${svg(ICONS.fuel)}</span><span class="it"><span class="t">${esc(t('rs', n0(x.total)))}</span><span class="s">${fmtD(x.date)}</span></span><span class="side">${x.kpl ? esc(t('kpl', n1(x.kpl))) : ''}</span><span class="chev">${svg(ICONS.chev)}</span></button></li>`).join('')}</ul>
  ${rows.length > 20 ? `<p class="hint">${esc(t('showingRecent', 20, rows.length))}</p>` : ''}
  <p class="hint">${esc(t('fillAssumption'))}</p>`;
}

// ---------- charts (hand-drawn SVG, works offline) ----------
const compact = n => n >= 1e6 ? n1(n / 1e6) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n0(n);
function niceMax(m) { if (!(m > 0)) return 1; const p = 10 ** Math.floor(Math.log10(m)), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function drawFuelCharts(v) {
  const sp = $('#ch-spent'), pr = $('#ch-price'); if (!sp || !pr) return;
  const d = periodData(v, period), bs = d.bs, n = bs.length;
  if (fsel == null || fsel >= n) fsel = n - 1;
  const W = Math.max(260, sp.clientWidth), H = 140, L = 44, Rr = 8, T = 10, B = 26, iw = W - L - Rr, ih = H - T - B, slot = iw / n;
  const every = Math.ceil(n / Math.max(3, Math.floor(iw / 52)));
  const xLabels = bs.map((b, i) => (i % every === (n - 1) % every) ? `<text class="ax" x="${L + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(b.label)}</text>` : '').join('');
  const hits = bs.map((b, i) => `<rect class="hit" data-i="${i}" x="${L + slot * i}" y="${T}" width="${slot}" height="${ih}" tabindex="0" aria-label="${esc(b.label)}"></rect>`).join('');
  const sMax = niceMax(Math.max(...bs.map(b => b.spent)));
  const yS = val => T + ih - val / sMax * ih, bw = Math.min(24, Math.max(3, slot - 2));
  const grid = (max, fmt) => [0, 0.5, 1].map(f => `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${T + ih - f * ih}" y2="${T + ih - f * ih}"></line><text class="ax" x="${L - 6}" y="${T + ih - f * ih + 4}" text-anchor="end">${esc(fmt(max * f))}</text>`).join('');
  const bars = bs.map((b, i) => { if (!b.spent) return ''; const x = L + slot * i + (slot - bw) / 2, y = yS(b.spent), h = T + ih - y, r = Math.min(4, bw / 2, h);
    return `<path class="bar ${i === fsel ? 'sel' : ''}" data-b="${i}" d="M${x} ${T + ih}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${T + ih}Z"></path>`; }).join('');
  sp.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chartSpent'))}">${grid(sMax, compact)}${bars}${xLabels}${hits}</svg>`;
  const ps = bs.map(b => b.price).filter(Boolean);
  if (!ps.length) pr.innerHTML = `<p class="hint">${esc(t('noFuelInPeriod'))}</p>`;
  else {
    let lo = Math.min(...ps), hi = Math.max(...ps); const pad = Math.max(5, (hi - lo) * 0.25); lo = Math.max(0, Math.floor((lo - pad) / 10) * 10); hi = Math.ceil((hi + pad) / 10) * 10;
    const yP = val => T + ih - (val - lo) / (hi - lo) * ih;
    let path = '', pen = false;
    bs.forEach((b, i) => { if (!b.price) { pen = false; return; } path += `${pen ? 'L' : 'M'}${L + slot * i + slot / 2} ${yP(b.price)}`; pen = true; });
    const pgrid = [0, 0.5, 1].map(f => { const val = lo + (hi - lo) * f; return `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${yP(val)}" y2="${yP(val)}"></line><text class="ax" x="${L - 6}" y="${yP(val) + 4}" text-anchor="end">${esc(n0(val))}</text>`; }).join('');
    const dots = bs.map((b, i) => b.price ? `<circle class="pt ${i === fsel ? 'sel' : ''}" data-b="${i}" cx="${L + slot * i + slot / 2}" cy="${yP(b.price)}" r="${i === fsel ? 5 : (n > 24 ? 0 : 3.5)}"></circle>` : '').join('');
    pr.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chartPrice'))}">${pgrid}<line class="cross" id="cross" x1="0" x2="0" y1="${T}" y2="${T + ih}"></line><path class="line" d="${path}"></path>${dots}${xLabels}${hits}</svg>`;
  }
  const select = i => {
    fsel = i; const b = bs[i];
    $('#readout').innerHTML = `<b>${esc(b.label)}</b><span>${esc(b.fills ? t('rs', n0(b.spent)) : t('noFills'))}</span>${b.price ? `<span>${esc(t('perLitreVal', n1(b.price)))}</span>` : ''}<span class="mut">${esc(t('fillsCount', b.fills))}</span>`;
    document.querySelectorAll('#ch-spent .bar, #ch-price .pt').forEach(el => { const on = +el.dataset.b === i; el.classList.toggle('sel', on); if (el.tagName === 'circle') el.setAttribute('r', on ? 5 : (n > 24 ? 0 : 3.5)); });
    const cr = $('#cross'); if (cr) { const x = L + slot * i + slot / 2; cr.setAttribute('x1', x); cr.setAttribute('x2', x); }
  };
  document.querySelectorAll('.chart .hit').forEach(h => { const i = +h.dataset.i; h.addEventListener('pointerenter', () => select(i)); h.addEventListener('click', () => select(i)); h.addEventListener('focus', () => select(i)); });
  select(fsel);
}

function viewAsk(v) {
  const sugg = [['sugNext', 'gauge'], ['sugSpend', 'fuel'], ['sugOil', 'oil'], ['sugPrice', 'money']];
  const bubble = (m, i) => m.role === 'user'
    ? `<div class="msg me"><div class="bubble"><span data-bubble="${i}">${esc(m.text)}</span></div></div>`
    : `<div class="msg bot"><span class="avatar">${svg(ICONS.bot)}</span><div class="bubble">${m.list
        ? `<p>${esc(t('mechIntro'))}</p><ol class="qlist">${m.list.map(q => `<li>${esc(q[0])}</li>`).join('')}</ol><button class="bubble-btn" data-act="mechSheet">${esc(t('showMechanic'))}</button>`
        : `<span data-bubble="${i}">${m.pending ? `<span class="typing"><i></i><i></i><i></i></span>` : esc(m.text)}</span>`}
      ${!m.pending ? `<span class="src">${esc(t(m.src === 'ai' ? 'srcAI' : 'srcLocal'))}</span>` : ''}</div></div>`;
  return `<section class="chat-screen">
    <header class="chat-head"><span class="avatar big">${svg(ICONS.bot)}</span><div><p class="chat-name">${esc(t('assistantName'))}</p><p class="chat-sub"><i class="dot-on"></i>${esc(t(aiSample ? 'assistantSubAI' : 'assistantSubLocal'))}</p></div>
      ${chat.length ? `<button class="link-btn" data-act="clearchat">${esc(t('newChat'))}</button>` : ''}</header>
    <div class="chatlog" id="chatlog" aria-live="polite">
      ${chat.length ? '' : `<div class="ask-hero"><span class="avatar huge">${svg(ICONS.bot)}</span><p class="ask-hero-t">${esc(t('askHeroTitle'))}</p><p class="ask-hero-s">${esc(t('askHeroSub'))}</p></div>`}
      <div class="msg bot"><span class="avatar">${svg(ICONS.bot)}</span><div class="bubble">${esc(t('chatHello', v.name))}</div></div>
      ${chat.map(bubble).join('')}
    </div>
    <div class="composer-wrap">
      <div class="chips" role="list">${chat.length ? '' : sugg.map(([k, ic]) => `<button class="chipbtn" data-act="suggest" data-q="${esc(t(k))}">${svg(ICONS[ic])}${esc(t(k))}</button>`).join('')}<button class="chipbtn" data-act="mechQs">${svg(ICONS.wrench)}${esc(t('sugMechanic'))}</button></div>
      <form class="composer" id="composer"><label class="sr" for="chatin">${esc(t('chatPlaceholder'))}</label>
        <input id="chatin" name="q" autocomplete="off" placeholder="${esc(t('chatPlaceholder'))}" ${chatBusy ? 'disabled' : ''}>
        ${chatBusy && aiSample ? `<button type="button" class="send stop" data-act="stopchat" aria-label="${esc(t('stop'))}"><span class="sq"></span></button>` : `<button class="send" type="submit" aria-label="${esc(t('send'))}" ${chatBusy ? 'disabled' : ''}>${svg(ICONS.send)}</button>`}</form>
      <p class="chat-note">${esc(t('chatNote'))}</p>
    </div>
  </section>`;
}

// The mechanic questions, shown large so the owner can hand the phone over.
function mechSheet() {
  const qs = questions(veh());
  infoSheet(t('mechSheetTitle'), `<div class="mech">${qs.map(q => `<div class="q"><p>${esc(q[0])}</p><p class="basis">${esc(t('basedOn', q[1]))}</p></div>`).join('')}</div><p class="hint" style="margin-top:12px">${esc(t('askDisclaimer'))}</p>`);
}

// ---------- detail sheets ----------
function infoSheet(title, body, actions = '') {
  dlg.innerHTML = `<div class="sheet"><div class="sheet-h"><h3>${esc(title)}</h3><button type="button" class="x" aria-label="${esc(t('close'))}" data-close>&times;</button></div>${body}${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
  dlg.querySelector('[data-close]').onclick = () => dlg.close();
  if (!dlg.open) dlg.showModal();
}
const facts = rows => `<dl class="facts">${rows.filter(r => r && r[1] !== '' && r[1] != null).map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl>`;

// Everything about one item: status, plain explanation, facts, history, one clear next step.
function itemDetail(key) {
  const v = veh(), x = findItem(v, key); if (!x) return;
  const info = KIND_INFO[x.kind] || x.kind, val = valueOf(x);
  const head = `<div class="d-status ${x.s}"><div class="d-art">${iconOf(x)}</div><div class="d-txt">${tag(x.s)}<p class="d-big">${esc(x.s === 'none' ? t('noRecordYet') : val.big)}${val.unit && x.s !== 'none' ? `<small>${esc(val.unit)}</small>` : ''}</p>${x.s !== 'none' && val.small ? `<p class="d-small">${esc(val.small)}${x.est ? ' · ' + esc(t('estimated')) : ''}</p>` : ''}</div></div>`;
  const explain = `<div class="explain"><h4>${esc(t('whatIsIt'))}</h4><p>${esc(t('about_' + info))}</p><h4>${esc(t('whatToDo'))}</h4><p>${esc(t('todo_' + info))}</p></div>`;
  let body = '', actions = '';
  if (x.cat !== 'service') {
    const d = db.docs.find(r => r.id === x.id);
    if (d) {
      body = facts([[t('expiresOn'), fmtD(d.expiry)], [t('noteLabel'), d.note], [t('earlierExpiryLabel'), (d.history || []).map(h => fmtD(h.expiry)).reverse().join(', ')]]);
      const renewable = ['emission', 'insurance', 'revenue', 'driving'].includes(d.kind);
      actions = `<button class="btn quiet" data-act="doc" data-id="${d.id}">${esc(t('edit'))}</button>${renewable ? `<button class="btn" data-act="renew" data-id="${d.id}">${esc(t('markRenewedShort'))}</button>` : ''}`;
    } else actions = `<button class="btn wide" data-act="addDoc" data-kind="${esc(x.kind)}">${esc(t('addThis', x.title))}</button>`;
  } else {
    const hist = mine(db.service, v).filter(s => s.kind === x.kind).sort((a, b) => b.date.localeCompare(a.date)), last = hist[0];
    if (last) body = `<h4 class="sub-h">${esc(t('lastTime'))}</h4>` + facts([[t('date'), fmtD(last.date)], [t('odometer'), n0(last.odo) + ' ' + t('km')], [t('costLabel'), last.cost ? t('rs', n0(last.cost)) : ''], [t('garage'), last.garage], [t('oilType'), last.oil], [t('oilFilter'), last.filter && label('filter_', last.filter)], [t('partsUsed'), last.part && label('part_', last.part)]]);
    if (hist.length > 1) body += `<h4 class="sub-h">${esc(t('earlierTimes'))}</h4><ul class="list mini">${hist.slice(1).map(s => `<li><button class="item" data-act="svcDetail" data-id="${s.id}"><span class="it"><span class="t">${fmtD(s.date)}</span><span class="s">${n0(s.odo)} ${esc(t('km'))}</span></span><span class="side">${s.cost ? esc(t('rs', n0(s.cost))) : ''}</span><span class="chev">${svg(ICONS.chev)}</span></button></li>`).join('')}</ul>`;
    actions = `${last ? `<button class="btn quiet" data-act="service" data-id="${last.id}">${esc(t('editLast'))}</button>` : ''}<button class="btn" data-act="addService" data-kind="${esc(x.kind)}">${esc(t(last ? 'logDone' : 'addLast'))}</button>`;
  }
  infoSheet(x.title, head + explain + body, actions);
}

function serviceDetail(id) {
  const s = db.service.find(r => r.id === id); if (!s) return;
  infoSheet(label('svc_', s.kind), facts([[t('date'), fmtD(s.date)], [t('odometer'), n0(s.odo) + ' ' + t('km')], [t('costLabel'), s.cost ? t('rs', n0(s.cost)) : ''], [t('garage'), s.garage], [t('oilType'), s.oil], [t('oilFilter'), s.filter && label('filter_', s.filter)], [t('partsUsed'), s.part && label('part_', s.part)], [t('noteLabel'), s.note], [t('photo'), s.photo ? t('attached') : '']]),
    `<button class="btn wide" data-act="service" data-id="${s.id}">${esc(t('edit'))}</button>`);
}

function fuelDetail(id) {
  const v = veh(), r = fuelRows(v).find(x => x.id === id); if (!r) return;
  infoSheet(t('fillUpOn', fmtD(r.date)), facts([[t('totalRs'), t('rs', n0(r.total))], [t('litres'), r.litres + ' ' + t('litreUnit')], [t('pricePerLitre'), t('rs', n1(r.total / r.litres))], [t('odometer'), n0(r.odo) + ' ' + t('km')], [t('kplUnit'), r.kpl ? n1(r.kpl) : t('firstEntry')], [t('photo'), r.photo ? t('attached') : '']]),
    `<button class="btn wide" data-act="fuel" data-id="${r.id}">${esc(t('edit'))}</button>`);
}

function serviceList() {
  const v = veh(), rows = mine(db.service, v).sort((a, b) => b.date.localeCompare(a.date));
  infoSheet(t('serviceHistory'), rows.length ? `<ul class="list mini">${rows.map(s => `<li><button class="item" data-act="svcDetail" data-id="${s.id}"><span class="it"><span class="t">${esc(label('svc_', s.kind))}</span><span class="s">${fmtD(s.date)}</span></span><span class="side">${s.cost ? esc(t('rs', n0(s.cost))) : ''}</span><span class="chev">${svg(ICONS.chev)}</span></button></li>`).join('')}</ul>` : `<p class="hint">${esc(t('noServiceText'))}</p>`,
    `<button class="btn wide" data-act="addService">${esc(t('addServiceTitle'))}</button>`);
}

function addMenu() {
  const opt = (act, icon, k, s) => `<li><button class="item" data-act="${act}"><span class="ic plain">${svg(ICONS[icon])}</span><span class="it"><span class="t">${esc(t(k))}</span><span class="s">${esc(t(s))}</span></span><span class="chev">${svg(ICONS.chev)}</span></button></li>`;
  infoSheet(t('addWhat'), `<ul class="list">${opt('addFuel', 'fuel', 'addFuelTitle', 'addFuelSub')}${opt('addService', 'wrench', 'addServiceTitle', 'addServiceSub')}${opt('addDoc', 'doc', 'addADocument', 'addDocSub')}${opt('odo', 'gauge', 'updateOdoTitle', 'addOdoSub')}</ul>`);
}

function render() {
  const v = veh(), main = $('#view'), tabs = $('#tabs'), fab = $('#fab');
  tabs.setAttribute('aria-label', t('mainNav'));
  if (!v) { main.innerHTML = viewOnboard(); tabs.innerHTML = ''; fab.hidden = true; return; }
  const keep = $('#chatin')?.value || '';
  main.innerHTML = { home: viewHome, car: viewCar, money: viewMoney, ask: viewAsk }[tab](v);
  tabs.innerHTML = `<div class="in">${TABS.map(([k, l]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ''}>${svg(ICONS[k])}<span>${esc(t(l))}</span></button>`).join('')}</div>`;
  fab.hidden = tab === 'ask'; fab.setAttribute('aria-label', t('addWhat')); fab.innerHTML = svg(ICONS.plus);
  if (tab === 'money') drawFuelCharts(v);
  if (tab === 'ask') { const inp = $('#chatin'); if (inp && keep && !chatBusy) inp.value = keep; $('#composer').onsubmit = e => { e.preventDefault(); const q = $('#chatin').value; $('#chatin').value = ''; sendChat(q); }; scrollChat(); }
}

// ---------- events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-tab],[data-act]'); if (!el) return;
  if (el.dataset.tab) { if (dlg.open) dlg.close(); tab = el.dataset.tab; window.scrollTo(0, 0); return render(); }
  const id = el.dataset.id, v = veh();
  switch (el.dataset.act) {
    case 'addVehicle': return vehicleForm(null);
    case 'editVehicle': return vehicleForm(v);
    case 'switch': return switchVehicle();
    case 'example': addExample(); return render();
    case 'add': return addMenu();
    case 'detail': return itemDetail(el.dataset.key);
    case 'svcDetail': return serviceDetail(id);
    case 'fuelDetail': return fuelDetail(id);
    case 'serviceList': return serviceList();
    case 'toggleYear': showYear = !showYear; return render();
    case 'odo': return odoForm();
    case 'addDoc': return docForm(null, el.dataset.kind);
    case 'doc': return docForm(db.docs.find(x => x.id === id));
    case 'renew': return renewForm(db.docs.find(x => x.id === id));
    case 'addFuel': return fuelForm(null);
    case 'fuel': return fuelForm(db.fuel.find(x => x.id === id));
    case 'addService': return serviceForm(null, el.dataset.kind);
    case 'service': return serviceForm(db.service.find(x => x.id === id));
    case 'period': period = el.dataset.p; fsel = null; return render();
    case 'suggest': return sendChat(el.dataset.q);
    case 'stopchat': return chatCtl?.abort();
    case 'clearchat': chat = []; return render();
    case 'ask': asked = questions(v); mech = false; return render();
    case 'mech': mech = !mech; return render();
    case 'mechQs': { const qs = questions(v); chat.push({ role: 'user', text: t('sugMechanic') }, { role: 'assistant', text: t('mechIntro') + '\n' + qs.map(q => '• ' + q[0]).join('\n'), list: qs, src: 'local' }); render(); return scrollChat(); }
    case 'mechSheet': return mechSheet();
    case 'lang': setLang(el.dataset.lang); if (asked) asked = questions(v); return render();
    case 'export': {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
      a.download = 'carbook-' + todayISO() + '.json'; a.click(); return toast(t('exported'));
    }
    case 'import': { const i = $('#imp'); i.onchange = async () => { try { const d = JSON.parse(await i.files[0].text()); if (d.v !== 1 || !Array.isArray(d.vehicles)) throw 0; const ok = await confirmSheet(t('confirmImportTitle'), t('confirmImport'), t('replace')); dlg.close(); if (!ok) return; db = upgrade(d); save(); render(); toast(t('imported')); } catch (x) { toast(t('notExport')); } }; return i.click(); }
  }
});
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
let resizeT; addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => tab === 'money' && drawFuelCharts(veh()), 150); });

render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
