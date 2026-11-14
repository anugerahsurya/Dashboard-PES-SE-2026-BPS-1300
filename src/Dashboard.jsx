import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Building2, CalendarDays, ChartColumnIncreasing, ChevronDown, Clock3, Layers3, LoaderCircle, MapPin, Pause, Play, Search, Store } from 'lucide-react';
import Pace from './Pace';
import { deltaLabel, previousDate } from './comparison.js';
import landscapeUrl from './landscape.svg';
import './dashboard.css';

const integer = new Intl.NumberFormat('id-ID', {maximumFractionDigits:0});
const percentage = Object.fromEntries([['ub',1],['nonUb',2]].map(([key, digits]) => [
  key, new Intl.NumberFormat('id-ID', { style:'percent', minimumFractionDigits:digits, maximumFractionDigits:digits })
]));
const percent = (n, d) => d > 0 ? n / d * 100 : 0;
const pct = (n, d, group) => d > 0 ? percentage[group].format(n/d) : '—';
const dateLabel = (s, short = false) => s ? new Intl.DateTimeFormat('id-ID', { day:'numeric', month:short ? 'short':'long', ...(short ? {} : {year:'numeric'}), timeZone:'UTC' }).format(new Date(s + 'T12:00:00Z')) : '—';

function Counter({value, format=integer}) {
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
      current.current = from + (value - from) * (1 - (1-t)**3);
      setShown(current.current);
      if (t < 1) handle = requestAnimationFrame(draw);
    };
    handle = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(handle);
  }, [value]);
  return <><span aria-hidden="true">{format.format(shown)}</span><span className="sr-only">{format.format(value)}</span></>;
}

function Delta({label}) {
  const tone = label.startsWith('+') ? 'up' : /^[-−]/.test(label) ? 'down' : 'neutral';
  return <span className={'delta '+tone} aria-label={'Perubahan H−1: '+label}>{label}</span>;
}

function comparisonNote(date, status) {
  const baseline = 'H−1 (' + dateLabel(previousDate(date)) + ')';
  if (status === 'loading') return 'Memuat laporan ' + baseline + '…';
  if (status === 'error') return 'Laporan ' + baseline + ' gagal dimuat. Perubahan belum dapat dihitung.';
  if (status !== 'ready') return 'Belum ada laporan ' + baseline + '. Perubahan belum dapat dihitung.';
  return 'Perubahan terhadap ' + baseline + ' ditampilkan dalam poin persentase (pp).';
}

function Weather() {
  return <svg className="hero-weather" viewBox="0 0 600 220" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" fill="none" stroke="#9a663f" strokeLinecap="round">
    <g className="hero-birds" strokeWidth="1.4"><path d="M298 61q6-3 9 1q5-4 10-2m13-12q5-2 7 1q4-3 8-2"/></g>
    <g className="hero-breeze" strokeWidth="1"><path d="M152 97h17q6 0 9-3m-18 8h10"/></g>
  </svg>;
}

function Metric({icon:Icon, title, description, complete, target, tone, group, delta}) {
  return <article className={'metric '+tone}>
    <div className="metric-head"><span className="metric-icon"><Icon size={19}/></span><h3>{title}</h3></div>
    <div className="metric-value">{group ? (target ? <Counter value={complete/target} format={percentage[group]}/> : '—') : <Counter value={complete}/>} {delta && <Delta label={delta}/>}</div>
    <div className="metric-caption"><span>{description}</span><strong>Target {integer.format(target)}</strong></div>
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
      <div className="bar-fill" style={{width:Math.min(100,percent(r[k][stage],r[k].target))+'%'}}/><small>{pct(r[k][stage],r[k].target,k)}</small></div>)}</div></div>)}</div>
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
    <div className="status-list">{entries.map(([key,label,color])=><div key={key}><span><i style={{background:color}}/>{label}</span><b>{integer.format(sls[key])}</b></div>)}</div>
  </section>;
}
function Recap({data,previous,note}) {
  const [tab,setTab]=useState('sls');
  const [query,setQuery]=useState('');
  const labels={sls:'SLS',nonUb:'Non UB',ub:'UB'};
  const rows=data.rows.filter(r=>(r.name+' '+r.code).toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id')));
  const columns=tab==='sls' ? [['target','Target'],['belum','Belum'],['sedang','Sedang'],['selesai','Selesai']] :
    [['target','Target'],['officers','Petugas PPL'],...(tab==='nonUb'?[['draft','Draf']]:[]),['ppl','Progres PPL'],['pml','Progres PML'],['final','Olah final']];
  const byCode = new Map(previous?.rows.map(row=>[row.code,row]));
  const renderCells = (group, baseline) => columns.map(([key])=>{
    const progress = tab !== 'sls' && !['target','officers'].includes(key);
    return <td key={key}>{progress ? <>{pct(group[key],group.target,tab)}<br/><Delta label={baseline ? deltaLabel(group,baseline,key,tab) : '—'}/></> : integer.format(group[key])}</td>;
  });
  return <section id="rincian" className="panel recap"><div className="panel-head"><div><h2>Rincian kabupaten/kota</h2><p>{tab==='sls' ? 'Jumlah SLS menurut status pendataan' : 'Persentase progres terhadap target wilayah'}</p></div><label className="search"><Search size={16}/><input type="search" aria-label="Cari wilayah" placeholder="Cari wilayah…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="tabs" aria-label="Kategori rincian">{Object.keys(labels).map(k=><button key={k} type="button" aria-pressed={tab===k} onClick={()=>setTab(k)}>{labels[k]}</button>)}</div>
    {tab!=='sls' && <p className="recap-comparison">{note}</p>}
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabel rincian wilayah"><table><thead><tr><th scope="col">Kabupaten/kota</th><th scope="col">Target selesai</th>{columns.map(([key,label])=><th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.code}><th scope="row">{r.name}</th><td>{dateLabel(r.deadline,true)}</td>{renderCells(r[tab],byCode.get(r.code)?.[tab])}</tr>)}
    {!rows.length && <tr><td colSpan={columns.length+2} className="empty">Wilayah tidak ditemukan.</td></tr>}</tbody><tfoot><tr><th scope="row">Provinsi Sumatera Barat</th><td aria-label="Beragam">—</td>{renderCells(data.totals[tab],previous?.totals[tab])}</tr></tfoot></table></div>
  </section>;
}

export default function Dashboard({data,onUpload,onExport,exporting,previous=null,comparisonStatus='missing'}) {
  const [paused,setPaused]=useState(false);
  const {totals,rows}=data;
  const baseline = comparisonStatus==='ready' ? previous : null;
  const note = comparisonNote(data.date,comparisonStatus);
  const finalChange = group => baseline ? deltaLabel(totals[group],baseline.totals[group],'final',group) : '—';
  return <div className="pes-site"><header className="site-header"><div className="header-inner"><a href="#ringkasan" className="brand" aria-label="PES Monitor, Ringkasan"><div className="brand-symbol" aria-hidden="true"><ChartColumnIncreasing size={25} strokeWidth={2.5}/></div><strong>PES <span>Monitor</span></strong></a><span className="institution">BPS Provinsi Sumatera Barat</span><button type="button" onClick={onUpload} className="btn btn-upload"><ArrowUpFromLine size={16}/>Unggah CSV</button></div></header>
    <main className="pes-main" id="ringkasan">
      <section className={paused ? "hero paused" : "hero"}><img className="landscape" src={landscapeUrl} alt=""/><Weather/><button className="motion-toggle" type="button" onClick={()=>setPaused(!paused)} aria-label={paused?"Putar animasi ilustrasi":"Jeda animasi ilustrasi"}>{paused?<Play size={14}/>:<Pause size={14}/>}</button><div className="hero-copy"><div className="hero-location"><MapPin size={14}/>SUMATERA BARAT</div><h1>Dashboard Progres<br/><span>PES SE2026</span></h1><div className="hero-time"><CalendarDays size={15}/><span>{dateLabel(data.date)}</span><i/><Clock3 size={15}/><span>{data.time.replace(':','.')} WIB</span></div></div></section>
      <div className="summary-heading"><div><h2>Ringkasan progres</h2><p>Capaian pendataan di {integer.format(rows.length)} kabupaten/kota</p></div><button type="button" className="btn btn-export" onClick={onExport} disabled={exporting||comparisonStatus==='loading'}>{exporting?<LoaderCircle aria-hidden="true" className="pes-spin" size={16}/>:<ArrowDownToLine aria-hidden="true" size={16}/>} {exporting?'Menyiapkan PNG…':'Unduh PNG'}</button></div>
      <div className="metric-grid"><Metric icon={Layers3} title="Pendataan SLS" description="SLS selesai" complete={totals.sls.selesai} target={totals.sls.target} tone="orange"/><Metric icon={Store} title="Usaha Non UB" description="Selesai olah final" complete={totals.nonUb.final} target={totals.nonUb.target} tone="teal" group="nonUb" delta={finalChange('nonUb')}/><Metric icon={Building2} title="Usaha Besar (UB)" description="Selesai olah final" complete={totals.ub.final} target={totals.ub.target} tone="violet" group="ub" delta={finalChange('ub')}/></div>
      <p className="comparison-note" role="status">{note}</p>
      <div className="chart-grid"><DistrictChart rows={rows}/><Distribution sls={totals.sls}/></div>
      <Pace snapshot={data}/>
      <Recap data={data} previous={baseline} note={note}/>
    </main><footer className="pes-footer"><span><ChartColumnIncreasing size={17}/> PES Monitor</span><span>Dikelola oleh Tim IT BPS Provinsi Sumatera Barat</span></footer>
  </div>;
}
export { Dashboard };
