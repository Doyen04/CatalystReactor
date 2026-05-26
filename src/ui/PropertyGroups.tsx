import React, { ReactNode } from 'react'
import { GRID2X2 } from './Section'
import Input from './Input'
import { MoveHorizontal, MoveVertical, ArrowLeftRight, ArrowUpDown, RotateCw, Maximize, Target } from 'lucide-react'

interface PropertyGroupProps {
    title: string
    children: ReactNode
}

export const TransformGroup: React.FC<{
    x: number,
    y: number,
    onChange: (key: 'x' | 'y', value: number) => void
}> = ({ x, y, onChange }) => (
    <GRID2X2 title="Position">
        <Input type="number" icon={<MoveHorizontal />} value={x} onChange={v => onChange('x', v)} />
        <Input type="number" icon={<MoveVertical />} value={y} onChange={v => onChange('y', v)} />
    </GRID2X2>
)

export const DimensionGroup: React.FC<{
    width: number,
    height: number,
    onChange: (key: 'width' | 'height', value: number) => void
}> = ({ width, height, onChange }) => (
    <GRID2X2 title="Size">
        <Input type="number" icon={<ArrowLeftRight />} value={width} onChange={v => onChange('width', v)} />
        <Input type="number" icon={<ArrowUpDown />} value={height} onChange={v => onChange('height', v)} />
    </GRID2X2>
)

export const RotationScaleGroup: React.FC<{
    rotation?: number,
    scaleX?: number,
    scaleY?: number,
    onChange: (key: string, value: number) => void
}> = ({ rotation, scaleX, scaleY, onChange }) => (
    <GRID2X2 title="Rotation / Scale">
        {rotation !== undefined && <Input type="number" icon={<RotateCw />} value={rotation} onChange={v => onChange('rotation', v)} />}
        {scaleX !== undefined && <Input type="number" icon={<Maximize />} value={scaleX} onChange={v => onChange('scaleX', v)} />}
    </GRID2X2>
)

export const AnchorGroup: React.FC<{
    x: number,
    y: number,
    onChange: (key: 'x' | 'y', value: number) => void
}> = ({ x, y, onChange }) => (
    <GRID2X2 title="Anchor Point">
        <Input type="number" icon={<Target />} value={x} onChange={v => onChange('x', v)} />
        <Input type="number" icon={<Target />} value={y} onChange={v => onChange('y', v)} />
    </GRID2X2>
)
