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
  plugs: { km: 30000 }
};
// Stored values. Labels come from strings.js.
const DOC_KINDS = ['emission', 'insurance', 'revenue', 'driving', 'warranty', 'other'];
const HINTED = ['emission', 'insurance', 'revenue'];
const VEHICLE_TYPES = ['Car', 'Motorbike', 'Three-wheeler', 'Van'];
const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const SERVICE_KINDS = ['Oil change', 'Brake pads', 'Tyres', 'Battery', 'Spark plugs', 'Other'];
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
let tab = 'today', asked = null, mech = false, period = '6M', fsel = null;
const ICONS = {
  today: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  reminders: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M5 21h10M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M8 8h4"/>',
  service: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 9.5h6M9 12.5h4"/>'
};
const TABS = [['today', 'tabToday'], ['reminders', 'tabReminders'], ['fuel', 'tabFuel'], ['service', 'tabService'], ['ask', 'tabAsk']];
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
function paintBubble(i) { const el = document.querySelector(`[data-bubble="${i}"]`); if (el) el.textContent = chat[i].text; scrollChat(); }
function scrollChat() { const box = $('#chatlog'); if (box) box.scrollTop = box.scrollHeight; }
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
  save();
}

// ---------- views ----------
function header(v) {
  const h = new Date().getHours(), hi = t(h < 12 ? 'hiMorning' : h < 17 ? 'hiAfternoon' : 'hiEvening');
  return `<div class="top"><div class="hello">${esc(hi)}</div><button class="vehicle-btn" data-act="switch" aria-label="${esc(t('switchVehicle'))}"><h1 class="display">${esc(v.name)}</h1><div class="sub">${esc([v.plate, v.year, v.fuel && label('fuel_', v.fuel)].filter(Boolean).join('  ·  '))}</div></button></div>`;
}

// Shown only once a second language has a translation started in strings.js.
function langPicker() {
  const ls = languages(); if (ls.length < 2) return '';
  return `<h2>${esc(t('language'))}</h2><div class="actions" style="margin-top:0">${ls.map(l => `<button class="btn ${l === lang ? '' : 'quiet'}" data-act="lang" data-lang="${l}" lang="${l}" ${l === lang ? 'aria-pressed="true"' : ''}>${esc(STRINGS[l].langName)}</button>`).join('')}</div>`;
}

function viewOnboard() {
  const car = '<svg viewBox="0 0 512 512" aria-hidden="true"><path d="M118 300l30-76q8-20 30-20h156q22 0 30 20l30 76v62q0 12-12 12h-30q-12 0-12-12v-18H172v18q0 12-12 12h-30q-12 0-12-12z" fill="none" stroke="#fff" stroke-width="26" stroke-linejoin="round"/><circle cx="176" cy="302" r="18" fill="#fff"/><circle cx="336" cy="302" r="18" fill="#fff"/></svg>';
  return `<div class="welcome"><div class="badge">${car}</div>
  <h1 class="display">${esc(t('appName'))}</h1>
  <p class="tag">${esc(t('tagline'))}</p>
  <div class="go"><button class="btn wide" data-act="addVehicle">${esc(t('addYourVehicle'))}</button>
  <button class="btn quiet wide" data-act="example">${esc(t('tryExample'))}</button></div>
  <p class="small mut" style="margin-top:18px;max-width:34ch">${esc(t('onDevice'))}</p>${langPicker()}</div>`;
}

// One reminder as a row with its value on the right.
function reminderRow(x) {
  const val = valueOf(x);
  return `<li><button class="row rem" data-act="${x.act}" data-id="${x.id || ''}" data-kind="${esc(x.kind || '')}">
    <span class="l"><span class="t"><span class="dot ${x.s === 'none' ? '' : x.s}"></span>${esc(x.title)}${x.cat === 'warranty' ? `<span class="chip">${esc(t('catWarranty'))}</span>` : ''}</span><br><span class="d">${esc(x.sub || '')}</span></span>
    <span class="val ${x.s}"><span class="big">${esc(val.big)}</span>${val.unit ? `<span class="unit">${esc(val.unit)}</span>` : ''}${val.small ? `<span class="small-v">${esc(val.small)}${x.est ? ' · ' + esc(t('estimated')) : ''}</span>` : ''}</span></button></li>`;
}

// The single most urgent thing, as the big green card.
function focusCard(x) {
  if (!x) return `<div class="focus"><div class="when" style="font-size:28px">${esc(t('allClear'))}</div><div class="why">${esc(t('allClearWhy'))}</div></div>`;
  if (x.s === 'none') return `<div class="focus"><div class="when" style="font-size:26px">${esc(t('startDocs'))}</div><div class="why">${esc(t('startDocsWhy'))}</div></div>`;
  const val = valueOf(x);
  return `<div class="focus"><div class="eyebrow-l">${esc(t('nextUp'))}</div><div class="when ${x.s}">${esc(val.big)}${val.unit ? `<span class="u">${esc(val.unit)}</span>` : ''}</div>
    <div class="what"><b>${esc(x.title)}</b>${val.small ? ' · ' + esc(val.small) : ''}${x.est ? ' · ' + esc(t('estimated')) : ''}</div>${x.sub ? `<div class="why">${esc(x.sub)}</div>` : ''}
    ${x.act === 'renew' ? `<button class="btn on-dark" data-act="renew" data-id="${x.id}">${esc(t('markRenewed', x.title))}</button>` : ''}</div>`;
}

function tile(big, unit, lbl, extra = '', cls = '') {
  const inner = `<span class="num">${esc(big)}${unit ? `<span class="unit">${esc(unit)}</span>` : ''}</span><span class="lbl">${esc(lbl)}</span>${extra}`;
  return cls === 'go-rem' ? `<button class="tile go-rem" data-tab="reminders">${inner}</button>` : `<div class="tile">${inner}</div>`;
}

function viewToday(v) {
  const R = reminders(v), dated = R.filter(x => x.s !== 'none');
  const urgent = dated[0] && (dated[0].s === 'bad' || dated[0].s === 'warn') ? dated[0] : (dated[0] || R[0]);
  const nextDoc = R.filter(x => x.cat === 'doc' && x.days != null).sort((a, b) => a.days - b.days)[0], oil = R.find(x => x.key === 'oil' && x.s !== 'none');
  const now = new Date(todayISO() + 'T00:00'), mStart = isoOf(new Date(now.getFullYear(), now.getMonth(), 1));
  const month = fuelStats(v, mStart, addDaysISO(todayISO(), 1)), lastM = fuelStats(v, isoOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)), mStart);
  const recent = fuelRows(v).map(x => x.kpl).filter(Boolean).slice(-3);
  const yearStart = isoOf(new Date(now.getFullYear(), 0, 1)), yFuel = fuelStats(v, yearStart, addDaysISO(todayISO(), 1)).spent;
  const ySvc = mine(db.service, v).filter(s => s.date >= yearStart).reduce((s, x) => s + (x.cost || 0), 0);
  const nv = x => x ? valueOf(x) : null, nd = nv(nextDoc), no = nv(oil);
  return `${header(v)}
  ${focusCard(urgent)}
  <div class="tiles">
    ${nd ? tile(nd.big, nd.unit, t('tileNextDeadline', nextDoc.title), '', 'go-rem') : tile('–', '', t('tileNoDeadline'))}
    ${no ? tile(no.big, no.unit, t('tileOil'), '', 'go-rem') : tile('–', '', t('tileOilNone'))}
    ${tile(t('rs', n0(month.spent)), '', t('tileFuelMonth'), lastM.fills ? `<span class="cmp">${esc(t('vsLastMonth', t('rs', n0(lastM.spent))))}</span>` : '')}
    ${tile(recent.length ? n1(avg(recent)) : '–', recent.length ? t('kplUnit') : '', t('tileKpl'))}
  </div>
  <div class="odo"><span class="lbl-l">${esc(t('odometerShort'))}</span><span class="num">${n0(v.odo)}</span><span class="unit">${esc(t('km'))}</span><button class="link" data-act="odo" style="margin-left:auto">${esc(t('update'))}</button></div>
  <h2>${esc(t('comingUp'))}</h2>
  <ul class="rows">${R.slice(0, 3).map(reminderRow).join('')}</ul>
  <div class="actions"><button class="btn quiet wide" data-tab="reminders">${esc(t('seeAllReminders', R.length))}</button></div>
  <h2>${esc(t('spentThisYear'))}</h2>
  <div class="tiles">${tile(t('rs', n0(yFuel)), '', t('fuelLabel'))}${tile(t('rs', n0(ySvc)), '', t('servicesLabel'))}</div>
  ${langPicker()}
  <h2>${esc(t('yourData'))}</h2>
  <div class="small mut" style="margin:0 4px 10px">${esc(t('dataNote'))}</div>
  <div class="actions" style="margin-top:0"><button class="btn quiet" data-act="export">${esc(t('export'))}</button><button class="btn quiet" data-act="import">${esc(t('import'))}</button></div>
  <p class="small" style="margin:14px 4px 0"><a href="privacy.html" style="color:var(--accent);font-weight:700">${esc(t('privacyPolicy'))}</a></p>
  <input type="file" id="imp" accept="application/json" hidden>`;
}

function viewReminders(v) {
  const R = reminders(v), focus = R.filter(x => x.s === 'bad' || x.s === 'warn'), missing = R.filter(x => x.s === 'none');
  // 12-month roadmap: everything with a date up to a year ahead, grouped by month. Overdue first.
  const now = new Date(todayISO() + 'T00:00'), horizon = addMonthsISO(todayISO(), 12);
  const dated = R.filter(x => x.date && x.date <= horizon).sort((a, b) => a.date.localeCompare(b.date));
  const months = Array.from({ length: 12 }, (_, i) => { const s = new Date(now.getFullYear(), now.getMonth() + i, 1); return { key: isoOf(s).slice(0, 7), label: s.toLocaleDateString(loc(), { month: 'short' }), long: s.toLocaleDateString(loc(), { month: 'long', year: 'numeric' }) }; });
  const overdue = dated.filter(x => x.days < 0);
  const byMonth = months.map(m => ({ ...m, items: dated.filter(x => x.days >= 0 && x.date.slice(0, 7) === m.key) }));
  const catLabel = x => t(x.cat === 'warranty' ? 'catWarrantyEnds' : x.cat === 'doc' ? 'catRenewal' : 'catService');
  const roadItem = x => `<li><button class="road-item" data-act="${x.act}" data-id="${x.id || ''}" data-kind="${esc(x.kind || '')}"><span class="road-dot ${x.cat}"></span>
    <span class="road-main"><span class="road-t">${esc(x.title)}</span><span class="road-d">${esc(catLabel(x))} · ${fmtD(x.date)}${x.est ? ' · ' + esc(t('estimated')) : ''}</span></span>
    <span class="pill ${x.s}">${esc(x.days < 0 ? t('overdue') : x.days === 0 ? t('today') : t('inDays', x.days))}</span></button></li>`;
  return `${header(v)}
  <h2 style="margin-top:22px">${esc(t('focusNow'))}</h2>
  ${focus.length ? `<div class="focus-grid">${focus.map(x => { const val = valueOf(x); return `<button class="fcard ${x.s}" data-act="${x.act}" data-id="${x.id || ''}" data-kind="${esc(x.kind || '')}">
      <span class="pill ${x.s}">${esc(t(x.s === 'bad' ? 'statusDue' : 'statusSoon'))}</span>
      <span class="fbig">${esc(val.big)}${val.unit ? `<span class="unit">${esc(val.unit)}</span>` : ''}</span>
      <span class="ft">${esc(x.title)}</span><span class="fs">${esc(val.small || x.sub || '')}${x.est ? ' · ' + esc(t('estimated')) : ''}</span></button>`; }).join('')}</div>`
    : `<div class="empty"><b>${esc(t('allClear'))}</b>${esc(t('allClearWhy'))}</div>`}
  ${missing.length ? `<h2>${esc(t('missingRecords'))}</h2><ul class="rows">${missing.map(reminderRow).join('')}</ul>` : ''}

  <h2>${esc(t('next12'))}</h2>
  <div class="strip" role="list">${byMonth.map((m, i) => `<a role="listitem" class="strip-m ${m.items.length ? 'has' : ''}" href="#m-${m.key}" aria-label="${esc(t('stripLabel', m.long, m.items.length))}"><span class="strip-n">${m.items.length || ''}</span><span class="strip-dots">${m.items.slice(0, 3).map(x => `<i class="${x.cat}"></i>`).join('')}</span><span class="strip-l">${esc(m.label)}</span></a>`).join('')}</div>
  <div class="legend"><span><i class="doc"></i>${esc(t('catRenewal'))}</span><span><i class="service"></i>${esc(t('catService'))}</span><span><i class="warranty"></i>${esc(t('catWarrantyEnds'))}</span></div>
  <div class="road">
    ${overdue.length ? `<div class="road-m"><h3 class="bad">${esc(t('overdue'))}</h3><ul>${overdue.map(roadItem).join('')}</ul></div>` : ''}
    ${byMonth.filter(m => m.items.length).map(m => `<div class="road-m" id="m-${m.key}"><h3>${esc(m.long)}</h3><ul>${m.items.map(roadItem).join('')}</ul></div>`).join('') || `<div class="empty">${esc(t('roadEmpty'))}</div>`}
  </div>
  <p class="small mut" style="margin:10px 4px 0">${esc(t('roadNote'))}</p>

  <h2>${esc(t('docsAndDeadlines'))}</h2>
  <ul class="rows">${R.filter(x => x.cat !== 'service' && x.s !== 'none').map(reminderRow).join('') || `<li class="row"><span class="l d">${esc(t('noDocsYet'))}</span></li>`}</ul>
  <div class="actions"><button class="btn quiet wide" data-act="addDoc">${esc(t('addADocument'))}</button></div>
`;
}

// Change vs the previous period, as a small pill. goodWhenUp: is a rise good news?
function delta(cur, prev, goodWhenUp, per) {
  if (cur == null || !prev) return `<span class="cmp">${esc(t('noPrevious'))}</span>`;
  const pct = (cur - prev) / prev * 100, r = Math.round(pct);
  if (Math.abs(pct) < 1) return `<span class="cmp">${esc(t('sameAsBefore', t('prev_' + per)))}</span>`;
  const good = (pct > 0) === goodWhenUp;
  return `<span class="cmp"><span class="pill ${good ? 'ok' : 'warn'}">${pct > 0 ? '↑' : '↓'} ${Math.abs(r)}%</span> ${esc(t('vsPrev', t('prev_' + per)))}</span>`;
}

function viewFuel(v) {
  const rows = fuelRows(v).reverse();
  if (!rows.length) return `${header(v)}<div class="actions"><button class="btn wide" data-act="addFuel">${esc(t('addFuelTitle'))}</button></div><div class="empty" style="margin-top:16px"><b>${esc(t('noFuelTitle'))}</b>${esc(t('noFuelText'))}</div>`;
  const d = periodData(v, period), c = d.cur, p = d.prev;
  return `${header(v)}
  <div class="seg" role="group" aria-label="${esc(t('periodLabel'))}">${PERIODS.map(k => `<button data-act="period" data-p="${k}" ${k === period ? 'aria-pressed="true"' : ''}>${esc(t('p_' + k))}</button>`).join('')}</div>
  <div class="tiles">
    ${tile(t('rs', n0(c.spent)), '', t('spentIn', t('per_' + period)), delta(c.spent, p.spent, false, period))}
    ${tile(c.price ? t('rs', n0(c.price)) : '–', '', t('avgPriceL'), delta(c.price, p.price, false, period))}
    ${tile(c.kpl ? n1(c.kpl) : '–', c.kpl ? t('kplUnit') : '', t('kplAvg'), delta(c.kpl, p.kpl, true, period))}
    ${tile(n0(c.litres), t('litreUnit'), t('litresIn', c.fills), delta(c.litres, p.litres, false, period))}
  </div>
  <div class="chart-card">
    <div class="readout" id="readout" aria-live="polite"></div>
    <div class="chart-h">${esc(t('chartSpent'))}</div><div class="chart" id="ch-spent"></div>
    <div class="chart-h">${esc(t('chartPrice'))}</div><div class="chart" id="ch-price"></div>
    <details class="tbl"><summary>${esc(t('seeNumbers'))}</summary><div class="tbl-wrap"><table><thead><tr><th>${esc(t('colPeriod'))}</th><th>${esc(t('colSpent'))}</th><th>${esc(t('colPrice'))}</th><th>${esc(t('colFills'))}</th></tr></thead>
      <tbody>${d.bs.slice().reverse().map(b => `<tr><td>${esc(b.label)}</td><td>${b.fills ? esc(t('rs', n0(b.spent))) : '–'}</td><td>${b.price ? esc(t('rs', n1(b.price))) : '–'}</td><td>${b.fills}</td></tr>`).join('')}</tbody></table></div></details>
  </div>
  <div class="actions"><button class="btn wide" data-act="addFuel">${esc(t('addFuelTitle'))}</button></div>
  <h2>${esc(t('history'))}</h2>
  <ul class="rows">${rows.slice(0, 30).map(x => `<li><button class="row" data-act="fuel" data-id="${x.id}"><span class="l"><span class="t">${esc(t('litresShort', x.litres))} · ${esc(t('rs', n0(x.total)))}</span><br><span class="d">${fmtD(x.date)} · ${n0(x.odo)} ${esc(t('km'))}${x.photo ? ' · ' + esc(t('photo')) : ''}</span></span><span class="r ${x.kpl ? 'ok' : 'none'}">${esc(x.kpl ? t('kpl', n1(x.kpl)) : t('firstEntry'))}</span></button></li>`).join('')}</ul>
  ${rows.length > 30 ? `<p class="small mut" style="margin:10px 4px 0">${esc(t('showingRecent', 30, rows.length))}</p>` : ''}
  <p class="small mut" style="margin:10px 4px 0">${esc(t('fillAssumption'))}</p>`;
}

// ---------- charts (hand-drawn SVG, works offline) ----------
const compact = n => n >= 1e6 ? n1(n / 1e6) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n0(n);
function niceMax(m) { if (!(m > 0)) return 1; const p = 10 ** Math.floor(Math.log10(m)), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function drawFuelCharts(v) {
  const sp = $('#ch-spent'), pr = $('#ch-price'); if (!sp || !pr) return;
  const d = periodData(v, period), bs = d.bs, n = bs.length;
  if (fsel == null || fsel >= n) fsel = n - 1;
  const W = Math.max(260, sp.clientWidth), H = 150, L = 44, Rr = 8, T = 10, B = 26, iw = W - L - Rr, ih = H - T - B, slot = iw / n;
  const every = Math.ceil(n / Math.max(3, Math.floor(iw / 52)));
  const xLabels = bs.map((b, i) => (i % every === (n - 1) % every) ? `<text class="ax" x="${L + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${esc(b.label)}</text>` : '').join('');
  const hits = bs.map((b, i) => `<rect class="hit" data-i="${i}" x="${L + slot * i}" y="${T}" width="${slot}" height="${ih}" tabindex="0" aria-label="${esc(b.label)}"></rect>`).join('');
  // spent: columns
  const sMax = niceMax(Math.max(...bs.map(b => b.spent)));
  const yS = val => T + ih - val / sMax * ih, bw = Math.min(24, Math.max(3, slot - 2));
  const grid = (max, fmt) => [0, 0.5, 1].map(f => `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${T + ih - f * ih}" y2="${T + ih - f * ih}"></line><text class="ax" x="${L - 6}" y="${T + ih - f * ih + 4}" text-anchor="end">${esc(fmt(max * f))}</text>`).join('');
  const bars = bs.map((b, i) => { if (!b.spent) return ''; const x = L + slot * i + (slot - bw) / 2, y = yS(b.spent), h = T + ih - y, r = Math.min(4, bw / 2, h);
    return `<path class="bar ${i === fsel ? 'sel' : ''}" data-b="${i}" d="M${x} ${T + ih}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${T + ih}Z"></path>`; }).join('');
  sp.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chartSpent'))}">${grid(sMax, compact)}${bars}${xLabels}${hits}</svg>`;
  // price per litre: line, broken where a bucket has no fill-ups
  const ps = bs.map(b => b.price).filter(Boolean);
  if (!ps.length) { pr.innerHTML = `<div class="small mut">${esc(t('noFuelInPeriod'))}</div>`; }
  else {
    let lo = Math.min(...ps), hi = Math.max(...ps); const pad = Math.max(5, (hi - lo) * 0.25); lo = Math.max(0, Math.floor((lo - pad) / 10) * 10); hi = Math.ceil((hi + pad) / 10) * 10;
    const yP = val => T + ih - (val - lo) / (hi - lo) * ih;
    let path = '', pen = false;
    bs.forEach((b, i) => { if (!b.price) { pen = false; return; } path += `${pen ? 'L' : 'M'}${L + slot * i + slot / 2} ${yP(b.price)}`; pen = true; });
    const pgrid = [0, 0.5, 1].map(f => { const val = lo + (hi - lo) * f; return `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${yP(val)}" y2="${yP(val)}"></line><text class="ax" x="${L - 6}" y="${yP(val) + 4}" text-anchor="end">${esc(n0(val))}</text>`; }).join('');
    const dots = bs.map((b, i) => b.price ? `<circle class="pt ${i === fsel ? 'sel' : ''}" data-b="${i}" cx="${L + slot * i + slot / 2}" cy="${yP(b.price)}" r="${i === fsel ? 5 : (n > 24 ? 0 : 3.5)}"></circle>` : '').join('');
    const cross = `<line class="cross" id="cross" x1="0" x2="0" y1="${T}" y2="${T + ih}"></line>`;
    pr.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chartPrice'))}">${pgrid}${cross}<path class="line" d="${path}"></path>${dots}${xLabels}${hits}</svg>`;
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

function viewService(v) {
  const h = health(v), rows = mine(db.service, v).sort((a, b) => b.odo - a.odo || b.date.localeCompare(a.date));
  const yearAgo = addDaysISO(todayISO(), -365), spent = rows.filter(s => s.date >= yearAgo).reduce((s, x) => s + (x.cost || 0), 0);
  return `${header(v)}
  <div class="tiles" style="margin-top:14px">${tile(t('rs', n0(spent)), '', t('svcSpent12'))}${tile(String(rows.length), '', t('svcRecords'))}</div>
  <h2>${esc(t('condition'))}</h2>
  <ul class="rows">${h.map(x => `<li><button class="row" data-act="addService" data-kind="${esc(x.kind)}"><span class="l"><span class="t"><span class="dot ${x.s === 'none' ? '' : x.s}"></span>${esc(x.name)}</span><br><span class="d">${esc(x.text)}</span></span><span class="r ${x.s === 'none' ? 'none' : x.s}">${esc(x.s === 'none' ? t('add') : t({ ok: 'statusFine', warn: 'statusSoon', bad: 'statusDue' }[x.s]))}</span></button></li>`).join('')}</ul>
  <p class="small mut" style="margin:10px 4px 0">${esc(t('defaultIntervals'))}</p>
  <div class="actions"><button class="btn wide" data-act="addService">${esc(t('addServiceTitle'))}</button></div>
  <h2>${esc(t('history'))}</h2>
  ${rows.length ? `<ul class="rows">${rows.map(s => `<li><button class="row" data-act="service" data-id="${s.id}"><span class="l"><span class="t">${esc(label('svc_', s.kind))}${s.part ? `<span class="chip">${esc(label('part_', s.part))}</span>` : ''}</span><br><span class="d">${fmtD(s.date)} · ${n0(s.odo)} ${esc(t('km'))}${s.garage ? ' · ' + esc(s.garage) : ''}</span>${s.oil ? `<br><span class="d">${esc(s.oil)}${s.filter ? ' · ' + esc(t('filterState', label('filter_', s.filter))) : ''}</span>` : ''}</span><span class="r none">${s.cost ? esc(t('rs', n0(s.cost))) : ''}</span></button></li>`).join('')}</ul>` : `<div class="empty"><b>${esc(t('noServiceTitle'))}</b>${esc(t('noServiceText'))}</div>`}`;
}

function viewAsk(v) {
  const sugg = ['sugSpend', 'sugNext', 'sugOil', 'sugPrice'];
  return `${header(v)}
  <h2 style="margin-top:22px">${esc(t('chatTitle'))}</h2>
  <p class="mut" style="margin:0 4px">${esc(t(aiSample ? 'chatIntroAI' : 'chatIntroLocal'))}</p>
  <div class="chat">
    <div class="chatlog" id="chatlog" aria-live="polite">
      ${chat.length ? chat.map((m, i) => `<div class="bubble ${m.role === 'user' ? 'me' : 'bot'}"><div data-bubble="${i}">${esc(m.pending ? t('thinking') : m.text)}</div>${m.role === 'assistant' && !m.pending ? `<div class="src">${esc(t(m.src === 'ai' ? 'srcAI' : 'srcLocal'))}</div>` : ''}</div>`).join('')
        : `<div class="chips">${sugg.map(k => `<button class="chipbtn" data-act="suggest" data-q="${esc(t(k))}">${esc(t(k))}</button>`).join('')}</div>`}
    </div>
    <form class="composer" id="composer"><label class="sr" for="chatin">${esc(t('chatPlaceholder'))}</label>
      <input id="chatin" name="q" autocomplete="off" placeholder="${esc(t('chatPlaceholder'))}" ${chatBusy ? 'disabled' : ''}>
      ${chatBusy && aiSample ? `<button type="button" class="btn quiet" data-act="stopchat">${esc(t('stop'))}</button>` : `<button class="btn" type="submit" ${chatBusy ? 'disabled' : ''}>${esc(t('send'))}</button>`}</form>
    ${chat.length ? `<button class="link" data-act="clearchat" style="margin:8px 4px 0">${esc(t('newChat'))}</button>` : ''}
  </div>
  <p class="small mut" style="margin:10px 4px 0">${esc(t('chatNote'))}</p>

  <h2>${esc(t('askTitle'))}</h2>
  <p class="mut" style="margin:0 4px">${esc(t('askIntro'))}</p>
  <div class="actions"><button class="btn quiet wide" data-act="ask">${esc(t('prepare'))}</button></div>
  ${asked ? `<div class="${mech ? 'mech' : ''}" style="margin-top:12px">${asked.map(x => `<div class="q"><p>${esc(x[0])}</p><div class="basis">${esc(t('basedOn', x[1]))}</div></div>`).join('')}</div>
  <div class="actions"><button class="btn quiet" data-act="mech">${esc(t(mech ? 'normalSize' : 'showMechanic'))}</button></div>
  <p class="small mut" style="margin:14px 4px 0">${esc(t('askDisclaimer'))}</p>` : ''}`;
}

function render() {
  const v = veh(), main = $('#view'), tabs = $('#tabs');
  tabs.setAttribute('aria-label', t('mainNav'));
  if (!v) { main.innerHTML = viewOnboard(); tabs.innerHTML = ''; return; }
  const keep = $('#chatin')?.value || '';
  main.innerHTML = { today: viewToday, reminders: viewReminders, fuel: viewFuel, service: viewService, ask: viewAsk }[tab](v);
  tabs.innerHTML = `<div class="in">${TABS.map(([k, l]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${esc(t(l))}</button>`).join('')}</div>`;
  if (tab === 'fuel') drawFuelCharts(v);
  if (tab === 'ask') { const inp = $('#chatin'); if (inp && keep && !chatBusy) inp.value = keep; $('#composer').onsubmit = e => { e.preventDefault(); const q = $('#chatin').value; $('#chatin').value = ''; sendChat(q); }; scrollChat(); }
}

// ---------- events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-tab],[data-act]'); if (!el) return;
  if (el.dataset.tab) { tab = el.dataset.tab; window.scrollTo(0, 0); return render(); }
  const id = el.dataset.id, v = veh();
  switch (el.dataset.act) {
    case 'addVehicle': return vehicleForm(null);
    case 'switch': return switchVehicle();
    case 'example': addExample(); return render();
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
    case 'lang': setLang(el.dataset.lang); if (asked) asked = questions(v); return render();
    case 'export': {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
      a.download = 'carbook-' + todayISO() + '.json'; a.click(); return toast(t('exported'));
    }
    case 'import': { const i = $('#imp'); i.onchange = async () => { try { const d = JSON.parse(await i.files[0].text()); if (d.v !== 1 || !Array.isArray(d.vehicles)) throw 0; const ok = await confirmSheet(t('confirmImportTitle'), t('confirmImport'), t('replace')); dlg.close(); if (!ok) return; db = upgrade(d); save(); render(); toast(t('imported')); } catch (x) { toast(t('notExport')); } }; return i.click(); }
  }
});
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
let resizeT; addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => tab === 'fuel' && drawFuelCharts(veh()), 150); });

render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
