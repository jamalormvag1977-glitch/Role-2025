# 🚀 Guide de Déploiement - Dashboard Rôle 2025

## Réponse à votre question : Vercel + taille des données client

### ✅ Le problème de taille NE se posera PAS sur Vercel grâce à :

1. **API paginée** (`/api/clients`) : Les clients sont chargés par pages de 100, pas en une seule fois
2. **Pas de rows bruts** dans `/api/data` : Seules les agrégations sont envoyées (pas les 11 322 lignes individuelles)
3. **Top 200 clients** seulement dans la réponse principale
4. **Taille estimée** : ~500 Ko pour `/api/data` (bien en dessous de la limite Vercel de 4.5 Mo)
5. **Vercel Blob** pour le stockage du fichier Excel uploadé (pas de système de fichiers local)

### ⚠️ Points d'attention Vercel Hobby (gratuit) :
- Timeout fonction : 10s (suffisant, parsing < 3s)
- Limite de réponse : 4.5 Mo ✅ (on est bien en dessous)
- 100 déploiements/jour ✅
- 100 Go de bande passante/mois ✅

---

## Étapes de déploiement

### 1. Pousser le code sur GitHub

Ouvrez un terminal sur votre PC et exécutez :

```bash
# Cloner votre dépôt GitHub
git clone https://github.com/jamalormvag1977-glitch/Role-2025.git
cd Role-2025

# Télécharger les fichiers du projet depuis l'éditeur Z.ai
# (Utilisez le bouton "Download" ou copiez les fichiers manuellement)

# Ou utilisez git directement si vous avez configuré les fichiers :
git add .
git commit -m "Dashboard Rôle 2025 - prêt pour Vercel"
git push origin main
```

### 2. Créer un store Vercel Blob

1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **Storage** → **Create Database** → **Blob**
3. Donnez un nom (ex: `dashboard-blob`)
4. Notez le token `BLOB_READ_WRITE_TOKEN` généré

### 3. Déployer sur Vercel

1. Allez sur https://vercel.com/new
2. Importez le dépôt `jamalormvag1977-glitch/Role-2025`
3. Configurez :
   - **Framework Preset** : Next.js
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`
4. Ajoutez les variables d'environnement :
   - `BLOB_READ_WRITE_TOKEN` = (votre token du store Blob)
5. Cliquez **Deploy**

### 4. Uploader le fichier Excel

Après le premier déploiement :
1. Ouvrez votre dashboard déployé
2. Cliquez sur **"Charger Excel"** dans la barre latérale
3. Uploadez votre fichier `Rôle Defintif Exercice 2025 -18-3-2026.xlsx`
4. Le fichier sera stocké dans Vercel Blob (persistant)

---

## Structure du projet

```
Role-2025/
├── data/
│   └── data.xlsx              # Fichier Excel initial (bundlé dans le repo)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard principal (8 sections)
│   │   ├── layout.tsx         # Layout Next.js
│   │   ├── globals.css        # Styles Tailwind
│   │   └── api/
│   │       ├── data/route.ts  # API données agrégées
│   │       ├── clients/route.ts # API clients paginée
│   │       └── upload/route.ts  # API upload Excel
│   ├── components/ui/         # Composants shadcn/ui
│   └── lib/
│       ├── parse-excel.ts     # Parsing Excel (Vercel Blob + local)
│       ├── cache.ts           # Invalidation cache
│       └── utils.ts           # Utilitaires
├── next.config.ts             # Config Next.js (optimisée Vercel)
├── vercel.json                # Config Vercel (timeouts, headers)
├── package.json               # Dépendances
├── tailwind.config.ts         # Config Tailwind
├── tsconfig.json              # Config TypeScript
├── .env.example               # Variables d'environnement requises
└── .gitignore                 # Fichiers ignorés par Git
```

## Architecture de données

| Endpoint | Description | Taille approx. |
|----------|-------------|----------------|
| `/api/data` | Agrégations + filtres | ~500 Ko |
| `/api/clients?page=1&limit=100` | Clients paginés | ~50 Ko/page |
| `/api/upload` | Upload Excel → Vercel Blob | N/A |

## Fonctionnalités du Dashboard

- 📊 **8 sections** : Vue d'ensemble, AGR, Culture, Secteur, Source, Finance, Client, CDA
- 🔍 **Filtres** : AGR, Secteur, Source, Culture, Semestre, Campagne
- 📋 **Tableaux détaillés** dans chaque section
- 📤 **Upload Excel** avec stockage Vercel Blob
- 📱 **Responsive** avec barre latérale rétractable
