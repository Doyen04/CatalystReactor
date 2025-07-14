import { useEffect, useRef, useState } from "react"
import "./Component.css"
import ToolBar from "./ToolBar"

import CanvasKitInit from "canvaskit-wasm";
import canvasKitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import type { CanvasKit } from 'canvaskit-wasm';

import { CanvasKitResources, CanvasManager } from "@/lib/core";
import { useToolStore } from "@hooks/useTool";

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasManagerRef = useRef<CanvasManager>(null)
    const canvasResourcesRef = useRef<CanvasKitResources>(null)
    const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null)
    const { tool } = useToolStore()


    useEffect(() => {
        CanvasKitInit({ locateFile: () => canvasKitWasmUrl })
            .then((ck) => {
                setCanvasKit(ck);
            })
            .catch((error) => {
                console.error("Failed to load CanvasKit:", error);
            });
    }, [])

    useEffect(() => {
        console.log('CanvasKit loaded:', canvasKit);

        if (!canvasKit) return;
        let isCancelled = false
        const cleanupExisting = () => {
            if (canvasManagerRef.current) {
                canvasManagerRef.current.removeEventListener();
                canvasManagerRef.current = null;
            }
            if (canvasResourcesRef.current) {
                canvasResourcesRef.current.dispose();
                canvasResourcesRef.current = null;
            }
        };

        const load = async () => {
            console.log('starting to load refs');
            cleanupExisting()
            await CanvasKitResources.loadInterFont()
            if (isCancelled) return

            canvasResourcesRef.current = CanvasKitResources.initialize(canvasKit)
            canvasManagerRef.current = new CanvasManager(canvasRef.current);
            console.log('Initializing Canvasmnager with CasKit');
        }

        load()
        return () => {
            console.log('clean up');
            isCancelled = true
           cleanupExisting()
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
                <ToolBar />
            </div>
        </div>
    )
}


export default Canvas
