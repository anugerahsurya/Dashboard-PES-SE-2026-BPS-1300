import { assignmentColumns } from './progress.js';

export const familyStatuses = [
  ['0', 'Tidak ditemukan (STOP)', '#ac303b'],
  ['1', 'Ditemukan', '#387760'],
  ['2', 'Baru', '#e58b3d'],
  ['3', 'Meninggal', '#bd8612'],
  ['4', 'Tidak eligible', '#3d789d'],
  ['5', 'Tidak dapat ditemui sampai akhir pendataan', '#785db0'],
  ['6', 'Keluarga khusus', '#81495a'],
];

export const businessStatuses = [
  ['0', 'Tidak ditemukan', '#ac303b'],
  ['1', 'Ditemukan', '#387760'],
  ['2', 'Baru', '#e58b3d'],
  ['3', 'Tutup', '#bd8612'],
  ['4', 'Ganda', '#3d789d'],
];

export const bkuStatuses = [...businessStatuses, ['9', 'Non Respon', '#785db0']];

export const ubMetrics = [
  ['active', 'Keberadaan 1 (Aktif)', '#387760'],
];

const ubHeaders = {
  total: 'ub total assignment',
  active: 'ub keberadaan 1 (aktif)',
  kp: 'ub ada #kp',
  unentered: 'ub belum entri root',
};
const kpStatusHeader = 'ub #kp per status';
const businessCodes = businessStatuses.map(([code]) => code);
const statusGroups = [
  ['family', 'kk', familyStatuses.map(([code]) => code)],
  ['bang', 'usaha (bang=1)', businessCodes, ['7', '9']],
  ['household', 'usaha (nama kk)', businessCodes, ['7']],
];

export function readExploration(header, records, codes) {
  const names = header.map(name => name.toLowerCase().replace(/\s+/g, ' '));
  const codeIndex = names.indexOf('kab/kot');
  if (codeIndex < 0) throw new Error('CSV eksplorasi memerlukan kolom Kab/Kot.');
  const columns = statusGroups.map(([group, prefix, required, optional = []]) => [
    group,
    [...required, ...optional].flatMap(code => {
      const indices = names.flatMap((name, i) => name.startsWith(prefix + ' ' + code + '.') ? [i] : []);
      if (!indices.length && optional.includes(code)) return [];
      if (indices.length !== 1) throw new Error('CSV eksplorasi memerlukan satu kolom ' + prefix + ' ' + code + '.');
      return [[code, indices[0]]];
    }),
  ]);
  const ubColumns = Object.entries(ubHeaders).map(([key, name]) => [key, names.indexOf(name)]);
  const kpStatusIndex = names.indexOf(kpStatusHeader);
  if (ubColumns.some(([, index]) => index >= 0) || kpStatusIndex >= 0) {
    if (ubColumns.some(([key, index]) => (index < 0 && (key === 'total' || key === 'kp')) ||
      (index >= 0 && names.lastIndexOf(names[index]) !== index)) ||
      (kpStatusIndex >= 0 && names.lastIndexOf(kpStatusHeader) !== kpStatusIndex)) {
      throw new Error('CSV eksplorasi memerlukan kolom Total Assignment dan Ada #KP yang unik untuk UB.');
    }
    columns.push(['ub', ubColumns.filter(([, index]) => index >= 0)]);
  }
  const seen = new Set();
  const rows = records.map(record => {
    const code = record[codeIndex];
    if (record.length !== names.length || !codes.includes(code) || seen.has(code)) {
      throw new Error('Baris CSV eksplorasi tidak valid untuk wilayah ' + (code || '(kosong)') + '.');
    }
    seen.add(code);
    const row = {
      code,
      ...Object.fromEntries(columns.map(([group, fields]) => [group, Object.fromEntries(fields.map(([key, index]) => {
        const raw = record[index];
        const value = Number(raw);
        if (!/^\d+(?:\.0+)?$/.test(raw) || !Number.isSafeInteger(value)) {
          throw new Error('CSV eksplorasi ' + code + ' · nilai ' + header[index] + ' harus bilangan bulat nonnegatif.');
        }
        return [key, value];
      }))])),
    };
    if (kpStatusIndex >= 0) row.ub.kpByStatus = parseKpBreakdown(record[kpStatusIndex], code, row.ub.kp);
    return row;
  });
  if (!validExploration(rows, codes)) throw new Error('Cakupan wilayah atau rekap jumlah pada CSV eksplorasi tidak valid.');
  return new Map(rows.map(row => [row.code, row]));
}

function parseKpBreakdown(raw, code, total) {
  const values = {};
  if (!/^(?:'?-|–|—)?$/.test(raw)) {
    for (const entry of raw.split('|')) {
      const match = /^(.+):\s*(\d+)\s*$/.exec(entry.trim());
      const label = match?.[1].trim().toLowerCase().replace(/\s+/g, ' ');
      const count = Number(match?.[2]);
      if (!Object.hasOwn(assignmentColumns, label) || !Number.isSafeInteger(count) ||
        Object.hasOwn(values, assignmentColumns[label])) {
        throw new Error('#KP ' + code + ': status, jumlah, atau pengulangan pada rincian KP tidak valid.');
      }
      values[assignmentColumns[label]] = count;
    }
  }
  if (Object.values(values).reduce((sum, count) => sum + count, 0) !== total) {
    throw new Error('#KP ' + code + ': jumlah per status harus sama dengan UB Ada #KP.');
  }
  return values;
}

export function validExploration(rows, codes) {
  if (!Array.isArray(rows) || rows.length !== codes.length) return false;
  const remaining = new Set(codes);
  const withUb = rows[0]?.ub !== undefined;
  const groups = statusGroups.map(([group, , required, optional = []]) => [
    group,
    [...required, ...optional.filter(code => rows[0]?.[group]?.[code] !== undefined)],
  ]);
  const withBreakdown = withUb && rows[0].ub?.kpByStatus !== undefined;
  const ubKeys = Object.keys(ubHeaders).filter(key => key === 'total' || key === 'kp' || rows[0]?.ub?.[key] !== undefined);
  if (withUb) groups.push(['ub', ubKeys]);
  const statuses = new Set(Object.values(assignmentColumns));
  const validBreakdown = (counts, total) => counts && typeof counts === 'object' && !Array.isArray(counts) &&
    Object.entries(counts).every(([key, count]) => statuses.has(key) && Number.isSafeInteger(count) && count >= 0) &&
    Object.values(counts).reduce((sum, count) => sum + count, 0) === total;
  const validCounts = (counts, keys, extra) => counts && Object.keys(counts).length === keys.length + extra &&
    keys.every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0) &&
    Number.isSafeInteger(keys.reduce((sum, key) => sum + counts[key], 0));
  return rows.every(row => row && remaining.delete(row.code) &&
    Object.keys(row).length === groups.length + 1 &&
    groups.every(([group, keys]) => validCounts(row[group], keys, group === 'ub' && withBreakdown ? 1 : 0)) &&
    (!withUb || (ubKeys.every(key => row.ub[key] <= row.ub.total) &&
      (!withBreakdown || validBreakdown(row.ub.kpByStatus, row.ub.kp))))) &&
    groups.every(([group, keys]) => Number.isSafeInteger(rows.reduce((sum, row) =>
      keys.reduce((total, key) => total + row[group][key], sum), 0)));
}
