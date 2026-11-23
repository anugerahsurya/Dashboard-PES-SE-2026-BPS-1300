/* Google Apps Script V8. Jalankan setup() sekali dari editor sebagai pemilik. */
const SHEET_NAME = 'Snapshot PES';
const HEADERS = ['Tanggal laporan', 'Disimpan pada (UTC)', 'Snapshot JSON'];

function setup() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const config = PropertiesService.getScriptProperties();
    if (!config.getProperty('ADMIN_KEY')) throw new Error('Isi Script Property ADMIN_KEY.');
    const book = openBook_();
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    if (!sheet.getLastRow()) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
    }
    verifySheet_(sheet);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function openBook_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Isi Script Property SPREADSHEET_ID.');
  return SpreadsheetApp.openById(id);
}

function verifySheet_(sheet) {
  if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0].join('|') !== HEADERS.join('|')) {
    throw new Error('Periksa lembar Snapshot PES dan jalankan setup().');
  }
  return sheet;
}

function dates_(sheet) {
  const count = sheet.getLastRow() - 1;
  return count ? sheet.getRange(2, 1, count, 1).getDisplayValues().map(row => row[0]) : [];
}

function validDate_(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

function json_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

const STATUS_FIELDS = {
  sls: ['belum', 'sedang', 'selesai'],
  nonUb: ['open', 'draft', 'submitted', 'completed', 'rejected', 'revoked'],
  ub: ['open', 'draft', 'submitted', 'completed', 'rejected', 'revoked']
};

function validGroup_(group, category) {
  if (!group || typeof group !== 'object') return false;
  const statuses = STATUS_FIELDS[category];
  const required = category === 'sls' ? statuses.concat('target') :
    statuses.concat('target', 'ppl', 'pml', 'final', 'officers');
  if (!required.every(key => Number.isSafeInteger(group[key]) && group[key] >= 0)) return false;
  const approved = category === 'sls' ? 0 : (group.approved === undefined ? 0 : group.approved);
  const rejectedByAdmin = category === 'sls' ? 0 : (group.rejectedByAdmin === undefined ? 0 : group.rejectedByAdmin);
  const editedByAdmin = category === 'sls' ? 0 : (group.editedByAdmin === undefined ? 0 : group.editedByAdmin);
  const completedByAdmin = category === 'sls' ? 0 : (group.completedByAdmin === undefined ? 0 : group.completedByAdmin);
  if (!Number.isSafeInteger(editedByAdmin) || editedByAdmin < 0 || !Number.isSafeInteger(completedByAdmin) || completedByAdmin < 0) return false;
  const kp = category === 'ub' ? (group.kp === undefined ? 0 : group.kp) : 0;
  const kpAlreadyFinal = group.kpAlreadyFinal === undefined ? 0 : group.kpAlreadyFinal;
  const movedKp = kp - kpAlreadyFinal;
  const kpFromDraft = group.kpFromDraft === undefined ? movedKp : group.kpFromDraft;
  if (!Number.isSafeInteger(kp) || !Number.isSafeInteger(kpAlreadyFinal) ||
      !Number.isSafeInteger(kpFromDraft) || kpAlreadyFinal < 0 || movedKp < 0 ||
      kpFromDraft < 0 || kpFromDraft > movedKp ||
      kpAlreadyFinal > (group.completed || 0) + completedByAdmin + approved) return false;
  if (!Number.isSafeInteger(approved) || approved < 0) return false;
  if (!Number.isSafeInteger(rejectedByAdmin) || rejectedByAdmin < 0) return false;
  if (group.target !== statuses.reduce((sum, key) => sum + group[key], 0) + approved + rejectedByAdmin + movedKp + editedByAdmin + completedByAdmin) return false;
  if (category === 'sls') return true;
  return ((kp === 0 && completedByAdmin === 0 && group.final === group.completed) || group.final === group.completed + completedByAdmin + approved + movedKp) &&
    group.pml === group.completed + completedByAdmin + editedByAdmin + approved + movedKp + group.rejected + rejectedByAdmin + group.revoked &&
    group.ppl === group.pml + group.submitted;
}

function validSnapshot_(s) {
  if (!s || !validDate_(s.date) || typeof s.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) return false;
  const expected = new Set(['1303', '1306', '1307', '1309', '1312', '1371', '1372', '1375', '1376']);
  if (!Array.isArray(s.rows) || s.rows.length !== expected.size || !s.totals) return false;
  const categories = Object.keys(STATUS_FIELDS);
  for (const row of s.rows) {
    if (!row || !expected.delete(row.code) || typeof row.name !== 'string' || !row.name.trim() || !validDate_(row.deadline)) return false;
    if (!categories.every(category => validGroup_(row[category], category))) return false;
  }
  return categories.every(category => {
    const total = s.totals[category];
    if (!validGroup_(total, category)) return false;
    return Object.keys(total).every(key => total[key] === s.rows.reduce((sum, row) => sum + (row[category][key] === undefined && (key === 'approved' || key === 'rejectedByAdmin' || key === 'kp' || key === 'kpAlreadyFinal' || key === 'kpFromDraft' || key === 'editedByAdmin' || key === 'completedByAdmin') ? 0 : row[category][key]), 0));
  });
}

function normalizedSnapshot_(snapshot) {
  const copy = JSON.parse(JSON.stringify(snapshot));
  for (const row of copy.rows.concat(copy.totals)) {
    for (const group of ['nonUb', 'ub']) {
      row[group].final = row[group].completed + (row[group].completedByAdmin || 0) + (row[group].approved || 0) + (row[group].kp || 0) - (row[group].kpAlreadyFinal || 0);
    }
  }
  return copy;
}

// Select the latest collection time, regardless of row or upload order.
function latestRecord_(sheet, date) {
  const matches = dates_(sheet);
  let selected = null;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i] !== date) continue;
    const values = sheet.getRange(i + 2, 1, 1, 3).getValues()[0];
    const snapshot = JSON.parse(values[2]);
    const rank = snapshot.time + '|' + String(values[1]);
    if (!selected || rank > selected.rank) selected = {row:i+2,rank:rank,snapshot:normalizedSnapshot_(snapshot)};
  }
  return selected;
}

function doGet(e) {
  try {
    const requested = (e.parameter || {}).date;
    if (requested !== undefined && !validDate_(requested)) return json_({ok: false, error: 'Tanggal laporan tidak valid.'});
    const sheet = verifySheet_(openBook_().getSheetByName(SHEET_NAME));
    const dates = dates_(sheet);
    const date = requested || dates.reduce((latest, current) => current > latest ? current : latest, '');
    const record = latestRecord_(sheet, date);
    const snapshot = record ? record.snapshot : null;
    return json_({ok: true, snapshot: snapshot});
  } catch (error) {
    console.error(error.message);
    return json_({ok: false, error: 'Snapshot gagal dibaca. Periksa konfigurasi Apps Script.'});
  }
}

function doPost(e) {
  const content = e.postData && e.postData.contents;
  if (!content || content.length > 55000) return json_({ok: false, error: 'Ukuran kiriman tidak valid.'});
  let body;
  try {
    body = JSON.parse(content);
  } catch (_) {
    return json_({ok: false, error: 'Kiriman harus berupa JSON.'});
  }
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || !body || key !== body.adminKey) return json_({ok: false, error: 'Kunci admin tidak sesuai.'});
  const input = body.snapshot;
  if (!validSnapshot_(input)) return json_({ok: false, error: 'Tanggal, wilayah, atau rekap status laporan tidak valid.'});
  const snapshot = normalizedSnapshot_(input);
  const payload = JSON.stringify(snapshot);
  if (payload.length > 49000) return json_({ok: false, error: 'Snapshot terlalu besar untuk disimpan.'});
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ok: false, error: 'Admin lain sedang menyimpan. Coba lagi.'});
  try {
    const sheet = verifySheet_(openBook_().getSheetByName(SHEET_NAME));
    const previous = latestRecord_(sheet, snapshot.date);
    const row = previous ? previous.row : sheet.getLastRow() + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    let reportSheetName;
    try {
      reportSheetName = writeReport_(snapshot);
    } catch (error) {
      console.error(error.message);
      return json_({ok:false,error:'Tab laporan gagal disiapkan. Periksa akses edit, struktur template, dan nama tab pada spreadsheet laporan. Snapshot belum diterbitkan.'});
    }
    if (!previous || snapshot.time >= previous.snapshot.time) {
      sheet.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[snapshot.date, new Date().toISOString(), payload]]);
    }
    SpreadsheetApp.flush();
    return json_({ok: true, snapshot: previous && snapshot.time < previous.snapshot.time ? previous.snapshot : snapshot, reportSheetName: reportSheetName || undefined});
  } catch (error) {
    console.error(error.message);
    return json_({ok: false, error: 'Snapshot gagal disimpan. Periksa konfigurasi Apps Script.'});
  } finally {
    lock.releaseLock();
  }
}

const REPORT_MARK = 'PES_SE2026_REPORT_V1';
const REPORT_NAMES = {
  'kab solok': '1303', 'kab padang pariaman': '1306', 'kab pdg pariaman': '1306',
  'kab agam': '1307', 'kab pasaman': '1309', 'kab pasaman barat': '1312',
  'kota padang': '1371', 'kota solok': '1372', 'kota bukittinggi': '1375', 'kota payakumbuh': '1376'
};

function reportConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    id: p.getProperty('REPORT_SPREADSHEET_ID'),
    template: p.getProperty('REPORT_TEMPLATE_SHEET') || '14_11 14.00'
  };
}

function normalized_(value) {
  return String(value).toLowerCase().replace(/\./g, '').replace(/^kabupaten\s+/, 'kab ').replace(/\s+/g, ' ').trim();
}

function reportOrder_(template) {
  const rows = template.getRange('A1:AM11').getDisplayValues();
  // Index kolom nol. Uji titik batas agar sisipan/pergeseran kolom terdeteksi.
  const anchors = {0:'satker',6:'target sls',7:'jumlah ppl non ub',10:'jumlah sls selesai',
    15:'open',16:'draft',17:'submitted by pencacah',18:'completed by pengawas',
    19:'rejected by pengawas',20:'revoked',21:'draft',25:'target ub',26:'jumlah ppl ub',
    30:'open',31:'draft',32:'submitted by pencacah',33:'completed by pengawas',34:'rejected',
    36:'target 27 nov',37:'target 23 nov'};
  if (!Object.keys(anchors).every(col => normalized_(rows[0][col]) === anchors[col]) ||
      normalized_(rows[10][0]) !== 'provinsi sumbar' || rows.some(r => r[38])) {
    throw new Error('Struktur template A1:AM11 berbeda dari lembar 14_11 14.00. Periksa template laporan.');
  }
  const order = rows.slice(1, 10).map(row => REPORT_NAMES[normalized_(row[0])]);
  if (order.some(code => !code) || new Set(order).size !== 9) throw new Error('Nama wilayah template laporan tidak sesuai.');
  return order;
}

function reportNumbers_(row) {
  const s = row.sls, n = row.nonUb, u = row.ub;
  const pct = (count, target) => target ? count / target : '';
  return [s.target, n.officers, s.belum, s.sedang, s.selesai,
    pct(s.belum,s.target), pct(s.sedang,s.target), pct(s.selesai,s.target),
    n.target, n.open, n.draft, n.submitted, n.completed, n.rejected, n.revoked,
    pct(n.draft,n.target), pct(n.ppl,n.target), pct(n.pml,n.target), pct(n.final,n.target),
    u.target, u.officers, pct(u.ppl,u.target), pct(u.pml,u.target), pct(u.final,u.target),
    u.open, u.draft, u.submitted, u.completed, u.rejected];
}

// Nomor seri tanggal Google Sheets menghindari pergeseran zona waktu akun.
function dateSerial_(day) {
  return (Date.parse(day + 'T00:00:00Z') - Date.UTC(1899,11,30)) / 86400000;
}

function writeReport_(snapshot) {
  const config = reportConfig_();
  if (!config.id) return null;
  const book = SpreadsheetApp.openById(config.id);
  const template = book.getSheetByName(config.template);
  if (!template) throw new Error('Template laporan tidak ditemukan.');
  const name = 'PES ' + snapshot.date + ' ' + snapshot.time.replace(':','.');
  if (template.getName() === name) throw new Error('Nama tab laporan sama dengan template.');
  const order = reportOrder_(template);
  const byCode = new Map(snapshot.rows.map(r => [r.code,r]));
  const rows = order.map(code => byCode.get(code));
  const existing = book.getSheetByName(name);
  const pendingName = '__PES_' + Utilities.getUuid();
  const sheet = existing || book.insertSheet(pendingName, {template: template});
  const marker = sheet.getSheetId() + '|' + name;
  try {
    if (existing) {
      if (!sheet.getDeveloperMetadata().some(m => m.getKey() === REPORT_MARK && m.getValue() === marker)) {
        throw new Error('Nama tab telah digunakan oleh lembar lain. Periksa tab laporan.');
      }
      const current = sheet.getRange('A2:A10').getDisplayValues().map(r => REPORT_NAMES[normalized_(r[0])]);
      if (current.some((code,i) => code !== order[i])) throw new Error('Urutan wilayah tab laporan telah berubah.');
    } else {
      sheet.addDeveloperMetadata(REPORT_MARK, marker);
      // Masalah dan tanda laporan administrasi berasal dari hari template, bukan CSV.
      sheet.getRange('B2:B10').clearContent();
      sheet.getRange('E2:F10').clearContent();
      sheet.getRange('AM1').setValue('REVOKED BY Pengawas (UB)');
    }
    const all = rows.concat(snapshot.totals);
    sheet.getRange('C2:C10').setValues(rows.map(r => [dateSerial_(r.deadline)]));
    sheet.getRange('G2:AI11').setValues(all.map(reportNumbers_));
    sheet.getRange('AM2:AM11').setValues(all.map(r => [r.ub.revoked]));
    sheet.getRange('AN1:AQ1').setValues([['APPROVED BY Pengawas (Non-UB)', 'APPROVED BY Pengawas (UB)', 'REJECTED BY Admin Kab (Non-UB)', 'REJECTED BY Admin Kab (UB)']]);
    sheet.getRange('AN2:AQ11').setValues(all.map(r => [r.nonUb.approved || 0, r.ub.approved || 0, r.nonUb.rejectedByAdmin || 0, r.ub.rejectedByAdmin || 0]));
    sheet.getRange('Y1').setValue('Progres Olah final Non UB (COMPLETED + APPROVED)');
    sheet.getRange('AD1').setValue('Progres Olah final UB (COMPLETED + APPROVED)');
    sheet.getRange('X1').setValue('Progres PML Non UB (completed, approved, reject, reject admin, revoked)');
    sheet.getRange('AC1').setValue('Progres PML UB (completed, approved, reject, reject admin, revoked)');
    sheet.getRange('AR1:AS1').setValues([['#KP UB', 'DRAFT UB sebelum penyesuaian KP']]);
    sheet.getRange('AR2:AS11').setValues(all.map(r=>[r.ub.kp || 0, r.ub.draft+(r.ub.kpFromDraft ?? r.ub.kp ?? 0)]));
    sheet.getRange('AD1').setValue('Progres Olah final UB (COMPLETED + APPROVED + KP belum final)');
    sheet.getRange('AT1:AW1').setValues([['EDITED BY Admin Kab (Non-UB)', 'EDITED BY Admin Kab (UB)', 'COMPLETED BY Admin Kab (Non-UB)', 'COMPLETED BY Admin Kab (UB)']]);
    sheet.getRange('AT2:AW11').setValues(all.map(r=>[r.nonUb.editedByAdmin||0,r.ub.editedByAdmin||0,r.nonUb.completedByAdmin||0,r.ub.completedByAdmin||0]));
    sheet.getRange('X1').setValue('Progres PML Non UB (completed, approved, edited, reject, revoked; termasuk admin)');
    sheet.getRange('AC1').setValue('Progres PML UB (completed, approved, edited, reject, revoked; termasuk admin)');
    sheet.getRange('Y1').setValue('Olah final Non UB (COMPLETED Pengawas/Admin + APPROVED)');
    sheet.getRange('AD1').setValue('Olah final UB (COMPLETED Pengawas/Admin + APPROVED + KP belum final)');
    const today = dateSerial_(snapshot.date);
    const day = today - dateSerial_('2026-11-01') + 1;
    const targets = [27,23];
    const deadline = targets.map(d => dateSerial_('2026-11-' + d));
    sheet.getRange('AK2:AL7').setValues([deadline, [today,today], deadline.map(d => d-today),
      [day,day], targets.map(d => 1/d), targets.map(d => day/d)]);
    // AK8:AK9 dan AL8:AL9 adalah dua area gabungan pada template.
    sheet.getRange('AK8').setValue((day-1)/27);
    sheet.getRange('AL8').setValue((day-1)/23);
    SpreadsheetApp.flush();
    if (!existing) {
      sheet.setName(name);
      book.setActiveSheet(sheet);
      book.moveActiveSheet(book.getNumSheets());
      SpreadsheetApp.flush();
    }
    return name;
  } catch(error) {
    if (!existing && sheet.getName() === pendingName) book.deleteSheet(sheet);
    throw error;
  }
}

// Sinkronisasi dari editor setelah memasang integrasi atau mengganti tujuan.
function syncLatestReport() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = verifySheet_(openBook_().getSheetByName(SHEET_NAME));
    const dates = dates_(sheet);
    const latest = dates.reduce((a,b) => a > b ? a : b, '');
    if (!latest) throw new Error('Belum ada snapshot tersimpan.');
    const snapshot = latestRecord_(sheet, latest).snapshot;
    if (!validSnapshot_(snapshot)) throw new Error('Snapshot terbaru tidak valid.');
    const name = writeReport_(snapshot);
    if (!name) throw new Error('Isi Script Property REPORT_SPREADSHEET_ID.');
    console.log('Tab laporan tersinkron: ' + name);
    return name;
  } finally {
    lock.releaseLock();
  }
}

// Jalankan sekali dari editor untuk memperbarui final pada riwayat yang telah tersimpan.
function recalculateStoredFinals() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = verifySheet_(openBook_().getSheetByName(SHEET_NAME));
    const count = sheet.getLastRow() - 1;
    if (count < 1) return 0;
    const rows = sheet.getRange(2,3,count,1).getValues();
    const updated = rows.map(row => {
      const snapshot = JSON.parse(row[0]);
      if (!validSnapshot_(snapshot)) throw new Error('Snapshot riwayat tidak valid.');
      return [JSON.stringify(normalizedSnapshot_(snapshot))];
    });
    sheet.getRange(2,3,count,1).setValues(updated);
    SpreadsheetApp.flush();
    console.log('Olah final dihitung ulang untuk ' + count + ' snapshot.');
    return count;
  } finally {
    lock.releaseLock();
  }
}
