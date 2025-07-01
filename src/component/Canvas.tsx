import { useEffect, useRef, useState } from "react"
import "./Component.css"
import ToolBar from "./ToolBar"

import CanvasKitInit from "canvaskit-wasm";
import canvasKitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import type { CanvasKit } from 'canvaskit-wasm';

import CanvasManager from "../lib/CanvasManager";

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasManagerRef = useRef<CanvasManager>(null)
    const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null)
    const [tool, setTool] = useState('select')


    useEffect(() => {
        CanvasKitInit({ locateFile: () => canvasKitWasmUrl }).then(setCanvasKit)
    }, [])

    useEffect(() => {
        console.log('CanvasKit loaded:', canvasKit);

        if (!canvasRef.current || !canvasKit) return;

        // Clean up previous instance
        if (canvasManagerRef.current) {
            canvasManagerRef.current.removeEventListener();
        }

        canvasManagerRef.current = new CanvasManager(canvasRef.current, canvasKit);
        console.log('Initializing CanvasManager with CanvasKit');

        return () => {
            if (canvasManagerRef.current) {
                canvasManagerRef.current.removeEventListener();
                canvasManagerRef.current = null;
            }
        }
    }, [canvasKit]);

    useEffect(() => {
        if (!canvasManagerRef.current) return;
        canvasManagerRef.current.setTool(tool);
    }, [tool]);

    return (
        <div className={'canvasContainer'}>
            <canvas ref={canvasRef} className={'canvas'}>
                Your browser does not support the HTML5 canvas tag.
            </canvas>
            <div className={'overlay'}>
                <ToolBar currentTool={tool} setTool={setTool} />
            </div>
        </div>
    )
}


export default Canvas
