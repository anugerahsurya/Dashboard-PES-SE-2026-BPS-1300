import React from 'react';
import './pace.css';

const percent = new Intl.NumberFormat('id-ID', {style:'percent', minimumFractionDigits:2, maximumFractionDigits:2});
const oneDay = 86400000;
const campaignStart = Date.UTC(2026, 10, 1);
const benchmarks = ['2026-11-23', '2026-11-27'];
const dateFormat = new Intl.DateTimeFormat('id-ID', {day:'numeric', month:'long', timeZone:'UTC'});

export function paceTarget(date, deadline, stage) {
  const dayNumber = value => (Date.parse(value + 'T00:00:00Z') - campaignStart) / oneDay + 1;
  return (dayNumber(date) - (stage === 'ppl' ? 0 : 1)) / dayNumber(deadline);
}

export default function Pace({ snapshot }) {
  return <section className="panel pace-panel" aria-labelledby="pace-title">
    <h2 id="pace-title">Target harian</h2>
    <p>Acuan progres pada tanggal laporan menurut tenggat penyelesaian</p>
    <div className="pace-groups">{benchmarks.map(deadline => <article className="pace-item" key={deadline}>
      <h3>Tenggat {dateFormat.format(new Date(deadline + 'T00:00:00Z'))}</h3>
      <dl>{[['ppl','PPL'],['pml','PML dan olah final']].map(([stage,label])=><div key={stage}><dt>{label}</dt><dd>{percent.format(paceTarget(snapshot.date,deadline,stage))}</dd></div>)}</dl>
    </article>)}</div>
  </section>;
}
