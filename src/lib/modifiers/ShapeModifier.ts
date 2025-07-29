import type { Canvas } from "canvaskit-wasm";
import { IShape } from "@lib/types/shapes"
import Handle from "./Handles";
import CanvasKitResources from '@lib/core/CanvasKitResource'
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import SText from "@lib/shapes/primitives/SText";

const { UpdateModifierHandlesPos } = EventTypes

class ShapeModifier {
    private shape: IShape | null;
    private strokeColor: string | number[];
    private strokeWidth: number;
    private fill: string = '#fff'
    private size: number = 5; // Default radius for the resizers
    private handles: Handle[];
    private isHovered: boolean;
    private selectedModifier: Handle | null;
    private font: SText;

    constructor() {
        this.shape = null;
        this.strokeColor = '#00f';
        this.strokeWidth = 1;
        this.handles = [];
        this.isHovered = false;
        this.selectedModifier = null
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

    setShape(shape: IShape) {
        this.handles = []
        this.shape = shape;
        if (!this.shape) {
            console.log('no shape for shape modifier');
            return
        }
        this.handles = this.shape.getModifierHandles(this.size, this.fill, this.strokeColor);
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
        if (!this.selectedModifier) return
        this.selectedModifier.isDragging = false
        this.selectedModifier.resetAnchorPoint()
        this.selectedModifier = null
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
        this.selectedModifier = selected
        return selected
    }

    handleModifierDrag(x: number, y: number, e: MouseEvent) {
        if (this.selectedModifier) {
            switch (this.selectedModifier.type) {
                case 'radius':
                    this.selectedModifier.updateShapeRadii(x, y, e, this.shape)
                    break;
                case 'size':
                    this.selectedModifier.updateShapeDim(x, y, e, this.shape)
                    break;
                case 'ratio':
                    this.selectedModifier.updateShapeRatio(x, y, e, this.shape)
                    break;
                case 'arc':
                    this.selectedModifier.updateShapeArc(x, y, e, this.shape)
                    break;
                default:
                    break;
            }
        }
        this.updateResizerPositions()
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
        const { width: tWidth } = this.font.getDim()
        
        const pos = (width - tWidth) / 2
        this.font.setCoord(left + pos, bottom + 5)
        this.font.setText(`${width} X ${height}`)
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
    getShape() {
        return this.shape
    }
    setIsHovered(bool: boolean) {
        // EventQueue.trigger(Render)
        this.isHovered = bool
    }
    CanDraw(): boolean {
        if (!this.shape) return false;
        const { left, top, right, bottom } = this.shape.boundingRect;
        const width = right - left;
        const height = bottom - top;
        const minSize = 5;

        return (width < minSize || height < minSize)
    }

    draw(canvas: Canvas): void {

        if (!this.shape || this.CanDraw() || !this.resource) {
            console.log('too small or no shape or no resources');

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
        this.size = 0
        this.handles = []
        this.isHovered = null
        this.selectedModifier = null

    }

}


export default ShapeModifier;