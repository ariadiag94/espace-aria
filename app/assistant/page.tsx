'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { buildAssainissementDetail, computeDiagnostics, PricedOptionId } from '@/lib/property-alerts'
import { COMMUNE_RULES, OTHER_COMMUNE_SLUG } from '@/lib/commune-rules'
import {
  ALACARTE_ITEM_IDS,
  ALaCarteItemId,
  APARTMENT_DPE_ONLY_PRICES,
  APARTMENT_SIZE_LABELS,
  ERP_OPTION_PRICE,
  getALaCartePrice,
  getPackPrice,
  HOUSE_DPE_ONLY_PRICES,
  HOUSE_MEASUREMENT_PRICES,
  HOUSE_QUOTE_ON_REQUEST_INDEX,
  HOUSE_SIZE_LABELS,
} from '@/lib/property-pricing'

const NAVY = '#062b59'
const SKY = '#4db3e6'
const LIGHT = '#eef1f5'

const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

// 'alaCarte' est un 3e choix au même niveau que vente/location, pas une
// variante du moteur guidé : computeDiagnostics() (lib/property-alerts.ts)
// n'est jamais appelé avec cette valeur, uniquement avec 'sale' | 'rental'.
type Purpose = 'sale' | 'rental' | 'alaCarte'
type PropertyType = 'apartment' | 'house'
type Heating = 'collective' | 'individual'

const currentYear = new Date().getFullYear()
const YEAR_BRACKETS = [
  { label: 'Avant 1949', year: 1930 },
  { label: '1949 – 1996', year: 1970 },
  { label: `1997 – ${currentYear - 15}`, year: currentYear - 15 },
  { label: `${currentYear - 14} à aujourd’hui`, year: currentYear },
]

// Libellé de chaque diagnostic sélectionnable en mode "à la carte" ;
// "surface" dépend du type de bien (pas d'objet vente/location dans ce mode).
const alaCarteItemLabel = (id: ALaCarteItemId, propertyType: PropertyType | null): string => {
  switch (id) {
    case 'dpe': return 'DPE'
    case 'erp': return 'ERP'
    case 'surface': return propertyType === 'house' ? 'Boutin/Mesurage' : 'Carrez/Boutin'
    case 'plomb': return 'Plomb (CREP)'
    case 'amiante': return 'Amiante'
    case 'elec': return 'Électricité'
    case 'gaz': return 'Gaz'
    case 'termites': return 'Termites'
  }
}

type Screen = 'commune' | 'purpose' | 'propertyType' | 'heating' | 'surfaceAttestation' | 'year' | 'checklist' | 'size' | 'result'

// Contexte de l'estimation au moment où le client envoie sa demande, transmis
// tel quel à public.leads (colonnes property_type/purpose/estimated_price) et
// à diagnostics_summary (jsonb, forme différente selon le mode vente/location
// vs "à la carte" — voir app/api/leads/notify/route.ts qui lit les deux).
type LeadContext = {
  propertyType: PropertyType
  purpose: Purpose
  estimatedPrice: number | null
  diagnosticsSummary: Record<string, unknown>
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

// Formulaire de capture de la demande client, affiché sous le prix sur
// l'écran "result" (vente/location et "à la carte"). Écrit directement dans
// public.leads (RLS : insert ouvert à anon/authenticated, voir
// supabase/migrations/011_leads.sql), sans .select() pour ne pas avoir
// besoin d'un droit SELECT côté anon. La notification email
// (app/api/leads/notify) est déclenchée seulement après un insert réussi et
// n'est jamais bloquante : le lead est déjà sauvegardé, c'est l'essentiel.
//
// Le client Supabase est créé ici (pas importé depuis lib/supabase.ts, qui
// lève une exception au chargement du module si les variables d'env sont
// absentes) : /assistant est une page publique sans autre dépendance à
// Supabase, elle doit continuer à afficher l'estimation même si Supabase est
// mal configuré — seul ce formulaire doit échouer (proprement, via le statut
// 'error' ci-dessous) dans ce cas.
const getLeadsClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}
function LeadCaptureForm({ context }: { context: LeadContext }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0 && EMAIL_PATTERN.test(email.trim())

  const submit = async () => {
    if (!canSubmit || status === 'submitting') return
    setStatus('submitting')

    const client = getLeadsClient()
    if (!client) {
      setStatus('error')
      return
    }

    const payload = {
      contact_name: name.trim(),
      contact_phone: phone.trim(),
      contact_email: email.trim(),
      property_address: address.trim() || null,
      property_type: context.propertyType,
      purpose: context.purpose,
      estimated_price: context.estimatedPrice,
      diagnostics_summary: context.diagnosticsSummary,
    }

    const { error } = await client.from('leads').insert(payload)
    if (error) {
      setStatus('error')
      return
    }

    setStatus('done')
    fetch('/api/leads/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }

  if (status === 'done') {
    return (
      <div style={{ padding: '16px 18px', borderRadius: 14, background: '#eaf6ee', border: '1px solid #bfe2c8', color: '#1f5c34', fontWeight: 700, fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
        ✓ Votre demande a été transmise. Nous vous recontactons sous 24h ouvrées pour confirmer votre devis.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: NAVY, fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Envoyer ma demande</div>
      <p style={{ color: '#6f7d90', fontSize: 13, margin: '0 0 14px' }}>
        Transmettez-nous vos coordonnées, nous revenons vers vous sous 24h ouvrées pour confirmer votre devis.
      </p>
      <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
        <input className="diagassist-input" placeholder="Nom et prénom" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="diagassist-input" placeholder="Téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="diagassist-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="diagassist-input" placeholder="Adresse du bien (optionnel)" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <p style={{ color: '#9aa6b5', fontSize: 11, lineHeight: 1.5, margin: '0 0 14px' }}>
        En envoyant ce formulaire, vous acceptez d’être recontacté(e) par ARIA Diagnostics au sujet de votre demande. Vos données ne sont utilisées que dans ce cadre.
      </p>
      {status === 'error' && (
        <p style={{ color: '#b3261e', fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>
          Une erreur est survenue lors de l’envoi. Merci de réessayer, ou de nous contacter directement au 06 15 70 36 70.
        </p>
      )}
      <button className="diagassist-choice" style={{ textAlign: 'center' }} disabled={!canSubmit || status === 'submitting'} onClick={submit}>
        {status === 'submitting' ? 'Envoi...' : 'Envoyer ma demande'}
      </button>
    </div>
  )
}

export default function AssistantPage() {
  const [step, setStep] = useState(0)
  const [communeSlug, setCommuneSlug] = useState<string | null>(null)
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null)
  const [heating, setHeating] = useState<Heating | null>(null)
  const [hasSurfaceAttestation, setHasSurfaceAttestation] = useState<boolean | null>(null)
  const [yearIndex, setYearIndex] = useState<number | null>(null)
  const [sizeIndex, setSizeIndex] = useState<number | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<ALaCarteItemId>>(new Set())

  const constructionYear = yearIndex !== null ? YEAR_BRACKETS[yearIndex].year : null
  // Seuil "mission minimale" (DPE seul) : ne dépend pas de la réponse à
  // l'attestation de surface, donc calculable dès que l'année est connue,
  // avant même de poser la question — nécessaire pour savoir si l'écran
  // 'surfaceAttestation' doit apparaître dans le parcours (pack complet :
  // pas de question du tout). Sans objet en mode "à la carte" (purpose ===
  // 'alaCarte') : le moteur guidé n'est jamais appelé dans ce cas.
  const isMinimalMission = (purpose === 'sale' || purpose === 'rental') && propertyType && constructionYear !== null
    ? computeDiagnostics({ purpose, propertyType, constructionYear, communeSlug, hasSurfaceAttestation: false }).isMinimalMission
    : false

  // Parcours dynamique : la commune est demandée en premier. Le mode "à la
  // carte" (3e choix sur l'écran "objet") saute directement à la sélection
  // libre des diagnostics, sans année, chauffage, ni question d'attestation
  // — ces notions n'ont pas de sens quand le client choisit lui-même.
  // Pour vente/location : un appartement est toujours en copropriété (pas de
  // question dédiée), le chauffage est donc demandé pour tout appartement.
  // La question d'attestation de surface n'est posée qu'en mission minimale,
  // une fois l'année connue (le seuil en dépend) ; en pack complet elle
  // n'apparaît pas du tout.
  const screens: Screen[] = useMemo(() => {
    const s: Screen[] = ['commune', 'purpose']
    if (purpose === 'alaCarte') {
      s.push('propertyType', 'size', 'checklist', 'result')
      return s
    }
    s.push('propertyType')
    if (propertyType === 'apartment') {
      s.push('heating')
    }
    s.push('year')
    if (isMinimalMission) {
      s.push('surfaceAttestation')
    }
    s.push('size', 'result')
    return s
  }, [propertyType, isMinimalMission, purpose])

  const currentScreen = screens[Math.min(step, screens.length - 1)]

  const goBack = () => setStep((s) => Math.max(0, s - 1))
  const advance = () => setStep((s) => s + 1)
  const restart = () => {
    setStep(0)
    setCommuneSlug(null)
    setPurpose(null)
    setPropertyType(null)
    setHeating(null)
    setHasSurfaceAttestation(null)
    setYearIndex(null)
    setSizeIndex(null)
    setCheckedItems(new Set())
  }

  const selectCommune = (slug: string) => { setCommuneSlug(slug); advance() }
  // Le libellé de la question d'attestation dépend de l'objet (Carrez en
  // vente, Boutin en location) : si l'objet change, la réponse précédente
  // ne s'applique plus au bon libellé, donc on la réinitialise. La sélection
  // "à la carte" ne s'applique plus si on change d'objet.
  const selectPurpose = (p: Purpose) => { setPurpose(p); setHasSurfaceAttestation(null); setCheckedItems(new Set()); advance() }
  const selectPropertyType = (t: PropertyType) => { setPropertyType(t); setHeating(null); setHasSurfaceAttestation(null); setSizeIndex(null); setCheckedItems(new Set()); advance() }
  const selectHeating = (h: Heating) => { setHeating(h); advance() }
  const selectSurfaceAttestation = (v: boolean) => { setHasSurfaceAttestation(v); advance() }
  // Changer l'année peut faire basculer le seuil mission minimale / pack
  // complet, ce qui change si la question d'attestation doit être posée :
  // on réinitialise la réponse précédente pour ne pas en garder une qui ne
  // correspond plus au bon parcours.
  const selectYear = (i: number) => { setYearIndex(i); setHasSurfaceAttestation(null); advance() }
  const selectSize = (i: number) => { setSizeIndex(i); advance() }
  const toggleALaCarteItem = (id: ALaCarteItemId) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Fragment inséré dans "Avez-vous déjà une attestation de surface {X} ?" :
  // "Carrez" en vente d'appartement, "Boutin" en location, "habitable" pour
  // une maison (donne "...de surface habitable", sans doublon).
  const surfaceAttestationFragment = propertyType === 'apartment'
    ? (purpose === 'sale' ? 'Carrez' : 'Boutin')
    : 'habitable'

  const sizeLabels = propertyType === 'apartment' ? APARTMENT_SIZE_LABELS : HOUSE_SIZE_LABELS
  const maxPack = propertyType === 'house' ? 6 : 7

  const diagnostics = (purpose === 'sale' || purpose === 'rental') && propertyType && constructionYear !== null
    ? computeDiagnostics({ purpose, propertyType, constructionYear, communeSlug, hasSurfaceAttestation: !!hasSurfaceAttestation })
    : null

  const houseOver250 = propertyType === 'house' && sizeIndex === HOUSE_QUOTE_ON_REQUEST_INDEX
  // Mode "à la carte" : prix calculé par la source commune
  // lib/property-pricing.ts (1 seul diagnostic coché -> prix unitaire ; 2 ou
  // plus -> prix du pack existant correspondant au nombre coché, peu importe
  // lesquels). L'assainissement reste affiché mais n'entre jamais dans ce
  // calcul, comme dans le moteur guidé.
  const alaCarteOverflow = purpose === 'alaCarte' && checkedItems.size > maxPack
  const alaCarteQuoteOnRequest = purpose === 'alaCarte' && (houseOver250 || alaCarteOverflow)
  const alaCartePrice = purpose === 'alaCarte' && propertyType && sizeIndex !== null && !alaCarteQuoteOnRequest && checkedItems.size > 0
    ? getALaCartePrice(propertyType, Array.from(checkedItems), sizeIndex)
    : null
  const alaCarteNoMatch = purpose === 'alaCarte' && !alaCarteQuoteOnRequest && checkedItems.size > 0 && alaCartePrice === null
  // Nombre de diagnostics obligatoires qui comptent réellement pour choisir
  // le pack (l'ERP offert, en mission minimale + "Non", en est exclu : le
  // prix réutilise directement le pack 2, sans compter l'ERP comme un 3e
  // diagnostic — voir countsTowardPack dans lib/property-alerts.ts).
  const packMandatoryCount = diagnostics
    ? diagnostics.mandatory.filter((item) => item.countsTowardPack !== false).length
    : null
  // Un diagnostic obligatoire (ex. termites en commune "entière") peut
  // pousser le nombre de diagnostics obligatoires au-delà de ce que couvre
  // la grille de packs (surtout pour les maisons, dont la grille s'arrête à
  // 6) : on le détecte sur le nombre NON plafonné, pour ne jamais afficher
  // le prix d'un pack à côté qui ne couvre pas tout ce qui est obligatoire.
  // Le chauffage collectif/individuel n'entre plus dans ce calcul : la
  // question reste posée (utile pour Gaz/DAPP et de futurs besoins de
  // documents), mais n'a aucun rapport avec le prix du pack.
  const packOverflow = packMandatoryCount !== null && packMandatoryCount > maxPack
  const quoteOnRequest = houseOver250 || packOverflow

  const packCount = packMandatoryCount !== null ? Math.max(2, Math.min(maxPack, packMandatoryCount)) : null
  // Mission minimale + attestation "Oui" : le seul diagnostic facturé est le
  // DPE, sur une grille dédiée (aucun rapport avec le pack, qui commence à
  // 2 diagnostics). Dans tous les autres cas (mission minimale + "Non", qui
  // réutilise directement le pack 2 existant ; ou pack complet), le prix
  // vient de la grille de pack habituelle.
  const isDpeOnly = !!diagnostics?.isMinimalMission && !!hasSurfaceAttestation
  // Prix du pack : -10 % en location par rapport à la vente (même pack, même
  // tranche de taille), calculé par la source commune lib/property-pricing.ts
  // pour que /assistant et /devis ne puissent pas diverger.
  const packPrice = !isDpeOnly && diagnostics && packCount !== null && sizeIndex !== null && propertyType && (purpose === 'sale' || purpose === 'rental')
    ? getPackPrice(propertyType, packCount, sizeIndex, purpose)
    : null
  const dpeOnlyPrice = isDpeOnly && sizeIndex !== null
    ? (propertyType === 'apartment' ? APARTMENT_DPE_ONLY_PRICES[sizeIndex] : HOUSE_DPE_ONLY_PRICES[sizeIndex]) ?? null
    : null
  const totalPrice = isDpeOnly ? dpeOnlyPrice : packPrice
  // Combinaison sans tarif dans la grille alors qu'aucun cas "sur devis" connu
  // ne s'applique : signalée telle quelle plutôt que d'inventer un prix.
  const noPackMatch = !quoteOnRequest && totalPrice === null && diagnostics !== null && sizeIndex !== null

  // Mesurage maison (pack complet uniquement — en mission minimale il est
  // soit obligatoire et inclus dans le prix, soit absent) et ERP (mission
  // minimale + attestation "Oui" uniquement) sont les deux seules options
  // avec un prix. Carrez, Boutin et DAPP restent des diagnostics obligatoires
  // sans prix propre, jamais des options.
  const optionPrice = (id: PricedOptionId): number | null => {
    if (id === 'measurement' && propertyType === 'house' && sizeIndex !== null) return HOUSE_MEASUREMENT_PRICES[sizeIndex] ?? null
    if (id === 'erp') return ERP_OPTION_PRICE
    return null
  }

  return (
    <main style={{ minHeight: '100vh', background: LIGHT, fontFamily: 'Arial,Helvetica,sans-serif', padding: '28px 16px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        .diagassist-choice { display: block; width: 100%; text-align: left; padding: 16px 18px; border-radius: 14px; border: 2px solid #dbe7f2; background: #fff; color: ${NAVY}; font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .diagassist-choice:hover { border-color: ${SKY}; }
        .diagassist-back { background: none; border: none; color: #6f7d90; font-weight: 700; font-size: 13px; cursor: pointer; padding: 0; margin-top: 22px; font-family: inherit; }
        .diagassist-back:hover { color: ${NAVY}; }
        .diagassist-restart { background: none; border: none; color: ${NAVY}; font-weight: 700; font-size: 13px; cursor: pointer; padding: 0; text-decoration: underline; font-family: inherit; }
        .diagassist-checkbox-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 14px 18px; border-radius: 14px; border: 2px solid #dbe7f2; background: #fff; color: ${NAVY}; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .diagassist-checkbox-row input { width: 18px; height: 18px; accent-color: ${NAVY}; }
        .diagassist-choice:disabled { opacity: .45; cursor: not-allowed; }
        .diagassist-input { width: 100%; box-sizing: border-box; padding: 13px 16px; border-radius: 12px; border: 2px solid #dbe7f2; background: #fff; color: ${NAVY}; font-size: 15px; font-family: inherit; }
        .diagassist-input:focus { outline: none; border-color: ${SKY}; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 560 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: NAVY, textDecoration: 'none', fontWeight: 700, fontSize: 13, marginBottom: 18 }}>
          ← Retour à l’accueil
        </Link>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {screens.map((s, i) => (
            <div key={s} style={{ width: 10, height: 10, borderRadius: 999, background: i <= step ? NAVY : '#d7dee6' }} />
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 50px rgba(6,43,89,.10)' }}>
          <div style={{ height: 6, background: `linear-gradient(90deg, ${NAVY}, ${SKY})` }} />
          <div style={{ padding: '30px 26px' }}>
            <div style={{ color: SKY, fontWeight: 900, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              DIAGASSIST · ÉTAPE {Math.min(step + 1, screens.length)}/{screens.length}
            </div>

            {currentScreen === 'commune' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Dans quelle commune se trouve le bien ?</h1>
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) selectCommune(e.target.value) }}
                  style={{ width: '100%', padding: '16px 18px', borderRadius: 14, border: '2px solid #dbe7f2', background: '#fff', color: NAVY, fontSize: 16, fontWeight: 700, fontFamily: 'inherit' }}
                >
                  <option value="" disabled>Sélectionnez une commune</option>
                  {COMMUNE_RULES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                  <option value={OTHER_COMMUNE_SLUG}>Autre commune</option>
                </select>
              </>
            )}

            {currentScreen === 'purpose' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Votre projet concerne...</h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button className="diagassist-choice" onClick={() => selectPurpose('sale')}>Une vente</button>
                  <button className="diagassist-choice" onClick={() => selectPurpose('rental')}>Une location</button>
                  <button className="diagassist-choice" onClick={() => selectPurpose('alaCarte')}>Diagnostics à la carte</button>
                </div>
              </>
            )}

            {currentScreen === 'propertyType' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Quel est le type de bien ?</h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button className="diagassist-choice" onClick={() => selectPropertyType('apartment')}>Appartement</button>
                  <button className="diagassist-choice" onClick={() => selectPropertyType('house')}>Maison</button>
                </div>
              </>
            )}

            {currentScreen === 'heating' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Le chauffage est-il collectif ou individuel ?</h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button className="diagassist-choice" onClick={() => selectHeating('collective')}>Collectif</button>
                  <button className="diagassist-choice" onClick={() => selectHeating('individual')}>Individuel</button>
                </div>
              </>
            )}

            {currentScreen === 'surfaceAttestation' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>
                  Avez-vous déjà une attestation de surface {surfaceAttestationFragment} (acte notarié, permis de construire, ancien diagnostic) ?
                </h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button className="diagassist-choice" onClick={() => selectSurfaceAttestation(true)}>Oui</button>
                  <button className="diagassist-choice" onClick={() => selectSurfaceAttestation(false)}>Non</button>
                </div>
              </>
            )}

            {currentScreen === 'year' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>De quand date la construction ?</h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  {YEAR_BRACKETS.map((bracket, i) => (
                    <button key={bracket.label} className="diagassist-choice" onClick={() => selectYear(i)}>{bracket.label}</button>
                  ))}
                </div>
              </>
            )}

            {currentScreen === 'size' && propertyType && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>
                  {propertyType === 'apartment' ? 'Combien de pièces principales ?' : 'Quelle est la surface habitable ?'}
                </h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  {sizeLabels.map((label, i) => (
                    <button key={label} className="diagassist-choice" onClick={() => selectSize(i)}>{label}</button>
                  ))}
                </div>
              </>
            )}

            {currentScreen === 'checklist' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Choisissez les diagnostics souhaités</h1>
                <div style={{ display: 'grid', gap: 10 }}>
                  {ALACARTE_ITEM_IDS.map((id) => (
                    <label key={id} className="diagassist-checkbox-row">
                      <input type="checkbox" checked={checkedItems.has(id)} onChange={() => toggleALaCarteItem(id)} />
                      <span>{alaCarteItemLabel(id, propertyType)}</span>
                    </label>
                  ))}
                </div>
                <button className="diagassist-choice" style={{ marginTop: 16, textAlign: 'center' }} disabled={checkedItems.size === 0} onClick={advance}>
                  Voir mon estimation
                </button>
              </>
            )}

            {currentScreen === 'result' && purpose === 'alaCarte' && propertyType && sizeIndex !== null && (
              <div>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 6px' }}>Votre estimation</h1>
                <p style={{ color: '#6f7d90', fontSize: 14, margin: '0 0 22px' }}>
                  {propertyType === 'apartment' ? 'Appartement' : 'Maison'} · {sizeLabels[sizeIndex]} · Diagnostics à la carte
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Diagnostics sélectionnés</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#315a48', fontSize: 14, lineHeight: 1.6 }}>
                    {ALACARTE_ITEM_IDS.filter((id) => checkedItems.has(id)).map((id) => (
                      <li key={id}><b>{alaCarteItemLabel(id, propertyType)}</b></li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>À confirmer</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#7a5612', fontSize: 14, lineHeight: 1.6 }}>
                    <li><b>Assainissement</b> — {buildAssainissementDetail(propertyType, communeSlug)}</li>
                  </ul>
                  <p style={{ color: '#9a8355', fontSize: 12, margin: '8px 0 0' }}>Si confirmé, ce diagnostic s’ajoute au prix ci-dessous.</p>
                </div>

                <div style={{ padding: '18px 20px', borderRadius: 16, background: alaCarteQuoteOnRequest || alaCarteNoMatch ? '#fff8e6' : LIGHT, border: `1px solid ${alaCarteQuoteOnRequest || alaCarteNoMatch ? '#f0c76a' : '#dbe7f2'}`, marginBottom: 20 }}>
                  {alaCarteQuoteOnRequest || alaCarteNoMatch ? (
                    <div style={{ color: '#7a5612', fontWeight: 900, fontSize: 17 }}>Nous vous répondons avec un devis personnalisé</div>
                  ) : (
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 22 }}>À partir de {euro(alaCartePrice as number)} TTC</div>
                  )}
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f7fa', border: '1px solid #e2e8ef', color: '#52657a', fontSize: 12, lineHeight: 1.6, marginBottom: 22 }}>
                  Estimation indicative, établie à partir des informations que vous avez déclarées. Elle ne constitue ni un devis ni un engagement. Les diagnostics obligatoires dépendent de la situation réelle du bien et de la réglementation en vigueur : ARIA Diagnostics les confirme après vérification. Le prix définitif peut différer si les informations sont inexactes ou incomplètes (surface, nombre de lots, dépendances, accès, etc.). Aucun devis n’est envoyé avant cette vérification.
                </div>

                <LeadCaptureForm context={{
                  propertyType,
                  purpose: 'alaCarte',
                  estimatedPrice: alaCartePrice,
                  diagnosticsSummary: {
                    propertyType,
                    sizeLabel: sizeLabels[sizeIndex],
                    purpose: 'alaCarte',
                    communeSlug,
                    checkedItems: Array.from(checkedItems),
                    priceStatus: alaCarteQuoteOnRequest ? 'quote_on_request' : alaCarteNoMatch ? 'no_match' : 'estimated',
                    totalPrice: alaCartePrice,
                  },
                }} />

                <button className="diagassist-restart" onClick={restart}>Recommencer</button>
              </div>
            )}

            {currentScreen === 'result' && purpose && purpose !== 'alaCarte' && propertyType && sizeIndex !== null && diagnostics && (
              <div>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 6px' }}>Votre estimation</h1>
                <p style={{ color: '#6f7d90', fontSize: 14, margin: '0 0 22px' }}>
                  {propertyType === 'apartment' ? 'Appartement' : 'Maison'} · {sizeLabels[sizeIndex]} · {purpose === 'rental' ? 'Location' : 'Vente'}
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Diagnostics obligatoires</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#315a48', fontSize: 14, lineHeight: 1.6 }}>
                    {diagnostics.mandatory.map((item) => (
                      <li key={item.id}><b>{item.label}</b> — {item.detail}</li>
                    ))}
                  </ul>
                </div>

                {diagnostics.surfaceAttestationNote && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f9fd', border: '1px solid #cbddea', color: '#315a48', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                    {diagnostics.surfaceAttestationNote}
                  </div>
                )}

                {diagnostics.toConfirm.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>À confirmer</div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#7a5612', fontSize: 14, lineHeight: 1.6 }}>
                      {diagnostics.toConfirm.map((item) => (
                        <li key={item.id}><b>{item.label}</b> — {item.detail}</li>
                      ))}
                    </ul>
                    <p style={{ color: '#9a8355', fontSize: 12, margin: '8px 0 0' }}>Si confirmés, ces diagnostics s’ajoutent au prix ci-dessus.</p>
                  </div>
                )}

                {diagnostics.options.length > 0 && !quoteOnRequest && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Options liées à votre situation</div>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#315a48', fontSize: 14, lineHeight: 1.6 }}>
                      {diagnostics.options.map((option) => {
                        const price = optionPrice(option.id)
                        return <li key={option.id}><b>{option.label}</b> — {price !== null ? euro(price) : 'selon devis'}</li>
                      })}
                    </ul>
                    <p style={{ color: '#6f7d90', fontSize: 12, margin: '8px 0 0' }}>Options en supplément, non incluses dans le prix ci-dessus.</p>
                  </div>
                )}

                <div style={{ padding: '18px 20px', borderRadius: 16, background: quoteOnRequest || noPackMatch ? '#fff8e6' : LIGHT, border: `1px solid ${quoteOnRequest || noPackMatch ? '#f0c76a' : '#dbe7f2'}`, marginBottom: 20 }}>
                  {quoteOnRequest || noPackMatch ? (
                    <div style={{ color: '#7a5612', fontWeight: 900, fontSize: 17 }}>Nous vous répondons avec un devis personnalisé</div>
                  ) : (
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 22 }}>À partir de {euro(totalPrice as number)} TTC</div>
                  )}
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f7fa', border: '1px solid #e2e8ef', color: '#52657a', fontSize: 12, lineHeight: 1.6, marginBottom: 22 }}>
                  Estimation indicative, établie à partir des informations que vous avez déclarées. Elle ne constitue ni un devis ni un engagement. Les diagnostics obligatoires dépendent de la situation réelle du bien et de la réglementation en vigueur : ARIA Diagnostics les confirme après vérification. Le prix définitif peut différer si les informations sont inexactes ou incomplètes (surface, nombre de lots, dépendances, accès, etc.). Aucun devis n’est envoyé avant cette vérification.
                </div>

                <LeadCaptureForm context={{
                  propertyType,
                  purpose,
                  estimatedPrice: totalPrice,
                  diagnosticsSummary: {
                    propertyType,
                    sizeLabel: sizeLabels[sizeIndex],
                    purpose,
                    communeSlug,
                    constructionYear,
                    heating,
                    mandatory: diagnostics.mandatory.map((item) => ({ id: item.id, label: item.label })),
                    toConfirm: diagnostics.toConfirm.map((item) => ({ id: item.id, label: item.label })),
                    options: diagnostics.options.map((option) => ({ id: option.id, label: option.label, price: optionPrice(option.id) })),
                    priceStatus: quoteOnRequest ? 'quote_on_request' : noPackMatch ? 'no_match' : 'estimated',
                    totalPrice,
                  },
                }} />

                <button className="diagassist-restart" onClick={restart}>Recommencer</button>
              </div>
            )}

            {currentScreen !== 'commune' && currentScreen !== 'result' && (
              <button className="diagassist-back" onClick={goBack}>← Question précédente</button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
