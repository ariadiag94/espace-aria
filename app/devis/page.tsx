'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Dossier={id:string;dossier_name:string}
type Quote={id:string;quote_number:string;status:string;total_ht:number;total_vat:number;total_ttc:number;created_at:string;dossier_id:string}
type PropertyType='apartment'|'house'

type FormState={dossier_id:string;propertyType:PropertyType;sizeKey:string;packCount:number;boutin:boolean;assainissement:boolean;proximity:boolean;notes:string}

const apartmentPacks:Record<number,number[]>={2:[150,170,190,210,230],3:[180,200,220,240,260],4:[210,230,250,270,290],5:[240,260,280,300,320],6:[270,290,305,330,350],7:[290,310,325,360,380]}
const housePacks:Record<number,number[]>={2:[200,220,240,260,280],3:[240,260,280,300,320],4:[280,300,320,340,360],5:[320,340,360,380,400],6:[350,370,390,410,430]}
const boutinHouse=[70,90,110,130,150]
const apartmentLabels=['T1','T2','T3','T4','T5']
const houseLabels=['≤ 70 m²','71–100 m²','101–120 m²','121–150 m²','151–200 m²']

const euro=(n:number)=>n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})
const dateFr=(v:string)=>new Date(v).toLocaleDateString('fr-FR')

export default function DevisPage(){
 const router=useRouter()
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [dossiers,setDossiers]=useState<Dossier[]>([])
 const [quotes,setQuotes]=useState<Quote[]>([])
 const [form,setForm]=useState<FormState>({dossier_id:'',propertyType:'apartment',sizeKey:'0',packCount:2,boutin:false,assainissement:false,proximity:false,notes:''})

 const load=async()=>{
  const {data:{session}}=await supabase.auth.getSession()
  if(!session){router.replace('/login');return}
  const [d,q]=await Promise.all([
   supabase.from('dossiers').select('id,dossier_name').order('created_at',{ascending:false}),
   supabase.from('quotes').select('id,quote_number,status,total_ht,total_vat,total_ttc,created_at,dossier_id').order('created_at',{ascending:false}).limit(20)
  ])
  if(d.data){setDossiers(d.data as Dossier[]);setForm(f=>({...f,dossier_id:f.dossier_id||d.data?.[0]?.id||''}))}
  if(q.data)setQuotes(q.data as Quote[])
  setLoading(false)
 }
 useEffect(()=>{void load()},[])

 const sizeIndex=Math.max(0,Math.min(4,Number(form.sizeKey)||0))
 const packTable=form.propertyType==='apartment'?apartmentPacks:housePacks
 const allowedPacks=form.propertyType==='apartment'?[2,3,4,5,6,7]:[2,3,4,5,6]
 const effectivePack=allowedPacks.includes(form.packCount)?form.packCount:allowedPacks[0]
 const base=packTable[effectivePack]?.[sizeIndex]||0
 const boutin=form.boutin?(form.propertyType==='apartment'?70:boutinHouse[sizeIndex]):0
 const assainissement=form.assainissement?(form.propertyType==='apartment'?100:160):0
 const proximity=form.proximity?-10:0
 const totalTtc=Math.max(0,base+boutin+assainissement+proximity)
 const totalHt=Math.round((totalTtc/1.2)*100)/100
 const vat=Math.round((totalTtc-totalHt)*100)/100
 const lines=useMemo(()=>{
  const out=[{label:`Pack ${effectivePack} diagnostics – ${form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex]}`,ttc:base}]
  if(form.boutin)out.push({label:'Option Loi Boutin',ttc:boutin})
  if(form.assainissement)out.push({label:'Option assainissement',ttc:assainissement})
  if(form.proximity)out.push({label:'Remise proximité Alfortville / Maisons-Alfort',ttc:-10})
  return out
 },[base,boutin,assainissement,form.boutin,form.assainissement,form.proximity,form.propertyType,sizeIndex,effectivePack])

 const createQuoteNumber=async()=>{
  const d=new Date();const stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;const prefix=`DEV-${stamp}-`
  const {data}=await supabase.from('quotes').select('quote_number').like('quote_number',`${prefix}%`).order('quote_number',{ascending:false}).limit(1)
  const last=data?.[0]?.quote_number||'';const n=last?Number(last.slice(-3))+1:1
  return `${prefix}${String(n).padStart(3,'0')}`
 }

 const save=async()=>{
  setError('')
  if(!form.dossier_id){setError('Choisis un dossier.');return}
  setSaving(true)
  const quoteNumber=await createQuoteNumber()
  const {data:q,error:qError}=await supabase.from('quotes').insert({dossier_id:form.dossier_id,quote_number:quoteNumber,status:'draft',total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,property_type:form.propertyType,property_size:form.propertyType==='apartment'?apartmentLabels[sizeIndex]:houseLabels[sizeIndex],quote_kind:`pack_${effectivePack}`,notes:form.notes||null}).select('id').single()
  if(qError||!q){setError(qError?.message||'Impossible de créer le devis.');setSaving(false);return}
  const {error:lError}=await supabase.from('quote_lines').insert(lines.map((l,i)=>({quote_id:q.id,label:l.label,quantity:1,unit_ttc:l.ttc,total_ttc:l.ttc,sort_order:i})))
  if(lError){setError(lError.message);setSaving(false);return}
  setSaving(false);await load()
 }

 if(loading)return <AppShell active="devis"><div className="loading">Chargement des devis…</div></AppShell>

 return <AppShell active="devis"><main className="page" style={{maxWidth:1280}}>
  <div className="hero-row"><div><div className="eyebrow">DEVIS</div><h1>Devis Express</h1><p>Prépare le montant, puis garde la validation finale avant envoi.</p></div></div>
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(320px,.65fr)',gap:18,alignItems:'start'}}>
   <section className="card" style={{padding:22}}>
    <h2 style={{marginTop:0,color:'#062b59'}}>Nouveau devis</h2>
    {error&&<div className="error">{error}</div>}
    <div className="edit-grid">
     <label className="edit-field wide"><span>Dossier</span><select value={form.dossier_id} onChange={e=>setForm(f=>({...f,dossier_id:e.target.value}))}><option value="">Choisir un dossier…</option>{dossiers.map(d=><option key={d.id} value={d.id}>{d.dossier_name}</option>)}</select></label>
     <label className="edit-field"><span>Type de bien</span><select value={form.propertyType} onChange={e=>setForm(f=>({...f,propertyType:e.target.value as PropertyType,packCount:2,sizeKey:'0'}))}><option value="apartment">Appartement</option><option value="house">Maison</option></select></label>
     <label className="edit-field"><span>{form.propertyType==='apartment'?'Type':'Surface'}</span><select value={form.sizeKey} onChange={e=>setForm(f=>({...f,sizeKey:e.target.value}))}>{(form.propertyType==='apartment'?apartmentLabels:houseLabels).map((x,i)=><option value={i} key={x}>{x}</option>)}</select></label>
     <label className="edit-field"><span>Nombre de diagnostics</span><select value={effectivePack} onChange={e=>setForm(f=>({...f,packCount:Number(e.target.value)}))}>{allowedPacks.map(n=><option key={n} value={n}>{n} diagnostics</option>)}</select></label>
     <div/>
     <label className="check-field"><input type="checkbox" checked={form.boutin} onChange={e=>setForm(f=>({...f,boutin:e.target.checked}))}/><span>Loi Boutin en option</span></label>
     <label className="check-field"><input type="checkbox" checked={form.assainissement} onChange={e=>setForm(f=>({...f,assainissement:e.target.checked}))}/><span>Assainissement</span></label>
     <label className="check-field"><input type="checkbox" checked={form.proximity} onChange={e=>setForm(f=>({...f,proximity:e.target.checked}))}/><span>Remise proximité -10 €</span></label>
     <label className="edit-field wide"><span>Notes internes</span><textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Remise commerciale, précision dossier, information à vérifier…"/></label>
    </div>
   </section>
   <aside className="card" style={{padding:22,position:'sticky',top:18}}>
    <div className="eyebrow">APERÇU</div><h2 style={{margin:'4px 0 14px',color:'#062b59'}}>Montant du devis</h2>
    <div style={{display:'grid',gap:9}}>{lines.map((l,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,borderBottom:'1px solid #edf2f7',paddingBottom:8}}><span>{l.label}</span><b>{euro(l.ttc)}</b></div>)}</div>
    <div style={{marginTop:16,paddingTop:14,borderTop:'2px solid #dce6f0'}}><div style={{display:'flex',justifyContent:'space-between'}}><span>HT</span><b>{euro(totalHt)}</b></div><div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span>TVA 20 %</span><b>{euro(vat)}</b></div><div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:24,color:'#062b59'}}><strong>TTC</strong><strong>{euro(totalTtc)}</strong></div></div>
    <button className="action-btn primary-action" style={{width:'100%',marginTop:18}} disabled={saving} onClick={save}>{saving?'Création…':'Créer le brouillon'}</button>
    <p style={{fontSize:12,color:'#6f7d90',marginBottom:0}}>Le devis reste en brouillon : aucune transmission automatique.</p>
   </aside>
  </div>
  <section className="section"><div className="section-title"><h2>Derniers devis</h2></div><div className="card table-card"><div className="table-head"><div>N° devis</div><div>Statut</div><div>TTC</div><div>Date</div></div>{quotes.length===0?<div className="table-row"><div>Aucun devis.</div></div>:quotes.map(q=><div className="table-row" key={q.id}><div><b>{q.quote_number}</b></div><div><span className="status">{q.status==='draft'?'Brouillon':q.status==='sent'?'Envoyé':q.status}</span></div><div>{euro(Number(q.total_ttc||0))}</div><div>{dateFr(q.created_at)}</div></div>)}</div></section>
 </main></AppShell>
}
