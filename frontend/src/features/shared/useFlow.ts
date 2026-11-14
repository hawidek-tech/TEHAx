import { useApi } from '../../lib/useApi'
import type { FlowDefinition } from '../../engine/types'

export const useFlow = (key: string) => useApi<FlowDefinition>(`/api/v1/forms/${key}`)
