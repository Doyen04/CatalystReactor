export const loadImage = async (urls: string[]): Promise<ArrayBuffer[]> => {
    const controller = new AbortController()
    const { signal } = controller

    const promises = urls.map(url =>
        fetch(url, { signal, mode: 'cors' }).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url} (${response.status} ${response.statusText})`)
            }
            return response.arrayBuffer()
        })
    )

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
