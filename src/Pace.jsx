import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './pace.css'

const percent = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 2 })
const deadlineFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })
const oneDay = 86400000
const campaignStart = Date.UTC(2026, 10, 1)

// Tanggal input sudah merupakan tanggal kalender WIB. UTC di sini hanya digunakan
// sebagai skala untuk menghitung selisih hari tanpa pergeseran zona peramban.
export function paceTarget(date, deadline, stage) {
  const dayNumber = value => (Date.parse(value + 'T00:00:00Z') - campaignStart) / oneDay + 1
  return (dayNumber(date) - (stage === 'ppl' ? 0 : 1)) / dayNumber(deadline)
}

export default function Pace({ snapshot }) {
  const [group, setGroup] = useState('nonUb')
  const [stage, setStage] = useState('ppl')
  const deadlines = [...new Set(snapshot.rows.map(row => row.deadline))].sort()
  return <section className="panel pace-panel" aria-labelledby="pace-title">
    <div className="panel-head pace-head">
      <div>
        <h2 id="pace-title">Capaian terhadap target harian</h2>
        <p>Progres gabungan wilayah dengan tenggat yang sama</p>
      </div>
      <div className="pace-controls">
        <label className="select-wrap">
          <select aria-label="Jenis usaha target harian" value={group} onChange={event => setGroup(event.target.value)}>
            <option value="nonUb">Non UB</option><option value="ub">UB</option>
          </select><ChevronDown size={14} aria-hidden="true" />
        </label>
        <label className="select-wrap">
          <select aria-label="Tahap target harian" value={stage} onChange={event => setStage(event.target.value)}>
            <option value="ppl">PPL</option><option value="pml">PML</option><option value="final">Olah final</option>
          </select><ChevronDown size={14} aria-hidden="true" />
        </label>
      </div>
    </div>
    <div className="pace-groups">{deadlines.map(deadline => {
      const members = snapshot.rows.filter(row => row.deadline === deadline)
      const target = paceTarget(snapshot.date, deadline, stage)
      const assigned = members.reduce((sum, row) => sum + row[group].target, 0)
      const done = members.reduce((sum, row) => sum + row[group][stage], 0)
      const actual = assigned ? done / assigned : null
      const width = value => Math.min(100, Math.max(0, value * 100)) + '%'
      return <article className="pace-item" key={deadline}>
        <h3>Tenggat {deadlineFormat.format(new Date(deadline + 'T00:00:00+07:00'))}</h3>
        <p>{members.map(row => row.name).join(', ')}</p>
        <div className="pace-values"><span>Capaian <b>{actual === null ? '—' : percent.format(actual)}</b></span><span>Target <b>{percent.format(target)}</b></span></div>
        <div className="pace-track" aria-hidden="true"><span style={{width: width(actual ?? 0)}}/><i style={{left: width(target)}}/></div>
      </article>
    })}</div>
    <p className="pace-note">Target PPL dihitung sejak 1 November 2026. Target PML dan olah final mengikuti satu hari kemudian.</p>
  </section>
}
