import React from 'react';
import './pace.css';
import {targetDeadlines,targetRatio} from './progress.js';

const percent = new Intl.NumberFormat('id-ID', {style:'percent', minimumFractionDigits:2, maximumFractionDigits:2});
const dateFormat = new Intl.DateTimeFormat('id-ID', {day:'numeric', month:'long', timeZone:'UTC'});

export const paceTarget = targetRatio;

export default function Pace({ snapshot }) {
  return <section className="panel pace-panel" aria-labelledby="pace-title">
    <h2 id="pace-title">Target kumulatif hari ini</h2>
    <p>Acuan sampai {dateFormat.format(new Date(snapshot.date + 'T00:00:00Z'))} menurut tenggat penyelesaian</p>
    <div className="pace-groups">{targetDeadlines.map(deadline => <article className="pace-item" key={deadline} data-deadline={deadline.slice(-2)}>
      <div className="pace-card-heading"><span className="pace-deadline">Tenggat penyelesaian</span><h3><strong>{deadline.slice(-2)}</strong> November <span>2026</span></h3></div>
      <dl>{[['ppl','PPL'],['pml','PML dan olah final']].map(([stage,label])=><div key={stage}><dt>{label}</dt><dd>{percent.format(paceTarget(snapshot.date,deadline,stage))}</dd><div className="pace-meter" aria-hidden="true"><i style={{transform:'scaleX('+Math.max(0,Math.min(1,paceTarget(snapshot.date,deadline,stage)))+')'}}/></div></div>)}</dl>
    </article>)}</div>
  </section>;
}
