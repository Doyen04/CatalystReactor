import { create } from 'zustand'

interface ImageState {
    selectedImageUrls: string[] | null
    selectedImageFiles: FileList | null
    setSelectedImage: (file: FileList, url: string[]) => void
    clearSelectedImage: () => void
}

export const useImageStore = create<ImageState>((set, get) => ({
    selectedImageUrls: null,
    selectedImageFiles: null,
    setSelectedImage: (files: FileList, url: string[]) =>
        set({ selectedImageFiles: files, selectedImageUrls: url }),
    clearSelectedImage: () => {
        const { selectedImageUrls } = get()
        selectedImageUrls.forEach(url => URL.revokeObjectURL(url))
        set({ selectedImageFiles: null, selectedImageUrls: null })
    },
}))