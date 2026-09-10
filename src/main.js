// Bootstrap du module : injection du CSS, chargement des données et des traductions (Weglot),
// montage sur #mep-module, navigation entre les 3 étapes (un seul render par étape, état en mémoire).
import css from './styles.css?inline';
import { state, reset } from './state.js';
import { loadMeps, hydrate, buildIndex } from './data.js';
import { h, prefersReducedMotion } from './ui.js';
import { STRINGS } from './templates.js';
import { currentLang, whenWeglotReady, onLanguageChange, translateWords, baseWords, buildI18n } from './i18n.js';
import { renderStep1 } from './steps/step1-find.js';
import { renderStep2 } from './steps/step2-write.js';
import { renderStep3 } from './steps/step3-send.js';

const MOUNT_ID = 'mep-module';
// Lu au chargement du script (IIFE) : indisponible plus tard dans les callbacks.
const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';

const STEPS = { 1: renderStep1, 2: renderStep2, 3: renderStep3 };

let root = null;
let liveRegion = null;
let ctx = null;
let data = null;
let listening = false;
let languageRequest = 0;

function resolveDataUrl(mount) {
  if (mount.dataset.src) return mount.dataset.src;
  if (window.MEP_MODULE_DATA_URL) return window.MEP_MODULE_DATA_URL;
  // Prod : https://cdn.jsdelivr.net/gh/<owner>/iwf-mep-module@vX.Y.Z/dist/mep-module.min.js
  //        -> https://cdn.jsdelivr.net/gh/<owner>/iwf-mep-module@vX.Y.Z/data/meps.json
  if (SCRIPT_SRC) return new URL('../data/meps.json', SCRIPT_SRC).href;
  return '/data/meps.json';
}

function injectStyles() {
  if (document.querySelector('style[data-mep-module]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-mep-module', '');
  style.textContent = css;
  document.head.appendChild(style);
}

/** Synchronise le stepper natif de la page Webflow ([data-mep-step="1|2|3"]). */
export function syncStepper(step) {
  document.querySelectorAll('[data-mep-step]').forEach((el) => {
    const n = Number(el.getAttribute('data-mep-step'));
    el.classList.toggle('is-active', n === step);
    el.classList.toggle('is-done', n < step);
    if (n === step) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
}

function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  // Un léger délai garantit l'annonce même si le texte est identique au précédent.
  setTimeout(() => { liveRegion.textContent = message; }, 50);
}

function render({ focus = true } = {}) {
  const section = STEPS[state.step](ctx);
  if (!section) return; // l'étape a redirigé
  root.replaceChildren(liveRegion, section);
  syncStepper(state.step);
  if (focus) {
    const title = section.querySelector('.mep-step__title');
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    try { root.scrollIntoView({ behavior, block: 'start' }); } catch { /* vieux navigateurs */ }
    if (title) title.focus({ preventScroll: true });
  }
}

function goTo(step, opts = {}) {
  state.step = step;
  render(opts);
}

/** Bascule de langue Weglot dans la page : nouveaux textes, étape courante re-rendue sans perdre l'état. */
async function applyLanguage(lang) {
  if (!ctx || lang === ctx.lang) return;
  const request = ++languageRequest;
  const before = ctx.templates;
  const next = await buildI18n(lang, data);
  if (!ctx || request !== languageRequest) return; // une autre bascule est arrivée entre-temps
  // L'objet et le message suivent la langue tant que le citoyen ne les a pas modifiés.
  if (state.template !== null && before[state.template] && next.templates[state.template]) {
    const was = before[state.template];
    const now = next.templates[state.template];
    if (state.subject === was.subject) state.subject = now.subject;
    if (state.body === was.body) state.body = now.body;
  }
  Object.assign(ctx, next);
  render({ focus: false });
}

async function mount() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  injectStyles();
  root = el;
  // Weglot ne doit pas retraduire le module : il rend lui-même les textes traduits (src/i18n.js).
  root.setAttribute('data-wg-notranslate', '');
  liveRegion = h('p', { class: 'mep-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  root.replaceChildren(h('div', { class: 'mep-skeleton', 'aria-hidden': 'true' }), liveRegion);
  try {
    reset();
    await whenWeglotReady();
    const lang = currentLang();
    // Données et traductions de l'interface en parallèle ; les libellés de vote viennent du JSON.
    const [loaded] = await Promise.all([loadMeps(resolveDataUrl(el)), translateWords(lang, baseWords())]);
    data = hydrate(loaded);
    const i18n = await buildI18n(lang, data);
    ctx = { data, index: buildIndex(data.meps), state, goTo, announce, ...i18n };
    if (!listening) { listening = true; onLanguageChange(applyLanguage); }
    render({ focus: false });
  } catch (err) {
    const i18n = await buildI18n(currentLang(), null).catch(() => null);
    const t = i18n ? i18n.t : (key) => STRINGS[key];
    root.replaceChildren(
      liveRegion,
      h('div', { class: 'mep-error', role: 'alert' },
        h('p', { text: t('loadError') }),
        h('button', { type: 'button', class: 'mep-btn mep-btn--outline', text: t('tryAgain'), onclick: () => mount() }),
      ),
    );
    console.error('[mep-module]', err);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
