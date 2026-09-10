# Rapport qualité CSV — meps.csv

Généré le 2026-09-10 par `scripts/build-data.mjs` (IWF phase 2, module « Contact your MEP »).

## Résumé

| Indicateur | Valeur |
| --- | --- |
| Lignes de données | 719 (attendu 720) |
| Députés exportés dans le JSON | 719 |
| Erreurs bloquantes | 0 |
| Avertissements | 720 |
| JSON généré | oui — 125.9 Ko brut, 26.0 Ko gzip |

## Erreurs bloquantes

Aucune. Toutes les lignes ont un identifiant unique, un email plausible et unique, une photo en https, un pays et un groupe connus.

## Avertissements

Non bloquants pour la génération, mais à trancher avant la mise en ligne.

- **719 ×** `national_party` · Parti national vide
  Lignes : 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 … (+704)
- **1 ×** `file` · 719 députés dans le CSV, 720 attendus (Parlement 2024-2029)
  Lignes : fichier entier

## Statistiques

### Par position de vote

| Valeur CSV | Enum JSON | Libellé affiché | Députés |
| --- | --- | --- | --- |
| FOR | for | Said no to action against child sexual abuse | 314 |
| AGAINST | against | Voted to fight sexual abuse online | 276 |
| ABSTENTION | abstained | Abstained | 17 |
| DID_NOT_VOTE | absent | Did not vote | 112 |

### Par groupe politique

| Groupe | Libellé long | Députés |
| --- | --- | --- |
| EPP | European People's Party | 184 |
| S&D | Progressive Alliance of Socialists and Democrats | 135 |
| Renew | Renew Europe | 78 |
| ECR | European Conservatives and Reformists | 84 |
| PfE | Patriots for Europe | 85 |
| ESN | Europe of Sovereign Nations | 27 |
| Greens/EFA | Greens/European Free Alliance | 53 |
| The Left | The Left in the European Parliament | 45 |
| Non-attached | Non-attached Members | 28 |

### Par pays

| Code | Pays | Députés |
| --- | --- | --- |
| AT | Austria | 20 |
| BE | Belgium | 22 |
| BG | Bulgaria | 17 |
| HR | Croatia | 12 |
| CY | Cyprus | 6 |
| CZ | Czechia | 21 |
| DK | Denmark | 15 |
| EE | Estonia | 7 |
| FI | Finland | 15 |
| FR | France | 81 |
| DE | Germany | 96 |
| GR | Greece | 21 |
| HU | Hungary | 21 |
| IE | Ireland | 14 |
| IT | Italy | 76 |
| LV | Latvia | 9 |
| LT | Lithuania | 11 |
| LU | Luxembourg | 6 |
| MT | Malta | 6 |
| NL | Netherlands | 31 |
| PL | Poland | 53 |
| PT | Portugal | 21 |
| RO | Romania | 33 |
| SK | Slovakia | 15 |
| SI | Slovenia | 9 |
| ES | Spain | 60 |
| SE | Sweden | 21 |

## Points à confirmer avec Mojo

1. **Parti national** : la colonne `national_party` est vide sur toutes les lignes alors que les fiches et la recherche du design l'affichent. Merci de fournir un V03 avec cette colonne remplie (source possible : HowTheyVote ou europarl.europa.eu).
2. **Nombre de députés** : 719 lignes pour 720 sièges. Confirmer qu'il s'agit d'un siège vacant à la date du vote, ou identifier le député manquant.
3. **Sens de la position de vote** : le CSV décrit la position sur la motion de rejet (`FOR` = a voté pour le rejet = « Said no to action against child sexual abuse »). Le JSON conserve ce sens (`for` / `against`) et fournit les libellés à afficher ; confirmer que la bande de vote des fiches repose bien sur `vote_label_en`.
4. **Libellé de la bande de vote** : le CSV dit « Voted to fight sexual abuse online », le design dit « Voted to fight **child** sexual abuse online ». Quel texte fait foi ?
5. **Abstention / absence** : formulation de la bande pour « Abstained » et « Did not vote » (17 et 112 députés concernés).
6. **Date sur les fiches** : le design affiche « LAST VOTE ON DETECTION · 07.9.26 » alors que `vote_date` vaut 2026-07-09 (9 juillet 2026). Format retenu par défaut dans le module : 09.07.26 (jj.mm.aa), à confirmer.
7. **Parti national dans les fiches** : le design montre « Finland  Kansallinen Kokoomus » sous le nom ; sans `national_party` la fiche n'affichera que le pays.

