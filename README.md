# Espace ARIA

Application interne ARIA Diagnostics, construite avec Next.js et Supabase.

## Première version
- connexion par e-mail / mot de passe Supabase Auth
- tableau de bord responsive
- liste des dossiers
- fiche dossier et lecture des devis
- protections des données assurées côté Supabase par les politiques RLS déjà mises en place

## Variables Supabase
Créer un fichier `.env.local` à partir de `.env.example` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://hxvrzbelzvcgnwaomzsn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLISHABLE
```

Ne jamais utiliser de `service_role` ou de clé secrète dans le frontend.

## Lancement local
```bash
npm install
npm run dev
```

## Déploiement
Le projet est prévu pour être déployé sur Vercel après ajout des variables d'environnement Supabase.
