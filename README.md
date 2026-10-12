# Bibliothèque Virtuelle

Application pour suivre mes lectures : livres, BD et mangas. C'est une PWA : elle s'utilise dans le navigateur
et s'installe sur l'écran d'accueil du téléphone comme une application, avec fonctionnement hors ligne.

## Fonctionnalités

- Ajouter, modifier et supprimer une lecture (type, titre, série et tome, auteurs, date, résumé, ISBN, lien de couverture)
- Couverture par défaut selon le type quand il n'y a pas d'image
- Bibliothèque en grille ou en liste, filtre par type, recherche par titre, auteur ou série (sans tenir compte des accents)
- Fiche détaillée avec note sur 5, statut (à lire, en cours, lu, abandonné) et avis
- Export CSV (Excel) et JSON depuis les réglages
- Recherche en ligne par titre, auteur ou ISBN (Google Books, Open Library, et AniList pour les mangas) :
  on choisit le bon résultat et la fiche se remplit (couverture, auteurs, date, résumé, ISBN, tome)
- Bouton « Chercher une couverture en ligne » pour une lecture saisie à la main

Les données sont stockées sur l'appareil (IndexedDB). Pense à exporter régulièrement.

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
npm run preview  # sert le build localement
```

Stack : React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa.

## Déploiement

Chaque push sur `main` publie l'app sur GitHub Pages via `.github/workflows/deploy.yml`
(activer une fois : Settings → Pages → Source : GitHub Actions).

## Feuille de route

1. ✅ MVP : bibliothèque locale, fiche, note, recherche, export
2. ✅ Recherche automatique avec couverture et infos pré-remplies
3. Filtres et tri avancés, regroupement par série
4. Scan du code-barres ISBN, photo de couverture
5. Bonus : statistiques, AniList pour les mangas, mode sombre
