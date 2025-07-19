import Handle from '@lib/modifiers/Handles'
import { SizeRadiusModifierPos } from '@/lib/modifiers/ShapeModifier';
import Shape from '../base/Shape';
import type { Canvas, Path, Rect } from "canvaskit-wasm";
import { Corner } from '@lib/types/shapes';

class Rectangle extends Shape {
    width: number;
    height: number;
    bdradius: {
        'top-left': number,
        'top-right': number,
        'bottom-left': number,
        'bottom-right': number,
        'locked': boolean
    };
    originalX: number;
    originalY: number;
    isFlippedX: boolean;
    isFlippedY: boolean;

    constructor(x: number, y: number, { ...shapeProps } = {}) {
        super({ x, y, ...shapeProps });
        this.width = 0;
        this.height = 0;
        this.bdradius = {
            'top-left': 0,
            'top-right': 0,
            'bottom-left': 0,
            'bottom-right': 0,
            locked: false,
        };
        this.originalX = x;
        this.originalY = y;
        this.isFlippedX = false;
        this.isFlippedY = false;
        this.calculateBoundingRect()
    }

    override moveShape(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.originalX += dx;
        this.originalY += dy;
        this.calculateBoundingRect();
    }

    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // Calculate dimensions
        const deltaX = (mx - dragStart.x);
        const deltaY = (my - dragStart.y);

        this.isFlippedX = deltaX < 0;
        this.isFlippedY = deltaY < 0;

        this.originalX = dragStart.x;
        this.originalY = dragStart.y;

        if (shiftKey) {
            const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
            this.width = size;
            this.height = size;

            if (deltaX >= 0) {
                this.x = this.originalX;
            } else {
                this.x = this.originalX - size;
            }

            if (deltaY >= 0) {
                this.y = this.originalY;
            } else {
                this.y = this.originalY - size;
            }
        } else {
            this.width = Math.abs(deltaX);
            this.height = Math.abs(deltaY);
            this.x = Math.min(dragStart.x, mx);
            this.y = Math.min(dragStart.y, my);
        }

        this.calculateBoundingRect();
    }

    override setCoord(x: number, y: number): void {
        this.x = x;
        this.y = y;

        this.calculateBoundingRect()
    }

    override setDim(width: number, height: number): void {
    
        this.width = width;
        this.height = height;

        this.calculateBoundingRect()
    }

    override getDim(): { width: number, height: number } {
        return { width: this.width, height: this.height }
    }

    override calculateBoundingRect(): void {
        this.boundingRect = {
            top: this.y,
            left: this.x,
            bottom: this.y + this.height,
            right: this.x + this.width
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

        const rect = this.resource.canvasKit.LTRBRect(this.x, this.y, this.x + this.width, this.y + this.height);

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
        if (this.bdradius.locked) {
            const radius = this.bdradius['top-left'];
            const rrect = canvasKit.RRectXY(rect, radius, radius);
            canvas.drawRRect(rrect, this.resource.paint);
            canvas.drawRRect(rrect, this.resource.strokePaint);
            return;
        } else {
            const path = this.makeCustomRRectPath()

            canvas.drawPath(path, this.resource.paint);
            canvas.drawPath(path, this.resource.strokePaint);

            path.delete(); // Clean up WASM memory
        }
    }

    protected makeCustomRRectPath(): Path {
        const radii = {
            tl: this.bdradius['top-left'],
            tr: this.bdradius['top-right'],
            br: this.bdradius['bottom-right'],
            bl: this.bdradius['bottom-left']
        };
        const [x, y, w, h] = [this.x, this.y, this.width, this.height];
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

        const max = Math.min(this.width, this.height) / 2;
        this.bdradius[pos] = Math.max(0, Math.min(newRadius, max));
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

    toggleRadiusLock(): void {
        this.bdradius.locked = !this.bdradius.locked;
        if (this.bdradius.locked) {
            const radius = Math.max(this.bdradius['top-left'], this.bdradius['top-right'],
                this.bdradius['bottom-left'], this.bdradius['bottom-right']);
            this.setBorderRadius(radius);
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
                x = this.x + (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.y + (handle.isDragging || r >= padding ? r : padding) - size;
                break;
            case 'top-right':
                x = this.x + this.width - (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.y + (handle.isDragging || r >= padding ? r : padding) - size;
                break;
            case 'bottom-left':
                x = this.x + (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.y + this.height - (handle.isDragging || r >= padding ? r : padding) - size;
                break;
            case 'bottom-right':
                x = this.x + this.width - (handle.isDragging || r >= padding ? r : padding) - size;
                y = this.y + this.height - (handle.isDragging || r >= padding ? r : padding) - size;
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

    override pointInShape(x: number, y: number): boolean {
        return x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height;
    }

    override destroy(): void {

    }
}

export default Rectangle;