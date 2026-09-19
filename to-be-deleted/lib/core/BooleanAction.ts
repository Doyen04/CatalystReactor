import EngineStateStore, { ShapeData } from '@lib/core/EngineStateStore'
import type { Action } from '@lib/core/HistoryManager'

export class BooleanAction implements Action {
    type = 'BOOLEAN_OPERATION'

    constructor(
        private readonly oldShapeDatas: ShapeData[],
        private readonly newShapeData: ShapeData
    ) {}

    undo() {
        const store = EngineStateStore.getInstance()
        store.removeShapeData(this.newShapeData.id)

        for (const data of this.oldShapeDatas) {
            store.createShapeData(data.id, data.type, structuredClone(data.properties))
        }
        store.notify()
    }

    redo() {
        const store = EngineStateStore.getInstance()
        for (const data of this.oldShapeDatas) {
            store.removeShapeData(data.id)
        }
        store.createShapeData(this.newShapeData.id, this.newShapeData.type, structuredClone(this.newShapeData.properties))
        store.notify()
    }
}