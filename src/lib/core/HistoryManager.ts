import EngineStateStore, { ShapeData } from './EngineStateStore'

export interface Action {
    type: string
    undo(): void
    redo(): void
}

export class UpdateShapeAction implements Action {
    type = 'UPDATE_SHAPE'

    constructor(
        public readonly shapeId: string,
        private readonly oldState: any, // snapshot of old properties
        private readonly newState: any  // snapshot of new properties
    ) {}

    undo() {
        const store = EngineStateStore.getInstance()
        const shape = store.getShapeData(this.shapeId)
        if (shape) {
            shape.properties = structuredClone(this.oldState)
            store.notify(this.shapeId)
        }
    }

    redo() {
        const store = EngineStateStore.getInstance()
        const shape = store.getShapeData(this.shapeId)
        if (shape) {
            shape.properties = structuredClone(this.newState)
            store.notify(this.shapeId)
        }
    }
}

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

class HistoryManager {
    private static instance: HistoryManager
    private undoStack: Action[] = []
    private redoStack: Action[] = []

    private constructor() {}

    public static getInstance(): HistoryManager {
        if (!HistoryManager.instance) {
            HistoryManager.instance = new HistoryManager()
        }
        return HistoryManager.instance
    }

    public pushAction(action: Action) {
        this.undoStack.push(action)
        // Clear redo stack on a new action
        this.redoStack = []
    }

    public undo() {
        const action = this.undoStack.pop()
        if (action) {
            action.undo()
            this.redoStack.push(action)
        }
    }

    public redo() {
        const action = this.redoStack.pop()
        if (action) {
            action.redo()
            this.undoStack.push(action)
        }
    }
    
    public clear() {
        this.undoStack = []
        this.redoStack = []
    }
}

export default HistoryManager
