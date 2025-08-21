import {
    Triangle,
    Lasso,
    Maximize2,
    MousePointer2,
    Square,
    Star,
    Type,
    Circle,
    Image,
} from 'lucide-react'
import './Component.css'
import Button from '../ui/Button'
import MoreButton from '@ui/MoreButton'
import { useToolStore } from '@hooks/useTool'
import { useEffect, useRef } from 'react'
import { useFilePicker } from '@hooks/useFileOpener'
import { useImageStore } from '@hooks/imageStore'
import { loadImage } from '@/util/loadFile'

function ToolBar() {
    const { openFilePicker } = useFilePicker({
        accept: 'image/*',
        multiple: true,
        onFileSelect: file => handleFileSelect(file),
    })
    const { setSelectedImage } = useImageStore()

    const handleFileSelect = async (files: FileList) => {
        if (files && files.length > 0) {
            const urlList = Array.from(files).map(file =>
                URL.createObjectURL(file)
            )
            const images = await loadImage(urlList)
            console.log(images, 'images')

            urlList.forEach(url => URL.revokeObjectURL(url))
            setSelectedImage(images)
        }
    }

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
        setTool(SelectTools[0])
    }

    const isOpen = useRef(false)

    useEffect(() => {
        if (currentTool?.toolName === 'img' && !isOpen.current) {
            console.log('open file picker')
            isOpen.current = true
            openFilePicker()
        }
        if (currentTool?.toolName !== 'img') {
            isOpen.current = false
        }
    }, [currentTool?.toolName, openFilePicker])

    return (
        <div className={'toolbar'}>
            <Button tool={SelectTools[0]} group={SelectTools} />
            <MoreButton tools={SelectTools} tip={'SelectTools'} />
            <Button tool={ShapeTools[0]} group={ShapeTools} />
            <MoreButton tools={ShapeTools} tip={'ShapeTools'} />
            <Button tool={TextTool} group={[TextTool]} />
        </div>
    )
}

export default ToolBar
