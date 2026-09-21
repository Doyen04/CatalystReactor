export interface Deletable {
    delete(): void
}

export class ResourceScope {
    private owned: Deletable[] = []
    private isDisposed = false

    track<T extends Deletable>(resource: T): T {
        if (this.isDisposed) throw new Error('ResourceScope is already disposed')
        this.owned.push(resource)
        return resource
    }

    get size(): number {
        return this.owned.length
    }

    get disposed(): boolean {
        return this.isDisposed
    }

    dispose(): void {
        if (this.isDisposed) return
        this.isDisposed = true
        for (let i = this.owned.length - 1; i >= 0; i--) {
            try {
                this.owned[i].delete()
            } catch (error) {
                console.warn('ResourceScope: failed to delete a tracked resource', error)
            }
        }
        this.owned = []
    }
}
