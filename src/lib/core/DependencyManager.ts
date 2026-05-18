import type PaintManager from './PaintManager'
import type SceneManager from './SceneManager'
import type ShapeManager from './ShapeManager'
import type Renderer from './Renderer'
import type InputManager from './InputManager'
import type ToolManager from './ToolManager'
import type ShapeModifier from '@lib/modifiers/ShapeModifier'

/** All services that can be registered in the container */
export interface ServiceRegistry {
    paintManager: PaintManager
    shapeModifier: ShapeModifier
    shapeManager: ShapeManager
    sceneManager: SceneManager
    renderer: Renderer
    inputManager: InputManager
    toolManager: ToolManager
}

class Container {
    private readonly services = new Map<string, unknown>();

    register<K extends keyof ServiceRegistry>(key: K, instance: ServiceRegistry[K]) {
        this.services.set(key, instance);
    }

    resolve<K extends keyof ServiceRegistry>(key: K): ServiceRegistry[K] {
        if (!this.services.has(key)) {
            console.warn(`Service with key "${key}" not found in the container.`);
            return null as ServiceRegistry[K];
        }
        return this.services.get(key) as ServiceRegistry[K];
    }

    clear(): void {
        this.services.clear();
    }
}

const container = new Container();

export default container;

