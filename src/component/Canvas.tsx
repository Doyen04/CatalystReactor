import { useEffect, useRef, useState } from "react"
import style from "./Component.module.css"
import ToolBar from "./ToolBar"

import CanvasKitInit from "canvaskit-wasm";
import canvasKitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import type { CanvasKit } from 'canvaskit-wasm';

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null)

    useEffect(() => {
        async function initCanvasKit() {

            const kit = await CanvasKitInit({
                locateFile: () => canvasKitWasmUrl 
        });
            setCanvasKit(kit);
        }
        initCanvasKit();
    }, [])

    useEffect(() => {
        if (canvasKit && canvasRef.current) {
            const surface = canvasKit.MakeWebGLCanvasSurface(canvasRef.current)
            if (!surface) {
                console.error('Could not make surface')
                return
            }

            const canvas = surface.getCanvas()
            // Your drawing code here
            const paint = new canvasKit.Paint()
            paint.setColor(canvasKit.RED)
            canvas.drawRect(canvasKit.LTRBRect(10, 10, 100, 100), paint)
            surface.flush()

            return () => {
                paint.delete()
                surface.delete()
            }
        }
    }, [canvasKit])

    return (
        <div className={style.canvasContainer}>
            <canvas ref={canvasRef} className={style.canvas}>
                Your browser does not support the HTML5 canvas tag.
            </canvas>
            <div className={style.overlay}>
                <ToolBar />
            </div>
        </div>
    )
}

export default Canvas
