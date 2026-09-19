'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { computeDiagnostics, PricedOptionId } from '@/lib/property-alerts'
import { COMMUNE_RULES, OTHER_COMMUNE_SLUG } from '@/lib/commune-rules'
import {
  APARTMENT_SIZE_LABELS,
  getPackPrice,
  HOUSE_MEASUREMENT_PRICES,
  HOUSE_QUOTE_ON_REQUEST_INDEX,
  HOUSE_SIZE_LABELS,
} from '@/lib/property-pricing'

const NAVY = '#062b59'
const SKY = '#4db3e6'
const LIGHT = '#eef1f5'

const euro = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

type Purpose = 'sale' | 'rental'
type PropertyType = 'apartment' | 'house'
type Heating = 'collective' | 'individual'

const currentYear = new Date().getFullYear()
const YEAR_BRACKETS = [
  { label: 'Avant 1949', year: 1930 },
  { label: '1949 – 1996', year: 1970 },
  { label: `1997 – ${currentYear - 15}`, year: currentYear - 15 },
  { label: `${currentYear - 14} à aujourd’hui`, year: currentYear },
]

type Screen = 'commune' | 'purpose' | 'propertyType' | 'heating' | 'surfaceAttestation' | 'year' | 'size' | 'result'

export default function AssistantPage() {
  const [step, setStep] = useState(0)
  const [communeSlug, setCommuneSlug] = useState<string | null>(null)
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null)
  const [heating, setHeating] = useState<Heating | null>(null)
  const [hasSurfaceAttestation, setHasSurfaceAttestation] = useState<boolean | null>(null)
  const [yearIndex, setYearIndex] = useState<number | null>(null)
  const [sizeIndex, setSizeIndex] = useState<number | null>(null)

  // Parcours dynamique : la commune est demandée en premier. Un appartement
  // est toujours en copropriété (pas de question dédiée) : le chauffage est
  // donc demandé pour tout appartement, vente comme location. La question
  // d'attestation de surface (Carrez / Boutin / surface habitable selon le
  // cas) est posée pour tout bien, une fois le type de bien et l'objet
  // connus, avant le résultat.
  const screens: Screen[] = useMemo(() => {
    const s: Screen[] = ['commune', 'purpose', 'propertyType']
    if (propertyType === 'apartment') {
      s.push('heating')
    }
    s.push('surfaceAttestation', 'year', 'size', 'result')
    return s
  }, [propertyType])

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
  }

  const selectCommune = (slug: string) => { setCommuneSlug(slug); advance() }
  // Le libellé de la question d'attestation dépend de l'objet (Carrez en
  // vente, Boutin en location) : si l'objet change, la réponse précédente
  // ne s'applique plus au bon libellé, donc on la réinitialise.
  const selectPurpose = (p: Purpose) => { setPurpose(p); setHasSurfaceAttestation(null); advance() }
  const selectPropertyType = (t: PropertyType) => { setPropertyType(t); setHeating(null); setHasSurfaceAttestation(null); setSizeIndex(null); advance() }
  const selectHeating = (h: Heating) => { setHeating(h); advance() }
  const selectSurfaceAttestation = (v: boolean) => { setHasSurfaceAttestation(v); advance() }
  const selectYear = (i: number) => { setYearIndex(i); advance() }
  const selectSize = (i: number) => { setSizeIndex(i); advance() }

  // Fragment inséré dans "Avez-vous déjà une attestation de surface {X} ?" :
  // "Carrez" en vente d'appartement, "Boutin" en location, "habitable" pour
  // une maison (donne "...de surface habitable", sans doublon).
  const surfaceAttestationFragment = propertyType === 'apartment'
    ? (purpose === 'sale' ? 'Carrez' : 'Boutin')
    : 'habitable'

  const sizeLabels = propertyType === 'apartment' ? APARTMENT_SIZE_LABELS : HOUSE_SIZE_LABELS
  const maxPack = propertyType === 'house' ? 6 : 7
  const constructionYear = yearIndex !== null ? YEAR_BRACKETS[yearIndex].year : null

  const diagnostics = purpose && propertyType && constructionYear !== null
    ? computeDiagnostics({ purpose, propertyType, constructionYear, communeSlug, hasSurfaceAttestation: !!hasSurfaceAttestation })
    : null

  const houseOver250 = propertyType === 'house' && sizeIndex === HOUSE_QUOTE_ON_REQUEST_INDEX
  const collectiveHeating = propertyType === 'apartment' && heating === 'collective'
  // Nombre de diagnostics obligatoires qui comptent réellement pour choisir
  // le pack (le mesurage maison, quand il est obligatoire, en est exclu :
  // il a son propre tarif par tranche, ajouté séparément au total).
  const packMandatoryCount = diagnostics
    ? diagnostics.mandatory.filter((item) => item.countsTowardPack !== false).length
    : null
  // Un diagnostic obligatoire (ex. termites en commune "entière") peut
  // pousser le nombre de diagnostics obligatoires au-delà de ce que couvre
  // la grille de packs (surtout pour les maisons, dont la grille s'arrête à
  // 6) : on le détecte sur le nombre NON plafonné, pour ne jamais afficher
  // le prix d'un pack à côté qui ne couvre pas tout ce qui est obligatoire.
  const packOverflow = packMandatoryCount !== null && packMandatoryCount > maxPack
  const quoteOnRequest = houseOver250 || collectiveHeating || packOverflow

  const packCount = packMandatoryCount !== null ? Math.max(2, Math.min(maxPack, packMandatoryCount)) : null
  // Prix du pack : -10 % en location par rapport à la vente (même pack, même
  // tranche de taille), calculé par la source commune lib/property-pricing.ts
  // pour que /assistant et /devis ne puissent pas diverger.
  const packPrice = diagnostics && packCount !== null && sizeIndex !== null && propertyType && purpose
    ? getPackPrice(propertyType, packCount, sizeIndex, purpose)
    : null
  // Mesurage maison obligatoire (pas d'attestation de surface fournie) :
  // son tarif par tranche s'ajoute au prix du pack, sans influer sur le
  // choix du pack lui-même (voir packMandatoryCount ci-dessus).
  const houseMeasurementMandatory = diagnostics?.mandatory.some((item) => item.id === 'measurement') ?? false
  const houseMeasurementPrice = houseMeasurementMandatory && sizeIndex !== null ? HOUSE_MEASUREMENT_PRICES[sizeIndex] ?? 0 : 0
  const totalPrice = packPrice !== null ? packPrice + houseMeasurementPrice : null
  // Combinaison sans tarif dans la grille alors qu'aucun cas "sur devis" connu
  // ne s'applique : signalée telle quelle plutôt que d'inventer un prix.
  const noPackMatch = !quoteOnRequest && packPrice === null && diagnostics !== null && sizeIndex !== null

  // Le mesurage maison est la seule option avec un prix, lu depuis
  // HOUSE_SIZE_TIERS (source commune) — aucun prix équivalent n'existe pour
  // l'appartement. Carrez, Boutin et DAPP sont désormais des diagnostics
  // obligatoires sans prix propre, pas des options : "options" ne contient
  // plus jamais d'entrée pour un appartement.
  const optionPrice = (id: PricedOptionId): number | null => {
    if (id === 'measurement' && propertyType === 'house' && sizeIndex !== null) return HOUSE_MEASUREMENT_PRICES[sizeIndex] ?? null
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

            {currentScreen === 'result' && propertyType && sizeIndex !== null && diagnostics && (
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
