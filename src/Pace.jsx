import React from 'react';
import './pace.css';
import {targetRatio} from './progress.js';

const percent = new Intl.NumberFormat('id-ID', {style:'percent', minimumFractionDigits:2, maximumFractionDigits:2});
const benchmarks = ['2026-11-23', '2026-11-27'];
const dateFormat = new Intl.DateTimeFormat('id-ID', {day:'numeric', month:'long', timeZone:'UTC'});

export const paceTarget = targetRatio;

export default function Pace({ snapshot }) {
  return <section className="panel pace-panel" aria-labelledby="pace-title">
    <h2 id="pace-title">Target kumulatif hari ini</h2>
    <p>Acuan sampai {dateFormat.format(new Date(snapshot.date + 'T00:00:00Z'))} menurut tenggat penyelesaian</p>
    <div className="pace-groups">{benchmarks.map(deadline => <article className="pace-item" key={deadline}>
      <h3>Tenggat {dateFormat.format(new Date(deadline + 'T00:00:00Z'))}</h3>
      <dl>{[['ppl','PPL'],['pml','PML dan olah final']].map(([stage,label])=><div key={stage}><dt>{label}</dt><dd>{percent.format(paceTarget(snapshot.date,deadline,stage))}</dd></div>)}</dl>
    </article>)}</div>
  </section>;
}
