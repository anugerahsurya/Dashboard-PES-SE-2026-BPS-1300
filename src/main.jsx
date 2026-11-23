import '@fontsource-variable/plus-jakarta-sans';
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Upload, X, FileSpreadsheet, Check, LoaderCircle, ArrowLeft} from 'lucide-react';
import Dashboard from './Dashboard.jsx';
import initial from './initial.json';
import landscapeUrl from './landscape.svg';
import nov19 from './report-nov19.json';
import nov14 from './report-nov14.json';
import priorReport from './previous-report.json';
import {buildSnapshot} from './data.js';
import {exportReport} from './exportReport.js';
import {previousDate} from './comparison.js';
import './app.css';

const endpoint=(import.meta.env.VITE_APPS_SCRIPT_URL||'').trim();
const cache='sumbar.pes.snapshot.v1';
const types=[['sls','Progres SLS'],['nonUb','PES SE2026 - Non-UB'],['ub','PES SE2026 - UB'],['kp','#KP - Rincian assignment UB']];
const fmt=n=>Number(n).toLocaleString('id-ID');
function check(x){
  if(!x || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || !/^\d{2}:\d{2}$/.test(x.time) || !Array.isArray(x.rows)||!x.rows.length || ![x.totals,...x.rows].every(r=>['sls','nonUb','ub'].every(k=>Number.isFinite(r?.[k]?.target)))) throw new Error('Format data tersimpan tidak sesuai.');
  const snapshot=structuredClone(x);
  for(const row of [...snapshot.rows,snapshot.totals]){
    for(const category of ['nonUb','ub'])row[category].final=row[category].completed+(row[category].completedByAdmin||0)+(row[category].approved||0)+(row[category].kp||0);
  }
  return snapshot;
}
async function api(body, date){
  const url=new URL(endpoint);
  if(date)url.searchParams.set('date',date);
  const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)}:{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Server tidak dapat diakses. Periksa URL dan akses deployment.');
  const result=await response.json();if(!result.ok)throw new Error(result.error||'Permintaan gagal.');return result;
}
async function readSnapshot(date){
  try{return await api(undefined,date);}
  catch{
    await new Promise(resolve=>setTimeout(resolve,600));
    return api(undefined,date);
  }
}
function wib(){
  const d=new Date(Date.now()+7*3600e3).toISOString();
  return [d.slice(0,10),d.slice(11,16)];
}
function UploadDialog({close,apply}){
  const ref=useRef(null);const [[day,hour]]=useState(wib);
  const [date,setDate]=useState(day),[time,setTime]=useState(hour),[files,setFiles]=useState({});
  const [draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[key,setKey]=useState('');
  useEffect(()=>{const dlg=ref.current;dlg.showModal();return ()=>dlg.close();},[]);
  async function submit(e){e.preventDefault();setBusy(true);setError('');
    try{if(draft){await apply(draft,key);close();}else{
      if(types.some(([k])=>!files[k]))throw new Error('Pilih keempat file CSV sebelum memeriksa data.');
      const inputs=Object.fromEntries(await Promise.all(types.map(async ([k])=>[k,await files[k].text()])));
      setDraft(buildSnapshot(inputs,date,time));
    }}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <dialog className="import-dialog" aria-labelledby="import-title" ref={ref} onCancel={e=>{if(e.target===ref.current){e.preventDefault();if(!busy)close();}}}>
    <header><span className="import-icon"><Upload size={21}/></span><button type="button" className="icon-close" disabled={busy} onClick={close} aria-label="Tutup"><X size={20}/></button></header>
    <h2 id="import-title">{draft?'Periksa hasil impor':'Perbarui progres'}</h2>
    <p>{draft?'Pastikan target tiap sumber dan waktu laporan sudah sesuai.':'Pilih empat ekspor CSV untuk satu waktu pelaporan.'}</p>
    <form onSubmit={submit}>
    {draft?<><p className="import-date">{draft.date} - {draft.time} WIB - {draft.rows.length} wilayah</p>
    <div className="import-review">{types.map(([k,label])=><div key={k}><span>{label}</span><strong>{k==='kp'?fmt(draft.totals.ub.kp)+' assignment KP':fmt(draft.totals[k].target)+' target'}</strong></div>)}</div>
    {endpoint&&<label className="import-field">Kunci admin<input required type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="off"/></label>}
    <small>{endpoint?'Data akan tersimpan di Google Sheets.':'Mode lokal - Progres tersimpan di browser perangkat ini.'}</small></>:<>
    <div className="import-fields"><label className="import-field">Tanggal laporan<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="import-field">Pukul (WIB)<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>
    {types.map(([k,label])=><label className="file-slot" key={k}><FileSpreadsheet size={22}/><span><b>{label}</b><small>{files[k]?.name||'Pilih file .csv'}</small></span>{files[k]&&<Check size={18}/>}<input aria-label={label} required={!files[k]} type="file" accept=".csv,text/csv" onChange={e=>setFiles({...files,[k]:e.target.files[0]})}/></label>)}</>}
    {error&&<p role="alert" className="import-error">{error}</p>}
    <footer>{draft&&<button type="button" disabled={busy} onClick={()=>{setDraft(null);setError('');}}><ArrowLeft size={16}/> Ubah</button>}<button className="primary-import" disabled={busy}>{busy&&<LoaderCircle className="import-spin" size={17}/>} {draft?'Simpan progres':'Periksa data'}</button></footer>
    </form></dialog>
}
const historyKey='sumbar.pes.daily.v1';
function readHistory(){
  const history=JSON.parse(localStorage.getItem(historyKey)||'{}');
  const legacy=JSON.parse(localStorage.getItem(cache)||'null');
  if(legacy && !history[legacy.date])history[legacy.date]=check(legacy);
  return history;
}
function bundled(date){
  return [initial,nov19,nov14,priorReport].find(report=>report.date===date) || null;
}
function App(){
 const [data,setData]=useState(initial),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
 const [fontsReady,setFontsReady]=useState(false),[artReady,setArtReady]=useState(false);
 const assetsReady=fontsReady&&artReady;
 const loadPercent=15+(fontsReady?15:0)+(artReady?15:0)+(!loading?55:0);
 useEffect(()=>{
   let alive=true;
   const art=new Image();art.src=landscapeUrl;
   document.fonts.ready.finally(()=>{if(alive)setFontsReady(true);});
   art.decode().then(()=>{if(alive)setArtReady(true);},()=>{if(alive)setArtReady(true);});
   return()=>{alive=false;};
 },[]);
 const [comparisonAttempt,setComparisonAttempt]=useState(0);
 const [comparison,setComparison]=useState({date:null,previous:null,status:'loading'});
 useEffect(()=>{
   let alive=true;
   async function load(){
     try{
       const history=endpoint?null:readHistory();
       const stored=endpoint?(await api()).snapshot:history[Object.keys(history).sort().at(-1)];
       if(stored && alive){
         const saved=check(stored);
         if(saved.date+' '+saved.time >= initial.date+' '+initial.time)setData(saved);
         else setNotice('Menampilkan laporan bawaan 20 November 2026, 12.00 WIB.');
       }else if(alive){
         setNotice('Menampilkan laporan bawaan 20 November 2026, 12.00 WIB.');
       }
     }catch{if(alive)setNotice('Gagal memuat data tersimpan. Dashboard menampilkan laporan 20 November 2026.');}
     finally{if(alive)setLoading(false);}
   }
   load();
   return()=>{alive=false;};
 },[]);
 useEffect(()=>{
   if(loading)return;
   let alive=true;
   const date=previousDate(data.date);
   async function loadPrevious(){
     try{
       const stored=endpoint?(await readSnapshot(date)).snapshot:readHistory()[date];
       const previous=stored?check(stored):bundled(date);
       if(previous && previous.date!==date)throw new Error('Tanggal acuan tidak sesuai.');
       if(alive)setComparison({date:data.date,previous,status:previous?'ready':'missing'});
     }catch{if(alive)setComparison({date:data.date,previous:null,status:'error'});}
   }
   setComparison({date:data.date,previous:null,status:'loading'});
   loadPrevious();
   return()=>{alive=false;};
 },[data,loading,comparisonAttempt]);
 async function apply(snapshot,adminKey){
   if(endpoint){
     const result=await api({adminKey,snapshot});
     setData(check(result.snapshot));
     setNotice(result.reportSheetName
       ? 'Progres tersimpan. Tab laporan: ' + result.reportSheetName + '.'
       : 'Progres berhasil disimpan ke Google Sheets.');
   }else{
     const history=readHistory();
     if(!history[snapshot.date] || snapshot.time>=history[snapshot.date].time)history[snapshot.date]=snapshot;
     localStorage.setItem(historyKey,JSON.stringify(history));
     setData(check(history[snapshot.date]));
     setNotice('Progres tersimpan di browser ini.');
   }
 }
 const current=comparison.date===data.date ? comparison : {previous:null,status:'loading'};
 async function download(){setBusy(true);try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await exportReport(data,current.previous,current.status);}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 useEffect(()=>{
   const startup=document.getElementById('startup-loading');
   if(startup){
     startup.querySelector('.loading-percent').textContent=loadPercent+'%';
     startup.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',loadPercent);
     startup.querySelector('.loading-track i').style.width=loadPercent+'%';
     if(!loading && assetsReady)startup.remove();
   }
 },[loading,assetsReady,loadPercent]);
 return <><Dashboard onRetryComparison={()=>setComparisonAttempt(value=>value+1)} ready={!loading&&assetsReady} data={data} previous={current.previous} comparisonStatus={current.status} onUpload={()=>setOpen(true)} onExport={download} exporting={busy}/>{(loading||!assetsReady)&&<div className="app-loading" role="status"><div className="loading-content"><span>Memuat dashboard...</span><strong className="loading-percent">{loadPercent}%</strong><div className="loading-track" role="progressbar" aria-label="Memuat dashboard" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadPercent}><i style={{width:loadPercent+'%'}}/></div></div></div>}
 {notice&&<div className="app-notice" role="status">{notice}<button aria-label="Tutup pemberitahuan" onClick={()=>setNotice('')}><X size={16}/></button></div>}
 {open&&<UploadDialog close={()=>setOpen(false)} apply={apply}/>}</>
}
createRoot(document.getElementById('root')).render(<App/>);
