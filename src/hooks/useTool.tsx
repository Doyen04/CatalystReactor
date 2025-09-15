import { MousePointer2 } from 'lucide-react'
import React from 'react'
import { create } from 'zustand'

export type Tool = {
    toolName: string
    icon: React.ReactNode
    tip: string
}

interface ToolState {
    tool: Tool | null
    defaultTool: Tool | null
    selectedByGroup: Record<string, Tool>
    setTool: (tool: Tool, groupId?: string) => void
    getSelectedForGroup: (groupId: string, fallback: Tool) => Tool
    setDefaultTool: () => void
}

export const useToolStore = create<ToolState>((set, get) => ({
    tool: null,
    defaultTool: {
        toolName: 'select',
        icon: <MousePointer2 className={'w-4 h-4'} />,
        tip: 'Select',
    },
    selectedByGroup: {},

    setTool: (tool: Tool, groupId?: string) =>
        set(state => ({
            tool,
            selectedByGroup: groupId ? { ...state.selectedByGroup, [groupId]: tool } : state.selectedByGroup,
        })),
        
    getSelectedForGroup: (groupId, fallback) => {
        const s = get()
        return s.selectedByGroup[groupId] ?? fallback
    },

    setDefaultTool: () => set({ tool: get().defaultTool }),
}))
