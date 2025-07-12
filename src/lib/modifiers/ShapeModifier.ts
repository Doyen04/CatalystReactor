import type { Canvas, CanvasKit, Paint } from "canvaskit-wasm";
import type { Shape } from "@/lib/shapes";
import { Handle } from "@/lib/modifiers";
import { CanvasKitResources } from "@lib/core";

export const ModifierPos = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
];

class ShapeModifier {
    private shape: Shape | null;
    private strokeColor: string | number[];
    private strokeWidth: number;
    private fill: string = '#fff'
    private size: number = 5; // Default radius for the resizers
    private handles: Handle[];
    private isHovered: boolean;

    constructor() {
        this.shape = null;
        this.strokeColor = '#00f';
        this.strokeWidth = 1;
        this.handles = [];
        this.isHovered = false;
    }
    setShape(shape: Shape) {
        this.handles = []
        this.shape = shape;

        if (!this.shape) {
            console.log('no shape for shape modifier');
            
            return
        }
        this.handles = this.shape.getHandles(this.size, this.fill,this.strokeColor);
    }
    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        if(resources){
            return resources 
        }else{
            console.log('resources is null');
            
            return null
        }
    }
    updateResizerPositions() {
        if (!this.shape) {
            console.log(' no shape for updateresizer');
            
            return;
        }

        for (const resizer of this.handles) {
            const { x, y } = this.shape.getModifersPos(resizer.pos, this.size, resizer.type);
            resizer.updatePosition(x, y);
        }

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

        this.updateResizerPositions()// bad practice
        this.setPaint();
        const dimen = this.shape.boundingRect;

        const rect = this.resource.canvasKit.LTRBRect(dimen.left, dimen.top, dimen.right, dimen.bottom);

        canvas.drawRect(rect, this.resource.strokePaint);

        this.handles.forEach(handle => {
            if (handle.type !== 'size' && this.isHovered) {
                handle.draw(canvas);
            }
            else if (handle.type === 'size') {
                handle.draw(canvas);
            }
        });
    }


}


export default ShapeModifier;