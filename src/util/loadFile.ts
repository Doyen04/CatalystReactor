export const loadImage = async (imageData: { url: string; name: string }[]): Promise<{ imageBuffer: ArrayBuffer; name: string }[]> => {
    const controller = new AbortController()
    const { signal } = controller

    const promises = imageData.map(async item => {
        const response = await fetch(item.url, { signal, mode: 'cors' })
        if (!response.ok) {
            throw new Error(`Failed to fetch ${item.url} (${response.status} ${response.statusText})`)
        }
        const imageBuffer = await response.arrayBuffer()
        return { imageBuffer, name: item.name }
    })

    try {
        return await Promise.all(promises)
    } catch (err) {
        controller.abort() // Abort remaining requests if any fail
        throw err
    }
}

export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url) // Clean up
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url) // Clean up
            reject(new Error(`Failed to load image from file: ${file.name}`))
        }

        img.src = url
    })
}
