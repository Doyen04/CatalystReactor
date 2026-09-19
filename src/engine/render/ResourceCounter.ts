export interface ResourceCounterSource {
    readonly size: number
}

const counters = new Map<string, ResourceCounterSource>()

export function registerResourceCounter(name: string, source: ResourceCounterSource): void {
    counters.set(name, source)
}

export function unregisterResourceCounter(name: string): void {
    counters.delete(name)
}

export function startResourceCounterMonitor(intervalMs?: number): () => void {
    if (!import.meta.env.DEV) return () => {}

    const handle = setInterval(() => {
        const snapshot: Record<string, number> = {}
        for (const [name, source] of counters) {
            snapshot[name] = source.size
        }
        console.debug('[skia]', snapshot)
    }, intervalMs ?? 5000)

    return () => {
        clearInterval(handle)
    }
}
