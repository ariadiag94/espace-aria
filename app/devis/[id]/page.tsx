'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { HOUSE_SIZE_TIERS, APARTMENT_ASSAINISSEMENT_PRICE, HOUSE_ASSAINISSEMENT_PRICE, AMIANTE_SAMPLE_PRICE } from '@/lib/quote-assistant'

type Quote={id:string;quote_number:string;status:string;total_ht:number;total_vat:number;total_ttc:number;created_at:string;dossier_id:string;property_type?:string|null;property_size?:string|null;quote_kind?:string|null;notes?:string|null}
type Dossier={id:string;dossier_name:string;status?:string|null;contact_email?:string|null}
type Line={id?:string;label:string;quantity:number;unit_ttc:number;total_ttc:number;sort_order:number}
type EmailEvent={id:string;recipient:string;sent_at:string;resend_email_id?:string|null}

const euro=(n:number)=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})
const dateFr=(v:string)=>new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})
const dateTimeFr=(v:string)=>new Date(v).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
const statusLabel=(s:string)=>({draft:'Brouillon',sent:'Envoyé',accepted:'Accepté',rejected:'Refusé'} as Record<string,string>)[s]||s

export default function QuoteDetailPage(){
 const params=useParams<{id:string}>();const router=useRouter();const id=params.id
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [sending,setSending]=useState(false);const [error,setError]=useState('');const [sendMessage,setSendMessage]=useState('');const [confirmSend,setConfirmSend]=useState(false)
 const [quote,setQuote]=useState<Quote|null>(null);const [dossier,setDossier]=useState<Dossier|null>(null);const [lines,setLines]=useState<Line[]>([]);const [notes,setNotes]=useState('');const [emailEvents,setEmailEvents]=useState<EmailEvent[]>([])

 const load=async()=>{
  const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}
  const {data:q,error:qErr}=await supabase.from('quotes').select('*').eq('id',id).single();if(qErr||!q){setError(qErr?.message||'Devis introuvable.');setLoading(false);return}
  setQuote(q as Quote);setNotes(q.notes||'')
  const [d,l,e]=await Promise.all([
   supabase.from('dossiers').select('id,dossier_name,status,contact_email').eq('id',q.dossier_id).single(),
   supabase.from('quote_lines').select('*').eq('quote_id',id).order('sort_order',{ascending:true}),
   supabase.from('quote_email_events').select('id,recipient,sent_at,resend_email_id').eq('quote_id',id).order('sent_at',{ascending:false}).limit(10),
  ])
  if(d.data)setDossier(d.data as Dossier);if(l.data)setLines((l.data as Line[]).map((x,i)=>({...x,sort_order:i})));if(e.data)setEmailEvents(e.data as EmailEvent[])
  setLoading(false)
 }
 useEffect(()=>{void load()},[id])

 const totalTtc=useMemo(()=>Math.round(lines.reduce((s,l)=>s+Number(l.quantity||0)*Number(l.unit_ttc||0),0)*100)/100,[lines])
 const totalHt=Math.round(totalTtc/1.2*100)/100;const vat=Math.round((totalTtc-totalHt)*100)/100
 const setLine=(i:number,patch:Partial<Line>)=>setLines(v=>v.map((l,n)=>n===i?{...l,...patch,total_ttc:Number((patch.quantity??l.quantity)||0)*Number((patch.unit_ttc??l.unit_ttc)||0)}:l))
 const addLine=()=>setLines(v=>[...v,{label:'Nouvelle prestation',quantity:1,unit_ttc:0,total_ttc:0,sort_order:v.length}])
 // Options rapides : mesurage maison (prix selon la tranche du devis) et
 // assainissement, ajoutés en une touche sans ressaisir libellé et prix.
 // asOption : quantité 0 = proposée au client avec son prix, hors total.
 const pushLine=(label:string,price:number,asOption=false)=>setLines(v=>[...v,{label,quantity:asOption?0:1,unit_ttc:price,total_ttc:asOption?0:price,sort_order:v.length}])
 const toggleOption=(i:number)=>setLine(i,{quantity:lines[i]?.quantity===0?1:0})
 const houseTier=quote?.property_type==='house'?HOUSE_SIZE_TIERS.find(t=>t.label===quote?.property_size):undefined
 const addMesurage=()=>pushLine(`Mesurage de la surface habitable (loi Boutin) – Maison ${quote?.property_size||''}`.trim(),houseTier?.measurementPrice??0,true)
 const addAssainissement=()=>pushLine(`Contrôle du raccordement au réseau d’assainissement – ${quote?.property_type==='house'?'Maison':'Appartement'}`,quote?.property_type==='house'?HOUSE_ASSAINISSEMENT_PRICE:APARTMENT_ASSAINISSEMENT_PRICE,true)
 const addPrelevement=()=>pushLine('Prélèvement et analyse amiante en laboratoire accrédité – par prélèvement',AMIANTE_SAMPLE_PRICE,true)
 const removeLine=(i:number)=>setLines(v=>v.filter((_,n)=>n!==i).map((l,n)=>({...l,sort_order:n})))

 const persistQuote=async()=>{
  if(!quote)return false
  const {error:qErr}=await supabase.from('quotes').update({total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,notes:notes||null}).eq('id',quote.id)
  if(qErr){setError(qErr.message);return false}
  const {error:delErr}=await supabase.from('quote_lines').delete().eq('quote_id',quote.id);if(delErr){setError(delErr.message);return false}
  if(lines.length){const {error:lErr}=await supabase.from('quote_lines').insert(lines.map((l,i)=>({quote_id:quote.id,label:l.label||'Prestation',quantity:Number(l.quantity||0),unit_ttc:Number(l.unit_ttc||0),total_ttc:Number(l.quantity||0)*Number(l.unit_ttc||0),sort_order:i})));if(lErr){setError(lErr.message);return false}}
  return true
 }

 const save=async()=>{if(!quote)return;setSaving(true);setError('');setSendMessage('');const ok=await persistQuote();setSaving(false);if(ok)await load()}

 const changeStatus=async(status:'draft'|'sent'|'accepted')=>{
  if(!quote)return;setSaving(true);setError('');setSendMessage('')
  const {error:qErr}=await supabase.from('quotes').update({status,total_ht:totalHt,total_vat:vat,total_ttc:totalTtc,notes:notes||null}).eq('id',quote.id)
  if(qErr){setError(qErr.message);setSaving(false);return}
  if(status==='sent')await supabase.from('dossiers').update({status:'quote_sent'}).eq('id',quote.dossier_id)
  if(status==='accepted')await supabase.from('dossiers').update({status:'quote_accepted'}).eq('id',quote.dossier_id)
  setSaving(false);await load()
 }

 const requestSend=()=>{if(!dossier?.contact_email){setError('Aucune adresse e-mail n’est renseignée pour le donneur d’ordre.');return}setError('');setSendMessage('');setConfirmSend(true)}

 const sendQuote=async()=>{
  if(!quote||!dossier?.contact_email)return
  setConfirmSend(false);setSending(true);setError('');setSendMessage('')
  const saved=await persistQuote();if(!saved){setSending(false);return}
  const {data:{session}}=await supabase.auth.getSession();if(!session){setSending(false);router.replace('/login');return}
  try{
   const response=await fetch(`/api/devis/${quote.id}/send`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}})
   const data=await response.json().catch(()=>({}))
   if(!response.ok){setError(data?.error||'Échec de l’envoi du devis.');setSending(false);return}
   setSendMessage(`Devis envoyé à ${data.recipient}.`);setSending(false);await load()
  }catch{setError('Impossible de contacter le service d’envoi.');setSending(false)}
 }

 if(loading)return <AppShell active="devis" adminOnly><div className="loading">Chargement du devis…</div></AppShell>
 if(!quote)return <AppShell active="devis" adminOnly><main className="page"><div className="error">{error||'Devis introuvable.'}</div></main></AppShell>

 return <AppShell active="devis" adminOnly><main className="page" style={{maxWidth:1240}}>
  <Link href="/devis" className="back">← Retour aux devis</Link>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap',margin:'14px 0 18px'}}>
   <div><div className="eyebrow">DEVIS</div><h1 style={{margin:'4px 0 6px'}}>{quote.quote_number}</h1><div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap'}}><span className="status">{statusLabel(quote.status)}</span><span style={{color:'#6f7d90'}}>Créé le {dateFr(quote.created_at)}</span></div></div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="ghost-btn" href={`/devis/${quote.id}/impression`}>Aperçu PDF</Link><button className="action-btn primary-action" disabled={sending||saving||!dossier?.contact_email} onClick={requestSend}>{sending?'Envoi…':quote.status==='sent'?'Renvoyer le devis':'Envoyer le devis'}</button>{quote.status!=='accepted'&&<button className="ghost-btn" disabled={saving||sending} onClick={()=>changeStatus('accepted')}>Marquer accepté</button>}</div>
  </div>
  {error&&<div className="error" style={{marginBottom:14}}>{error}</div>}
  {sendMessage&&<div style={{marginBottom:14,padding:'11px 13px',border:'1px solid #b9e4c7',borderRadius:10,background:'#f1fbf4',color:'#176b35',fontWeight:700}}>{sendMessage}</div>}
  <style>{`.qd-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.55fr);gap:18px;align-items:start}.qd-line{display:grid;grid-template-columns:minmax(0,1fr) 80px 110px 42px;gap:9px;align-items:end;padding:12px 0;border-bottom:1px solid #edf2f7}@media(max-width:820px){.qd-grid{grid-template-columns:1fr}.qd-grid aside{position:static!important}.qd-line{grid-template-columns:1fr 1fr 42px}.qd-line>label:first-child{grid-column:1/-1}}`}</style>
  <div className="qd-grid">
   <section className="card" style={{padding:22}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:14}}><div><div className="eyebrow">LIGNES</div><h2 style={{margin:'3px 0 0',color:'#062b59'}}>Prestations</h2><small style={{color:'#6f7d90'}}>Libellés, quantités et prix modifiables librement.</small></div><div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>{quote.property_type==='house'&&<button className="ghost-btn" onClick={addMesurage}>＋ Mesurage</button>}{(quote.property_type==='house'||quote.property_type==='apartment')&&<button className="ghost-btn" onClick={addAssainissement}>＋ Assainissement</button>}<button className="ghost-btn" onClick={addPrelevement}>＋ Prélèvement amiante</button><button className="ghost-btn" onClick={addLine}>＋ Ligne libre</button></div></div>
    <div style={{display:'grid',gap:10}}>{lines.map((l,i)=><div key={i} className="qd-line">
      <label className="edit-field"><span>Libellé</span><input value={l.label} onChange={e=>setLine(i,{label:e.target.value})}/></label>
      <label className="edit-field"><span>Qté</span><input inputMode="decimal" value={l.quantity} onChange={e=>setLine(i,{quantity:Number(e.target.value.replace(',','.'))||0})}/></label>
      <label className="edit-field"><span>Prix TTC</span><input inputMode="decimal" value={l.unit_ttc} onChange={e=>setLine(i,{unit_ttc:Number(e.target.value.replace(',','.'))||0})}/></label>
      <button className="ghost-btn" title="Supprimer" onClick={()=>removeLine(i)}>×</button>
      <label style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:7,fontSize:12.5,color:l.quantity===0?'#0b65b5':'#6f7d90',fontWeight:l.quantity===0?800:400,cursor:'pointer'}}><input type="checkbox" checked={l.quantity===0} onChange={()=>toggleOption(i)}/>Option laissée au choix du client (prix affiché, non compris dans le total)</label>
    </div>)}</div>
    <label className="edit-field" style={{marginTop:18}}><span>Notes internes</span><textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Précisions, remise commerciale, éléments à vérifier…"/></label>
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}><button className="action-btn primary-action" disabled={saving||sending} onClick={save}>{saving?'Enregistrement…':'Enregistrer les modifications'}</button></div>
   </section>
   <aside style={{display:'grid',gap:14,position:'sticky',top:18}}>
    <section className="card" style={{padding:20}}><div className="eyebrow">DOSSIER</div><h2 style={{margin:'4px 0 10px',color:'#062b59'}}>{dossier?.dossier_name||'Dossier'}</h2><p style={{margin:'0 0 7px',color:'#6f7d90'}}>{({house:'Maison',apartment:'Appartement',local:'Local professionnel',immeuble:'Immeuble',travaux:'Avant travaux / démolition'} as Record<string,string>)[quote.property_type||'']||(quote.quote_kind==='libre'?'Devis libre':'Bien')} {quote.property_size?`· ${quote.property_size}`:''}</p><p style={{margin:'0 0 10px',color:dossier?.contact_email?'#52657a':'#a05353',fontSize:13}}>{dossier?.contact_email||'E-mail du donneur d’ordre non renseigné'}</p><Link className="back" href={`/dossiers/${quote.dossier_id}`}>Ouvrir le dossier →</Link></section>
    <section className="card" style={{padding:20}}><div className="eyebrow">TOTAL</div><div style={{display:'grid',gap:8,marginTop:10}}><div style={{display:'flex',justifyContent:'space-between'}}><span>HT</span><b>{euro(totalHt)}</b></div><div style={{display:'flex',justifyContent:'space-between'}}><span>TVA 20 %</span><b>{euro(vat)}</b></div><div style={{height:1,background:'#dce6f0',margin:'5px 0'}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:25,color:'#062b59'}}><strong>TTC</strong><strong>{euro(totalTtc)}</strong></div></div></section>
    <section className="card" style={{padding:20}}><div className="eyebrow">STATUT</div><h3 style={{margin:'5px 0 12px',color:'#062b59'}}>{statusLabel(quote.status)}</h3><div style={{display:'grid',gap:8}}><button className="ghost-btn" disabled={saving||sending} onClick={()=>changeStatus('draft')}>Repasser en brouillon</button><button className="ghost-btn" disabled={saving||sending} onClick={()=>changeStatus('sent')}>Devis envoyé</button><button className="action-btn primary-action" disabled={saving||sending} onClick={()=>changeStatus('accepted')}>Devis accepté</button></div></section>
    <section className="card" style={{padding:20}}><div className="eyebrow">ENVOIS</div><h3 style={{margin:'5px 0 12px',color:'#062b59'}}>Historique e-mail</h3>{emailEvents.length===0?<p style={{margin:0,color:'#6f7d90',fontSize:13}}>Aucun envoi enregistré pour le moment.</p>:<div style={{display:'grid',gap:10}}>{emailEvents.map(e=><div key={e.id} style={{paddingBottom:10,borderBottom:'1px solid #edf2f7'}}><b style={{display:'block',fontSize:13,color:'#062b59'}}>{dateTimeFr(e.sent_at)}</b><span style={{display:'block',fontSize:12,color:'#6f7d90',marginTop:2}}>{e.recipient}</span></div>)}</div>}<p style={{margin:'10px 0 0',fontSize:11,color:'#8a98a8'}}>Chaque envoi réussi sera enregistré automatiquement ici.</p></section>
   </aside>
  </div>

  {confirmSend&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmSend(false)}}><div className="edit-modal" role="dialog" aria-modal="true" aria-label="Confirmer l’envoi du devis" style={{maxWidth:560}}><div className="edit-modal-head"><div><span className="section-kicker">ENVOI DU DEVIS</span><h2>{quote.status==='sent'?'Renvoyer le devis ?':'Envoyer le devis ?'}</h2></div><button onClick={()=>setConfirmSend(false)}>×</button></div><div style={{display:'grid',gap:10}}><p style={{margin:0,color:'#52657a'}}>Le devis <strong style={{color:'#062b59'}}>{quote.quote_number}</strong> sera envoyé à :</p><div style={{padding:'12px 14px',border:'1px solid #dce6f0',borderRadius:11,background:'#f7fafd',fontWeight:800,color:'#062b59'}}>{dossier?.contact_email}</div><p style={{margin:'2px 0 0',fontSize:13,color:'#6f7d90'}}>Les modifications en cours seront enregistrées automatiquement avant l’envoi.</p><p style={{margin:'2px 0 0',fontSize:13,color:'#176b35',fontWeight:700}}>Le devis PDF sera joint automatiquement à l’e-mail.</p></div><div className="edit-modal-actions"><button className="ghost-btn" onClick={()=>setConfirmSend(false)}>Annuler</button><button className="action-btn primary-action" onClick={sendQuote}>{quote.status==='sent'?'Confirmer le renvoi':'Confirmer l’envoi'}</button></div></div></div>}
 </main></AppShell>
}