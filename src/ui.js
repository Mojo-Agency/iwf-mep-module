// Helpers DOM et utilitaires partagés par les étapes. Aucune donnée ne passe par innerHTML.

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

/** Remplace le libellé d'un bouton pendant 2 s ("Copied ✓") puis le restaure. */
export function flashLabel(button, label, ms = 2000) {
  if (button.dataset.flashing) return;
  const original = button.textContent;
  button.dataset.flashing = '1';
  button.textContent = label;
  button.classList.add('is-copied');
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove('is-copied');
    delete button.dataset.flashing;
  }, ms);
}

/** Construit un lien mailto avec encodage strict et fins de ligne CRLF (Outlook). */
export function buildMailto({ to = '', bcc = [], subject = '', body = '' }) {
  const params = [];
  if (bcc.length) params.push(`bcc=${encodeURIComponent(bcc.join(','))}`);
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body.replace(/\r?\n/g, '\r\n'))}`);
  return `mailto:${encodeURIComponent(to)}${params.length ? '?' + params.join('&') : ''}`;
}
