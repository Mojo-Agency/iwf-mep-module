/**
 * smoke-weglot.mjs — le module sous Weglot, dans jsdom, avec un faux window.Weglot.
 * Usage : npm run build && node scripts/smoke-weglot.mjs
 * Vérifie : traduction par Weglot.translate (lots, jetons {x}, cache), pays via Intl, noms/partis/groupes
 * jamais traduits, modèles de mail traduits ligne par ligne jusque dans le mailto, bascule de langue
 * sans perdre les modifications du citoyen, exclusion du DOM (data-wg-notranslate), repli anglais.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = readFileSync(resolve(ROOT, 'dist/mep-module.min.js'), 'utf8');
const json = JSON.parse(readFileSync(resolve(ROOT, 'data/meps.json'), 'utf8'));

const results = [];
const check = (name, cond, detail = '') => { results.push({ name, ok: Boolean(cond), detail }); if (!cond) console.error(`✖ ${name} ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeDom() {
  const html = `<!DOCTYPE html><html><head></head><body>
<ol class="mep-stepper"><li data-mep-step="1" class="is-active">1</li><li data-mep-step="2">2</li><li data-mep-step="3">3</li></ol>
<div id="mep-module"></div></body></html>`;
  const dom = new JSDOM(html, { url: 'https://iwf-mojo.webflow.io/contact-your-mep', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.fetch = async () => ({ ok: true, status: 200, json: async () => structuredClone(json) });
  window.dataLayer = [];
  Object.defineProperty(window, 'isSecureContext', { value: true });
  Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async () => {} } });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const $ = (sel) => window.document.querySelector(sel);
  const $$ = (sel) => [...window.document.querySelectorAll(sel)];
  const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const byText = (sel, text) => $$(sel).find((el) => el.textContent.trim().startsWith(text));
  const waitFor = async (fn, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(25); } return null; };
  return { window, $, $$, click, byText, waitFor };
}

/** Faux Weglot : préfixe chaque texte "[lang] ", perd volontairement les jetons d'un texte, compte les appels. */
function fakeWeglot(window, initialLang, { sync = false } = {}) {
  const calls = [];
  const handlers = {};
  let lang = initialLang;
  const translate = (w, to) => (w === 'Page {p} of {n}' ? `Page X sur Y` : `[${to}] ${w}`);
  window.Weglot = {
    initialized: true,
    getCurrentLang: () => lang,
    on: (ev, cb) => { (handlers[ev] ||= []).push(cb); },
    translate: (payload, cb) => {
      calls.push(payload);
      const out = payload.words.map(({ w }) => translate(w, payload.languageTo));
      if (sync) cb(out); else setTimeout(() => cb(out), 5);
    },
  };
  return {
    calls,
    switchTo: (next) => { const prev = lang; lang = next; (handlers.languageChanged || []).forEach((cb) => cb(next, prev)); },
  };
}

// A. Page ouverte en français
{
  const { window, $, $$, click, byText, waitFor } = makeDom();
  const W = fakeWeglot(window, 'fr');
  window.eval(bundle);
  check('fr: grid rendered', await waitFor(() => $('#mep-module .mep-grid')));
  check('fr: module excluded from Weglot DOM translation', $('#mep-module').hasAttribute('data-wg-notranslate'));
  check('fr: every request in fr, batches of 40 max', W.calls.length > 0 && W.calls.every((c) => c.languageTo === 'fr' && c.words.length <= 40 && c.words.every((w) => w.t === 1)), JSON.stringify(W.calls.map((c) => c.words.length)));
  const sent = new Set(W.calls.flatMap((c) => c.words.map((w) => w.w)));
  check('fr: no duplicate word sent', sent.size === W.calls.reduce((n, c) => n + c.words.length, 0));
  check('fr: vote labels requested', Object.values(json.voteLabels).every((l) => sent.has(l)));
  check('fr: MEP names, parties and groups never sent', ![...sent].some((w) => /AALTOLA|Aaltola|European People|@europarl/.test(w)));
  const callsAfterMount = W.calls.length;

  check('fr: step title translated', $('#mep-step1-title').textContent === '[fr] Find your representative', $('#mep-step1-title').textContent);
  check('fr: labels translated', $('label[for="mep-country"]').textContent === '[fr] Search by country');
  check('fr: all-countries option', $('#mep-country option').textContent === '[fr] All countries');
  const fiOption = $$('#mep-country option').find((o) => o.value === 'FI');
  check('fr: country names via Intl in French', fiOption && fiOption.textContent === 'Finlande', fiOption && fiOption.textContent);
  const optionLabels = $$('#mep-country option').slice(1).map((o) => o.textContent);
  check('fr: countries sorted in French', optionLabels.join('|') === [...optionLabels].sort((a, b) => a.localeCompare(b, 'fr')).join('|'));
  const total = json.meps.length;
  check('fr: counter with tokens filled', $('#mep-module .mep-status').textContent === `[fr] ${total} out of ${total} representatives shown`, $('#mep-module .mep-status').textContent);
  check('fr: lost tokens fall back to English', $('.mep-pagination__info').textContent === `Page 1 of ${Math.ceil(total / 9)}`, $('.mep-pagination__info').textContent);
  check('fr: page aria-labels translated', $('.mep-pagination__page').getAttribute('aria-label') === '[fr] Page 1');
  const card = $('#mep-module .mep-card');
  check('fr: MEP name untouched and marked', !card.querySelector('.mep-card__name').textContent.includes('[fr]') && card.querySelector('.mep-card__name').getAttribute('translate') === 'no' && card.querySelector('.mep-card__name').hasAttribute('data-wg-notranslate'));
  check('fr: group untouched and marked', !card.querySelector('.mep-card__meta--group').textContent.includes('[fr]') && card.querySelector('.mep-card__meta--group').getAttribute('translate') === 'no');
  check('fr: vote label translated', card.querySelector('.mep-card__vote-label').textContent.startsWith('[fr] '), card.querySelector('.mep-card__vote-label').textContent);
  check('fr: kicker with date', /^\[fr\] Last vote on detection · \d\d\.\d\d\.\d\d$/.test(card.querySelector('.mep-card__vote-kicker').textContent));
  check('fr: write button + aria-label', card.querySelector('.mep-btn').textContent === '[fr] Write to this MEP' && card.querySelector('.mep-btn').getAttribute('aria-label').startsWith('[fr] Write to this MEP: '));

  const select = $('#mep-country');
  select.value = 'FI';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  const fiCount = json.meps.filter((m) => m.country === 'FI').length;
  check('fr: bulk button with French country', $('#mep-module .mep-bulk button').textContent === '[fr] Contact all Finlande representatives', $('#mep-module .mep-bulk button').textContent);
  const input = $('#mep-search');
  input.value = 'aaltola';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(250);
  click($('#mep-module .mep-card .mep-btn'));

  // Étape 2
  check('fr: step 2 title', $('#mep-step2-title') && $('#mep-step2-title').textContent === '[fr] Choose a starting point');
  const who = $('.mep-writing-to__who');
  check('fr: writing-to = untranslated name + French country', who.textContent === 'Mika AALTOLA, Finlande' && who.querySelector('[translate="no"]').textContent === 'Mika AALTOLA', who.textContent);
  check('fr: template cards translated', $$('.mep-template__title').map((e) => e.textContent).join('|') === '[fr] The full case|[fr] Short and direct|[fr] Personal');
  check('fr: subject translated', $('#mep-subject').value === '[fr] A request from someone you represent on the Child Sexual Abuse Regulation', $('#mep-subject').value);
  const bodyLines = $('#mep-body').value.split('\n');
  const sourceLines = W.calls.length && bodyLines.length;
  check('fr: body translated line by line, blank lines kept', sourceLines > 20 && bodyLines.every((l) => !l.trim() || l.startsWith('[fr] ')) && bodyLines.some((l) => l === ''), bodyLines.slice(0, 3).join(' / '));
  check('fr: body keeps signature and placeholders', $('#mep-body').value.includes('[fr] Kind regards,\n[fr] [Your name]'));
  check('fr: counter sentence', $('.mep-counter').textContent === `[fr] ${$('#mep-body').value.length} characters. [fr] Long messages may not open in some email apps, use the copy button below.`, $('.mep-counter').textContent);
  click($$('.mep-template')[1]);
  check('fr: switching template announces in French', await waitFor(() => $('.mep-sr-only').textContent === '[fr] [fr] Short and direct selected. Subject and message updated.'), $('.mep-sr-only').textContent);
  check('fr: short template body translated', $('#mep-body').value.startsWith('[fr] Dear Member of the European Parliament,\n\n[fr] I am one of the people you represent'));
  // Le citoyen personnalise l'objet, garde le message du modèle.
  $('#mep-subject').value = 'Mon objet à moi';
  $('#mep-subject').dispatchEvent(new window.Event('input', { bubbles: true }));
  click(byText('#mep-module .mep-btn', '[fr] Continue'));

  // Étape 3
  check('fr: step 3 title', $('#mep-step3-title') && $('#mep-step3-title').textContent === '[fr] Review and send');
  const toRow = $('.mep-preview__row .mep-preview__body');
  check('fr: To row name + email untranslated and marked', toRow.textContent === 'Mika Aaltola mika.aaltola@europarl.europa.eu' && toRow.querySelectorAll('[translate="no"]').length === 2, toRow.textContent);
  check('fr: edit links aria-labels', $$('.mep-preview .mep-link').map((b) => b.getAttribute('aria-label')).join('|') === '[fr] Edit subject|[fr] Edit message');
  const open = byText('#mep-module a.mep-btn', '[fr] Open in my email app');
  check('fr: mailto carries translated body and custom subject', open && new URL(open.href).searchParams.get('subject') === 'Mon objet à moi' && new URL(open.href).searchParams.get('body').startsWith('[fr] Dear Member of the European Parliament,\r\n\r\n[fr] I am one'));
  check('fr: share text translated', $('.mep-share__link').href.includes(encodeURIComponent('[fr] The petition no one would sign')));
  check('fr: buttons translated', byText('#mep-module button.mep-btn', '[fr] Copy message') && byText('#mep-module button.mep-btn', '[fr] Copy email address'));
  check('fr: no extra request after mount', W.calls.length === callsAfterMount, String(W.calls.length));

  // Bascule vers l'anglais dans la page : l'objet modifié reste, le message suit la langue.
  W.switchTo('en');
  check('en after switch: step 3 re-rendered in English', await waitFor(() => $('#mep-step3-title') && $('#mep-step3-title').textContent === 'Review and send'), $('#mep-step3-title') && $('#mep-step3-title').textContent);
  check('en after switch: custom subject kept', $$('.mep-preview__row')[1].querySelector('.mep-preview__body').textContent === 'Mon objet à moi');
  check('en after switch: untouched body follows the language', $('.mep-preview__body--message').textContent.startsWith('Dear Member of the European Parliament,\n\nI am one of the people you represent'));
  check('en after switch: writing-to in English', $('.mep-writing-to__who').textContent === 'Mika AALTOLA, Finland');
  check('en after switch: no Weglot request for the source language', W.calls.length === callsAfterMount);

  // Retour au français : servi par le cache mémoire, aucune requête.
  W.switchTo('fr');
  check('fr again: re-rendered from cache', await waitFor(() => $('#mep-step3-title') && $('#mep-step3-title').textContent === '[fr] Review and send'));
  check('fr again: no new request', W.calls.length === callsAfterMount, String(W.calls.length));
  check('fr again: body back to French, subject still custom', $('.mep-preview__body--message').textContent.startsWith('[fr] Dear Member') && $$('.mep-preview__row')[1].querySelector('.mep-preview__body').textContent === 'Mon objet à moi');

  // Bulk : "(BCC)" et compteur d'adresses
  click($('.mep-writing-to .mep-link'));
  $('#mep-search').value = '';
  $('#mep-search').dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(250);
  click($('#mep-module .mep-bulk button'));
  check('fr: bulk writing-to', $('.mep-writing-to__who').textContent === `[fr] All ${fiCount} MEPs in Finlande`, $('.mep-writing-to__who').textContent);
  click(byText('#mep-module .mep-btn', '[fr] Continue'));
  check('fr: bulk To row', $('.mep-preview__body').textContent === `[fr] All ${fiCount} MEPs in Finlande (BCC)`, $('.mep-preview__body').textContent);
  check('fr: bulk copy-all label', byText('#mep-module button.mep-btn', `[fr] Copy all ${fiCount} email addresses`));
  check('fr: bulk notice', $('.mep-notice').textContent === '[fr] Before you send [fr] Paste the addresses into the BCC field of your email, not To or CC. This keeps the recipient list private.', $('.mep-notice').textContent);
  check('fr: no storage, no url state', window.localStorage.length === 0 && window.location.href === 'https://iwf-mojo.webflow.io/contact-your-mep');
}

// B. Weglot présent, réponse synchrone (cache Weglot) : pas d'erreur d'ordre d'initialisation
{
  const { window, $, waitFor } = makeDom();
  fakeWeglot(window, 'de', { sync: true });
  window.eval(bundle);
  check('de sync: rendered translated', await waitFor(() => $('#mep-step1-title') && $('#mep-step1-title').textContent === '[de] Find your representative'));
  const de = [...window.document.querySelectorAll('#mep-country option')].find((o) => o.value === 'DE');
  check('de sync: country via Intl in German', de && de.textContent === 'Deutschland', de && de.textContent);
}

// C. Weglot en échec (erreur, réponse vide) : repli anglais, module fonctionnel
{
  const { window, $, waitFor } = makeDom();
  const origWarn = console.warn;
  const warnings = [];
  console.warn = (...a) => warnings.push(a.join(' '));
  window.Weglot = { initialized: true, getCurrentLang: () => 'it', on() {}, translate: (payload, cb) => setTimeout(() => cb({ to_words: [] }), 5) };
  window.eval(bundle);
  check('it failing: English fallback', await waitFor(() => $('#mep-step1-title') && $('#mep-step1-title').textContent === 'Find your representative'));
  check('it failing: one warning per batch', warnings.length >= 2 && warnings.every((w) => w.includes('[mep-module] Weglot')), String(warnings.length));
  const it = [...window.document.querySelectorAll('#mep-country option')].find((o) => o.value === 'IT');
  check('it failing: country still localised by Intl', it && it.textContent === 'Italia', it && it.textContent);
  console.warn = origWarn;
}

// D. Weglot pas encore initialisé au montage : attend l'événement "initialized"
{
  const { window, $, waitFor } = makeDom();
  const handlers = {};
  let lang = 'en';
  window.Weglot = {
    initialized: false,
    getCurrentLang: () => lang,
    on: (ev, cb) => { (handlers[ev] ||= []).push(cb); },
    translate: (payload, cb) => setTimeout(() => cb(payload.words.map(({ w }) => `[${payload.languageTo}] ${w}`)), 5),
  };
  window.eval(bundle);
  await sleep(100);
  check('late init: nothing rendered before Weglot is ready', !$('#mep-step1-title'));
  lang = 'es';
  window.Weglot.initialized = true;
  (handlers.initialized || []).forEach((cb) => cb());
  check('late init: rendered in Spanish once initialized', await waitFor(() => $('#mep-step1-title') && $('#mep-step1-title').textContent === '[es] Find your representative'));
}

// E. Sans Weglot : anglais, aucun appel, attribut d'exclusion posé quand même
{
  const { window, $, waitFor } = makeDom();
  window.eval(bundle);
  check('no weglot: English', await waitFor(() => $('#mep-step1-title') && $('#mep-step1-title').textContent === 'Find your representative'));
  check('no weglot: exclusion attribute present', $('#mep-module').hasAttribute('data-wg-notranslate'));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} Weglot checks passed`);
process.exit(failed.length ? 1 : 0);
