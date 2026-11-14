import { describe, expect, it } from 'vitest'
import {
  collectVisibleData,
  initialData,
  normaliseEthiopianPhone,
  validateField,
  visibleSteps,
} from './logic'
import { loadLocalDraft, saveLocalDraft } from './drafts'
import type { FlowDefinition } from './types'

const def: FlowDefinition = {
  key: 't',
  version: 1,
  sections: ['a'],
  steps: [
    {
      id: 'method',
      section: 'a',
      fields: [
        {
          id: 'method',
          type: 'radio',
          required: true,
          options: [{ value: 'phone' }, { value: 'email' }],
        },
      ],
    },
    {
      id: 'phone',
      section: 'a',
      showIf: { field: 'method', in: ['phone'] },
      fields: [{ id: 'phone', type: 'tel', required: true }],
    },
    {
      id: 'email',
      section: 'a',
      showIf: { field: 'method', in: ['email'] },
      fields: [{ id: 'email', type: 'email', required: true, prefill: 'account.email' }],
    },
    {
      id: 'pw',
      section: 'a',
      fields: [{ id: 'password', type: 'password', required: true, sensitive: true }],
    },
  ],
}

describe('form engine logic', () => {
  it('shows only steps whose condition matches', () => {
    expect(visibleSteps(def, { method: 'phone' }).map((s) => s.id)).toEqual([
      'method',
      'phone',
      'pw',
    ])
  })

  it('submits only answers to visible steps', () => {
    expect(collectVisibleData(def, { method: 'phone', phone: '0911', email: 'x@y.z' })).toEqual({
      method: 'phone',
      phone: '0911',
    })
  })

  it('normalises Ethiopian phone numbers like the server', () => {
    expect(normaliseEthiopianPhone('0911 23 45 67')).toBe('+251911234567')
    expect(normaliseEthiopianPhone('+251 711-234-567')).toBe('+251711234567')
    expect(normaliseEthiopianPhone('12345')).toBeNull()
  })

  it('uses the same error codes as the server', () => {
    expect(validateField({ id: 'a', type: 'text', required: true }, '  ')).toBe(
      'validation.required',
    )
    expect(validateField({ id: 'a', type: 'email' }, 'nope')).toBe('validation.email')
    expect(validateField({ id: 'a', type: 'consent', required: true }, false)).toBe(
      'validation.consent',
    )
    expect(
      validateField({ id: 'a', type: 'year', min: 1940, max: -14 }, '2025', new Date(2026, 0, 1)),
    ).toBe('validation.max')
    expect(validateField({ id: 'a', type: 'text', validator: 'last4' }, '12a')).toBe(
      'validation.last4',
    )
  })

  it('prefills from sources without overwriting existing answers', () => {
    expect(initialData(def, { 'account.email': 'me@example.com' })).toMatchObject({
      email: 'me@example.com',
    })
    expect(
      initialData(def, { 'account.email': 'me@example.com' }, { email: 'typed@example.com' }).email,
    ).toBe('typed@example.com')
  })

  it('never stores sensitive fields on the device, and stores nothing in shared-device mode', () => {
    saveLocalDraft(
      'u1',
      't',
      '',
      { method: 'phone', password: 'secret pass' },
      'pw',
      new Set(['password']),
      false,
      false,
    )
    expect(loadLocalDraft('u1', 't', '')?.data).toEqual({ method: 'phone' })
    expect(JSON.stringify(window.localStorage)).not.toContain('secret pass')
    saveLocalDraft('u2', 't', '', { method: 'email' }, 'pw', new Set(), false, true)
    expect(loadLocalDraft('u2', 't', '')).toBeNull()
  })
})
