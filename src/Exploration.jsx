import React, { useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, BarChart3, Building2, House, Store } from 'lucide-react';
import { businessStatuses, familyStatuses, ubMetrics } from './exploration.js';
import './exploration.css';

const categories = [
  ['family', 'Keluarga', House],
  ['business', 'Usaha keluarga', Store],
  ['ub', 'UB', Building2],
];
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
    <div className="exploration-ring" style={{ background: total.total ? `conic-gradient(${fill})` : undefined }}>
      <div><strong>{numbers.format(total.total)}</strong><small>Keluarga</small></div>
    </div>
    <ul>
      {segments.map(([label, count, color]) => <li key={label}>
        <span><i style={{ background: color }} />{label}</span><strong>{share(count, total.total)}</strong>
      </li>)}
    </ul>
    <p>Kelompok tidak eligible mencakup status 0, 3, 4, 5, dan 6.</p>
    {unavailable > 0 && <p className="exploration-callout"><strong>{numbers.format(unavailable)} keluarga</strong> berstatus tidak dapat ditemui sampai akhir pendataan.</p>}
  </aside>;
}

function StatusChart({ rows, entries, independent }) {
  return <div className="exploration-chart">
    <h3>{independent ? 'Indikator UB per kabupaten/kota' : 'Komposisi status per kabupaten/kota'}</h3>
    <Legend entries={entries} />
    <div className="exploration-chart-axis" aria-hidden="true">
      <span /><div>{[0, 25, 50, 75, 100].map(n => <span key={n}>{n}%</span>)}</div>
    </div>
    <ul className="exploration-chart-rows">
      {rows.map(row => <li key={row.code} className={independent ? 'independent-bars' : undefined}>
        <span>{row.name}</span>
        <div className="exploration-bars">
          {row.total > 0 ? entries.map(([key, label, color]) => row.values[key] > 0 || independent ? (
            <span key={key} className="exploration-segment"
              style={{ width: ratio(row.values[key], row.total) * 100 + '%', background: color }}
              title={`${row.name} · ${label} · ${numbers.format(row.values[key])} (${share(row.values[key], row.total)})`} />
          ) : null) : <small>Tanpa data</small>}
        </div>
        <span className="sr-only">{entries.map(([key, label]) => `${label} ${share(row.values[key], row.total)}`).join(', ')}</span>
      </li>)}
    </ul>
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
  const [businessSource, setBusinessSource] = useState('household');
  const statusGroup = category === 'business' ? businessSource : category;
  const entries = category === 'family' ? familyStatuses : category === 'business' ? businessStatuses :
    ubMetrics.filter(([key]) => data.exploration?.[0]?.ub?.[key] !== undefined);
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
      {category === 'business' && rows.length > 0 && <label className="exploration-source">
        Sumber usaha
        <select value={businessSource} onChange={event => setBusinessSource(event.target.value)}>
          <option value="household">Nama KK</option>
          <option value="bang">Bang=1</option>
        </select>
      </label>}
    </div>
    <div id="exploration-content">
      {rows.length ? <>
        {category === 'ub' && <p className="exploration-note">Persentase dihitung dari total assignment UB. Satu assignment bisa tercatat pada lebih dari satu indikator.</p>}
        <div className={category === 'family' ? 'exploration-figures with-composition' : 'exploration-figures'}>
          <StatusChart rows={rows} entries={entries} independent={category === 'ub'} />
          {category === 'family' && <FamilyComposition total={total} />}
        </div>
        <CountsTable key={category} rows={rows} total={total} entries={entries} category={categoryLabel} />
      </> : <div className="exploration-empty">
        <div><BarChart3 size={24} aria-hidden="true" /></div>
        <h3>Data {categoryLabel} belum tersedia</h3>
        <p>Unggah CSV eksplorasi untuk menampilkan hasil pada laporan ini.</p>
      </div>}
    </div>
  </section>;
}
