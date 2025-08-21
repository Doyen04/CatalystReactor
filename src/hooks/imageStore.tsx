import { create } from 'zustand'

interface ImageState {
    // selectedImageUrls: string[] | null
    getNextImage: () => ArrayBuffer | null
    selectedImageFiles: ArrayBuffer[]
    // currentIndex: number
    setSelectedImage: (selectedImageFiles: ArrayBuffer[]) => void
    clearSelectedImage: () => void
    hasImages: () => boolean
    hasNoImages: () => boolean
}

export const useImageStore = create<ImageState>((set, get) => ({
    // selectedImageUrls: [],
    selectedImageFiles: [],
    // currentIndex: 0,
    setSelectedImage: (selectedImageFiles: ArrayBuffer[]) => {
        set({
            selectedImageFiles: selectedImageFiles,
            // currentIndex: 0
        })
    },
    getNextImage: () => {
        const { selectedImageFiles } = get()

        if (!selectedImageFiles || selectedImageFiles.length === 0) {
            return null
        }
        const [file, ...rest] = selectedImageFiles

        // Move to next image for next call
        set({ selectedImageFiles: rest })

        return file
    },
    clearSelectedImage: () => {
        set({
            selectedImageFiles: [],
        })
    },
    hasImages: () => {
        const { selectedImageFiles } = get()
        return selectedImageFiles.length > 0
    },
    hasNoImages: () => {
        const { selectedImageFiles } = get()
        console.log('selectedImageFiles', selectedImageFiles)
        return !selectedImageFiles || selectedImageFiles.length === 0
    },
}))
