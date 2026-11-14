import { paceTarget } from './Pace.jsx';

const WIDTH = 1200;
const PAD = 44;
const INNER = WIDTH - 2 * PAD;
const ROW = 56;
const ink = '#292c22';
const muted = '#575d50';
const palette = {
  sls: { accent: '#366554', light: '#e7f1e9', bar: '#547e67' },
  nonUb: { accent: '#8c441a', light: '#fff0dc', bar: '#e58436' },
  ub: { accent: '#445b82', light: '#eaf0f7', bar: '#6483ab' }
};
const integer = new Intl.NumberFormat('id-ID');
const fullDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const percentages = [0, 1, 2].map(digits => new Intl.NumberFormat('id-ID', {
  style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits
}));
const dateOf = value => new Date(value + 'T00:00:00Z');
const percent = (n, target, digits) => target ? percentages[digits].format(n / target) : '—';

export async function exportReport(data) {
  await document.fonts.ready;
  const deadlines = [...new Set(data.rows.map(r => r.deadline))].sort();
  const sectionHeight = 154 + ROW * (data.rows.length + 1);
  const height = 392 + 3 * sectionHeight + 200;
  const canvas = document.createElement('canvas');
  const scale = 1.5;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Peramban gagal menyiapkan gambar laporan.');
  ctx.scale(scale, scale);
  const font = '"Anthropic Sans", "Segoe UI", Arial, sans-serif';
  function box(x, y, w, h, fill, radius = 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  }
  function text(value, x, y, size, color = ink, weight = 500, align = 'left', maxWidth) {
    ctx.fillStyle = color;
    ctx.font = weight + ' ' + size + 'px ' + font;
    ctx.textAlign = align;
    if (maxWidth) ctx.fillText(String(value), x, y, maxWidth);
    else ctx.fillText(String(value), x, y);
  }

  box(0, 0, WIDTH, height, '#faf8f2');
  box(0, 0, WIDTH, 10, '#f79039');
  text('BPS PROVINSI SUMATERA BARAT', PAD, 57, 20, muted, 750);
  text(fullDate.format(dateOf(data.date)) + '   ·   ' + data.time + ' WIB', WIDTH - PAD, 57, 20, muted, 600, 'right');
  text('Progres PES SE2026', PAD - 2, 132, 66, ink, 720);
  text('Post Enumeration Survey Sensus Ekonomi 2026', PAD, 170, 25, muted);

  const metrics = [
    ['sls', 'SLS selesai', 'selesai', 0],
    ['nonUb', 'Final Non-UB', 'final', 2],
    ['ub', 'Final UB', 'final', 1]
  ];
  const gap = 16;
  const cardWidth = (INNER - 2 * gap) / 3;
  metrics.forEach(([group, title, field, digits], i) => {
    const { accent, light, bar } = palette[group];
    const { [field]: done, target } = data.totals[group];
    const x = PAD + i * (cardWidth + gap);
    box(x, 199, cardWidth, 164, light, 16);
    text(title, x + 20, 236, 22, accent, 700);
    text(percent(done, target, digits), x + 18, 293, 48, ink, 700);
    text(integer.format(done) + ' dari ' + integer.format(target), x + 21, 326, 21, muted);
    box(x + 20, 343, cardWidth - 40, 5, '#ffffff', 2);
    if (done && target) box(x + 20, 343, (cardWidth - 40) * Math.min(1, done / target), 5, bar, 2);
  });

  // Each assignment cell pairs the workbook percentage with its underlying count.
  const rows = [...data.rows, { name: 'Sumatera Barat', ...data.totals }];
  function drawSection(group, title, top) {
    const isSls = group === 'sls';
    const { accent, light } = palette[group];
    const digits = isSls ? 0 : group === 'ub' ? 1 : 2;
    const columns = isSls
      ? [['Tenggat', 407], ['Target', 550], ['Belum', 704], ['Sedang', 875], ['Selesai', 1060]]
      : [['Petugas PPL', 380], ['Target', 509], ['Draf', 641], ['PPL', 785], ['PML', 930], ['Final', 1075]];
    box(PAD, top + 4, 6, 35, accent, 3);
    text(title, PAD + 18, top + 33, 32, ink, 720);
    text(isSls ? 'Jumlah SLS dan persentase terhadap target wilayah' : 'Persentase terhadap target wilayah dan jumlah penugasan', PAD + 18, top + 65, 19, muted);
    const head = top + 82;
    box(PAD, head, INNER, 44, light, 9);
    text('Kabupaten/kota', PAD + 15, head + 29, 19, accent, 700);
    columns.forEach(([caption, x]) => text(caption, x, head + 29, 19, accent, 700, 'center'));
    rows.forEach((row, idx) => {
      const y = head + 44 + ROW * idx;
      const total = idx === rows.length - 1;
      const counts = row[group];
      box(PAD, y, INNER, ROW - 1, total ? light : idx % 2 ? '#f4f3ec' : '#ffffff');
      text(row.name, PAD + 15, y + 35, 22, total ? accent : ink, total ? 750 : 600, 'left', 275);
      if (isSls) {
        text(row.deadline ? shortDate.format(dateOf(row.deadline)) : '—', columns[0][1], y + 35, 21, muted, 500, 'center');
      } else {
        text(integer.format(counts.officers), columns[0][1], y + 35, 22, ink, 600, 'center');
      }
      text(integer.format(counts.target), columns[1][1], y + 35, 22, ink, 650, 'center');
      const fields = isSls ? ['belum', 'sedang', 'selesai'] : ['draft', 'ppl', 'pml', 'final'];
      fields.forEach((key, index) => {
        const x = columns[index + 2][1];
        const primary = isSls ? integer.format(counts[key]) : percent(counts[key], counts.target, digits);
        const secondary = isSls ? percent(counts[key], counts.target, digits) : integer.format(counts[key]);
        text(primary, x, y + 25, 22, index === fields.length - 1 ? accent : ink, 680, 'center');
        text(secondary, x, y + 46, 17, muted, 500, 'center');
      });
    });
  }
  drawSection('sls', 'Progres SLS', 392);
  drawSection('nonUb', 'Pencacahan Non-UB', 392 + sectionHeight);
  drawSection('ub', 'Pencacahan UB', 392 + 2 * sectionHeight);

  const bottom = 392 + 3 * sectionHeight;
  text('Tolok ukur progres pada tanggal laporan', PAD, bottom + 28, 29, ink, 700);
  const card = (INNER - gap * (deadlines.length - 1)) / deadlines.length;
  deadlines.forEach((deadline, i) => {
    const x = PAD + i * (card + gap);
    const ppl = paceTarget(data.date, deadline, 'ppl');
    const pml = paceTarget(data.date, deadline, 'pml');
    box(x, bottom + 49, card, 84, '#eeeee4', 10);
    text('Tenggat ' + shortDate.format(dateOf(deadline)), x + 16, bottom + 80, 21, ink, 650);
    text('PPL ' + percentages[2].format(ppl) + '   ·   PML/final ' + percentages[2].format(pml), x + 16, bottom + 111, 18, muted, 500, 'left', card - 32);
  });
  box(PAD, height - 45, INNER, 1, '#d1d2c6');
  text('Tim IT BPS Provinsi Sumatera Barat', PAD, height - 16, 18, muted, 600);
  text(data.rows.length + ' kabupaten/kota', WIDTH - PAD, height - 16, 18, muted, 500, 'right');

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
