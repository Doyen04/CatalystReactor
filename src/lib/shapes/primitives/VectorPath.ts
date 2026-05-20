import type { Canvas, Path as SkPath } from 'canvaskit-wasm'
import { Coord, PathPoint, Properties } from '@lib/types/shapes'
import Shape from '../base/Shape'
import { ShapeData } from '@lib/core/EngineStateStore'

class VectorPath extends Shape {
    // Preview point shown while drawing (not yet committed)
    public previewPoint: PathPoint | null = null
    // Index of the currently selected anchor (for edit tool)
    public selectedPointIndex: number = -1

    constructor(data: ShapeData) {
        super(data)
    }

    get points(): PathPoint[] {
        return this.data.properties.pathData?.points ?? []
    }

    get closed(): boolean {
        return this.data.properties.pathData?.closed ?? false
    }

    set closed(v: boolean) {
        if (this.data.properties.pathData) {
            this.data.properties.pathData.closed = v
        }
    }

    // ── Point manipulation ────────────────────────────────────────

    addPoint(point: PathPoint): void {
        if (!this.data.properties.pathData) {
            this.data.properties.pathData = { points: [], closed: false }
        }
        this.data.properties.pathData.points.push(point)
        this.recomputeBounds()
    }

    insertPoint(index: number, point: PathPoint): void {
        this.data.properties.pathData.points.splice(index, 0, point)
        this.recomputeBounds()
    }

    removePoint(index: number): void {
        this.data.properties.pathData.points.splice(index, 1)
        this.recomputeBounds()
    }

    updatePoint(index: number, x: number, y: number): void {
        const pt = this.points[index]
        if (!pt) return
        const dx = x - pt.x
        const dy = y - pt.y
        pt.x = x
        pt.y = y
        // Move control points with anchor
        if (pt.cp1) { pt.cp1.x += dx; pt.cp1.y += dy }
        if (pt.cp2) { pt.cp2.x += dx; pt.cp2.y += dy }
        this.recomputeBounds()
    }

    updateControlPoint(index: number, which: 'cp1' | 'cp2', x: number, y: number): void {
        const pt = this.points[index]
        if (!pt) return

        if (!pt[which]) {
            pt[which] = { x, y }
        } else {
            pt[which]!.x = x
            pt[which]!.y = y
        }

        // Enforce smooth constraint: mirror the opposite control point
        if (pt.smooth) {
            const opposite = which === 'cp1' ? 'cp2' : 'cp1'
            const dx = x - pt.x
            const dy = y - pt.y
            const dist = pt[opposite]
                ? Math.sqrt((pt[opposite]!.x - pt.x) ** 2 + (pt[opposite]!.y - pt.y) ** 2)
                : Math.sqrt(dx * dx + dy * dy)
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len > 0) {
                const nx = -dx / len
                const ny = -dy / len
                if (!pt[opposite]) pt[opposite] = { x: pt.x, y: pt.y }
                pt[opposite]!.x = pt.x + nx * dist
                pt[opposite]!.y = pt.y + ny * dist
            }
        }
        this.recomputeBounds()
    }

    updateLastPoint(x: number, y: number): void {
        const pts = this.points
        if (pts.length === 0) return
        const last = pts[pts.length - 1]
        last.x = x
        last.y = y
        this.recomputeBounds()
    }

    toggleSmooth(index: number): void {
        const pt = this.points[index]
        if (!pt) return
        pt.smooth = !pt.smooth
        if (pt.smooth && !pt.cp1 && !pt.cp2) {
            // Auto-create symmetric handles based on neighbors
            const prev = this.points[index - 1]
            const next = this.points[index + 1]
            if (prev || next) {
                const ref = next ?? prev!
                const dx = ref.x - pt.x
                const dy = ref.y - pt.y
                const dist = Math.sqrt(dx * dx + dy * dy) * 0.3
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                const nx = dx / len
                const ny = dy / len
                pt.cp2 = { x: pt.x + nx * dist, y: pt.y + ny * dist }
                pt.cp1 = { x: pt.x - nx * dist, y: pt.y - ny * dist }
            }
        } else if (!pt.smooth) {
            pt.cp1 = undefined
            pt.cp2 = undefined
        }
    }

    // ── Bounds computation ────────────────────────────────────────

    private recomputeBounds(): void {
        const pts = this.points
        if (pts.length === 0) {
            this.data.properties.size.width = 0
            this.data.properties.size.height = 0
            return
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

        for (const pt of pts) {
            minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y)
            maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y)
            if (pt.cp1) {
                minX = Math.min(minX, pt.cp1.x); minY = Math.min(minY, pt.cp1.y)
                maxX = Math.max(maxX, pt.cp1.x); maxY = Math.max(maxY, pt.cp1.y)
            }
            if (pt.cp2) {
                minX = Math.min(minX, pt.cp2.x); minY = Math.min(minY, pt.cp2.y)
                maxX = Math.max(maxX, pt.cp2.x); maxY = Math.max(maxY, pt.cp2.y)
            }
        }

        // Shift points if origin is not at (0, 0)
        if (minX !== 0 || minY !== 0) {
            for (const pt of pts) {
                pt.x -= minX
                pt.y -= minY
                if (pt.cp1) {
                    pt.cp1.x -= minX
                    pt.cp1.y -= minY
                }
                if (pt.cp2) {
                    pt.cp2.x -= minX
                    pt.cp2.y -= minY
                }
            }
            this.data.properties.transform.x += minX
            this.data.properties.transform.y += minY
        }

        this.data.properties.size.width = Math.max(1, maxX - minX)
        this.data.properties.size.height = Math.max(1, maxY - minY)
    }

    // ── Shape interface ───────────────────────────────────────────

    override setDim(width: number, height: number): void {
        const oldW = this.data.properties.size.width || 1
        const oldH = this.data.properties.size.height || 1
        const scaleX = width / oldW
        const scaleY = height / oldH

        for (const pt of this.points) {
            pt.x *= scaleX; pt.y *= scaleY
            if (pt.cp1) { pt.cp1.x *= scaleX; pt.cp1.y *= scaleY }
            if (pt.cp2) { pt.cp2.x *= scaleX; pt.cp2.y *= scaleY }
        }

        this.data.properties.size.width = width
        this.data.properties.size.height = height
    }

    override getDim(): { width: number; height: number } {
        return {
            width: Math.round(Math.max(1, this.data.properties.size.width)),
            height: Math.round(Math.max(1, this.data.properties.size.height)),
        }
    }

    override getCenterCoord(): Coord {
        const { width, height } = this.getDim()
        return { x: width / 2, y: height / 2 }
    }

    override moveShape(mx: number, my: number): void {
        super.moveShape(mx, my)
    }

    // ── Build the CanvasKit path ──────────────────────────────────

    private buildPath(): SkPath | null {
        const pts = this.points
        if (pts.length < 2) return null

        const CanvasKit = this.resource?.canvasKit
        if (!CanvasKit) return null

        const path = new CanvasKit.Path()
        path.moveTo(pts[0].x, pts[0].y)

        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]
            const curr = pts[i]
            const hasCP2 = prev.cp2 != null
            const hasCP1 = curr.cp1 != null

            if (hasCP2 || hasCP1) {
                const cp1x = prev.cp2?.x ?? prev.x
                const cp1y = prev.cp2?.y ?? prev.y
                const cp2x = curr.cp1?.x ?? curr.x
                const cp2y = curr.cp1?.y ?? curr.y
                path.cubicTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y)
            } else {
                path.lineTo(curr.x, curr.y)
            }
        }

        // Close the path if needed
        if (this.closed && pts.length > 2) {
            const last = pts[pts.length - 1]
            const first = pts[0]
            const hasCP2 = last.cp2 != null
            const hasCP1 = first.cp1 != null

            if (hasCP2 || hasCP1) {
                const cp1x = last.cp2?.x ?? last.x
                const cp1y = last.cp2?.y ?? last.y
                const cp2x = first.cp1?.x ?? first.x
                const cp2y = first.cp1?.y ?? first.y
                path.cubicTo(cp1x, cp1y, cp2x, cp2y, first.x, first.y)
            } else {
                path.close()
            }
        }

        return path
    }

    // ── Drawing ────────────────────────────────────────────────────

    override draw(canvas: Canvas): void {
        if (!this.resource) return

        const dim = this.getDim()
        const properties = this.data.properties
        const fill = this.paintManager.initFillPaint(properties.style.fill, dim)
        const stroke = this.paintManager.initStrokePaint(properties.style.stroke, dim)

        const path = this.buildPath()
        if (path) {
            if (this.closed) {
                canvas.drawPath(path, fill)
            }
            canvas.drawPath(path, stroke)
            path.delete()
        } else if (this.points.length === 1) {
            // Single point — draw a small dot
            const pt = this.points[0]
            const dotRect = this.resource.canvasKit.XYWHRect(pt.x - 3, pt.y - 3, 6, 6)
            canvas.drawOval(dotRect, stroke)
        }

        // Preview line while drawing
        if (this.previewPoint && this.points.length > 0) {
            const lastPt = this.points[this.points.length - 1]
            const previewPath = new this.resource.canvasKit.Path()
            previewPath.moveTo(lastPt.x, lastPt.y)

            if (lastPt.cp2) {
                previewPath.cubicTo(
                    lastPt.cp2.x, lastPt.cp2.y,
                    this.previewPoint.cp1?.x ?? this.previewPoint.x,
                    this.previewPoint.cp1?.y ?? this.previewPoint.y,
                    this.previewPoint.x, this.previewPoint.y
                )
            } else {
                previewPath.lineTo(this.previewPoint.x, this.previewPoint.y)
            }

            // Dashed preview stroke
            const previewStroke = this.paintManager.stroke
            previewStroke.setColor(this.resource.canvasKit.Color(100, 100, 255, 0.6))
            previewStroke.setStrokeWidth(1.5)
            canvas.drawPath(previewPath, previewStroke)
            previewPath.delete()
        }

        this.paintManager.resetPaint()

        if (this.isHover) {
            this.drawHoverEffect(canvas)
        }
    }

    protected override drawHoverEffect(canvas: Canvas): void {
        if (!this.resource) return

        const path = this.buildPath()
        if (!path) return

        const hoverPaint = this.paintManager.stroke
        hoverPaint.setColor(this.resource.canvasKit.Color(0, 123, 255, 1))
        hoverPaint.setStrokeWidth(2)
        canvas.drawPath(path, hoverPaint)
        path.delete()
    }

    // ── Hit testing ───────────────────────────────────────────────

    override pointInShape(x: number, y: number): boolean {
        const pts = this.points
        if (pts.length < 2) {
            if (pts.length === 1) {
                const dx = x - pts[0].x
                const dy = y - pts[0].y
                return dx * dx + dy * dy < 100 // 10px radius
            }
            return false
        }

        // Use distance-to-polyline approximation
        const tolerance = Math.max(8, (this.data.properties.style.stroke?.width ?? 2) * 2)

        for (let i = 1; i < pts.length; i++) {
            if (this.distToSegment(x, y, pts[i - 1], pts[i]) < tolerance) return true
        }
        if (this.closed && pts.length > 2) {
            if (this.distToSegment(x, y, pts[pts.length - 1], pts[0]) < tolerance) return true
        }

        // For closed paths, also check if inside
        if (this.closed) {
            return this.pointInPolygon(x, y, pts)
        }

        return false
    }

    private distToSegment(px: number, py: number, a: PathPoint, b: PathPoint): number {
        const dx = b.x - a.x
        const dy = b.y - a.y
        const lenSq = dx * dx + dy * dy
        if (lenSq === 0) return Math.sqrt((px - a.x) ** 2 + (py - a.y) ** 2)

        let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq
        t = Math.max(0, Math.min(1, t))

        const projX = a.x + t * dx
        const projY = a.y + t * dy
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
    }

    private pointInPolygon(x: number, y: number, pts: PathPoint[]): boolean {
        let inside = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x, yi = pts[i].y
            const xj = pts[j].x, yj = pts[j].y
            if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                inside = !inside
            }
        }
        return inside
    }

    // ── Modifier handles (for edit mode) ──────────────────────────



    // Find the closest point index to a coordinate
    findClosestPoint(x: number, y: number, threshold = 12): number {
        const pts = this.points
        for (let i = 0; i < pts.length; i++) {
            const dx = x - pts[i].x
            const dy = y - pts[i].y
            if (dx * dx + dy * dy < threshold * threshold) return i
        }
        return -1
    }

    // Find the closest control point
    findClosestControlPoint(x: number, y: number, threshold = 10): { index: number, which: 'cp1' | 'cp2' } | null {
        const pts = this.points
        for (let i = 0; i < pts.length; i++) {
            if (pts[i].cp1) {
                const dx = x - pts[i].cp1!.x
                const dy = y - pts[i].cp1!.y
                if (dx * dx + dy * dy < threshold * threshold) return { index: i, which: 'cp1' }
            }
            if (pts[i].cp2) {
                const dx = x - pts[i].cp2!.x
                const dy = y - pts[i].cp2!.y
                if (dx * dx + dy * dy < threshold * threshold) return { index: i, which: 'cp2' }
            }
        }
        return null
    }

    // Find the closest segment for point insertion
    findClosestSegment(x: number, y: number, threshold = 10): number {
        const pts = this.points
        let minDist = Infinity
        let minIdx = -1
        for (let i = 1; i < pts.length; i++) {
            const d = this.distToSegment(x, y, pts[i - 1], pts[i])
            if (d < minDist && d < threshold) {
                minDist = d
                minIdx = i
            }
        }
        if (this.closed && pts.length > 2) {
            const d = this.distToSegment(x, y, pts[pts.length - 1], pts[0])
            if (d < minDist && d < threshold) {
                minIdx = pts.length
            }
        }
        return minIdx
    }

    // ── Draw edit overlay (called by EditTool) ────────────────────

    drawEditOverlay(canvas: Canvas): void {
        if (!this.resource) return
        const CanvasKit = this.resource.canvasKit
        const pts = this.points

        // Draw control handle lines
        const linePaint = this.paintManager.stroke
        linePaint.setColor(CanvasKit.Color(120, 120, 220, 0.7))
        linePaint.setStrokeWidth(1)

        for (const pt of pts) {
            if (pt.cp1) {
                const lp = new CanvasKit.Path()
                lp.moveTo(pt.x, pt.y)
                lp.lineTo(pt.cp1.x, pt.cp1.y)
                canvas.drawPath(lp, linePaint)
                lp.delete()
            }
            if (pt.cp2) {
                const lp = new CanvasKit.Path()
                lp.moveTo(pt.x, pt.y)
                lp.lineTo(pt.cp2.x, pt.cp2.y)
                canvas.drawPath(lp, linePaint)
                lp.delete()
            }
        }

        // Draw control points (small circles)
        const cpFill = this.paintManager.paint
        cpFill.setColor(CanvasKit.Color(255, 255, 255, 1))
        const cpStroke = this.paintManager.stroke
        cpStroke.setColor(CanvasKit.Color(100, 100, 220, 1))
        cpStroke.setStrokeWidth(1.5)

        const cpSize = 4
        for (const pt of pts) {
            if (pt.cp1) {
                const r = CanvasKit.LTRBRect(
                    pt.cp1.x - cpSize, pt.cp1.y - cpSize,
                    pt.cp1.x + cpSize, pt.cp1.y + cpSize
                )
                canvas.drawOval(r, cpFill)
                canvas.drawOval(r, cpStroke)
            }
            if (pt.cp2) {
                const r = CanvasKit.LTRBRect(
                    pt.cp2.x - cpSize, pt.cp2.y - cpSize,
                    pt.cp2.x + cpSize, pt.cp2.y + cpSize
                )
                canvas.drawOval(r, cpFill)
                canvas.drawOval(r, cpStroke)
            }
        }

        // Draw anchor points (filled diamonds / squares)
        const anchorFill = this.paintManager.paint
        const anchorStroke = this.paintManager.stroke
        anchorStroke.setStrokeWidth(1.5)

        const aSize = 5
        for (let i = 0; i < pts.length; i++) {
            const pt = pts[i]
            const isSelected = i === this.selectedPointIndex

            if (isSelected) {
                anchorFill.setColor(CanvasKit.Color(59, 130, 246, 1))
                anchorStroke.setColor(CanvasKit.Color(29, 78, 216, 1))
            } else {
                anchorFill.setColor(CanvasKit.Color(255, 255, 255, 1))
                anchorStroke.setColor(CanvasKit.Color(59, 130, 246, 1))
            }

            // Draw as diamond shape for path anchors
            const diamond = new CanvasKit.Path()
            diamond.moveTo(pt.x, pt.y - aSize)
            diamond.lineTo(pt.x + aSize, pt.y)
            diamond.lineTo(pt.x, pt.y + aSize)
            diamond.lineTo(pt.x - aSize, pt.y)
            diamond.close()

            canvas.drawPath(diamond, anchorFill)
            canvas.drawPath(diamond, anchorStroke)
            diamond.delete()
        }

        this.paintManager.resetPaint()
    }


    override cleanUp(): void {
        this.previewPoint = null
        this.selectedPointIndex = -1
    }

    override destroy(): void {
        this.previewPoint = null
    }
}

export default VectorPath
