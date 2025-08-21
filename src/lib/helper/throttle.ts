function throttle<T extends (...args: unknown[]) => void>(fn: T, limit = 100) {
    let lastCall = 0
    return function (...args: Parameters<T>) {
        const now = Date.now()
        if (now - lastCall >= limit) {
            lastCall = now
            fn.apply(this, args)
        }
    }
}

export default throttle
