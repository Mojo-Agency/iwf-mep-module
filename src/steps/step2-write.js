// Étape 2 : rédiger (barre "Writing to", 3 modèles, objet et corps éditables, compteur).
import { h, prettyName } from '../ui.js';
import { countryLabel } from '../data.js';
import { COPY, SUBJECT, TEMPLATES, BODY_WARN_LENGTH } from '../templates.js';

export function writingToBar(ctx) {
  const { state, goTo } = ctx;
  const sel = state.selectedMep;
  const who = sel.bulk
    ? COPY.allMepsIn(sel.meps.length, countryLabel(sel.country))
    : `${prettyName(sel)}, ${countryLabel(sel.country)}`;
  return h('div', { class: 'mep-writing-to' },
    h('span', { class: 'mep-writing-to__label', text: COPY.writingTo }),
    h('strong', { class: 'mep-writing-to__who', text: who }),
    h('button', { type: 'button', class: 'mep-link', text: COPY.change, onclick: () => goTo(1) }),
  );
}

export function renderStep2(ctx) {
  const { state, goTo, announce } = ctx;
  if (!state.selectedMep) { goTo(1, { focus: false }); return null; }

  if (state.template === null) {
    state.template = 0;
    state.subject = SUBJECT;
    state.body = TEMPLATES[0].body;
  }

  const subject = h('input', { class: 'mep-input', id: 'mep-subject', type: 'text', name: 'subject', value: state.subject, autocomplete: 'off' });
  const body = h('textarea', { class: 'mep-input mep-textarea', id: 'mep-body', name: 'body', rows: 18, spellcheck: 'true' });
  body.value = state.body;
  const counter = h('p', { class: 'mep-counter', role: 'status', hidden: true });
  const error = h('p', { class: 'mep-error-text', role: 'alert', hidden: true });

  function updateCounter() {
    const long = body.value.length > BODY_WARN_LENGTH;
    counter.hidden = !long;
    counter.textContent = long ? `${body.value.length} characters. ${COPY.longMessage}` : '';
  }

  const cards = TEMPLATES.map((t, i) => h('button', {
    type: 'button',
    class: 'mep-template',
    'aria-pressed': String(i === state.template),
    onclick: () => {
      state.template = i;
      state.subject = SUBJECT;
      state.body = t.body;
      subject.value = state.subject;
      body.value = state.body;
      cards.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
      updateCounter();
      announce(`${t.title} selected. Subject and message updated.`);
    },
  },
    h('span', { class: 'mep-template__title', text: t.title }),
    h('span', { class: 'mep-template__desc', text: t.description }),
  ));

  subject.addEventListener('input', () => { state.subject = subject.value; });
  body.addEventListener('input', () => { state.body = body.value; updateCounter(); });

  const section = h('section', { class: 'mep-step', 'aria-labelledby': 'mep-step2-title' },
    writingToBar(ctx),
    h('h2', { class: 'mep-step__title', id: 'mep-step2-title', tabindex: '-1', text: COPY.step2Title }),
    h('div', { class: 'mep-templates', role: 'group', 'aria-label': COPY.step2Title }, cards),
    h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-subject', text: COPY.subject }), subject),
    h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-body', text: COPY.message }), body, counter),
    h('p', { class: 'mep-note', text: COPY.editNote }),
    error,
    h('div', { class: 'mep-actions' },
      h('button', {
        type: 'button', class: 'mep-btn', text: COPY.continueBtn,
        onclick: () => {
          state.subject = subject.value.trim();
          state.body = body.value.trim();
          if (!state.subject || !state.body) {
            error.hidden = false;
            error.textContent = COPY.emptyFields;
            (state.subject ? body : subject).focus();
            return;
          }
          goTo(3);
        },
      }),
    ),
  );
  updateCounter();
  return section;
}
