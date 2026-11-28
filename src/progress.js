// Kelima wilayah ini belum final di kedua kategori pada laporan 25 November 19.20 WIB.
const extendedRegions = new Set(['1306', '1307', '1309', '1312', '1376']);

export function reportingDeadline(row, date, time) {
  if (extendedRegions.has(row.code) && date + 'T' + time >= '2026-11-25T19:20') return '2026-11-27';
  if (row.deadline === '2026-11-23' && ['1307', '1309'].includes(row.code)) return '2026-11-25';
  return row.deadline;
}

export function targetDeadlines(rows) {
  return [...new Set(rows.map(row => row.deadline))].sort();
}

export function isFinalComplete(row) {
  return [row.nonUb, row.ub].every(group => group.target > 0 && group.final === group.target);
}

export const assignmentColumns = {
  open: 'open',
  draft: 'draft',
  'submitted by pencacah': 'submitted',
  'completed by pengawas': 'completed',
  'approved by pengawas': 'approved',
  'edited by admin kabupaten': 'editedByAdmin',
  'completed by admin kabupaten': 'completedByAdmin',
  'rejected by pengawas': 'rejected',
  'rejected by admin kabupaten': 'rejectedByAdmin',
  'revoked by pengawas': 'revoked',
};

export const stageNotes = {
  ppl: 'all except draft dan open',
  pml: 'completed, approved, edited admin, reject, revoked (termasuk admin)',
  final: 'COMPLETED (Pengawas/Admin) + EDITED Admin + APPROVED + KP yang dipindahkan (UB)',
  gap: 'PPL dikurangi PML',
};

export function progressValue(group, stage) {
  return stage === 'gap' ? group.ppl - group.pml : (group[stage] ?? 0);
}

export function targetRatio(date, deadline, stage) {
  const day = value => (Date.parse(value + 'T00:00:00Z') - Date.UTC(2026,10,1)) / 86400000 + 1;
  return Math.min(1, (day(date) - (stage === 'ppl' ? 0 : 1)) / day(deadline));
}

export function achievement(rows, category, stage, date) {
  if (!['ppl','pml','final'].includes(stage)) return null;
  const total = rows.reduce((sum,row)=>sum+row[category].target,0);
  if (!total) return null;
  const actual = rows.reduce((sum,row)=>sum+row[category][stage],0)/total;
  const target = rows.reduce((sum,row)=>sum+row[category].target * targetRatio(date,row.deadline,stage),0)/total;
  return {met:actual>=target, target, label:actual>=target?'Mencapai target':'Di bawah target'};
}
