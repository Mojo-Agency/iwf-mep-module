// Étape 2 : rédiger (vignette "Writing to" avec photo, 3 cases de choix, objet et corps éditables,
// bouton Continue pleine largeur, compteur et note en dessous).
import { h, NO_TRANSLATE } from '../ui.js';
import { countryLabel } from '../data.js';
import { BODY_WARN_LENGTH } from '../templates.js';

export function writingToBar(ctx) {
  const { state, goTo, t, lang } = ctx;
  const sel = state.selectedMep;
  // Le nom du député n'est jamais traduit ; le pays suit la langue de la page.
  const who = sel.bulk
    ? h('strong', { class: 'mep-writing-to__who', text: t('allMepsIn', { n: sel.meps.length, country: countryLabel(sel.country, lang) }) })
    : h('strong', { class: 'mep-writing-to__who' }, h('span', { ...NO_TRANSLATE, text: sel.name }), `, ${countryLabel(sel.country, lang)}`);
  const photo = sel.bulk
    ? null
    : h('img', {
      class: 'mep-writing-to__photo', src: sel.photo, alt: '', width: 56, height: 56, loading: 'lazy',
      onerror: (e) => e.target.remove(),
    });
  return h('div', { class: 'mep-writing-to' },
    photo,
    h('div', { class: 'mep-writing-to__text' },
      h('span', { class: 'mep-writing-to__label', text: t('writingTo') }),
      who,
    ),
    h('button', { type: 'button', class: 'mep-link', text: t('change'), onclick: () => goTo(1) }),
  );
}

export function renderStep2(ctx) {
  const { state, goTo, announce, t, templates } = ctx;
  if (!state.selectedMep) { goTo(1, { focus: false }); return null; }

  if (state.template === null) {
    state.template = 0;
    state.subject = templates[0].subject;
    state.body = templates[0].body;
  }

  const subject = h('input', { class: 'mep-input', id: 'mep-subject', type: 'text', name: 'subject', value: state.subject, autocomplete: 'off' });
  const body = h('textarea', { class: 'mep-input mep-textarea', id: 'mep-body', name: 'body', rows: 18, spellcheck: 'true' });
  body.value = state.body;
  const counter = h('p', { class: 'mep-counter', role: 'status', hidden: true });
  const error = h('p', { class: 'mep-error-text', role: 'alert', hidden: true });

  function updateCounter() {
    const long = body.value.length > BODY_WARN_LENGTH;
    counter.hidden = !long;
    counter.textContent = long ? `${t('characters', { n: body.value.length })} ${t('longMessage')}` : '';
  }

  const cards = templates.map((tpl, i) => h('button', {
    type: 'button',
    class: 'mep-template',
    'aria-pressed': String(i === state.template),
    onclick: () => {
      state.template = i;
      state.subject = tpl.subject;
      state.body = tpl.body;
      subject.value = state.subject;
      body.value = state.body;
      cards.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
      updateCounter();
      announce(t('templateSelected', { title: tpl.title }));
    },
  },
    h('span', { class: 'mep-template__head' },
      h('span', { class: 'mep-template__title', text: tpl.title }),
      h('span', { class: 'mep-template__check', 'aria-hidden': 'true', text: '✓' }),
    ),
    h('span', { class: 'mep-template__desc', text: tpl.description }),
  ));

  subject.addEventListener('input', () => { state.subject = subject.value; });
  body.addEventListener('input', () => { state.body = body.value; updateCounter(); });

  const section = h('section', { class: 'mep-step mep-step--2', 'aria-labelledby': 'mep-step2-title' },
    writingToBar(ctx),
    h('h2', { class: 'mep-step__title', id: 'mep-step2-title', tabindex: '-1', text: t('step2Title') }),
    h('div', { class: 'mep-templates', role: 'group', 'aria-label': t('step2Title') }, cards),
    h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-subject', text: t('subject') }), subject),
    h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-body', text: t('message') }), body),
    error,
    h('button', {
      type: 'button', class: 'mep-btn mep-btn--block', text: t('continueBtn'),
      onclick: () => {
        state.subject = subject.value.trim();
        state.body = body.value.trim();
        if (!state.subject || !state.body) {
          error.hidden = false;
          error.textContent = t('emptyFields');
          (state.subject ? body : subject).focus();
          return;
        }
        goTo(3);
      },
    }),
    counter,
    h('p', { class: 'mep-note', text: t('editNote') }),
  );
  updateCounter();
  return section;
}
