import { create } from 'zustand'

interface ToolState {
  tool: string
  setTool: (tool: string) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  setTool: (tool: string) => set({ tool }),
}))