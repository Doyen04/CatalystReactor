import React, { useEffect, useState } from 'react'
import { useSceneStore } from '@hooks/sceneStore'
import { useCanvasManagerStore } from '@hooks/useCanvasManagerStore'
import { useEditor } from '@/bridge/useEditor'
import { useDocumentRevision } from '@/bridge/useDocumentRevision'
import { Square, Circle, Star, Type, MousePointer2, Layers, ChevronDown, ChevronRight } from 'lucide-react'

interface LayerItem {
    id: string
    name: string
    type: string
    depth: number
    isContainer: boolean
    isExpanded: boolean
}

const ShapeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'rect':
            return <Square size={13} />
        case 'plainRect':
            return <Square size={13} />
        case 'oval':
            return <Circle size={13} />
        case 'star':
            return <Star size={13} />
        case 'text':
            return <Type size={13} />
        case 'path':
            return <MousePointer2 size={13} />
        case 'bezier':
            return <MousePointer2 size={13} />
        case 'line':
            return <MousePointer2 size={13} />
        default:
            return <Layers size={13} />
    }
}

const LayersPanel: React.FC = () => {
    const { selectedShapeId } = useSceneStore()
    const { canvasManager } = useCanvasManagerStore()
    const editor = useEditor()
    useDocumentRevision()

    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

    // Auto-expand parents of a selected layer so that it is visible in the tree
    useEffect(() => {
        if (!selectedShapeId || !editor) return

        const parentIds = editor.doc.ancestorsOf(selectedShapeId).filter(id => id !== 'root')

        if (parentIds.length > 0) {
            setExpandedIds(prev => {
                let changed = false
                const next = { ...prev }
                for (const id of parentIds) {
                    if (next[id] === false) {
                        next[id] = true
                        changed = true
                    }
                }
                return changed ? next : prev
            })
        }
    }, [selectedShapeId, editor])

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setExpandedIds(prev => ({
            ...prev,
            [id]: prev[id] === false ? true : false,
        }))
    }

    const handleLayerClick = (id: string) => {
        if (!canvasManager) return
        const node = canvasManager.sceneManager.getNode(id)
        if (node) {
            canvasManager.shapeManager.attachNode(node)
        }
    }

    const buildVisibleLayers = (): LayerItem[] => {
        if (!editor) return []

        const visibleLayers: LayerItem[] = []

        const traverse = (id: string, depth: number) => {
            const record = editor.doc.get(id)
            if (!record) return

            const isContainer = record.type === 'plainRect' || editor.doc.childrenOf(id).length > 0
            const type = record.type

            // Calculate human-readable display name
            let name = ''
            if (isContainer) {
                const layoutConstraints = record.properties.layoutConstraints as { type?: string } | undefined
                const layoutType = layoutConstraints?.type
                name = layoutType ? layoutType.charAt(0).toUpperCase() + layoutType.slice(1) : 'Group'
            } else {
                name = type.charAt(0).toUpperCase() + type.slice(1)
                if (name === 'PlainRect') name = 'Rectangle'
                if (name === 'Img') name = 'Image'
            }
            const shortId = id.substring(0, 4)
            const displayName = `${name} (${shortId})`

            const isExpanded = expandedIds[id] !== false // Default containers to expanded

            visibleLayers.push({
                id,
                name: displayName,
                type,
                depth,
                isContainer,
                isExpanded,
            })

            if (isContainer && isExpanded) {
                editor.doc.childrenOf(id).forEach(childId => traverse(childId, depth + 1))
            }
        }

        editor.doc.childrenOf(editor.doc.rootId).forEach(childId => traverse(childId, 0))
        return visibleLayers
    }

    const layers = buildVisibleLayers()

    return (
        <div className="flex flex-col flex-1 overflow-hidden select-none bg-[#1e1e1e] border-r border-[#2d2d2d]">
            <div className="px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider border-b border-[#2d2d2d] flex justify-between items-center">
                <span>Layers</span>
                <span className="bg-[#2d2d2d] px-1.5 py-0.5 rounded-full text-[9px] text-gray-400 font-mono">{layers.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-[2px]">
                {layers.length === 0 ? (
                    <div className="text-gray-600 text-[11px] text-center mt-10">No layers yet</div>
                ) : (
                    layers.map(layer => (
                        <div
                            key={layer.id}
                            className={`flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer transition-all border-l-2 text-xs ${
                                selectedShapeId === layer.id
                                    ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-medium'
                                    : 'border-transparent hover:bg-[#252525] text-gray-300'
                            }`}
                            style={{ paddingLeft: `${layer.depth * 14 + 6}px` }}
                            onClick={() => handleLayerClick(layer.id)}
                        >
                            {layer.isContainer ? (
                                <button
                                    onClick={e => toggleExpand(e, layer.id)}
                                    className="p-0.5 hover:bg-[#2e2e2e] rounded text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center cursor-pointer mr-0.5"
                                >
                                    {layer.isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                </button>
                            ) : (
                                <div className="w-[17px]" />
                            )}
                            <div className={`flex items-center justify-center ${selectedShapeId === layer.id ? 'text-[#3b82f6]' : 'text-gray-500'}`}>
                                <ShapeIcon type={layer.type} />
                            </div>
                            <span className="truncate flex-1 font-mono tracking-tight text-[11px]">{layer.name}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default LayersPanel
