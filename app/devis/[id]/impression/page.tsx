'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Quote={id:string;quote_number:string;status:string;total_ht:number;total_vat:number;total_ttc:number;created_at:string;dossier_id:string;property_type?:string|null;property_size?:string|null;notes?:string|null}
type Dossier={id:string;dossier_name:string;property_address?:string|null;contact_name?:string|null;contact_email?:string|null;contact_phone?:string|null}
type Line={id?:string;label:string;quantity:number;unit_ttc:number;total_ttc:number;sort_order:number}

const euro=(n:number)=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})
const dateFr=(v:string)=>new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})
const statusLabel=(s:string)=>({draft:'Brouillon',sent:'Envoyé',accepted:'Accepté',rejected:'Refusé'} as Record<string,string>)[s]||s

export default function QuotePrintPage(){
 const params=useParams<{id:string}>();const router=useRouter();const id=params.id
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [quote,setQuote]=useState<Quote|null>(null);const [dossier,setDossier]=useState<Dossier|null>(null);const [lines,setLines]=useState<Line[]>([])

 useEffect(()=>{void(async()=>{
  const {data:{session}}=await supabase.auth.getSession();if(!session){router.replace('/login');return}
  const {data:q,error:qErr}=await supabase.from('quotes').select('*').eq('id',id).single();if(qErr||!q){setError(qErr?.message||'Devis introuvable.');setLoading(false);return}
  setQuote(q as Quote)
  const [d,l]=await Promise.all([
   supabase.from('dossiers').select('id,dossier_name,property_address,contact_name,contact_email,contact_phone').eq('id',q.dossier_id).single(),
   supabase.from('quote_lines').select('*').eq('quote_id',id).order('sort_order',{ascending:true})
  ])
  if(d.data)setDossier(d.data as Dossier);if(l.data)setLines(l.data as Line[]);setLoading(false)
 })()},[id,router])

 const totalTtc=useMemo(()=>Math.round(lines.reduce((s,l)=>s+Number(l.quantity||0)*Number(l.unit_ttc||0),0)*100)/100,[lines])
 const totalHt=Math.round(totalTtc/1.2*100)/100;const vat=Math.round((totalTtc-totalHt)*100)/100

 if(loading)return <div style={{padding:30,fontFamily:'Arial, sans-serif'}}>Chargement du devis…</div>
 if(!quote)return <div style={{padding:30,fontFamily:'Arial, sans-serif'}}>{error||'Devis introuvable.'}</div>

 return <main className="quote-print-page">
  <div className="quote-print-toolbar no-print"><Link href={`/devis/${quote.id}`}>← Retour au devis</Link><button onClick={()=>window.print()}>Imprimer / Enregistrer en PDF</button></div>
  <article className="quote-sheet">
   <header className="quote-header">
    <div className="quote-brand"><div className="quote-logo-text">ARIA</div><div><strong>ARIA DIAGNOSTICS</strong><span>Diagnostics immobiliers</span></div></div>
    <div className="quote-meta"><div className="quote-title">DEVIS</div><strong>{quote.quote_number}</strong><span>Émis le {dateFr(quote.created_at)}</span><span>Statut : {statusLabel(quote.status)}</span></div>
   </header>

   <section className="quote-parties">
    <div><h3>Prestataire</h3><strong>ARIA Diagnostics</strong><p>18 rue de Budapest<br/>94140 Alfortville</p><p>06 15 70 36 70<br/>contact@aria-diagnostics.fr<br/>www.aria-diagnostics.fr</p><p>SIRET : 988 026 746 00012<br/>TVA : FR34 988026746<br/>APE : 7120B</p></div>
    <div><h3>Client / Bien concerné</h3><strong>{dossier?.dossier_name||'Dossier'}</strong>{dossier?.property_address&&<p>{dossier.property_address}</p>}<p>{quote.property_type==='house'?'Maison':quote.property_type==='apartment'?'Appartement':'Bien'}{quote.property_size?` · ${quote.property_size}`:''}</p>{dossier?.contact_name&&<p>Contact : {dossier.contact_name}{dossier.contact_phone?<><br/>{dossier.contact_phone}</>:null}{dossier.contact_email?<><br/>{dossier.contact_email}</>:null}</p>}</div>
   </section>

   <section className="quote-lines-wrap"><table className="quote-lines"><thead><tr><th>Prestation</th><th>Qté</th><th>Prix unitaire TTC</th><th>Total TTC</th></tr></thead><tbody>{lines.map((l,i)=><tr key={i}><td>{l.label}</td><td>{Number(l.quantity||0).toLocaleString('fr-FR')}</td><td>{euro(Number(l.unit_ttc||0))}</td><td>{euro(Number(l.quantity||0)*Number(l.unit_ttc||0))}</td></tr>)}</tbody></table></section>

   <section className="quote-summary"><div className="quote-note"><h3>Conditions</h3><p>Paiement à réception. Le présent devis reprend les prestations et montants validés dans Espace ARIA.</p>{quote.notes&&<><h3>Précisions</h3><p>{quote.notes}</p></>}</div><div className="quote-totals"><div><span>Total HT</span><strong>{euro(totalHt)}</strong></div><div><span>TVA 20 %</span><strong>{euro(vat)}</strong></div><div className="grand-total"><span>Total TTC</span><strong>{euro(totalTtc)}</strong></div></div></section>

   <footer className="quote-footer"><div>ARIA Diagnostics · SASU au capital de 1 000 € · RCP AXA n°10988009704</div><div>Devis {quote.quote_number}</div></footer>
  </article>
  <style jsx global>{`
   body{margin:0;background:#eef3f8;color:#062b59;font-family:Arial,Helvetica,sans-serif}.quote-print-page{padding:24px}.quote-print-toolbar{max-width:920px;margin:0 auto 14px;display:flex;justify-content:space-between;align-items:center}.quote-print-toolbar a{color:#0868b8;text-decoration:none;font-weight:700}.quote-print-toolbar button{border:0;border-radius:10px;background:#062b59;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer}.quote-sheet{max-width:920px;min-height:1180px;margin:0 auto;background:#fff;padding:44px 48px;box-sizing:border-box;box-shadow:0 20px 50px rgba(6,43,89,.12)}.quote-header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #0b6cb8;padding-bottom:22px}.quote-brand{display:flex;gap:14px;align-items:center}.quote-logo-text{background:#062b59;color:#fff;border-radius:10px;padding:10px 14px;font-size:24px;font-weight:800;letter-spacing:2px}.quote-brand strong{display:block;font-size:18px}.quote-brand span{display:block;color:#66788c;margin-top:3px}.quote-meta{text-align:right;display:grid;gap:5px}.quote-title{font-size:28px;font-weight:800;letter-spacing:2px}.quote-meta span{color:#66788c}.quote-parties{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:30px}.quote-parties>div{border:1px solid #dce6f0;border-radius:12px;padding:18px}.quote-parties h3,.quote-note h3{margin:0 0 8px;color:#0b6cb8;font-size:13px;text-transform:uppercase;letter-spacing:1px}.quote-parties p,.quote-note p{margin:7px 0;line-height:1.45;color:#3f5063}.quote-lines-wrap{margin-top:30px}.quote-lines{width:100%;border-collapse:collapse}.quote-lines th{background:#062b59;color:#fff;text-align:left;padding:12px 10px;font-size:13px}.quote-lines th:nth-child(n+2),.quote-lines td:nth-child(n+2){text-align:right}.quote-lines td{padding:13px 10px;border-bottom:1px solid #e5ecf3}.quote-summary{display:grid;grid-template-columns:1fr 310px;gap:30px;margin-top:28px;align-items:start}.quote-note{padding:16px;border:1px solid #e0e8f0;border-radius:12px}.quote-totals{border:1px solid #dce6f0;border-radius:12px;padding:18px}.quote-totals>div{display:flex;justify-content:space-between;gap:18px;padding:7px 0}.grand-total{border-top:2px solid #062b59;margin-top:8px;padding-top:14px!important;font-size:22px}.quote-footer{margin-top:42px;border-top:1px solid #dce6f0;padding-top:14px;display:flex;justify-content:space-between;gap:20px;color:#718096;font-size:11px}
   @media(max-width:700px){.quote-print-page{padding:0}.quote-sheet{padding:24px;min-height:auto;box-shadow:none}.quote-header,.quote-footer{flex-direction:column}.quote-meta{text-align:left}.quote-parties,.quote-summary{grid-template-columns:1fr}.quote-lines{font-size:12px}.quote-lines th,.quote-lines td{padding:9px 5px}.quote-print-toolbar{padding:12px}}
   @media print{@page{size:A4;margin:12mm}.no-print{display:none!important}body{background:#fff}.quote-print-page{padding:0}.quote-sheet{box-shadow:none;max-width:none;min-height:auto;padding:0}.quote-lines tr,.quote-parties>div,.quote-summary{break-inside:avoid}.quote-footer{position:relative}}
  `}</style>
 </main>
}
