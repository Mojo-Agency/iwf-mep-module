// Étape 3 : envoyer (aperçu lecture seule, mailto, presse-papiers, mode bulk en BCC).
import { h, prettyName, copyText, flashLabel, buildMailto } from '../ui.js';
import { countryLabel } from '../data.js';
import { trackContactClick } from '../analytics.js';
import { COPY, BULK_SEPARATOR, MAILTO_SOFT_LIMIT } from '../templates.js';
import { writingToBar } from './step2-write.js';

export function renderStep3(ctx) {
  const { state, goTo, announce } = ctx;
  const sel = state.selectedMep;
  if (!sel || !state.body) { goTo(sel ? 2 : 1, { focus: false }); return null; }

  const isBulk = Boolean(sel.bulk);
  const recipients = isBulk ? sel.meps : [sel];
  const emails = recipients.map((m) => m.email);
  const country = isBulk ? sel.country : sel.country;
  const toLabel = isBulk
    ? `${COPY.allMepsIn(recipients.length, countryLabel(country))} (BCC)`
    : `${prettyName(sel)} ${sel.email}`;

  const mailto = buildMailto({
    to: isBulk ? '' : sel.email,
    bcc: isBulk ? emails : [],
    subject: state.subject,
    body: state.body,
  });
  const mailtoTooLong = mailto.length > MAILTO_SOFT_LIMIT;

  const row = (key, value, editable = true) => h('div', { class: 'mep-preview__row' },
    h('span', { class: 'mep-preview__key', text: key }),
    typeof value === 'string' ? h('p', { class: 'mep-preview__body', text: value }) : value,
    editable ? h('button', { type: 'button', class: 'mep-link', text: COPY.edit, 'aria-label': `${COPY.edit} ${key.toLowerCase()}`, onclick: () => goTo(2) }) : h('span'),
  );

  async function copy(button, value, done) {
    const ok = await copyText(value);
    if (ok) {
      flashLabel(button, COPY.copied);
      announce(done);
    } else {
      announce(COPY.copyFailed);
      fallback.hidden = false;
      fallback.value = value;
      fallback.focus();
      fallback.select();
    }
  }

  const fallback = h('textarea', { class: 'mep-input mep-textarea mep-fallback', rows: 4, readonly: true, hidden: true, 'aria-label': 'Text to copy manually' });

  const copyMessageBtn = h('button', { type: 'button', class: 'mep-btn mep-btn--outline', text: COPY.copyMessage });
  copyMessageBtn.addEventListener('click', () => copy(copyMessageBtn, `${state.subject}\n\n${state.body}`, 'Message copied'));

  const copyEmailBtn = h('button', { type: 'button', class: 'mep-btn mep-btn--outline', text: isBulk ? COPY.copyAllEmails(emails.length) : COPY.copyEmail });
  copyEmailBtn.addEventListener('click', () => {
    trackContactClick(country);
    copy(copyEmailBtn, emails.join(BULK_SEPARATOR), isBulk ? `${emails.length} addresses copied` : 'Email address copied');
  });

  const openBtn = h('a', {
    class: 'mep-btn',
    href: mailto,
    text: COPY.openEmail,
    onclick: () => { trackContactClick(country); },
  });

  const actions = h('div', { class: 'mep-actions' }, copyMessageBtn, copyEmailBtn);
  if (!(isBulk && mailtoTooLong)) actions.append(openBtn);

  const section = h('section', { class: 'mep-step', 'aria-labelledby': 'mep-step3-title' },
    writingToBar(ctx),
    h('h2', { class: 'mep-step__title', id: 'mep-step3-title', tabindex: '-1', text: COPY.step3Title }),
    h('div', { class: 'mep-preview' },
      row(COPY.to, toLabel, false),
      row(COPY.subject, state.subject),
      row(COPY.message, state.body),
    ),
    isBulk
      ? h('div', { class: 'mep-notice' }, h('strong', { text: COPY.beforeYouSend }), ' ', COPY.bccNotice)
      : h('p', { class: 'mep-notice', text: COPY.sendNotice }),
    mailtoTooLong ? h('p', { class: 'mep-counter', text: COPY.longMessage }) : null,
    actions,
    fallback,
    h('p', { class: 'mep-note mep-after' },
      COPY.afterSend, ' ',
      h('a', { href: '/', text: COPY.shareLink }),
    ),
  );
  return section;
}
