import type { Canvas } from "canvaskit-wasm";
import Handle from "./Handles";
import CanvasKitResources from '@lib/core/CanvasKitResource'
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import SText from "@lib/shapes/primitives/SText";
import SceneNode from "@lib/core/SceneNode";

const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private scene: SceneNode | null;
    private strokeColor: string | number[];
    private strokeWidth: number;
    private fill: string = '#fff'
    private handles: Handle[];
    private isHovered: boolean;
    private selectedModifierHandle: Handle | null;
    private font: SText;

    constructor() {
        this.scene = null;
        this.strokeColor = '#00f';
        this.strokeWidth = 1;
        this.handles = [];
        this.isHovered = false;
        this.selectedModifierHandle = null
        this.font = new SText(200, 0)

        this.setUpEvent()
    }
    setUpEvent() {
        this.removeEvent()
        this.addEvent()
    }
    addEvent() {
        EventQueue.subscribe(UpdateModifierHandlesPos, this.updateResizerPositions.bind(this))
    }
    removeEvent() {
        EventQueue.unSubscribeAll(UpdateModifierHandlesPos)
    }

    attachShape(scene: SceneNode) {
        this.handles = []
        this.scene = scene;
        if (!this.scene) {
            console.log('no shape for shape modifier');
            return
        }

        this.handles = this.scene.getShape().getModifierHandles();
        this.updateResizerPositions();
    }

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if (resources) {
            return resources
        } else {
            console.log('resources is null');

            return null
        }
    }

    handleRemoveModiferHandle() {
        console.log('finished draging handle');
        if (!this.selectedModifierHandle) return
        this.selectedModifierHandle.isDragging = false
        this.selectedModifierHandle.resetAnchorPoint()
        this.selectedModifierHandle = null
    }

    selectModifier(x: number, y: number) {
        if (this.handles.length == 0) return null
        let selected: Handle = null

        for (const node of this.handles) {
            if (node && node.isCollide(x, y)) {
                selected = node;
                break
            }
        }
        this.selectedModifierHandle = selected
        return selected
    }

    handleModifierDrag(x: number, y: number, e: MouseEvent) {
        if (this.selectedModifierHandle) {
            switch (this.selectedModifierHandle.type) {
                case 'radius':
                    this.selectedModifierHandle.updateShapeRadii(x, y, e, this.scene)
                    break;
                case 'size':
                    this.selectedModifierHandle.updateShapeDim(x, y, e, this.scene)
                    break;
                case 'c-ratio':
                    this.selectedModifierHandle.updateOvalRatio(x, y, e, this.scene)
                    break;
                case 's-ratio':
                    this.selectedModifierHandle.updateStarRatio(x, y, e, this.scene)
                    break;
                case 'arc':
                    this.selectedModifierHandle.updateShapeArc(x, y, e, this.scene)
                    break;
                case 'vertices':
                    this.selectedModifierHandle.updateShapeVertices(x, y, e, this.scene)
                    break;
                default:
                    break;
            }
        }
    }

    update() {
        this.updateResizerPositions()
    }

    drag(x: number, y: number, e: MouseEvent) {
        this.selectedModifierHandle.isDragging = true
        this.isHovered = false
        this.handleModifierDrag(x, y, e)
    }

    updateResizerPositions() {
        if (!this.scene) {
            console.log(' no shape for updateresizer');

            return;
        }

        for (const resizer of this.handles) {
            const { x, y } = this.scene.getShape().getModifierHandlesPos(resizer);
            resizer.updatePosition(x, y);
        }
        this.updateText()
    }
    updateText() {
        const { bottom, left } = this.scene.getShape().getBoundingRect()
        const { width, height } = this.scene.getShape().getDim()
        this.font.setText(`${width} X ${height}`)

        const { width: tWidth } = this.font.getDim()
        const pos = (width - tWidth) / 2
        this.font.setCoord(left + pos, bottom + 5)
    }
    setPaint(): void {
        if (!this.resource) return

        const fillColor = (Array.isArray(this.fill)) ? this.fill : this.resource.canvasKit.parseColorString(this.fill)

        const strokeColor = (Array.isArray(this.strokeColor)) ? this.strokeColor : this.resource.canvasKit.parseColorString(this.strokeColor)

        this.resource.strokePaint.setColor(strokeColor);
        this.resource.strokePaint.setStrokeWidth(this.strokeWidth);

        this.resource.paint.setColor(fillColor);
    }
    hasShape() {
        return this.scene.getShape() !== null;
    }

    hasSelectedHandle() {
        return this.selectedModifierHandle !== null
    }
    getShape() {
        return this.scene.getShape()
    }
    detachShape() {
        this.scene = null
    }
    setHover(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHovered = bool
    }
    hovered(): boolean {
        return this.isHovered
    }
    CanDraw(): boolean {
        if (!this.scene && !this.scene.getShape()) return false;
        const { left, top, right, bottom } = this.scene.getShape().getBoundingRect();
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        return (width < minSize || height < minSize)
    }

    collideRect(x: number, y: number): boolean {
        if (!this.scene ) return false;
        const { left, top, right, bottom } = this.scene.getShape().getBoundingRect();
         return (
                x >= left &&
                x <= right &&
                y >= top &&
                y <= bottom
            );
    }

    draw(canvas: Canvas): void {

        if (!this.scene || this.CanDraw() || !this.resource) {
            return;
        }
        this.setPaint();
        const dimen = this.scene.getShape().getBoundingRect();

        const rect = this.resource.canvasKit.LTRBRect(dimen.left, dimen.top, dimen.right, dimen.bottom);

        canvas.drawRect(rect, this.resource.strokePaint);
        this.font.draw(canvas)

        this.handles.forEach(handle => {
            if (handle.type !== 'size' && this.isHovered) {
                handle.draw(canvas);
            }
            else if (handle.type === 'size') {
                handle.draw(canvas);
            }
        });
    }

    destroy() {
        if (this.scene.getShape()) {
            this.scene.getShape().destroy()
            this.scene = null
        }
        this.strokeColor = ''
        this.strokeWidth = 0
        this.fill = ''
        this.handles = []
        this.isHovered = null
        this.selectedModifierHandle = null

    }

}


export default ShapeModifier;