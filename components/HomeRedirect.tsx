'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Accueil : un utilisateur déjà connecté (app installée sur l'écran
// d'accueil, start_url "/") part directement dans son espace — tableau de
// bord pour l'équipe ARIA, Mon espace pour les pros. ?apercu=1 permet de
// voir la page publique en restant connecté.
export function HomeRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('apercu')) return
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session || cancelled) return
      const { data: isStaff } = await supabase.rpc('is_staff_or_admin')
      if (!cancelled) router.replace(isStaff ? '/dashboard' : '/mon-espace')
    })
    return () => { cancelled = true }
  }, [router])
  return null
}
