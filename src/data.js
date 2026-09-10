// Chargement du JSON et index de recherche (nom + parti + groupe, sans diacritiques).

export async function loadMeps(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`meps.json HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.meps)) throw new Error('meps.json: format inattendu');
  return data;
}

/** Reconstruit les champs dérivés (photo, profil, source, libellé) depuis les gabarits du JSON. */
export function hydrate(data) {
  const photoBase = data.photoBase || 'https://www.europarl.europa.eu/mepphoto/{id}.jpg';
  const profileBase = data.profileBase || 'https://www.europarl.europa.eu/meps/en/{id}';
  const voteUrl = (data.source && data.source.voteUrl) || '';
  const labels = data.voteLabels || {};
  for (const m of data.meps) {
    if (!m.photo) m.photo = photoBase.replace('{id}', m.id);
    if (!m.profile) m.profile = profileBase.replace('{id}', m.id);
    if (!m.voteUrl) m.voteUrl = voteUrl;
    m.label = labels[m.vote] || m.vote;
  }
  return data;
}

export function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function buildIndex(meps) {
  return meps.map((mep) => ({
    mep,
    key: normalize(`${mep.name} ${mep.party} ${mep.group}`),
  }));
}

export function search(index, { country = null, query = '' } = {}) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const out = [];
  for (const { mep, key } of index) {
    if (country && mep.country !== country) continue;
    if (terms.length && !terms.every((t) => key.includes(t))) continue;
    out.push(mep);
  }
  return out;
}

/** Nom du pays dans la langue de la page (Weglot), repli anglais puis code. */
export function countryLabel(code, lang = 'en') {
  for (const locale of lang === 'en' ? ['en'] : [lang, 'en']) {
    try {
      const label = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
      if (label) return label;
    } catch { /* locale ou code inconnu */ }
  }
  return code;
}

export function countriesOf(meps, lang = 'en') {
  const codes = [...new Set(meps.map((m) => m.country))];
  const compare = (a, b) => { try { return a.localeCompare(b, lang); } catch { return a.localeCompare(b); } };
  return codes
    .map((code) => ({ code, label: countryLabel(code, lang) }))
    .sort((a, b) => compare(a.label, b.label));
}
