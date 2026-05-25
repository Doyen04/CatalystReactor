import React, { useEffect, useState } from 'react'
import EngineStateStore, { ShapeData } from '@lib/core/EngineStateStore'
import { useSceneStore } from '@hooks/sceneStore'
import { Square, Circle, Star, Type, MousePointer2, Layers } from 'lucide-react'

const ShapeIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'rect': return <Square size={14} />
        case 'oval': return <Circle size={14} />
        case 'star': return <Star size={14} />
        case 'text': return <Type size={14} />
        case 'path': return <MousePointer2 size={14} />
        default: return <Layers size={14} />
    }
}

const LayersPanel: React.FC = () => {
    const { selectedShapeId, setSelectedShapeId } = useSceneStore()
    const [shapes, setShapes] = useState<ShapeData[]>([])

    useEffect(() => {
        const updateShapes = () => {
            setShapes(EngineStateStore.getInstance().getAllShapeData())
        }

        updateShapes()
        return EngineStateStore.getInstance().subscribe(updateShapes)
    }, [])

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase font-bold text-gray-500 tracking-widest border-b border-[#333]">
                Layers
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {shapes.length === 0 ? (
                    <div className="text-gray-600 text-[11px] text-center mt-10">No layers yet</div>
                ) : (
                    shapes.map(shape => (
                        <div
                            key={shape.id}
                            className={`layer-item ${selectedShapeId === shape.id ? 'selected' : ''}`}
                            onClick={() => setSelectedShapeId(shape.id)}
                        >
                            <ShapeIcon type={shape.type} />
                            <span className="truncate">{shape.id}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default LayersPanel
