const formats = [1, 2].map(digits => new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: 'exceptZero',
}));

export function previousDate(date) {
  const day = new Date(date + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

export function deltaLabel(current, previous, field, groupName) {
  if (!(current?.target > 0 && previous?.target > 0) ||
      !Number.isFinite(current[field]) || !Number.isFinite(previous[field])) return '—';
  const points = 100 * (current[field] / current.target - previous[field] / previous.target);
  return formats[groupName === 'ub' ? 0 : 1].format(points) + '%';
}
