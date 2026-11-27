import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowDownUp, ArrowUp, BarChart3, Building2, House, Store, Warehouse } from 'lucide-react';
import { bkuStatuses, businessStatuses, familyStatuses, ubMetrics } from './exploration.js';
import './exploration.css';

const categories = [
  ['family', 'Keluarga', House],
  ['business', 'Usaha keluarga', Store],
  ['bku', 'Usaha BKU', Warehouse],
  ['ub', 'UB', Building2],
];
const views = {
  family: ['family', familyStatuses],
  business: ['household', businessStatuses],
  bku: ['bang', bkuStatuses],
  ub: ['ub', ubMetrics],
};
const numbers = new Intl.NumberFormat('id-ID');
const percentages = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 2 });
const ratio = (count, total) => total > 0 ? count / total : 0;
const share = (count, total) => total > 0 ? percentages.format(ratio(count, total)) : '—';

function Legend({ entries }) {
  return <ul className="exploration-legend">
    {entries.map(([key, label, color]) => <li key={key}><i style={{ background: color }} />{/^\d$/.test(key) && key + '. '}{label}</li>)}
  </ul>;
}

function FamilyComposition({ total }) {
  const found = total.values['1'];
  const newFamilies = total.values['2'];
  const other = total.total - found - newFamilies;
  const segments = [
    ['Ditemukan', found, '#387760'],
    ['Baru', newFamilies, '#e58b3d'],
    ['Tidak eligible (gabungan)', other, '#ac303b'],
  ];
  let end = 0;
  const fill = segments.map(([, count, color]) => {
    const start = end;
    end += ratio(count, total.total) * 100;
    return `${color} ${start}% ${end}%`;
  }).join(', ');
  const unavailable = total.values['5'];
  return <aside className="exploration-composition">
    <h3>Komposisi keluarga Sumatera Barat</h3>
    <div className="exploration-composition-body">
      <div className="exploration-ring" style={{ background: total.total ? `conic-gradient(${fill})` : undefined }}>
        <div><strong>{numbers.format(total.total)}</strong><small>Keluarga</small></div>
      </div>
      <ul>
        {segments.map(([label, count, color]) => <li key={label}>
          <span><i style={{ background: color }} />{label}</span><strong>{share(count, total.total)}</strong>
        </li>)}
      </ul>
    </div>
    <p>Kelompok tidak eligible mencakup status 0, 3, 4, 5, dan 6.</p>
    {unavailable > 0 && <p className="exploration-callout"><strong>{numbers.format(unavailable)} keluarga</strong> berstatus tidak dapat ditemui sampai akhir pendataan.</p>}
  </aside>;
}

function StatusChart({ rows, entries, independent }) {
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => setTooltip(null);
    const onKey = event => {
      if (event.key === 'Escape') dismiss();
    };
    const onOutsidePress = event => {
      if (!tooltip.anchor.contains(event.target)) dismiss();
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onOutsidePress, true);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onOutsidePress, true);
    };
  }, [tooltip]);

  function showTooltip(event, row, key, label, color) {
    const anchor = event.currentTarget;
    const bounds = anchor.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const width = Math.min(252, viewportWidth - 24);
    const left = Math.max(12, Math.min(event.clientX - width / 2, viewportWidth - width - 12));
    const above = bounds.top >= 144 || bounds.bottom > window.innerHeight / 2;
    const top = above ? bounds.top - 9 : bounds.bottom + 9;
    setTooltip({
      anchor, left, top, width, above, label, color, region: row.name,
      count: numbers.format(row.values[key]),
      percent: share(row.values[key], row.total),
    });
  }

  return <div className="exploration-chart">
    <h3>{independent ? 'Indikator UB per kabupaten/kota' : 'Komposisi status per kabupaten/kota'}</h3>
    <Legend entries={entries} />
    <div className="exploration-chart-axis" aria-hidden="true">
      <span /><div>{[0, 25, 50, 75, 100].map(n => <span key={n}>{n}%</span>)}</div>
    </div>
    <ul className="exploration-chart-rows">
      {rows.map(row => <li key={row.code} className={independent ? 'independent-bars' : undefined}>
        <span>{row.name}</span>
        <div className="exploration-bars" aria-hidden="true">
          {row.total > 0 ? entries.map(([key, label, color]) => row.values[key] > 0 ? (
            <span key={key} className="exploration-segment"
              style={{ width: ratio(row.values[key], row.total) * 100 + '%', background: color }}
              onPointerEnter={event => {
                if (event.pointerType !== 'touch') showTooltip(event, row, key, label, color);
              }}
              onPointerLeave={event => {
                if (event.pointerType !== 'touch') setTooltip(null);
              }}
              onPointerDown={event => {
                if (event.pointerType === 'touch') showTooltip(event, row, key, label, color);
              }} />
          ) : null) : <small>Tanpa data</small>}
        </div>
        <span className="sr-only">{row.total > 0
          ? entries.map(([key, label]) => `${label} ${numbers.format(row.values[key])} (${share(row.values[key], row.total)})`).join(', ')
          : 'Tanpa data'}</span>
      </li>)}
    </ul>
    {tooltip && createPortal(
      <div className={tooltip.above ? 'exploration-tooltip above' : 'exploration-tooltip'} role="tooltip"
        style={{ left: tooltip.left, top: tooltip.top, width: tooltip.width }}>
        <strong>{tooltip.region}</strong>
        <span className="exploration-tooltip-status"><i style={{ background: tooltip.color }} />{tooltip.label}</span>
        <div className="exploration-tooltip-values"><b>{tooltip.count}</b><span>{tooltip.percent}</span></div>
      </div>,
      document.body,
    )}
  </div>;
}

function CountsTable({ rows, total, entries, category }) {
  const [sort, setSort] = useState({ key: 'name', direction: 1 });
  const columns = [['name', 'Kabupaten/kota'], ...entries, ['total', 'Total']];
  const cell = (row, key) => key === 'total' || key === 'name' ? row[key] : row.values[key];
  const ranked = [...rows].sort((a, b) => {
    const order = sort.key === 'name'
      ? a.name.localeCompare(b.name, 'id')
      : cell(a, sort.key) - cell(b, sort.key);
    return order * sort.direction || a.code.localeCompare(b.code);
  });
  function changeSort(key) {
    setSort(current => ({ key, direction: current.key === key ? -current.direction : key === 'name' ? 1 : -1 }));
  }
  const counts = row => columns.slice(1).map(([key]) => <td key={key}>{numbers.format(cell(row, key))}</td>);
  return <div className="exploration-table-section">
    <h3 id="exploration-table-title">Jumlah menurut kabupaten/kota</h3>
    <div className="exploration-table-scroll" tabIndex={0} role="region" aria-labelledby="exploration-table-title">
      <table aria-label={`Jumlah ${category} menurut kabupaten/kota`}>
        <thead><tr>{columns.map(([key, label]) => {
          const active = key === sort.key;
          const Icon = !active ? ArrowDownUp : sort.direction === 1 ? ArrowUp : ArrowDown;
          return <th key={key} scope="col" aria-sort={active ? sort.direction === 1 ? 'ascending' : 'descending' : undefined}>
            <button type="button" onClick={() => changeSort(key)}>{label}<Icon size={13} aria-hidden="true" /></button>
          </th>;
        })}</tr></thead>
        <tbody>{ranked.map(row => <tr key={row.code}><th scope="row">{row.name}</th>{counts(row)}</tr>)}</tbody>
        <tfoot><tr><th scope="row">Sumatera Barat</th>{counts(total)}</tr></tfoot>
      </table>
    </div>
  </div>;
}

export default function Exploration({ data, dateLabel }) {
  const [category, setCategory] = useState('family');
  const [statusGroup, statuses] = views[category];
  const available = data.exploration?.[0]?.[statusGroup];
  const entries = statuses.filter(([key]) => available?.[key] !== undefined);
  const categoryLabel = categories.find(([key]) => key === category)[1];
  const rows = (data.exploration ?? []).flatMap(row => {
    const values = row[statusGroup];
    const region = data.rows.find(item => item.code === row.code);
    if (!values || !region) return [];
    const total = category === 'ub' ? values.total : entries.reduce((sum, [key]) => sum + values[key], 0);
    return [{ code: row.code, name: region.name, values, total }];
  });
  const total = {
    total: rows.reduce((sum, row) => sum + row.total, 0),
    values: Object.fromEntries(entries.map(([key]) => [key, rows.reduce((sum, row) => sum + row.values[key], 0)])),
  };
  return <section className="exploration panel" id="eksplorasi" aria-labelledby="exploration-title">
    <div className="exploration-heading">
      <div><h2 id="exploration-title">Eksplorasi hasil</h2><p>Status pendataan {numbers.format(data.rows.length)} kabupaten/kota peserta PES SE2026</p></div>
      {data.exploration && <time dateTime={data.date + 'T' + data.time + ':00+07:00'}>{dateLabel(data.date)} · {data.time.replace(':', '.')} WIB</time>}
    </div>
    <div className="exploration-controls">
      <div className="exploration-tabs" role="group" aria-label="Kategori eksplorasi">
        {categories.map(([key, label, Icon]) => <button type="button" key={key} aria-pressed={category === key} aria-controls="exploration-content" onClick={() => setCategory(key)}>
          <Icon size={17} aria-hidden="true" />{label}
        </button>)}
      </div>
    </div>
    <div id="exploration-content">
      {rows.length ? <>
        {category === 'ub' && entries.length > 0 && <p className="exploration-note">Persentase aktif dihitung dari total assignment UB.</p>}
        {entries.length > 0 && <div className={category === 'family' ? 'exploration-figures with-composition' : 'exploration-figures'}>
          <StatusChart key={category} rows={rows} entries={entries} independent={category === 'ub'} />
          {category === 'family' && <FamilyComposition total={total} />}
        </div>}
        <CountsTable key={category} rows={rows} total={total} entries={entries} category={categoryLabel} />
      </> : <div className="exploration-empty">
        <div><BarChart3 size={24} aria-hidden="true" /></div>
        <h3>Data {categoryLabel} belum tersedia</h3>
        <p>Unggah CSV eksplorasi untuk menampilkan hasil pada laporan ini.</p>
      </div>}
    </div>
  </section>;
}
