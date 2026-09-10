// Étape 1 : trouver son député (pays, recherche, grille paginée 9 par page, bulk, état vide).
import { h, debounce, formatVoteDate, initials, prefersReducedMotion } from '../ui.js';
import { search, countriesOf, countryLabel } from '../data.js';
import { COPY, PAGE_SIZE } from '../templates.js';

function renderCard(mep, ctx) {
  const { data, state, goTo } = ctx;
  const photo = h('img', {
    class: 'mep-card__photo',
    src: mep.photo,
    alt: '',
    loading: 'lazy',
    width: 80,
    height: 80,
    onerror: (e) => {
      e.target.replaceWith(h('span', { class: 'mep-card__photo', 'aria-hidden': 'true', text: initials(mep.name) }));
    },
  });
  const countryParty = [countryLabel(mep.country), mep.party].filter(Boolean).join('  ');
  const groupFull = data.groups && data.groups[mep.group] ? `${mep.group} (${data.groups[mep.group]})` : mep.group;

  return h('li', { class: 'mep-card' },
    h('div', { class: 'mep-card__head' },
      photo,
      h('div', { class: 'mep-card__identity' },
        h('h3', { class: 'mep-card__name', text: mep.name }),
        h('p', { class: 'mep-card__meta', text: countryParty }),
        h('p', { class: 'mep-card__meta', text: groupFull }),
      ),
    ),
    h('div', { class: `mep-card__vote mep-card__vote--${mep.vote}` },
      h('div', { class: 'mep-card__vote-row' },
        h('span', { class: 'mep-card__vote-kicker', text: COPY.voteKicker(formatVoteDate(data.voteDate)) }),
        h('a', { class: 'mep-card__vote-source', href: mep.voteUrl, target: '_blank', rel: 'noopener', text: COPY.source, 'aria-label': `${COPY.source}: vote of ${mep.name}` }),
      ),
      h('span', { class: 'mep-card__vote-label', text: mep.label }),
    ),
    h('div', { class: 'mep-card__actions' },
      h('button', {
        type: 'button',
        class: 'mep-btn mep-btn--outline mep-btn--block',
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

function renderPagination(page, pageCount, onPage) {
  const nav = h('nav', { class: 'mep-pagination', 'aria-label': COPY.pagination });
  if (pageCount <= 1) { nav.hidden = true; return nav; }
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const pages = [...wanted].sort((a, b) => a - b);
  const items = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) items.push(h('span', { class: 'mep-pagination__gap', 'aria-hidden': 'true', text: '…' }));
    items.push(h('button', {
      type: 'button',
      class: 'mep-pagination__page',
      'aria-current': p === page ? 'page' : null,
      'aria-label': COPY.pageLabel(p),
      text: String(p),
      onclick: () => onPage(p),
    }));
    prev = p;
  }
  nav.append(
    h('button', { type: 'button', class: 'mep-pagination__nav', disabled: page === 1, 'aria-label': COPY.prevPage, text: '←', onclick: () => onPage(page - 1) }),
    h('div', { class: 'mep-pagination__pages' }, items),
    h('button', { type: 'button', class: 'mep-pagination__nav', disabled: page === pageCount, 'aria-label': COPY.nextPage, text: '→', onclick: () => onPage(page + 1) }),
    h('p', { class: 'mep-pagination__info', text: COPY.pageInfo(page, pageCount) }),
  );
  return nav;
}

export function renderStep1(ctx) {
  const { data, index, state, goTo, announce } = ctx;
  const countries = countriesOf(data.meps);

  const select = h('select', { class: 'mep-select', id: 'mep-country', name: 'country' },
    h('option', { value: '', text: COPY.allCountries }),
    countries.map((c) => h('option', { value: c.code, text: c.label, selected: state.country === c.code })),
  );
  const input = h('input', {
    class: 'mep-input mep-input--search', id: 'mep-search', type: 'search', name: 'q',
    placeholder: COPY.searchPlaceholder, autocomplete: 'off', value: state.query,
  });
  const countEl = h('p', { class: 'mep-status' });
  const bulkWrap = h('div', { class: 'mep-bulk' });
  const resultsBar = h('div', { class: 'mep-results-bar' }, countEl, bulkWrap);
  const grid = h('ul', { class: 'mep-grid', tabindex: '-1' });
  const pagerWrap = h('div', { class: 'mep-pager' });

  function goPage(page) {
    state.page = page;
    update({ focusResults: true });
  }

  function update({ focusResults = false } = {}) {
    const results = search(index, { country: state.country, query: state.query });
    const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page || 1), pageCount);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = results.slice(start, start + PAGE_SIZE);

    grid.replaceChildren();
    bulkWrap.replaceChildren();
    pagerWrap.replaceChildren(renderPagination(state.page, pageCount, goPage));

    if (state.country) {
      const all = data.meps.filter((m) => m.country === state.country);
      bulkWrap.append(h('button', {
        type: 'button',
        class: 'mep-btn',
        text: COPY.contactAll(countryLabel(state.country)),
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
            state.country = null; state.query = ''; state.page = 1;
            select.value = ''; input.value = '';
            update();
            select.focus();
          },
        }),
      ));
    } else {
      const frag = document.createDocumentFragment();
      for (const mep of pageItems) frag.append(renderCard(mep, ctx));
      grid.append(frag);
    }

    countEl.textContent = COPY.shown(pageItems.length, data.meps.length);
    announce(results.length ? COPY.resultsAnnounce(results.length, start + 1, start + pageItems.length) : COPY.noResult);

    if (focusResults) {
      try { resultsBar.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }); } catch { /* noop */ }
      grid.focus({ preventScroll: true });
    }
  }

  select.addEventListener('change', () => { state.country = select.value || null; state.page = 1; update(); });
  input.addEventListener('input', debounce(() => { state.query = input.value; state.page = 1; update(); }, 150));

  const section = h('section', { class: 'mep-step', 'aria-labelledby': 'mep-step1-title' },
    h('h2', { class: 'mep-step__title', id: 'mep-step1-title', tabindex: '-1', text: COPY.step1Title }),
    h('div', { class: 'mep-toolbar' },
      h('div', { class: 'mep-field' }, h('label', { class: 'mep-field__label', for: 'mep-country', text: COPY.countryLabel }), select),
      h('div', { class: 'mep-field mep-field--search' }, h('label', { class: 'mep-field__label mep-sr-only', for: 'mep-search', text: COPY.searchPlaceholder }), input),
    ),
    resultsBar,
    grid,
    pagerWrap,
  );
  update();
  return section;
}
