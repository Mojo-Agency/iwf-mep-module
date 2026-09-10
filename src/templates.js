// Textes du parcours. Copy des écrans : exports Figma (sources/design-copy/*.txt).
// Modèles de mail : version définitive fournie par Mojo/IWF le 2026-09-10 ("IWF - mail to MEPs"),
// copie de référence dans sources/design-copy/mail-templates.md. Les crochets [ ... ] sont à compléter
// par le citoyen. Deux détails du document source ont été corrigés : "Dear Dear" (doublon) et rien d'autre.

const SIGNATURE = `Kind regards,
[Your name]
[Your town or city, country]

More information and policy brief to be found on thepetitionnoonewouldsign.com`;

const FULL_CASE = `Dear Member of the European Parliament,

I am writing to you as one of the people you represent, about the EU Child Sexual Abuse Regulation. Negotiations resume this autumn, and the decisions made in the coming months will shape how effectively child sexual abuse can be prevented, found, removed and stopped from spreading online. Those decisions will be made in my name, and I would like to know where you stand.

The scale of the problem is not in doubt. In 2025, the Internet Watch Foundation took action against more than 310,000 webpages showing child sexual abuse, and 63% of them were traced to hosting services in EU countries. Separately, IWF assessed 3,443 AI-generated videos depicting photorealistic child sexual abuse. This was more than 260 times the 13 AI-generated videos we identified in 2024.

Online services play a central role in finding this material and reporting it. But in the EU, the legal basis that allows messaging and email services to do this voluntarily is temporary. It lapsed in April this year and has since been reinstated only until April 2028. We have already seen what uncertainty does. In late 2020, when companies were unsure whether detection was allowed under EU law, reports of child sexual abuse material from EU-based accounts to the US National Center for Missing and Exploited Children fell by 58% in 18 weeks. Fewer reports did not mean less abuse. They meant less of it was found.

The Child Sexual Abuse Regulation is the chance to replace this temporary arrangement with clear, lasting rules. I am asking you to support a Regulation that:

1. Gives online services a permanent legal basis and clear responsibilities to find, report and remove child sexual abuse material, so that protecting children does not depend on temporary rules.
2. Allows images and videos already confirmed as child sexual abuse to be recognised, so the same material cannot simply be uploaded and shared again and again.
3. Helps find new and previously unseen abuse material, including material created with AI, with human review and strong safeguards around these tools.
4. Does not rely only on people already under suspicion, because offenders can easily open new accounts or hide their identity.
5. Creates a strong, properly funded EU Centre to coordinate action across Europe and support victims and survivors.
6. Builds in clear limits, independent oversight and ways to challenge mistakes from the start.

Privacy matters to me. It also matters to the children whose abuse is recorded and shared, and to the survivors who live with it. Protecting privacy and protecting children are not opposing goals. A well-designed law can do both, using targeted tools, for a clear purpose, under proper checks.

A weaker or further delayed law would not make this problem go away. It would make it harder to stop, and leave the next child less protected.

No one would sign a petition asking for more child sexual abuse online. I do not believe you would either. I am asking you to put your name to the opposite.

Could you let me know whether you will support a final agreement that includes these elements, and how you intend to vote when it comes before Parliament?

${SIGNATURE}

Sources: Internet Watch Foundation, 2025 Data & Insights Report (iwf.org.uk); National Center for Missing and Exploited Children (2020).`;

const SHORT_AND_DIRECT = `Dear Member of the European Parliament,

I am one of the people you represent, and I am asking you to support a strong EU Child Sexual Abuse Regulation.

In 2025, 63% of the webpages showing child sexual abuse that the Internet Watch Foundation took action against were hosted in EU countries. Europe needs clear, lasting rules that allow online services to find, report and remove this material, and to stop the same images and videos being shared again and again. The rules that make this possible today are only temporary.

This can be done with clear limits and independent oversight, respecting everyone's privacy, including children's.

No one would sign a petition for more child sexual abuse online. But a weak or delayed law would make this abuse harder to stop.

Will you support a strong Regulation when it comes to a vote? I would be grateful to know where you stand.

${SIGNATURE}`;

const PERSONAL = `Dear Member of the European Parliament,

I am writing to you as one of the people you represent, about something most of us would rather not think about.

[a sentence in your own words about who you are or why this matters to you]

I recently came across a campaign by the Internet Watch Foundation built around a petition no one would sign: a petition asking people to support more child sexual abuse online. Of course no one would put their name to that. But it made me realise that Europe could still end up with a weaker law, or no lasting law at all, without anyone ever having to put their name to that choice.

Behind these images and videos are real children. The harm does not end when the abuse does. The images can circulate for years, and each time they are shared again, the harm is repeated. The child grows up. The images stay the same, and keep being passed around.

This is not happening somewhere far away. In 2025, 63% of the webpages showing child sexual abuse that the Internet Watch Foundation took action against were hosted in EU countries.

None of us can undo what has already happened to these children. But we can decide whether it becomes easier or harder to find these images, remove them and stop them from being shared again. That decision is being made now, in the EU Child Sexual Abuse Regulation, and it is being made in my name.

I am asking you to support clear, lasting rules that allow online services to find, report and remove this material, with proper safeguards that protect everyone's privacy, including the privacy of the children whose abuse is being shared.

I know these negotiations are complex. I am not asking you to ignore that. I am asking you to remember who these rules are for.

When the final text comes to a vote, I hope you will put your name to protecting them. Will you tell me where you stand?

${SIGNATURE}`;

export const TEMPLATES = [
  {
    id: 'full',
    title: 'The full case',
    description: 'The facts, the stakes and six clear requests. For when you want to set out the whole argument.',
    subject: 'A request from someone you represent on the Child Sexual Abuse Regulation',
    body: FULL_CASE,
  },
  {
    id: 'short',
    title: 'Short and direct',
    description: 'A few lines and one clear request. Quick to send, quick to read.',
    subject: 'Please support a strong Child Sexual Abuse Regulation',
    body: SHORT_AND_DIRECT,
  },
  {
    id: 'personal',
    title: 'Personal',
    description: 'Why this matters to you, with room for a line in your own words.',
    subject: 'Something I would rather not have to write about',
    body: PERSONAL,
  },
];

// Textes de l'interface, en anglais (langue source du projet Weglot). Chaque valeur est une chaîne :
// les variables sont des jetons {nom} remplis au rendu (src/i18n.js), ce qui donne une seule entrée
// Weglot par texte quel que soit le nombre affiché. Tout est traduit par Weglot.translate, sauf les
// noms des députés, des partis et des groupes (données, jamais envoyées en traduction).
export const STRINGS = {
  step1Title: 'Find your representative',
  countryLabel: 'Search by country',
  allCountries: 'All countries',
  searchLabel: 'Search by name, party or political group',
  shown: '{n} out of {total} representatives shown',
  resultsOne: '1 representative matches. Showing {from} to {to}.',
  resultsMany: '{n} representatives match. Showing {from} to {to}.',
  pagination: 'Pagination',
  prevPage: 'Previous page',
  nextPage: 'Next page',
  pageLabel: 'Page {p}',
  pageInfo: 'Page {p} of {n}',
  noResult: 'No representatives match that.',
  noResultHint: 'Try another country, or clear the filters.',
  clearFilters: 'Clear filters',
  contactAll: 'Contact all {country} representatives',
  voteKicker: 'Last vote on detection · {date}',
  source: 'Source',
  sourceOf: 'Source: vote of {name}',
  writeTo: 'Write to this MEP',
  writeToName: 'Write to this MEP: {name}',

  writingTo: 'Writing to',
  allMepsIn: 'All {n} MEPs in {country}',
  change: 'Change',
  step2Title: 'Choose a starting point',
  subject: 'Subject',
  message: 'Message',
  continueBtn: 'Continue',
  editNote: "Feel free to edit this. A message in your own words is always more effective. Please don't include personal details about yourself or anyone else.",
  longMessage: 'Long messages may not open in some email apps, use the copy button below.',
  characters: '{n} characters.',
  emptyFields: 'Please write a subject and a message before continuing.',
  templateSelected: '{title} selected. Subject and message updated.',

  step3Title: 'Review and send',
  to: 'To',
  bulkTo: 'All {n} MEPs in {country} (BCC)',
  edit: 'Edit',
  editSubject: 'Edit subject',
  editMessage: 'Edit message',
  sendNotice: "This will open your own email app with the message ready to send. Your message goes directly from you to your representative. We never see it, and we don't keep a copy. Once sent, it can't be recalled.",
  beforeYouSend: 'Before you send',
  // Fin de phrase tronquée dans l'export PDF : "This keeps the recipient list …" — à confirmer avec Mojo.
  bccNotice: 'Paste the addresses into the BCC field of your email, not To or CC. This keeps the recipient list private.',
  copyMessage: 'Copy message',
  copyEmail: 'Copy email address',
  copyAllEmails: 'Copy all {n} email addresses',
  openEmail: 'Open in my email app',
  copied: 'Copied ✓',
  copyFailed: 'Copy failed, select the text and copy it manually.',
  messageCopied: 'Message copied',
  emailCopied: 'Email address copied',
  addressesCopied: '{n} addresses copied',
  manualCopy: 'Text to copy manually',
  afterSend: 'Email sent? Share the campaign and encourage others to take action.',
  shareX: 'Share on X',
  shareLinkedIn: 'Share on LinkedIn',
  shareFacebook: 'Share on Facebook',
  bulkUseCopy: 'Too many addresses for a single email link: copy the addresses and the message below.',
  loadError: 'We could not load the list of MEPs. Please refresh the page or try again later.',
  tryAgain: 'Try again',
};

// Partage : URL publique de la campagne uniquement, jamais de donnée du parcours.
export const SHARE = {
  url: 'https://thepetitionnoonewouldsign.com/',
  text: 'The petition no one would sign - ask your MEP where they stand.',
};

// Fiches par page dans la grille (design : "9 out of 720 representatives shown").
export const PAGE_SIZE = 9;

// Séparateur des adresses en mode bulk : ";" pour Outlook, "," pour le reste. Point ouvert n°4 du brief.
export const BULK_SEPARATOR = '; ';

// Au-delà, certains clients (Outlook desktop) tronquent ou refusent le mailto.
export const MAILTO_SOFT_LIMIT = 2000;
export const BODY_WARN_LENGTH = 1500;
