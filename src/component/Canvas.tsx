import { useCallback, useEffect, useRef, useState } from "react"
import "./Component.css"
import ToolBar from "./ToolBar"

import CanvasKitInit from "canvaskit-wasm";
import canvasKitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import type { CanvasKit, Surface, Paint } from 'canvaskit-wasm';

// import { useCanvasResize } from "../hooks/useCanvasResize";

function Canvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const surfaceRef = useRef<Surface>(null)
    const paintRef = useRef<Paint>(null)
    const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null)


    useEffect(() => {
        CanvasKitInit({ locateFile: () => canvasKitWasmUrl }).then(setCanvasKit)
    }, [])

    useEffect(() => {
        console.log('hiii ijij ');
        
        if (!canvasKit || !canvasRef.current || !containerRef.current) return

        const canvasEl = canvasRef.current
        const dpr = window.devicePixelRatio || 1

        // init paint
        paintRef.current = new canvasKit.Paint()
        paintRef.current.setColor(canvasKit.RED)

        const makeSurface = () => {
            // delete old surface
            if(surfaceRef.current) {
                surfaceRef.current?.delete()
                surfaceRef.current = null
            }
            const surf = canvasKit.MakeWebGLCanvasSurface(canvasEl)
            if (!surf) throw new Error("Could not make surface")
            surfaceRef.current = surf
        }

        const draw = () => {
            const surf = surfaceRef.current!
            const sk = surf.getCanvas()
            sk.clear(canvasKit.TRANSPARENT)
            sk.drawRect(canvasKit.LTRBRect(10, 10, 100, 100), paintRef.current!)
            surf.flush()
        }

        const resize = () => {
            console.log("resizing");

            const { width, height } = getComputedStyle(canvasEl)
            console.log(width, height, 3096530);

            canvasEl.width = parseInt(width) * dpr
            canvasEl.height = parseInt(height) * dpr // set canvas height
            
            makeSurface()
            draw()
        }
        // set canvas size 
        window.addEventListener('resize', resize)

        // initial
        resize()

        return () => {
            // ro.disconnect()
            window.removeEventListener("resize", resize)
            if (paintRef.current) {
                paintRef.current?.delete()
                paintRef.current = null
            }
            if (surfaceRef.current) {
                surfaceRef.current?.delete()
                surfaceRef.current = null
            }
        }
    }, [canvasKit])

    // useCanvasResize(containerRef, canvasRef, resize);


    return (
        <div ref={containerRef} className={'canvasContainer'}>
            <canvas ref={canvasRef} className={'canvas'}>
                Your browser does not support the HTML5 canvas tag.
            </canvas>
            <div className={'overlay'}>
                <ToolBar />
            </div>
        </div>
    )
}

export default Canvas
