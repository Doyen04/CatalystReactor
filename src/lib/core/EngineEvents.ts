import type { Properties } from '@lib/types/shapes'

export type EngineEvents = {
    'tool:changed': { tool: string }
    'selection:changed': { id: string | null }
    'properties:changed': { id: string | null; properties: Properties }
    'history:changed': { canUndo: boolean; canRedo: boolean }
}
