// Helpers DOM et utilitaires partagés par les étapes. Aucune donnée ne passe par innerHTML.

/** Attributs des noms propres (député, parti, groupe, e-mail) : ni Weglot ni le navigateur ne les traduisent. */
export const NO_TRANSLATE = Object.freeze({ translate: 'no', 'data-wg-notranslate': '' });

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** "2026-07-09" -> "09.07.26" (le design montre "07.9.26", format à confirmer avec Mojo). */
export function formatVoteDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : '';
}

export function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

/** "Mika" + "AALTOLA" -> "Mika Aaltola" (les noms de famille du CSV sont en capitales). */
export function prettyName(mep) {
  const last = String(mep.last || '');
  const cased = last === last.toUpperCase()
    ? last.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase())
    : last;
  return [mep.first, cased].filter(Boolean).join(' ') || mep.name;
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Copie dans le presse-papiers : API moderne en contexte sécurisé, sinon repli execCommand. */
export async function copyText(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* on tente le repli */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Remplace le libellé d'un bouton pendant 2 s ("Copied ✓") puis le restaure (icône comprise). */
export function flashLabel(button, label, ms = 2000) {
  if (button.dataset.flashing) return;
  const original = [...button.childNodes];
  button.dataset.flashing = '1';
  button.replaceChildren(document.createTextNode(label));
  button.classList.add('is-copied');
  setTimeout(() => {
    button.replaceChildren(...original);
    button.classList.remove('is-copied');
    delete button.dataset.flashing;
  }, ms);
}

// Icônes statiques (aucune donnée injectée) : SVG inline via un gabarit HTML.
const ICONS = {
  copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.9 2H22l-7.2 8.3L23.2 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L2 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.9 8.5H3.4V21h3.5V8.5zM5.2 3a2 2 0 1 0 0 4.1 2 2 0 0 0 0-4.1zM21 13.4c0-3.6-2-5.2-4.5-5.2-2 0-2.9 1.1-3.4 1.9V8.5H9.6V21h3.5v-6.9c0-1.8.4-3.6 2.6-3.6 2.2 0 2.2 2.1 2.2 3.7V21H21v-7.6z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.3h2.8V22h3.4z"/></svg>',
};
export function icon(name) {
  const tpl = document.createElement('template');
  tpl.innerHTML = ICONS[name] || '';
  const svg = tpl.content.firstElementChild;
  if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.classList.add('mep-icon'); }
  return svg;
}

/** Construit un lien mailto avec encodage strict et fins de ligne CRLF (Outlook). */
export function buildMailto({ to = '', bcc = [], subject = '', body = '' }) {
  const params = [];
  if (bcc.length) params.push(`bcc=${encodeURIComponent(bcc.join(','))}`);
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body.replace(/\r?\n/g, '\r\n'))}`);
  return `mailto:${encodeURIComponent(to)}${params.length ? '?' + params.join('&') : ''}`;
}
