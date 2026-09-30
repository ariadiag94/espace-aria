'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Rôle interne de l'utilisateur connecté : 'admin' (Mani), 'staff'
// (assistante / stagiaire, migration 030) ou 'other'. null pendant le
// chargement. Mis en cache pour la session de la page.
export type InternalRole = 'admin' | 'staff' | 'other'
let cached: Promise<InternalRole> | null = null

export const fetchInternalRole = () => {
  cached ??= (async () => {
    const [{ data: admin }, { data: internal }] = await Promise.all([supabase.rpc('is_admin'), supabase.rpc('is_internal')])
    return admin ? 'admin' : internal ? 'staff' : 'other'
  })().catch(() => 'other' as InternalRole)
  return cached
}

export function useInternalRole() {
  const [role, setRole] = useState<InternalRole | null>(null)
  useEffect(() => { let alive = true; void fetchInternalRole().then((r) => { if (alive) setRole(r) }); return () => { alive = false } }, [])
  return role
}
