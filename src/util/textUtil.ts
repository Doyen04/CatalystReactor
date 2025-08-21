// dont realy understand this yet
export function isPrintableCharUnicode(key: string): boolean {
    return key.length === 1 && /\P{Cc}/u.test(key)
}
