import { create } from 'zustand'

interface MoreToolsStore {
    openToolsId: string | null
    setOpenToolsId: (id: string | null) => void
    toggleTools: (id: string) => void
}

export const useMoreToolsStore = create<MoreToolsStore>((set, get) => ({
    openToolsId: null,
    setOpenToolsId: (id) => set({ openToolsId: id }),
    toggleTools: (id) => {
        const { openToolsId } = get()
        set({ openToolsId: openToolsId === id ? null : id })
    },
}))