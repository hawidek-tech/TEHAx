import type { FlowData } from '../../engine/types'

/**
 * Registration in 4 questions: phone is the usual contact, so "phone or email?" is not asked. "Use email instead"
 * is a link on the phone question (and "Use phone instead" on the email question). Used by the app and the module.
 */
export function registrationShortcuts(t: (key: string) => string) {
  return {
    initial: { contactMethod: 'phone' } as FlowData,
    skipSteps: ['contactMethod'],
    alternatives: {
      phone: { label: t('start.account.useEmail'), set: { contactMethod: 'email' }, goTo: 'email' },
      email: { label: t('start.account.usePhone'), set: { contactMethod: 'phone' }, goTo: 'phone' },
    },
  }
}
