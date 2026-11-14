import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Building2, CalendarDays, ChartColumnIncreasing, ChevronDown, Clock3, Layers3, LoaderCircle, MapPin, Search, Store } from 'lucide-react';
import Pace from './Pace';
import './dashboard.css';

const integer = new Intl.NumberFormat('id-ID');
const decimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const percent = (n, d) => d > 0 ? n / d * 100 : 0;
const pct = (n, d) => d > 0 ? decimal.format(percent(n, d)) + '%' : '—';
const dateLabel = (s, short = false) => s ? new Intl.DateTimeFormat('id-ID', { day:'numeric', month:short ? 'short':'long', ...(short ? {} : {year:'numeric'}), timeZone:'UTC' }).format(new Date(s + 'T12:00:00Z')) : '—';

function Counter({value}) {
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let handle;
    const draw = now => {
      const t = Math.min(1, (now - start) / 280);
      current.current = Math.round(from + (value - from) * (1 - (1-t)**3));
      setShown(current.current);
      if (t < 1) handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [value]);
  return <><span aria-hidden="true">{integer.format(shown)}</span><span className="sr-only">{integer.format(value)}</span></>;
}

function Landscape() {
  return <svg className="landscape" viewBox="0 0 600 220" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <defs>
      <pattern id="engrave" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><path d="M0 0v5" stroke="#fff2cf" strokeWidth="1" opacity=".66"/></pattern>
      <pattern id="wall" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5l5-5 5 5-5 5z" fill="none" stroke="#a74f2c" strokeWidth=".8"/></pattern>
    </defs>
    <circle cx="408" cy="93" r="66" fill="#ffdc95"/>
    <g fill="none" stroke="#ce8d5e" strokeWidth="1" opacity=".8"><path d="M223 47q6-6 12 0q5-4 10-2m28 24q5-6 10-2q4-3 8-2m192-38q8-6 13 0q5-4 11-2"/><path d="M85 77h53q4-7 12-4q7-14 19-2h30m216-32h33q8-11 15-3q7-5 10 3h30"/></g>
    <path d="M0 182Q64 173 93 148T171 111L207 87Q216 82 233 102L292 138Q333 133 356 114L425 75Q434 70 446 81L518 121Q558 95 600 80V220H0Z" fill="#edbd84"/>
    <path d="M67 170l77-34 66-47-25 40-16 6-26 23zm296-50 67-44-21 33-19 4-8 11z" fill="#f7d7a0"/>
    <path d="M0 195Q70 164 113 171Q151 167 203 142T299 141Q340 149 378 136T448 116Q510 130 600 96V220H0Z" fill="#e3a76c"/>
    <path d="M38 218q33-38 97-49t91-32q41-13 76 1q-39-3-66 12t-89 31q-42 9-79 37zm336-64q50-19 94-19t100-24" fill="#f3c68b"/>
    <g transform="translate(310 71)">
      <g fill="#9a4c30"><path d="M13 90l7 49h5l-1-49m32 0 4 50h5l1-50m60-1-2 49h5l6-48m-33 0-1 50h5l3-50"/></g>
      <path d="M10 70h125l-4 37H15Z" fill="#e6ac69" stroke="#8a472c" strokeWidth="2"/>
      <path d="M10 70h125l-4 37H15Z" fill="url(#wall)"/>
      <path d="M5 67Q19 57 0 13Q23 46 38 39Q49 34 48 10Q60 39 72 39Q85 36 87 4Q96 40 107 37Q123 34 143 0Q128 37 139 62l7 10-146 6Z" fill="#ad5a36" stroke="#85462c" strokeWidth="2"/>
      <path d="M5 67Q19 57 0 13Q23 46 38 39Q49 34 48 10Q60 39 72 39Q85 36 87 4Q96 40 107 37Q123 34 143 0Q128 37 139 62l7 10-146 6Z" fill="url(#engrave)"/>
      <path d="M0 76l145-6M14 106l117-2" stroke="#87432a" strokeWidth="4"/>
      {[26,49,90,112].map(x=><g key={x} fill="#75452f"><rect x={x} y="80" width="10" height="14"/><path d={`M${x+5} 80v14m-5-7h10`} stroke="#e2a46a" strokeWidth="1"/></g>)}
      <path d="M67 82h13v23H67z" fill="#78412a"/><path d="M68 105l-8 20h18l3-20" fill="#ce8851" stroke="#975433"/><path d="M66 111h14m-16 5h15m-18 5h17" stroke="#975433"/>
    </g>
    <g fill="#ae7548">{[[493,155,.85],[507,161,.65],[475,170,.5],[276,161,.52],[258,173,.46],[546,151,.6],[574,142,.75],[158,184,.42]].map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M0-34l-10 20h5l-9 15h9l-12 15h32L6 1h7L5-14h5z"/><path d="M0 8v19" stroke="#99613f" strokeWidth="3"/></g>)}</g>
    <path d="M0 215q83-14 151-11t132-13q77-13 134-9t102-11q40-11 81-15v64H0" fill="#c1814e"/>
    <g fill="none" stroke="#f5c792" strokeWidth="1.5">{[0,5,11,18,26].map(n=><path key={n} d={`M104 ${221+n/2}Q213 ${215+n} 292 ${197+n}T411 ${191+n}Q475 ${194+n} 513 ${179+n}T608 ${161+n}`}/>)}</g>
  </svg>;
}

function Metric({icon:Icon, title, description, complete, target, tone}) {
  return <article className={'metric '+tone}>
    <div className="metric-head"><span className="metric-icon"><Icon size={19}/></span><h3>{title}</h3></div>
    <div className="metric-value"><Counter value={complete}/><span> / {integer.format(target)}</span></div>
    <div className="metric-caption"><span>{description}</span><strong>{pct(complete,target)}</strong></div>
    <div className="track"><i style={{transform:`scaleX(${Math.min(1,percent(complete,target)/100)})`}}/></div>
  </article>;
}

function DistrictChart({rows}) {
  const [stage,setStage]=useState('final');
  const shortName = name => name.replace(/^Kabupaten\s+/i,'Kab. ');
  return <section className="panel district-chart">
    <div className="panel-head"><div><h2>Progres per wilayah</h2><p>Perbandingan capaian Non UB dan UB</p></div>
      <label className="select-wrap"><select aria-label="Tahap progres wilayah" value={stage} onChange={e=>setStage(e.target.value)}><option value="final">Olah final</option><option value="ppl">PPL</option><option value="pml">PML</option></select><ChevronDown size={14}/></label>
    </div>
    <div className="legend"><span><i className="orange-dot"/>Non UB</span><span><i className="teal-dot"/>UB</span></div>
    <div className="bar-axis" aria-hidden="true"><span/><div>{[0,25,50,75,100].map(n=><small key={n}>{n}%</small>)}</div></div>
    <div className="bar-list">{rows.map(r=><div className="bar-row" key={r.code}><span>{shortName(r.name)}</span><div className="bar-plot">{['nonUb','ub'].map(k=><div className={'bar-strip '+k+(percent(r[k][stage],r[k].target)>76?' near-edge':'')} key={k}>
      <div className="bar-fill" style={{width:Math.min(100,percent(r[k][stage],r[k].target))+'%'}}/><small>{pct(r[k][stage],r[k].target)}</small></div>)}</div></div>)}</div>
  </section>;
}

function Distribution({sls}) {
  const entries=[['sedang','Sedang dikerjakan','#ed984a'],['belum','Belum dimulai','#cdd4d4'],['selesai','Selesai','#3f897b']];
  let start=0;
  return <section className="panel distribution"><h2>Status SLS</h2><p>Distribusi status pendataan SLS</p>
    <div className="donut"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="70" fill="none" stroke="#efeeeb" strokeWidth="21"/>{entries.map(([key,,color])=>{
      const size=percent(sls[key],sls.target), offset=start;start+=size;
      return size>0 && <circle key={key} cx="90" cy="90" r="70" fill="none" stroke={color} strokeWidth="21" pathLength="100" strokeDasharray={`${Math.max(0,size-(size===100?0:.65))} ${100-Math.max(0,size-(size===100?0:.65))}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)"/>;
    })}</svg><div><strong><Counter value={sls.target}/></strong><span>Total SLS</span></div></div>
    <div className="status-list">{entries.map(([key,label,color])=><div key={key}><span><i style={{background:color}}/>{label}</span><b>{integer.format(sls[key])}</b><small>{pct(sls[key],sls.target)}</small></div>)}</div>
  </section>;
}
function Recap({data}) {
  const [tab,setTab]=useState('sls');
  const [query,setQuery]=useState('');
  const labels={sls:'SLS',nonUb:'Non UB',ub:'UB'};
  const rows=data.rows.filter(r=>(r.name+' '+r.code).toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')));
  const columns=tab==='sls' ? [['target','Target'],['belum','Belum'],['sedang','Sedang'],['selesai','Selesai']] :
    [['target','Target'],['officers','Petugas PPL'],...(tab==='nonUb'?[['draft','Draf']]:[]),['ppl','Progres PPL'],['pml','Progres PML'],['final','Olah final']];
  const renderCells = (group) => columns.map(([key])=><td key={key}>{integer.format(group[key])}{!['target','officers'].includes(key)&&<small>{pct(group[key],group.target)}</small>}</td>);
  return <section id="rincian" className="panel recap"><div className="panel-head"><div><h2>Rincian kabupaten/kota</h2><p>Jumlah dan persentase terhadap target wilayah</p></div><label className="search"><Search size={16}/><input type="search" aria-label="Cari wilayah" placeholder="Cari wilayah…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="tabs" aria-label="Kategori rincian">{Object.keys(labels).map(k=><button key={k} type="button" aria-pressed={tab===k} onClick={()=>setTab(k)}>{labels[k]}</button>)}</div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabel rincian wilayah"><table><thead><tr><th scope="col">Kabupaten/kota</th><th scope="col">Target selesai</th>{columns.map(([key,label])=><th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.code}><th scope="row">{r.name}</th><td>{dateLabel(r.deadline,true)}</td>{renderCells(r[tab])}</tr>)}
    {!rows.length && <tr><td colSpan={columns.length+2} className="empty">Wilayah tidak ditemukan.</td></tr>}</tbody><tfoot><tr><th scope="row">Provinsi Sumatera Barat</th><td aria-label="Beragam">—</td>{renderCells(data.totals[tab])}</tr></tfoot></table></div>
  </section>;
}

export default function Dashboard({data,onUpload,onExport,exporting}) {
  const {totals,rows}=data;
  return <div className="pes-site"><header className="site-header"><div className="header-inner"><a href="#ringkasan" className="brand" aria-label="PES Monitor, Ringkasan"><div className="brand-symbol" aria-hidden="true"><ChartColumnIncreasing size={25} strokeWidth={2.5}/></div><strong>PES <span>Monitor</span></strong></a><span className="institution">BPS Provinsi Sumatera Barat</span><button type="button" onClick={onUpload} className="btn btn-upload"><ArrowUpFromLine size={16}/>Unggah CSV</button></div></header>
    <main className="pes-main" id="ringkasan">
      <section className="hero"><Landscape/><div className="hero-copy"><div className="hero-location"><MapPin size={14}/>SUMATERA BARAT</div><h1>Dashboard Progres<br/><span>PES SE2026</span></h1><div className="hero-time"><CalendarDays size={15}/><span>{dateLabel(data.date)}</span><i/><Clock3 size={15}/><span>{data.time.replace(':','.')} WIB</span></div></div></section>
      <div className="summary-heading"><div><h2>Ringkasan progres</h2><p>Capaian pendataan di {integer.format(rows.length)} kabupaten/kota</p></div><button type="button" className="btn btn-export" onClick={onExport} disabled={exporting}>{exporting?<LoaderCircle aria-hidden="true" className="pes-spin" size={16}/>:<ArrowDownToLine aria-hidden="true" size={16}/>} {exporting?'Menyiapkan PNG…':'Unduh PNG'}</button></div>
      <div className="metric-grid"><Metric icon={Layers3} title="Pendataan SLS" description="SLS selesai" complete={totals.sls.selesai} target={totals.sls.target} tone="orange"/><Metric icon={Store} title="Usaha Non UB" description="Selesai olah final" complete={totals.nonUb.final} target={totals.nonUb.target} tone="teal"/><Metric icon={Building2} title="Usaha Besar (UB)" description="Selesai olah final" complete={totals.ub.final} target={totals.ub.target} tone="violet"/></div>
      <div className="chart-grid"><DistrictChart rows={rows}/><Distribution sls={totals.sls}/></div>
      <Pace snapshot={data}/>
      <Recap data={data}/>
    </main><footer className="pes-footer"><span><ChartColumnIncreasing size={17}/> PES Monitor</span><span>Dikelola oleh Tim IT BPS Provinsi Sumatera Barat</span></footer>
  </div>;
}
export { Dashboard };


