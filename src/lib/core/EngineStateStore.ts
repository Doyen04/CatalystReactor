import { Properties, ShapeType } from "@lib/types/shapes"

export interface ShapeData {
    id: string
    type: ShapeType
    properties: Properties // Will be specialized for each shape
}

class EngineStateStore {
    private static instance: EngineStateStore
    private shapeDataMap: Map<string, ShapeData> = new Map()
    private listeners: Set<(shapeId?: string) => void> = new Set()

    private constructor() {}

    public static getInstance(): EngineStateStore {
        if (!EngineStateStore.instance) {
            EngineStateStore.instance = new EngineStateStore()
        }
        return EngineStateStore.instance
    }

    createShapeData(id: string, type: ShapeType, properties: Properties): ShapeData {
        const data: ShapeData = { id, type, properties }
        this.shapeDataMap.set(id, data)
        return data
    }

    getShapeData(id: string): ShapeData | undefined {
        return this.shapeDataMap.get(id)
    }

    getAllShapeData(): ShapeData[] {
        return Array.from(this.shapeDataMap.values())
    }

    public subscribe(listener: (shapeId?: string) => void) {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    public notify(shapeId?: string) {
        this.listeners.forEach(l => l(shapeId))
    }
}

export default EngineStateStore
