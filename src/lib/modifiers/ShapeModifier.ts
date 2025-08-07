import type { Canvas } from "canvaskit-wasm";
import { IShape } from "@lib/types/shapes"
import Handle from "./Handles";
import CanvasKitResources from '@lib/core/CanvasKitResource'
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import SText from "@lib/shapes/primitives/SText";

const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private shape: IShape | null;
    private hoveredShape: IShape | null;
    private strokeColor: string | number[];
    private strokeWidth: number;
    private fill: string = '#fff'
    private handles: Handle[];
    private isHovered: boolean;
    private selectedModifierHandle: Handle | null;
    private font: SText;

    constructor() {
        this.shape = null;
        this.hoveredShape = null
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

    attachShape(shape: IShape) {
        this.handles = []
        this.shape = shape;
        if (!this.shape) {
            console.log('no shape for shape modifier');
            return
        }

        this.handles = this.shape.getModifierHandles(this.fill, this.strokeColor);
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
        console.log('finished');
        if (!this.selectedModifierHandle) return
        this.selectedModifierHandle.isDragging = false
        this.selectedModifierHandle.resetAnchorPoint()
        this.selectedModifierHandle = null
    }

    selectModifier(x: number, y: number) {
        if (this.handles.length == 0) return
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
                    this.selectedModifierHandle.updateShapeRadii(x, y, e, this.shape)
                    break;
                case 'size':
                    this.selectedModifierHandle.updateShapeDim(x, y, e, this.shape)
                    break;
                case 'c-ratio':
                    this.selectedModifierHandle.updateOvalRatio(x, y, e, this.shape)
                    break;
                case 's-ratio':
                    this.selectedModifierHandle.updateStarRatio(x, y, e, this.shape)
                    break;
                case 'arc':
                    this.selectedModifierHandle.updateShapeArc(x, y, e, this.shape)
                    break;
                case 'vertices':
                    this.selectedModifierHandle.updateShapeVertices(x, y, e, this.shape)
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
        this.handleModifierDrag(x, y, e)
    }
    updateResizerPositions() {
        if (!this.shape) {
            console.log(' no shape for updateresizer');

            return;
        }

        for (const resizer of this.handles) {
            const { x, y } = this.shape.getModifierHandlesPos(resizer);
            resizer.updatePosition(x, y);
        }
        this.updateText()
    }
    updateText() {
        const { bottom, left } = this.shape.boundingRect
        const { width, height } = this.shape.getDim()
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
        return this.shape !== null;
    }
    hasSelectedHandle() {
        return this.selectedModifierHandle !== null
    }
    getShape() {
        return this.shape
    }
    detachShape() {
        this.shape = null
    }
    setIsHovered(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHovered = bool
    }
    hovered(): boolean {
        return this.isHovered
    }
    CanDraw(): boolean {
        if (!this.shape) return false;
        const { left, top, right, bottom } = this.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        return (width < minSize || height < minSize)
    }

    setHoveredShape(shape: IShape) {
        if (this.hoveredShape) {
            this.hoveredShape.setHovered(false)
        }
        if (this.shape) {
            this.isHovered = false
        }

        if (this.shape && this.shape == shape) {
            this.isHovered = true
            return
        }
        this.hoveredShape = shape
        this.hoveredShape.setHovered(true)
    }

    resetHovered() {
        if (this.hoveredShape) {
            this.hoveredShape.setHovered(false)
        }
        if (this.shape) {
            this.isHovered = false
        }
        this.hoveredShape = null
    }

    collide(x: number, y: number): boolean {
        if (!this.shape) return false;
        const { left, top, right, bottom } = this.shape.boundingRect;
         return (
                x >= left &&
                x <= right &&
                y >= top &&
                y <= bottom
            );
    }

    collideHandle(x: number, y: number): Handle | null {
        if (!this.shape) return null;
        const handle = this.selectModifier(x, y)
        return handle
    }


    draw(canvas: Canvas): void {

        if (!this.shape || this.CanDraw() || !this.resource) {
            return;
        }
        this.setPaint();
        const dimen = this.shape.boundingRect;

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
        if (this.shape) {
            this.shape.destroy()
            this.shape = null
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