// Étape 3 : aperçu et envoi (mailto, presse-papiers, mode bulk en BCC, partage), selon la maquette STEP 03.
import { h, icon, prettyName, copyText, flashLabel, buildMailto, NO_TRANSLATE } from '../ui.js';
import { countryLabel } from '../data.js';
import { trackContactClick } from '../analytics.js';
import { BULK_SEPARATOR, MAILTO_SOFT_LIMIT, SHARE } from '../templates.js';
import { writingToBar } from './step2-write.js';

export function renderStep3(ctx) {
  const { state, goTo, announce, t, lang, shareText } = ctx;
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

  const editLink = (label) => h('button', { type: 'button', class: 'mep-link', text: t('edit'), 'aria-label': label, onclick: () => goTo(2) });

  // Aperçu : To / Subject sur une ligne, Message en libellé au-dessus du texte. Nom et adresse jamais traduits.
  const toValue = isBulk
    ? h('p', { class: 'mep-preview__body', text: t('bulkTo', { n: recipients.length, country: countryLabel(country, lang) }) })
    : h('p', { class: 'mep-preview__body' },
      h('span', { ...NO_TRANSLATE, text: prettyName(sel) }),
      ' ',
      h('span', { class: 'mep-preview__email', ...NO_TRANSLATE, text: sel.email }),
    );
  const preview = h('div', { class: 'mep-preview' },
    h('div', { class: 'mep-preview__row' }, h('span', { class: 'mep-preview__key', text: t('to') }), toValue, h('span')),
    h('div', { class: 'mep-preview__row' }, h('span', { class: 'mep-preview__key', text: t('subject') }), h('p', { class: 'mep-preview__body', text: state.subject }), editLink(t('editSubject'))),
    h('div', { class: 'mep-preview__message' },
      h('div', { class: 'mep-preview__head' }, h('span', { class: 'mep-preview__key', text: t('message') }), editLink(t('editMessage'))),
      h('p', { class: 'mep-preview__body mep-preview__body--message', text: state.body }),
    ),
  );

  // Presse-papiers avec repli visible si l'API échoue.
  const fallback = h('textarea', { class: 'mep-input mep-textarea mep-fallback', rows: 4, readonly: true, hidden: true, 'aria-label': t('manualCopy') });
  async function copy(button, value, done) {
    const ok = await copyText(value);
    if (ok) {
      flashLabel(button, t('copied'));
      announce(done);
    } else {
      announce(t('copyFailed'));
      fallback.hidden = false;
      fallback.value = value;
      fallback.focus();
      fallback.select();
    }
  }

  const copyMessageBtn = h('button', { type: 'button', class: 'mep-btn mep-btn--outline mep-btn--block' }, t('copyMessage'), icon('copy'));
  copyMessageBtn.addEventListener('click', () => copy(copyMessageBtn, `${state.subject}\n\n${state.body}`, t('messageCopied')));

  const copyEmailBtn = h('button', { type: 'button', class: 'mep-btn mep-btn--outline mep-btn--block' }, isBulk ? t('copyAllEmails', { n: emails.length }) : t('copyEmail'), icon('copy'));
  copyEmailBtn.addEventListener('click', () => {
    trackContactClick(country);
    copy(copyEmailBtn, emails.join(BULK_SEPARATOR), isBulk ? t('addressesCopied', { n: emails.length }) : t('emailCopied'));
  });

  const openBtn = h('a', { class: 'mep-btn mep-btn--block', href: mailto, text: t('openEmail'), onclick: () => { trackContactClick(country); } });

  const notice = isBulk
    ? h('p', { class: 'mep-notice' }, h('strong', { text: t('beforeYouSend') }), ' ', t('bccNotice'))
    : h('p', { class: 'mep-notice', text: t('sendNotice') });
  const longHint = mailtoTooLong ? h('p', { class: 'mep-counter', text: t('longMessage') }) : null;

  const send = h('div', { class: 'mep-send' },
    h('div', { class: 'mep-send__row' },
      h('div', { class: 'mep-send__notice' }, notice, longHint),
      isBulk && mailtoTooLong ? h('p', { class: 'mep-note', text: t('bulkUseCopy') }) : openBtn,
    ),
    h('div', { class: 'mep-send__row' }, copyMessageBtn, copyEmailBtn),
  );

  // Partage de la campagne (aucune donnée du parcours dans les URLs).
  const shareUrl = encodeURIComponent(SHARE.url);
  const shareMsg = encodeURIComponent(shareText || SHARE.text);
  const shareLinks = [
    { key: 'x', label: t('shareX'), href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareMsg}` },
    { key: 'linkedin', label: t('shareLinkedIn'), href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
    { key: 'facebook', label: t('shareFacebook'), href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
  ];
  const share = h('div', { class: 'mep-share' },
    h('p', { class: 'mep-share__text', text: t('afterSend') }),
    h('ul', { class: 'mep-share__list' },
      shareLinks.map((s) => h('li', {}, h('a', { class: 'mep-share__link', href: s.href, target: '_blank', rel: 'noopener', 'aria-label': s.label }, icon(s.key)))),
    ),
  );

  return h('section', { class: 'mep-step mep-step--3', 'aria-labelledby': 'mep-step3-title' },
    writingToBar(ctx),
    h('h2', { class: 'mep-step__title', id: 'mep-step3-title', tabindex: '-1', text: t('step3Title') }),
    preview,
    send,
    fallback,
    share,
  );
}
