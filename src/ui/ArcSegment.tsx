import * as React from 'react'

type IconProps = React.SVGProps<SVGSVGElement> & {
    centerX?: number // defaults to 0 (viewBox-centered)
    centerY?: number
    radiusX?: number
    radiusY?: number
    ratio: number // 0–1
    startAngle: number // in radians
    endAngle: number // in radians
    color?: string
    strokeWidth?: number
}

export const AngleIcon = React.forwardRef<SVGSVGElement, IconProps>(
    (
        {
            centerX = 0,
            centerY = 0,
            radiusX = 7,
            radiusY = 7,
            ratio,
            startAngle,
            endAngle,
            color = 'currentColor',
            strokeWidth = 2,
            width,
            height,
            ...props
        },
        ref
    ) => {
        const safeRatio = Math.max(0, Math.min(1, ratio))
        const sweepAngle = (endAngle - startAngle) * safeRatio
        const startDegrees = (startAngle * 180) / Math.PI
        const sweepDegrees = (sweepAngle * 180) / Math.PI

        const sin = Math.sin
        const cos = Math.cos

        const innerStart = {
            x: centerX + radiusX * safeRatio * cos(startAngle),
            y: centerY + radiusY * safeRatio * sin(startAngle),
        }

        const outerEnd = {
            x: centerX + radiusX * cos(startAngle + sweepAngle),
            y: centerY + radiusY * sin(startAngle + sweepAngle),
        }

        // Build path equivalent to your drawComplexTorusArc
        const d = [
            `M ${innerStart.x},${innerStart.y}`,
            `A ${radiusX * safeRatio},${radiusY * safeRatio} 0 ${Math.abs(sweepAngle) > Math.PI ? 1 : 0} ${sweepAngle >= 0 ? 1 : 0} ${
                innerStart.x + (outerEnd.x - innerStart.x)
            },${innerStart.y + (outerEnd.y - innerStart.y)}`,
            `L ${outerEnd.x},${outerEnd.y}`,
            `A ${radiusX},${radiusY} 0 ${Math.abs(sweepAngle) > Math.PI ? 1 : 0} ${sweepAngle >= 0 ? 1 : 0} ${
                centerX + radiusX * cos(startAngle)
            },${centerY + radiusY * sin(startAngle)}`,
            'Z',
        ].join(' ')

        const vb = [centerX - radiusX - strokeWidth, centerY - radiusY - strokeWidth, 2 * (radiusX + strokeWidth), 2 * (radiusY + strokeWidth)].join(
            ' '
        )

        return (
            <svg
                ref={ref}
                width={width ?? radiusX * 2 + strokeWidth * 2}
                height={height ?? radiusY * 2 + strokeWidth * 2}
                viewBox={vb}
                fill={color}
                stroke="none"
                {...props}
            >
                <path d={d} fillRule="evenodd" />
            </svg>
        )
    }
)

AngleIcon.displayName = 'angleIcon'
