// Étape 3 : aperçu et envoi (mailto, presse-papiers, mode bulk en BCC, partage), selon la maquette STEP 03.
import { h, icon, prettyName, copyText, flashLabel, buildMailto } from '../ui.js';
import { countryLabel } from '../data.js';
import { trackContactClick } from '../analytics.js';
import { COPY, BULK_SEPARATOR, MAILTO_SOFT_LIMIT, SHARE } from '../templates.js';
import { writingToBar } from './step2-write.js';

export function renderStep3(ctx) {
  const { state, goTo, announce } = ctx;
  const sel = state.selectedMep;
  if (!sel || !state.body) { goTo(sel ? 2 : 1, { focus: false }); return null; }

  const isBulk = Boolean(sel.bulk);
  const recipients = isBulk ? sel.meps : [sel];
  const emails = recipients.map((m) => m.email);
  const country = sel.country;

  const mailto = buildMailto({
    to: isBulk ? '' : sel.email,
    bcc: isBulk ? emails : [],
    subject: state.subject,
    body: state.body,
  });
  const mailtoTooLong = mailto.length > MAILTO_SOFT_LIMIT;

  const editLink = (what) => h('button', {
    type: 'button', class: 'mep-link', text: COPY.edit, 'aria-label': `${COPY.edit} ${what.toLowerCase()}`, onclick: () => goTo(2),
  });

  // Aperçu : To / Subject sur une ligne, Message en libellé au-dessus du texte.
  const toValue = isBulk
    ? h('p', { class: 'mep-preview__body', text: `${COPY.allMepsIn(recipients.length, countryLabel(country))} (BCC)` })
    : h('p', { class: 'mep-preview__body' }, prettyName(sel), ' ', h('span', { class: 'mep-preview__email', text: sel.email }));
  const preview = h('div', { class: 'mep-preview' },
    h('div', { class: 'mep-preview__row' }, h('span', { class: 'mep-preview__key', text: COPY.to }), toValue, h('span')),
    h('div', { class: 'mep-preview__row' }, h('span', { class: 'mep-preview__key', text: COPY.subject }), h('p', { class: 'mep-preview__body', text: state.subject }), editLink(COPY.subject)),
    h('div', { class: 'mep-preview__message' },
      h('div', { class: 'mep-preview__head' }, h('span', { class: 'mep-preview__key', text: COPY.message }), editLink(COPY.message)),
      h('p', { class: 'mep-preview__body mep-preview__body--message', text: state.body }),
    ),
  );

  // Presse-papiers avec repli visible si l'API échoue.
  const fallback = h('textarea', { class: 'mep-input mep-textarea mep-fallback', rows: 4, readonly: true, hidden: true, 'aria-label': 'Text to copy manually' });
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

  const copyMessageBtn = h('button', { type: 'button', class: 'mep-btn mep-btn--outline mep-btn--block' }, COPY.copyMessage, icon('copy'));
  copyMessageBtn.addEventListener('click', () => copy(copyMessageBtn, `${state.subject}\n\n${state.body}`, 'Message copied'));

  const copyEmailBtn = h('button', { type: 'button', class: 'mep-btn mep-btn--outline mep-btn--block' }, isBulk ? COPY.copyAllEmails(emails.length) : COPY.copyEmail, icon('copy'));
  copyEmailBtn.addEventListener('click', () => {
    trackContactClick(country);
    copy(copyEmailBtn, emails.join(BULK_SEPARATOR), isBulk ? `${emails.length} addresses copied` : 'Email address copied');
  });

  const openBtn = h('a', { class: 'mep-btn mep-btn--block', href: mailto, text: COPY.openEmail, onclick: () => { trackContactClick(country); } });

  const notice = isBulk
    ? h('p', { class: 'mep-notice' }, h('strong', { text: COPY.beforeYouSend }), ' ', COPY.bccNotice)
    : h('p', { class: 'mep-notice', text: COPY.sendNotice });
  const longHint = mailtoTooLong ? h('p', { class: 'mep-counter', text: COPY.longMessage }) : null;

  const send = h('div', { class: 'mep-send' },
    h('div', { class: 'mep-send__row' },
      h('div', { class: 'mep-send__notice' }, notice, longHint),
      isBulk && mailtoTooLong ? h('p', { class: 'mep-note', text: COPY.bulkUseCopy }) : openBtn,
    ),
    h('div', { class: 'mep-send__row' }, copyMessageBtn, copyEmailBtn),
  );

  // Partage de la campagne (aucune donnée du parcours dans les URLs).
  const shareUrl = encodeURIComponent(SHARE.url);
  const shareText = encodeURIComponent(SHARE.text);
  const shareLinks = [
    { key: 'x', label: COPY.shareX, href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}` },
    { key: 'linkedin', label: COPY.shareLinkedIn, href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
    { key: 'facebook', label: COPY.shareFacebook, href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
  ];
  const share = h('div', { class: 'mep-share' },
    h('p', { class: 'mep-share__text', text: COPY.afterSend }),
    h('ul', { class: 'mep-share__list' },
      shareLinks.map((s) => h('li', {}, h('a', { class: 'mep-share__link', href: s.href, target: '_blank', rel: 'noopener', 'aria-label': s.label }, icon(s.key)))),
    ),
  );

  return h('section', { class: 'mep-step mep-step--3', 'aria-labelledby': 'mep-step3-title' },
    writingToBar(ctx),
    h('h2', { class: 'mep-step__title', id: 'mep-step3-title', tabindex: '-1', text: COPY.step3Title }),
    preview,
    send,
    fallback,
    share,
  );
}
