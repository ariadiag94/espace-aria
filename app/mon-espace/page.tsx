'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSignupClient } from '@/lib/pro-signup'
import { ChatWidget } from '@/components/ChatWidget'
import { TabBar } from '@/components/TabBar'
import { TeamPanel } from '@/components/TeamPanel'
import { dossierStatusLabel } from '@/lib/dossier-status-labels'

const NAVY = '#062b59'
const LIGHT = '#eef1f5'

type DossierRow = {
  id: string
  dossier_name: string | null
  property_address: string | null
  status: string | null
  created_at: string
  requested_by_name?: string | null
}

type AccessState = 'checking' | 'authorized' | 'unavailable'

// Portail client V1 (chantier "compte pro", Phases 6-9). Réutilise
// has_assistant_access() : malgré son nom (pensé pour /assistant, Phase 4),
// le critère d'éligibilité est le même ici — membre interne (staff/admin) ou
// compte pro validé — donc pas de nouvelle fonction dédiée pour cette
// vérification précise.
export default function MonEspacePage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [dossiers, setDossiers] = useState<DossierRow[]>([])
  const [loadError, setLoadError] = useState('')
  const [teamClient] = useState(() => getSignupClient())
  const [team, setTeam] = useState<{ account_id: string; company_name: string | null; team_role: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const client = getSignupClient()
      if (!client) {
        if (!cancelled) setAccessState('unavailable')
        return
      }
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
        router.replace('/login?reason=anonymous&next=/mon-espace')
        return
      }
      const { data: hasAccess } = await client.rpc('has_assistant_access')
      if (!hasAccess) {
        const { data: status } = await client.rpc('my_client_account_validation_status')
        const reason = status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'no-account'
        router.replace(`/login?reason=${reason}&next=/mon-espace`)
        return
      }

      // Requête volontairement non filtrée par compte : on s'appuie
      // entièrement sur la RLS dossiers_read (is_internal() OU
      // can_access_account(account_id), déjà vérifiée) plutôt que d'ajouter
      // un .eq('account_id', ...) manuel côté frontend — un filtre
      // supplémentaire ici masquerait une éventuelle faille RLS réelle au
      // lieu de la révéler.
      const { data, error } = await client
        .from('dossiers')
        .select('*')
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (error) setLoadError(error.message)
        setDossiers((data || []) as DossierRow[])
        const { data: t } = await client.rpc('my_team_account')
        setTeam(Array.isArray(t) && t[0] ? t[0] : null)
        setAccessState('authorized')
      }
    }
    void run()
    return () => { cancelled = true }
  }, [router])

  const logout = async () => {
    const client = getSignupClient()
    await client?.auth.signOut()
    router.replace('/')
  }

  if (accessState !== 'authorized') {
    return (
      <main style={{ minHeight: '100vh', background: LIGHT, display: 'grid', placeItems: 'center', fontFamily: 'Arial,Helvetica,sans-serif', padding: 24 }}>
        {accessState === 'unavailable' ? (
          <p style={{ color: NAVY, fontWeight: 700, textAlign: 'center' }}>Service momentanément indisponible. Merci de réessayer plus tard, ou de nous contacter au 06 15 70 36 70.</p>
        ) : (
          <p style={{ color: '#6f7d90' }}>Chargement…</p>
        )}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: LIGHT, fontFamily: 'Arial,Helvetica,sans-serif' }}>
      <div style={{ background: NAVY, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 900, letterSpacing: '.04em' }}>ARIA DIAGNOSTICS</span>
        <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(255,255,255,.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          Déconnexion
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
        <h1 style={{ color: NAVY, fontSize: 24, margin: '0 0 6px' }}>Mon espace</h1>
        <p style={{ color: '#6f7d90', fontSize: 14, margin: '0 0 24px' }}>Vos dossiers, devis et documents ARIA Diagnostics.</p>
        <Link href="/assistant" style={{ display: 'block', padding: '16px 18px', borderRadius: 14, background: '#23a5df', color: '#fff', textDecoration: 'none', marginBottom: 12 }}>
          <b>Nouvelle demande de devis</b>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Diagnostics obligatoires et prix en quelques minutes →</div>
        </Link>
        <Link href="/ressources" style={{ display: 'block', padding: '16px 18px', borderRadius: 14, background: NAVY, color: '#fff', textDecoration: 'none', marginBottom: 20, borderLeft: '5px solid #23a5df' }}>
          <b>Ressources professionnelles</b>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Diagnostics obligatoires, DPE, textes de loi, préparation de la visite →</div>
        </Link>

        {loadError && <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff0f0', border: '1px solid #ffcfcf', color: '#a62d2d', fontSize: 13, marginBottom: 16 }}>{loadError}</div>}

        {dossiers.length === 0 && !loadError && (
          <div style={{ padding: '18px 20px', borderRadius: 14, background: '#fff', border: '1px solid #dbe7f2', color: '#6f7d90', fontSize: 14 }}>
            Aucun dossier pour l’instant.
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {dossiers.map((dossier) => (
            <Link
              key={dossier.id}
              href={`/mon-espace/${dossier.id}`}
              style={{ display: 'block', padding: '16px 18px', borderRadius: 14, border: '1px solid #dbe7f2', background: '#fff', textDecoration: 'none' }}
            >
              <div style={{ color: NAVY, fontWeight: 700, fontSize: 15 }}>{dossier.dossier_name || 'Dossier'}</div>
              <div style={{ color: '#6f7d90', fontSize: 13, marginTop: 2 }}>{dossier.property_address || '—'}</div>
              {dossier.requested_by_name && <div style={{ color: '#23a5df', fontSize: 12, fontWeight: 700, marginTop: 4 }}>Demandé par {dossier.requested_by_name}</div>}
              {dossier.status && (
                <span style={{ display: 'inline-flex', marginTop: 8, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, background: LIGHT, color: NAVY }}>
                  {dossierStatusLabel(dossier.status)}
                </span>
              )}
            </Link>
          ))}
        </div>
        {team && teamClient && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ color: NAVY, fontSize: 18, margin: '0 0 4px' }}>Mon équipe{team.company_name ? ` · ${team.company_name}` : ''}</h2>
            <p style={{ color: '#6f7d90', fontSize: 13, margin: '0 0 12px' }}>Tous les collaborateurs voient les dossiers de l’agence et bénéficient du tarif partenaire.</p>
            <TeamPanel client={teamClient} accountId={team.account_id} canManage={team.team_role === 'owner'} />
          </section>
        )}
      </div>
      <TabBar variant="pro" active="pro-dossiers" />
      <ChatWidget page="mon-espace" context="L'utilisateur est un professionnel dans son espace (suivi de ses dossiers)." />
    </main>
  )
}
