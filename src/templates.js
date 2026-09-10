// Textes du parcours. Source : exports Figma (sources/design-copy/*.txt).
// "The full case" est le texte intégral du design. "Short and direct" et "Personal" ne sont pas
// dans les maquettes : ce sont des BROUILLONS 65inches à remplacer par les textes validés par
// Mojo/IWF (point ouvert n°1 du brief). Les crochets [ ... ] sont à compléter par le citoyen.

export const SUBJECT = 'Your vote on the Child Sexual Abuse Regulation (CSAR)';

export const SIGNATURE = 'Best,\n[YOUR NAME] [YOUR COUNTRY]';

const FULL_CASE = `Dear Member of the European Parliament,

Right now, tech companies in Europe get to decide for themselves how far they are willing to go to protect children from sexual abuse. And yet, child sexual abuse material continues to circulate at rocket speed across Europe. According to the Internet Watch Foundation, 63% of the webpages containing confirmed child sexual abuse material in 2025 were hosted on servers based in the EU.

That is not good enough.

Companies should not be able to decide whether protecting children from sexual abuse is worth the cost, effort or inconvenience.

If they operate here, Europe should set the rules. If you are concerned about what they are doing, regulate them. If you can protect children, act.

The EU's Child Sexual Abuse Regulation is an opportunity to do exactly that. It must give Europe strong rules to help stop images and videos of children being sexually abused from being shared online, and make sure technology companies do their part to protect children.

The Regulation must:

- Allow companies to find and act on known child sexual abuse material, so the same illegal images and videos cannot simply be uploaded again and again.
- Help find new and previously unseen child sexual abuse material, including material created using AI.
- Give responsible companies a clear and permanent legal basis to find, report and remove child sexual abuse material.
- Make sure the rules do not only focus on known offenders, because people who want to sexually abuse children can easily create new accounts or conceal their identities.
- Create a strong and properly funded EU Centre to help coordinate action against child sexual abuse online.

Images and videos of children being sexually abused are already being shared online at scale. Technology is making it easier to create and spread new forms of abuse, and easier for perpetrators to hide what they are doing. Evidence shows a link between viewing child sexual abuse material and an increased risk of committing contact sexual abuse against children.

Europe cannot simply leave it to tech companies to decide how much they are willing to do.

You represent me. You make decisions in my name. I expect you to put your name to protecting our children from sexual violence.

Learn more at: thepetitionnoonewouldsign.com

${SIGNATURE}`;

// BROUILLON — à valider par Mojo/IWF
const SHORT_AND_DIRECT = `Dear Member of the European Parliament,

Tech companies in Europe currently decide for themselves how far they go to protect children from sexual abuse. In 2025, 63% of the webpages containing confirmed child sexual abuse material were hosted on servers in the EU.

The Child Sexual Abuse Regulation must give responsible companies a clear and permanent legal basis to find, report and remove this material, including new material created using AI, and create a properly funded EU Centre to coordinate action.

You represent me. I expect you to put your name to protecting children from sexual violence.

Learn more at: thepetitionnoonewouldsign.com

${SIGNATURE}`;

// BROUILLON — à valider par Mojo/IWF
const PERSONAL = `Dear Member of the European Parliament,

I am writing to you as one of your constituents. This matters to me because [SAY WHY: as a parent, a teacher, a survivor, a citizen…].

Right now, tech companies in Europe decide for themselves whether protecting children from sexual abuse is worth the cost or the effort. I do not think that decision should be theirs. If they operate here, Europe should set the rules.

Please support a Child Sexual Abuse Regulation that lets responsible companies find, report and remove child sexual abuse material, including new material created using AI, with clear safeguards and a properly funded EU Centre.

You make decisions in my name. I am asking you to make this one count.

Learn more at: thepetitionnoonewouldsign.com

${SIGNATURE}`;

export const TEMPLATES = [
  { id: 'full', title: 'The full case', description: 'The complete argument, with the specific asks. Best if you want to be thorough.', body: FULL_CASE },
  { id: 'short', title: 'Short and direct', description: 'A few lines. Best if you want it read quickly.', body: SHORT_AND_DIRECT },
  { id: 'personal', title: 'Personal', description: 'Explains why this matters to you as a constituent.', body: PERSONAL },
];

export const COPY = {
  step1Title: 'Find your representative',
  countryLabel: 'Search by country',
  allCountries: 'All countries',
  searchPlaceholder: 'Search by name, party or political group',
  shown: (n, total) => `${n} out of ${total} representatives shown`,
  noResult: 'No representatives match that.',
  noResultHint: 'Try another country, or clear the filters.',
  clearFilters: 'Clear filters',
  contactAll: (country) => `Contact all ${country} representatives`,
  voteKicker: (date) => `Last vote on detection · ${date}`,
  source: 'Source',
  writeTo: 'Write to this MEP',

  writingTo: 'Writing to',
  allMepsIn: (n, country) => `All ${n} MEPs in ${country}`,
  change: 'Change',
  step2Title: 'Choose a starting point',
  subject: 'Subject',
  message: 'Message',
  continueBtn: 'Continue',
  editNote: "Feel free to edit this. A message in your own words is always more effective. Please don't include personal details about yourself or anyone else.",
  longMessage: 'Long messages may not open in some email apps, use the copy button below.',
  emptyFields: 'Please write a subject and a message before continuing.',

  step3Title: 'Review and send',
  to: 'To',
  edit: 'Edit',
  sendNotice: "This will open your own email app with the message ready to send. Your message goes directly from you to your representative. We never see it, and we don't keep a copy. Once sent, it can't be recalled.",
  beforeYouSend: 'Before you send',
  // Fin de phrase tronquée dans l'export PDF : "This keeps the recipient list …" — à confirmer avec Mojo.
  bccNotice: 'Paste the addresses into the BCC field of your email, not To or CC. This keeps the recipient list private.',
  copyMessage: 'Copy message',
  copyEmail: 'Copy email address',
  copyAllEmails: (n) => `Copy all ${n} email addresses`,
  openEmail: 'Open in my email app',
  copied: 'Copied ✓',
  copyFailed: 'Copy failed, select the text and copy it manually.',
  afterSend: 'Email sent? Share the campaign and encourage others to take action.',
  shareLink: 'Share the campaign',
};

// Séparateur des adresses en mode bulk : ";" pour Outlook, "," pour le reste. Point ouvert n°4 du brief.
export const BULK_SEPARATOR = '; ';

// Au-delà, certains clients (Outlook desktop) tronquent ou refusent le mailto.
export const MAILTO_SOFT_LIMIT = 2000;
export const BODY_WARN_LENGTH = 1500;
