'use client'

import { useEffect } from 'react'

const TRUSTINDEX_SRC = 'https://cdn.trustindex.io/loader.js?b559cd170fb0098f50767e4f916'

// Le script Trustindex insère son widget (.ti-widget) et sa feuille de
// style (style.scss-content) directement dans <body>, hors de l'arbre
// React — une navigation côté client (next/link) ne les retire donc
// jamais. On gère nous-mêmes le cycle de vie du script pour qu'il
// disparaisse quand cette page se démonte, et réapparaisse si on y
// revient.
export function TrustindexWidget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = TRUSTINDEX_SRC
    script.defer = true
    document.body.appendChild(script)
    return () => {
      script.remove()
      document.querySelectorAll('.ti-widget, style.scss-content').forEach((el) => el.remove())
    }
  }, [])

  return <div id="avis-clients" style={{ margin: '30px 0', maxHeight: '420px', overflowY: 'auto', borderRadius: '12px' }} />
}
