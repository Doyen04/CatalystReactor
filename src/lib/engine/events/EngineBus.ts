export type EngineListener<T> = (payload: T) => void

type StoredListener = (payload: never) => void

export class EngineBus<Events extends Record<string, unknown>> {
    private listeners = new Map<keyof Events, Set<StoredListener>>()

    on<K extends keyof Events>(type: K, listener: EngineListener<Events[K]>): () => void {
        let set = this.listeners.get(type)
        if (!set) {
            set = new Set()
            this.listeners.set(type, set)
        }
        const stored = listener as unknown as StoredListener
        set.add(stored)
        return () => {
            set.delete(stored)
        }
    }

    emit<K extends keyof Events>(type: K, payload: Events[K]): void {
        const set = this.listeners.get(type)
        if (!set) return
        for (const listener of Array.from(set)) {
            ;(listener as unknown as EngineListener<Events[K]>)(payload)
        }
    }

    clear(): void {
        this.listeners.clear()
    }
}
