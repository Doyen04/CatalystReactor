import type SceneManager from '@lib/core/SceneManager'
import type ShapeManager from '@lib/core/ShapeManager'
import type ShapeModifier from '@lib/modifiers/ShapeModifier'
import type { CommandManager } from '@/lib/engine/commands/CommandManager'
import type { ToolType } from './toolTypes'

export interface ToolContext {
    readonly defaultTool: ToolType
    readonly sceneManager: SceneManager
    readonly shapeManager: ShapeManager
    readonly shapeModifier: ShapeModifier | null
    readonly commandManager: CommandManager
    setTool(tool: ToolType): void
    setCursor(cursor: string): void
    requestRender(): void
}
