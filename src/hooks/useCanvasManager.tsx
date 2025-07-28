import { create } from "zustand";
import type CanvasManager from "@lib/core/CanvasManager";
import ShapeManager from "@lib/core/ShapeManager";

type CanvasManagerState = {
    canvasManager: CanvasManager | null;
    shapeManager: ShapeManager | null;
    setCanvasManager: (manager: CanvasManager | null) => void;
};

export const useCanvasManagerStore = create<CanvasManagerState>((set) => ({
    canvasManager: null,
    shapeManager: null,
    setCanvasManager: (manager) => set({
        canvasManager: manager,
        shapeManager: manager.shapeManager ?? null
    }),
}));