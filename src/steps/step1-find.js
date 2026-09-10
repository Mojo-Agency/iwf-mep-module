// Étape 1 : trouver son député (pays, recherche, grille, bulk, états vide/erreur).
import { h, debounce, formatVoteDate, initials } from '../ui.js';
import { search, countriesOf, countryLabel } from '../data.js';
import { COPY } from '../templates.js';

function renderCard(mep, ctx) {
  const { data, state, goTo } = ctx;
  const photo = h('img', {
    class: 'mep-card__photo',
    src: mep.photo,
    alt: '',
    loading: 'lazy',
    width: 72,
    height: 72,
    onerror: (e) => {
      e.target.replaceWith(h('span', { class: 'mep-card__photo', 'aria-hidden': 'true', text: initials(mep.name) }));
    },
  });
  const countryParty = [countryLabel(mep.country), mep.party].filter(Boolean).join('  ');
  const groupFull = data.groups && data.groups[mep.group] ? `${mep.group} (${data.groups[mep.group]})` : mep.group;

  return h('li', { class: 'mep-card' },
    h('div', { class: 'mep-card__head' },
      photo,
      h('div', {},
        h('h3', { class: 'mep-card__name', text: mep.name }),
        h('p', { class: 'mep-card__meta', text: countryParty }),
        h('p', { class: 'mep-card__meta', text: groupFull }),
      ),
    ),
    h('div', { class: `mep-card__vote mep-card__vote--${mep.vote}` },
      h('span', {},
        h('span', { class: 'mep-card__vote-kicker', text: COPY.voteKicker(formatVoteDate(data.voteDate)) }),
        h('span', { class: 'mep-card__vote-label', text: mep.label }),
      ),
      h('a', { href: mep.voteUrl, target: '_blank', rel: 'noopener', text: COPY.source, 'aria-label': `${COPY.source}: vote of ${mep.name}` }),
    ),
    h('div', { class: 'mep-card__actions' },
      h('button', {
        type: 'button',
        class: 'mep-btn mep-btn--block',
        'aria-label': `${COPY.writeTo}: ${mep.name}`,
        text: COPY.writeTo,
        onclick: () => {
          state.selectedMep = mep;
          state.template = null;
          goTo(2);
        },
      }),
    ),
  );
}

export function renderStep1(ctx) {
  const { data, index, state, goTo, announce } = ctx;
  const countries = countriesOf(data.meps);

  const select = h('select', { class: 'mep-select', id: 'mep-country', name: 'country' },
    h('option', { value: '', text: COPY.allCountries }),
    countries.map((c) => h('option', { value: c.code, text: c.label, selected: state.country === c.code })),
  );
  const input = h('input', {
    class: 'mep-input', id: 'mep-search', type: 'search', name: 'q',
    placeholder: COPY.searchPlaceholder, autocomplete: 'off', value: state.query,
  });
  const countEl = h('p', { class: 'mep-status' });
  const bulkWrap = h('div', { class: 'mep-bulk' });
  const grid = h('ul', { class: 'mep-grid' });

  function update() {
    const results = search(index, { country: state.country, query: state.query });
    grid.replaceChildren();
    bulkWrap.replaceChildren();

    if (state.country) {
      const all = data.meps.filter((m) => m.country === state.country);
      const label = countryLabel(state.country);
      bulkWrap.append(h('button', {
        type: 'button',
        class: 'mep-btn mep-btn--outline',
        text: COPY.contactAll(label),
        onclick: () => {
          state.selectedMep = { bulk: true, country: state.country, meps: all };
          state.template = null;
          goTo(2);
        },
      }));
    }

    if (!results.length) {
      grid.append(h('li', { class: 'mep-empty' },
        h('p', { class: 'mep-empty__title', text: COPY.noResult }),
        h('p', { text: COPY.noResultHint }),
        h('button', {
          type: 'button', class: 'mep-btn mep-btn--outline', text: COPY.clearFilters,
          onclick: () => {
            state.country = null; state.query = '';
            select.value = ''; input.value = '';
            update();
            select.focus();
          },
        }),
      ));
    } else {
      const frag = document.createDocumentFragment();
      for (const mep of results) frag.append(renderCard(mep, ctx));
      grid.append(frag);
    }

    const msg = COPY.shown(results.length, data.meps.length);
    countEl.textContent = msg;
    announce(msg);
  }

  select.addEventListener('change', () => { state.country = select.value || null; update(); });
  input.addEventListener('input', debounce(() => { state.query = input.value; update(); }, 150));

  const section = h('section', { class: 'mep-step', 'aria-labelledby': 'mep-step1-title' },
    h('h2', { class: 'mep-step__title', id: 'mep-step1-title', tabindex: '-1', text: COPY.step1Title }),
    h('div', { class: 'mep-toolbar' },
      h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-country', text: COPY.countryLabel }), select),
      h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-search', text: COPY.searchPlaceholder }), input),
    ),
    h('div', { class: 'mep-results-bar' }, countEl, bulkWrap),
    grid,
  );
  update();
  return section;
}
