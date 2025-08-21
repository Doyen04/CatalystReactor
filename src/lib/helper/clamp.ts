export default function clamp(val: number, min: number, max: number) {
    if (min > max) {
        throw new RangeError('Math.clamp: min cannot be greater than max')
    }
    return Math.min(Math.max(val, min), max)
}
