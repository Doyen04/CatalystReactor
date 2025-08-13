import Handle from '@lib/modifiers/Handles'
import type { Canvas } from "canvaskit-wasm";
import { BorderRadius, HandlePos, Properties, Size, SizeRadiusModifierPos } from '@lib/types/shapes';
import Shape from '../base/Shape';


class Rectangle extends Shape {
    dimension: Size;
    bdradius: BorderRadius;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, type: "rect", ...shapeProps });
        this.dimension = { width: 0, height: 0 }
        this.bdradius = {
            'top-left': 0,
            'top-right': 0,
            'bottom-left': 0,
            'bottom-right': 0,
            locked: false,
        };
        this.calculateBoundingRect()
    }

    override moveShape(dx: number, dy: number): void {
        this.transform.x += dx;
        this.transform.y += dy;
        this.transform.originalX += dx;
        this.transform.originalY += dy;

        this.calculateBoundingRect();
    }

    private setBorderRadius(radius: number): void {
        this.bdradius = {
            'top-left': radius,
            'top-right': radius,
            'bottom-left': radius,
            'bottom-right': radius,
            locked: true
        };

    }

    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // Calculate dimensions
        const deltaX = (mx - dragStart.x);
        const deltaY = (my - dragStart.y);

        this.transform.x = Math.min(dragStart.x, mx);
        this.transform.y = Math.min(dragStart.y, my);

        if (shiftKey) {
            const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            this.dimension.width = size;
            this.dimension.height = size;

        } else {
            this.dimension.width = Math.abs(deltaX);
            this.dimension.height = Math.abs(deltaY);
        }

        this.calculateBoundingRect();
    }

    override setCoord(x: number, y: number): void {
        this.transform.x = x;
        this.transform.y = y;

        this.calculateBoundingRect()
    }

    //move to shape
    override setDim(width: number, height: number): void {
        this.dimension.width = width;
        this.dimension.height = height;

        this.calculateBoundingRect()
    }

    override updateDim(width: number, height: number): void {
        this.setDim(width, height);
        this.calculateBoundingRect();
    }

    handleFlip(isFlippedX: boolean, isFlippedY: boolean): void {
        this.transform.isFlippedX = isFlippedX;
        this.transform.isFlippedY = isFlippedY;
    }

    protected getFlippedRadii = () => {
        const original = {
            tl: this.bdradius['top-left'],
            tr: this.bdradius['top-right'],
            br: this.bdradius['bottom-right'],
            bl: this.bdradius['bottom-left']
        };

        let radii = { ...original };

        if (this.transform.isFlippedX && this.transform.isFlippedY) {
            // Both X and Y flipped: opposite corners
            radii = {
                tl: original.br,
                tr: original.bl,
                br: original.tl,
                bl: original.tr
            };
        } else if (this.transform.isFlippedX) {
            // Only X flipped: swap left/right
            radii = {
                tl: original.tr,
                tr: original.tl,
                br: original.bl,
                bl: original.br
            };
        } else if (this.transform.isFlippedY) {
            // Only Y flipped: swap top/bottom
            radii = {
                tl: original.bl,
                tr: original.br,
                br: original.tr,
                bl: original.tl
            };
        }

        return radii;
    };

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.dimension = prop.size
        this.style = prop.style
        this.bdradius = prop.borderRadius
        this.calculateBoundingRect()
    }

    override getDim(): { width: number, height: number } {
        return { width: Math.floor(this.dimension.width), height: Math.floor(this.dimension.height) }
    }

    override getProperties(): Properties {
        return {
            transform: { ...this.transform },
            size: { ...this.dimension },
            style: { ...this.style },
            borderRadius: { ...this.bdradius }
        }
    }

    override getModifierHandles(fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles = super.getSizeModifierHandles(fill, strokeColor);
        SizeRadiusModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, pos, 'radius', fill, strokeColor))
        })
        return handles;
    }

    getRadiusModiferHandlesPos(handle: Handle): { x: number; y: number; } {
        const r = this.bdradius[handle.pos];
        const padding = 15;
        const size = handle.size

        let x: number, y: number;

        switch (handle.pos) {
            case 'top-left':
                x = this.transform.x + (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.transform.y + (handle.isDragging || r >= padding ? r : padding) - size;
                break;
            case 'top-right':
                x = this.transform.x + this.dimension.width - (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.transform.y + (handle.isDragging || r >= padding ? r : padding) - size;
                break;
            case 'bottom-left':
                x = this.transform.x + (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.transform.y + this.dimension.height - (handle.isDragging || r >= padding ? r : padding) - size;
                break;
            case 'bottom-right':
                x = this.transform.x + this.dimension.width - (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.transform.y + this.dimension.height - (handle.isDragging || r >= padding ? r : padding) - size;
                break;
        }

        return { x, y };
    }

    override getModifierHandlesPos(handle: Handle): { x: number; y: number; } {

        if (handle.type === 'radius') {
            return this.getRadiusModiferHandlesPos(handle);
        } else if (handle.type === 'size') {
            return super.getSizeModifierHandlesPos(handle);
        }
        return { x: 0, y: 0 };
    }

    override calculateBoundingRect(): void {
        this.boundingRect = {
            top: this.transform.y,
            left: this.transform.x,
            bottom: this.transform.y + this.dimension.height,
            right: this.transform.x + this.dimension.width
        };
    }

    hasRadius(): boolean {
        return this.bdradius['top-left'] > 0 ||
            this.bdradius['top-right'] > 0 ||
            this.bdradius['bottom-left'] > 0 ||
            this.bdradius['bottom-right'] > 0;
    }

    override draw(canvas: Canvas): void {
        if (!this.resource) return;

        const { fill, stroke } = this.initPaints()

        const rect = this.resource.canvasKit.LTRBRect(0, 0,
            this.dimension.width,
            this.dimension.height);

        if (this.hasRadius() && this.bdradius.locked) {
            const radius = this.bdradius['top-left'];
            const rrect = this.resource.canvasKit.RRectXY(rect, radius, radius);
            canvas.drawRRect(rrect, fill);
            canvas.drawRRect(rrect, stroke);
        } else if (this.hasRadius()) {
            const path = this.makeCustomRRectPath();
            canvas.drawPath(path, fill);
            canvas.drawPath(path, stroke);
            path.reset()
        } else {
            canvas.drawRect(rect, fill);
            canvas.drawRect(rect, stroke);
        }
        this.resetPaint()
    }

    protected makeCustomRRectPath() {
        const radii = this.getFlippedRadii()
        const [x, y, w, h] = [0, 0, this.dimension.width, this.dimension.height];
        const CanvasKit = this.resource?.canvasKit;

        const p = this.resource.path
        const { tl, tr, br, bl } = radii;

        p.moveTo(x + tl, y);
        p.lineTo(x + w - tr, y);
        if (tr > 0) {
            p.arcToOval(
                CanvasKit.LTRBRect(x + w - 2 * tr, y, x + w, y + 2 * tr),
                -90, 90, false
            );
        }

        p.lineTo(x + w, y + h - br);
        if (br > 0) {
            p.arcToOval(
                CanvasKit.LTRBRect(x + w - 2 * br, y + h - 2 * br, x + w, y + h),
                0, 90, false
            );
        }

        p.lineTo(x + bl, y + h);
        if (bl > 0) {
            p.arcToOval(
                CanvasKit.LTRBRect(x, y + h - 2 * bl, x + 2 * bl, y + h),
                90, 90, false
            );
        }

        p.lineTo(x, y + tl);
        if (tl > 0) {
            p.arcToOval(
                CanvasKit.LTRBRect(x, y, x + 2 * tl, y + 2 * tl),
                180, 90, false
            );
        }

        p.close();
        return p
    }

    updateBorderRadius(newRadius: number, pos: HandlePos) {
        const max = Math.min(this.dimension.width, this.dimension.height) / 2;
        const newRad = Math.max(0, Math.min(newRadius, max));
        if (this.bdradius.locked) {
            this.setBorderRadius(newRad)
            return
        }

        this.bdradius[pos] = newRad
    }

    override pointInShape(x: number, y: number): boolean {
        return x >= this.transform.x &&
            x <= this.transform.x + this.dimension.width &&
            y >= this.transform.y &&
            y <= this.transform.y + this.dimension.height;
    }

    override cleanUp(): void {

    }
    override destroy(): void {

    }
}

export default Rectangle;