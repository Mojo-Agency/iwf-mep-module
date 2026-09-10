#!/usr/bin/env node
/**
 * build-data.mjs
 * Transforme data/meps.csv (source Mojo, jamais éditée à la main) en data/meps.json
 * (servi par jsDelivr) et produit un rapport qualité Markdown dans reports/.
 *
 * Usage : node scripts/build-data.mjs [--in data/meps.csv] [--out data/meps.json] [--strict] [--quiet]
 *   - erreurs bloquantes  : exit 1, le JSON n'est PAS écrit, la liste des lignes est affichée
 *   - avertissements      : exit 0, JSON écrit, tout est listé dans le rapport
 *   - --strict            : les avertissements deviennent bloquants (exit 2)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const INPUT = resolve(ROOT, opt('--in', 'data/meps.csv'));
const OUTPUT = resolve(ROOT, opt('--out', 'data/meps.json'));
const REPORT_DIR = resolve(ROOT, 'reports');
const STRICT = flag('--strict');
const QUIET = flag('--quiet');
const EXPECTED_ROWS = 720;
const TODAY = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Tables de référence
// ---------------------------------------------------------------------------
const EXPECTED_HEADER = [
  'mep_id', 'display_name', 'first_name', 'last_name', 'country', 'country_code',
  'national_party', 'eu_group_short', 'eu_group_full', 'eu_group_code',
  'vote_position_raw', 'vote_label_en', 'vote_label_technical_en', 'vote_date',
  'email', 'photo_url_ep', 'mep_profile_url_ep', 'source_url',
];

// ISO 3166-1 alpha-3 -> [alpha-2, nom anglais attendu] pour les 27 États membres
const COUNTRIES = {
  AUT: ['AT', 'Austria'],   BEL: ['BE', 'Belgium'],     BGR: ['BG', 'Bulgaria'],
  HRV: ['HR', 'Croatia'],   CYP: ['CY', 'Cyprus'],      CZE: ['CZ', 'Czechia'],
  DNK: ['DK', 'Denmark'],   EST: ['EE', 'Estonia'],     FIN: ['FI', 'Finland'],
  FRA: ['FR', 'France'],    DEU: ['DE', 'Germany'],     GRC: ['GR', 'Greece'],
  HUN: ['HU', 'Hungary'],   IRL: ['IE', 'Ireland'],     ITA: ['IT', 'Italy'],
  LVA: ['LV', 'Latvia'],    LTU: ['LT', 'Lithuania'],   LUX: ['LU', 'Luxembourg'],
  MLT: ['MT', 'Malta'],     NLD: ['NL', 'Netherlands'], POL: ['PL', 'Poland'],
  PRT: ['PT', 'Portugal'],  ROU: ['RO', 'Romania'],     SVK: ['SK', 'Slovakia'],
  SVN: ['SI', 'Slovenia'],  ESP: ['ES', 'Spain'],       SWE: ['SE', 'Sweden'],
};

// Position brute HowTheyVote -> enum du module.
// ATTENTION : la position est relative à la motion de REJET.
//   for       = a voté POUR le rejet   = contre la protection des enfants
//   against   = a voté CONTRE le rejet = pour la protection des enfants
const VOTES = { FOR: 'for', AGAINST: 'against', ABSTENTION: 'abstained', DID_NOT_VOTE: 'absent' };
const VOTE_LABELS = {
  for: 'Said no to action against child sexual abuse',
  against: 'Voted to fight sexual abuse online',
  abstained: 'Abstained',
  absent: 'Did not vote',
};
const VOTE_LABELS_TECHNICAL = {
  for: 'Voted for rejection',
  against: 'Voted against rejection',
  abstained: 'Abstained',
  absent: 'Did not vote',
};

// eu_group_code -> [libellé court, libellé long]
const GROUPS = {
  EPP: ['EPP', "European People's Party"],
  SD: ['S&D', 'Progressive Alliance of Socialists and Democrats'],
  RENEW: ['Renew', 'Renew Europe'],
  ECR: ['ECR', 'European Conservatives and Reformists'],
  PFE: ['PfE', 'Patriots for Europe'],
  ESN: ['ESN', 'Europe of Sovereign Nations'],
  GREEN_EFA: ['Greens/EFA', 'Greens/European Free Alliance'],
  GUE_NGL: ['The Left', 'The Left in the European Parliament'],
  NI: ['Non-attached', 'Non-attached Members'],
};

// Gabarits d'URL europarl : reconstruits côté client depuis l'id (économise ~70 Ko de JSON)
const PHOTO_BASE = 'https://www.europarl.europa.eu/mepphoto/{id}.jpg';
const PROFILE_BASE = 'https://www.europarl.europa.eu/meps/en/{id}';
const collator = new Intl.Collator('en', { sensitivity: 'base', ignorePunctuation: true });

const EMAIL_RE = /^[a-z0-9][a-z0-9.'_-]*@[a-z0-9.-]+\.[a-z]{2,}$/i;
const EP_EMAIL_RE = /@europarl\.europa\.eu$/i;
const PHOTO_RE = /^https:\/\/www\.europarl\.europa\.eu\/mepphoto\/(\d+)\.jpg$/;
const PROFILE_RE = /^https:\/\/www\.europarl\.europa\.eu\/meps\/[a-z]{2}\/(\d+)$/;
const SOURCE_RE = /^https:\/\/howtheyvote\.eu\/votes\/\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Parsing CSV (RFC 4180 : guillemets, virgules et retours ligne dans les champs)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignoré, la fin de ligne est gérée par \n
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push({ line: rowLine, cells: row });
      row = []; line++; rowLine = line;
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push({ line: rowLine, cells: row }); }
  if (quoted) throw new Error(`CSV : guillemet non fermé (ligne ${rowLine})`);
  return rows;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const errors = [];   // bloquant : { line, field, msg }
const warnings = []; // non bloquant
const err = (line, field, msg) => errors.push({ line, field, msg });
const warn = (line, field, msg) => warnings.push({ line, field, msg });

let raw;
try {
  raw = readFileSync(INPUT, 'utf8');
} catch (e) {
  console.error(`✖ Impossible de lire ${INPUT} : ${e.message}`);
  process.exit(1);
}
if (/\r\n/.test(raw) && /[^\r]\n/.test(raw)) warn(0, 'file', 'Fins de ligne mixtes (CRLF et LF)');

const table = parseCsv(raw);
const header = table[0]?.cells.map((h) => h.trim()) ?? [];
const missingCols = EXPECTED_HEADER.filter((h) => !header.includes(h));
const extraCols = header.filter((h) => !EXPECTED_HEADER.includes(h));
if (missingCols.length) err(1, 'header', `Colonnes manquantes : ${missingCols.join(', ')}`);
if (extraCols.length) warn(1, 'header', `Colonnes inattendues (ignorées) : ${extraCols.join(', ')}`);
const col = Object.fromEntries(header.map((h, i) => [h, i]));

const dataRows = table.slice(1);
if (dataRows.length !== EXPECTED_ROWS) {
  warn(0, 'file', `${dataRows.length} députés dans le CSV, ${EXPECTED_ROWS} attendus (Parlement 2024-2029)`);
}

const seenIds = new Map();
const seenEmails = new Map();
const seenNames = new Map();
const voteDates = new Set();
const sourceUrls = new Set();
const meps = [];

for (const { line, cells } of dataRows) {
  if (cells.length !== header.length) {
    err(line, 'row', `${cells.length} colonnes au lieu de ${header.length}`);
    continue;
  }
  const get = (name) => (col[name] === undefined ? '' : cells[col[name]]);
  const g = (name) => get(name).trim();

  for (const h of header) if (get(h) !== get(h).trim()) warn(line, h, 'Espaces en début ou fin de cellule');

  const id = g('mep_id');
  if (!/^\d+$/.test(id)) err(line, 'mep_id', `Identifiant invalide "${id}"`);
  else if (seenIds.has(id)) err(line, 'mep_id', `Identifiant ${id} en doublon (ligne ${seenIds.get(id)})`);
  else seenIds.set(id, line);

  const name = g('display_name');
  const first = g('first_name');
  const last = g('last_name');
  if (!name) err(line, 'display_name', 'Nom affiché vide');
  if (!first) warn(line, 'first_name', 'Prénom vide');
  if (!last) warn(line, 'last_name', 'Nom de famille vide');
  if (name && seenNames.has(name)) warn(line, 'display_name', `Homonyme : "${name}" existe déjà ligne ${seenNames.get(name)}`);
  else if (name) seenNames.set(name, line);

  const a3 = g('country_code').toUpperCase();
  const countryName = g('country');
  const country = COUNTRIES[a3];
  if (!country) err(line, 'country_code', `Code pays inconnu "${g('country_code')}" (attendu ISO alpha-3 d'un État membre)`);
  else if (countryName !== country[1]) warn(line, 'country', `Nom de pays "${countryName}" différent de "${country[1]}" attendu pour ${a3}`);

  const party = g('national_party');
  if (!party) warn(line, 'national_party', 'Parti national vide');

  const gcode = g('eu_group_code');
  const group = GROUPS[gcode];
  if (!group) err(line, 'eu_group_code', `Groupe politique inconnu "${gcode}"`);
  else {
    if (g('eu_group_short') !== group[0]) warn(line, 'eu_group_short', `"${g('eu_group_short')}" au lieu de "${group[0]}"`);
    if (g('eu_group_full') !== group[1]) warn(line, 'eu_group_full', `"${g('eu_group_full')}" au lieu de "${group[1]}"`);
  }

  const rawVote = g('vote_position_raw').toUpperCase();
  const vote = VOTES[rawVote];
  if (!vote) err(line, 'vote_position_raw', `Position de vote inconnue "${g('vote_position_raw')}"`);
  else {
    if (g('vote_label_en') !== VOTE_LABELS[vote]) warn(line, 'vote_label_en', `Libellé "${g('vote_label_en')}" différent de "${VOTE_LABELS[vote]}"`);
    if (g('vote_label_technical_en') !== VOTE_LABELS_TECHNICAL[vote]) warn(line, 'vote_label_technical_en', `Libellé technique "${g('vote_label_technical_en')}" différent de "${VOTE_LABELS_TECHNICAL[vote]}"`);
  }

  const date = g('vote_date');
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) err(line, 'vote_date', `Date de vote invalide "${date}"`);
  else voteDates.add(date);

  const email = g('email').toLowerCase();
  if (!email) err(line, 'email', 'Email manquant');
  else if (!EMAIL_RE.test(email)) err(line, 'email', `Email implausible "${email}"`);
  else {
    if (!EP_EMAIL_RE.test(email)) warn(line, 'email', `Domaine inhabituel "${email}" (attendu @europarl.europa.eu)`);
    if (seenEmails.has(email)) err(line, 'email', `Email ${email} en doublon (ligne ${seenEmails.get(email)})`);
    else seenEmails.set(email, line);
  }

  const photo = g('photo_url_ep');
  if (!photo) err(line, 'photo_url_ep', 'URL photo manquante');
  else if (!/^https:\/\//.test(photo)) err(line, 'photo_url_ep', `URL photo non https "${photo}"`);
  else {
    const m = photo.match(PHOTO_RE);
    if (!m) warn(line, 'photo_url_ep', `URL photo hors format europarl attendu "${photo}"`);
    else if (m[1] !== id) warn(line, 'photo_url_ep', `La photo pointe vers l'id ${m[1]} et non ${id}`);
  }

  const profile = g('mep_profile_url_ep');
  if (!profile) warn(line, 'mep_profile_url_ep', 'URL de profil manquante');
  else if (!/^https:\/\//.test(profile)) err(line, 'mep_profile_url_ep', `URL de profil non https "${profile}"`);
  else {
    const m = profile.match(PROFILE_RE);
    if (!m) warn(line, 'mep_profile_url_ep', `URL de profil hors format europarl attendu "${profile}"`);
    else if (m[1] !== id) warn(line, 'mep_profile_url_ep', `Le profil pointe vers l'id ${m[1]} et non ${id}`);
  }

  const source = g('source_url');
  if (!source) err(line, 'source_url', 'URL source HowTheyVote manquante');
  else if (!SOURCE_RE.test(source)) warn(line, 'source_url', `URL source hors format howtheyvote.eu "${source}"`);
  if (source) sourceUrls.add(source);

  if (country && group && vote) {
    const mep = {
      id,
      name,
      first,
      last,
      country: country[0],
      party,
      group: group[0],
      email,
      vote,
    };
    // Les URL standard sont reconstruites côté client depuis les gabarits (photoBase, profileBase,
    // source.voteUrl) : on ne les répète par ligne que si elles s'écartent du gabarit.
    if (photo !== PHOTO_BASE.replace('{id}', id)) mep.photo = photo;
    if (profile !== PROFILE_BASE.replace('{id}', id)) mep.profile = profile;
    meps.push({ mep, source });
  }
}

if (voteDates.size > 1) warn(0, 'vote_date', `Plusieurs dates de vote : ${[...voteDates].join(', ')}`);
if (sourceUrls.size > 1) warn(0, 'source_url', `Plusieurs URL source : ${[...sourceUrls].join(', ')}`);

// ---------------------------------------------------------------------------
// Tri et sortie JSON
// ---------------------------------------------------------------------------
const mainVoteUrl = [...sourceUrls][0] ?? null;
const sortedMeps = meps
  .map(({ mep, source }) => (source && source !== mainVoteUrl ? { ...mep, voteUrl: source } : mep))
  .sort((a, b) => collator.compare(a.last, b.last) || collator.compare(a.first, b.first) || collator.compare(a.name, b.name));

const stats = { byCountry: {}, byVote: {}, byGroup: {} };
for (const m of sortedMeps) {
  stats.byCountry[m.country] = (stats.byCountry[m.country] || 0) + 1;
  stats.byVote[m.vote] = (stats.byVote[m.vote] || 0) + 1;
  stats.byGroup[m.group] = (stats.byGroup[m.group] || 0) + 1;
}

const output = {
  generated: TODAY,
  source: {
    file: basename(INPUT),
    rows: dataRows.length,
    voteUrl: mainVoteUrl,
  },
  voteDate: [...voteDates][0] ?? null,
  voteMeaning: 'Position on the motion to REJECT the proposal: "for" = voted for rejection (against child protection), "against" = voted against rejection (for child protection).',
  voteLabels: VOTE_LABELS,
  groups: Object.fromEntries(Object.values(GROUPS).map(([s, f]) => [s, f])),
  photoBase: PHOTO_BASE,
  profileBase: PROFILE_BASE,
  meps: sortedMeps,
};

const json = JSON.stringify(output);
const gz = gzipSync(Buffer.from(json)).length;
const blocking = errors.length > 0 || (STRICT && warnings.length > 0);

// ---------------------------------------------------------------------------
// Rapport qualité (Markdown, en français, à transmettre à Mojo)
// ---------------------------------------------------------------------------
function groupBy(list) {
  const map = new Map();
  for (const it of list) {
    const key = `${it.field} · ${it.msg.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N')}`;
    if (!map.has(key)) map.set(key, { field: it.field, sample: it.msg, lines: [] });
    map.get(key).lines.push(it.line);
  }
  return [...map.values()].sort((a, b) => b.lines.length - a.lines.length);
}
const fmtLines = (lines, max = 15) => {
  const l = lines.filter((n) => n > 0);
  if (!l.length) return 'fichier entier';
  return l.slice(0, max).join(', ') + (l.length > max ? ` … (+${l.length - max})` : '');
};
const mdTable = (rows, head) => [
  `| ${head.join(' | ')} |`,
  `| ${head.map(() => '---').join(' | ')} |`,
  ...rows.map((r) => `| ${r.join(' | ')} |`),
].join('\n');

const report = [];
report.push(`# Rapport qualité CSV — ${basename(INPUT)}`);
report.push('');
report.push(`Généré le ${TODAY} par \`scripts/build-data.mjs\` (IWF phase 2, module « Contact your MEP »).`);
report.push('');
report.push('## Résumé');
report.push('');
report.push(mdTable([
  ['Lignes de données', `${dataRows.length} (attendu ${EXPECTED_ROWS})`],
  ['Députés exportés dans le JSON', `${meps.length}`],
  ['Erreurs bloquantes', `${errors.length}`],
  ['Avertissements', `${warnings.length}`],
  ['JSON généré', blocking ? '**non** (corriger les erreurs bloquantes)' : `oui — ${(json.length / 1024).toFixed(1)} Ko brut, ${(gz / 1024).toFixed(1)} Ko gzip`],
], ['Indicateur', 'Valeur']));
report.push('');
report.push('## Erreurs bloquantes');
report.push('');
if (!errors.length) {
  report.push('Aucune. Toutes les lignes ont un identifiant unique, un email plausible et unique, une photo en https, un pays et un groupe connus.');
} else {
  report.push("Le JSON n'est pas généré tant que ces lignes ne sont pas corrigées (numéro de ligne du fichier CSV, en-tête = ligne 1).");
  report.push('');
  for (const e of errors) report.push(`- ligne ${e.line} · \`${e.field}\` · ${e.msg}`);
}
report.push('');
report.push('## Avertissements');
report.push('');
if (!warnings.length) {
  report.push('Aucun.');
} else {
  report.push('Non bloquants pour la génération, mais à trancher avant la mise en ligne.');
  report.push('');
  for (const grp of groupBy(warnings)) {
    report.push(`- **${grp.lines.length} ×** \`${grp.field}\` · ${grp.sample}`);
    report.push(`  Lignes : ${fmtLines(grp.lines)}`);
  }
}
report.push('');
report.push('## Statistiques');
report.push('');
report.push('### Par position de vote');
report.push('');
report.push(mdTable(
  Object.entries(VOTES).map(([rawKey, v]) => [rawKey, v, VOTE_LABELS[v], `${stats.byVote[v] || 0}`]),
  ['Valeur CSV', 'Enum JSON', 'Libellé affiché', 'Députés'],
));
report.push('');
report.push('### Par groupe politique');
report.push('');
report.push(mdTable(
  Object.values(GROUPS).map(([s, f]) => [s, f, `${stats.byGroup[s] || 0}`]),
  ['Groupe', 'Libellé long', 'Députés'],
));
report.push('');
report.push('### Par pays');
report.push('');
report.push(mdTable(
  Object.values(COUNTRIES).sort((a, b) => a[1].localeCompare(b[1])).map(([a2, n]) => [a2, n, `${stats.byCountry[a2] || 0}`]),
  ['Code', 'Pays', 'Députés'],
));
report.push('');
report.push('## Points à confirmer avec Mojo');
report.push('');
report.push("1. **Parti national** : la colonne `national_party` est vide sur toutes les lignes alors que les fiches et la recherche du design l'affichent. Merci de fournir un V03 avec cette colonne remplie (source possible : HowTheyVote ou europarl.europa.eu).");
report.push(`2. **Nombre de députés** : ${dataRows.length} lignes pour ${EXPECTED_ROWS} sièges. Confirmer qu'il s'agit d'un siège vacant à la date du vote, ou identifier le député manquant.`);
report.push('3. **Sens de la position de vote** : le CSV décrit la position sur la motion de rejet (`FOR` = a voté pour le rejet = « Said no to action against child sexual abuse »). Le JSON conserve ce sens (`for` / `against`) et fournit les libellés à afficher ; confirmer que la bande de vote des fiches repose bien sur `vote_label_en`.');
report.push('4. **Libellé de la bande de vote** : le CSV dit « Voted to fight sexual abuse online », le design dit « Voted to fight **child** sexual abuse online ». Quel texte fait foi ?');
report.push(`5. **Abstention / absence** : formulation de la bande pour « Abstained » et « Did not vote » (${stats.byVote.abstained || 0} et ${stats.byVote.absent || 0} députés concernés).`);
report.push(`6. **Date sur les fiches** : le design affiche « LAST VOTE ON DETECTION · 07.9.26 » alors que \`vote_date\` vaut ${[...voteDates][0] ?? '?'} (9 juillet 2026). Format retenu par défaut dans le module : 09.07.26 (jj.mm.aa), à confirmer.`);
report.push('7. **Parti national dans les fiches** : le design montre « Finland  Kansallinen Kokoomus » sous le nom ; sans `national_party` la fiche n\'affichera que le pays.');
report.push('');

if (!QUIET) {
  console.log(`\nCSV : ${relative(ROOT, INPUT)} — ${dataRows.length} lignes (attendu ${EXPECTED_ROWS})`);
  if (errors.length) {
    console.error(`\n✖ ${errors.length} erreur(s) bloquante(s) :`);
    for (const e of errors) console.error(`  ligne ${e.line} · ${e.field} · ${e.msg}`);
  }
  if (warnings.length) {
    console.warn(`\n⚠ ${warnings.length} avertissement(s) :`);
    for (const grp of groupBy(warnings)) console.warn(`  ${grp.lines.length} × ${grp.field} · ${grp.sample} (lignes ${fmtLines(grp.lines, 8)})`);
  }
}

mkdirSync(REPORT_DIR, { recursive: true });
const reportPath = resolve(REPORT_DIR, `csv-quality-${TODAY}.md`);
writeFileSync(reportPath, report.join('\n') + '\n', 'utf8');

if (blocking) {
  console.error(`\n✖ JSON non généré. Rapport : ${relative(ROOT, reportPath)}`);
  process.exit(errors.length ? 1 : 2);
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, json + '\n', 'utf8');
if (!QUIET) {
  console.log(`\n✔ ${relative(ROOT, OUTPUT)} : ${meps.length} députés, ${(json.length / 1024).toFixed(1)} Ko brut, ${(gz / 1024).toFixed(1)} Ko gzip`);
  console.log(`✔ Rapport : ${relative(ROOT, reportPath)}`);
}
