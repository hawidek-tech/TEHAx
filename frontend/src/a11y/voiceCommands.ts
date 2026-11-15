/**
 * Understanding short spoken answers (voice-guided mode): a choice by number or by name, yes/no, or a command.
 * Plain matching rules, no AI. Word lists for am/om/so/ti are DRAFTS until reviewed by fluent speakers.
 */
export type VoiceCommand = 'next' | 'back' | 'repeat' | 'help' | 'stop'

const COMMANDS: Record<VoiceCommand, string[]> = {
  next: ['next', 'continue', 'go on', 'go next', 'ቀጥል', 'ቀጣይ', 'itti fufi', 'sii wad', 'ቀጽል'],
  back: ['back', 'go back', 'previous', 'ተመለስ', 'duubatti', 'dib u noqo'],
  repeat: ['repeat', 'again', 'say again', 'say that again', 'ድገም', 'irra deebi i', 'ku celi'],
  help: ['help', 'help me', 'እገዛ', 'እርዳታ', 'gargaarsa', 'caawimaad', 'ሓገዝ'],
  stop: ['stop', 'quiet', 'be quiet', 'አቁም', 'dhaabi', 'jooji', 'ኣቋርጽ'],
}

const NUMBER_WORDS: string[][] = [
  ['one', 'first', '1', 'አንድ', 'አንደኛ', 'tokko', 'kow', 'ሓደ'],
  ['two', 'second', '2', 'ሁለት', 'ሁለተኛ', 'lama', 'laba', 'ክልተ'],
  ['three', 'third', '3', 'ሶስት', 'ሦስት', 'ሶስተኛ', 'sadii', 'saddex', 'ሰለስተ'],
  ['four', 'fourth', '4', 'አራት', 'አራተኛ', 'afur', 'afar', 'ኣርባዕተ'],
  ['five', 'fifth', '5', 'አምስት', 'shan', 'ሓሙሽተ'],
  ['six', 'sixth', '6', 'ስድስት', 'jaha', 'lix', 'ሽዱሽተ'],
  ['seven', 'seventh', '7', 'ሰባት', 'torba', 'toddoba', 'ሸውዓተ'],
  ['eight', 'eighth', '8', 'ስምንት', 'saddeet', 'siddeed', 'ሸሞንተ'],
  ['nine', 'ninth', '9', 'ዘጠኝ', 'sagal', 'sagaal', 'ትሽዓተ'],
  ['ten', 'tenth', '10', 'አስር', 'kudhan', 'toban', 'ዓሰርተ'],
]

const YES = [
  'yes',
  'yeah',
  'yep',
  'i agree',
  'agree',
  'ok',
  'okay',
  'አዎ',
  'እሺ',
  'eeyyee',
  'eeyye',
  'haa',
  'haye',
  'እወ',
]
const NO = ['no', 'nope', 'አይ', 'አይደለም', 'lakki', 'maya', 'ኣይፋል', 'ኣይ']

/** Lower case, no punctuation, single spaces (keeps Ethiopic letters). */
export function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'()።፣፤፥፦-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Removes filler around a number: "number two", "option 2", "the second one", "ቁጥር ሁለት". */
function stripFiller(t: string) {
  return t
    .replace(/^(number|option|choice|the|ቁጥር|lakkoofsa|lambar)\s+/, '')
    .replace(/\s+(one|please)$/, '')
    .trim()
}

export type Interpretation =
  | { kind: 'command'; command: VoiceCommand }
  | { kind: 'option'; value: string; label: string }
  | { kind: 'yes' }
  | { kind: 'no' }
  | { kind: 'none' }

export function interpret(
  spoken: string,
  options: { value: string; label: string }[] = [],
): Interpretation {
  const t = normalise(spoken)
  if (!t) return { kind: 'none' }

  // 1. A whole-utterance command ("next", "go back"). Commands inside longer sentences are not commands.
  for (const [command, phrases] of Object.entries(COMMANDS) as [VoiceCommand, string[]][])
    if (phrases.includes(t)) return { kind: 'command', command }

  if (options.length) {
    // 2. By number ("two", "number 2", "ሁለት")
    const n = stripFiller(t)
    const index = NUMBER_WORDS.findIndex((words) => words.includes(n))
    if (index >= 0 && index < options.length)
      return { kind: 'option', value: options[index].value, label: options[index].label }

    // 3. By name: exact, then containment, then the best word overlap (at least half of the option's words)
    const labelled = options.map((o) => ({ ...o, norm: normalise(o.label) }))
    const exact = labelled.find((o) => o.norm === t)
    if (exact) return { kind: 'option', value: exact.value, label: exact.label }
    const contained = labelled
      .filter((o) => o.norm.length > 2 && (t.includes(o.norm) || o.norm.includes(t)))
      .sort((a, b) => b.norm.length - a.norm.length)[0]
    if (contained && t.length > 2)
      return { kind: 'option', value: contained.value, label: contained.label }
    const words = new Set(t.split(' ').filter((w) => w.length > 2))
    let best: { o: (typeof labelled)[number]; score: number } | null = null
    for (const o of labelled) {
      const ow = o.norm.split(' ').filter((w) => w.length > 2)
      if (!ow.length) continue
      const score = ow.filter((w) => words.has(w)).length / ow.length
      if (score >= 0.5 && (!best || score > best.score)) best = { o, score }
    }
    if (best) return { kind: 'option', value: best.o.value, label: best.o.label }
  }

  // 4. Yes / no (consent and yes/no questions)
  if (YES.includes(t)) return { kind: 'yes' }
  if (NO.includes(t)) return { kind: 'no' }
  return { kind: 'none' }
}

// ---- Commands are delivered to whichever screen can handle them (the form engine handles next/back) ------------

const EVENT = 'af:voice-command'

/** Returns true when a screen handled the command. */
export function emitVoiceCommand(command: VoiceCommand) {
  const event = new CustomEvent<VoiceCommand>(EVENT, { detail: command, cancelable: true })
  return !window.dispatchEvent(event)
}

export function onVoiceCommand(handler: (command: VoiceCommand) => boolean) {
  const listener = (e: Event) => {
    if (handler((e as CustomEvent<VoiceCommand>).detail)) e.preventDefault()
  }
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
