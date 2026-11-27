import { jsPDF } from 'jspdf';
import { explorationView, explorationViews, familyComposition } from './exploration.js';

const width = 960;
const height = 540;
const ink = '#262a28';
const muted = '#565d53';
const accent = '#a64d19';
const orange = '#f79039';
const numbers = new Intl.NumberFormat('id-ID');
const percents = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 2 });
const dates = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function write(doc, value, x, y, { size = 12, color = ink, bold = false, align = 'left', maxWidth } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color);
  doc.text(value, x, y, { align, maxWidth });
}

function fill(doc, color, x, y, w, h) {
  doc.setFillColor(color);
  doc.rect(x, y, w, h, 'F');
}

function frame(doc, mark, stamp) {
  fill(doc, '#fffdf9', 0, 0, width, height);
  fill(doc, '#fff0dc', 0, 0, width, 66);
  fill(doc, orange, 0, 0, width, 5);
  doc.addImage(mark, 'PNG', 29, 18, 32, 32, 'pes-monitor');
  write(doc, 'BPS Provinsi Sumatera Barat', 74, 33, { size: 16, bold: true });
  write(doc, 'Post Enumeration Survey Sensus Ekonomi 2026', 74, 49, { size: 11, color: muted });
  write(doc, stamp, 928, 39, { size: 13, color: accent, bold: true, align: 'right' });
  fill(doc, '#ebdfd0', 32, 510, 896, 1);
  write(doc, 'PES Monitor  ·  Tim IT BPS Provinsi Sumatera Barat', 32, 527, { size: 10, color: muted });
  write(doc, String(doc.getNumberOfPages()), 928, 527, { size: 10, color: muted, align: 'right' });
}

function chartPage(doc, view, category) {
  const isUb = category === 'ub';
  const totalsOnly = isUb && view.entries.length === 0;
  const counts = [...view.rows, { ...view.total, name: 'Sumatera Barat' }];
  const entries = totalsOnly ? [['total', 'Total assignment', '#387760']] : view.entries;
  const maxRegion = Math.max(...view.rows.map(row => row.total), 1);
  const highest = totalsOnly ? Math.ceil(maxRegion / 20) * 20 : 1;
  const ratio = (row, key) => totalsOnly ? row.total / highest : row.total ? row.values[key] / row.total : 0;
  const start = 413;
  const end = 869;
  const top = 131;
  const rowHeight = 25;
  const plotRows = totalsOnly ? view.rows : counts;
  const bottom = top + plotRows.length * rowHeight;
  const line = end - start;

  fill(doc, '#fff0dc', 24, 86, 229, 407);
  fill(doc, orange, 24, 86, 5, 407);
  write(doc, 'EKSPLORASI', 43, 119, { size: 13, color: accent, bold: true });
  write(doc, view.label, 41, 167, { size: 36, bold: true, maxWidth: 199 });
  const subtitle = totalsOnly ? 'Total assignment per kabupaten/kota' :
    isUb ? 'Persentase aktif per kabupaten/kota' : 'Komposisi status pendataan per kabupaten/kota';
  write(doc, subtitle, 43, 248, { size: 15, color: muted, maxWidth: 182 });
  write(doc, numbers.format(view.total.total), 43, 340, { size: 35, bold: true, color: accent });
  write(doc, 'Total Sumatera Barat', 44, 358, { size: 12, color: muted });
  write(doc, view.rows.length + ' kabupaten/kota peserta', 44, 470, { size: 12, color: muted });

  write(doc, 'Kabupaten/kota', start - 10, 110, { size: 10, color: muted, bold: true, align: 'right' });
  write(doc, 'Jumlah', 925, 110, { size: 10, color: muted, bold: true, align: 'right' });

  for (const tick of [0, .25, .50, .75, 1]) {
    const x = start + tick * line;
    fill(doc, '#eadfd2', x, top - 4, .65, bottom - top + 4);
    write(doc, totalsOnly ? numbers.format(highest * tick) : percents.format(tick), x, bottom + 13,
      { size: 9, color: muted, align: 'center' });
  }

  plotRows.forEach((row, index) => {
    const regionalTotal = index === view.rows.length;
    const y = top + index * rowHeight;
    if (regionalTotal) fill(doc, '#f9eddb', 264, y + 1, 664, rowHeight - 2);
    write(doc, row.name, start - 10, y + 15, { size: 11, bold: regionalTotal, align: 'right' });
    write(doc, numbers.format(row.total), 925, y + 15, { size: 11, bold: regionalTotal, align: 'right' });
    let x = start;
    entries.forEach(([key, , color]) => {
      const segmentWidth = line * ratio(row, key);
      if (segmentWidth > 0) fill(doc, color, x, y + 5, segmentWidth, 12);
      x += segmentWidth;
    });
  });

  entries.forEach(([key, label, color], index) => {
    const x = 274 + (index % 3) * 220;
    const y = 423 + Math.floor(index / 3) * 24;
    fill(doc, color, x, y - 7, 8, 8);
    write(doc, /^\d$/.test(key) ? key + '. ' + label : label, x + 13, y, { size: 10, color: muted, maxWidth: 195 });
  });
}

function compositionPage(doc, total) {
  const segments = familyComposition(total);
  write(doc, 'KEBERADAAN HASIL PEMUTAKHIRAN', 38, 111, { size: 24, bold: true });
  fill(doc, orange, 38, 127, 238, 27);
  write(doc, 'PEMUTAKHIRAN KELUARGA', 51, 145, { size: 13, bold: true });

  const cx = 258, cy = 327, radius = 143;
  doc.setFillColor('#eee7db');
  doc.circle(cx, cy, radius, 'F');
  let start = -Math.PI / 2;
  for (const [, count, color] of segments) {
    const sweep = total.total ? Math.PI * 2 * count / total.total : 0;
    if (!sweep) continue;
    const steps = Math.ceil(sweep * 26);
    const points = [[cx, cy]];
    for (let i = 0; i <= steps; i++) {
      const angle = start + sweep * i / steps;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    const vectors = points.slice(1).map(([x, y], i) => [x - points[i][0], y - points[i][1]]);
    doc.setFillColor(color);
    doc.lines(vectors, cx, cy, [1, 1], 'F', true);
    start += sweep;
  }
  doc.setFillColor('#fffdf9');
  doc.circle(cx, cy, 65, 'F');
  write(doc, numbers.format(total.total), cx, cy + 3, { size: 27, bold: true, align: 'center' });
  write(doc, 'Total keluarga', cx, cy + 22, { size: 12, color: muted, align: 'center' });

  segments.forEach(([label, count, color], index) => {
    const y = 207 + index * 48;
    fill(doc, color, 475, y - 9, 10, 10);
    write(doc, label, 496, y, { size: 16, bold: true });
    write(doc, numbers.format(count) + ' keluarga', 496, y + 17, { size: 11, color: muted });
    write(doc, total.total ? percents.format(count / total.total) : '-', 912, y, { size: 19, bold: true, align: 'right' });
  });
  write(doc, 'Kelompok tidak eligible mencakup status 0, 3, 4, 5, dan 6.', 475, 356, { size: 12, color: muted });
  const unavailable = total.values['5'];
  if (unavailable > 0) {
    fill(doc, '#fbdfb9', 475, 377, 440, 79);
    write(doc, 'PERLU PERHATIAN', 489, 399, { size: 13, bold: true, color: accent });
    write(doc, numbers.format(unavailable) + ' keluarga berstatus tidak dapat ditemui sampai akhir pendataan.',
      489, 420, { size: 13, maxWidth: 408 });
  }
}

export async function exportExploration(data) {
  const views = Object.keys(explorationViews).map(category => [category, explorationView(data, category)])
    .filter(([, view]) => view.rows.length);
  if (!views.length) throw new Error('Data eksplorasi belum tersedia.');

  const image = new Image();
  image.src = '/pes-monitor.svg';
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Peramban gagal menyiapkan gambar laporan.');
  context.drawImage(image, 0, 0, 96, 96);
  const mark = canvas.toDataURL('image/png');
  const stamp = dates.format(new Date(data.date + 'T00:00:00Z')) + '  ·  ' + data.time.replace(':', '.') + ' WIB';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [width, height], compress: true });
  doc.setProperties({ title: 'Eksplorasi PES SE2026 Sumatera Barat', author: 'BPS Provinsi Sumatera Barat' });

  const family = views.find(([category]) => category === 'family')?.[1];
  if (family) {
    frame(doc, mark, stamp);
    compositionPage(doc, family.total);
  }
  views.forEach(([category, view], index) => {
    if (family || index > 0) doc.addPage();
    frame(doc, mark, stamp);
    chartPage(doc, view, category);
  });

  doc.save('Eksplorasi-PES-SE2026-Sumbar-' + data.date + '-' + data.time.replace(':', '') + '.pdf');
}
