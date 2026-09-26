'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { buildAssainissementDetail, computeDiagnostics, PricedOptionId } from '@/lib/property-alerts'
import { COMMUNE_RULES, OTHER_COMMUNE_SLUG } from '@/lib/commune-rules'
import { APARTMENT_ASSAINISSEMENT_PRICE, HOUSE_ASSAINISSEMENT_PRICE } from '@/lib/quote-assistant'
import {
  ALACARTE_ITEM_IDS,
  ALaCarteItemId,
  APARTMENT_DPE_ONLY_PRICES,
  APARTMENT_SIZE_LABELS,
  APARTMENT_TERMITES_UNIT_PRICES,
  ERP_OPTION_PRICE,
  getALaCartePrice,
  getPackPrice,
  HOUSE_DPE_ONLY_PRICES,
  HOUSE_MEASUREMENT_PRICES,
  HOUSE_QUOTE_ON_REQUEST_INDEX,
  HOUSE_SIZE_LABELS,
  HOUSE_TERMITES_UNIT_PRICES,
} from '@/lib/property-pricing'

const NAVY = '#062b59'
const SKY = '#4db3e6'
const LIGHT = '#eef1f5'

const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

// Icônes sobres (trait, currentColor) pour le bandeau d'en-tête du résultat
// vente/location — aucun fichier fourni pour "maison"/"immeuble" (les PNG
// existants couvrent uniquement les diagnostics), donc dessinées ici en SVG
// minimal plutôt que réutiliser une icône de diagnostic hors-sujet.
const HouseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
    <path d="M9.5 20v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5" />
  </svg>
)
const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15" />
    <path d="M10.5 21v-3a1.5 1.5 0 0 1 3 0v3" />
  </svg>
)

// 'alaCarte' est un 3e choix au même niveau que vente/location, pas une
// variante du moteur guidé : computeDiagnostics() (lib/property-alerts.ts)
// n'est jamais appelé avec cette valeur, uniquement avec 'sale' | 'rental'.
type Purpose = 'sale' | 'rental' | 'alaCarte'
type PropertyType = 'apartment' | 'house'

const currentYear = new Date().getFullYear()
// Libellés reformulés le 2026-09-26 (moins de chiffres explicites, plus
// clair pour le client) : year reste le seul champ qui alimente le calcul
// (isBefore1949/isBefore1997/isOldInstallation dans computeDiagnostics), ces
// valeurs numériques ne changent pas — uniquement le texte affiché.
const YEAR_BRACKETS = [
  { label: 'Avant 1949', year: 1930 },
  { label: 'Entre 1949 et 1997', year: 1970 },
  { label: 'Après 1997', year: currentYear - 15 },
  { label: 'Après 1997 et moins de 15 ans', year: currentYear },
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

// Sous-ligne explicative des cartes de diagnostic en mode "à la carte" (pas
// d'objet vente/location dans ce mode, donc pas de règle "obligatoire si..."
// à afficher — juste ce que couvre le diagnostic).
const alaCarteItemDetail = (id: ALaCarteItemId, propertyType: PropertyType | null): string => {
  switch (id) {
    case 'dpe': return 'Performance énergétique du logement'
    case 'erp': return 'État des risques et pollutions'
    case 'surface': return propertyType === 'house' ? 'Mesure de la surface habitable' : 'Mesurage de la surface (loi Carrez/Boutin)'
    case 'plomb': return 'Recherche de plomb (CREP)'
    case 'amiante': return 'Recherche d’amiante'
    case 'elec': return 'État de l’installation électrique'
    case 'gaz': return 'État de l’installation gaz'
    case 'termites': return 'Recherche de termites'
  }
}

// Sous-ligne des deux seules options payantes du moteur guidé (PricedOptionId
// dans lib/property-alerts.ts), qui n'ont pas de texte descriptif propre.
const OPTION_DETAIL: Record<PricedOptionId, string> = {
  measurement: 'Mesure de la surface habitable',
  erp: 'État des risques et pollutions',
}

// Icônes des cartes de diagnostic : même jeu de glyphes que diagnosticIcon()
// dans app/dossiers/[id]/page.tsx (utilisé pour les "Diagnostics commandés"
// d'un dossier), repris tel quel par id plutôt que par correspondance de nom
// pour rester fiable — aucune nouvelle icône inventée pour cet écran.
const DIAGNOSTIC_ICON: Record<string, string> = {
  dpe: '⌂',
  erp: '⚑',
  carrez: '↔',
  boutin: '↔',
  surface: '↔',
  measurement: '↔',
  plomb: 'Pb',
  amiante: '◉',
  elec: '⚡',
  gaz: '♨',
  termites: '⌁',
  dapp: '✓',
  assainissement: '≈',
}
const diagnosticIcon = (id: string): string => DIAGNOSTIC_ICON[id] ?? '✓'

// Icônes PNG (public/icons/diagnostics/), fournies par l'utilisateur, déjà en
// bleu ciel #4db3e6 — remplacent les glyphes texte ci-dessus sur cet écran.
// "carrez"/"boutin"/"surface"/"measurement" partagent mesurage.png (un seul
// fichier fourni pour le mesurage, quel que soit le régime) ; "dapp" aussi,
// faute d'icône dédiée (demandé explicitement). DIAGNOSTIC_ICON (glyphes)
// reste en repli défensif si un id sans PNG apparaissait un jour.
const DIAGNOSTIC_ICON_SRC: Record<string, string> = {
  dpe: '/icons/diagnostics/dpe.png',
  erp: '/icons/diagnostics/erp.png',
  carrez: '/icons/diagnostics/mesurage.png',
  boutin: '/icons/diagnostics/mesurage.png',
  surface: '/icons/diagnostics/mesurage.png',
  measurement: '/icons/diagnostics/mesurage.png',
  plomb: '/icons/diagnostics/plomb.png',
  amiante: '/icons/diagnostics/amiante.png',
  elec: '/icons/diagnostics/electricite.png',
  gaz: '/icons/diagnostics/gaz.png',
  termites: '/icons/diagnostics/termites.png',
  dapp: '/icons/diagnostics/mesurage.png',
  assainissement: '/icons/diagnostics/assainissement.png',
}

// 'added' : variante de 'included' pour un item que le client a lui-même
// ajouté en cliquant une carte "toConfirm"/"option" (2026-09-26) — même style
// visuel que "Inclus" (aucune nouvelle couleur), mais distinct sémantiquement
// (un item vraiment obligatoire n'est jamais "added").
type DiagCardTag = { kind: 'included' } | { kind: 'added' } | { kind: 'toConfirm' } | { kind: 'option'; price: number | null }

// Carte de diagnostic, réutilisée par les deux parcours résultat (guidé et
// "à la carte") : icône + nom + sous-ligne explicative + tag à droite. Pure
// présentation — ne recalcule jamais un prix ni une règle, reçoit tout en
// props. onToggle rend la carte cliquable (curseur, surbrillance bleu ciel de
// la bordure) : uniquement pour les cartes "à confirmer"/"option" que le
// client peut ajouter/retirer — jamais pour "Diagnostics obligatoires".
function DiagnosticCard({ id, label, detail, tag, onToggle }: { id: string; label: string; detail: string; tag: DiagCardTag; onToggle?: () => void }) {
  const iconSrc = DIAGNOSTIC_ICON_SRC[id]
  const interactive = typeof onToggle === 'function'
  return (
    <div
      onClick={onToggle}
      role={interactive ? 'button' : undefined}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, border: `1px solid ${tag.kind === 'added' ? SKY : '#dbe7f2'}`, background: '#fff', marginBottom: 8, cursor: interactive ? 'pointer' : 'default' }}
    >
      <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {iconSrc ? (
          <img src={iconSrc} alt="" width={26} height={26} style={{ display: 'block' }} />
        ) : (
          <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, background: LIGHT, color: NAVY, fontWeight: 900, fontSize: 13 }}>
            {diagnosticIcon(id)}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: NAVY, fontWeight: 700, fontSize: 14 }}>{label}</div>
        <div style={{ color: '#6f7d90', fontSize: 12, marginTop: 2 }}>{detail}</div>
      </div>
      {(tag.kind === 'included' || tag.kind === 'added') && (
        <span className="diagassist-badge" style={{ flexShrink: 0 }}>{tag.kind === 'added' ? '✓ Ajouté' : 'Inclus'}</span>
      )}
      {tag.kind === 'toConfirm' && (
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, background: '#fff8e6', color: '#7a5612', border: '1px solid #f0c76a' }}>
          À confirmer
        </span>
      )}
      {tag.kind === 'option' && (
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, background: SKY, color: '#fff' }}>
          {tag.price !== null ? `+ ${euro(tag.price)}` : 'Option'}
        </span>
      )}
    </div>
  )
}

type Screen = 'commune' | 'purpose' | 'propertyType' | 'gas' | 'surfaceAttestation' | 'year' | 'checklist' | 'size' | 'result'

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

// Valeurs alignées sur la contrainte CHECK de public.leads (supabase/migrations/012_leads_extra_fields.sql).
const DEPENDENCY_OPTIONS: { id: string; label: string }[] = [
  { id: 'cave', label: 'Cave' },
  { id: 'garage', label: 'Garage' },
  { id: 'parking', label: 'Parking' },
  { id: 'autre', label: 'Autre' },
]

// Complément chauffage collectif (2026-09-26), collecté directement dans ce
// formulaire — le wizard /assistant ne pose plus la question chauffage
// (retirée au profit de la question gaz, voir plus haut). Uniquement affiché
// pour un appartement (le "collectif" n'a pas de sens pour une maison
// isolée) ; entièrement optionnel, aucun impact sur canSubmit ni sur le prix.
// Valeurs alignées sur les contraintes CHECK de
// supabase/migrations/015_leads_heating_fields.sql.
type HeatingType = 'collectif' | 'individuel'
type DtgAuditAvailable = 'oui' | 'non' | 'inconnu'
const DTG_AUDIT_OPTIONS: { id: DtgAuditAvailable; label: string }[] = [
  { id: 'oui', label: 'Oui' },
  { id: 'non', label: 'Non' },
  { id: 'inconnu', label: 'Je ne sais pas' },
]

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
  const [floor, setFloor] = useState('')
  const [dependencies, setDependencies] = useState<Set<string>>(new Set())
  const [heatingType, setHeatingType] = useState<HeatingType | null>(null)
  const [heatingSystemType, setHeatingSystemType] = useState('')
  const [heatingCharges, setHeatingCharges] = useState('')
  const [dtgAuditAvailable, setDtgAuditAvailable] = useState<DtgAuditAvailable | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  // Bloc chauffage entièrement optionnel : n'entre jamais dans canSubmit.
  const canSubmit = name.trim().length > 0 && phone.trim().length > 0 && EMAIL_PATTERN.test(email.trim()) && address.trim().length > 0 && floor.trim().length > 0 && dependencies.size > 0

  const toggleDependency = (id: string) => {
    setDependencies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      property_address: address.trim(),
      floor: floor.trim(),
      dependencies: Array.from(dependencies),
      property_type: context.propertyType,
      purpose: context.purpose,
      estimated_price: context.estimatedPrice,
      heating_type: heatingType,
      heating_system_type: heatingType === 'collectif' ? (heatingSystemType.trim() || null) : null,
      heating_charges: heatingType === 'collectif' ? (heatingCharges.trim() || null) : null,
      dtg_audit_available: heatingType === 'collectif' ? dtgAuditAvailable : null,
      diagnostics_summary: {
        ...context.diagnosticsSummary,
        heatingType,
        heatingSystemType: heatingType === 'collectif' ? (heatingSystemType.trim() || null) : null,
        heatingCharges: heatingType === 'collectif' ? (heatingCharges.trim() || null) : null,
        dtgAuditAvailable: heatingType === 'collectif' ? dtgAuditAvailable : null,
      },
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
        <input className="diagassist-input" placeholder="Adresse du bien" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input className="diagassist-input" placeholder="Étage" value={floor} onChange={(e) => setFloor(e.target.value)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: NAVY, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Dépendances</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {DEPENDENCY_OPTIONS.map((option) => (
            <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '2px solid #dbe7f2', background: '#fff', color: NAVY, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <input type="checkbox" checked={dependencies.has(option.id)} onChange={() => toggleDependency(option.id)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {context.propertyType === 'apartment' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: NAVY, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Chauffage (si connu)</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['collectif', 'individuel'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHeatingType((v) => (v === value ? null : value))}
                style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${heatingType === value ? SKY : '#dbe7f2'}`, background: heatingType === value ? '#eaf5fc' : '#fff', color: NAVY, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {value === 'collectif' ? 'Collectif' : 'Individuel'}
              </button>
            ))}
          </div>

          {heatingType === 'collectif' && (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <input
                className="diagassist-input"
                placeholder="Type de chauffage (si connu) — ex. gaz collectif, fioul, réseau de chaleur"
                value={heatingSystemType}
                onChange={(e) => setHeatingSystemType(e.target.value)}
              />
              <input
                className="diagassist-input"
                placeholder="Charges de chauffage (si connu)"
                value={heatingCharges}
                onChange={(e) => setHeatingCharges(e.target.value)}
              />
              <div>
                <div style={{ color: NAVY, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Audit DTG disponible ?</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {DTG_AUDIT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDtgAuditAvailable((v) => (v === option.id ? null : option.id))}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${dtgAuditAvailable === option.id ? SKY : '#dbe7f2'}`, background: dtgAuditAvailable === option.id ? '#eaf5fc' : '#fff', color: NAVY, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
  // Présence d'une installation gaz, déclarée par le client (2026-09-26) :
  // remplace l'ancienne question "chauffage collectif/individuel", qui
  // n'entrait dans aucun calcul (aucune règle ne la testait). Le Gaz devient
  // obligatoire seulement si hasGas est vrai ET l'installation a plus de
  // 15 ans (voir computeDiagnostics dans lib/property-alerts.ts) —
  // contrairement à l'Électricité, présente sur tout logement.
  const [hasGas, setHasGas] = useState<boolean | null>(null)
  const [hasSurfaceAttestation, setHasSurfaceAttestation] = useState<boolean | null>(null)
  const [yearIndex, setYearIndex] = useState<number | null>(null)
  const [sizeIndex, setSizeIndex] = useState<number | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<ALaCarteItemId>>(new Set())
  // Assainissement en mode "à la carte" : case séparée, jamais comptée dans
  // ALaCarteItemId/getALaCartePrice (elle ne doit jamais influer sur le choix
  // unitaire vs pack), son prix s'additionne à part.
  const [alaCarteAssainissement, setALaCarteAssainissement] = useState(false)
  // Ajouts volontaires du client sur l'écran résultat du moteur guidé
  // (2026-09-26) : une carte "à confirmer" (aujourd'hui, seulement
  // Assainissement) ou "option" (ERP/Mesurage, + Termites quand
  // optionalAddOn) peut être cliquée pour s'ajouter au total, en plus du
  // pack déjà choisi — jamais de recalcul du pack lui-même. Sans objet en
  // mode "à la carte", qui a son propre état (alaCarteAssainissement).
  const [selectedToConfirm, setSelectedToConfirm] = useState<Set<string>>(new Set())
  const [selectedOptions, setSelectedOptions] = useState<Set<PricedOptionId | 'termites'>>(new Set())

  const constructionYear = yearIndex !== null ? YEAR_BRACKETS[yearIndex].year : null
  // Seuil "mission minimale" (DPE seul) : ne dépend pas de la réponse à
  // l'attestation de surface, donc calculable dès que l'année est connue,
  // avant même de poser la question — nécessaire pour savoir si l'écran
  // 'surfaceAttestation' doit apparaître dans le parcours (pack complet :
  // pas de question du tout). Sans objet en mode "à la carte" (purpose ===
  // 'alaCarte') : le moteur guidé n'est jamais appelé dans ce cas.
  const isMinimalMission = (purpose === 'sale' || purpose === 'rental') && propertyType && constructionYear !== null
    ? computeDiagnostics({ purpose, propertyType, constructionYear, communeSlug, hasSurfaceAttestation: false, hasGas: !!hasGas }).isMinimalMission
    : false

  // Mode "à la carte" avec un seul item coché et c'est le DPE : même seuil
  // "DPE seul" que la mission minimale du moteur guidé, juste atteint par un
  // autre chemin (sélection libre au lieu du questionnaire). La question
  // d'attestation de surface doit donc être posée ici aussi, pour ne pas
  // dépendre du chemin emprunté pour arriver à "DPE seul".
  const alaCarteAskSurfaceAttestation = purpose === 'alaCarte' && checkedItems.size === 1 && checkedItems.has('dpe')

  // Parcours dynamique : la commune est demandée en premier. Le mode "à la
  // carte" (3e choix sur l'écran "objet") saute directement à la sélection
  // libre des diagnostics, sans année ni gaz — ces notions n'ont pas de sens
  // quand le client choisit lui-même. La question d'attestation de surface y
  // apparaît uniquement dans le cas "DPE seul coché" ci-dessus.
  // Pour vente/location : la question gaz est posée pour tout type de bien
  // (contrairement à l'ancienne question chauffage, réservée aux
  // appartements — une installation gaz existe aussi bien dans une maison).
  // La question d'attestation de surface n'est posée qu'en mission minimale,
  // une fois l'année connue (le seuil en dépend) ; en pack complet elle
  // n'apparaît pas du tout.
  const screens: Screen[] = useMemo(() => {
    const s: Screen[] = ['commune', 'purpose']
    if (purpose === 'alaCarte') {
      s.push('propertyType', 'size', 'checklist')
      if (alaCarteAskSurfaceAttestation) {
        s.push('surfaceAttestation')
      }
      s.push('result')
      return s
    }
    s.push('propertyType', 'gas', 'year')
    if (isMinimalMission) {
      s.push('surfaceAttestation')
    }
    s.push('size', 'result')
    return s
  }, [purpose, isMinimalMission, alaCarteAskSurfaceAttestation])

  const currentScreen = screens[Math.min(step, screens.length - 1)]

  const goBack = () => setStep((s) => Math.max(0, s - 1))
  const advance = () => setStep((s) => s + 1)
  const restart = () => {
    setStep(0)
    setCommuneSlug(null)
    setPurpose(null)
    setPropertyType(null)
    setHasGas(null)
    setHasSurfaceAttestation(null)
    setYearIndex(null)
    setSizeIndex(null)
    setCheckedItems(new Set())
    setALaCarteAssainissement(false)
    setSelectedToConfirm(new Set())
    setSelectedOptions(new Set())
  }

  const selectCommune = (slug: string) => { setCommuneSlug(slug); advance() }
  // Le libellé de la question d'attestation dépend de l'objet (Carrez en
  // vente, Boutin en location) : si l'objet change, la réponse précédente
  // ne s'applique plus au bon libellé, donc on la réinitialise. La sélection
  // "à la carte" ne s'applique plus si on change d'objet.
  const selectPurpose = (p: Purpose) => { setPurpose(p); setHasSurfaceAttestation(null); setCheckedItems(new Set()); setALaCarteAssainissement(false); setSelectedToConfirm(new Set()); setSelectedOptions(new Set()); advance() }
  const selectPropertyType = (t: PropertyType) => { setPropertyType(t); setHasGas(null); setHasSurfaceAttestation(null); setSizeIndex(null); setCheckedItems(new Set()); setALaCarteAssainissement(false); setSelectedToConfirm(new Set()); setSelectedOptions(new Set()); advance() }
  const selectHasGas = (v: boolean) => { setHasGas(v); advance() }
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
  const toggleToConfirm = (id: string) => {
    setSelectedToConfirm((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleOption = (id: PricedOptionId | 'termites') => {
    setSelectedOptions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Fragment inséré dans "Avez-vous déjà une attestation de surface {X} ?" :
  // "Carrez" en vente d'appartement, "Boutin" en location, "Carrez/Boutin" en
  // mode "à la carte" (pas d'objet vente/location, même libellé double que
  // l'item "surface" de la checklist), "habitable" pour une maison (donne
  // "...de surface habitable", sans doublon).
  const surfaceAttestationFragment = propertyType === 'apartment'
    ? (purpose === 'sale' ? 'Carrez' : purpose === 'rental' ? 'Boutin' : 'Carrez/Boutin')
    : 'habitable'

  const sizeLabels = propertyType === 'apartment' ? APARTMENT_SIZE_LABELS : HOUSE_SIZE_LABELS
  const maxPack = propertyType === 'house' ? 6 : 7

  const diagnostics = (purpose === 'sale' || purpose === 'rental') && propertyType && constructionYear !== null
    ? computeDiagnostics({ purpose, propertyType, constructionYear, communeSlug, hasSurfaceAttestation: !!hasSurfaceAttestation, hasGas: !!hasGas })
    : null

  const houseOver250 = propertyType === 'house' && sizeIndex === HOUSE_QUOTE_ON_REQUEST_INDEX
  // Ensemble effectif des 8 diagnostics sélectionnables "à la carte" : si
  // alaCarteAskSurfaceAttestation est vrai et que la réponse est "Non" (ou pas
  // encore répondue — hasSurfaceAttestation vaut alors null, traité comme
  // "Non" par défaut), le diagnostic de surface s'ajoute automatiquement.
  // Dérivé plutôt que coché pour le client : identique par construction à
  // "mission minimale + Non" qui réutilise directement le pack 2 existant.
  // Le wizard forçant à répondre Oui/Non avant d'atteindre 'result' (pas de
  // saut possible), hasSurfaceAttestation est garanti non-null à ce stade.
  const alaCarteItems = alaCarteAskSurfaceAttestation && !hasSurfaceAttestation
    ? new Set<ALaCarteItemId>([...checkedItems, 'surface'])
    : checkedItems
  // Mode "à la carte" : prix calculé par la source commune
  // lib/property-pricing.ts (1 seul diagnostic coché -> prix unitaire ; 2 ou
  // plus -> prix du pack existant correspondant au nombre coché, peu importe
  // lesquels). L'assainissement n'entre jamais dans ce calcul (ni dans le
  // compte utilisé pour choisir unitaire vs pack), son prix s'additionne à
  // part ci-dessous — comme partout ailleurs dans l'app.
  const alaCarteOverflow = purpose === 'alaCarte' && alaCarteItems.size > maxPack
  const alaCarteQuoteOnRequest = purpose === 'alaCarte' && (houseOver250 || alaCarteOverflow)
  const alaCarteBasePrice = purpose === 'alaCarte' && propertyType && sizeIndex !== null && !alaCarteQuoteOnRequest && alaCarteItems.size > 0
    ? getALaCartePrice(propertyType, Array.from(alaCarteItems), sizeIndex)
    : null
  const alaCarteNoMatch = purpose === 'alaCarte' && !alaCarteQuoteOnRequest && alaCarteItems.size > 0 && alaCarteBasePrice === null
  // Maisons-Alfort : assainissement réservé au service public, ARIA n'y
  // intervient pas — la case reste cochable (texte explicatif affiché) mais
  // n'ajoute aucun prix, cohérent avec buildAssainissementDetail().
  const alaCarteAssainissementPrice = alaCarteAssainissement && communeSlug !== 'maisons-alfort'
    ? (propertyType === 'apartment' ? APARTMENT_ASSAINISSEMENT_PRICE : HOUSE_ASSAINISSEMENT_PRICE)
    : 0
  const alaCarteNothingSelected = alaCarteItems.size === 0 && !alaCarteAssainissement
  const alaCartePrice = purpose === 'alaCarte' && !alaCarteQuoteOnRequest && !alaCarteNoMatch && !alaCarteNothingSelected
    ? (alaCarteBasePrice ?? 0) + alaCarteAssainissementPrice
    : null
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
  // Termites proposé comme option cliquable uniquement quand computeDiagnostics
  // l'a marqué optionalAddOn (aucun arrêté préfectoral recensé) : tarif repris
  // tel quel des grilles à la carte existantes, selon la taille du bien —
  // jamais un tarif inventé pour l'occasion.
  const termitesOptionPrice = (): number | null => {
    if (sizeIndex === null) return null
    if (propertyType === 'apartment') return APARTMENT_TERMITES_UNIT_PRICES[sizeIndex] ?? null
    if (propertyType === 'house') return HOUSE_TERMITES_UNIT_PRICES[sizeIndex] ?? null
    return null
  }
  // Prix d'ajout d'un item "à confirmer" (aujourd'hui, seul Assainissement
  // est cliquable dans cette section) : même grille que l'assainissement "à
  // la carte" ci-dessus, pour ne jamais diverger.
  const toConfirmAddPrice = (id: string): number | null => {
    if (id === 'assainissement') return propertyType === 'apartment' ? APARTMENT_ASSAINISSEMENT_PRICE : HOUSE_ASSAINISSEMENT_PRICE
    return null
  }
  const termitesOptionalAddOn = diagnostics?.toConfirm.find((item) => item.id === 'termites' && item.optionalAddOn) ?? null
  // Total additif : jamais de recalcul du pack, seulement la somme des
  // ajouts volontaires du client par-dessus le prix déjà affiché — garantit
  // qu'un seul et même prix est montré partout (bandeau + encadré + email).
  const extrasPrice = Array.from(selectedToConfirm).reduce((sum, id) => sum + (toConfirmAddPrice(id) ?? 0), 0)
    + Array.from(selectedOptions).reduce((sum, id) => sum + (id === 'termites' ? (termitesOptionPrice() ?? 0) : (optionPrice(id) ?? 0)), 0)
  const totalPriceWithExtras = totalPrice !== null ? totalPrice + extrasPrice : null

  // Badges de résumé du bien, affichés dès qu'une info est connue (pas
  // seulement sur l'écran résultat) et enrichis au fil du parcours. Pas de
  // code postal : l'app ne collecte que le nom de la commune (liste
  // déroulante), aucune donnée de code postal n'existe ailleurs dans le
  // projet — le nom de la commune en tient lieu.
  const communeName = communeSlug === OTHER_COMMUNE_SLUG
    ? 'Autre commune'
    : COMMUNE_RULES.find((c) => c.slug === communeSlug)?.name ?? null
  const purposeBadgeLabel = purpose === 'sale' ? 'Vente' : purpose === 'rental' ? 'Location' : purpose === 'alaCarte' ? 'Diagnostics à la carte' : null
  // "Copropriété" : déductible automatiquement, pas de question dédiée dans
  // l'app (tout appartement y est déjà traité comme une copropriété).
  const summaryBadges = [
    communeName,
    purposeBadgeLabel,
    propertyType === 'apartment' ? 'Appartement' : propertyType === 'house' ? 'Maison' : null,
    propertyType === 'apartment' ? 'Copropriété' : null,
    hasGas === true ? 'Gaz' : hasGas === false ? 'Sans gaz' : null,
    yearIndex !== null ? YEAR_BRACKETS[yearIndex].label : null,
    sizeIndex !== null ? sizeLabels[sizeIndex] : null,
  ].filter((b): b is string => Boolean(b))

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
        .diagassist-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; background: ${LIGHT}; color: ${NAVY}; }
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

            {summaryBadges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {summaryBadges.map((badge) => (
                  <span key={badge} className="diagassist-badge">{badge}</span>
                ))}
              </div>
            )}

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

            {currentScreen === 'gas' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Le bien a-t-il une installation de gaz ?</h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button className="diagassist-choice" onClick={() => selectHasGas(true)}>Oui</button>
                  <button className="diagassist-choice" onClick={() => selectHasGas(false)}>Non</button>
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
                  <label className="diagassist-checkbox-row">
                    <input type="checkbox" checked={alaCarteAssainissement} onChange={() => setALaCarteAssainissement((v) => !v)} />
                    <span>Assainissement</span>
                  </label>
                </div>
                <button className="diagassist-choice" style={{ marginTop: 16, textAlign: 'center' }} disabled={checkedItems.size === 0 && !alaCarteAssainissement} onClick={advance}>
                  Voir mon estimation
                </button>
              </>
            )}

            {currentScreen === 'result' && purpose === 'alaCarte' && propertyType && sizeIndex !== null && (
              <div>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 6px' }}>Votre devis</h1>
                <p style={{ color: '#6f7d90', fontSize: 14, margin: '0 0 22px' }}>
                  {propertyType === 'apartment' ? 'Appartement' : 'Maison'} · {sizeLabels[sizeIndex]} · Diagnostics à la carte
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Diagnostics sélectionnés</div>
                  {ALACARTE_ITEM_IDS.filter((id) => alaCarteItems.has(id)).map((id) => (
                    <DiagnosticCard key={id} id={id} label={alaCarteItemLabel(id, propertyType)} detail={alaCarteItemDetail(id, propertyType)} tag={{ kind: 'included' }} />
                  ))}
                  {alaCarteAssainissement && (
                    <DiagnosticCard id="assainissement" label="Assainissement" detail={buildAssainissementDetail(propertyType, communeSlug)} tag={{ kind: 'added' }} onToggle={() => setALaCarteAssainissement((v) => !v)} />
                  )}
                </div>

                {!alaCarteAssainissement && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>À confirmer</div>
                    <DiagnosticCard id="assainissement" label="Assainissement" detail={buildAssainissementDetail(propertyType, communeSlug)} tag={{ kind: 'toConfirm' }} onToggle={() => setALaCarteAssainissement((v) => !v)} />
                    <p style={{ color: '#9a8355', fontSize: 12, margin: '8px 0 0' }}>Cliquez sur la carte pour l’ajouter à votre demande ; son montant s’ajoute alors au prix ci-dessous.</p>
                  </div>
                )}

                <div style={{ padding: '18px 20px', borderRadius: 16, background: alaCarteQuoteOnRequest || alaCarteNoMatch ? '#fff8e6' : NAVY, border: alaCarteQuoteOnRequest || alaCarteNoMatch ? '1px solid #f0c76a' : 'none', marginBottom: 20 }}>
                  {alaCarteQuoteOnRequest || alaCarteNoMatch ? (
                    <div style={{ color: '#7a5612', fontWeight: 900, fontSize: 17 }}>Nous vous répondons avec un devis personnalisé</div>
                  ) : (
                    <>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 26 }}>{euro(alaCartePrice as number)}</div>
                      <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 700, marginTop: 4 }}>TVA incluse</div>
                    </>
                  )}
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f7fa', border: '1px solid #e2e8ef', color: '#52657a', fontSize: 12, lineHeight: 1.6, marginBottom: 22 }}>
                  Devis établi sur la base des informations déclarées, sous réserve de conformité du bien constatée par ARIA Diagnostics.
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
                    checkedItems: Array.from(alaCarteItems),
                    assainissement: alaCarteAssainissement,
                    priceStatus: alaCarteQuoteOnRequest ? 'quote_on_request' : alaCarteNoMatch ? 'no_match' : 'estimated',
                    totalPrice: alaCartePrice,
                  },
                }} />

                <button className="diagassist-restart" onClick={restart}>Recommencer</button>
              </div>
            )}

            {currentScreen === 'result' && purpose && purpose !== 'alaCarte' && propertyType && sizeIndex !== null && diagnostics && (
              <div>
                <div style={{ background: NAVY, borderRadius: '18px 18px 0 0', margin: '-30px -26px 22px', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#fff', flexShrink: 0, display: 'flex' }}>
                      {propertyType === 'apartment' ? <BuildingIcon /> : <HouseIcon />}
                    </span>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>
                        {purpose === 'rental' ? 'Pack Location' : 'Pack Vente'}
                      </div>
                      <span className="diagassist-badge" style={{ marginTop: 4 }}>{sizeLabels[sizeIndex]}</span>
                    </div>
                  </div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 24, textAlign: 'right' }}>
                    {quoteOnRequest || noPackMatch ? 'Sur devis' : euro(totalPriceWithExtras as number)}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Diagnostics obligatoires</div>
                  {diagnostics.mandatory.map((item) => (
                    <DiagnosticCard key={item.id} id={item.id} label={item.label} detail={item.detail} tag={{ kind: 'included' }} />
                  ))}
                </div>

                {diagnostics.surfaceAttestationNote && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f9fd', border: '1px solid #cbddea', color: '#315a48', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                    {diagnostics.surfaceAttestationNote}
                  </div>
                )}

                {diagnostics.toConfirm.filter((item) => !item.optionalAddOn).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>À confirmer</div>
                    {diagnostics.toConfirm.filter((item) => !item.optionalAddOn).map((item) => {
                      const addPrice = toConfirmAddPrice(item.id)
                      const added = selectedToConfirm.has(item.id)
                      return (
                        <DiagnosticCard
                          key={item.id}
                          id={item.id}
                          label={item.label}
                          detail={item.detail}
                          tag={added ? { kind: 'added' } : { kind: 'toConfirm' }}
                          onToggle={addPrice !== null ? () => toggleToConfirm(item.id) : undefined}
                        />
                      )
                    })}
                    <p style={{ color: '#9a8355', fontSize: 12, margin: '8px 0 0' }}>Cliquez sur une carte pour l’ajouter à votre demande ; son montant s’ajoute alors au prix ci-dessous.</p>
                  </div>
                )}

                {(diagnostics.options.length > 0 || termitesOptionalAddOn) && !quoteOnRequest && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Options liées à votre situation</div>
                    {diagnostics.options.map((option) => {
                      const added = selectedOptions.has(option.id)
                      return (
                        <DiagnosticCard
                          key={option.id}
                          id={option.id}
                          label={option.label}
                          detail={OPTION_DETAIL[option.id]}
                          tag={added ? { kind: 'added' } : { kind: 'option', price: optionPrice(option.id) }}
                          onToggle={() => toggleOption(option.id)}
                        />
                      )
                    })}
                    {termitesOptionalAddOn && (
                      <DiagnosticCard
                        id="termites"
                        label={termitesOptionalAddOn.label}
                        detail={termitesOptionalAddOn.detail}
                        tag={selectedOptions.has('termites') ? { kind: 'added' } : { kind: 'option', price: termitesOptionPrice() }}
                        onToggle={() => toggleOption('termites')}
                      />
                    )}
                    <p style={{ color: '#6f7d90', fontSize: 12, margin: '8px 0 0' }}>Cliquez sur une carte pour l’ajouter à votre demande ; son montant s’ajoute alors au prix ci-dessous.</p>
                  </div>
                )}

                <div style={{ padding: '18px 20px', borderRadius: 16, background: quoteOnRequest || noPackMatch ? '#fff8e6' : NAVY, border: quoteOnRequest || noPackMatch ? '1px solid #f0c76a' : 'none', marginBottom: 20 }}>
                  {quoteOnRequest || noPackMatch ? (
                    <div style={{ color: '#7a5612', fontWeight: 900, fontSize: 17 }}>Nous vous répondons avec un devis personnalisé</div>
                  ) : (
                    <>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 26 }}>{euro(totalPriceWithExtras as number)}</div>
                      <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 700, marginTop: 4 }}>TVA incluse</div>
                    </>
                  )}
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f7fa', border: '1px solid #e2e8ef', color: '#52657a', fontSize: 12, lineHeight: 1.6, marginBottom: 22 }}>
                  Devis établi sur la base des informations déclarées, sous réserve de conformité du bien constatée par ARIA Diagnostics.
                </div>

                <LeadCaptureForm context={{
                  propertyType,
                  purpose,
                  estimatedPrice: totalPriceWithExtras,
                  diagnosticsSummary: {
                    propertyType,
                    sizeLabel: sizeLabels[sizeIndex],
                    purpose,
                    communeSlug,
                    constructionYear,
                    hasGas,
                    mandatory: diagnostics.mandatory.map((item) => ({ id: item.id, label: item.label })),
                    toConfirm: diagnostics.toConfirm.filter((item) => !item.optionalAddOn).map((item) => ({ id: item.id, label: item.label })),
                    options: diagnostics.options.map((option) => ({ id: option.id, label: option.label, price: optionPrice(option.id) })),
                    addedToConfirm: diagnostics.toConfirm.filter((item) => selectedToConfirm.has(item.id)).map((item) => ({ id: item.id, label: item.label })),
                    addedOptions: [
                      ...diagnostics.options.filter((option) => selectedOptions.has(option.id)).map((option) => ({ id: option.id, label: option.label, price: optionPrice(option.id) })),
                      ...(termitesOptionalAddOn && selectedOptions.has('termites') ? [{ id: 'termites', label: termitesOptionalAddOn.label, price: termitesOptionPrice() }] : []),
                    ],
                    priceStatus: quoteOnRequest ? 'quote_on_request' : noPackMatch ? 'no_match' : 'estimated',
                    totalPrice: totalPriceWithExtras,
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
