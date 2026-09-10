// Bootstrap du module : injection du CSS, chargement des données, montage sur #mep-module,
// navigation entre les 3 étapes (un seul render par étape, état en mémoire uniquement).
import css from './styles.css?inline';
import { state, reset } from './state.js';
import { loadMeps, hydrate, buildIndex } from './data.js';
import { h, prefersReducedMotion } from './ui.js';
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

async function mount() {
  const el = document.getElementById(MOUNT_ID);
  if (!el) return;
  injectStyles();
  root = el;
  liveRegion = h('p', { class: 'mep-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  root.replaceChildren(h('div', { class: 'mep-skeleton', 'aria-hidden': 'true' }), liveRegion);
  try {
    reset();
    const data = hydrate(await loadMeps(resolveDataUrl(el)));
    ctx = { data, index: buildIndex(data.meps), state, goTo, announce };
    render({ focus: false });
  } catch (err) {
    root.replaceChildren(
      liveRegion,
      h('div', { class: 'mep-error', role: 'alert' },
        h('p', { text: 'We could not load the list of MEPs. Please refresh the page or try again later.' }),
        h('button', { type: 'button', class: 'mep-btn mep-btn--outline', text: 'Try again', onclick: () => mount() }),
      ),
    );
    console.error('[mep-module]', err);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
