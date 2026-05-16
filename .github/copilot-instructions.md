# CatalystReactor – Copilot Instructions

## Architecture & Flow
- React shell (`src/App.tsx`) only mounts `SideBar`, `Canvas`, and `PropertyBar`; the real editor state lives in the CanvasKit core under `src/lib`.
- `Canvas.tsx` lazy-loads `canvaskit-wasm`, calls `CanvasKitResources.loadInterFont()`/`initialize()`, then instantiates `CanvasManager` once the `<canvas>` ref is ready.
- `CanvasManager` wires every subsystem (PaintManager, ShapeModifier, ShapeManager, SceneManager, Renderer, InputManager, ToolManager) into the global `DependencyManager` container so tools can resolve shared singletons.
- DOM pointer/keyboard events are captured by `InputManager` and fanned out through the custom `EventQueue` (`PointerDown/Move/Up`, `KeyDown/Up`, `ToolChange`, `Render`, etc.). Unsubscribe before re-subscribing to avoid duplicate handlers.
- `ToolManager` swaps concrete tools (`SelectTool`, `ShapeTool`, `GroupTool`, `ImageTool`, keyboard helpers) and rebinds EventQueue listeners each time `setCurrentTool` runs.
- `Renderer` owns the CanvasKit Surface (prefers WebGL, falls back to GL v1) and drives a 60fps loop; it scales for `devicePixelRatio`, clears the canvas, asks `SceneManager.draw()` to render, and flushes.

## Scene Graph & State
- `SceneManager` maintains a root `ContainerNode`; `flattenScene()` walks nested containers to find hit targets, so ordering matters when you add nodes.
- `ContainerNode` handles layout (row/column/grid/frame) via `node/LayoutEngine.ts`; when adding new constraints update both the engine and the debug overlays in `ContainerNode.drawPaddingAndGap`.
- Shapes live inside `SceneNode` subclasses (`ShapeNode`, containers). Transforms use CanvasKit matrices (`localMatrix`, `worldMatrix`)—always call `updateWorldMatrix` after changing scale/rotation/position.
- `ShapeManager` tracks the currently attached `SceneNode`, forwards drag/resize events to `ShapeModifier`, enforces a 5px minimum size, and throttles property updates into the Zustand `useSceneStore`.
- Property editing: `PropertyBar` -> `useSceneStore.updateProperty` -> `shapeManager.updateProperty` -> `SceneNode.setProperties`. Any new property must round-trip through this chain.

## Tools & Interaction
- Tools extend `lib/tools/Tool.ts`, pull `sceneManager`/`shapeManager` out of the container, and implement `handlePointerMove`. Remember `Tool.handlePointerUp` resets to the default select tool.
- `ShapeTool` creates shapes via `ShapeFactory` and inserts them into whichever container the pointer is over; `handlePointerDrag` delegates size changes to `ShapeManager.drawShape`.
- Adding a new tool requires: implement the subclass, export it from `src/lib/tools`, register it in `ToolManager.setCurrentTool`, and expose it via `ToolBar`/`Button` with a matching `ToolType` string.

## Rendering Assets & Paint
- `CanvasKitResources` caches `CanvasKit`, fonts (`lib/core/fonts.json` plus `public/fonts/Inter*.ttf`), shared `TextStyle`, and a reference `Path`. Always call `dispose()` when unmounting to release font managers.
- `PaintManager` centralises CanvasKit `Paint` creation plus shader/image caching (`lib/core/Cache.ts`); reuse it instead of instantiating paints inside shapes or modifiers.
- Image/gradient fills are described in `lib/types/shapes.ts`; helpers in `PaintManager.setPaint` convert those shape props into CanvasKit colors or shaders.

## React Stores & UI Conventions
- `useToolStore` (Zustand) owns toolbar state, defaulting to the select tool. The UI lets each group remember its last choice via `selectedByGroup`.
- `useCanvasManagerStore` exposes the live `CanvasManager`/`shapeManager` to React components (e.g., `PropertyBar`); always null-check in hooks because the canvas tears down and recreates managers.
- CSS/utility classes use plain CSS plus `tailwind-merge` to compose styles; no Tailwind runtime is configured yet even though dependencies exist.

## Build & Debug Workflow
- Install deps with `npm install` (Node 18+), run `npm run dev` (Vite) for local development, `npm run build` (tsc -b then `vite build`), and `npm run lint` for ESLint.
- CanvasKit’s wasm binary is bundled via `canvaskit-wasm/bin/canvaskit.wasm?url`; keep that import intact or Vite will not fetch the wasm correctly.
- Fonts load over the network; editor startup will hang if a font URL 404s, so validate new entries in `fonts.json` and commit matching assets under `public/fonts` when required.
- Use the diagrams in `public/system_component.png` and `public/system_events.svg` for a mental model of subsystem boundaries before making cross-cutting changes.

## Patterns & Gotchas
- Prefer TS path aliases from `tsconfig.json` (`@lib/*`, `@hooks/*`, `@ui/*`, etc.) for imports; relative paths make Vite’s resolver miss shared code.
- When adding new managers/services, register them with `DependencyManager` so tools and modifiers can `resolve` them instead of new-ing their own copies.
- Clean up CanvasKit objects (`Paint`, `Surface`, `FontMgr`, etc.) inside the relevant `.destroy()` methods and call them from `CanvasManager.destroy()`; otherwise hot reloads leak GPU resources.
- `EventQueue` is synchronous; expensive handlers (e.g., layout recomputation) should throttle/debounce or they will block pointer move events.
- `SceneNode.getProperties()` must stay in sync with property panel expectations—run through `PropertyBar` when changing the shape model to avoid missing controls.
