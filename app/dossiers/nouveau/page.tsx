'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

type ClientAccount = {
  id: string
  company_name: string | null
  first_name: string | null
  last_name: string | null
  account_type: string | null
}

const accountLabel = (account: ClientAccount) =>
  account.company_name || [account.first_name, account.last_name].filter(Boolean).join(' ') || 'Compte sans nom'

type FormState = {
  account_id: string
  dossier_name: string
  purpose: string
  property_type: 'apartment' | 'house'
  property_address: string
  contact_name: string
  contact_phone: string
  contact_emails: string
  diagnostics: string[]
}

const diagnosticChoices = [
  'DPE',
  'Amiante',
  'Électricité',
  'Gaz',
  'Plomb / CREP',
  'Termites',
  'Loi Carrez',
  'Loi Boutin',
  'ERP',
  'Assainissement',
  'Attestation de mesurage',
]

const normalizeEmails = (value: string) =>
  value.split(/[;,\s]+/).map((email) => email.trim()).filter(Boolean)

const parseAddressParts = (address: string) => {
  const match = address.match(/(\d{5})\s+(.+)$/)
  return match ? { postalCode: match[1], city: match[2].trim() } : { postalCode: null, city: null }
}

export default function NewDossierPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<ClientAccount[]>([])
  const [form, setForm] = useState<FormState>({
    account_id: '',
    dossier_name: '',
    purpose: 'sale',
    property_type: 'house',
    property_address: '',
    contact_name: '',
    contact_phone: '',
    contact_emails: '',
    diagnostics: [],
  })

  useEffect(() => {
    void (async () => {
      const { data, error: accountsError } = await supabase
        .from('client_accounts')
        .select('id, company_name, first_name, last_name, account_type')
        .eq('active', true)
      if (accountsError) {
        setError(accountsError.message)
        return
      }
      const sorted = [...(data || [])].sort((a, b) => accountLabel(a).localeCompare(accountLabel(b), 'fr'))
      setAccounts(sorted)
    })()
  }, [])

  const setField = (field: keyof Omit<FormState, 'diagnostics'>, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const toggleDiagnostic = (diagnostic: string) =>
    setForm((current) => ({
      ...current,
      diagnostics: current.diagnostics.includes(diagnostic)
        ? current.diagnostics.filter((value) => value !== diagnostic)
        : [...current.diagnostics, diagnostic],
    }))

  const save = async () => {
    setError('')
    const emails = normalizeEmails(form.contact_emails)

    if (!form.account_id) {
      setError('Choisis le compte client rattaché à ce dossier.')
      return
    }

    if (!form.dossier_name.trim() || !form.property_address.trim() || !form.contact_name.trim()) {
      setError('Renseigne le nom du dossier, l’adresse du bien et le donneur d’ordre.')
      return
    }

    if (emails.some((email) => !/^\S+@\S+\.\S+$/.test(email))) {
      setError('Vérifie les adresses e-mail saisies.')
      return
    }

    setSaving(true)
    const { data: propertySource, error: propertySourceError } = await supabase
      .from('properties')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (propertySourceError || !propertySource) {
      setError(propertySourceError?.message || 'Impossible de préparer la fiche du bien.')
      setSaving(false)
      return
    }

    const propertyColumns = new Set(Object.keys(propertySource))
    const propertyPayload: Record<string, unknown> = { account_id: form.account_id }
    const assignKnown = (names: string[], value: unknown) => {
      names.forEach((name) => {
        if (propertyColumns.has(name)) propertyPayload[name] = value
      })
    }
    const trimmedAddress = form.property_address.trim()
    const { postalCode, city } = parseAddressParts(trimmedAddress)
    assignKnown(['address', 'property_address', 'full_address', 'address_line1', 'street_address'], trimmedAddress)
    if (city) assignKnown(['city', 'town'], city)
    if (postalCode) assignKnown(['postal_code', 'zip_code', 'postcode'], postalCode)
    assignKnown(['property_type', 'type'], form.property_type)
    assignKnown(['name', 'title', 'property_name'], form.dossier_name.trim())

    const { data: { user } } = await supabase.auth.getUser()
    const identityColumns = ['created_by', 'user_id', 'owner_id']
    identityColumns.forEach((name) => {
      if (propertyColumns.has(name) && user?.id) propertyPayload[name] = user.id
    })

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert(propertyPayload)
      .select('id')
      .single()

    if (propertyError || !property) {
      setError(propertyError?.message || 'Impossible de créer la fiche du bien.')
      setSaving(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('dossiers')
      .insert({
        account_id: form.account_id,
        property_id: property.id,
        dossier_name: form.dossier_name.trim(),
        status: 'draft',
        purpose: form.purpose || null,
        property_address: form.property_address.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim() || null,
        contact_email: emails.join(', ') || null,
        diagnostics: form.diagnostics.length ? form.diagnostics : null,
      })
      .select('id')
      .single()

    if (insertError || !data) {
      setError(insertError?.message || 'Impossible de créer le dossier.')
      setSaving(false)
      return
    }

    router.push(`/devis?dossier=${data.id}`)
  }

  return (
    <AppShell active="dossiers">
      <main className="page" style={{ maxWidth: 980 }}>
        <Link href="/dossiers" className="back">← Retour aux dossiers</Link>
        <div className="hero-row" style={{ marginTop: 14 }}>
          <div>
            <div className="eyebrow">DOSSIER</div>
            <h1>Nouveau dossier</h1>
            <p>Crée le donneur d’ordre et le bien avant de préparer le devis.</p>
          </div>
        </div>

        <section className="card" style={{ padding: 22 }}>
          {error && <div className="error">{error}</div>}
          <div className="edit-grid">
            <label className="edit-field wide">
              <span>Compte client *</span>
              <select value={form.account_id} onChange={(event) => setField('account_id', event.target.value)}>
                <option value="">Choisir un compte…</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{accountLabel(account)}</option>
                ))}
              </select>
            </label>
            <label className="edit-field">
              <span>Nom du dossier *</span>
              <input value={form.dossier_name} onChange={(event) => setField('dossier_name', event.target.value)} placeholder="Ex. Succession Dupont" />
            </label>
            <label className="edit-field">
              <span>Objet *</span>
              <select value={form.purpose} onChange={(event) => setField('purpose', event.target.value)}>
                <option value="sale">Vente</option>
                <option value="rental">Location</option>
                <option value="works">Travaux</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="edit-field">
              <span>Type de bien *</span>
              <select value={form.property_type} onChange={(event) => setField('property_type', event.target.value)}>
                <option value="house">Maison</option>
                <option value="apartment">Appartement</option>
              </select>
            </label>
            <label className="edit-field wide">
              <span>Adresse complète du bien *</span>
              <input value={form.property_address} onChange={(event) => setField('property_address', event.target.value)} placeholder="Numéro, rue, code postal et ville" />
            </label>
            <label className="edit-field">
              <span>Donneur d’ordre *</span>
              <input value={form.contact_name} onChange={(event) => setField('contact_name', event.target.value)} placeholder="Nom, société ou succession" />
            </label>
            <label className="edit-field">
              <span>Téléphone</span>
              <input value={form.contact_phone} onChange={(event) => setField('contact_phone', event.target.value)} inputMode="tel" />
            </label>
            <label className="edit-field wide">
              <span>E-mail(s) — séparer plusieurs adresses par une virgule</span>
              <input type="email" multiple value={form.contact_emails} onChange={(event) => setField('contact_emails', event.target.value)} placeholder="client@exemple.fr, second@exemple.fr" />
            </label>
            <div className="edit-field wide">
              <span>Diagnostics commandés</span>
              <div className="diagnostic-grid" style={{ marginTop: 8 }}>
                {diagnosticChoices.map((diagnostic) => (
                  <label key={diagnostic} className="diagnostic-chip" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.diagnostics.includes(diagnostic)} onChange={() => toggleDiagnostic(diagnostic)} />
                    <b>{diagnostic}</b>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="edit-modal-actions">
            <Link className="ghost-btn" href="/dossiers">Annuler</Link>
            <button className="action-btn primary-action" disabled={saving} onClick={save}>
              {saving ? 'Création…' : 'Créer et préparer le devis'}
            </button>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
