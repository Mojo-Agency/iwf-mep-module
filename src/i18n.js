// Traduction du module par l'API JavaScript de Weglot (Weglot.translate), pas par son observation du DOM.
// Le conteneur #mep-module porte data-wg-notranslate : le module rend directement des textes traduits,
// sans clignotement ni double passage, et les noms (députés, partis, groupes) ne partent jamais en
// traduction. Sans Weglot, ou en anglais (langue source), aucune requête n'est faite.
// Les textes envoyés apparaissent dans le dashboard Weglot (Translations, URL de la page) où ils se
// corrigent comme le reste du site ; la correction est servie au chargement suivant.
import { STRINGS, TEMPLATES, SHARE } from './templates.js';

export const SOURCE_LANG = 'en';
const BATCH = 40;          // mots par requête Weglot.translate
const TIMEOUT_MS = 8000;   // au-delà, repli sur l'anglais pour le lot
const cache = new Map();   // lang -> Map<source, traduction>
const pending = new Map(); // lang -> Map<source, Promise du lot en vol>

function weglot() {
  return typeof window !== 'undefined' && window.Weglot ? window.Weglot : null;
}

function normalizeLang(value) {
  const s = String(value || '').trim().toLowerCase();
  return /^[a-z]{2}(-[a-z]{2,4})?$/.test(s) ? s : SOURCE_LANG;
}

/** Langue courante selon Weglot ("fr"), sinon "en". */
export function currentLang() {
  try {
    const W = weglot();
    return W && typeof W.getCurrentLang === 'function' ? normalizeLang(W.getCurrentLang()) : SOURCE_LANG;
  } catch {
    return SOURCE_LANG;
  }
}

/** Attend l'initialisation de Weglot si le script est présent mais pas encore prêt (au plus `timeout` ms). */
export function whenWeglotReady(timeout = 3000) {
  return new Promise((resolve) => {
    const W = weglot();
    if (!W || W.initialized !== false) { resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    try { W.on('initialized', finish); } catch { finish(); }
    setTimeout(finish, timeout);
  });
}

/** Appelle `cb(lang)` à chaque changement de langue dans la page (bascule Weglot sans rechargement). */
export function onLanguageChange(cb) {
  try {
    const W = weglot();
    if (W && typeof W.on === 'function') W.on('languageChanged', (next) => cb(normalizeLang(next)));
  } catch { /* Weglot absent */ }
}

function canTranslate(lang) {
  const W = weglot();
  return lang !== SOURCE_LANG && Boolean(W) && typeof W.translate === 'function';
}

/** Normalise la réponse de Weglot.translate : tableau de chaînes, ou objet { to_words }. */
function pickTranslations(data, n) {
  const list = Array.isArray(data) ? data : data && Array.isArray(data.to_words) ? data.to_words : null;
  if (!list || list.length !== n) return null;
  return list.map((x) => (typeof x === 'string' ? x : x && typeof x.w === 'string' ? x.w : ''));
}

/** Un lot vers Weglot. Résout toujours : tableau de traductions, ou null en cas d'échec ou de délai. */
function requestBatch(words, lang) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = (out) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(out);
    };
    timer = setTimeout(() => finish(null), TIMEOUT_MS);
    try {
      const ret = weglot().translate(
        { words: words.map((w) => ({ t: 1, w })), languageTo: lang },
        (data) => finish(pickTranslations(data, words.length)),
      );
      if (ret && typeof ret.then === 'function') {
        ret.then((data) => finish(pickTranslations(data, words.length)), () => finish(null));
      }
    } catch {
      finish(null);
    }
  });
}

/** Les jetons {x} de la source doivent tous survivre à la traduction, sinon le texte reste en anglais. */
function keepsTokens(source, translated) {
  const tokens = source.match(/\{\w+\}/g) || [];
  return tokens.every((tok) => translated.includes(tok));
}

/**
 * Garantit que `words` sont traduits en `lang` (cache mémoire par langue, lots de 40, dédoublonnés).
 * Résout la Map source -> traduction de la langue ; un texte absent de la Map reste en anglais.
 */
export async function translateWords(lang, words) {
  if (!cache.has(lang)) cache.set(lang, new Map());
  const map = cache.get(lang);
  if (!canTranslate(lang)) return map;
  if (!pending.has(lang)) pending.set(lang, new Map());
  const inflight = pending.get(lang);
  const wanted = [...new Set(words)].filter((w) => typeof w === 'string' && w.trim());
  const todo = wanted.filter((w) => !map.has(w) && !inflight.has(w));
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  const jobs = batches.map((batch) => {
    const job = requestBatch(batch, lang).then((out) => {
      batch.forEach((src, i) => {
        inflight.delete(src);
        if (!out) return; // lot en échec : pas mémorisé, retenté à la prochaine bascule de langue
        const tr = out[i];
        // Traduction sans ses jetons {x} : l'anglais est mémorisé pour ce texte (à corriger dans Weglot).
        map.set(src, tr && keepsTokens(src, tr) ? tr : src);
      });
      if (!out) console.warn(`[mep-module] Weglot: ${batch.length} textes non traduits en "${lang}", anglais conservé.`);
    });
    batch.forEach((src) => inflight.set(src, job));
    return job;
  });
  // Attend aussi les lots déjà en vol, demandés par un appel précédent.
  const waiting = wanted.map((w) => inflight.get(w)).filter(Boolean);
  await Promise.all([...jobs, ...waiting]);
  return map;
}

function fill(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

/** Textes fixes du module : interface, modèles (ligne par ligne), texte de partage. */
export function baseWords() {
  const set = new Set(Object.values(STRINGS));
  set.add(SHARE.text);
  for (const tpl of TEMPLATES) {
    set.add(tpl.title);
    set.add(tpl.description);
    set.add(tpl.subject);
    for (const line of tpl.body.split('\n')) if (line.trim()) set.add(line);
  }
  return [...set];
}

/**
 * Construit le traducteur d'une langue : t(clé, params) pour STRINGS, tr(texte) pour un texte libre
 * (libellés de vote du JSON), modèles traduits ligne par ligne (les lignes vides structurent le mail).
 */
export async function buildI18n(lang, data) {
  const words = baseWords();
  if (data && data.voteLabels) words.push(...Object.values(data.voteLabels).filter(Boolean));
  const map = await translateWords(lang, words);
  const tr = (text) => (map && map.get(text)) || text;
  const t = (key, params) => fill(tr(STRINGS[key] || key), params);
  const templates = TEMPLATES.map((tpl) => ({
    ...tpl,
    title: tr(tpl.title),
    description: tr(tpl.description),
    subject: tr(tpl.subject),
    body: tpl.body.split('\n').map((line) => (line.trim() ? tr(line) : line)).join('\n'),
  }));
  return { lang, t, tr, templates, shareText: tr(SHARE.text) };
}
