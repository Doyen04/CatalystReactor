import { MousePointer2, Square, Type } from "lucide-react"
import "./Component.css"
import Button from "../ui/Button"

interface ToolBarProps {
    currentTool: string;
    setTool: (tool: string) => void;
}

function ToolBar({ currentTool, setTool }: ToolBarProps) {

    const handleToolClick = (tool: string) => {
        setTool(tool);
        console.log(`Current tool set to: ${tool}`);
    }
    return (
        <div className={'toolbar'}>
            <Button tip={"Move"} icon={<MousePointer2 className={"w-4 h-4"} />} onClick={() => handleToolClick('move')} />
            <Button tip={"Square"} icon={<Square className={"w-4 h-4"} />} onClick={() => handleToolClick('square')} />
            <Button tip={"Text"} icon={<Type className={"w-4 h-4"} />} onClick={() => handleToolClick('text')} />
        </div>
    )
}

export default ToolBar
