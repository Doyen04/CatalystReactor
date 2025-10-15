export interface Deletable {
    delete?(): void;
}

export class PCache<T extends Deletable> {
    private cache = new Map<string, T>()

    get(key: string): T | undefined {
        if (!this.cache.has(key)) return undefined

        const value = this.cache.get(key)!
        // Move key to the end to mark it as recently used
        this.cache.delete(key)
        this.cache.set(key, value)
        return value
    }

    set(key: string, value: T): void {
        if (this.cache.has(key)) {
            const old = this.cache.get(key)!
            // If the value has a delete method, call it safely
            try {
                (old)?.delete?.()
            } catch {
                console.warn('deletion not implemented on cache value')
            }
            this.cache.delete(key)
        }
        this.cache.set(key, value)
    }

    has(key: string): boolean {
        return this.cache.has(key)
    }

    delete(key: string): boolean {
        const value = this.cache.get(key)
        try {
            (value)?.delete?.()
        } catch {console.warn('deletion not implemented on cache value');
        }
        return this.cache.delete(key)
    }

    clear(): void {
        for (const value of this.cache.values()) {
            try {
                (value)?.delete?.()
            } catch {console.warn('deletion not implemented on cache value');
            }
        }
        this.cache.clear()
    }
}
