import SceneNode from "./SceneGraph";
import EventQueue, { EventTypes } from './EventQueue'

const {
    FinaliseSelection, DeleteScene } = EventTypes

class SceneManager {
    private scene: SceneNode
    selected: SceneNode | null;
    hoveredScene: SceneNode | null;
    modifierSelected: boolean;

    constructor() {
        this.scene = new SceneNode()
        this.selected = null
        this.hoveredScene = null
        this.modifierSelected = false
        //remember to add a shape created event

        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    addEvent() {
        // EventQueue.subscribe(CreateScene, this.createScene.bind(this))
        // EventQueue.subscribe(DrawScene, this.updateTransientScene.bind(this))
        // EventQueue.subscribe(FinalizeShape, this.cleanUp.bind(this))

        // EventQueue.subscribe(ShowHovered, this.showHovered.bind(this))

        // EventQueue.subscribe(SelectObject, this.selectObject.bind(this))
        // EventQueue.subscribe(DragObject, this.dragSelectedObject.bind(this))
        // EventQueue.subscribe(FinaliseSelection, this.handleSelectionCleanUp.bind(this))
        EventQueue.subscribe(DeleteScene, this.handleDeleteScene.bind(this))

    }
    removeEvent() {
        // EventQueue.unSubscribeAll(CreateScene)
        // EventQueue.unSubscribeAll(DrawScene)
        // EventQueue.unSubscribeAll(FinalizeShape)

        // EventQueue.unSubscribeAll(ShowHovered)

        // EventQueue.unSubscribeAll(SelectObject)
        // EventQueue.unSubscribeAll(DragObject)
        EventQueue.unSubscribeAll(FinaliseSelection)

    }
    getScene(): SceneNode {
        return this.scene
    }
    // getTransientScene(): SceneNode {
    //     return this.transientScene
    // }

    removeNode(node: SceneNode) {
        if (node.parent) {
            node.parent.removeChildNode(node);
            // this.pushHistory();
        }
    }

    addNode(node: SceneNode, parent?: SceneNode) {
        if (!parent) {
            this.scene.addChildNode(node)
        } else {
            parent.addChildNode(node);
        }
        // this.pushHistory();
        // this.render();
    }

    handleDeleteScene() {
        // const { currentScene, clearCurrentScene, clearProperties } = useSceneStore.getState()
        // currentScene.getShape().destroy()
        // this.removeNode(currentScene)
        // this.shapeMod.setShape(null)
        // clearCurrentScene()
        // clearProperties()
        // this.selected = null
    }

    getCollidedScene(x: number, y: number): SceneNode | null {
        const flattened = this.flattenScene();

        for (const node of flattened) {
            if (node && node.isCollide(x, y)) {
                return node;
            }
        }
        return null;
    }

    flattenScene(): SceneNode[] {
        const flattened: SceneNode[] = [];

        const traverse = (node: SceneNode) => {
            flattened.push(node);
            node.children.forEach(child => traverse(child));
        };

        this.scene.children.forEach(child => traverse(child));
        return flattened
    }

    destroy() {
        if (this.scene) {
            this.scene.destroy()
            this.scene = null
        } if (this.selected) {
            this.selected.destroy()
            this.selected = null
        }
        if (this.hoveredScene) {
            this.hoveredScene.destroy()
            this.hoveredScene = null
        }
        if (this.modifierSelected) {
            this.modifierSelected = false
        }
    }
}

export default SceneManager;