import { Triangle, Lasso, Maximize2, MousePointer2, Square, Star, Type, Circle, Image } from 'lucide-react'
import './Component.css'
import Button from '../ui/Button'
import MoreButton from '@ui/MoreButton'
import { useToolStore } from '@hooks/useTool'

function ToolBar() {
    const SelectTools = [
        {
            toolName: 'select',
            icon: <MousePointer2 className={'w-4 h-4'} />,
            tip: 'Select',
        },
        {
            toolName: 'freeform',
            icon: <Lasso className={'w-4 h-4'} />,
            tip: 'Freeform',
        },
        {
            toolName: 'scale',
            icon: <Maximize2 className={'w-4 h-4'} />,
            tip: 'Scale',
        },
    ]

    const ShapeTools = [
        {
            toolName: 'rect',
            icon: <Square className={'w-4 h-4'} />,
            tip: 'Rect',
        },
        {
            toolName: 'oval',
            icon: <Circle className={'w-4 h-4'} />,
            tip: 'Circle',
        },
        {
            toolName: 'polygon',
            icon: <Triangle className={'w-4 h-4'} />,
            tip: 'Polygon',
        },
        {
            toolName: 'star',
            icon: <Star className={'w-4 h-4'} />,
            tip: 'Star',
        },
        {
            toolName: 'img',
            icon: <Image className={'w-4 h-4'} />,
            tip: 'Image',
        },
    ]

    const TextTool = {
        toolName: 'text',
        icon: <Type className={'w-4 h-4'} />,
        tip: 'Text',
    }

    const { setTool, tool: currentTool } = useToolStore()
    if (!currentTool) {
        setTool(SelectTools[0], 'select')
    }

    return (
        <div className={'toolbar'}>
            <Button tool={SelectTools[0]} group={SelectTools} groupId='select'/>
            <MoreButton tools={SelectTools} tip={'SelectTools'} groupId='select'/>
            <Button tool={ShapeTools[0]} group={ShapeTools} groupId='shape'/>
            <MoreButton tools={ShapeTools} tip={'ShapeTools'} groupId='shape'/>
            <Button tool={TextTool} group={[TextTool]} groupId='text'/>
        </div>
    )
}

export default ToolBar
