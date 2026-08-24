'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Row = Record<string, any>
type Dossier = Row & {
  id:string
  dossier_name:string
  status:string
  purpose:string|null
  liciel_number:string|null
  contact_name:string|null
  contact_phone:string|null
  key_pickup:string|null
  access_instructions:string|null
  created_at:string
}
type Quote = Row & { id:string; quote_number:string; status:string; total_ttc:number }
type StorageFile = { name:string; created_at?:string|null; updated_at?:string|null; metadata?:Row|null }

type EditForm = {
  purpose:string; property_address:string; contact_name:string; contact_phone:string; contact_email:string
  liciel_number:string; building:string; staircase:string; floor:string; door_number:string; lot_numbers:string
  dependencies:string; key_pickup:string; access_instructions:string; parking_instructions:string; diagnostics:string
}

const statusLabels:Record<string,string>={
  draft:'Brouillon', sent:'Devis envoyé', quote_sent:'Devis envoyé', accepted:'Accepté', signed:'Signé',
  scheduled:'RDV planifié', planned:'RDV planifié', in_progress:'En cours', completed:'Terminé', done:'Terminé',
  paid:'Payé', pending:'En attente', ready:'Prêt', available:'Disponible', cancelled:'Annulé', canceled:'Annulé'
}
const purposeLabels:Record<string,string>={sale:'Vente',vente:'Vente',rental:'Location',rent:'Location',location:'Location',works:'Travaux',work:'Travaux',travaux:'Travaux',other:'Autre',autre:'Autre'}
const labelPurpose=(v?:string|null)=>{
  const raw=(v||'').trim().toLowerCase()
  return purposeLabels[raw] || (v||'—')
}
const labelStatus=(v?:string|null)=>{
  const raw=(v||'').trim().toLowerCase()
  return statusLabels[raw] || (v?String(v).replaceAll('_',' '):'—')
}
const value=(...candidates:any[])=> candidates.find(v=>v!==null&&v!==undefined&&String(v).trim()!=='') ?? '—'
const euro=(n:any)=> Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'
const dateFr=(v:any)=>{ if(!v||v==='—')return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('fr-FR') }
const dateTimeFr=(v:any)=>{ if(!v||v==='—')return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}) }
const cleanArray=(raw:any):string[]=>{
  if(!raw)return []
  if(Array.isArray(raw))return raw.map(String).map(x=>x.trim()).filter(Boolean)
  if(typeof raw==='object')return Object.values(raw).flatMap(cleanArray)
  return String(raw).split(/[,;|\n]+/).map(x=>x.trim()).filter(Boolean)
}

const diagnosticLabels:Record<string,string>={
  dpe:'DPE', amiante:'Amiante', asbestos:'Amiante', electricite:'Électricité', electricity:'Électricité', elec:'Électricité',
  gaz:'Gaz', gas:'Gaz', plomb:'Plomb / CREP', crep:'Plomb / CREP', termites:'Termites', termite:'Termites',
  carrez:'Loi Carrez', boutin:'Loi Boutin', erp:'ERP', assainissement:'Assainissement', sanitation:'Assainissement'
}
const diagnosticChoices=['DPE','Amiante','Électricité','Gaz','Plomb / CREP','Termites','Loi Carrez','Loi Boutin','ERP','Assainissement']
const normalizeDiagnostic=(name:string)=>{
  const key=name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'')
  const found=Object.entries(diagnosticLabels).find(([k])=>key.includes(k))
  return found?.[1] || name
}

export default function DossierPage(){
 const {id}=useParams<{id:string}>(); const router=useRouter(); const fileInput=useRef<HTMLInputElement|null>(null)
 const [d,setD]=useState<Dossier|null>(null); const [quotes,setQuotes]=useState<Quote[]>([])
 const [appointments,setAppointments]=useState<Row[]>([]); const [documents,setDocuments]=useState<Row[]>([])
 const [invoices,setInvoices]=useState<Row[]>([]); const [payments,setPayments]=useState<Row[]>([]); const [storageFiles,setStorageFiles]=useState<StorageFile[]>([])
 const [loading,setLoading]=useState(true); const [copied,setCopied]=useState(''); const [uploading,setUploading]=useState(false)
 const [editing,setEditing]=useState(false); const [saving,setSaving]=useState(false); const [editError,setEditError]=useState('')
 const [form,setForm]=useState<EditForm>({purpose:'',property_address:'',contact_name:'',contact_phone:'',contact_email:'',liciel_number:'',building:'',staircase:'',floor:'',door_number:'',lot_numbers:'',dependencies:'',key_pickup:'',access_instructions:'',parking_instructions:'',diagnostics:''})

 const load=async()=>{
   const {data:{session}}=await supabase.auth.getSession(); if(!session){router.replace('/login');return}
   const dossierRes=await supabase.from('dossiers').select('*').eq('id',id).single(); const dossier=dossierRes.data as Dossier|null; setD(dossier)
   const [q,a,docs,inv,pay,stored]=await Promise.all([
     supabase.from('quotes').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('appointments').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('documents').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('invoices').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('payments').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.storage.from('dossier-documents').list(`${id}/${session.user.id}`,{limit:100,sortBy:{column:'created_at',order:'desc'}})
   ])
   setQuotes((q.data||[]) as Quote[]); setAppointments(a.data||[]); setDocuments(docs.data||[]); setInvoices(inv.data||[]); setPayments(pay.data||[]); setStorageFiles((stored.data||[]) as StorageFile[]); setLoading(false)
 }

 useEffect(()=>{void load()},[id])

 const latestQuote=quotes[0]
 const paidAmount=useMemo(()=>payments.reduce((s,p)=>s+Number(value(p.amount,p.amount_ttc,p.total,0)),0),[payments])
 const copy=async(label:string,text:any)=>{if(!text||text==='—')return; await navigator.clipboard.writeText(String(text)); setCopied(label); setTimeout(()=>setCopied(''),1400)}

 if(loading)return <AppShell active="dossiers"><div className="loading">Chargement…</div></AppShell>
 if(!d)return <AppShell active="dossiers"><main className="page"><p>Dossier introuvable.</p></main></AppShell>

 const phone=value(d.contact_phone,d.phone)
 const email=value(d.contact_email,d.email)
 const address=value(d.property_address,d.address,d.site_address)
 const lots=value(d.lot_numbers,d.lots,d.lot_number)
 const dependencies=value(d.dependencies,d.annexes,d.outbuildings)
 const keyPickup=value(d.key_pickup,d.keys_location)
 const access=value(d.access_instructions,d.access_notes)
 const building=value(d.building,d.batiment)
 const staircase=value(d.staircase,d.cage)
 const floor=value(d.floor,d.etage)
 const door=value(d.door_number,d.porte)
 const parking=value(d.parking_instructions,d.parking)
 const digicode=value(d.digicode,d.access_code,d.door_code)
 const interphone=value(d.intercom,d.interphone)
 const nextAppointment=appointments.find(x=>new Date(value(x.start_at,x.scheduled_at,x.date,x.created_at)).getTime()>=Date.now()) || appointments[0]
 const diagnostics=Array.from(new Set(cleanArray(value(d.diagnostics,d.ordered_diagnostics,d.diagnostic_types,d.missions,latestQuote?.diagnostics,'')).map(normalizeDiagnostic).filter(x=>x&&x!=='—')))
 const dependencyTags=cleanArray(dependencies==='—'?'':dependencies)
 const documentCount=documents.length+storageFiles.length

 const openEdit=()=>{
   const rawPurpose=String(value(d.purpose,'' )).trim().toLowerCase()
   const normalizedPurpose=rawPurpose==='sale'||rawPurpose==='vente'?'sale':rawPurpose==='rental'||rawPurpose==='rent'||rawPurpose==='location'?'rental':rawPurpose==='works'||rawPurpose==='work'||rawPurpose==='travaux'?'works':rawPurpose==='other'||rawPurpose==='autre'?'other':rawPurpose
   setForm({
     purpose:normalizedPurpose, property_address:address==='—'?'':String(address), contact_name:String(value(d.contact_name,'')),
     contact_phone:phone==='—'?'':String(phone), contact_email:email==='—'?'':String(email), liciel_number:String(value(d.liciel_number,'')),
     building:building==='—'?'':String(building), staircase:staircase==='—'?'':String(staircase), floor:floor==='—'?'':String(floor), door_number:door==='—'?'':String(door),
     lot_numbers:lots==='—'?'':String(lots), dependencies:dependencies==='—'?'':String(dependencies), key_pickup:keyPickup==='—'?'':String(keyPickup),
     access_instructions:access==='—'?'':String(access), parking_instructions:parking==='—'?'':String(parking), diagnostics:diagnostics.join(', ')
   }); setEditError(''); setEditing(true)
 }
 const setField=(key:keyof EditForm,val:string)=>setForm(f=>({...f,[key]:val}))
 const toggleDiagnostic=(name:string)=>{
   const current=cleanArray(form.diagnostics).map(normalizeDiagnostic)
   const next=current.includes(name)?current.filter(x=>x!==name):[...current,name]
   setField('diagnostics',next.join(', '))
 }
 const saveEdit=async()=>{
   setSaving(true); setEditError('')
   const payload={
     purpose:form.purpose||null, property_address:form.property_address||null, contact_name:form.contact_name||null, contact_phone:form.contact_phone||null,
     contact_email:form.contact_email||null, liciel_number:form.liciel_number||null, building:form.building||null, staircase:form.staircase||null,
     floor:form.floor||null, door_number:form.door_number||null, lot_numbers:form.lot_numbers||null, dependencies:form.dependencies||null,
     key_pickup:form.key_pickup||null, access_instructions:form.access_instructions||null, parking_instructions:form.parking_instructions||null,
     diagnostics:form.diagnostics?cleanArray(form.diagnostics):null
   }
   const {error}=await supabase.from('dossiers').update(payload).eq('id',id)
   if(error){setEditError(error.message);setSaving(false);return}
   setEditing(false); setSaving(false); setLoading(true); await load()
 }

 const uploadDocument=async(e:ChangeEvent<HTMLInputElement>)=>{
   const file=e.target.files?.[0]; if(!file)return
   if(file.size>25*1024*1024){alert('Fichier trop volumineux : maximum 25 Mo.'); return}
   setUploading(true)
   const {data:{session}}=await supabase.auth.getSession(); if(!session){setUploading(false);return}
   const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path=`${id}/${session.user.id}/${Date.now()}-${safe}`
   const {error}=await supabase.storage.from('dossier-documents').upload(path,file,{upsert:false,contentType:file.type||undefined})
   setUploading(false); e.target.value=''
   if(error){alert(`Impossible d'ajouter le document : ${error.message}`);return}
   const listed=await supabase.storage.from('dossier-documents').list(`${id}/${session.user.id}`,{limit:100,sortBy:{column:'created_at',order:'desc'}})
   setStorageFiles((listed.data||[]) as StorageFile[])
 }

 const planAppointment=async()=>{
   const raw=window.prompt('Date et heure du rendez-vous (ex. 2026-08-28 14:30)')
   if(!raw)return
   const dt=new Date(raw.replace(' ','T')); if(Number.isNaN(dt.getTime())){alert('Date non reconnue.');return}
   const {error}=await supabase.from('appointments').insert({dossier_id:id,scheduled_at:dt.toISOString(),status:'scheduled'})
   if(error){alert(`Impossible de planifier le RDV : ${error.message}`);return}
   setLoading(true); await load()
 }

 const addPayment=async()=>{
   const raw=window.prompt('Montant du règlement reçu (€)')
   if(!raw)return
   const amount=Number(raw.replace(',','.')); if(!Number.isFinite(amount)||amount<=0){alert('Montant invalide.');return}
   const {error}=await supabase.from('payments').insert({dossier_id:id,amount,status:'confirmed',provider:'manuel'})
   if(error){alert(`Impossible d'enregistrer le paiement : ${error.message}`);return}
   setLoading(true); await load()
 }

 const timelineEvents=[
   {date:d.created_at,title:'Dossier créé',text:d.dossier_name},
   ...quotes.map(q=>({date:q.created_at,title:`Devis ${q.quote_number}`,text:`${labelStatus(q.status)} · ${euro(q.total_ttc)}`})),
   ...appointments.map(a=>({date:value(a.start_at,a.scheduled_at,a.date,a.created_at),title:'Rendez-vous',text:`${labelStatus(value(a.status,'scheduled'))} · ${dateTimeFr(value(a.start_at,a.scheduled_at,a.date))}`})),
   ...documents.map(doc=>({date:doc.created_at,title:'Document ajouté',text:String(value(doc.title,doc.name,doc.file_name,'Document'))})),
   ...storageFiles.map(doc=>({date:value(doc.created_at,doc.updated_at),title:'Document ajouté',text:doc.name.replace(/^\d+-/,'')})),
   ...invoices.map(x=>({date:x.created_at,title:`Facture ${value(x.invoice_number,x.number,'')}`,text:`${labelStatus(x.status)} · ${euro(value(x.total_ttc,x.amount,0))}`})),
   ...payments.map(x=>({date:x.created_at,title:'Règlement reçu',text:`${euro(value(x.amount,x.amount_ttc,0))} · ${value(x.method,x.provider,'paiement')}`}))
 ].filter(x=>x.date).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())

 return <AppShell active="dossiers"><main className="page dossier-page">
   <Link className="back" href="/dossiers">← Retour aux dossiers</Link>

   <div className="detail-hero dossier-hero">
     <div>
       <div className="eyebrow">DOSSIER</div>
       <h1>{d.dossier_name}</h1>
       <div className="hero-meta"><span className="status">{labelStatus(d.status)}</span><span>Créé le {dateFr(d.created_at)}</span>{d.liciel_number&&<span>Liciel {d.liciel_number}</span>}</div>
     </div>
     <div className="hero-actions">
       <button className="action-btn" onClick={openEdit}>✎ Modifier</button>
       {phone!=='—'&&<a className="action-btn" href={`tel:${String(phone).replace(/\s/g,'')}`}>☎ Appeler</a>}
       {email!=='—'&&<a className="action-btn" href={`mailto:${email}`}>✉ Écrire</a>}
       <button className="action-btn primary-action" disabled={address==='—'} onClick={()=>copy('adresse',address)}>⧉ {copied==='adresse'?'Copiée':'Adresse'}</button>
     </div>
   </div>

   <div className="dossier-summary-grid">
     <div className="summary-card"><span>Devis</span><b>{latestQuote?euro(latestQuote.total_ttc):'—'}</b><small>{latestQuote?labelStatus(latestQuote.status):'Aucun devis'}</small></div>
     <div className="summary-card"><span>Règlement reçu</span><b>{payments.length?euro(paidAmount):'—'}</b><small>{payments.length?`${payments.length} règlement(s)`:'Aucun règlement'}</small></div>
     <div className="summary-card"><span>Documents</span><b>{documentCount}</b><small>Pièce(s) au dossier</small></div>
     <div className="summary-card"><span>Prochain RDV</span><b>{nextAppointment?dateFr(value(nextAppointment.start_at,nextAppointment.scheduled_at,nextAppointment.date,nextAppointment.created_at)):'—'}</b><small>{nextAppointment?dateTimeFr(value(nextAppointment.start_at,nextAppointment.scheduled_at,nextAppointment.date)):'À planifier'}</small></div>
   </div>

   <div className="workspace-grid">
     <section className="workspace-main">
       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">INTERVENTION</span><h2>Informations terrain</h2></div><span className="section-badge">À avoir sous la main</span></div>
         <div className="info-grid">
           <Info label="Objet" val={labelPurpose(d.purpose)} />
           <Info label="Adresse du bien" val={address} copy={()=>copy('bien',address)} copied={copied==='bien'} />
           <Info label="Contact sur place" val={value(d.contact_name)} />
           <Info label="Téléphone" val={phone} href={phone!=='—'?`tel:${String(phone).replace(/\s/g,'')}`:undefined} />
           <Info label="E-mail" val={email} href={email!=='—'?`mailto:${email}`:undefined} />
           <Info label="N° Liciel" val={value(d.liciel_number)} copy={()=>copy('liciel',d.liciel_number)} copied={copied==='liciel'} />
           <Info label="Bâtiment" val={building} />
           <Info label="Cage" val={staircase} />
           <Info label="Étage" val={floor} />
           <Info label="Porte" val={door} />
           <Info label="Lots" val={lots} />
           <Info label="Dépendances" val={dependencyTags.length?dependencyTags.join(', '):'—'} />
         </div>
         {dependencyTags.length>0&&<div className="tag-row" aria-label="Dépendances">{dependencyTags.map(tag=><span className="soft-tag" key={tag}>{tag}</span>)}</div>}
       </div>

       <div className="card dossier-section access-card">
         <div className="section-heading"><div><span className="section-kicker">ACCÈS</span><h2>Clefs & consignes</h2></div></div>
         <div className="access-grid access-grid-v21"><Note title="Récupération des clefs" text={keyPickup}/><Note title="Accès / consignes" text={access}/><Note title="Digicode" text={digicode}/><Note title="Interphone" text={interphone}/><Note title="Stationnement" text={parking}/></div>
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">MISSIONS</span><h2>Diagnostics commandés</h2></div></div>
         {diagnostics.length===0?<Empty text="Aucun diagnostic renseigné sur ce dossier pour le moment."/>:<div className="diagnostic-grid">{diagnostics.map(name=><div className="diagnostic-chip" key={name}><span>{diagnosticIcon(name)}</span><b>{name}</b></div>)}</div>}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">DOCUMENTS</span><h2>Pièces du dossier</h2></div><><input ref={fileInput} className="file-input" type="file" accept="application/pdf,image/*" onChange={uploadDocument}/><button className="ghost-btn" disabled={uploading} onClick={()=>fileInput.current?.click()}>{uploading?'Ajout…':'+ Ajouter'}</button></></div>
         {documentCount===0?<Empty text="Aucun document rattaché pour le moment."/>:<div className="stack-list">
           {storageFiles.map(doc=><div className="stack-row" key={`storage-${doc.name}`}><div><b>{doc.name.replace(/^\d+-/,'')}</b><span>Fichier dossier · {dateFr(value(doc.created_at,doc.updated_at))}</span></div><span className="status">Disponible</span></div>)}
           {documents.map(doc=><div className="stack-row" key={doc.id}><div><b>{value(doc.title,doc.name,doc.file_name,'Document')}</b><span>{value(doc.document_type,doc.type,'Pièce dossier')}</span></div><span className="status">{labelStatus(value(doc.status,'available'))}</span></div>)}
         </div>}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">HISTORIQUE</span><h2>Chronologie</h2></div><span className="section-badge">Automatique</span></div>
         <div className="timeline">{timelineEvents.map((x,i)=><Timeline key={`${x.title}-${i}-${x.date}`} date={x.date} title={x.title} text={x.text}/>)}</div>
       </div>
     </section>

     <aside className="workspace-side">
       <div className="card dossier-section sticky-card">
         <div className="section-heading"><div><span className="section-kicker">DEVIS</span><h2>Suivi commercial</h2></div></div>
         {quotes.length===0?<Empty text="Aucun devis."/>:quotes.map(q=><div key={q.id} className="quote-v2"><div><b>{q.quote_number}</b><span className="status">{labelStatus(q.status)}</span></div><strong>{euro(q.total_ttc)} TTC</strong><small>{q.created_at?dateFr(q.created_at):''}</small></div>)}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">FACTURATION</span><h2>Factures & paiements</h2></div></div>
         {invoices.length===0&&payments.length===0?<Empty text="Aucune facture ou paiement enregistré."/>:<div className="stack-list">{invoices.map(x=><div className="stack-row compact" key={x.id}><div><b>{value(x.invoice_number,x.number,'Facture')}</b><span>{labelStatus(x.status)}</span></div><strong>{euro(value(x.total_ttc,x.amount,0))}</strong></div>)}{payments.map(x=><div className="stack-row compact" key={x.id}><div><b>Paiement</b><span>{value(x.method,x.provider,'reçu')}</span></div><strong>{euro(value(x.amount,x.amount_ttc,0))}</strong></div>)}</div>}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">OUTILS</span><h2>Actions rapides</h2></div></div>
         <div className="tool-list tool-list-v21">
           <button className="tool-emphasis" onClick={planAppointment}>＋ Planifier un RDV</button>
           <button onClick={()=>copy('liciel2',d.liciel_number)} disabled={!d.liciel_number}>Copier le n° Liciel</button>
           <button onClick={()=>d.liciel_number?copy('liciel-open',d.liciel_number):alert('Renseigne d’abord le numéro Liciel.')}>Créer / lier dans Liciel</button>
           <button onClick={addPayment}>＋ Ajouter un paiement</button>
           <button onClick={()=>alert('Le déblocage des rapports sera activé avec le workflow paiement / Qonto.')}>Débloquer les rapports</button>
           {phone!=='—'?<a href={`tel:${String(phone).replace(/\s/g,'')}`}>Appeler le contact</a>:<span>Contact téléphonique absent</span>}
           {email!=='—'?<a href={`mailto:${email}`}>Envoyer un e-mail</a>:<span>E-mail absent</span>}
           <button onClick={()=>copy('dossier',d.dossier_name)}>Copier le nom du dossier</button>
         </div>
       </div>
     </aside>
   </div>

   {editing&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(false)}}>
     <div className="edit-modal" role="dialog" aria-modal="true" aria-label="Modifier le dossier">
       <div className="edit-modal-head"><div><span className="section-kicker">DOSSIER</span><h2>Modifier les informations terrain</h2></div><button onClick={()=>setEditing(false)}>×</button></div>
       {editError&&<div className="error">{editError}</div>}
       <div className="edit-grid">
         <label className="edit-field"><span>Objet</span><select value={form.purpose} onChange={e=>setField('purpose',e.target.value)} style={{width:'100%',border:'1px solid #cfdce8',borderRadius:11,padding:'12px 13px',background:'#fff'}}><option value="">Choisir…</option><option value="sale">Vente</option><option value="rental">Location</option><option value="works">Travaux</option><option value="other">Autre</option></select></label><EditField label="Adresse du bien" value={form.property_address} onChange={v=>setField('property_address',v)}/>
         <EditField label="Contact" value={form.contact_name} onChange={v=>setField('contact_name',v)}/><EditField label="Téléphone" value={form.contact_phone} onChange={v=>setField('contact_phone',v)}/>
         <EditField label="E-mail" value={form.contact_email} onChange={v=>setField('contact_email',v)}/><EditField label="N° Liciel" value={form.liciel_number} onChange={v=>setField('liciel_number',v)}/>
         <EditField label="Bâtiment" value={form.building} onChange={v=>setField('building',v)}/><EditField label="Cage" value={form.staircase} onChange={v=>setField('staircase',v)}/>
         <EditField label="Étage" value={form.floor} onChange={v=>setField('floor',v)}/><EditField label="Porte" value={form.door_number} onChange={v=>setField('door_number',v)}/>
         <EditField label="Lots" value={form.lot_numbers} onChange={v=>setField('lot_numbers',v)}/><EditField label="Dépendances (séparées par des virgules)" value={form.dependencies} onChange={v=>setField('dependencies',v)}/>
         <EditField label="Récupération des clefs" value={form.key_pickup} onChange={v=>setField('key_pickup',v)}/><EditField label="Stationnement" value={form.parking_instructions} onChange={v=>setField('parking_instructions',v)}/>
         <EditField wide label="Accès / codes / consignes" value={form.access_instructions} onChange={v=>setField('access_instructions',v)}/>
         <div className="edit-field wide"><span>Diagnostics commandés</span><div className="diagnostic-grid" style={{marginTop:8}}>{diagnosticChoices.map(name=>{const checked=cleanArray(form.diagnostics).map(normalizeDiagnostic).includes(name);return <label key={name} className="diagnostic-chip" style={{cursor:'pointer'}}><input type="checkbox" checked={checked} onChange={()=>toggleDiagnostic(name)} style={{marginRight:8}}/><b>{name}</b></label>})}</div></div>
       </div>
       <div className="edit-modal-actions"><button className="ghost-btn" onClick={()=>setEditing(false)}>Annuler</button><button className="action-btn primary-action" disabled={saving} onClick={saveEdit}>{saving?'Enregistrement…':'Enregistrer'}</button></div>
     </div>
   </div>}
 </main></AppShell>
}

function diagnosticIcon(name:string){const n=name.toLowerCase(); if(n.includes('dpe'))return '⌂'; if(n.includes('amiante'))return '◉'; if(n.includes('élec'))return '⚡'; if(n.includes('gaz'))return '♨'; if(n.includes('plomb'))return 'Pb'; if(n.includes('termite'))return '⌁'; if(n.includes('carrez')||n.includes('boutin'))return '↔'; if(n.includes('erp'))return '⚑'; if(n.includes('assain'))return '≈'; return '✓'}
function Info({label,val,href,copy,copied}:{label:string,val:any,href?:string,copy?:()=>void,copied?:boolean}){return <div className="info-item"><span>{label}</span><div>{href?<a href={href}>{String(val)}</a>:<b>{String(val)}</b>}{copy&&val!=='—'&&<button className="copy-mini" onClick={copy}>{copied?'✓':'⧉'}</button>}</div></div>}
function Note({title,text}:{title:string,text:any}){return <div className="note-box"><span>{title}</span><b>{String(text)}</b></div>}
function Empty({text}:{text:string}){return <div className="empty-state">{text}</div>}
function Timeline({date,title,text}:{date?:string,title:string,text:string}){return <div className="timeline-row"><i></i><div><small>{dateTimeFr(date)}</small><b>{title}</b><span>{text}</span></div></div>}
function EditField({label,value,onChange,wide=false}:{label:string,value:string,onChange:(v:string)=>void,wide?:boolean}){return <label className={`edit-field${wide?' wide':''}`}><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)}/></label>}