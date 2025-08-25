import { Coord, ShapeType } from '@lib/types/shapes'
import SceneNode from '../node/ContainerNode'

enum EventTypes {
    PointerDown = 'pointer:down', //
    PointerUp = 'pointer:up', //
    PointerMove = 'pointer:move', //
    PointerDrag = 'pointer:drag', //
    KeyDown = 'key:down', //
    KeyUp = 'key:up', //

    CreateScene = 'create:scene', //
    // SceneCreated = 'scene:created',
    DrawScene = 'draw:shape', //
    FinalizeShape = 'finish:draw', //
    DeleteScene = 'delete:scene',

    CreateSurface = 'create:surface', //
    ShowHovered = 'hovered:shape', //

    SelectObject = 'select:object', //
    // SceneSelected = 'scene:selected',
    DragObject = 'drag:object', //
    FinaliseSelection = 'selection:finished', //
    // RemoveSelectedModifier = 'remove:modifier',
    UpdateModifierHandlesPos = 'update:modifier', //
    // EditText = 'insert:text',
    ToolChange = 'tool:change', //
    // ModifierSelected = 'modifier:selected',
    Render = 'render:scene', //
}

type Handlers = {
    [EventTypes.PointerDown]: (dragStart: Coord, e: MouseEvent) => void
    [EventTypes.PointerUp]: (dragStart: Coord, e: MouseEvent) => void
    [EventTypes.PointerMove]: (dragStart: Coord, e: MouseEvent) => void
    [EventTypes.PointerDrag]: (dragStart: Coord, e: MouseEvent) => void
    [EventTypes.KeyDown]: (e: KeyboardEvent) => void
    [EventTypes.KeyUp]: (e: KeyboardEvent) => void
    [EventTypes.CreateScene]: (type: ShapeType, x: number, y: number) => void
    // [EventTypes.SceneCreated]: (Scene: SceneNode) => void;
    [EventTypes.DrawScene]: (dragStart: Coord, x: number, y: number, shiftKey: boolean) => void
    [EventTypes.FinalizeShape]: () => void
    [EventTypes.DeleteScene]: () => void
    [EventTypes.CreateSurface]: () => void
    [EventTypes.ShowHovered]: (x: number, y: number) => void
    [EventTypes.SelectObject]: (x: number, y: number) => void
    // [EventTypes.SceneSelected]: (Scene: SceneNode) => void;
    // [EventTypes.ModifierSelected]: () => void;
    // [EventTypes.DragShape]: (dx: number, dy: number) => void;
    [EventTypes.DragObject]: (dx: number, dy: number, e: MouseEvent) => void

    [EventTypes.FinaliseSelection]: () => void
    // [EventTypes.RemoveSelectedModifier]: () => void;
    [EventTypes.UpdateModifierHandlesPos]: () => void
    // [EventTypes.EditText]: (e: KeyboardEvent) => void;
    [EventTypes.ToolChange]: (tool: any) => void
    [EventTypes.Render]: () => void
}

class EventBus {
    private handlers = new Map<EventTypes, Set<Function>>()

    subscribe<T extends EventTypes>(event: T, handler: Handlers[T]) {
        // console.log(event, 'registered');

        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set())
        }
        this.handlers.get(event)!.add(handler)
    }

    trigger<T extends EventTypes>(event: T, ...args: Parameters<Handlers[T]>): ReturnType<Handlers[T]> {
        // console.log(event, 'triggered');
        let result: ReturnType<Handlers[T]>

        this.handlers.get(event)?.forEach(handler => {
            result = handler(...args)
        })
        return result
    }

    getEventNames() {
        this.handlers.forEach((value, key, map) => {
            console.log(key, value)
        })
    }

    removeAllEvent() {
        this.handlers = new Map<EventTypes, Set<Function>>()
    }

    unSubscribeAll(event: EventTypes) {
        this.handlers.delete(event)
    }
}
const EventQueue = new EventBus()

export default EventQueue
export { EventTypes }
