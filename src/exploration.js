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
  ['7', 'Data dari Kantor Pusat (KP)', '#785db0'],
];

export const ubMetrics = [
  ['active', 'Keberadaan 1 (Aktif)', '#387760'],
  ['kp', 'Ada #KP', '#785db0'],
  ['unentered', 'Belum entri root', '#bd8612'],
];

const ubHeaders = {
  total: 'ub total assignment',
  active: 'ub keberadaan 1 (aktif)',
  kp: 'ub ada #kp',
  unentered: 'ub belum entri root',
};
const statusGroups = [
  ['family', 'kk', familyStatuses],
  ['bang', 'usaha (bang=1)', businessStatuses],
  ['household', 'usaha (nama kk)', businessStatuses],
];

export function readExploration(header, records, codes) {
  const names = header.map(name => name.toLowerCase().replace(/\s+/g, ' '));
  const codeIndex = names.indexOf('kab/kot');
  if (codeIndex < 0) throw new Error('CSV eksplorasi memerlukan kolom Kab/Kot.');
  const columns = statusGroups.map(([group, prefix, statuses]) => [
    group,
    statuses.map(([code]) => {
      const indices = names.flatMap((name, i) => name.startsWith(prefix + ' ' + code + '.') ? [i] : []);
      if (indices.length !== 1) throw new Error('CSV eksplorasi memerlukan satu kolom ' + prefix + ' ' + code + '.');
      return [code, indices[0]];
    }),
  ]);
  const ubColumns = Object.entries(ubHeaders).map(([key, name]) => [key, names.indexOf(name)]);
  if (ubColumns.some(([, index]) => index >= 0)) {
    if (ubColumns.some(([, index]) => index < 0 || names.lastIndexOf(names[index]) !== index)) {
      throw new Error('CSV eksplorasi memerlukan empat kolom UB yang unik.');
    }
    columns.push(['ub', ubColumns]);
  }
  const seen = new Set();
  const rows = records.map(record => {
    const code = record[codeIndex];
    if (record.length !== names.length || !codes.includes(code) || seen.has(code)) {
      throw new Error('Baris CSV eksplorasi tidak valid untuk wilayah ' + (code || '(kosong)') + '.');
    }
    seen.add(code);
    return {
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
  });
  if (!validExploration(rows, codes)) throw new Error('Cakupan wilayah atau rekap jumlah pada CSV eksplorasi tidak valid.');
  return new Map(rows.map(row => [row.code, row]));
}

export function validExploration(rows, codes) {
  if (!Array.isArray(rows) || rows.length !== codes.length) return false;
  const remaining = new Set(codes);
  const withUb = rows[0]?.ub !== undefined;
  const groups = statusGroups.map(([group, , statuses]) => [group, statuses.map(([code]) => code)]);
  if (withUb) groups.push(['ub', Object.keys(ubHeaders)]);
  const validCounts = (counts, keys) => counts && Object.keys(counts).length === keys.length &&
    keys.every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0) &&
    Number.isSafeInteger(keys.reduce((sum, key) => sum + counts[key], 0));
  return rows.every(row => row && remaining.delete(row.code) &&
    Object.keys(row).length === groups.length + 1 &&
    groups.every(([group, keys]) => validCounts(row[group], keys)) &&
    (!withUb || ubMetrics.every(([key]) => row.ub[key] <= row.ub.total))) &&
    groups.every(([group, keys]) => Number.isSafeInteger(rows.reduce((sum, row) =>
      keys.reduce((total, key) => total + row[group][key], sum), 0)));
}
