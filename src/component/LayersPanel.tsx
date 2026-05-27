import React, { useEffect, useState } from 'react'
import EngineStateStore from '@lib/core/EngineStateStore'
import { useSceneStore } from '@hooks/sceneStore'
import { useCanvasManagerStore } from '@hooks/useCanvasManager'
import SceneNode from '@lib/node/Scene'
import ContainerNode from '@lib/node/ContainerNode'
import { Square, Circle, Star, Type, MousePointer2, Layers, ChevronDown, ChevronRight } from 'lucide-react'

const ShapeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'rect': return <Square size={13} />
        case 'plainRect': return <Square size={13} />
        case 'oval': return <Circle size={13} />
        case 'star': return <Star size={13} />
        case 'text': return <Type size={13} />
        case 'path': return <MousePointer2 size={13} />
        case 'bezier': return <MousePointer2 size={13} />
        case 'line': return <MousePointer2 size={13} />
        default: return <Layers size={13} />
    }
}

const LayersPanel: React.FC = () => {
    const { selectedShapeId } = useSceneStore()
    const { canvasManager } = useCanvasManagerStore()
    const sceneManager = canvasManager?.sceneManager

    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
    const [tick, setTick] = useState(0)

    //this looks like and hack
    // Force re-render on Engine state store changes
    useEffect(() => {
        const handleUpdate = () => {
            setTick((t) => t + 1)
        }

        const unsubscribe = EngineStateStore.getInstance().subscribe(handleUpdate)
        return () => {
            unsubscribe()
        }
    }, [])

    // Auto-expand parents of a selected layer so that it is visible in the tree
    useEffect(() => {
        if (!selectedShapeId || !sceneManager) return

        const flattened = sceneManager.flattenScene()
        const node = flattened.find((n) => n.id === selectedShapeId)
        if (!node) return

        let parent = node.getParent()
        const parentIds: string[] = []
        while (parent && parent.id !== 'root') {
            parentIds.push(parent.id)
            parent = parent.getParent()
        }

        if (parentIds.length > 0) {
            setExpandedIds((prev) => {
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
    }, [selectedShapeId, sceneManager])

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        setExpandedIds((prev) => ({
            ...prev,
            [id]: prev[id] === false ? true : false,
        }))
    }

    const handleLayerClick = (layer: any) => {
        if (!canvasManager) return
        const node = layer.node
        if (node) {
            canvasManager.shapeManager.attachNode(node)
        }
    }

    const buildVisibleLayers = (): any[] => {
        if (!sceneManager) return []
        const root = sceneManager.getRootContainer()
        if (!root) return []

        const visibleLayers: any[] = []

        const traverse = (node: SceneNode, depth: number) => {
            if (node !== root) {
                const id = node.id
                const isContainer = node instanceof ContainerNode
                const type = node.getShapeType() || (isContainer ? 'container' : 'shape')

                // Calculate human-readable display name
                let name = ''
                if (isContainer) {
                    const layoutType = (node as ContainerNode).getLayoutConstraints()?.type
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
                    node,
                })

                if (isContainer && isExpanded) {
                    node.getChildren().forEach((child) => traverse(child, depth + 1))
                }
            } else {
                node.getChildren().forEach((child) => traverse(child, depth))
            }
        }

        traverse(root, 0)
        return visibleLayers
    }

    const layers = buildVisibleLayers()

    return (
        <div className="flex flex-col flex-1 overflow-hidden select-none bg-[#1e1e1e] border-r border-[#2d2d2d]">
            <div className="px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-wider border-b border-[#2d2d2d] flex justify-between items-center">
                <span>Layers</span>
                <span className="bg-[#2d2d2d] px-1.5 py-0.5 rounded-full text-[9px] text-gray-400 font-mono">
                    {layers.length}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-[2px]">
                {layers.length === 0 ? (
                    <div className="text-gray-600 text-[11px] text-center mt-10">No layers yet</div>
                ) : (
                    layers.map((layer) => (
                        <div
                            key={layer.id}
                            className={`flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer transition-all border-l-2 text-xs ${selectedShapeId === layer.id
                                    ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6] font-medium'
                                    : 'border-transparent hover:bg-[#252525] text-gray-300'
                                }`}
                            style={{ paddingLeft: `${layer.depth * 14 + 6}px` }}
                            onClick={() => handleLayerClick(layer)}
                        >
                            {layer.isContainer ? (
                                <button
                                    onClick={(e) => toggleExpand(e, layer.id)}
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
                            <span className="truncate flex-1 font-mono tracking-tight text-[11px]">
                                {layer.name}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default LayersPanel
