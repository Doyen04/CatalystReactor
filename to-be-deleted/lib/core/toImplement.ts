// export interface SnapPoint {
//     x: number
//     y: number
//     type: 'corner' | 'edge' | 'center' | 'grid'
//     source?: string // ID of the shape that created this snap point
// }

// export interface SnapResult {
//     snapped: boolean
//     x: number
//     y: number
//     snapPoints: SnapPoint[]
//     guides: { x?: number; y?: number }[]
// }

// export class SnapManager {
//     private snapDistance: number = 5 // pixels
//     private gridSize: number = 10
//     private enableGrid: boolean = true
//     private enableShapes: boolean = true

//     snap(targetX: number, targetY: number, shapes: Rectangle[], excludeId?: string): SnapResult {
//         let bestSnapX = targetX
//         let bestSnapY = targetY
//         let snappedX = false
//         let snappedY = false
//         const activeGuides: { x?: number; y?: number }[] = []
//         const snapPoints: SnapPoint[] = []

//         // Grid snapping
//         if (this.enableGrid) {
//             const gridX = Math.round(targetX / this.gridSize) * this.gridSize
//             const gridY = Math.round(targetY / this.gridSize) * this.gridSize

//             if (Math.abs(targetX - gridX) <= this.snapDistance) {
//                 bestSnapX = gridX
//                 snappedX = true
//                 snapPoints.push({ x: gridX, y: targetY, type: 'grid' })
//             }

//             if (Math.abs(targetY - gridY) <= this.snapDistance) {
//                 bestSnapY = gridY
//                 snappedY = true
//                 snapPoints.push({ x: targetX, y: gridY, type: 'grid' })
//             }
//         }

//         // Shape snapping
//         if (this.enableShapes) {
//             for (const shape of shapes) {
//                 if (shape.id === excludeId) continue

//                 const shapeSnapPoints = this.getShapeSnapPoints(shape)
//                 for (const point of shapeSnapPoints) {
//                     if (Math.abs(targetX - point.x) <= this.snapDistance) {
//                         bestSnapX = point.x
//                         snappedX = true
//                         activeGuides.push({ x: point.x })
//                         snapPoints.push(point)
//                     }

//                     if (Math.abs(targetY - point.y) <= this.snapDistance) {
//                         bestSnapY = point.y
//                         snappedY = true
//                         activeGuides.push({ y: point.y })
//                         snapPoints.push(point)
//                     }
//                 }
//             }
//         }

//         return {
//             snapped: snappedX || snappedY,
//             x: bestSnapX,
//             y: bestSnapY,
//             snapPoints,
//             guides: activeGuides,
//         }
//     }

//     private getShapeSnapPoints(shape: Rectangle): SnapPoint[] {
//         const bounds = shape.getBounds()
//         return [
//             // Corners
//             { x: bounds.left, y: bounds.top, type: 'corner', source: shape.id },
//             { x: bounds.right, y: bounds.top, type: 'corner', source: shape.id },
//             { x: bounds.left, y: bounds.bottom, type: 'corner', source: shape.id },
//             { x: bounds.right, y: bounds.bottom, type: 'corner', source: shape.id },
//             // Centers
//             { x: bounds.centerX, y: bounds.centerY, type: 'center', source: shape.id },
//             // Edge midpoints
//             { x: bounds.centerX, y: bounds.top, type: 'edge', source: shape.id },
//             { x: bounds.centerX, y: bounds.bottom, type: 'edge', source: shape.id },
//             { x: bounds.left, y: bounds.centerY, type: 'edge', source: shape.id },
//             { x: bounds.right, y: bounds.centerY, type: 'edge', source: shape.id },
//         ]
//     }
// }


// function onPointerMove(e) {
//                     if (!dragging) return;
//                     const p = canvasPointFromEvent(e);
//                     let a = normalizeAngle(-angleFromPoint(p));
//                     if (e.shiftKey) {
//                         const snap = (15 * Math.PI) / 180;
//                         a = Math.round(a / snap) * snap;
//                     }
//                     if (dragging === 'start') {
//                         start = normalizeAngle(a);
//                         dragPrevPointer = normalizeAngle(start + sweep);
//                         dragLastDiff = normalizeAngle(sweep);
//                         dragDirection = sweep >= 0 ? 1 : -1;
//                     } else if (dragging === 'end') {
//                         const pointerAngle = a;
//                         const diffCW = normalizeAngle(pointerAngle - start);
//                         const prevDiff = dragLastDiff;

//                         let pointerDelta = pointerAngle - dragPrevPointer;
//                         if (pointerDelta > Math.PI) pointerDelta -= TWO_PI;
//                         if (pointerDelta < -Math.PI) pointerDelta += TWO_PI;

//                         if (pointerDelta > 0 && diffCW < prevDiff) {
//                             dragDirection *= -1;
//                         } else if (pointerDelta < 0 && diffCW > prevDiff) {
//                             dragDirection *= -1;
//                         }

//                         dragLastDiff = diffCW;
//                         dragPrevPointer = pointerAngle;

//                         const sweepCandidate = dragDirection >= 0 ? diffCW : diffCW - TWO_PI;
//                         sweep = clampSweep(sweepCandidate);
//                     }
//                     draw();
//                 }
