export const stageNotes = {
  ppl: 'all except draft dan open',
  pml: 'completed, approved, edited admin, reject, revoked (termasuk admin)',
  final: 'COMPLETED (Pengawas/Admin) + APPROVED + KP (UB)',
  gap: 'PPL dikurangi PML',
};

export function progressValue(group, stage) {
  return stage === 'gap' ? group.ppl - group.pml : (group[stage] ?? 0);
}

export function targetRatio(date, deadline, stage) {
  const day = value => (Date.parse(value + 'T00:00:00Z') - Date.UTC(2026,10,1)) / 86400000 + 1;
  return (day(date) - (stage === 'ppl' ? 0 : 1)) / day(deadline);
}

export function achievement(rows, category, stage, date) {
  if (!['ppl','pml','final'].includes(stage)) return null;
  const total = rows.reduce((sum,row)=>sum+row[category].target,0);
  if (!total) return null;
  const actual = rows.reduce((sum,row)=>sum+row[category][stage],0)/total;
  const target = rows.reduce((sum,row)=>sum+row[category].target * targetRatio(date,row.deadline,stage),0)/total;
  return {met:actual>=target, target, label:actual>=target?'Mencapai target':'Di bawah target'};
}
