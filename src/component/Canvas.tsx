import { useEffect, useRef } from 'react'
import './Component.css'
import ToolBar from './ToolBar'

import CanvasKitInit from 'canvaskit-wasm'
import canvasKitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url'

import { CanvasKitResources } from '@/lib/core/CanvasKitResource'
import { textCache } from '@/engine/render/TextCache'
import { registerResourceCounter, unregisterResourceCounter, startResourceCounterMonitor } from '@/engine/render/ResourceCounter'

import { useToolStore } from '@hooks/useTool'
import { useCanvasManagerStore } from '@hooks/useCanvasManagerStore'
import { useSceneStore } from '@hooks/sceneStore'
import { connectEngineToStores } from '@/bridge/engineStoreBridge'
import { useEditor } from '@/bridge/useEditor'

let ckPromise: Promise<unknown> | null = null
function ensureCanvasKit(): Promise<unknown> {
    if (!ckPromise) {
        ckPromise = (async () => {
            const canvasKit = await CanvasKitInit({ locateFile: () => canvasKitWasmUrl })
            await CanvasKitResources.loadInterFont()
            CanvasKitResources.initialize(canvasKit)
            return canvasKit
        })().catch(err => {
            ckPromise = null
            throw err
        })
    }
    return ckPromise
}

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const stopMonitorRef = useRef<(() => void) | null>(null)
    const { setCanvasManager } = useCanvasManagerStore()
    const { tool } = useToolStore()
    const { gridSize } = useSceneStore()
    const editor = useEditor()

    useEffect(() => {
        if (!editor) return
        let cancelled = false

        const load = async () => {
            try {
                await ensureCanvasKit()
                if (cancelled) return
                if (!editor.isAttached() && canvasRef.current) {
                    const manager = editor.attach(canvasRef.current)
                    setCanvasManager(manager)
                    manager.setTool(useToolStore.getState().tool?.toolName ?? 'select')
                    manager.setGridSize(useSceneStore.getState().gridSize)
                    registerResourceCounter('paragraphs', textCache)
                    stopMonitorRef.current = startResourceCounterMonitor()
                }
            } catch (error) {
                console.log(error, 'error loading canvaskit')
            }
        }

        load()

        return () => {
            cancelled = true
            if (stopMonitorRef.current) {
                stopMonitorRef.current()
                stopMonitorRef.current = null
            }
            unregisterResourceCounter('paragraphs')
            setCanvasManager(null)
            if (editor) editor.detach()
        }
    }, [canvasRef, editor, setCanvasManager])

    useEffect(() => {
        if (!editor) return
        editor.setTool(tool?.toolName ?? 'select')
    }, [editor, tool])

    useEffect(() => {
        if (!editor) return
        return connectEngineToStores(editor.bus)
    }, [editor])

    useEffect(() => {
        if (!editor) return
        editor.setGridSize(gridSize)
    }, [editor, gridSize])

    return (
        <div className={'canvasContainer'}>
            <canvas ref={canvasRef} className={'canvas'} tabIndex={0}>
                Your browser does not support the HTML5 canvas tag.
            </canvas>
            <div className={'overlay'}>
                <ToolBar />
            </div>
        </div>
    )
}

export default Canvas
