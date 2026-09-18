'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { computeDiagnostics, PricedOptionId } from '@/lib/property-alerts'
import {
  APARTMENT_PACK_PRICES,
  APARTMENT_SIZE_LABELS,
  HOUSE_MEASUREMENT_PRICES,
  HOUSE_PACK_PRICES,
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

type Screen = 'purpose' | 'propertyType' | 'coownership' | 'heating' | 'year' | 'size' | 'result'

export default function AssistantPage() {
  const [step, setStep] = useState(0)
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null)
  const [coowned, setCoowned] = useState<boolean | null>(null)
  const [heating, setHeating] = useState<Heating | null>(null)
  const [yearIndex, setYearIndex] = useState<number | null>(null)
  const [sizeIndex, setSizeIndex] = useState<number | null>(null)

  // Parcours dynamique : la copropriété n'est demandée que pour un
  // appartement, et le chauffage que si le bien est en copropriété.
  const screens: Screen[] = useMemo(() => {
    const s: Screen[] = ['purpose', 'propertyType']
    if (propertyType === 'apartment') {
      s.push('coownership')
      if (coowned) s.push('heating')
    }
    s.push('year', 'size', 'result')
    return s
  }, [propertyType, coowned])

  const currentScreen = screens[Math.min(step, screens.length - 1)]

  const goBack = () => setStep((s) => Math.max(0, s - 1))
  const advance = () => setStep((s) => s + 1)
  const restart = () => {
    setStep(0)
    setPurpose(null)
    setPropertyType(null)
    setCoowned(null)
    setHeating(null)
    setYearIndex(null)
    setSizeIndex(null)
  }

  const selectPurpose = (p: Purpose) => { setPurpose(p); advance() }
  const selectPropertyType = (t: PropertyType) => { setPropertyType(t); setCoowned(null); setHeating(null); setSizeIndex(null); advance() }
  const selectCoowned = (v: boolean) => { setCoowned(v); if (!v) setHeating(null); advance() }
  const selectHeating = (h: Heating) => { setHeating(h); advance() }
  const selectYear = (i: number) => { setYearIndex(i); advance() }
  const selectSize = (i: number) => { setSizeIndex(i); advance() }

  const sizeLabels = propertyType === 'apartment' ? APARTMENT_SIZE_LABELS : HOUSE_SIZE_LABELS
  const maxPack = propertyType === 'house' ? 6 : 7
  const constructionYear = yearIndex !== null ? YEAR_BRACKETS[yearIndex].year : null

  const diagnostics = purpose && propertyType && constructionYear !== null
    ? computeDiagnostics({ purpose, propertyType, constructionYear, isCoowned: !!coowned })
    : null

  const houseOver250 = propertyType === 'house' && sizeIndex === HOUSE_QUOTE_ON_REQUEST_INDEX
  const collectiveHeating = propertyType === 'apartment' && !!coowned && heating === 'collective'
  const quoteOnRequest = houseOver250 || collectiveHeating

  const packCount = diagnostics ? Math.max(2, Math.min(maxPack, diagnostics.mandatory.length)) : null
  const packPrice = diagnostics && packCount !== null && sizeIndex !== null
    ? (propertyType === 'apartment' ? APARTMENT_PACK_PRICES : HOUSE_PACK_PRICES)[packCount]?.[sizeIndex] ?? null
    : null
  // Combinaison sans tarif dans la grille alors qu'aucun cas "sur devis" connu
  // ne s'applique : signalée telle quelle plutôt que d'inventer un prix.
  const noPackMatch = !quoteOnRequest && packPrice === null && diagnostics !== null && sizeIndex !== null

  // Carrez, Boutin (appartement) et DAPP n'ont aucun prix dans le moteur
  // existant : "selon devis" plutôt qu'un tarif inventé. Le mesurage maison
  // est le seul avec un prix, lu depuis HOUSE_SIZE_TIERS (source commune).
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

            {currentScreen === 'coownership' && (
              <>
                <h1 style={{ color: NAVY, fontSize: 22, margin: '0 0 20px' }}>Le bien est-il en copropriété ?</h1>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button className="diagassist-choice" onClick={() => selectCoowned(true)}>Oui</button>
                  <button className="diagassist-choice" onClick={() => selectCoowned(false)}>Non</button>
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
                  {propertyType === 'apartment' && coowned ? ' · Copropriété' : ''}
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: NAVY, fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Diagnostics obligatoires</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#315a48', fontSize: 14, lineHeight: 1.6 }}>
                    {diagnostics.mandatory.map((item) => (
                      <li key={item.id}><b>{item.label}</b> — {item.detail}</li>
                    ))}
                  </ul>
                </div>

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
                    <div style={{ color: NAVY, fontWeight: 900, fontSize: 22 }}>À partir de {euro(packPrice as number)} TTC</div>
                  )}
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f5f7fa', border: '1px solid #e2e8ef', color: '#52657a', fontSize: 12, lineHeight: 1.6, marginBottom: 22 }}>
                  Estimation indicative, établie à partir des informations que vous avez déclarées. Elle ne constitue ni un devis ni un engagement. Les diagnostics obligatoires dépendent de la situation réelle du bien et de la réglementation en vigueur : ARIA Diagnostics les confirme après vérification. Le prix définitif peut différer si les informations sont inexactes ou incomplètes (surface, nombre de lots, dépendances, accès, etc.). Aucun devis n’est envoyé avant cette vérification.
                </div>

                <button className="diagassist-restart" onClick={restart}>Recommencer</button>
              </div>
            )}

            {currentScreen !== 'purpose' && currentScreen !== 'result' && (
              <button className="diagassist-back" onClick={goBack}>← Question précédente</button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
