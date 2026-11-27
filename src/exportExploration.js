import { jsPDF } from 'jspdf';
import { explorationView, explorationViews, familyComposition } from './exploration.js';

const width = 960;
const height = 540;
const ink = '#262a28';
const muted = '#565d53';
const accent = '#bd501d';
const rule = '#d8d9d6';
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
  doc.addImage(mark, 'PNG', 789, 18, 150, 150 / 4.05, 'bps-se2026');
  write(doc, 'PES SE2026  ·  Tim IT BPS Provinsi Sumatera Barat', 32, 521, { size: 10, color: muted });
  write(doc, stamp, 897, 521, { size: 10, color: muted, align: 'right' });
  write(doc, String(doc.getNumberOfPages()), 928, 521, { size: 11, bold: true, align: 'right' });
}

function heading(doc, category, subject, subtitle) {
  write(doc, category.toUpperCase(), 32, 54, { size: 25, bold: true, color: accent });
  const subjectX = 32 + doc.getTextWidth(category.toUpperCase()) + 13;
  write(doc, subject, subjectX, 54, { size: 25, bold: true });
  write(doc, subtitle, 32, 86, { size: 14, color: muted });
}

function chartPage(doc, view, category) {
  const isUb = category === 'ub';
  const totalsOnly = isUb && view.entries.length === 0;
  const counts = [...view.rows, { ...view.total, name: 'Sumatera Barat' }];
  const entries = totalsOnly ? [['total', 'Total assignment', '#387760']] : view.entries;
  const maxRegion = Math.max(...view.rows.map(row => row.total), 1);
  const highest = totalsOnly ? Math.ceil(maxRegion / 20) * 20 : 1;
  const ratio = (row, key) => totalsOnly ? row.total / highest : row.total ? row.values[key] / row.total : 0;
  const start = 190;
  const end = 847;
  const rowHeight = 29;
  const plotRows = totalsOnly ? view.rows : counts;
  const line = end - start;
  const subtitle = totalsOnly ? 'Total assignment per kabupaten/kota' :
    isUb ? 'Persentase assignment aktif dari total assignment' : 'Persentase menurut status pendataan';
  heading(doc, view.label, totalsOnly ? 'Jumlah assignment' : isUb ? 'Assignment aktif' : 'Status pendataan',
    subtitle + '  ·  ' + view.rows.length + ' kabupaten/kota  ·  Total Sumatera Barat ' + numbers.format(view.total.total));

  entries.forEach(([key, label, color], index) => {
    const x = 32 + (index % 3) * 307;
    const y = 118 + Math.floor(index / 3) * 18;
    fill(doc, color, x, y - 8, 10, 10);
    write(doc, /^\d$/.test(key) ? key + '. ' + label : label, x + 16, y, { size: 11 });
  });
  const top = 148 + (Math.ceil(entries.length / 3) - 1) * 18;
  const bottom = top + plotRows.length * rowHeight;
  write(doc, 'Kabupaten/kota', 32, top - 8, { size: 11, bold: true });
  write(doc, 'Jumlah', 928, top - 8, { size: 11, bold: true, align: 'right' });
  for (const tick of [0, .25, .50, .75, 1]) {
    const x = start + tick * line;
    fill(doc, '#e4e5e2', x, top, .5, bottom - top);
    write(doc, totalsOnly ? numbers.format(highest * tick) : percents.format(tick), x, top - 8,
      { size: 10, color: muted, align: 'center' });
  }

  plotRows.forEach((row, index) => {
    const regionalTotal = index === view.rows.length;
    const y = top + index * rowHeight;
    if (regionalTotal) fill(doc, rule, 32, y, 896, .8);
    write(doc, row.name, 32, y + 19, { size: 13, bold: regionalTotal });
    write(doc, numbers.format(row.total), 928, y + 19, { size: 13, bold: regionalTotal, align: 'right' });
    let x = start;
    entries.forEach(([key, , color]) => {
      const share = ratio(row, key);
      const segmentWidth = line * share;
      if (segmentWidth > 0) fill(doc, color, x, y + 5, segmentWidth, 19);
      if (!totalsOnly && segmentWidth >= 54) {
        const textColor = ['#e58b3d', '#bd8612'].includes(color) ? '#161916' : '#ffffff';
        write(doc, percents.format(share), x + segmentWidth / 2, y + 18.5,
          { size: 11, bold: true, color: textColor, align: 'center' });
      }
      x += segmentWidth;
    });
  });
}

function compositionPage(doc, total) {
  const segments = familyComposition(total);
  heading(doc, 'Keluarga', 'Hasil pemutakhiran', 'Keberadaan keluarga di Sumatera Barat');
  const cx = 224, cy = 281, radius = 139;
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
  doc.setFillColor('#ffffff');
  doc.circle(cx, cy, 84, 'F');
  write(doc, numbers.format(total.total), cx, cy + 3, { size: 27, bold: true, align: 'center' });
  write(doc, 'Total keluarga', cx, cy + 22, { size: 12, color: muted, align: 'center' });

  write(doc, 'Status keberadaan', 420, 159, { size: 12, bold: true });
  write(doc, 'Keluarga', 782, 159, { size: 12, bold: true, align: 'right' });
  write(doc, 'Persentase', 928, 159, { size: 12, bold: true, align: 'right' });
  fill(doc, rule, 420, 171, 508, 1);
  segments.forEach(([label, count, color], index) => {
    const y = 208 + index * 50;
    fill(doc, color, 420, y - 10, 11, 11);
    write(doc, label, 440, y, { size: 16 });
    write(doc, numbers.format(count), 782, y, { size: 17, align: 'right' });
    write(doc, total.total ? percents.format(count / total.total) : '-', 928, y, { size: 17, bold: true, align: 'right' });
  });
  fill(doc, rule, 420, 329, 508, 1);
  write(doc, 'Kelompok tidak eligible mencakup status 0, 3, 4, 5, dan 6.', 420, 353, { size: 12, color: muted });
  const unavailable = total.values['5'];
  if (unavailable > 0) {
    write(doc, numbers.format(unavailable) + ' keluarga tidak dapat ditemui sampai akhir pendataan.',
      420, 397, { size: 16, bold: true, maxWidth: 485 });
  }
}

export async function exportExploration(data) {
  const views = Object.keys(explorationViews).map(category => [category, explorationView(data, category)])
    .filter(([, view]) => view.rows.length);
  if (!views.length) throw new Error('Data eksplorasi belum tersedia.');

  const logo = await fetch(import.meta.env.BASE_URL + 'bps-se2026.png');
  if (!logo.ok) throw new Error('Logo BPS dan SE2026 gagal dimuat.');
  const mark = new Uint8Array(await logo.arrayBuffer());
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
