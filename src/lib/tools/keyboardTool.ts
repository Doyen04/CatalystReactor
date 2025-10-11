import { isPrintableCharUnicode } from '@/util/textUtil'
import ShapeManager from '@lib/core/ShapeManager'
import SceneNode from '@lib/node/Scene'

class KeyboardTool {
    private shapeManager: ShapeManager | null = null

    constructor(shapeManager: ShapeManager) {
        this.shapeManager = shapeManager
    }
    setCurrentTool(shapeManager: ShapeManager) {
        this.shapeManager = shapeManager
    }
    handleKeyDown(e: KeyboardEvent) {

        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelected(e)
                break
            case 'Escape':
                this.handleEscape()
                break
            case 'Tab':
                this.handleTab(e)
                break
            case 'Enter':
                this.handleEnter(e)
                break
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                this.handleArrowKeys(e)
                break
            default:
                // Handle alphanumeric and other printable characters
                if (isPrintableCharUnicode(e.key)) {
                    this.handleTextKey(e)
                }
                break
        }
    }

    handleKeyUp(e: KeyboardEvent) {
        // console.log(e, 'keyup')
    }

    private handleTextKey(e: KeyboardEvent) {
        if (this.shapeManager.hasScene()) {
            const scene = this.shapeManager.currentScene

            if (scene.canEdit()) {
                scene.insertText(e.key, e.shiftKey)
            }
        }
    }
    private deleteSelected(e: KeyboardEvent) {
        if (this.shapeManager.hasScene()) {
            const scene = this.shapeManager.currentScene

            if (scene.canEdit()) {
                switch (e.key) {
                    case 'Delete':
                        scene.deleteText('forward')
                        break
                    case 'Backspace':
                        scene.deleteText('backward')
                        break
                    default:
                        console.log('delete direction not implemented')
                        break
                }
            } else {
                console.log('rrrrr', 'deleting')
            }
        }
    }
    private handleEscape() {}

    private handleTab(e: KeyboardEvent) {
        console.log(e)
    }
    private handleEnter(e: KeyboardEvent) {
        if (this.shapeManager.hasScene()) {
            const scene = this.shapeManager.currentScene

            if (scene.canEdit()) {
                scene.insertText('\n', e.shiftKey)
            }
        }
    }
    private handleArrowKeys(e: KeyboardEvent) {
        if (this.shapeManager.hasScene()) {
            const scene = this.shapeManager.currentScene

            if (scene.canEdit()) {
                this.moveTextCursor(e, scene)
            } else {
                this.moveCurrentShape(e)
            }
        }
    }

    moveTextCursor(e: KeyboardEvent, scene: SceneNode) {
        if (scene) {
            switch (e.key) {
                case 'ArrowUp':
                    scene.moveCursor('up', e.shiftKey)
                    break
                case 'ArrowDown':
                    scene.moveCursor('down', e.shiftKey)
                    break
                case 'ArrowLeft':
                    scene.moveCursor('left', e.shiftKey)
                    break
                case 'ArrowRight':
                    scene.moveCursor('right', e.shiftKey)
                    break
                default:
                    console.log('direction not implemented')
                    break
            }
        }
    }

    moveCurrentShape(e: KeyboardEvent): void {
        console.log(e.key)
        switch (e.key) {
            case 'ArrowUp':
                this.shapeManager.moveScene(0, -2)
                break
            case 'ArrowDown':
                this.shapeManager.moveScene(0, 2)
                break
            case 'ArrowLeft':
                this.shapeManager.moveScene(-2, 0)
                break
            case 'ArrowRight':
                this.shapeManager.moveScene(2, 0)
                break
            default:
                console.log('direction not implemented')
                break
        }
    }
}

export default KeyboardTool
