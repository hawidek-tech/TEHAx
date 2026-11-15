/**
 * Validated sign-language video clips for fixed messages (text-to-sign).
 * Only clips recorded by fluent signers and checked by Deaf community reviewers may be listed. None exist yet, so this
 * manifest is empty and no sign presentation is shown - ACCESSFLOW never generates or invents signs.
 */
export interface SignClip {
  src: string
  signLanguage: 'ethsl'
  signedBy: string
  validatedBy: string
  validatedOn: string
}

export const VALIDATED_CLIPS: Record<string, SignClip> = {}

export const clipFor = (messageKey: string): SignClip | undefined => VALIDATED_CLIPS[messageKey]
