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

// ---------- ui state ----------
let tab = 'today', asked = null, mech = false;
const ICONS = {
  today: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M5 21h10M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M8 8h4"/>',
  service: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 9.5h6M9 12.5h4"/>'
};
function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2400); }

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

// A sample vehicle with a few months of records, so people can see how CarBook works. They can delete it later.
function addExample() {
  const day = n => { const d = new Date(todayISO() + 'T00:00'); d.setDate(d.getDate() + n); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const v = { id: uid(), createdAt: Date.now(), name: t('exampleName'), plate: 'CAB-1234', year: 2016, type: 'Car', fuel: 'Petrol', odo: 52480 };
  db.vehicles.push(v); db.active = v.id;
  [['emission', 12], ['insurance', 64], ['revenue', 140]].forEach(([kind, n]) => db.docs.push({ ...newRecord(v), kind, title: '', expiry: day(n), note: '' }));
  [[-70, 50120, 28.4], [-55, 50480, 26.1], [-40, 50860, 27.9], [-24, 51210, 27.2], [-9, 51540, 27.6]].forEach(([n, odo, litres]) => db.fuel.push({ ...newRecord(v), litres, total: Math.round(litres * 299), odo, date: day(n) }));
  db.service.push({ ...newRecord(v), kind: 'Oil change', oil: '10W-40 semi-synthetic', filter: 'Changed', odo: 48200, cost: 14500, date: day(-150), garage: t('exampleGarage'), part: 'Genuine', note: '' });
  db.service.push({ ...newRecord(v), kind: 'Battery', oil: '', filter: '', odo: 31000, cost: 28000, date: day(-1240), garage: '', part: 'Aftermarket', note: '' });
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

function viewToday(v) {
  const docs = mine(db.docs, v).map(d => ({ ...d, days: daysTo(d.expiry) })).sort((a, b) => a.days - b.days);
  const have = new Set(docs.map(d => d.kind));
  const missing = requiredKinds(v).filter(k => !have.has(k));
  const f = fuelRows(v), k = f.map(x => x.kpl).filter(Boolean);
  const spend = f.filter(x => daysTo(x.date) >= -30).reduce((s, x) => s + x.total, 0);
  let focus = '';
  if (docs.length) {
    const n = docs[0], st = status(n.days), hint = kindHint(n.kind);
    focus = `<div class="focus"><div class="when ${st.c}">${esc(n.days < 0 ? st.t : n.days === 0 ? t('dueToday') : t('inTime', st.t))}</div><div class="what t"><b>${esc(docTitle(n))}</b> · ${fmtD(n.expiry)}</div>${hint ? `<div class="why mut small">${esc(hint)}</div>` : ''}</div>`;
  } else {
    focus = `<div class="focus"><div class="when" style="font-size:26px">${esc(t('startDocs'))}</div><div class="why mut" style="margin-top:6px">${esc(t('startDocsWhy'))}</div></div>`;
  }
  const rows = docs.map(d => { const st = status(d.days); return `<li><button class="row" data-act="doc" data-id="${d.id}"><span class="l"><span class="t"><span class="dot ${st.c}"></span>${esc(docTitle(d))}</span><br><span class="d">${fmtD(d.expiry)}</span></span><span class="r ${st.c}">${esc(st.t)}</span></button></li>`; }).join('')
    + missing.map(m => `<li><button class="row" data-act="addDoc" data-kind="${m}"><span class="l"><span class="t"><span class="dot"></span>${esc(kindName(m))}</span><br><span class="d">${esc(t('notAddedYet'))}</span></span><span class="r none">${esc(t('add'))}</span></button></li>`).join('');
  const renewable = docs.filter(d => d.days <= 45 && ['emission', 'insurance', 'revenue', 'driving'].includes(d.kind));
  return `${header(v)}
  <div class="odo"><span class="num">${n0(v.odo)}</span><span class="unit">${esc(t('km'))}</span><button class="link" data-act="odo" style="margin-left:auto">${esc(t('update'))}</button></div>
  ${focus}
  <h2>${esc(t('docsAndDeadlines'))}</h2><ul class="rows">${rows}</ul>
  <div class="actions stack">${renewable.length ? `<button class="btn" data-act="renew" data-id="${renewable[0].id}">${esc(t('markRenewed', docTitle(renewable[0])))}</button>` : ''}<button class="btn quiet" data-act="addDoc">${esc(t('addADocument'))}</button></div>
  <h2>${esc(t('runningCosts'))}</h2>
  <div class="pair"><div><div class="num">${k.length ? n1(avg(k)) : '–'}</div><div class="small mut">${esc(t('kplAvg'))}</div></div><div><div class="num">${esc(t('rs', n0(spend)))}</div><div class="small mut">${esc(t('fuel30'))}</div></div></div>
  ${langPicker()}
  <h2>${esc(t('yourData'))}</h2>
  <div class="small mut" style="margin-bottom:10px">${esc(t('dataNote'))}</div>
  <div class="actions" style="margin-top:0"><button class="btn quiet" data-act="export">${esc(t('export'))}</button><button class="btn quiet" data-act="import">${esc(t('import'))}</button></div>
  <p class="small" style="margin:14px 4px 0"><a href="privacy.html" style="color:var(--accent);font-weight:700">${esc(t('privacyPolicy'))}</a></p>
  <input type="file" id="imp" accept="application/json" hidden>`;
}

function viewFuel(v) {
  const rows = fuelRows(v).reverse();
  const k = rows.map(x => x.kpl).filter(Boolean);
  const price = rows.length ? rows.reduce((s, x) => s + x.total, 0) / rows.reduce((s, x) => s + x.litres, 0) : 0;
  return `${header(v)}
  <div class="pair" style="margin-top:26px"><div><div class="num">${k.length ? n1(avg(k)) : '–'}</div><div class="small mut">${esc(t('kplAvg'))}</div></div><div><div class="num">${rows.length ? esc(t('rs', n0(price))) : '–'}</div><div class="small mut">${esc(t('avgPrice'))}</div></div></div>
  <div class="actions"><button class="btn wide" data-act="addFuel">${esc(t('addFuelTitle'))}</button></div>
  <h2>${esc(t('history'))}</h2>
  ${rows.length ? `<ul class="rows">${rows.map(x => `<li><button class="row" data-act="fuel" data-id="${x.id}"><span class="l"><span class="t">${esc(t('litresShort', x.litres))} · ${esc(t('rs', n0(x.total)))}</span><br><span class="d">${fmtD(x.date)} · ${n0(x.odo)} ${esc(t('km'))}${x.photo ? ' · ' + esc(t('photo')) : ''}</span></span><span class="r ${x.kpl ? 'ok' : 'none'}">${esc(x.kpl ? t('kpl', n1(x.kpl)) : t('firstEntry'))}</span></button></li>`).join('')}</ul>
  <p class="small mut" style="margin-top:12px">${esc(t('fillAssumption'))}</p>` : `<div class="empty"><b>${esc(t('noFuelTitle'))}</b>${esc(t('noFuelText'))}</div>`}`;
}

function viewService(v) {
  const h = health(v), rows = mine(db.service, v).sort((a, b) => b.odo - a.odo || b.date.localeCompare(a.date));
  return `${header(v)}
  <h2 style="margin-top:28px">${esc(t('condition'))}</h2>
  <ul class="rows">${h.map(x => `<li><button class="row" data-act="addService" data-kind="${esc(x.kind)}"><span class="l"><span class="t"><span class="dot ${x.s === 'none' ? '' : x.s}"></span>${esc(x.name)}</span><br><span class="d">${esc(x.text)}</span></span><span class="r none">${x.s === 'none' ? esc(t('add')) : ''}</span></button></li>`).join('')}</ul>
  <p class="small mut" style="margin-top:10px">${esc(t('defaultIntervals'))}</p>
  <div class="actions"><button class="btn wide" data-act="addService">${esc(t('addServiceTitle'))}</button></div>
  <h2>${esc(t('history'))}</h2>
  ${rows.length ? `<ul class="rows">${rows.map(s => `<li><button class="row" data-act="service" data-id="${s.id}"><span class="l"><span class="t">${esc(label('svc_', s.kind))}${s.part ? `<span class="chip">${esc(label('part_', s.part))}</span>` : ''}</span><br><span class="d">${fmtD(s.date)} · ${n0(s.odo)} ${esc(t('km'))}${s.garage ? ' · ' + esc(s.garage) : ''}</span>${s.oil ? `<br><span class="d">${esc(s.oil)}${s.filter ? ' · ' + esc(t('filterState', label('filter_', s.filter))) : ''}</span>` : ''}</span><span class="r none">${s.cost ? esc(t('rs', n0(s.cost))) : ''}</span></button></li>`).join('')}</ul>` : `<div class="empty"><b>${esc(t('noServiceTitle'))}</b>${esc(t('noServiceText'))}</div>`}`;
}

function viewAsk(v) {
  return `${header(v)}
  <h2 style="margin-top:28px">${esc(t('askTitle'))}</h2>
  <p>${esc(t('askIntro'))}</p>
  <div class="actions"><button class="btn wide" data-act="ask">${esc(t('prepare'))}</button></div>
  ${asked ? `<div class="${mech ? 'mech' : ''}" style="margin-top:8px">${asked.map(x => `<div class="q"><p>${esc(x[0])}</p><div class="basis">${esc(t('basedOn', x[1]))}</div></div>`).join('')}</div>
  <div class="actions"><button class="btn quiet" data-act="mech">${esc(t(mech ? 'normalSize' : 'showMechanic'))}</button></div>
  <p class="small mut" style="margin-top:14px">${esc(t('askDisclaimer'))}</p>` : ''}`;
}

function render() {
  const v = veh(), main = $('#view'), tabs = $('#tabs');
  tabs.setAttribute('aria-label', t('mainNav'));
  if (!v) { main.innerHTML = viewOnboard(); tabs.innerHTML = ''; return; }
  main.innerHTML = { today: viewToday, fuel: viewFuel, service: viewService, ask: viewAsk }[tab](v);
  tabs.innerHTML = `<div class="in">${[['today', 'tabToday'], ['fuel', 'tabFuel'], ['service', 'tabService'], ['ask', 'tabAsk']].map(([k, l]) => `<button data-tab="${k}" ${tab === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>${esc(t(l))}</button>`).join('')}</div>`;
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

render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
