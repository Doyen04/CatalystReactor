import { MousePointer2 } from 'lucide-react';
import React from 'react'
import { create } from 'zustand'

interface ToolState {
    tool: {
        toolName: string
        icon: React.ReactNode
        tip: string
    } | null;
    defaultTool: {
        toolName: string
        icon: React.ReactNode
        tip: string
    } | null;
    setTool: (tool: {
        toolName: string
        icon: React.ReactNode
        tip: string
    }) => void
    setDefaultTool: () => void
}

export const useToolStore = create<ToolState>((set, get) => ({
    tool: null,
    defaultTool: {
        toolName: 'select',
        icon: <MousePointer2 className={"w-4 h-4"} />,
        tip: 'Select'
    },

    setTool: (tool: {
        toolName: string
        icon: React.ReactNode
        tip: string
    }) => set({ tool }),
    
    setDefaultTool: () => set({ tool: get().defaultTool }),
}))