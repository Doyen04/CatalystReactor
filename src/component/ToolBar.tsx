import { Triangle, Lasso, Maximize2, MousePointer2, Square, Star, Type, Circle, Image } from "lucide-react"
import "./Component.css"
import Button from "../ui/Button"

function ToolBar() {

    const SelectTools = [
        {
            toolName: 'select',
            icon: <MousePointer2 className={"w-4 h-4"} />,
            tip: 'Select'
        },
        {
            toolName: 'freeform',
            icon: <Lasso className={"w-4 h-4"} />,
            tip: 'Freeform'
        },
        {
            toolName: "scale",
            icon: <Maximize2 className={"w-4 h-4"} />,
            tip: 'Scale'
        }
    ];
    const ShapeTools = [
        {
            toolName: 'rect',
            icon: <Square className={"w-4 h-4"} />,
            tip: 'Rect'
        },
        {
            toolName: 'oval',
            icon: <Circle className={"w-4 h-4"} />,
            tip: 'Circle'
        },
        {
            toolName: 'polygon',
            icon: <Triangle className={"w-4 h-4"} />,
            tip: 'Polygon'
        },
        {
            toolName: 'star',
            icon: <Star className={"w-4 h-4"} />,
            tip: 'Star'
        },
        {
            toolName: 'img',
            icon: <Image className={"w-4 h-4"} />,
            tip: 'Image'
        }
    ];
    return (
        <div className={'toolbar'}>
            <Button toolname={'select'} moreTools={SelectTools} moreToolsTips={"Select Tools"} />
            <Button toolname={'rect'} moreTools={ShapeTools} moreToolsTips={"Draw tools"} />
            <Button tip={"Text"} toolname={'text'} icon={<Type className={"w-4 h-4"} />} />
        </div>
    )
}

export default ToolBar
