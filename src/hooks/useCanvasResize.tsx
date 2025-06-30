import { useEffect } from "react";
import type { RefObject } from "react";

export function useCanvasResize(
    containerRef: RefObject<HTMLElement | null>,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    adjust: () => void
) {
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!(container && canvas)) return;

        const observer = new ResizeObserver(adjust);

        observer.observe(container, { box: "content-box" });
        return () => observer.disconnect();

    }, [containerRef, canvasRef, adjust]);
}
