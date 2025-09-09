import { Coord } from '@lib/types/shapes'

function normalizeAngle(angle: number) {
    while (angle <= -Math.PI) angle += Math.PI * 2
    while (angle > Math.PI) angle -= Math.PI * 2
    return angle
}

function getArcParameters(startPoint: Coord, endPoint: Coord, arcCenter: Coord, currentRadius: number, turnSign: number) {
    const a1 = Math.atan2(startPoint.y - arcCenter.y, startPoint.x - arcCenter.x)
    const a2 = Math.atan2(endPoint.y - arcCenter.y, endPoint.x - arcCenter.x)
    let delta = normalizeAngle(a2 - a1) //sweep angle

    // Enforce arcTo fillet direction: left turn => CW (delta <= 0), right turn => CCW (delta >= 0)
    if (turnSign > 0 && delta > 0) delta -= Math.PI * 2
    if (turnSign < 0 && delta < 0) delta += Math.PI * 2

    return { center: arcCenter, radius: currentRadius, startAngle: a1, deltaAngle: delta }
}

function arcPointAtFraction(startPoint: Coord, endPoint: Coord, arcCenter: Coord, currentRadius: number, turnSign: number, t: number) {
    const params = getArcParameters(startPoint, endPoint, arcCenter, currentRadius, turnSign)
    const clamped = Math.max(0, Math.min(1, t))
    const theta = params.startAngle + clamped * params.deltaAngle
    return { x: params.center.x + params.radius * Math.cos(theta), y: params.center.y + params.radius * Math.sin(theta) }
}

export { getArcParameters, arcPointAtFraction }
