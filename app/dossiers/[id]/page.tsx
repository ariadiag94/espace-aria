'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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

const labelStatus=(v?:string|null)=> (v||'—').replaceAll('_',' ')
const value=(...candidates:any[])=> candidates.find(v=>v!==null&&v!==undefined&&String(v).trim()!=='') ?? '—'
const euro=(n:any)=> Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'

export default function DossierPage(){
 const {id}=useParams<{id:string}>(); const router=useRouter()
 const [d,setD]=useState<Dossier|null>(null); const [quotes,setQuotes]=useState<Quote[]>([])
 const [appointments,setAppointments]=useState<Row[]>([]); const [documents,setDocuments]=useState<Row[]>([])
 const [invoices,setInvoices]=useState<Row[]>([]); const [payments,setPayments]=useState<Row[]>([])
 const [loading,setLoading]=useState(true); const [copied,setCopied]=useState('')

 useEffect(()=>{(async()=>{
   const {data:{session}}=await supabase.auth.getSession(); if(!session){router.replace('/login');return}
   const dossierRes=await supabase.from('dossiers').select('*').eq('id',id).single(); setD(dossierRes.data as Dossier|null)
   const [q,a,docs,inv,pay]=await Promise.all([
     supabase.from('quotes').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('appointments').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('documents').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('invoices').select('*').eq('dossier_id',id).order('created_at',{ascending:false}),
     supabase.from('payments').select('*').eq('dossier_id',id).order('created_at',{ascending:false})
   ])
   setQuotes((q.data||[]) as Quote[]); setAppointments(a.data||[]); setDocuments(docs.data||[]); setInvoices(inv.data||[]); setPayments(pay.data||[]); setLoading(false)
 })()},[id,router])

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
 const nextAppointment=appointments[0]

 return <AppShell active="dossiers"><main className="page dossier-page">
   <Link className="back" href="/dossiers">← Retour aux dossiers</Link>

   <div className="detail-hero dossier-hero">
     <div>
       <div className="eyebrow">DOSSIER</div>
       <h1>{d.dossier_name}</h1>
       <div className="hero-meta"><span className="status">{labelStatus(d.status)}</span><span>Créé le {new Date(d.created_at).toLocaleDateString('fr-FR')}</span>{d.liciel_number&&<span>Liciel {d.liciel_number}</span>}</div>
     </div>
     <div className="hero-actions">
       {phone!=='—'&&<a className="action-btn" href={`tel:${String(phone).replace(/\s/g,'')}`}>☎ Appeler</a>}
       {email!=='—'&&<a className="action-btn" href={`mailto:${email}`}>✉ Écrire</a>}
       <button className="action-btn primary-action" onClick={()=>copy('adresse',address)}>⧉ {copied==='adresse'?'Copiée':'Adresse'}</button>
     </div>
   </div>

   <div className="dossier-summary-grid">
     <div className="summary-card"><span>Devis</span><b>{latestQuote?euro(latestQuote.total_ttc):'—'}</b><small>{latestQuote?labelStatus(latestQuote.status):'Aucun devis'}</small></div>
     <div className="summary-card"><span>Règlement reçu</span><b>{payments.length?euro(paidAmount):'—'}</b><small>{payments.length?`${payments.length} règlement(s)`:'Aucun règlement'}</small></div>
     <div className="summary-card"><span>Documents</span><b>{documents.length}</b><small>Pièce(s) au dossier</small></div>
     <div className="summary-card"><span>Prochain RDV</span><b>{nextAppointment?new Date(value(nextAppointment.start_at,nextAppointment.scheduled_at,nextAppointment.date,nextAppointment.created_at)).toLocaleDateString('fr-FR'):'—'}</b><small>{nextAppointment?value(nextAppointment.time,nextAppointment.start_time,'Planifié'):'À planifier'}</small></div>
   </div>

   <div className="workspace-grid">
     <section className="workspace-main">
       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">INTERVENTION</span><h2>Informations terrain</h2></div><span className="section-badge">À avoir sous la main</span></div>
         <div className="info-grid">
           <Info label="Objet" val={value(d.purpose)} />
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
           <Info label="Dépendances" val={dependencies} />
         </div>
       </div>

       <div className="card dossier-section access-card">
         <div className="section-heading"><div><span className="section-kicker">ACCÈS</span><h2>Clefs & consignes</h2></div></div>
         <div className="access-grid"><Note title="Récupération des clefs" text={keyPickup}/><Note title="Accès / codes" text={access}/><Note title="Stationnement" text={parking}/></div>
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">DOCUMENTS</span><h2>Pièces du dossier</h2></div><button className="ghost-btn">+ Ajouter</button></div>
         {documents.length===0?<Empty text="Aucun document rattaché pour le moment."/>:<div className="stack-list">{documents.map(doc=><div className="stack-row" key={doc.id}><div><b>{value(doc.title,doc.name,doc.file_name,'Document')}</b><span>{value(doc.document_type,doc.type,'Pièce dossier')}</span></div><span className="status">{labelStatus(value(doc.status,'disponible'))}</span></div>)}</div>}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">HISTORIQUE</span><h2>Chronologie</h2></div></div>
         <div className="timeline"><Timeline date={d.created_at} title="Dossier créé" text={d.dossier_name}/>{quotes.map(q=><Timeline key={q.id} date={q.created_at} title={`Devis ${q.quote_number}`} text={`${labelStatus(q.status)} · ${euro(q.total_ttc)}`}/>)}</div>
       </div>
     </section>

     <aside className="workspace-side">
       <div className="card dossier-section sticky-card">
         <div className="section-heading"><div><span className="section-kicker">DEVIS</span><h2>Suivi commercial</h2></div></div>
         {quotes.length===0?<Empty text="Aucun devis."/>:quotes.map(q=><div key={q.id} className="quote-v2"><div><b>{q.quote_number}</b><span className="status">{labelStatus(q.status)}</span></div><strong>{euro(q.total_ttc)} TTC</strong><small>{q.created_at?new Date(q.created_at).toLocaleDateString('fr-FR'):''}</small></div>)}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">FACTURATION</span><h2>Factures & paiements</h2></div></div>
         {invoices.length===0&&payments.length===0?<Empty text="Aucune facture ou paiement enregistré."/>:<div className="stack-list">{invoices.map(x=><div className="stack-row compact" key={x.id}><div><b>{value(x.invoice_number,x.number,'Facture')}</b><span>{labelStatus(x.status)}</span></div><strong>{euro(value(x.total_ttc,x.amount,0))}</strong></div>)}{payments.map(x=><div className="stack-row compact" key={x.id}><div><b>Paiement</b><span>{value(x.method,x.provider,'reçu')}</span></div><strong>{euro(value(x.amount,x.amount_ttc,0))}</strong></div>)}</div>}
       </div>

       <div className="card dossier-section">
         <div className="section-heading"><div><span className="section-kicker">OUTILS</span><h2>Actions rapides</h2></div></div>
         <div className="tool-list">
           <button onClick={()=>copy('liciel2',d.liciel_number)} disabled={!d.liciel_number}>Copier le n° Liciel</button>
           {phone!=='—'?<a href={`tel:${String(phone).replace(/\s/g,'')}`}>Appeler le contact</a>:<span>Contact téléphonique absent</span>}
           {email!=='—'?<a href={`mailto:${email}`}>Envoyer un e-mail</a>:<span>E-mail absent</span>}
           <button onClick={()=>copy('dossier',d.dossier_name)}>Copier le nom du dossier</button>
         </div>
       </div>
     </aside>
   </div>
 </main></AppShell>
}

function Info({label,val,href,copy,copied}:{label:string,val:any,href?:string,copy?:()=>void,copied?:boolean}){return <div className="info-item"><span>{label}</span><div>{href?<a href={href}>{String(val)}</a>:<b>{String(val)}</b>}{copy&&val!=='—'&&<button className="copy-mini" onClick={copy}>{copied?'✓':'⧉'}</button>}</div></div>}
function Note({title,text}:{title:string,text:any}){return <div className="note-box"><span>{title}</span><b>{String(text)}</b></div>}
function Empty({text}:{text:string}){return <div className="empty-state">{text}</div>}
function Timeline({date,title,text}:{date?:string,title:string,text:string}){return <div className="timeline-row"><i></i><div><small>{date?new Date(date).toLocaleDateString('fr-FR'):'—'}</small><b>{title}</b><span>{text}</span></div></div>}
