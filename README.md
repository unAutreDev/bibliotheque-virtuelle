# Bibliothèque Virtuelle

Application pour suivre mes lectures : livres, BD et mangas. C'est une PWA : elle s'utilise dans le navigateur
et s'installe sur l'écran d'accueil du téléphone comme une application, avec fonctionnement hors ligne.

## Fonctionnalités

- Ajouter, modifier et supprimer une lecture (type, titre, série et tome, auteurs, date, résumé, ISBN, lien de couverture)
- Couverture par défaut selon le type quand il n'y a pas d'image
- Bibliothèque en grille ou en liste, filtre par type, recherche par titre, auteur ou série (sans tenir compte des accents)
- Regroupement par série (bouton « Séries ») : tomes triés par numéro, étiquette « Terminé » quand tous les tomes
  sont lus, sinon « En cours », et filtre sur les séries terminées ou en cours
- Genres (un ou plusieurs : Science-fiction, Fantasy… ou saisie libre), proposés depuis les catégories trouvées en ligne,
  filtrables dans la feuille « Filtres » et inclus dans la recherche et les exports
- Fiche détaillée avec note sur 5 (en cœurs), statut (à lire, en cours, lu, abandonné) et avis
- Export CSV (Excel) et JSON depuis les réglages
- Recherche en ligne par titre, auteur ou ISBN (Google Books, Open Library, et AniList pour les mangas) :
  on choisit le bon résultat et la fiche se remplit (couverture, auteurs, date, résumé, ISBN, tome)
- Bouton « Chercher une couverture en ligne » pour une lecture saisie à la main
- Bouton « Lire le code-barres au dos » sur le champ ISBN : remplit l'ISBN, puis les champs vides via la recherche en ligne
- Suggestions à toucher sous chaque champ, tirées du texte lu sur la photo et des résultats en ligne
- Reconnaissance par photo : lecture du code-barres ISBN au dos, sinon du titre sur la couverture (Tesseract,
  hors CDN : fichiers servis depuis `public/ocr`, copiés au build), puis recherche en ligne automatique
- Photo de la couverture avec l'appareil photo du téléphone (réduite et stockée sur l'appareil), depuis le formulaire ou la fiche

Les données sont stockées sur l'appareil (IndexedDB) et, une fois connecté, synchronisées entre appareils via Supabase.

## Synchronisation (Supabase)

1. Dans le projet Supabase : SQL Editor → coller `docs/supabase.sql` → Run.
2. Authentication → Sign In / Providers → Email : désactiver « Confirm email » (un seul utilisateur).
3. Renseigner l'URL du projet et la clé publique (anon / publishable) dans `src/config.ts`.
4. Dans l'app : Réglages → Créer mon compte, puis Se connecter avec le même compte sur chaque appareil.

Fonctionnement : chaque lecture a un identifiant `uid` commun à tous les appareils. La synchro récupère ce qui
est arrivé sur le serveur depuis la dernière fois (`synced_at`, heure serveur), puis envoie les modifications et
suppressions locales. En cas de conflit, la modification la plus récente (`updated_at`) l'emporte. Elle se lance à
l'ouverture, au retour sur l'app, au retour du réseau et après chaque modification.

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
npm run preview  # sert le build localement
```

Stack : React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, zxing-wasm (code-barres), tesseract.js (texte).

## Déploiement

Chaque push sur `main` publie l'app sur GitHub Pages via `.github/workflows/deploy.yml`
(activer une fois : Settings → Pages → Source : GitHub Actions).

## Feuille de route

1. ✅ MVP : bibliothèque locale, fiche, note, recherche, export
2. ✅ Recherche automatique avec couverture et infos pré-remplies
3. Filtres et tri avancés, regroupement par série
4. ✅ Code-barres ISBN et titre lus sur photo, photo de couverture
5. Bonus : statistiques, AniList pour les mangas, mode sombre
