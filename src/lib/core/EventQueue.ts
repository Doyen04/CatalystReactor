
export enum EventTypes {
    PointerDown = 'pointer:down',
    PointerUp = 'pointer:up',
    PointerMove = 'pointer:move',
    PointerDrag = 'pointer:drag'
}

type EventPayloads = {
    [EventTypes.PointerDown]: { coord: Coords, e: MouseEvent }
    [EventTypes.PointerUp]: { coord: Coords, e: MouseEvent }
    [EventTypes.PointerMove]: { coord: Coords, e: MouseEvent }
    [EventTypes.PointerDrag]: { coord: Coords, e: MouseEvent }
}

type EventHandler<T extends EventTypes> = (payload: EventPayloads[T]) => void;

class EventBus {
    private events: Map<EventTypes, Set<EventHandler<EventTypes>>> = new Map();

    subscribe(event: EventTypes, handler: EventHandler<EventTypes>) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)?.add(handler);
    }

    trigger(event: EventTypes, payload: EventPayloads[EventTypes]) {
        this.events.get(event)?.forEach(handler => handler(payload));
    }
}
const EventQueue = new EventBus()

export default EventQueue;