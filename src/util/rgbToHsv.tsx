const rgbToHsv = (r: number, g: number, b: number): HSV => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min

    let h = 0
    const s = max === 0 ? 0 : (diff / max) * 100
    const v = max * 100

    if (diff !== 0) {
        if (max === r) {
            h = ((g - b) / diff) % 6
        } else if (max === g) {
            h = (b - r) / diff + 2
        } else {
            h = (r - g) / diff + 4
        }
        h *= 60
        if (h < 0) h += 360
    }

    return { h, s, v }
}

export default rgbToHsv
