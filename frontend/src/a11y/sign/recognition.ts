/**
 * Sign-language recognition adapter.
 *
 * IMPORTANT: no recogniser is registered. There is currently no validated Ethiopian Sign Language (EthSL) recognition
 * model available to this project, and a simulated result must never be shown as real recognition. The camera
 * interface, privacy controls and confirm-before-use flow are implemented so that a validated, locally running model
 * can be plugged in later by registering it here (see docs/integration/sign-language.md).
 */
export interface SignRecognitionResult {
  text: string
  /** 0..1. Results below MIN_CONFIDENCE are shown as "unsure" and never used without the user's confirmation. */
  confidence: number
}

export interface SignRecognizer {
  id: string
  /** Signed language, e.g. 'ethsl' (Ethiopian Sign Language). Spoken languages (am, om, en, ti) are NOT sign languages. */
  signLanguage: string
  /** true only when the model runs locally in the browser (no video leaves the device). */
  runsLocally: boolean
  /** Name of the people or organisation that validated accuracy with signers. Required for registration. */
  validatedBy: string
  start(video: HTMLVideoElement, onResult: (r: SignRecognitionResult) => void): Promise<void>
  stop(): void
}

export const MIN_CONFIDENCE = 0.8

const registered: SignRecognizer[] = []

export function registerRecognizer(r: SignRecognizer) {
  if (!r.validatedBy) throw new Error('Only validated sign recognisers may be registered')
  registered.push(r)
}

export function availableRecognizer(signLanguage = 'ethsl'): SignRecognizer | null {
  return registered.find((r) => r.signLanguage === signLanguage) ?? null
}
