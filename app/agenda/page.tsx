'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Row = Record<string, any>
type Appointment = Row & { id:string; dossier_id:string; starts_at?:string|null; ends_at?:string|null; scheduled_at?:string|null; status?:string|null }
type Dossier = Row & { id:string; dossier_name:string; property_address?:string|null; contact_name?:string|null; contact_phone?:string|null; key_pickup?:string|null; access_instructions?:string|null; building?:string|null; staircase?:string|null; floor?:string|null; door_number?:string|null; lot_numbers?:string|null; dependencies?:string|null }

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

export default function AgendaPage(){
 const router=useRouter()
 const [loading,setLoading]=useState(true)
 const [appointments,setAppointments]=useState<Appointment[]>([])
 const [dossiers,setDossiers]=useState<Dossier[]>([])
 const [selected,setSelected]=useState(startOfDay(new Date()))
 const [view,setView]=useState<'day'|'week'>('week')

 const load=async()=>{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session){router.replace('/login');return}
   const [a,d]=await Promise.all([
     supabase.from('appointments').select('*').order('starts_at',{ascending:true}),
     supabase.from('dossiers').select('*')
   ])
   if(a.data)setAppointments(a.data as Appointment[])
   if(d.data)setDossiers(d.data as Dossier[])
   setLoading(false)
 }
 useEffect(()=>{void load()},[])

 const dossierMap=useMemo(()=>new Map(dossiers.map(d=>[d.id,d])),[dossiers])
 const weekStart=startOfWeek(selected)
 const weekDays=Array.from({length:7},(_,i)=>addDays(weekStart,i))
 const byDay=useMemo(()=>{
   const m=new Map<string,Appointment[]>()
   appointments.forEach(a=>{const raw=appointmentDate(a);if(!raw)return;const key=isoDay(new Date(raw));m.set(key,[...(m.get(key)||[]),a])})
   return m
 },[appointments])
 const selectedAppointments=byDay.get(isoDay(selected))||[]
 const todayKey=isoDay(new Date())
 const upcoming=appointments.filter(a=>{const raw=appointmentDate(a);return raw&&new Date(raw).getTime()>=Date.now()}).length

 const navigate=(n:number)=>setSelected(d=>addDays(d,view==='week'?n*7:n))
 const goToday=()=>setSelected(startOfDay(new Date()))

 if(loading)return <AppShell active="agenda"><div className="loading">Chargement de l’agenda…</div></AppShell>

 return <AppShell active="agenda">
  <main className="page" style={{maxWidth:1320}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:16,flexWrap:'wrap',marginBottom:18}}>
    <div><div className="eyebrow">AGENDA</div><h1 style={{margin:'4px 0 5px',color:'#062b59'}}>Planning des interventions</h1><p style={{margin:0,color:'#6f7d90'}}>{upcoming} rendez-vous à venir · {appointments.length} au total</p></div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <button onClick={()=>setView('day')} style={toggleStyle(view==='day')}>Jour</button>
     <button onClick={()=>setView('week')} style={toggleStyle(view==='week')}>Semaine</button>
    </div>
   </div>

   <section className="card" style={{padding:16,marginBottom:16}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
     <div style={{display:'flex',gap:8}}><button onClick={()=>navigate(-1)} style={navButton}>←</button><button onClick={goToday} style={navButton}>Aujourd’hui</button><button onClick={()=>navigate(1)} style={navButton}>→</button></div>
     <strong style={{color:'#062b59',fontSize:18,textTransform:'capitalize'}}>{view==='week'?monthYear(weekStart):fullDateFr(selected)}</strong>
    </div>
   </section>

   {view==='week' ? <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(150px,1fr))',gap:10,overflowX:'auto',paddingBottom:4}}>
    {weekDays.map(day=>{const key=isoDay(day),items=byDay.get(key)||[],isToday=key===todayKey,isSelected=key===isoDay(selected);return <section key={key} onClick={()=>setSelected(day)} className="card" style={{minHeight:340,padding:12,cursor:'pointer',border:isSelected?'2px solid #58c3e5':'1px solid #dce6f0'}}>
      <div style={{paddingBottom:10,borderBottom:'1px solid #edf2f7',marginBottom:10}}><span style={{display:'block',fontSize:11,textTransform:'uppercase',color:isToday?'#0b65b5':'#6f7d90',fontWeight:800}}>{shortDay(day)}</span><b style={{display:'block',fontSize:24,color:'#062b59'}}>{day.getDate()}</b></div>
      {items.length===0?<div style={{fontSize:11,color:'#9aa6b3'}}>Aucun RDV</div>:items.map(a=><WeekCard key={a.id} a={a} dossier={dossierMap.get(a.dossier_id)}/>)}
     </section>})}
   </div> : <DayView day={selected} items={selectedAppointments} dossierMap={dossierMap}/>} 

   {view==='week'&&<section style={{marginTop:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9}}><h2 style={{margin:0,color:'#062b59',fontSize:19,textTransform:'capitalize'}}>{fullDateFr(selected)}</h2><span style={{color:'#6f7d90',fontSize:12}}>{selectedAppointments.length} RDV</span></div><DayView day={selected} items={selectedAppointments} dossierMap={dossierMap}/></section>}
  </main>
 </AppShell>
}

function WeekCard({a,dossier}:{a:Appointment,dossier?:Dossier}){const raw=appointmentDate(a);return <Link href={`/dossiers/${a.dossier_id}`} onClick={e=>e.stopPropagation()} style={{display:'block',background:'#eef7ff',border:'1px solid #cfe4f5',borderRadius:10,padding:9,marginBottom:8}}><b style={{display:'block',fontSize:12,color:'#07589f'}}>{timeFr(raw)}</b><span style={{display:'block',marginTop:4,fontSize:11,fontWeight:700,color:'#173d63',lineHeight:1.35}}>{dossier?.dossier_name||'Dossier'}</span><span style={{display:'block',marginTop:4,fontSize:10,color:'#6f7d90'}}>{text(dossier?.property_address)}</span></Link>}

function DayView({day,items,dossierMap}:{day:Date,items:Appointment[],dossierMap:Map<string,Dossier>}){if(items.length===0)return <div className="card" style={{padding:22,color:'#6f7d90'}}>Aucune intervention planifiée pour cette journée.</div>;return <div style={{display:'grid',gap:10}}>{items.map(a=>{const d=dossierMap.get(a.dossier_id);const raw=appointmentDate(a);return <div className="card" key={a.id} style={{padding:16,display:'grid',gridTemplateColumns:'95px minmax(0,1fr) auto',gap:16,alignItems:'start'}}>
 <div><b style={{fontSize:22,color:'#062b59'}}>{timeFr(raw)}</b>{a.ends_at&&<span style={{display:'block',fontSize:11,color:'#6f7d90',marginTop:3}}>→ {timeFr(a.ends_at)}</span>}<span className="status" style={{marginTop:9}}>{statusLabel(a.status)}</span></div>
 <div><Link href={`/dossiers/${a.dossier_id}`} style={{fontSize:16,fontWeight:800,color:'#062b59'}}>{d?.dossier_name||'Dossier'}</Link><div style={{marginTop:7,color:'#4c6077',fontSize:12}}><b>Adresse :</b> {text(d?.property_address,d?.address)}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Contact :</b> {text(a.contact_name,d?.contact_name)} {text(a.contact_phone,d?.contact_phone)!=='—'&&<>· <a href={`tel:${String(text(a.contact_phone,d?.contact_phone)).replace(/\s/g,'')}`} style={{color:'#0b65b5',fontWeight:700}}>{text(a.contact_phone,d?.contact_phone)}</a></>}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Accès :</b> {text(a.key_pickup,d?.key_pickup)} · {text(a.access_instructions,d?.access_instructions)}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Repères :</b> Bât. {text(d?.building)} · Cage {text(d?.staircase)} · Étage {text(d?.floor)} · Porte {text(d?.door_number)}</div><div style={{marginTop:5,color:'#4c6077',fontSize:12}}><b>Lots / annexes :</b> {text(d?.lot_numbers)} · {text(d?.dependencies)}</div></div>
 <Link href={`/dossiers/${a.dossier_id}`} style={{border:'1px solid #cddbe8',borderRadius:9,padding:'9px 11px',color:'#175d98',fontWeight:700,fontSize:12}}>Ouvrir</Link>
 </div>})}</div>}

const navButton:React.CSSProperties={border:'1px solid #cddbe8',background:'#fff',color:'#174d80',borderRadius:9,padding:'8px 11px',fontWeight:700,cursor:'pointer'}
const toggleStyle=(active:boolean):React.CSSProperties=>({border:'1px solid '+(active?'#0a5fae':'#cddbe8'),background:active?'#0a5fae':'#fff',color:active?'#fff':'#174d80',borderRadius:9,padding:'9px 13px',fontWeight:800,cursor:'pointer'})