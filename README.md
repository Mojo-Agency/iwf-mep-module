# iwf-mep-module

Module « Contact your MEP » de la campagne IWF *The petition no one would sign* (phase 2, Mojo Agency).
Vanilla JS bundlé par Vite en un seul fichier, monté sur la page Webflow `/contact-your-mep`
via un `<script>` jsDelivr épinglé sur un tag git. Dépôt : https://github.com/Mojo-Agency/iwf-mep-module
(public, requis par jsDelivr). Le brief de mission reste hors dépôt.

## Livrer une nouvelle version

```bash
npm test                                  # build + smoke, dist/ et data/ sont commités
git commit -am "..." && git tag -a v1.0.1 -m "..." && git push origin main v1.0.1
```

Puis dans Webflow, custom code de la page (before `</body>`) : mettre à jour le tag **et** le hash SRI
(`openssl dgst -sha384 -binary dist/mep-module.min.js | openssl base64 -A`), puis publier.

## Commandes

```bash
npm install
npm run build:data          # data/meps.csv -> data/meps.json + reports/csv-quality-<date>.md
npm run build:data:strict   # idem, les avertissements deviennent bloquants
npm run dev                 # harness local http://localhost:5173 (index.html mocke la page Webflow)
npm run build               # prebuild = build:data, puis dist/mep-module.min.js (IIFE, CSS inliné)
npm run smoke               # parcours complet dans jsdom sur dist/ (47 vérifications, sans navigateur)
npm test                    # build + smoke
```

Node 20 ou 21 : jsdom est épinglé en 25.x (les versions 27+ exigent Node 22).

## Module (src/)

- `main.js` : montage, chargement, navigation entre étapes, synchro du stepper natif Webflow.
- `steps/step1-find.js` : pays, recherche (nom + parti + groupe, sans diacritiques, debounce 150 ms),
  grille 3/2/1, fiches, bouton bulk « Contact all {country} representatives », état vide.
- `steps/step2-write.js` : barre « Writing to », 3 modèles, objet et corps éditables, compteur > 1500 caractères.
- `steps/step3-send.js` : aperçu, `mailto:` (CRLF), copier message / adresse(s), mode bulk en BCC
  (le bouton « Open in my email app » est masqué si le mailto dépasse 2000 caractères).
- `templates.js` : toute la copy du parcours et les 3 modèles. **« Short and direct » et « Personal »
  sont des brouillons** à remplacer par les textes validés par Mojo/IWF.
- `analytics.js` : `dataLayer.push({ event: "mep_contact_click", country })`, no-op sans dataLayer.

## Données

- `data/meps.csv` : export Mojo, **jamais édité à la main**. Remplacer le fichier à chaque nouvelle version.
- `data/meps.json` : généré, commité, servi par jsDelivr au même tag que le script.
- `scripts/build-data.mjs` : parse, mappe alpha-3 vers alpha-2, normalise le vote, valide chaque ligne.
  Échec bruyant (exit 1, pas de JSON) si une ligne est en erreur bloquante ; le rapport Markdown
  liste les lignes à corriger et les points à trancher avec Mojo.

Schéma du JSON :

```json
{
  "generated": "2026-09-10",
  "source": { "file": "meps.csv", "rows": 719, "voteUrl": "https://howtheyvote.eu/votes/195775" },
  "voteDate": "2026-07-09",
  "voteMeaning": "Position on the motion to REJECT ... 'against' = for child protection",
  "voteLabels": { "for": "...", "against": "...", "abstained": "Abstained", "absent": "Did not vote" },
  "groups": { "EPP": "European People's Party", "S&D": "..." },
  "photoBase": "https://www.europarl.europa.eu/mepphoto/{id}.jpg",
  "profileBase": "https://www.europarl.europa.eu/meps/en/{id}",
  "meps": [
    { "id": "256810", "name": "Mika AALTOLA", "first": "Mika", "last": "AALTOLA",
      "country": "FI", "party": "", "group": "EPP",
      "email": "mika.aaltola@europarl.europa.eu", "vote": "against" }
  ]
}
```

`photo`, `profile` et `voteUrl` ne sont présents sur un député que s'ils s'écartent des gabarits ;
`src/data.js` (`hydrate`) les reconstruit côté client.

**Sens de `vote`** : position sur la motion de rejet, telle que publiée par HowTheyVote.
`against` = a voté contre le rejet = a voté pour protéger les enfants (bande verte).
`for` = a voté pour le rejet (bande rouge). Les libellés affichés viennent de `voteLabels`.

## Intégration Webflow

- Page `/contact-your-mep` (id `6aa269003994a3cbea6f6f1e`) : navbar variante dark, hero natif avec
  stepper `[data-mep-step="1|2|3"]` (classes `is-active` / `is-done` et `aria-current` gérées par le module),
  section module avec `<div id="mep-module"></div>`, bloc d'attribution HowTheyVote.
- Custom code de la page (before `</body>`), à activer une fois le repo publié et taggé :
  `<script src="https://cdn.jsdelivr.net/gh/Mojo-Agency/iwf-mep-module@vX.Y.Z/dist/mep-module.min.js" defer></script>`
- Le module lit `meps.json` à `../data/meps.json` par rapport à l'URL du script (même tag).
  Surcharges possibles : attribut `data-src` sur `#mep-module` ou `window.MEP_MODULE_DATA_URL`.
- **Jamais `@latest` ni une branche : toujours un tag.**

## Contraintes DPIA

Aucun stockage (ni localStorage, ni sessionStorage, ni cookie), aucun état dans l'URL,
analytics limité à `dataLayer.push({ event: "mep_contact_click", country })`.
Voir la section 5 du brief.

## Sources

`sources/` contient le CSV, les exports PDF du design (ignorés par git) et `sources/design-copy/`
(texte extrait des PDF, versionné, pour la copy exacte des écrans).
