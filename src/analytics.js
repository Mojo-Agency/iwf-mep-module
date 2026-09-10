// Analytics : un seul événement, un seul paramètre (pays). Jamais de nom, de saisie, d'email.
// GTM/GA sont déclenchés par le CMP après consentement ; si dataLayer est absent, no-op.
export function trackContactClick(countryCode) {
  try {
    window.dataLayer?.push({ event: 'mep_contact_click', country: countryCode || 'ALL' });
  } catch {
    /* no-op */
  }
}
