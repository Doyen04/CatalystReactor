export type EngineEvents = {
    'tool:changed': { tool: string }
    'selection:changed': { id: string | null }
    'document:changed': { ids: string[] }
    'history:changed': { canUndo: boolean; canRedo: boolean }
}
