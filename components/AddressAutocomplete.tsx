'use client'

import { useEffect, useRef, useState } from 'react'

// Aide à la saisie d'adresse : Base Adresse Nationale via la Géoplateforme
// IGN (service public gratuit, sans clé). L'adresse reste modifiable à la
// main si le service ne répond pas ou si l'adresse est introuvable.
type Suggestion = { label: string; postcode: string; city: string }

const ENDPOINT = 'https://data.geopf.fr/geocodage/search'

export function AddressAutocomplete({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Suggestion | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNext = useRef(false)

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return }
    if (timer.current) clearTimeout(timer.current)
    const q = value.trim()
    if (q.length < 4) { setSuggestions([]); return }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${ENDPOINT}?q=${encodeURIComponent(q)}&autocomplete=1&limit=5`)
        if (!res.ok) return
        const json = await res.json()
        const items: Suggestion[] = (json?.features || []).map((f: any) => ({
          label: String(f?.properties?.label || ''),
          postcode: String(f?.properties?.postcode || ''),
          city: String(f?.properties?.city || ''),
        })).filter((s: Suggestion) => s.label)
        setSuggestions(items)
        setOpen(items.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value])

  const choose = (s: Suggestion) => {
    skipNext.current = true
    setPicked(s)
    onChange(s.label)
    setOpen(false)
  }

  const postalMatch = value.match(/\b(\d{5})\s+([^,\d][^,]*)$/)

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => { setPicked(null); onChange(e.target.value) }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ width: '100%' }}
      />
      {open && (
        <ul role="listbox" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', margin: '4px 0 0', padding: 4, listStyle: 'none', background: '#fff', border: '1px solid #cbddea', borderRadius: 10, boxShadow: '0 8px 24px rgba(6,43,89,.12)' }}>
          {suggestions.map((s) => (
            <li key={s.label}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 14 }}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ fontSize: 12, marginTop: 4, color: picked || postalMatch ? '#176b35' : '#7a5612' }}>
        {picked
          ? `Code postal ${picked.postcode} · ${picked.city}`
          : postalMatch
            ? `Code postal ${postalMatch[1]} · ${postalMatch[2].trim()}`
            : 'Commencez à taper l’adresse puis choisissez-la dans la liste (code postal et ville ajoutés automatiquement).'}
      </div>
    </div>
  )
}
