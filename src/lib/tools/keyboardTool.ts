import { Coord } from "@lib/types/shapes";
import Tool from "./Tool";
import EventQueue, { EventTypes } from "@lib/core/EventQueue";
import { useSceneStore } from "@hooks/sceneStore";
import { useToolStore } from "@hooks/useTool";
import { isPrintableCharUnicode } from "@/util/textUtil";

const { } = EventTypes;

class KeyboardTool {
    private currentTool: Tool | null = null;

    constructor(tool: Tool) {
        this.currentTool = tool
    }
    setCurrentTool(tool: Tool) {
        this.currentTool = tool
    }
    handleKeyDown(e: KeyboardEvent) {
        console.log('keyboard');
        console.log('inside keybooard');
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelected(e.key);
                break;
            case 'Escape':
                this.handleEscape();
                break;
            case 'Tab':
                this.handleTab(e);
                break;
            case 'Enter':
                this.handleEnter(e);
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                this.handleArrowKeys(e);
                break;
            default:
                // Handle alphanumeric and other printable characters
                if (isPrintableCharUnicode(e.key)) {
                    this.handleTextKey(e)
                }
                break;
        }

    }
    handleKeyUp(e: KeyboardEvent) {

    }

    private handleTextKey(e: KeyboardEvent) {
        this.currentTool.handleTextKey(e)
    }
    private deleteSelected(key: string) {
        if (key == 'Delete') {

        } else if (key == 'Backspace') {

        }
    }
    private handleEscape() {

    }
    private handleTab(e: KeyboardEvent) {

    }
    private handleEnter(e: KeyboardEvent) {
        this.currentTool.handleEnter(e)
    }
    private handleArrowKeys(e: KeyboardEvent) {
        this.currentTool.handleArrowKeys(e)
    }

}

export default KeyboardTool;