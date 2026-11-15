/**
 * Understanding what people say to the voice assistant - RULE-BASED, not AI.
 * Everyday phrases are matched against word lists per language (English and Amharic first; Afaan Oromo, Somali and
 * Tigrinya lists are drafts so the architecture is ready). Nothing is sent to an AI service. When nothing matches,
 * the assistant says so and offers numbered choices - it never pretends to have understood.
 */
import { normalise } from '../a11y/voiceCommands'

export type Intent =
  | 'findJob'
  | 'createProfile'
  | 'support'
  | 'track'
  | 'continue'
  | 'help'
  | 'signIn'
  | 'menu'
  | 'english'
  | 'amharic'

export type Control = 'repeat' | 'back' | 'skip' | 'stop' | 'help' | 'menu'

/** Words/phrases per intent. A phrase matches when it appears inside what was said. */
const INTENTS: Record<Intent, string[]> = {
  findJob: [
    'find a job',
    'find job',
    'find work',
    'look for a job',
    'looking for a job',
    'looking for work',
    'search jobs',
    'job search',
    'jobs',
    'a job',
    'work',
    'employment',
    'vacancy',
    'vacancies',
    'apply for a job',
    'ስራ',
    'ሥራ',
    'ስራ ፈልግ',
    'ሥራ ፈልግ',
    'ስራ መፈለግ',
    'ሥራ መፈለግ',
    'ቅጥር',
    'hojii',
    'hojii barbaadi',
    'shaqo',
    'shaqo raadi',
    'ስራሕ',
    'ስራሕ ድለ',
  ],
  createProfile: [
    'profile',
    'create my profile',
    'my profile',
    'cv',
    'resume',
    'register',
    'sign up',
    'create an account',
    'make an account',
    'መገለጫ',
    'ፕሮፋይል',
    'ተመዝገብ',
    'መመዝገብ',
    'seenaa',
    'galmaa',
    'astaan',
    'is diiwaangeli',
    'መግለጺ',
  ],
  support: [
    'support',
    'ask for support',
    'need support',
    'accommodation',
    'assistance',
    'talk to a person',
    'speak to someone',
    'ድጋፍ',
    'እርዳታ ያስፈልገኛል',
    'deeggarsa',
    'taageero',
    'ደገፍ',
  ],
  track: [
    'my applications',
    'application status',
    'track',
    'status',
    'did they reply',
    'any news',
    'what happened',
    'applications',
    'ማመልከቻዎቼ',
    'ማመልከቻ',
    'ሁኔታ',
    'iyyannoo',
    'codsiyada',
    'ምልክታ',
  ],
  continue: [
    'continue',
    'carry on',
    'where i left',
    'unfinished',
    'finish',
    'resume',
    'ቀጥል',
    'ልቀጥል',
    'ጨርስ',
    'itti fufi',
    'sii wad',
    'ቀጽል',
  ],
  help: [
    'help',
    'i need help',
    'what can you do',
    'what can i do',
    'how does this work',
    'help me get started',
    'explain',
    'እገዛ',
    'እርዳኝ',
    'ምን ማድረግ እችላለሁ',
    'gargaarsa',
    'caawimaad',
    'ሓገዝ',
  ],
  signIn: ['sign in', 'log in', 'login', 'i have an account', 'ግባ', 'መግባት', 'seeni', 'gal', 'እቶ'],
  menu: [
    'main menu',
    'menu',
    'start over',
    'go home',
    'home',
    'something else',
    'ዋና ገጽ',
    'ሌላ ነገር',
    'mana',
    'guriga',
  ],
  english: ['english', 'in english', 'speak english', 'እንግሊዝኛ'],
  amharic: ['amharic', 'in amharic', 'speak amharic', 'አማርኛ', 'በአማርኛ'],
}

/** Controls work at any question. Whole-utterance (or nearly) only, so answers are not mistaken for commands. */
const CONTROLS: Record<Control, string[]> = {
  repeat: [
    'repeat',
    'repeat that',
    'say that again',
    'say it again',
    'again',
    'pardon',
    'what',
    'sorry what',
    'ድገም',
    'እንደገና',
    'ድገመው',
    'irra deebi i',
    'ku celi',
    'ደጊምካ',
  ],
  back: [
    'back',
    'go back',
    'previous',
    'previous question',
    'ተመለስ',
    'ወደ ኋላ',
    'duubatti',
    'dib u noqo',
  ],
  skip: [
    'skip',
    'skip it',
    'skip this',
    'next question',
    'i don t know',
    'no answer',
    'ዝለል',
    'አላውቅም',
    'irra darbi',
    'ka bood',
  ],
  stop: [
    'stop',
    'pause',
    'stop listening',
    'be quiet',
    'quiet',
    'goodbye',
    'bye',
    'that s all',
    'አቁም',
    'በቃ',
    'dhaabi',
    'jooji',
    'ኣቋርጽ',
  ],
  help: [
    'help',
    'i need help',
    'explain',
    'what does that mean',
    'i don t understand',
    'እገዛ',
    'አልገባኝም',
    'gargaarsa',
    'caawimaad',
    'ሓገዝ',
  ],
  menu: ['main menu', 'menu', 'start over', 'go home', 'cancel', 'ዋና ገጽ', 'ሰርዝ'],
}

const YES = [
  'yes',
  'yeah',
  'yep',
  'yes please',
  'sure',
  'of course',
  'correct',
  'right',
  'that s right',
  'ok',
  'okay',
  'i agree',
  'agree',
  'yes send it',
  'send it',
  'send',
  'yes i do',
  'please do',
  'go ahead',
  'do it',
  'አዎ',
  'እሺ',
  'ትክክል',
  'አዎን',
  'ላክ',
  'eeyyee',
  'eeyye',
  'tole',
  'haa',
  'haye',
  'sax',
  'እወ',
  'ሕራይ',
]
const NO = [
  'no',
  'nope',
  'no thanks',
  'no thank you',
  'not now',
  'wrong',
  'that s wrong',
  'not right',
  'i don t',
  'don t',
  'do not',
  'never mind',
  'አይ',
  'አይደለም',
  'ተሳስቷል',
  'አልፈልግም',
  'lakki',
  'miti',
  'maya',
  'ኣይፋል',
  'ኣይኮነን',
]

const has = (text: string, phrase: string) =>
  phrase.includes(' ') || /[ሀ-᎟]/.test(phrase)
    ? text.includes(phrase)
    : new RegExp(`(^| )${phrase}( |$)`).test(text)

export function control(spoken: string): Control | null {
  const t = normalise(spoken).replace(/'/g, ' ')
  if (!t) return null
  for (const [c, phrases] of Object.entries(CONTROLS) as [Control, string[]][])
    if (phrases.some((p) => t === p || t === `please ${p}` || t === `${p} please`)) return c
  return null
}

/** The most specific intent mentioned (longest matching phrase wins). */
export function intent(spoken: string): Intent | null {
  const t = normalise(spoken).replace(/'/g, ' ')
  let best: { i: Intent; len: number } | null = null
  for (const [i, phrases] of Object.entries(INTENTS) as [Intent, string[]][])
    for (const p of phrases)
      if (has(t, p) && (!best || p.length > best.len)) best = { i, len: p.length }
  return best?.i ?? null
}

export function yesNo(spoken: string): 'yes' | 'no' | null {
  const t = normalise(spoken).replace(/'/g, ' ')
  if (!t) return null
  if (NO.some((p) => t === p || t.startsWith(`${p} `))) return 'no'
  if (YES.some((p) => t === p || t.startsWith(`${p} `) || t.endsWith(` ${p}`))) return 'yes'
  return null
}

const FILLER =
  /\b(i want|i would like|i d like|i am|i m|looking for|look for|to find|find|search for|search|a job|job|jobs|work|in|as|an|a|the|some|please|kind of|position|role|opportunities|me)\b/g

/** "I want to find a job in software development" → "software development". Empty when no subject was given. */
export function jobKeywords(spoken: string) {
  return normalise(spoken)
    .replace(/'/g, ' ')
    .replace(FILLER, ' ')
    .replace(/\b(to|for|of)\b/g, ' ')
    .replace(/ስራ|ሥራ|መፈለግ|እፈልጋለሁ|ፈልግ/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const anyJob = (spoken: string) =>
  /\b(any|anything|all|every|whatever|don t mind|not sure)\b|ማንኛውም|ሁሉም/.test(
    normalise(spoken).replace(/'/g, ' '),
  )

const DIGIT_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ዜሮ: '0',
  አንድ: '1',
  ሁለት: '2',
  ሶስት: '3',
  ሦስት: '3',
  አራት: '4',
  አምስት: '5',
  ስድስት: '6',
  ሰባት: '7',
  ስምንት: '8',
  ዘጠኝ: '9',
}

/** Spoken phone number → digits ("zero nine one one, 22 33 44" → "0911223344"; "plus 251" kept). */
export function phone(spoken: string) {
  const words = spoken
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+ ]/gu, ' ')
    .split(/\s+/)
  let out = ''
  for (const w of words) {
    if (w === 'double' || w === 'triple') {
      out += w === 'double' ? '#2' : '#3'
      continue
    }
    const d = /^\+?\d+$/.test(w) ? w : (DIGIT_WORDS[w] ?? (w === 'plus' ? '+' : ''))
    const m = out.match(/#([23])$/)
    out = m ? out.slice(0, -2) + d.repeat(Number(m[1])) : out + d
  }
  return out.replace(/#\d/g, '')
}

/** Spoken email → address ("almaz dot b at gmail dot com" → "almaz.b@gmail.com"). */
export function email(spoken: string) {
  return spoken
    .toLowerCase()
    .replace(/\s+(at|@)\s+/g, '@')
    .replace(/\s+(dot|point)\s+/g, '.')
    .replace(/\s+(underscore)\s+/g, '_')
    .replace(/\s+(dash|hyphen)\s+/g, '-')
    .replace(/\s+/g, '')
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
}

/** A number or year ("nineteen ninety five" is not supported - say "1995"). */
export function number(spoken: string): number | null {
  const t = normalise(spoken)
  const digits = t.replace(/[^\d]/g, '')
  if (digits) return Number(digits)
  const w = t.split(' ').find((x) => x in NUMBER_WORDS)
  return w ? NUMBER_WORDS[w] : null
}
