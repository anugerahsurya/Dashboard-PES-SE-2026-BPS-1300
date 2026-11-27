import { validExploration } from './exploration.js';
import { isProgressComplete, progressRegionCodes } from './data.js';

export function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

const STATUS_FIELDS = {
  sls: ['belum', 'sedang', 'selesai'],
  nonUb: ['open', 'draft', 'submitted', 'completed', 'rejected', 'revoked'],
  ub: ['open', 'draft', 'submitted', 'completed', 'rejected', 'revoked']
};

function validGroup(group, category) {
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
      kpAlreadyFinal > (group.completed || 0) + completedByAdmin + editedByAdmin + approved) return false;
  if (!Number.isSafeInteger(approved) || approved < 0) return false;
  if (!Number.isSafeInteger(rejectedByAdmin) || rejectedByAdmin < 0) return false;
  if (group.target !== statuses.reduce((sum, key) => sum + group[key], 0) + approved + rejectedByAdmin + movedKp + editedByAdmin + completedByAdmin) return false;
  if (category === 'sls') return true;
  const previousFinal = group.completed + completedByAdmin + approved + movedKp;
  const validFinal = group.final === previousFinal + editedByAdmin ||
    group.final === previousFinal ||
    (kp === 0 && completedByAdmin === 0 && group.final === group.completed);
  return validFinal &&
    group.pml === group.completed + completedByAdmin + editedByAdmin + approved + movedKp + group.rejected + rejectedByAdmin + group.revoked &&
    group.ppl === group.pml + group.submitted;
}

export function validSnapshot(s) {
  if (!s || !validDate(s.date) || typeof s.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) return false;
  const expected = new Set(progressRegionCodes);
  if (!Array.isArray(s.rows) || s.rows.length !== expected.size || !s.totals) return false;
  if (s.exploration !== undefined && !validExploration(s.exploration, [...expected])) return false;
  const categories = Object.keys(STATUS_FIELDS);
  for (const row of s.rows) {
    if (!row || !expected.delete(row.code) || typeof row.name !== 'string' || !row.name.trim() || !validDate(row.deadline)) return false;
    if (!categories.every(category => validGroup(row[category], category))) return false;
  }
  if (s.progressSource !== undefined) {
    const source = s.progressSource;
    if (!source || !validDate(source.date) || typeof source.time !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(source.time) || Object.keys(source).length !== 2 ||
      source.date + 'T' + source.time > s.date + 'T' + s.time ||
      !isProgressComplete(s.rows) || !s.exploration?.every(row => row.ub?.kpByStatus)) return false;
  } else if (s.exploration?.some(({ code, ub }) => {
    const progress = s.rows.find(row => row.code === code).ub;
    return ub && (ub.total !== progress.target || ub.kp !== (progress.kp ?? 0));
  })) return false;
  return categories.every(category => {
    const total = s.totals[category];
    if (!validGroup(total, category)) return false;
    return Object.keys(total).every(key => total[key] === s.rows.reduce((sum, row) => sum + (row[category][key] === undefined && (key === 'approved' || key === 'rejectedByAdmin' || key === 'kp' || key === 'kpAlreadyFinal' || key === 'kpFromDraft' || key === 'editedByAdmin' || key === 'completedByAdmin') ? 0 : row[category][key]), 0));
  });
}
