import { MousePointer2, Square, Type } from "lucide-react"
import "./Component.css"
import Button from "../ui/Button"

function ToolBar() {

    return (
        <div className={'toolbar'}>
            <Button tip={"Move"} icon={<MousePointer2 className={"w-4 h-4"} />} />
            <Button tip={"Square"} icon={<Square className={"w-4 h-4"} />} />
            <Button tip={"Text"} icon={<Type className={"w-4 h-4"} />} />
        </div>
    )
}

export default ToolBar
