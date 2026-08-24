'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type Dossier = { id:string; dossier_name:string; status:string; created_at:string }

function labelStatus(s:string) {
  const map:Record<string,string> = {
    quote_sent:'Devis envoyé', quote_accepted:'Devis accepté', to_schedule:'À planifier', scheduled:'Planifié',
    reports_ready:'Rapports prêts', waiting_payment:'Règlement', completed:'Terminé', draft:'Brouillon'
  }
  return map[s] || s.replaceAll('_',' ')
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading,setLoading]=useState(true)
  const [dossiers,setDossiers]=useState<Dossier[]>([])
  const [metrics,setMetrics]=useState({sent:0,active:0,reports:0,payments:0})

  useEffect(()=>{ (async()=>{
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const { data, error } = await supabase.from('dossiers').select('id,dossier_name,status,created_at').order('created_at',{ascending:false}).limit(8)
    if (!error && data) {
      setDossiers(data)
      setMetrics({
        sent:data.filter(x=>x.status==='quote_sent').length,
        active:data.filter(x=>!['completed','cancelled','archived'].includes(x.status)).length,
        reports:data.filter(x=>x.status==='reports_ready').length,
        payments:data.filter(x=>x.status==='waiting_payment').length,
      })
    }
    setLoading(false)
  })() },[router])

  if (loading) return <AppShell><div className="loading">Chargement de l’Espace ARIA…</div></AppShell>

  return <AppShell active="accueil">
    <main className="page">
      <div className="hero-row"><div><h1>Bonjour 👋</h1><p>Voici l’activité de ton Espace ARIA.</p></div></div>
      <section className="grid">
        <div className="card metric"><div className="label">Devis envoyés</div><div className="value">{metrics.sent}</div><div className="hint">En attente d’une décision</div></div>
        <div className="card metric"><div className="label">Dossiers en cours</div><div className="value">{metrics.active}</div><div className="hint">Toutes étapes confondues</div></div>
        <div className="card metric"><div className="label">Rapports prêts</div><div className="value">{metrics.reports}</div><div className="hint">Prêts à transmettre</div></div>
        <div className="card metric"><div className="label">Règlements à vérifier</div><div className="value">{metrics.payments}</div><div className="hint">Avant déblocage</div></div>
      </section>
      <section className="section">
        <div className="section-title"><h2>Accès rapides</h2></div>
        <div className="quick-grid">
          <Link href="/dossiers" className="card quick"><b>Dossiers en cours</b><span>Ouvrir la liste complète</span></Link>
          <Link href="/devis" className="card quick"><b>Devis rapides</b><span>Créer et chiffrer un devis</span></Link>
          <Link href="/agenda" className="card quick"><b>Agenda / RDV</b><span>Vue jour et semaine des interventions</span></Link>
          <div className="card quick"><b>Paiements</b><span>Qonto et déblocage rapports</span></div>
        </div>
      </section>
      <section className="section">
        <div className="section-title"><h2>Derniers dossiers</h2><Link className="back" href="/dossiers">Voir tout →</Link></div>
        <div className="card table-card">
          <div className="table-head"><div>Dossier</div><div>Statut</div><div>Créé le</div><div></div></div>
          {dossiers.length===0 ? <div className="table-row"><div>Aucun dossier.</div></div> : dossiers.map(d=><Link href={`/dossiers/${d.id}`} className="table-row" key={d.id}><div><b>{d.dossier_name}</b></div><div><span className="status">{labelStatus(d.status)}</span></div><div>{new Date(d.created_at).toLocaleDateString('fr-FR')}</div><div className="back">Ouvrir</div></Link>)}
        </div>
      </section>
    </main>
  </AppShell>
}
