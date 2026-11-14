import { storage } from '../lib/storage'
import type { FlowData } from './types'

/**
 * Local (on-device) draft copy used when the connection drops.
 * - Sensitive fields (passwords, ID numbers, support details) are NEVER written to the device.
 * - Disabled entirely in "shared device" mode.
 * - Expires after 7 days; removed on sign-out.
 */
export const LOCAL_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface LocalDraft {
  data: FlowData
  step?: string
  savedAt: number
  pendingSync: boolean
}

const key = (owner: string, flowKey: string, context: string) =>
  `draft:${owner}:${flowKey}:${context}`

export function saveLocalDraft(
  owner: string,
  flowKey: string,
  context: string,
  data: FlowData,
  step: string | undefined,
  sensitive: Set<string>,
  pendingSync: boolean,
  sharedDevice: boolean,
) {
  if (sharedDevice) return
  const safe: FlowData = {}
  Object.entries(data).forEach(([k, v]) => {
    if (!sensitive.has(k)) safe[k] = v
  })
  storage.set(key(owner, flowKey, context), {
    data: safe,
    step,
    savedAt: Date.now(),
    pendingSync,
  } satisfies LocalDraft)
}

export function loadLocalDraft(owner: string, flowKey: string, context: string): LocalDraft | null {
  const d = storage.get<LocalDraft | null>(key(owner, flowKey, context), null)
  if (!d) return null
  if (Date.now() - d.savedAt > LOCAL_DRAFT_TTL_MS) {
    storage.remove(key(owner, flowKey, context))
    return null
  }
  return d
}

export function clearLocalDraft(owner: string, flowKey: string, context: string) {
  storage.remove(key(owner, flowKey, context))
}
