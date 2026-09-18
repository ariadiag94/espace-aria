'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Dossier = { id:string; dossier_name:string; status:string; purpose:string|null; liciel_number:string|null; created_at:string }

export default function DossiersPage(){
  const router=useRouter(); const [rows,setRows]=useState<Dossier[]>([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession(); if(!session){router.replace('/login'); return}
    const {data}=await supabase.from('dossiers').select('id,dossier_name,status,purpose,liciel_number,created_at').order('created_at',{ascending:false})
    setRows(data||[]); setLoading(false)
  })()},[router])
  return <AppShell active="dossiers"><main className="page"><div className="hero-row"><div><h1>Dossiers</h1><p>Recherche et suivi des interventions ARIA.</p></div><Link className="action-btn primary-action" href="/dossiers/nouveau">＋ Nouveau dossier</Link></div>{loading?<div className="loading">Chargement…</div>:<div className="card table-card"><div className="table-head"><div>Dossier</div><div>Statut</div><div>Liciel</div><div></div></div>{rows.map(r=><Link href={`/dossiers/${r.id}`} key={r.id} className="table-row"><div><b>{r.dossier_name}</b><div className="subline">{r.purpose||'—'}</div></div><div><span className="status">{r.status.replaceAll('_',' ')}</span></div><div>{r.liciel_number||'—'}</div><div className="back">Ouvrir</div></Link>)}</div>}</main></AppShell>
}
