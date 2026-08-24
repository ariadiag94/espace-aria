'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Row = Record<string, any>
type Appointment = Row & { id:string; dossier_id:string; starts_at?:string|null; ends_at?:string|null; scheduled_at?:string|null; status?:string|null; notes?:string|null }
type Dossier = Row & { id:string; dossier_name:string; property_address?:string|null; contact_name?:string|null; contact_phone?:string|null; key_pickup?:string|null; access_instructions?:string|null; building?:string|null; staircase?:string|null; floor?:string|null; door_number?:string|null; lot_numbers?:string|null; dependencies?:string|null }
type FormState = { id?:string; dossier_id:string; day:string; month:string; year:string; startHour:string; startMinute:string; endHour:string; endMinute:string; status:string; notes:string }

const statusLabels:Record<string,string>={scheduled:'Planifié',planned:'Planifié',confirmed:'Confirmé',completed:'Terminé',done:'Terminé',cancelled:'Annulé',canceled:'Annulé'}
const statusLabel=(v?:string|null)=>statusLabels[(v||'').toLowerCase()]||(v||'Planifié')
const startOfDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate())
const startOfWeek=(d:Date)=>{const x=startOfDay(d);const n=x.getDay()===0?6:x.getDay()-1;x.setDate(x.getDate()-n);return x}
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x}
const isoDay=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const appointmentDate=(a:Appointment)=>a.starts_at||a.scheduled_at||a.created_at
const timeFr=(v:any)=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
const fullDateFr=(d:Date)=>d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
const shortDay=(d:Date)=>d.toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')
const monthYear=(d:Date)=>d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
const text=(...vals:any[])=>vals.find(v=>v!==null&&v!==undefined&&String(v).trim()!=='')||'—'
const pad=(v:string)=>v.padStart(2,'0')

export default function AgendaPage(){
 const router=useRouter()
 const [loading,setLoading]=useState(true)
 const [appointments,setAppointments]=useState<Appointment[]>([])
 const [dossiers,setDossiers]=useState<Dossier[]>([])
 const [selected,setSelected]=useState(startOfDay(new Date()))
 const [view,setView]=useState<'day'|'week'>('week')
 const [modalOpen,setModalOpen]=useState(false)
 const [saving,setSaving]=useState(false)
 const [formError,setFormError]=useState('')
 const [form,setForm]=useState<FormState>(emptyForm(startOfDay(new Date())))

 const load=async()=>{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session){router.replace('/login');return}
   const [a,d]=await Promise.all([
     supabase.from('appointments').select('*').order('starts_at',{ascending:true}),
     supabase.from('dossiers').select('*').order('created_at',{ascending:false})
   ])
   if(a.data)setAppointments(a.data as Appointment[])
   if(d.data)setDossiers(d.data as Dossier[])
   setLoading(false)
 }
 useEffect(()=>{void load()},[])

 const dossierMap=useMemo(()=>new Map(dossiers.map(d=>[d.id,d])),[dossiers])
 const weekStart=startOfWeek(selected)
 const weekDays=Array.from({length:7},(_,i)=>addDays(weekStart,i))
 const visibleAppointments=appointments.filter(a=>!['cancelled','canceled'].includes((a.status||'').toLowerCase()))
 const byDay=useMemo(()=>{
   const m=new Map<string,Appointment[]>()
   visibleAppointments.forEach(a=>{const raw=appointmentDate(a);if(!raw)return;const key=isoDay(new Date(raw));m.set(key,[...(m.get(key)||[]),a])})
   return m
 },[appointments])
 const selectedAppointments=byDay.get(isoDay(selected))||[]
 const todayKey=isoDay(new Date())
 const upcoming=visibleAppointments.filter(a=>{const raw=appointmentDate(a);return raw&&new Date(raw).getTime()>=Date.now()}).length

 const navigate=(n:number)=>setSelected(d=>addDays(d,view==='week'?n*7:n))
 const goToday=()=>setSelected(startOfDay(new Date()))
 const openNew=(day=selected)=>{setForm(emptyForm(day,dossiers[0]?.id||''));setFormError('');setModalOpen(true)}
 const openEdit=(a:Appointment)=>{const start=new Date(appointmentDate(a));const end=a.ends_at?new Date(a.ends_at):new Date(start.getTime()+60*60*1000);setForm({id:a.id,dossier_id:a.dossier_id,day:String(start.getDate()),month:String(start.getMonth()+1),year:String(start.getFullYear()),startHour:String(start.getHours()),startMinute:String(start.getMinutes()),endHour:String(end.getHours()),endMinute:String(end.getMinutes()),status:a.status||'scheduled',notes:a.notes||''});setFormError('');setModalOpen(true)}

 const saveAppointment=async()=>{
   setFormError('')
   const day=Number(form.day),month=Number(form.month),year=Number(form.year),sh=Number(form.startHour),sm=Number(form.startMinute),eh=Number(form.endHour),em=Number(form.endMinute)
   if(!form.dossier_id){setFormError('Choisis un dossier.');return}
   if(!validParts(day,month,year,sh,sm,eh,em)){setFormError('Vérifie la date et les horaires.');return}
   const start=new Date(year,month-1,day,sh,sm,0,0),end=new Date(year,month-1,day,eh,em,0,0)
   if(start.getFullYear()!==year||start.getMonth()!==month-1||start.getDate()!==day){setFormError('Cette date n’existe pas.');return}
   if(end<=start){setFormError('L’heure de fin doit être après l’heure de début.');return}
   setSaving(true)
   const dossier=dossierMap.get(form.dossier_id)
   const payload={dossier_id:form.dossier_id,starts_at:start.toISOString(),scheduled_at:start.toISOString(),ends_at:end.toISOString(),status:form.status||'scheduled',notes:form.notes||null,contact_name:dossier?.contact_name||null,contact_phone:dossier?.contact_phone||null,key_pickup:dossier?.key_pickup||null,access_instructions:dossier?.access_instructions||null}
   const res=form.id?await supabase.from('appointments').update(payload).eq('id',form.id):await supabase.from('appointments').insert(payload)
   if(res.error){setFormError(res.error.message);setSaving(false);return}
   setModalOpen(false);setSaving(false);setLoading(true);await load();setSelected(startOfDay(start))
 }

 const cancelAppointment=async()=>{
   if(!form.id)return
   if(!window.confirm('Annuler ce rendez-vous ?'))return
   setSaving(true)
   const {error}=await supabase.from('appointments').update({status:'cancelled'}).eq('id',form.id)
   if(error){setFormError(error.message);setSaving(false);return}
   setModalOpen(false);setSaving(false);setLoading(true);await load()
 }

 if(loading)return <AppShell active="agenda"><div className="loading">Chargement de l’agenda…</div></AppShell>

 return <AppShell active="agenda">
  <main className="page" style={{maxWidth:1320}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:16,flexWrap:'wrap',marginBottom:18}}>
    <div><div className="eyebrow">AGENDA</div><h1 style={{margin:'4px 0 5px',color:'#062b59'}}>Planning des interventions</h1><p style={{margin:0,color:'#6f7d90'}}>{upcoming} rendez-vous à venir · {visibleAppointments.length} actif(s)</p></div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={()=>openNew()} style={{...navButton,background:'#062b59',color:'#fff',borderColor:'#062b59'}}>＋ Nouveau RDV</button><button onClick={()=>setView('day')} style={toggleStyle(view==='day')}>Jour</button><button onClick={()=>setView('week')} style={toggleStyle(view==='week')}>Semaine</button></div>
   </div>

   <section className="card" style={{padding:16,marginBottom:16}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{display:'flex',gap:8}}><button onClick={()=>navigate(-1)} style={navButton}>←</button><button onClick={goToday} style={navButton}>Aujourd’hui</button><button onClick={()=>navigate(1)} style={navButton}>→</button></div><strong style={{color:'#062b59',fontSize:18,textTransform:'capitalize'}}>{view==='week'?monthYear(weekStart):fullDateFr(selected)}</strong></div></section>

   {view==='week' ? <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(150px,1fr))',gap:10,overflowX:'auto',paddingBottom:4}}>{weekDays.map(day=>{const key=isoDay(day),items=byDay.get(key)||[],isToday=key===todayKey,isSelected=key===isoDay(selected);return <section key={key} onClick={()=>setSelected(day)} onDoubleClick={()=>openNew(day)} className="card" style={{minHeight:340,padding:12,cursor:'pointer',border:isSelected?'2px solid #58c3e5':'1px solid #dce6f0'}}><div style={{paddingBottom:10,borderBottom:'1px solid #edf2f7',marginBottom:10}}><span style={{display:'block',fontSize:11,textTransform:'uppercase',color:isToday?'#0b65b5':'#6f7d90',fontWeight:800}}>{shortDay(day)}</span><b style={{display:'block',fontSize:24,color:'#062b59'}}>{day.getDate()}</b></div>{items.length===0?<div style={{fontSize:11,color:'#9aa6b3'}}>Aucun RDV</div>:items.map(a=><WeekCard key={a.id} a={a} dossier={dossierMap.get(a.dossier_id)} onEdit={()=>openEdit(a)}/>)}</section>})}</div> : <DayView items={selectedAppointments} dossierMap={dossierMap} onEdit={openEdit}/>} 

   {view==='week'&&<section style={{marginTop:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9}}><h2 style={{margin:0,color:'#062b59',fontSize:19,textTransform:'capitalize'}}>{fullDateFr(selected)}</h2><span style={{color:'#6f7d90',fontSize:12}}>{selectedAppointments.length} RDV</span></div><DayView items={selectedAppointments} dossierMap={dossierMap} onEdit={openEdit}/></section>}

   {modalOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}><div className="edit-modal" role="dialog" aria-modal="true" style={{maxWidth:720}}><div className="edit-modal-head"><div><span className="section-kicker">AGENDA</span><h2>{form.id?'Modifier le rendez-vous':'Nouveau rendez-vous'}</h2></div><button onClick={()=>setModalOpen(false)}>×</button></div>{formError&&<div className="error">{formError}</div>}<div className="edit-grid"><label className="edit-field wide"><span>Dossier</span><select value={form.dossier_id} onChange={e=>setForm(f=>({...f,dossier_id:e.target.value}))} style={selectStyle}><option value="">Choisir un dossier…</option>{dossiers.map(d=><option value={d.id} key={d.id}>{d.dossier_name}</option>)}</select></label><NumField label="Jour" value={form.day} onChange={v=>setForm(f=>({...f,day:v}))}/><NumField label="Mois" value={form.month} onChange={v=>setForm(f=>({...f,month:v}))}/><NumField label="Année" value={form.year} onChange={v=>setForm(f=>({...f,year:v}))}/><div/><NumField label="Début heure" value={form.startHour} onChange={v=>setForm(f=>({...f,startHour:v}))}/><NumField label="Début minute" value={form.startMinute} onChange={v=>setForm(f=>({...f,startMinute:v}))}/><NumField label="Fin heure" value={form.endHour} onChange={v=>setForm(f=>({...f,endHour:v}))}/><NumField label="Fin minute" value={form.endMinute} onChange={v=>setForm(f=>({...f,endMinute:v}))}/><label className="edit-field"><span>Statut</span><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={selectStyle}><option value="scheduled">Planifié</option><option value="confirmed">Confirmé</option><option value="completed">Terminé</option></select></label><label className="edit-field wide"><span>Notes</span><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{...selectStyle,resize:'vertical'}} placeholder="Informations complémentaires, consignes, rappel…"/></label></div><div style={{marginTop:14,padding:12,border:'1px solid #dce6f0',borderRadius:10,background:'#f7fafd',color:'#062b59',fontWeight:700}}>RDV : {pad(form.day)}/{pad(form.month)}/{form.year} · {pad(form.startHour)}:{pad(form.startMinute)} → {pad(form.endHour)}:{pad(form.endMinute)}</div><div className="edit-modal-actions" style={{justifyContent:form.id?'space-between':'flex-end'}}>{form.id&&<button className="ghost-btn" style={{color:'#a62d2d',borderColor:'#efcaca'}} disabled={saving} onClick={cancelAppointment}>Annuler le RDV</button>}<div style={{display:'flex',gap:9}}><button className="ghost-btn" onClick={()=>setModalOpen(false)}>Fermer</button><button className="action-btn primary-action" disabled={saving} onClick={saveAppointment}>{saving?'Enregistrement…':'Enregistrer'}</button></div></div></div></div>}
  </main>
 </AppShell>
}

function WeekCard({a,dossier,onEdit}:{a:Appointment,dossier?:Dossier,onEdit:()=>void}){const raw=appointmentDate(a);return <button onClick={e=>{e.stopPropagation();onEdit()}} style={{display:'block',width:'100%',textAlign:'left',background:'#eef7ff',border:'1px solid #cfe4f5',borderRadius:10,padding:9,marginBottom:8,cursor:'pointer'}}><b style={{display:'block',fontSize:12,color:'#07589f'}}>{timeFr(raw)}</b><span style={{display:'block',marginTop:4,fontSize:11,fontWeight:700,color:'#173d63',lineHeight:1.35}}>{dossier?.dossier_name||'Dossier'}</span><span style={{display:'block',marginTop:4,fontSize:10,color:'#6f7d90'}}>{text(dossier?.property_address)}</span></button>}

function DayView({items,dossierMap,onEdit}:{items:Appointment[],dossierMap:Map<string,Dossier>,onEdit:(a:Appointment)=>void}){if(items.length===0)return <div className="card" style={{padding:22,color:'#6f7d90'}}>Aucune intervention planifiée pour cette journée.</div>;return <div style={{display:'grid',gap:10}}>{items.map(a=>{const d=dossierMap.get(a.dossier_id);const raw=appointmentDate(a);return <div className="card" key={a.id} style={{padding:16,display:'grid',gridTemplateColumns:'95px minmax(0,1fr) auto',gap:16,alignItems:'start'}}><div><b style={{fontSize:22,color:'#062b59'}}>{timeFr(raw)}</b>{a.ends_at&&<span style={{display:'block',fontSize:11,color:'#6f7d90',marginTop:3}}>→ {timeFr(a.ends_at)}</span>}<span className="status" style={{marginTop:9}}>{statusLabel(a.status)}</span></div><div><Link href={`/dossiers/${a.dossier_id}`} style={{fontSize:16,fontWeight:800,color:'#062b59'}}>{d?.dossier_name||'Dossier'}</Link><div style={{marginTop:7,color:'#4c6077',fontSize:12}}><b>Adresse :</b> {text(d?.property_address,d?.address)}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Contact :</b> {text(a.contact_name,d?.contact_name)} {text(a.contact_phone,d?.contact_phone)!=='—'&&<>· <a href={`tel:${String(text(a.contact_phone,d?.contact_phone)).replace(/\s/g,'')}`} style={{color:'#0b65b5',fontWeight:700}}>{text(a.contact_phone,d?.contact_phone)}</a></>}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Accès :</b> {text(a.key_pickup,d?.key_pickup)} · {text(a.access_instructions,d?.access_instructions)}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Repères :</b> Bât. {text(d?.building)} · Cage {text(d?.staircase)} · Étage {text(d?.floor)} · Porte {text(d?.door_number)}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Lots / annexes :</b> {text(d?.lot_numbers)} · {text(d?.dependencies)}</div>{a.notes&&<div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Notes :</b> {a.notes}</div>}</div><div style={{display:'grid',gap:8}}><button onClick={()=>onEdit(a)} style={{...navButton,padding:'9px 11px'}}>Modifier</button><Link href={`/dossiers/${a.dossier_id}`} style={{border:'1px solid #cddbe8',borderRadius:9,padding:'9px 11px',color:'#175d98',fontWeight:700,fontSize:12,textAlign:'center'}}>Ouvrir</Link></div></div>})}</div>}

function NumField({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void}){return <label className="edit-field"><span>{label}</span><input inputMode="numeric" value={value} onChange={e=>onChange(e.target.value.replace(/\D/g,''))}/></label>}
function emptyForm(d:Date,dossier_id=''):FormState{return{dossier_id,day:String(d.getDate()),month:String(d.getMonth()+1),year:String(d.getFullYear()),startHour:'09',startMinute:'00',endHour:'10',endMinute:'00',status:'scheduled',notes:''}}
function validParts(day:number,month:number,year:number,sh:number,sm:number,eh:number,em:number){return Number.isInteger(day)&&day>=1&&day<=31&&Number.isInteger(month)&&month>=1&&month<=12&&Number.isInteger(year)&&year>=2020&&year<=2100&&Number.isInteger(sh)&&sh>=0&&sh<=23&&Number.isInteger(sm)&&sm>=0&&sm<=59&&Number.isInteger(eh)&&eh>=0&&eh<=23&&Number.isInteger(em)&&em>=0&&em<=59}
const navButton:CSSProperties={border:'1px solid #cddbe8',background:'#fff',color:'#174d80',borderRadius:9,padding:'8px 11px',fontWeight:700,cursor:'pointer'}
const toggleStyle=(active:boolean):CSSProperties=>({border:'1px solid '+(active?'#0a5fae':'#cddbe8'),background:active?'#0a5fae':'#fff',color:active?'#fff':'#174d80',borderRadius:9,padding:'9px 13px',fontWeight:800,cursor:'pointer'})
const selectStyle:CSSProperties={width:'100%',border:'1px solid #d3e0ea',borderRadius:10,padding:'11px 12px',outline:'none',background:'#fff'}