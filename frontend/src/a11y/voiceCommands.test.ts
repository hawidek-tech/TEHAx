import { describe, expect, it } from 'vitest'
import { interpret } from './voiceCommands'

const intents = [
  { value: 'job', label: 'Find a job' },
  { value: 'profile', label: 'Create my profile' },
  { value: 'support', label: 'Ask for support' },
  { value: 'start', label: 'Help me get started' },
]

describe('spoken answers', () => {
  it('understands whole-utterance commands in English and Amharic', () => {
    expect(interpret('Next.')).toEqual({ kind: 'command', command: 'next' })
    expect(interpret('go back')).toEqual({ kind: 'command', command: 'back' })
    expect(interpret('ድገም')).toEqual({ kind: 'command', command: 'repeat' })
  })
  it('chooses by number, in words or digits', () => {
    expect(interpret('two', intents)).toMatchObject({ kind: 'option', value: 'profile' })
    expect(interpret('number 3', intents)).toMatchObject({ kind: 'option', value: 'support' })
    expect(interpret('the first one', intents)).toMatchObject({ kind: 'option', value: 'job' })
    expect(interpret('ሁለት', intents)).toMatchObject({ kind: 'option', value: 'profile' })
  })
  it('chooses by name, also inside a short sentence', () => {
    expect(interpret('Find a job', intents)).toMatchObject({ kind: 'option', value: 'job' })
    expect(interpret('I want to ask for support please', intents)).toMatchObject({
      value: 'support',
    })
    expect(interpret('my profile', intents)).toMatchObject({ value: 'profile' })
  })
  it('does not guess', () => {
    expect(interpret('banana', intents)).toEqual({ kind: 'none' })
    expect(interpret('seven', intents)).toEqual({ kind: 'none' })
    expect(interpret('')).toEqual({ kind: 'none' })
  })
  it('understands yes and no', () => {
    expect(interpret('Yes')).toEqual({ kind: 'yes' })
    expect(interpret('አዎ')).toEqual({ kind: 'yes' })
    expect(interpret('no')).toEqual({ kind: 'no' })
  })
})
