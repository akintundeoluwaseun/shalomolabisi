/**
 * All words in the experience live here, separate from layout and motion.
 * Edit freely — nothing in this file is tied to animation timing.
 */

export const recipient = {
  first: 'Shalom',
  last: 'Olabisi',
  full: 'Shalom Olabisi',
} as const

export const sender = 'Oluwaseun'

export const birthday = {
  short: '22 · 11 · 2026',
  long: '22 November 2026',
} as const

export const opening = {
  kicker: 'For Shalom Olabisi — a one-of-one, made for one person',
  since: '22 · 11 · 2026',
  invite: 'Hold to gather the stars',
  inviteHolding: 'Keep holding…',
  inviteTapHint: 'Press and hold',
  lineA: 'Some people become part of our story simply by being themselves.',
  lineB: 'Today, we celebrate one of them.',
  scrollCue: 'Scroll, slowly',
} as const

export type Chapter = {
  label: string
  title: string
  body: string
}

export const journey = {
  kicker: 'II — A small constellation',
  heading: 'A journey that started in 2023',
  hint: 'Scroll to connect the stars · tap a star to return to it',
  chapters: [
    {
      label: '2023 · JAMB',
      title: 'An ordinary beginning',
      body: 'It started during JAMB lessons in 2023. An ordinary room, an ordinary season — not the kind of place you expect a friendship to come from.',
    },
    {
      label: 'Conversations',
      title: 'Easy to talk to',
      body: 'Then came the conversations — the kind that are easy to have, and easy to come back to.',
    },
    {
      label: 'Perspectives',
      title: 'Lessons, shared',
      body: 'Lessons from church, different points of view, thoughts passed back and forth and made better for it.',
    },
    {
      label: 'Openness',
      title: 'Room to be honest',
      body: 'A friendship comfortable enough to talk about what is really going on in life — the good and the difficult.',
    },
    {
      label: 'Today',
      title: 'Still shining',
      body: 'Years on, it has become something genuinely worth appreciating. So today, it gets celebrated.',
    },
  ] satisfies Chapter[],
  coda: 'Ordinary beginnings. A friendship worth appreciating.',
} as const

export const letter = {
  kicker: 'III — A letter, sealed for you',
  prompt: 'Press the seal to open',
  header: 'For Shalom Olabisi',
  salutation: 'Dear Shalom,',
  paragraphs: [
    'It’s interesting how some friendships begin in ordinary places and gradually become something worth appreciating.',
    'Since we met during JAMB lessons in 2023, we’ve shared conversations, thoughts, lessons and little moments that I genuinely value.',
    'I appreciate how freely we can talk, how we share different perspectives, and how I can sometimes open up to you about things happening in my life.',
    'Sometimes, it’s the simplest conversations that make a friendship meaningful.',
    'Today, I simply want to celebrate you — and let you know that your friendship is appreciated.',
    'As you begin another chapter, I pray that God guides your steps, gives you peace, opens beautiful doors for you and fills your days with reasons to be grateful.',
    'May this new year bring growth, happiness, beautiful opportunities and countless blessings.',
    'Thank you for being a wonderful friend.',
  ],
  birthdayLine: 'Happy Birthday, Shalom!',
  signOff: 'With appreciation.',
  signature: 'Oluwaseun',
  date: '22 November 2026',
} as const

export const celebration = {
  kicker: 'IV — One more thing',
  preWish: 'Before the last page,',
  preWishB: 'make a wish.',
  flameHint: 'Then tap the flame',
  eyebrow: 'Happy Birthday,',
  nameLines: ['SHALOM', 'OLABISI.'],
  wish: 'Wishing you a year that is gentle with you and generous to you — full of growth, peace, and quiet reasons to smile.',
  gardenHint: 'Tap anywhere to leave a bloom',
  closing: 'With appreciation.',
  date: '22 November 2026',
  colophon: 'Made by Oluwaseun, for Shalom Olabisi · 22 November 2026',
  again: 'Read the letter again',
  restart: 'Begin again',
} as const
