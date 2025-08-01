import type { Canvas } from "canvaskit-wasm";
import Rectangle from './Rect';

class PImage extends Rectangle {
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
            this.createCanvasKitImage(imageElem);
        }
        this.setUpImage()
        this.calculateBoundingRect()
    }
    //draw somewhere else first
    private setUpImage(): void {
        if (!this.canvasKitImage || !this.resource?.canvasKit) return;

        if (this.canvasKitImage) {
            this.IWidth = this.canvasKitImage.width();
            this.IHeight = this.canvasKitImage.height();

            this.aspectRatio = this.IWidth / this.IHeight;
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
            let newWidth: number;
            let newHeight: number;

            if (this.maintainAspectRatio && !shiftKey) {
                // Maintain original image aspect ratio
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);

                // Use whichever gives us the larger size (following the mouse better)
                if (absX / this.aspectRatio >= absY) {
                    // Width change is dominant
                    newWidth = absX;
                    newHeight = absX / this.aspectRatio;
                } else {
                    // Height change is dominant
                    newHeight = absY;
                    newWidth = absY * this.aspectRatio;
                }
            } else {
                // Shift key held - make square (1:1 aspect ratio)
                const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                newWidth = size;
                newHeight = size;
            }

            this.dimension.width = newWidth;
            this.dimension.height = newHeight;

            // Position based on drag direction
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

        const ck = this.resource.canvasKit;
        this.setPaint();

        const rect = ck.XYWHRect(this.transform.x, this.transform.y, this.dimension.width, this.dimension.height);

        const scaleMatrix = ck.Matrix.scaled(
            this.dimension.width / this.IWidth,
            this.dimension.height / this.IHeight
        );
        const translateMatrix = ck.Matrix.translated(this.transform.x, this.transform.y);
        const finalMatrix = ck.Matrix.multiply(translateMatrix, scaleMatrix);

        const imageShader = this.makeImageShader(finalMatrix)

        this.resource.paint.setShader(imageShader);

        if (this.hasRadius() && this.bdradius.locked) {
            const radius = this.bdradius['top-left'];
            const rrect = ck.RRectXY(rect, radius, radius);
            canvas.drawRRect(rrect, this.resource.paint);
            canvas.drawRRect(rrect, this.resource.strokePaint);
        } else if (this.hasRadius()) {
            const path = this.makeCustomRRectPath();
            canvas.drawPath(path, this.resource.paint);
            canvas.drawPath(path, this.resource.strokePaint);
        } else {
            canvas.drawRect(rect, this.resource.paint);
            canvas.drawRect(rect, this.resource.strokePaint);
        }

        this.resource.paint.setShader(null);
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
    override cleanUp(): void {

    }
    override destroy(): void {
        this.canvasKitImage.delete()
        this.imageLoaded = null
        this.aspectRatio = null
        this.maintainAspectRatio = null
        this.IWidth = 0
        this.IHeight = 0
    }
}

export default PImage;