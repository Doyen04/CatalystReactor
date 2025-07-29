import type { Canvas, Image as CanvasKitImage, Rect } from "canvaskit-wasm";
import Rectangle from './Rect';

class PImage extends Rectangle {
    private imageElement: ArrayBuffer | null = null;
    private canvasKitImage: CanvasKitImage | null = null;
    private imageLoaded: boolean = false;
    private aspectRatio: number = 1;
    private maintainAspectRatio: boolean = true;
    private IWidth: number;
    private IHeight: number;

    constructor(x: number, y: number, imageElem: ArrayBuffer) {
        super(x, y);
        this.IWidth = 0;
        this.IHeight = 0;

        if (imageElem) {
            this.setImageElement(imageElem);
        }
        this.calculateBoundingRect()
    }

    setImageElement(img: ArrayBuffer): void {
        this.imageElement = img;
        if (!this.imageElement) return;

        this.imageLoaded = true;

        if (this.resource?.canvasKit) {
            this.createCanvasKitImage();
        }
    }

    //draw somewhere else first
    private createCanvasKitImage(): void {
        if (!this.imageElement || !this.resource?.canvasKit) return;
        const uint8Array = new Uint8Array(this.imageElement);

        this.canvasKitImage = this.resource.canvasKit.MakeImageFromEncoded(uint8Array);
        if (this.canvasKitImage) {
            this.IWidth = this.canvasKitImage.width();
            this.IHeight = this.canvasKitImage.height();

            this.aspectRatio = this.IWidth / this.IHeight;
            if (this.maintainAspectRatio) {
                // Maintain aspect ratio based on which dimension is set
                if (this.IWidth > 0 && this.IHeight === 0) {
                    this.IHeight = this.IWidth / this.aspectRatio;
                } else if (this.IHeight > 0 && this.IWidth === 0) {
                    this.IWidth = this.IHeight * this.aspectRatio;
                }
            }

            this.calculateBoundingRect();
        }
    }

    override setSize(dragStart: { x: number; y: number; }, mx: number, my: number, shiftKey: boolean): void {
        // Calculate dimensions
        const deltaX = (mx - dragStart.x);
        const deltaY = (my - dragStart.y);

        this.transform.isFlippedX = deltaX < 0;
        this.transform.isFlippedY = deltaY < 0;

        this.transform.originalX = dragStart.x;
        this.transform.originalY = dragStart.y;

        if (shiftKey || this.maintainAspectRatio) {
            // When shift is held OR aspect ratio should be maintained
            let size: number;

            if (this.maintainAspectRatio && !shiftKey) {
                // Maintain aspect ratio based on the larger change
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);

                if (this.aspectRatio > 1) {
                    // Wider image - prioritize width changes
                    size = absX > absY / this.aspectRatio ? absX : absY / this.aspectRatio;
                } else {
                    // Taller image - prioritize height changes  
                    size = absY > absX * this.aspectRatio ? absY : absX * this.aspectRatio;
                }

                this.dimension.width = size;
                this.dimension.height = size / this.aspectRatio;
            } else {
                // Shift key held - make square
                size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                this.dimension.width = size;
                this.dimension.height = size;
            }

            // Position based on drag direction // check this
            if (deltaX >= 0) {
                this.transform.x = this.transform.originalX;
            } else {
                this.transform.x = this.transform.originalX - this.dimension.width;
            }

            if (deltaY >= 0) {
                this.transform.y = this.transform.originalY;
            } else {
                this.transform.y = this.transform.originalY - this.dimension.height;
            }
        } else {
            // Free resizing without aspect ratio constraint
            this.dimension.width = Math.abs(deltaX);
            this.dimension.height = Math.abs(deltaY);
            this.transform.x = Math.min(dragStart.x, mx);
            this.transform.y = Math.min(dragStart.y, my);
        }

        this.calculateBoundingRect();
    }

    override draw(canvas: Canvas): void {
        if (!this.resource?.canvasKit || !this.canvasKitImage) return;
        canvas.save();
        const ck = this.resource.canvasKit;
        const srcRect = ck.XYWHRect(0, 0, this.IWidth, this.IHeight);
        const dstRect = ck.XYWHRect(this.transform.x, this.transform.y, this.dimension.width, this.dimension.height);

        if (this.hasRadius()) {
            this.clipToRoundedRect(canvas, dstRect);
        }
        // remove later
        canvas.drawImageRectCubic(
            this.canvasKitImage, srcRect, dstRect,
            1 / 3,
            1 / 3,
            null
        );
        canvas.restore();

        this.setPaint();

        if (this.hasRadius()) {
            this.drawRoundedRectOutline(canvas);
        } else {
            const borderRect = ck.XYWHRect(
                this.transform.x + this.style.strokeWidth / 2,
                this.transform.y + this.style.strokeWidth / 2,
                this.dimension.width - this.style.strokeWidth,
                this.dimension.height - this.style.strokeWidth
            );
            canvas.drawRect(borderRect, this.resource.strokePaint);
        }
    }

    private drawRoundedRectOutline(canvas: Canvas): void {
        if (!this.resource) return;

        const ck = this.resource.canvasKit;
        const strokeOffset = this.style.strokeWidth / 2;
        const rect = ck.XYWHRect(
            this.transform.x + strokeOffset,
            this.transform.y + strokeOffset,
            this.dimension.width - this.style.strokeWidth,
            this.dimension.height - this.style.strokeWidth
        );

        if (this.bdradius.locked) {
            const radius = Math.max(0, this.bdradius['top-left'] - strokeOffset);
            const rrect = ck.RRectXY(rect, radius, radius);
            canvas.drawRRect(rrect, this.resource.strokePaint);
        } else {
            const path = this.makeCustomRRectPath();
            canvas.drawPath(path, this.resource.strokePaint);
            path.delete();
        }
    }

    private clipToRoundedRect(canvas: Canvas, rect: Rect): void {
        if (!this.resource) return;

        const ck = this.resource.canvasKit;

        // Method 1: Using RRectXY (simpler but uniform corners)
        if (this.bdradius.locked) {
            const radius = this.bdradius['top-left'];
            const rrect = ck.RRectXY(rect, radius, radius);
            canvas.clipRRect(rrect, ck.ClipOp.Intersect, true);
        } else {
            // Method 2: Custom path for different corner radii
            const path = this.makeCustomRRectPath();
            canvas.clipPath(path, ck.ClipOp.Intersect, true);
            path.delete(); // Clean up WASM memory
        }
    }

    override cleanUp(): void {

    }
    override destroy(): void {
        this.imageElement = null
        this.canvasKitImage.delete()
        this.imageLoaded = null
        this.aspectRatio = null
        this.maintainAspectRatio = null
        this.IWidth = 0
        this.IHeight = 0
    }
}

export default PImage;