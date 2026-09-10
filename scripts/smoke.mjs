#!/usr/bin/env node
/**
 * smoke.mjs — parcours complet du module dans jsdom, sans navigateur.
 * Usage : npm run build && node scripts/smoke.mjs
 * Vérifie : chargement, filtres, recherche, étapes 1 -> 2 -> 3, retours, bulk, presse-papiers,
 * mailto, stepper natif, dataLayer (pays uniquement), absence de stockage.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = readFileSync(resolve(ROOT, 'dist/mep-module.min.js'), 'utf8');
const json = JSON.parse(readFileSync(resolve(ROOT, 'data/meps.json'), 'utf8'));

const html = `<!DOCTYPE html><html><head></head><body>
<ol class="mep-stepper"><li data-mep-step="1" class="mep-stepper_item is-active" aria-current="step">1. Find</li><li data-mep-step="2" class="mep-stepper_item">2. Write</li><li data-mep-step="3" class="mep-stepper_item">3. Send</li></ol>
<div id="mep-module"></div></body></html>`;

const dom = new JSDOM(html, { url: 'https://iwf-mojo.webflow.io/contact-your-mep', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

let clipboard = null;
let fetched = null;
window.fetch = async (url) => { fetched = String(url); return { ok: true, status: 200, json: async () => structuredClone(json) }; };
window.dataLayer = [];
Object.defineProperty(window, 'isSecureContext', { value: true });
Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async (t) => { clipboard = t; } } });
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const results = [];
const check = (name, cond, detail = '') => { results.push({ name, ok: Boolean(cond), detail }); if (!cond) console.error(`✖ ${name} ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const byText = (sel, text) => $$(sel).find((el) => el.textContent.trim().startsWith(text));
async function waitFor(fn, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(25); }
  return null;
}

window.eval(bundle);

// 1. Montage et étape 1
check('grid rendered', await waitFor(() => $('#mep-module .mep-grid')));
check('fetch fell back to /data/meps.json', fetched && fetched.endsWith('/data/meps.json'), fetched);
check('style injected once', $$('style[data-mep-module]').length === 1);
const total = json.meps.length;
const PAGE = 9;
const pageCount = Math.ceil(total / PAGE);
check(`first page shows ${PAGE} cards`, $$('#mep-module .mep-card').length === PAGE, String($$('#mep-module .mep-card').length));
check('count text', $('#mep-module .mep-status').textContent === `${total} out of ${total} representatives shown`, $('#mep-module .mep-status').textContent);
check('pagination rendered', $('.mep-pagination') && !$('.mep-pagination').hidden && $('.mep-pagination__info').textContent === `Page 1 of ${pageCount}`, $('.mep-pagination__info') && $('.mep-pagination__info').textContent);
check('prev disabled on page 1', $('.mep-pagination__nav').hasAttribute('disabled'));
const firstName = $('.mep-card__name').textContent;
click($$('.mep-pagination__nav')[1]);
check('page 2 shows next cards', $('.mep-pagination__info').textContent === `Page 2 of ${pageCount}` && $('.mep-card__name').textContent !== firstName && $$('#mep-module .mep-card').length === PAGE);
check('focus moved to results', document.activeElement === $('#mep-module .mep-grid'));
click($$('.mep-pagination__page').find((b) => b.textContent === String(pageCount)));
check('last page', $('.mep-pagination__info').textContent === `Page ${pageCount} of ${pageCount}` && $$('#mep-module .mep-card').length === total - PAGE * (pageCount - 1) && $$('.mep-pagination__nav')[1].hasAttribute('disabled'));
click($$('.mep-pagination__page').find((b) => b.textContent === '1'));
check('no bulk button without country', !$('#mep-module .mep-bulk button'));
const firstCard = $('#mep-module .mep-card');
check('card has photo url', firstCard.querySelector('img').src.startsWith('https://www.europarl.europa.eu/mepphoto/'));
check('card has source link', firstCard.querySelector('.mep-card__vote a').href === json.source.voteUrl);

// Pays
const select = $('#mep-country');
select.value = 'FI';
select.dispatchEvent(new window.Event('change', { bubbles: true }));
const fiCount = json.meps.filter((m) => m.country === 'FI').length;
check(`FI filter -> first page of ${fiCount}`, $$('#mep-module .mep-card').length === Math.min(PAGE, fiCount) && $('.mep-pagination__info').textContent === `Page 1 of ${Math.ceil(fiCount / PAGE)}`);
check('counter follows the filter', $('#mep-module .mep-status').textContent === `${fiCount} out of ${total} representatives shown`, $('#mep-module .mep-status').textContent);
check('bulk button full width above counter', $('#mep-module .mep-bulk button').classList.contains('mep-btn--block') && $('#mep-module .mep-bulk').nextElementSibling === $('#mep-module .mep-status'));
check('bulk button text', $('#mep-module .mep-bulk button') && $('#mep-module .mep-bulk button').textContent === 'Contact all Finland representatives');

// Recherche avec accents et casse
const input = $('#mep-search');
input.value = 'AALTOLA';
input.dispatchEvent(new window.Event('input', { bubbles: true }));
await sleep(250);
check('search 1 result', $$('#mep-module .mep-card').length === 1 && $('.mep-pagination').hidden);
input.value = 'ääl';
input.dispatchEvent(new window.Event('input', { bubbles: true }));
await sleep(250);
check('search strips diacritics', $$('#mep-module .mep-card').length === 1);

// 2. Étape 2
click($('#mep-module .mep-card .mep-btn'));
check('step 2 title', $('#mep-step2-title') && $('#mep-step2-title').textContent === 'Choose a starting point');
check('focus on step title', document.activeElement === $('#mep-step2-title'));
check('stepper synced to 2', $('[data-mep-step="2"]').classList.contains('is-active') && $('[data-mep-step="2"]').getAttribute('aria-current') === 'step' && $('[data-mep-step="1"]').classList.contains('is-done'));
check('writing to name + photo', $('.mep-writing-to__who').textContent === 'Mika AALTOLA, Finland' && $('.mep-writing-to__photo') && $('.mep-writing-to__photo').src.includes('/mepphoto/256810.jpg'), $('.mep-writing-to__who').textContent);
check('selected template shows check', $('.mep-template[aria-pressed="true"] .mep-template__check') !== null);
check('subject prefilled', $('#mep-subject').value.includes('CSAR'));
check('body prefilled', $('#mep-body').value.startsWith('Dear Member of the European Parliament'));
check('long counter visible', !$('.mep-counter').hidden);
const templates = $$('.mep-template');
check('3 templates', templates.length === 3 && templates[0].getAttribute('aria-pressed') === 'true');
click(templates[1]);
check('template switch', templates[1].getAttribute('aria-pressed') === 'true' && $('#mep-body').value.includes('63%') && $('#mep-body').value.length < 1500);
check('counter hidden for short', $('.mep-counter').hidden);
$('#mep-body').value = '';
$('#mep-body').dispatchEvent(new window.Event('input', { bubbles: true }));
click(byText('#mep-module .mep-btn', 'Continue'));
check('empty body blocked', $('#mep-step2-title') && !$('.mep-error-text').hidden);
$('#mep-body').value = 'Hello,\nline two';
$('#mep-body').dispatchEvent(new window.Event('input', { bubbles: true }));
click(byText('#mep-module .mep-btn', 'Continue'));

// 3. Étape 3
check('step 3 title', $('#mep-step3-title') && $('#mep-step3-title').textContent === 'Review and send');
check('stepper synced to 3', $('[data-mep-step="3"]').classList.contains('is-active') && $('[data-mep-step="1"]').classList.contains('is-done') && $('[data-mep-step="2"]').classList.contains('is-done'));
check('to row', $('.mep-preview__row .mep-preview__body').textContent.includes('mika.aaltola@europarl.europa.eu'));
const open = byText('#mep-module a.mep-btn', 'Open in my email app');
check('mailto present', open && open.href.startsWith('mailto:mika.aaltola%40europarl.europa.eu?'));
const u = new URL(open.href);
check('mailto subject', u.searchParams.get('subject') === $('#mep-module .mep-preview__row:nth-child(2) .mep-preview__body').textContent);
check('mailto body CRLF', u.searchParams.get('body') === 'Hello,\r\nline two');
click(byText('#mep-module button.mep-btn', 'Copy email address'));
await sleep(20);
check('clipboard email', clipboard === 'mika.aaltola@europarl.europa.eu', String(clipboard));
check('copied label', byText('#mep-module button.mep-btn', 'Copied'));
check('dataLayer country only', window.dataLayer.length === 1 && window.dataLayer[0].event === 'mep_contact_click' && window.dataLayer[0].country === 'FI' && Object.keys(window.dataLayer[0]).length === 2, JSON.stringify(window.dataLayer));
click(byText('#mep-module button.mep-btn', 'Copy message'));
await sleep(20);
check('clipboard message', clipboard && clipboard.includes('Hello,\nline two'));

// Retour édition puis retour recherche : état conservé
click($$('#mep-module .mep-link').find((b) => b.textContent === 'Edit'));
check('back to step 2 keeps body', $('#mep-body') && $('#mep-body').value === 'Hello,\nline two');
click($('.mep-writing-to .mep-link'));
check('back to step 1 keeps filters', $('#mep-country').value === 'FI' && $('#mep-search').value === 'ääl');

// Bulk
$('#mep-search').value = '';
$('#mep-search').dispatchEvent(new window.Event('input', { bubbles: true }));
await sleep(250);
click($('#mep-module .mep-bulk button'));
check('bulk writing to', $('.mep-writing-to__who').textContent === `All ${fiCount} MEPs in Finland` && !$('.mep-writing-to__photo'), $('.mep-writing-to__who').textContent);
check('bulk template reset to full', $('#mep-body').value.length > 1500);
click(byText('#mep-module .mep-btn', 'Continue'));
check('bulk to row', $('.mep-preview__body').textContent.includes('(BCC)'));
check('bulk copy all label', byText('#mep-module button.mep-btn', `Copy all ${fiCount} email addresses`));
check('bulk long mailto hidden', !byText('#mep-module a.mep-btn', 'Open in my email app'));
check('bulk bcc notice', $('.mep-notice').textContent.includes('BCC'));
click(byText('#mep-module button.mep-btn', 'Copy all'));
await sleep(20);
check('bulk clipboard separator', clipboard.split('; ').length === fiCount && clipboard.includes('@europarl.europa.eu'));

// Zéro résultat + clear
click($('.mep-writing-to .mep-link'));
$('#mep-search').value = 'zzzzzz';
$('#mep-search').dispatchEvent(new window.Event('input', { bubbles: true }));
await sleep(250);
check('empty state', $('.mep-empty') && $('.mep-empty__title').textContent === 'No representatives match that.');
click($('.mep-empty .mep-btn'));
check('clear filters', $$('#mep-module .mep-card').length === PAGE && $('#mep-country').value === '' && $('.mep-pagination__info').textContent === `Page 1 of ${pageCount}`);

// DPIA
check('no storage used', window.localStorage.length === 0 && window.sessionStorage.length === 0 && document.cookie === '');
check('no name/email in dataLayer', !/@|Aaltola|AALTOLA/.test(JSON.stringify(window.dataLayer)));
check('url untouched', window.location.href === 'https://iwf-mojo.webflow.io/contact-your-mep');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
