export const CLICK_SELECTORS: string[] = [
  // English
  'button:has-text("Accept")',
  'button:has-text("Accept all")',
  'button:has-text("Allow all")',
  'button:has-text("Agree")',
  'button:has-text("I agree")',
  'button:has-text("OK")',
  'button:has-text("Got it")',

  // German
  'button:has-text("Akzeptieren")',
  'button:has-text("Alle akzeptieren")',
  'button:has-text("Zustimmen")',
  'button:has-text("Einverstanden")',
  'button:has-text("OK")',

  // French
  'button:has-text("Accepter")',
  'button:has-text("Tout accepter")',
  'button:has-text("J\'accepte")',
  'button:has-text("D\'accord")',
  'button:has-text("OK")',

  // Spanish
  'button:has-text("Aceptar")',
  'button:has-text("Aceptar todo")',
  'button:has-text("Estoy de acuerdo")',
  'button:has-text("De acuerdo")',
  'button:has-text("OK")',

  // Danish
  'button:has-text("Accepter")',
  'button:has-text("Accepter alle")',
  'button:has-text("OK")',

  // Dutch
  'button:has-text("Accepteren")',
  'button:has-text("Alles accepteren")',
  'button:has-text("Akkoord")',
  'button:has-text("OK")',

  // Italian
  'button:has-text("Accetta")',
  'button:has-text("Accetta tutto")',
  'button:has-text("Accetto")',
  'button:has-text("OK")',

  // Russian
  'button:has-text("Принять")',
  'button:has-text("Принять все")',
  'button:has-text("Согласен")',
  'button:has-text("Я согласен")',
  'button:has-text("ОК")',
  'button:has-text("OK")',

  // Hebrew
  'button:has-text("אישור")',
  'button:has-text("מאשר")',
  'button:has-text("אני מסכים")',
  'button:has-text("קבל")',
  'button:has-text("קבל הכל")',
  'button:has-text("אישור הכל")',

  // Generic fallbacks (language-agnostic attribute patterns)
  '[aria-label*="accept" i]',
  '[id*="accept" i]',
  '[class*="accept" i]',
];

export const EMAIL_DOMAINS: string[] = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'gmx.de',
  'gmx.net',
  'web.de',
  't-online.de',
  'freenet.de',
  'yandex.ru',
  'yandex.com',
  'yandex.ua',
  'mail.ru',
  'bk.ru',
  'inbox.ru',
  'list.ru',
  'rambler.ru',
  'laposte.net',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'sfr.fr',
  'cytanet.com.cy',
];
