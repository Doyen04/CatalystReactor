import Handle from '@lib/modifiers/Handles'
import { SizeRadiusModifierPos } from '@/lib/modifiers/ShapeModifier';
import Shape from '../base/Shape';
import type { Canvas, Path, Rect } from "canvaskit-wasm";
import { BorderRadius, Corner, Properties, Size } from '@lib/types/shapes';


class Rectangle extends Shape {
    dimension: Size;
    bdradius: BorderRadius

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.dimension = { width: 0, height: 0 }
        this.bdradius = {
            'top-left': 0,
            'top-right': 0,
            'bottom-left': 0,
            'bottom-right': 0,
            locked: false,
        };
        this.transform.originalX = x;
        this.transform.originalY = y;
        this.transform.isFlippedX = false;
        this.transform.isFlippedY = false;
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

        this.transform.isFlippedX = deltaX < 0;
        this.transform.isFlippedY = deltaY < 0;

        this.transform.originalX = dragStart.x;
        this.transform.originalY = dragStart.y;

        if (shiftKey) {
            const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            this.dimension.width = size;
            this.dimension.height = size;

            if (deltaX >= 0) {
                this.transform.x = this.transform.originalX;
            } else {
                this.transform.x = this.transform.originalX - size;
            }

            if (deltaY >= 0) {
                this.transform.y = this.transform.originalY;
            } else {
                this.transform.y = this.transform.originalY - size;
            }
        } else {
            this.dimension.width = Math.abs(deltaX);
            this.dimension.height = Math.abs(deltaY);
            this.transform.x = Math.min(dragStart.x, mx);
            this.transform.y = Math.min(dragStart.y, my);
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

    override setProperties(prop: Properties): void {
        this.transform = prop.transform
        this.dimension = prop.size
        this.style = prop.style
        this.bdradius = prop.borderRadius

        this.checkRadiusLock()
        this.calculateBoundingRect()
    }

    override getDim(): { width: number, height: number } {
        return { width: this.dimension.width, height: this.dimension.height }
    }

    override getProperties(): Properties {
        console.log(this.bdradius, 'getting');
        
        return {
            transform: { ...this.transform },
            size: { ...this.dimension },
            style: { ...this.style },
            borderRadius: { ...this.bdradius }
        }
    }

    override getModifierHandles(size: number, fill: string | number[], strokeColor: string | number[]): Handle[] {
        const handles = super.getSizeModifierHandles(size, fill, strokeColor);
        SizeRadiusModifierPos.forEach(pos => {
            handles.push(new Handle(0, 0, size, pos, 'radius', fill, strokeColor))
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

        this.setPaint();

        const rect = this.resource.canvasKit.LTRBRect(this.transform.x, this.transform.y, this.transform.x + this.dimension.width, this.transform.y + this.dimension.height);

        if (this.hasRadius()) {
            this.drawRoundedRect(canvas, rect);
        } else {
            // Draw regular rectangle
            canvas.drawRect(rect, this.resource.paint);
            canvas.drawRect(rect, this.resource.strokePaint);
        }
    }

    private drawRoundedRect(canvas: Canvas, rect: Rect): void {
        if (!this.resource) return;

        const canvasKit = this.resource.canvasKit;

        // Method 1: Using RRectXY (simpler but uniform corners)
        //if (this.bdradius.locked) {
            // const radius = this.bdradius['top-left'];
            // const rrect = canvasKit.RRectXY(rect, radius, radius);
            // canvas.drawRRect(rrect, this.resource.paint);
            // canvas.drawRRect(rrect, this.resource.strokePaint);
            // return;
        //} else {
            const path = this.makeCustomRRectPath()

            canvas.drawPath(path, this.resource.paint);
            canvas.drawPath(path, this.resource.strokePaint);

            path.delete(); // Clean up WASM memory
       // }
    }

    protected makeCustomRRectPath(): Path {
        const radii = {
            tl: this.bdradius['top-left'],
            tr: this.bdradius['top-right'],
            br: this.bdradius['bottom-right'],
            bl: this.bdradius['bottom-left']
        };
        const [x, y, w, h] = [this.transform.x, this.transform.y, this.dimension.width, this.dimension.height];
        const CanvasKit = this.resource?.canvasKit;

        const p = new CanvasKit.Path();
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
        return p;
    }

    updateBorderRadius(newRadius: number, pos: Corner) {
        console.log(newRadius, pos);

        const max = Math.min(this.dimension.width, this.dimension.height) / 2;
        let newRad = Math.max(0, Math.min(newRadius, max));
        if (this.bdradius.locked) {
            this.setBorderRadius(newRad)
            return
        }

        this.bdradius[pos] = newRad
    }

    checkRadiusLock(): void {
        if (this.bdradius.locked) {
            const radius = Math.max(this.bdradius['top-left'], this.bdradius['top-right'],
                this.bdradius['bottom-left'], this.bdradius['bottom-right']);
            this.setBorderRadius(radius);
        }
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