import { Shape } from "@lib/shapes";

enum EventTypes {
    PointerDown = 'pointer:down',
    PointerUp = 'pointer:up',
    PointerMove = 'pointer:move',
    PointerDrag = 'pointer:drag',
    KeyDown = 'key:down',
    KeyUp = 'key:up',
    CreateShape = 'create:shape',
    DrawShape = 'draw:shape',
    FinalizeShape = 'finish:draw',
    CreateSurface = 'create:surface',
    ShowHovered = 'hovered:shape',
    SelectObject = 'select:object',
    SelectShape = 'select:shape',
    SelectModifier = 'select:modifier',
    DragObject = 'drag:object',
    // DragShape = 'drag:shape',
    DragModifier = 'drag:modifier',
    FinaliseSelection= 'selection:finished',
    RemoveSelectedModifier= 'remove:modifier',
    EditText = 'insert:text',
    ToolChange = 'tool:change',
    ModifierSelected = 'modifier:selected',
}

type Handlers = {
    [EventTypes.PointerDown]: (dragStart: Coords, e: MouseEvent) => void;
    [EventTypes.PointerUp]: (dragStart: Coords, e: MouseEvent) => void;
    [EventTypes.PointerMove]: (dragStart: Coords, e: MouseEvent) => void;
    [EventTypes.PointerDrag]: (dragStart: Coords, e: MouseEvent) => void;
    [EventTypes.KeyDown]: (e: KeyboardEvent) => void;
    [EventTypes.KeyUp]: (e: KeyboardEvent) => void;
    [EventTypes.CreateShape]: (type: ShapeType, x: number, y: number) => Shape;
    [EventTypes.DrawShape]: (dragStart: Coords, x: number, y: number, shiftKey: boolean) => void;
    [EventTypes.FinalizeShape]: () => void;
    [EventTypes.CreateSurface]: () => void;
    [EventTypes.ShowHovered]: (x: number, y: number) => void;
    [EventTypes.SelectObject]: (x: number, y: number) => void;
    [EventTypes.SelectShape]: (x: number, y: number) => void;
    [EventTypes.SelectModifier]: (x: number, y: number) => void;
    [EventTypes.ModifierSelected]: () => void;
    // [EventTypes.DragShape]: (dx: number, dy: number) => void;
    [EventTypes.DragObject]: (dx: number, dy: number, e: MouseEvent) => void;
    [EventTypes.DragModifier]: (dx: number, dy: number, e: MouseEvent) => void;
    [EventTypes.FinaliseSelection]: () => void;
    [EventTypes.RemoveSelectedModifier]: () => void;
    [EventTypes.EditText]: (e: KeyboardEvent) => void;
    [EventTypes.ToolChange]: () => void;
};

class EventBus {
    private handlers = new Map<EventTypes, Set<Function>>();

    subscribe<T extends EventTypes>(event: T, handler: Handlers[T]) {
        // console.log(event, 'registered');

        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
    }

    trigger<T extends EventTypes>(event: T, ...args: Parameters<Handlers[T]>): ReturnType<Handlers[T]> {
        // console.log(event, 'triggered');
        let result: ReturnType<Handlers[T]>

        this.handlers.get(event)?.forEach(handler => {
            result = handler(...args)
        });
        return result
    }

    getEventNames() {
        this.handlers.forEach((value, key, map) => {
            console.log(key, value);
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

export default EventQueue;
export { EventTypes };