import landscapeUrl from './landscape.svg';
import { paceTarget } from './Pace.jsx';

const WIDTH = 1920;
const HEIGHT = 1080;
const MARGIN = 48;
const INNER = WIDTH - 2 * MARGIN;
const font = '"Plus Jakarta Sans Variable", "Segoe UI", sans-serif';
const ink = '#252d28';
const muted = '#545f58';
const page = '#faf8f3';
const integer = new Intl.NumberFormat('id-ID');
const fullDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatters = [0, 1, 2].map(digits => new Intl.NumberFormat('id-ID', {
  style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits
}));
const dateOf = value => new Date(value + 'T00:00:00Z');
const percentage = (n, target, digits) => target ? formatters[digits].format(n / target) : '—';

// Widths are measured in layout pixels before scaling up the exported bitmap.
const groups = [
  { key: 'area', label: 'Wilayah', tint: '#ebece5', color: '#4a584d', columns: [
    ['Kabupaten/kota', 'name', 247], ['Tenggat', 'deadline', 96]
  ] },
  { key: 'sls', label: 'Status SLS', tint: '#e0ede5', color: '#35634d', columns: [
    ['Target', 'target', 76], ['Belum', 'belum', 75], ['Sedang', 'sedang', 78], ['Selesai', 'selesai', 79]
  ] },
  { key: 'nonUb', label: 'PES SE2026 · Non-UB', tint: '#fae3cb', color: '#814219', columns: [
    ['Target', 'target', 100], ['Petugas', 'officers', 91], ['Draf', 'draft', 108], ['PPL', 'ppl', 110], ['PML', 'pml', 110], ['Final', 'final', 110]
  ] },
  { key: 'ub', label: 'PES SE2026 · UB', tint: '#e2eaf3', color: '#415a7a', columns: [
    ['Target', 'target', 82], ['Petugas', 'officers', 90], ['PPL', 'ppl', 97], ['PML', 'pml', 97], ['Final', 'final', 98]
  ] }
];

function displayValue(row, group, field) {
  if (field === 'name') return row.name;
  if (field === 'deadline') return row.deadline ? shortDate.format(dateOf(row.deadline)) : '—';
  const counts = row[group];
  if (group === 'sls' || field === 'target' || field === 'officers') return integer.format(counts[field]);
  return percentage(counts[field], counts.target, group === 'ub' ? 1 : 2);
}

export async function exportReport(data) {
  const landscape = new Image();
  landscape.src = landscapeUrl;
  await Promise.all([landscape.decode(), document.fonts.load('600 24px ' + font), document.fonts.ready]);
  const canvas = document.createElement('canvas');
  const scale = 1.5;
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Peramban gagal menyiapkan gambar laporan.');
  ctx.scale(scale, scale);
  function box(x, y, w, h, fill, radius = 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }
  function text(value, x, y, size, color = ink, weight = 550, align = 'left', maxWidth = WIDTH) {
    ctx.fillStyle = color;
    ctx.font = weight + ' ' + size + 'px ' + font;
    ctx.textAlign = align;
    ctx.fillText(String(value), x, y, maxWidth);
  }

  box(0, 0, WIDTH, HEIGHT, page);
  const hero = ctx.createLinearGradient(0, 0, WIDTH, 0);
  hero.addColorStop(0, '#fff5e7');
  hero.addColorStop(1, '#ffead2');
  box(0, 0, WIDTH, 250, hero);
  const artHeight = 308;
  const aspect = landscape.naturalWidth / landscape.naturalHeight;
  const artWidth = artHeight * aspect;
  const art = document.createElement('canvas');
  art.width = Math.ceil(artWidth * scale);
  art.height = Math.ceil(artHeight * scale);
  const artist = art.getContext('2d');
  artist.drawImage(landscape, 0, 0, art.width, art.height);
  const edge = artist.createLinearGradient(0, 0, art.width * 0.25, 0);
  edge.addColorStop(0, 'transparent');
  edge.addColorStop(1, '#000');
  artist.globalCompositeOperation = 'destination-in';
  artist.fillStyle = edge;
  artist.fillRect(0, 0, art.width, art.height);
  ctx.drawImage(art, WIDTH - artWidth, -32, artWidth, artHeight);
  const fade = ctx.createLinearGradient(0, 130, 0, 278);
  fade.addColorStop(0, 'rgba(250,248,243,0)');
  fade.addColorStop(1, page);
  box(0, 130, WIDTH, 148, fade);
  box(0, 0, WIDTH, 7, '#f79039');
  text('BPS PROVINSI SUMATERA BARAT', MARGIN, 58, 22, '#78441e', 750);
  text('Progres PES SE2026', MARGIN - 3, 141, 77, ink, 750);
  text('Post Enumeration Survey Sensus Ekonomi 2026', MARGIN, 183, 27, muted, 550);
  text(fullDate.format(dateOf(data.date)) + '   ·   ' + data.time + ' WIB', MARGIN, 228, 25, '#77451f', 700);

  const headerTop = 268;
  const groupHeight = 44;
  const labelHeight = 46;
  const bodyTop = headerTop + groupHeight + labelHeight;
  const rows = [...data.rows, { name: 'Sumatera Barat', ...data.totals }];
  const bodyBottom = 888;
  const rowHeight = (bodyBottom - bodyTop) / rows.length;
  rows.forEach((row, index) => {
    const y = bodyTop + index * rowHeight;
    const total = index === rows.length - 1;
    box(MARGIN, y, INNER, rowHeight, total ? '#f4e3cb' : index % 2 ? '#f2f2eb' : '#ffffff');
    if (total) box(MARGIN, y, INNER, 2, '#d59a5e');
  });
  const nominalWidth = groups.reduce((sum, group) => sum + group.columns.reduce((n, col) => n + col[2], 0), 0);
  let x = MARGIN;
  groups.forEach(group => {
    const start = x;
    const width = group.columns.reduce((sum, col) => sum + col[2] * INNER / nominalWidth, 0);
    box(start, headerTop, width, groupHeight, group.tint);
    box(start, headerTop + groupHeight, width, labelHeight, '#fbfcf8');
    text(group.label, start + width / 2, headerTop + 29, 22, group.color, 750, 'center', width - 12);
    group.columns.forEach(([caption, field, nominal]) => {
      const colWidth = nominal * INNER / nominalWidth;
      const at = field === 'name' ? x + 12 : x + colWidth / 2;
      const align = field === 'name' ? 'left' : 'center';
      text(caption, at, bodyTop - 16, 19.5, group.color, 680, align, colWidth - 10);
      rows.forEach((row, idx) => {
        const total = idx === rows.length - 1;
        const highlighted = field === 'final' || field === 'selesai';
        const size = field === 'name' ? 22 : 21.5;
        text(displayValue(row, group.key, field), at, bodyTop + (idx + 0.5) * rowHeight + 7.5, size,
          highlighted ? group.color : ink, total || highlighted ? 750 : field === 'name' ? 620 : 530, align, colWidth - 14);
      });
      x += colWidth;
    });
    if (start > MARGIN) box(start, headerTop, 1.5, bodyBottom - headerTop, '#d5d8cd');
  });

  text('Target progres harian', MARGIN, 932, 28, ink, 730);
  const benchmarkY = 950;
  const half = (INNER - 20) / 2;
  ['2026-11-23', '2026-11-27'].forEach((deadline, index) => {
    const left = MARGIN + index * (half + 20);
    box(left, benchmarkY, half, 66, '#efeee5', 12);
    text('Tenggat ' + shortDate.format(dateOf(deadline)), left + 20, benchmarkY + 42, 23, ink, 720);
    const ppl = formatters[2].format(paceTarget(data.date, deadline, 'ppl'));
    const pml = formatters[2].format(paceTarget(data.date, deadline, 'pml'));
    text('PPL   ' + ppl + '     ·     PML / Final   ' + pml, left + half - 20, benchmarkY + 42, 22, muted, 600, 'right');
  });
  text('Tim IT BPS Provinsi Sumatera Barat', MARGIN, 1058, 20, muted, 650);
  text(data.rows.length + ' kabupaten/kota', WIDTH - MARGIN, 1058, 20, muted, 550, 'right');

  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    image => image ? resolve(image) : reject(new Error('Gagal membuat PNG.')), 'image/png'
  ));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'PES-SE2026-Sumbar-' + data.date + '-' + data.time.replace(':', '') + '.png';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
