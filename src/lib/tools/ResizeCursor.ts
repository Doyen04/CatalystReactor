export class ResizeCursor {
    private static cursorCache = new Map<string, string>()

    static create(deg: number, size: number = 24, color: string = '#000000'): string {
        const cacheKey = `${deg}-${size}-${color}`

        if (this.cursorCache.has(cacheKey)) {
            return this.cursorCache.get(cacheKey)!
        }

        const normalizedDeg = ((deg % 360) + 360) % 360
        const radians = (normalizedDeg * Math.PI) / 180

        const centerX = size / 2
        const centerY = size / 2
        const arrowLength = size * 0.4
        // const arrowWidth = size * 0.15

        // Calculate arrow points
        const cos = Math.cos(radians)
        const sin = Math.sin(radians)

        // Main arrow line endpoints
        const x1 = centerX - cos * arrowLength
        const y1 = centerY - sin * arrowLength
        const x2 = centerX + cos * arrowLength
        const y2 = centerY + sin * arrowLength

        // Arrow head points
        const headLength = arrowLength * 0.3
        const headAngle = Math.PI / 6 // 30 degrees

        // First arrow head
        const head1X1 = x1 + Math.cos(radians + Math.PI - headAngle) * headLength
        const head1Y1 = y1 + Math.sin(radians + Math.PI - headAngle) * headLength
        const head1X2 = x1 + Math.cos(radians + Math.PI + headAngle) * headLength
        const head1Y2 = y1 + Math.sin(radians + Math.PI + headAngle) * headLength

        // Second arrow head
        const head2X1 = x2 + Math.cos(radians - headAngle) * headLength
        const head2Y1 = y2 + Math.sin(radians - headAngle) * headLength
        const head2X2 = x2 + Math.cos(radians + headAngle) * headLength
        const head2Y2 = y2 + Math.sin(radians + headAngle) * headLength

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <defs>
                    <filter id="outline">
                        <feMorphology operator="dilate" radius="1"/>
                        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
                        <feComposite in="SourceGraphic" operator="over"/>
                    </filter>
                </defs>
                <g filter="url(#outline)">
                    <!-- Main line -->
                    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
                          stroke="${color}" stroke-width="2" stroke-linecap="round"/>
                    
                    <!-- First arrow head -->
                    <path d="M ${x1} ${y1} L ${head1X1} ${head1Y1} M ${x1} ${y1} L ${head1X2} ${head1Y2}" 
                          stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>
                    
                    <!-- Second arrow head -->
                    <path d="M ${x2} ${y2} L ${head2X1} ${head2Y1} M ${x2} ${y2} L ${head2X2} ${head2Y2}" 
                          stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>
                </g>
            </svg>
        `

        const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`
        this.cursorCache.set(cacheKey, dataUrl)

        return dataUrl
    }

    static createCursor(deg: number, size: number = 24, color: string = '#000000'): string {
        const dataUrl = this.create(deg, size, color)
        const hotspotX = size / 2
        const hotspotY = size / 2
        return `url('${dataUrl}') ${hotspotX} ${hotspotY}, auto`
    }

    static createRotationCursor(deg: number = 0, size: number = 24, color: string = '#000000'): string {
        const cacheKey = `rotation-${deg}-${size}-${color}`

        if (this.cursorCache.has(cacheKey)) {
            return this.cursorCache.get(cacheKey)!
        }

        const normalizedDeg = ((deg % 360) + 360) % 360
        const rotationRadians = (normalizedDeg * Math.PI) / 180

        const centerX = size / 2
        const centerY = size / 2
        const radius = size * 0.35

        // Base arc parameters (120 degree arc)
        const baseStartAngle = -Math.PI / 3 // -60 degrees
        const baseEndAngle = Math.PI / 3 // 60 degrees

        // Apply rotation to the arc
        const startAngle = baseStartAngle + rotationRadians
        const endAngle = baseEndAngle + rotationRadians

        // Calculate arc start and end points
        const startX = centerX + Math.cos(startAngle) * radius
        const startY = centerY + Math.sin(startAngle) * radius
        const endX = centerX + Math.cos(endAngle) * radius
        const endY = centerY + Math.sin(endAngle) * radius

        // Arrow head size
        const arrowSize = size * 0.12

        // First arrow head (at start) - pointing clockwise
        const startTangentAngle = startAngle + Math.PI / 2
        const startArrowAngle1 = startTangentAngle - Math.PI / 6
        const startArrowAngle2 = startTangentAngle + Math.PI / 6

        const startArrowX1 = startX + Math.cos(startArrowAngle1) * arrowSize
        const startArrowY1 = startY + Math.sin(startArrowAngle1) * arrowSize
        const startArrowX2 = startX + Math.cos(startArrowAngle2) * arrowSize
        const startArrowY2 = startY + Math.sin(startArrowAngle2) * arrowSize

        // Second arrow head (at end) - pointing clockwise
        const endTangentAngle = endAngle + Math.PI / 2
        const endArrowAngle1 = endTangentAngle - Math.PI / 6
        const endArrowAngle2 = endTangentAngle + Math.PI / 6

        const endArrowX1 = endX + Math.cos(endArrowAngle1) * arrowSize
        const endArrowY1 = endY + Math.sin(endArrowAngle1) * arrowSize
        const endArrowX2 = endX + Math.cos(endArrowAngle2) * arrowSize
        const endArrowY2 = endY + Math.sin(endArrowAngle2) * arrowSize

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <defs>
                    <filter id="outline-rotation-${normalizedDeg}">
                        <feMorphology operator="dilate" radius="1"/>
                        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
                        <feComposite in="SourceGraphic" operator="over"/>
                    </filter>
                </defs>
                <g filter="url(#outline-rotation-${normalizedDeg})">
                    <!-- Rotation arc -->
                    <path d="M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}" 
                          stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
                    
                    <!-- Start arrow head -->
                    <path d="M ${startX} ${startY} L ${startArrowX1} ${startArrowY1} M ${startX} ${startY} L ${startArrowX2} ${startArrowY2}" 
                          stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>
                    
                    <!-- End arrow head -->
                    <path d="M ${endX} ${endY} L ${endArrowX1} ${endArrowY1} M ${endX} ${endY} L ${endArrowX2} ${endArrowY2}" 
                          stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>
                    
                    <!-- Center dot -->
                    <circle cx="${centerX}" cy="${centerY}" r="1" fill="${color}" opacity="0.7"/>
                </g>
            </svg>
        `

        const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`
        this.cursorCache.set(cacheKey, dataUrl)

        return dataUrl
    }

    static createRotationCursorCSS(deg: number = 0, size: number = 24, color: string = '#000000'): string {
        const dataUrl = this.createRotationCursor(deg, size, color)
        const hotspotX = size / 2
        const hotspotY = size / 2
        return `url('${dataUrl}') ${hotspotX} ${hotspotY}, auto`
    }
    /**
     * Clears the cursor cache
     */
    static clearCache(): void {
        this.cursorCache.clear()
    }
}

export default ResizeCursor
