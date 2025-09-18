import Shape from '@lib/shapes/base/Shape'
import { FlexLayout, GridLayout, LayoutConstraints } from './nodeTypes'
import SceneNode from './Scene'

export function applyRowLayout(shape: Shape, children: SceneNode[], layoutConstraints: LayoutConstraints): void {
    const { padding, mainAlign = 'start', crossAlign = 'start', gap = 0 } = layoutConstraints as FlexLayout

    let currentX = padding?.left || 0
    const containerBounds = shape.getDim()
    const containerHeight = containerBounds.height
    const containerWidth = containerBounds.width

    // Calculate total width of all children
    const totalChildrenWidth = children.reduce((sum, child, index) => {
        if (!child.hasShape()) return sum
        return sum + child.getDim().width + (index > 0 ? gap : 0)
    }, 0)

    const availableWidth = containerWidth - (padding?.left || 0) - (padding?.right || 0)

    // Calculate starting X position based on mainAlign (main axis = horizontal for row)
    switch (mainAlign) {
        case 'center':
            currentX = (padding?.left || 0) + (availableWidth - totalChildrenWidth) / 2
            break
        case 'end':
            currentX = containerWidth - (padding?.right || 0) - totalChildrenWidth
            break
        case 'space-between':
            currentX = padding?.left || 0
            break
        case 'space-around': {
            const spaceAround = (availableWidth - totalChildrenWidth) / (children.length * 2)
            currentX = (padding?.left || 0) + spaceAround
            break
        }
        case 'space-evenly': {
            const spaceEvenly = (availableWidth - totalChildrenWidth) / (children.length + 1)
            currentX = (padding?.left || 0) + spaceEvenly
            break
        }
        case 'start':
        default:
            currentX = padding?.left || 0
            break
    }

    children.forEach((child, index) => {
        if (!child.hasShape()) return

        const childBounds = child.getDim()
        let yPos: number

        // Calculate Y position based on crossAlign (cross axis = vertical for row)
        switch (crossAlign) {
            case 'center':
                yPos = (containerHeight - childBounds.height) / 2
                break
            case 'end':
                yPos = containerHeight - childBounds.height - (padding?.bottom || 0)
                break
            case 'stretch':
                yPos = padding?.top || 0
                child.setDimension(childBounds.width, containerHeight - (padding?.top || 0) - (padding?.bottom || 0))
                break
            case 'start':
            default:
                yPos = padding?.top || 0
                break
        }

        // Set child position
        child.setPosition(currentX, yPos)

        // Calculate next X position based on mainAlign
        if (mainAlign === 'space-between' && children.length > 1) {
            const spaceBetween = (availableWidth - totalChildrenWidth) / (children.length - 1)
            currentX += childBounds.width + spaceBetween
        } else if (mainAlign === 'space-around') {
            const spaceAround = (availableWidth - totalChildrenWidth) / (children.length * 2)
            currentX += childBounds.width + spaceAround * 2
        } else if (mainAlign === 'space-evenly') {
            const spaceEvenly = (availableWidth - totalChildrenWidth) / (children.length + 1)
            currentX += childBounds.width + spaceEvenly
        } else {
            // For start, center, end - use regular gap
            currentX += childBounds.width + (index < children.length - 1 ? gap : 0)
        }
    })

    // Auto-resize container width if needed (only for start alignment)
    if (mainAlign === 'start') {
        const totalWidth = totalChildrenWidth + (padding?.left || 0) + (padding?.right || 0)

        if (totalWidth > containerBounds.width) {
            shape.setDim(totalWidth, containerBounds.height)
        }
    }
}

export function applyColumnLayout(shape: Shape, children: SceneNode[], layoutConstraints: LayoutConstraints): void {
    const { padding, mainAlign = 'start', crossAlign = 'start', gap = 0 } = layoutConstraints as FlexLayout

    let currentY = padding?.top || 0
    const containerBounds = shape.getDim()
    const containerHeight = containerBounds.height
    const containerWidth = containerBounds.width

    // Calculate total height of all children
    const totalChildrenHeight = children.reduce((sum, child, index) => {
        if (!child.hasShape()) return sum
        return sum + child.getDim().height + (index > 0 ? gap : 0)
    }, 0)

    const availableHeight = containerHeight - (padding?.top || 0) - (padding?.bottom || 0)

    // Calculate starting Y position based on mainAlign (main axis = vertical for column)
    switch (mainAlign) {
        case 'center':
            currentY = (padding?.top || 0) + (availableHeight - totalChildrenHeight) / 2
            break
        case 'end':
            currentY = containerHeight - (padding?.bottom || 0) - totalChildrenHeight
            break
        case 'space-between':
            currentY = padding?.top || 0
            break
        case 'space-around': {
            const spaceAround = (availableHeight - totalChildrenHeight) / (children.length * 2)
            currentY = (padding?.top || 0) + spaceAround
            break
        }
        case 'space-evenly': {
            const spaceEvenly = (availableHeight - totalChildrenHeight) / (children.length + 1)
            currentY = (padding?.top || 0) + spaceEvenly
            break
        }
        case 'start':
        default:
            currentY = padding?.top || 0
            break
    }

    children.forEach((child, index) => {
        if (!child.hasShape()) return

        const childBounds = child.getDim()
        let xPos: number

        // Calculate X position based on crossAlign (cross axis = horizontal for column)
        switch (crossAlign) {
            case 'center':
                xPos = (containerWidth - childBounds.width) / 2
                break
            case 'end':
                xPos = containerWidth - childBounds.width - (padding?.right || 0)
                break
            case 'stretch':
                xPos = padding?.left || 0
                child.setDimension(containerWidth - (padding?.left || 0) - (padding?.right || 0), childBounds.height)
                break
            case 'start':
            default:
                xPos = padding?.left || 0
                break
        }

        // Set child position
        child.setPosition(xPos, currentY)

        // Calculate next Y position based on mainAlign
        if (mainAlign === 'space-between' && children.length > 1) {
            const spaceBetween = (availableHeight - totalChildrenHeight) / (children.length - 1)
            currentY += childBounds.height + spaceBetween
        } else if (mainAlign === 'space-around') {
            const spaceAround = (availableHeight - totalChildrenHeight) / (children.length * 2)
            currentY += childBounds.height + spaceAround * 2
        } else if (mainAlign === 'space-evenly') {
            const spaceEvenly = (availableHeight - totalChildrenHeight) / (children.length + 1)
            currentY += childBounds.height + spaceEvenly
        } else {
            // For start, center, end - use regular gap
            currentY += childBounds.height + (index < children.length - 1 ? gap : 0)
        }
    })

    // Auto-resize container height if needed (only for start alignment)
    if (mainAlign === 'start') {
        const totalHeight = totalChildrenHeight + (padding?.top || 0) + (padding?.bottom || 0)

        if (totalHeight > containerBounds.height) {
            shape.setDim(containerBounds.width, totalHeight)
        }
    }
}

export function applyGridLayout(shape: Shape, children: SceneNode[], layoutConstraints: LayoutConstraints): void {
    const {
        padding,
        gridRowGap = 10,
        gridColumnGap = 10,
        gridTemplateColumns = 'auto',
        gridTemplateRows = 'auto',
        gridAutoFlow = 'row',
    } = layoutConstraints as GridLayout

    const containerBounds = shape.getDim()
    const availableWidth = containerBounds.width - (padding?.left || 0) - (padding?.right || 0)
    const availableHeight = containerBounds.height - (padding?.top || 0) - (padding?.bottom || 0)

    // Determine grid dimensions
    let columns: number
    let rows: number

    if (typeof gridTemplateColumns === 'number') {
        columns = gridTemplateColumns
    } else if (Array.isArray(gridTemplateColumns)) {
        columns = gridTemplateColumns.length
    } else {
        // Auto-calculate columns based on children count
        columns = Math.ceil(Math.sqrt(children.length))
    }

    if (typeof gridTemplateRows === 'number') {
        rows = gridTemplateRows
    } else if (Array.isArray(gridTemplateRows)) {
        rows = gridTemplateRows.length
    } else {
        // Auto-calculate rows based on children count and columns
        rows = Math.ceil(children.length / columns)
    }

    // Calculate cell dimensions
    const cellWidth = (availableWidth - (columns - 1) * gridColumnGap) / columns
    const cellHeight = (availableHeight - (rows - 1) * gridRowGap) / rows

    // Position children in grid
    children.forEach((child, index) => {
        if (!child.hasShape()) return

        let col: number
        let row: number

        if (gridAutoFlow === 'column') {
            // Fill columns first
            col = Math.floor(index / rows)
            row = index % rows
        } else {
            // Fill rows first (default)
            col = index % columns
            row = Math.floor(index / columns)
        }

        // Calculate position
        const x = (padding?.left || 0) + col * (cellWidth + gridColumnGap)
        const y = (padding?.top || 0) + row * (cellHeight + gridRowGap)

        // Set child position and size
        child.setPosition(x, y)

        // Optionally resize child to fit cell (stretch behavior)
        const childBounds = child.getDim()
        if (childBounds.width > cellWidth || childBounds.height > cellHeight) {
            child.setDimension(Math.min(childBounds.width, cellWidth), Math.min(childBounds.height, cellHeight))
        }
    })

    // Auto-resize container if needed
    const requiredWidth = columns * cellWidth + (columns - 1) * gridColumnGap + (padding?.left || 0) + (padding?.right || 0)
    const requiredHeight = rows * cellHeight + (rows - 1) * gridRowGap + (padding?.top || 0) + (padding?.bottom || 0)

    if (requiredWidth > containerBounds.width || requiredHeight > containerBounds.height) {
        shape.setDim(Math.max(containerBounds.width, requiredWidth), Math.max(containerBounds.height, requiredHeight))
    }
}