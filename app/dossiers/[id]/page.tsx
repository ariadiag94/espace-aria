'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Dossier = { id:string; dossier_name:string; status:string; purpose:string|null; liciel_number:string|null; contact_name:string|null; contact_phone:string|null; key_pickup:string|null; access_instructions:string|null; created_at:string }
type Quote = { id:string; quote_number:string; status:string; total_ttc:number }

export default function DossierPage(){
 const {id}=useParams<{id:string}>(); const router=useRouter(); const [d,setD]=useState<Dossier|null>(null); const [quotes,setQuotes]=useState<Quote[]>([]); const [loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession(); if(!session){router.replace('/login');return}
 const {data:dossier}=await supabase.from('dossiers').select('*').eq('id',id).single(); setD(dossier)
 const {data:q}=await supabase.from('quotes').select('id,quote_number,status,total_ttc').eq('dossier_id',id).order('created_at',{ascending:false}); setQuotes(q||[]); setLoading(false)})()},[id,router])
 if(loading)return <AppShell active="dossiers"><div className="loading">Chargement…</div></AppShell>
 if(!d)return <AppShell active="dossiers"><main className="page"><p>Dossier introuvable.</p></main></AppShell>
 return <AppShell active="dossiers"><main className="page"><Link className="back" href="/dossiers">← Retour aux dossiers</Link><div className="hero-row detail-hero"><div><h1>{d.dossier_name}</h1><p><span className="status">{d.status.replaceAll('_',' ')}</span></p></div></div><div className="detail-grid"><div className="card detail-card"><h2>Informations intervention</h2><div className="kv"><span>Objet</span><b>{d.purpose||'—'}</b></div><div className="kv"><span>N° Liciel</span><b>{d.liciel_number||'—'}</b></div><div className="kv"><span>Contact</span><b>{d.contact_name||'—'}</b></div><div className="kv"><span>Téléphone</span><b>{d.contact_phone||'—'}</b></div><div className="kv"><span>Récupération des clés</span><b>{d.key_pickup||'—'}</b></div><div className="kv"><span>Accès</span><b>{d.access_instructions||'—'}</b></div></div><div className="card detail-card"><h2>Devis</h2>{quotes.length===0?<p>Aucun devis.</p>:quotes.map(q=><div key={q.id} className="quote-row"><b>{q.quote_number}</b><div><span className="status">{q.status}</span><strong>{Number(q.total_ttc).toFixed(2)} € TTC</strong></div></div>)}</div></div></main></AppShell>
}
