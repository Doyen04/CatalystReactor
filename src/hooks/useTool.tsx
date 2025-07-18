import React from 'react'
import { create } from 'zustand'

interface ToolState {
  tool: {
    toolName: string
    icon: React.ReactNode
    tip: string
  } | null;
  setTool: (tool: {
    toolName: string
    icon: React.ReactNode
    tip: string
  }) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: null,
  setTool: (tool: {
    toolName: string
    icon: React.ReactNode
    tip: string
  }) => set({ tool }),
}))