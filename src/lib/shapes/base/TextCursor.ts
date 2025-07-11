// TextCursor.ts
import { CanvasKitResources } from "@lib/core";
import type { Canvas } from "canvaskit-wasm";

class TextCursor {
    private x: number;
    private y: number;
    private height: number;
    private visible: boolean = true;
    private blinkInterval: ReturnType<typeof setTimeout>;
    private blinkSpeed: number = 500; // ms

    constructor(initialX: number, initialY: number, initialHeight: number) {
        this.x = initialX;
        this.y = initialY;
        this.height = initialHeight;

        // Setup blinking effect
        this.blinkInterval = setInterval(() => {
            this.visible = !this.visible
        }, this.blinkSpeed)
    }

    get resource(): CanvasKitResources {
        const resources = CanvasKitResources.getInstance();
        return (resources) ? resources : null
    }

    setPaint() {
        if (!this.resource) return

        this.resource.paint.setColor(this.resource.canvasKit.BLACK);
        this.resource.paint.setStyle(this.resource.canvasKit.PaintStyle.Fill);
    }

    updatePosition(x: number, y: number, height: number): void {
        this.x = x;
        this.y = y;
        this.height = height;
        this.visible = true;
        // Reset blink timer
        clearInterval(this.blinkInterval);
        this.blinkInterval = setInterval(() => {
            this.visible = !this.visible;
        }, this.blinkSpeed);
    }

    draw(canvas: Canvas): void {
        if (!this.visible || !this.resource) return;

        canvas.drawLine(this.x, this.y, this.x, this.y + this.height, this.resource.paint);
    }

    destroy(): void {
        clearInterval(this.blinkInterval);
    }
}

export default TextCursor