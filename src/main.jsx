import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Upload, X, FileSpreadsheet, Check, LoaderCircle, ArrowLeft} from 'lucide-react';
import Dashboard from './Dashboard.jsx';
import initial from './initial.json';
import {buildSnapshot} from './data.js';
import {exportReport} from './exportReport.js';
import './app.css';

const endpoint=(import.meta.env.VITE_APPS_SCRIPT_URL||'').trim();
const cache='sumbar.pes.snapshot.v1';
const types=[['sls','Progres SLS'],['nonUb','PES SE2026 · Non-UB'],['ub','PES SE2026 · UB']];
const fmt=n=>Number(n).toLocaleString('id-ID');
function check(x){
  if(!x || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || !/^\d{2}:\d{2}$/.test(x.time) || !Array.isArray(x.rows)||!x.rows.length || ![x.totals,...x.rows].every(r=>['sls','nonUb','ub'].every(k=>Number.isFinite(r?.[k]?.target)))) throw new Error('Format data tersimpan tidak sesuai.');
  return x;
}
async function api(body){
  const response=await fetch(endpoint,body?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)}:{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Server tidak dapat diakses. Periksa URL dan akses deployment.');
  const result=await response.json();if(!result.ok)throw new Error(result.error||'Permintaan gagal.');return result.snapshot;
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
      if(types.some(([k])=>!files[k]))throw new Error('Pilih ketiga file CSV sebelum memeriksa data.');
      const inputs=Object.fromEntries(await Promise.all(types.map(async ([k])=>[k,await files[k].text()])));
      setDraft(buildSnapshot(inputs,date,time));
    }}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <dialog className="import-dialog" aria-labelledby="import-title" ref={ref} onCancel={e=>{if(e.target===ref.current){e.preventDefault();if(!busy)close();}}}>
    <header><span className="import-icon"><Upload size={21}/></span><button type="button" className="icon-close" disabled={busy} onClick={close} aria-label="Tutup"><X size={20}/></button></header>
    <h2 id="import-title">{draft?'Periksa hasil impor':'Perbarui progres'}</h2>
    <p>{draft?'Pastikan target tiap sumber dan waktu laporan sudah sesuai.':'Pilih tiga ekspor CSV untuk satu waktu pelaporan.'}</p>
    <form onSubmit={submit}>
    {draft?<><p className="import-date">{draft.date} · {draft.time} WIB · {draft.rows.length} wilayah</p>
    <div className="import-review">{types.map(([k,label])=><div key={k}><span>{label}</span><strong>{fmt(draft.totals[k].target)} target</strong></div>)}</div>
    {endpoint&&<label className="import-field">Kunci admin<input required type="password" value={key} onChange={e=>setKey(e.target.value)} autoComplete="off"/></label>}
    <small>{endpoint?'Data akan tersimpan di Google Sheets.':'Mode lokal · Progres tersimpan di browser perangkat ini.'}</small></>:<>
    <div className="import-fields"><label className="import-field">Tanggal laporan<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="import-field">Pukul (WIB)<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>
    {types.map(([k,label])=><label className="file-slot" key={k}><FileSpreadsheet size={22}/><span><b>{label}</b><small>{files[k]?.name||'Pilih file .csv'}</small></span>{files[k]&&<Check size={18}/>}<input aria-label={label} required={!files[k]} type="file" accept=".csv,text/csv" onChange={e=>setFiles({...files,[k]:e.target.files[0]})}/></label>)}</>}
    {error&&<p role="alert" className="import-error">{error}</p>}
    <footer>{draft&&<button type="button" disabled={busy} onClick={()=>{setDraft(null);setError('');}}><ArrowLeft size={16}/> Ubah</button>}<button className="primary-import" disabled={busy}>{busy&&<LoaderCircle className="import-spin" size={17}/>} {draft?'Simpan progres':'Periksa data'}</button></footer>
    </form></dialog>
}
function App(){
 const [data,setData]=useState(initial),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(!!endpoint),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;(async()=>{try{
 const stored=endpoint?await api():JSON.parse(localStorage.getItem(cache)||'null');if(stored&&alive)setData(check(stored));
 }catch{if(alive)setNotice('Gagal memuat data tersimpan. Dashboard menampilkan laporan awal 14 November 2026.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[]);
 async function apply(snapshot,adminKey){if(endpoint){const saved=await api({adminKey,snapshot});setData(check(saved));}else{localStorage.setItem(cache,JSON.stringify(snapshot));setData(snapshot);}setNotice(endpoint?'Progres berhasil disimpan ke Google Sheets.':'Progres tersimpan di browser ini.');}
 async function download(){setBusy(true);try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await exportReport(data);}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 return <><Dashboard data={data} onUpload={()=>setOpen(true)} onExport={download} exporting={busy}/>{loading&&<div className="app-loading" role="status"><LoaderCircle className="import-spin"/> Memuat progres…</div>}
 {notice&&<div className="app-notice" role="status">{notice}<button aria-label="Tutup pemberitahuan" onClick={()=>setNotice('')}><X size={16}/></button></div>}
 {open&&<UploadDialog close={()=>setOpen(false)} apply={apply}/>}</>
}
createRoot(document.getElementById('root')).render(<App/>);


