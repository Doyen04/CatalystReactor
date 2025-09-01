import { HandlePos } from "@lib/types/shapes"

export function getOppositeHandle(pos: HandlePos) {
        const map = {
            'top-left': 'bottom-right',
            'top-right': 'bottom-left',
            'bottom-left': 'top-right',
            'bottom-right': 'top-left',
            top: 'bottom',
            bottom: 'top',
            left: 'right',
            right: 'left',
        }
        return map[pos] || 'bottom-right'
    }

export function getHandleLocalPoint(pos: HandlePos, width: number, height: number) {
        switch (pos) {
            case 'top-left':
                return { x: 0, y: 0 }
            case 'top-right':
                return { x: width, y: 0 }
            case 'bottom-left':
                return { x: 0, y: height }
            case 'bottom-right':
                return { x: width, y: height }
            case 'top':
                return { x: width / 2, y: 0 }
            case 'bottom':
                return { x: width / 2, y: height }
            case 'left':
                return { x: 0, y: height / 2 }
            case 'right':
                return { x: width, y: height / 2 }
            default:
                return { x: width, y: height }
        }
    }


