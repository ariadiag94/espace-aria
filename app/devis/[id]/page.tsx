'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Quote={id:string;quote_number:string;status:string;total_ht:number;total_vat:number;total_ttc:number;created_at:string;dossier_id:string;property_type?:string|null;property_size?:string|null;quote_kind?:string|null;notes?:string|null}
type Dossier={id:string;dossier_name:string;status?:string|null;contact_email?:string|null}
type Line={id?:string;label:string;quantity:number;unit_ttc:number;total_ttc:number;sort_order:number}

const euro=(n:number)=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})
const dateFr=(v:string)=>new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})
const statusLabel=(s:string)=>({draft:'Brouillon',sent:'Envoyé',accepted:'Accepté',rejected:'Refusé'} as Record<string,string>)[s]||s

export default function QuoteDetailPage(){
 const params=useParams<{id:string}>();const router=useRouter();const id=params.id
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [sending,setSending]=useState(false);const [error,setError]=useState('');const [sendMessage,setSendMessage]=useState('')
 const [quote,setQuote]=useState<Quote|null>(null);const [dossier,setDossier]=useState<Dossier|null>(null);const [lines,setLines]=useState<Line[]>([]);const [notes,setNotes]=useState('')

 const load=async()=>{
  const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}
  const {data:q,error:qErr}=await supabase.from('quotes').select('*').eq('id',id).single();if(qErr||!q){setError(qErr?.message||'Devis introuvable.');setLoading(false);return}
  setQuote(q as Quote);setNotes(q.notes||'')
  const [d,l]=await Promise.all([supabase.from('dossiers').select('id,dossier_name,status,contact_email').eq('id',q.dossier_id).single(),supabase.from('quote_lines').select('*').eq('quote_id',id).order('sort_order',{ascending:true})])
  if(d.data)setDossier(d.data as Dossier);if(l.data)setLines((l.data as Line[]).map((x,i)=>({...x,sort_order:i})))
  setLoading(false)
 }
 useEffect(()=>{void load()},[id])

 const totalTtc=useMemo(()=>Math.round(lines.reduce((s,l)=>s+Number(l.quantity||0)*Number(l.unit_ttc||0),0)*100)/100,[lines])
 const totalHt=Math.round(totalTtc/1.2*100)/100;const vat=Math.round((totalTtc-totalHt)*100)/100
 const setLine=(i:number,patch:Partial<Line>)=>setLines(v=>v.map((l,n)=>n===i?{...l,...patch,total_ttc:Number((patch.quantity??l.quantity)||0)*Number((patch.unit_ttc??l.unit_ttc)||0)}:l))
 const addLine=()=>setLines(v=>[...v,{label:'Nouvelle prestation',quantity:1,unit_ttc:0,total_ttc:0,sort_order:v.length}])
 const removeLine=(i:number)=>setLines(v=>v.filter((_,n)=>n!==i).map((l,n)=>({...l,sort_order:n})))

 const save=async()=>{
  if(!quote)return;setSaving(true);setError('');setSendMessage('')
  const {error:qErr}=await supabase.from('quotes').update({total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,notes:notes||null}).eq('id',quote.id)
  if(qErr){setError(qErr.message);setSaving(false);return}
  const {error:delErr}=await supabase.from('quote_lines').delete().eq('quote_id',quote.id);if(delErr){setError(delErr.message);setSaving(false);return}
  if(lines.length){const {error:lErr}=await supabase.from('quote_lines').insert(lines.map((l,i)=>({quote_id:quote.id,label:l.label||'Prestation',quantity:Number(l.quantity||0),unit_ttc:Number(l.unit_ttc||0),total_ttc:Number(l.quantity||0)*Number(l.unit_ttc||0),sort_order:i})));if(lErr){setError(lErr.message);setSaving(false);return}}
  setSaving(false);await load()
 }

 const changeStatus=async(status:'draft'|'sent'|'accepted')=>{
  if(!quote)return;setSaving(true);setError('');setSendMessage('')
  const {error:qErr}=await supabase.from('quotes').update({status,total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,notes:notes||null}).eq('id',quote.id)
  if(qErr){setError(qErr.message);setSaving(false);return}
  if(status==='sent')await supabase.from('dossiers').update({status:'quote_sent'}).eq('id',quote.dossier_id)
  if(status==='accepted')await supabase.from('dossiers').update({status:'quote_accepted'}).eq('id',quote.dossier_id)
  setSaving(false);await load()
 }

 const sendQuote=async()=>{
  if(!quote)return
  if(!dossier?.contact_email){setError('Aucune adresse e-mail n’est renseignée pour le donneur d’ordre.');return}
  setSending(true);setError('');setSendMessage('')
  const {data:{session}}=await supabase.auth.getSession()
  if(!session){setSending(false);router.replace('/login');return}
  try{
   const response=await fetch(`/api/devis/${quote.id}/send`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}})
   const data=await response.json().catch(()=>({}))
   if(!response.ok){setError(data?.error||'Échec de l’envoi du devis.');setSending(false);return}
   setSendMessage(`Devis envoyé à ${data.recipient}.`);setSending(false);await load()
  }catch{
   setError('Impossible de contacter le service d’envoi.');setSending(false)
  }
 }

 if(loading)return <AppShell active="devis"><div className="loading">Chargement du devis…</div></AppShell>
 if(!quote)return <AppShell active="devis"><main className="page"><div className="error">{error||'Devis introuvable.'}</div></main></AppShell>

 return <AppShell active="devis"><main className="page" style={{maxWidth:1240}}>
  <Link href="/devis" className="back">← Retour aux devis</Link>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap',margin:'14px 0 18px'}}>
   <div><div className="eyebrow">DEVIS</div><h1 style={{margin:'4px 0 6px'}}>{quote.quote_number}</h1><div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap'}}><span className="status">{statusLabel(quote.status)}</span><span style={{color:'#6f7d90'}}>Créé le {dateFr(quote.created_at)}</span></div></div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="ghost-btn" href={`/devis/${quote.id}/impression`}>Aperçu PDF</Link><button className="action-btn primary-action" disabled={sending||saving||!dossier?.contact_email} onClick={sendQuote}>{sending?'Envoi…':'Envoyer le devis'}</button>{quote.status!=='accepted'&&<button className="ghost-btn" disabled={saving||sending} onClick={()=>changeStatus('accepted')}>Marquer accepté</button>}</div>
  </div>
  {error&&<div className="error" style={{marginBottom:14}}>{error}</div>}
  {sendMessage&&<div style={{marginBottom:14,padding:'11px 13px',border:'1px solid #b9e4c7',borderRadius:10,background:'#f1fbf4',color:'#176b35',fontWeight:700}}>{sendMessage}</div>}
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.45fr) minmax(300px,.55fr)',gap:18,alignItems:'start'}}>
   <section className="card" style={{padding:22}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:14}}><div><div className="eyebrow">LIGNES</div><h2 style={{margin:'3px 0 0',color:'#062b59'}}>Prestations</h2></div><button className="ghost-btn" onClick={addLine}>＋ Ajouter</button></div>
    <div style={{display:'grid',gap:10}}>{lines.map((l,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) 90px 130px 42px',gap:9,alignItems:'end',padding:'12px 0',borderBottom:'1px solid #edf2f7'}}>
      <label className="edit-field"><span>Libellé</span><input value={l.label} onChange={e=>setLine(i,{label:e.target.value})}/></label>
      <label className="edit-field"><span>Qté</span><input inputMode="decimal" value={l.quantity} onChange={e=>setLine(i,{quantity:Number(e.target.value.replace(',','.'))||0})}/></label>
      <label className="edit-field"><span>Prix TTC</span><input inputMode="decimal" value={l.unit_ttc} onChange={e=>setLine(i,{unit_ttc:Number(e.target.value.replace(',','.'))||0})}/></label>
      <button className="ghost-btn" title="Supprimer" onClick={()=>removeLine(i)}>×</button>
    </div>)}</div>
    <label className="edit-field" style={{marginTop:18}}><span>Notes internes</span><textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Précisions, remise commerciale, éléments à vérifier…"/></label>
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}><button className="action-btn primary-action" disabled={saving||sending} onClick={save}>{saving?'Enregistrement…':'Enregistrer les modifications'}</button></div>
   </section>
   <aside style={{display:'grid',gap:14,position:'sticky',top:18}}>
    <section className="card" style={{padding:20}}><div className="eyebrow">DOSSIER</div><h2 style={{margin:'4px 0 10px',color:'#062b59'}}>{dossier?.dossier_name||'Dossier'}</h2><p style={{margin:'0 0 7px',color:'#6f7d90'}}>{quote.property_type==='house'?'Maison':quote.property_type==='apartment'?'Appartement':'Bien'} {quote.property_size?`· ${quote.property_size}`:''}</p><p style={{margin:'0 0 10px',color:dossier?.contact_email?'#52657a':'#a05353',fontSize:13}}>{dossier?.contact_email||'E-mail du donneur d’ordre non renseigné'}</p><Link className="back" href={`/dossiers/${quote.dossier_id}`}>Ouvrir le dossier →</Link></section>
    <section className="card" style={{padding:20}}><div className="eyebrow">TOTAL</div><div style={{display:'grid',gap:8,marginTop:10}}><div style={{display:'flex',justifyContent:'space-between'}}><span>HT</span><b>{euro(totalHt)}</b></div><div style={{display:'flex',justifyContent:'space-between'}}><span>TVA 20 %</span><b>{euro(vat)}</b></div><div style={{height:1,background:'#dce6f0',margin:'5px 0'}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:25,color:'#062b59'}}><strong>TTC</strong><strong>{euro(totalTtc)}</strong></div></div></section>
    <section className="card" style={{padding:20}}><div className="eyebrow">STATUT</div><h3 style={{margin:'5px 0 12px',color:'#062b59'}}>{statusLabel(quote.status)}</h3><div style={{display:'grid',gap:8}}><button className="ghost-btn" disabled={saving||sending} onClick={()=>changeStatus('draft')}>Repasser en brouillon</button><button className="ghost-btn" disabled={saving||sending} onClick={()=>changeStatus('sent')}>Devis envoyé</button><button className="action-btn primary-action" disabled={saving||sending} onClick={()=>changeStatus('accepted')}>Devis accepté</button></div></section>
   </aside>
  </div>
 </main></AppShell>
}
