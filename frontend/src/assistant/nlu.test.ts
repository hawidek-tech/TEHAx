import { describe, expect, it } from 'vitest'
import { anyJob, control, email, intent, jobKeywords, number, phone, yesNo } from './nlu'

describe('assistant understanding (rule-based)', () => {
  it('recognises what people want in everyday English and Amharic', () => {
    expect(intent('I want to find a job')).toBe('findJob')
    expect(intent('Can you help me look for work?')).toBe('findJob')
    expect(intent('ሥራ መፈለግ እፈልጋለሁ')).toBe('findJob')
    expect(intent('I would like to create my profile')).toBe('createProfile')
    expect(intent('I need support at work')).toBe('support')
    expect(intent('what happened to my applications')).toBe('track')
    expect(intent('ማመልከቻዎቼ')).toBe('track')
    expect(intent('speak Amharic')).toBe('amharic')
    expect(intent('banana')).toBeNull()
  })
  it('takes the job subject out of a sentence', () => {
    expect(jobKeywords('I want to find a job in software development')).toBe('software development')
    expect(jobKeywords('Software development.')).toBe('software development')
    expect(jobKeywords('I want to find a job')).toBe('')
    expect(anyJob('any job is fine')).toBe(true)
  })
  it('controls only when the whole answer is a control', () => {
    expect(control('Repeat that')).toBe('repeat')
    expect(control('go back')).toBe('back')
    expect(control('I need help')).toBe('help')
    expect(control('ድገም')).toBe('repeat')
    expect(control('I want to go back to school')).toBeNull()
  })
  it('yes and no in natural words', () => {
    expect(yesNo('Yes please')).toBe('yes')
    expect(yesNo('yes, send it')).toBe('yes')
    expect(yesNo('No thanks')).toBe('no')
    expect(yesNo('አዎ')).toBe('yes')
    expect(yesNo('maybe later today')).toBeNull()
  })
  it('turns spoken numbers and addresses into text', () => {
    expect(phone('zero nine one one, 22 33 44 55')).toBe('0911223344'.slice(0, 4) + '22334455')
    expect(phone('0 9 1 1 double 2 3 3 4 4')).toBe('0911223344')
    expect(phone('ዜሮ ዘጠኝ')).toBe('09')
    expect(email('almaz dot b at gmail dot com')).toBe('almaz.b@gmail.com')
    expect(number('1995')).toBe(1995)
    expect(number('the second one')).toBe(2)
  })
})
