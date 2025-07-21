import { useEffect, useRef } from "react"
import "./Component.css"
import ToolBar from "./ToolBar"

import CanvasKitInit from "canvaskit-wasm";
import canvasKitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';

import { CanvasKitResources} from "@/lib/core/CanvasKitResource";
import CanvasManager from "@lib/core/CanvasManager";

import { useToolStore } from "@hooks/useTool";

function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasManagerRef = useRef<CanvasManager>(null)
    const canvasResourcesRef = useRef<CanvasKitResources>(null)
    // const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null)
    const { tool } = useToolStore()

    useEffect(() => {

        const cleanupExisting = () => {console.log('doing clean up');
        
            if (canvasManagerRef.current) {
                canvasManagerRef.current.destroy();
                canvasManagerRef.current = null;
            }
            if (canvasResourcesRef.current) {
                canvasResourcesRef.current.dispose();
                canvasResourcesRef.current = null;
            }
        };

        const load = async () => {
            try {
                console.log('starting to load refs');
                cleanupExisting()

                const canvasKit = await CanvasKitInit({ locateFile: () => canvasKitWasmUrl })

                await CanvasKitResources.loadInterFont()
                //why do this line downward run twice withut running cleanupexisting first
                if (canvasResourcesRef.current || canvasManagerRef.current) return
                
                canvasResourcesRef.current = CanvasKitResources.initialize(canvasKit)
                canvasManagerRef.current = new CanvasManager(canvasRef.current);
                console.log('Initializing Canvasmanager with CanvasKit');
            } catch (error) {
                console.log(error);
            }
        }

        load()
        return () => {
            console.log('clean up');
            cleanupExisting()
        }
    }, [canvasRef]);

    useEffect(() => {
        if (!canvasManagerRef.current) return;
        canvasManagerRef.current.setTool(tool.toolName);
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
