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
  if (group.target !== statuses.reduce((sum, key) => sum + group[key], 0)) return false;
  if (category === 'sls') return true;
  return group.final === group.completed &&
    group.pml === group.completed + group.rejected + group.revoked &&
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
    return Object.keys(total).every(key => total[key] === s.rows.reduce((sum, row) => sum + row[category][key], 0));
  });
}

function doGet(e) {
  try {
    const requested = (e.parameter || {}).date;
    if (requested !== undefined && !validDate_(requested)) return json_({ok: false, error: 'Tanggal laporan tidak valid.'});
    const sheet = verifySheet_(openBook_().getSheetByName(SHEET_NAME));
    const dates = dates_(sheet);
    const date = requested || dates.reduce((latest, current) => current > latest ? current : latest, '');
    const index = dates.indexOf(date);
    const snapshot = index < 0 ? null : JSON.parse(sheet.getRange(index + 2, 3).getValue());
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
  const snapshot = body.snapshot;
  if (!validSnapshot_(snapshot)) return json_({ok: false, error: 'Tanggal, wilayah, atau rekap status laporan tidak valid.'});
  const payload = JSON.stringify(snapshot);
  if (payload.length > 49000) return json_({ok: false, error: 'Snapshot terlalu besar untuk disimpan.'});
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ok: false, error: 'Admin lain sedang menyimpan. Coba lagi.'});
  try {
    const sheet = verifySheet_(openBook_().getSheetByName(SHEET_NAME));
    const index = dates_(sheet).indexOf(snapshot.date);
    const row = index < 0 ? sheet.getLastRow() + 1 : index + 2;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    sheet.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[snapshot.date, new Date().toISOString(), payload]]);
    SpreadsheetApp.flush();
    return json_({ok: true, snapshot: snapshot});
  } catch (error) {
    console.error(error.message);
    return json_({ok: false, error: 'Snapshot gagal disimpan. Periksa konfigurasi Apps Script.'});
  } finally {
    lock.releaseLock();
  }
}
