# CatalystReactor - Copilot Instructions

## Purpose

- This repository is a React + CanvasKit interactive vector editor.
- UI composition is intentionally thin; editor behavior is in `src/lib` managers, nodes, tools, and shapes.

## Runtime Architecture

- App shell in `src/App.tsx` mounts `SideBar`, `Canvas`, and `PropertyBar` (plus a simple header) inside `<CanvasManagerProvider>`.
- `src/component/Canvas.tsx` is the bootstrapping boundary:
    - Loads CanvasKit wasm via `canvaskit-wasm/bin/canvaskit.wasm?url`.
    - Loads fonts via `CanvasKitResources.loadInterFont()` (Inter from `public/fonts` + remote families from `src/lib/core/fonts.json`, best-effort `Promise.allSettled`).
    - Initializes singleton `CanvasKitResources`, then creates one `CanvasManager` per mounted canvas.
- `CanvasManager` registers core services in `DependencyManager` in this order:
    - `paintManager` -> `shapeModifier` -> `shapeManager` -> `sceneManager` -> `inputManager` -> `renderer` -> `toolManager`
- Service resolution for tools/managers relies on this container setup (typed `ServiceRegistry`, `container.resolve(key)` warns + returns `null` if missing). If you add a new shared subsystem, register it here. Do not instantiate manager copies inside tools/components.

## Event and Input Flow

- `InputManager` captures native pointer/keyboard/resize events and fans them out to **direct subscribers** via the `subscribe(callbacks)` / `unsubscribe(callbacks)` API (`InputCallbacks`: `onPointerDown/Move/Up`, `onKeyDown/Up`, `onResize`). It uses stable arrow-property handlers, so add/remove stays symmetric.
- `ToolManager` and `Renderer` each hold an explicit `inputCallbacks` object, `unsubscribe` it in `removeEvent()`, and re-`subscribe` in `addEvent()`. Keep this idempotent pattern when editing wiring.
- `ToolManager.setCurrentTool(tool)` creates a fresh tool instance per switch (`SelectTool`, `ShapeTool`, `GroupTool`, `ImageTool`, `LineTool`, `PenTool`, `BezierTool`, `EditTool`), calls `currentTool.toolChange()` on the outgoing one, and re-binds events. Key events forward to both the singleton `KeyboardTool` and the current tool.
- The old `EventQueue` bus (event names like `create:scene`, `draw:shape`, `select:object`, `tool:change`) is **dormant**: nothing subscribes anymore, and only `CanvasManager.destroy()` calls `removeAllEvent()`. Do not add new flow through it.

## Scene Graph and Transform Rules

- Root scene is a `ContainerNode` with no shape (`new ContainerNode(null, null)`); child nodes hold visible scene content.
- Hit-testing:
    - `SceneManager.getCollidedScene(x, y, deep)` checks children back-to-front (topmost pick behavior). `deep=true` walks to the deepest leaf (used by Ctrl/Cmd+click drill-down in SelectTool).
    - `flattenScene()` traverses descendants; `getAllScene()` returns only top-level children.
- Transform system:
    - Every `SceneNode` (defined in `src/lib/node/Scene.ts`) stores `localMatrix` and `worldMatrix`; mutations set `canComputeMatrix` and matrices recompute during `updateWorldMatrix()`.
    - Draw uses `canvas.concat(localMatrix)`; `ShapeNode.draw` and `ContainerNode.draw` (which also clips children to the container bounds and draws padding/gap debug overlays) both follow this.
- Coordinate conversions (`worldToLocal`, `worldToParentLocal`, `localToWorld`, `worldDeltaToLocal`) are central to tool logic. Preserve them when refactoring drag/drop or reparenting.
- Shapes draw in absolute local coords with transforms applied around the center anchor; see `recomputeLocalMatrix()` (translate → rotate → scale about the anchor).

## Layout Containers

- Container layouts are applied by `ContainerNode.applyLayout()` using `LayoutEngine` helpers:
    - `applyRowLayout` / `applyColumnLayout` (gap, `mainAlign`, `crossAlign`, padding)
    - `applyGridLayout` (row/column gaps, templates, auto flow)
    - `frame` = free positioning
- `ContainerNode.drawPaddingAndGap()` / `drawGapIndicators()` draw orange padding and blue gap debug overlays. If layout math changes, update these too.
- `GroupTool` creates a `ContainerNode` wrapping a `plainRect` shape with default `LayoutConstraints`, and `captureContainedShapes()` re-parents fully-contained nodes into it on pointer-up.

## Tools

- Base class is `src/lib/tools/Tool.ts`. All tools `container.resolve('sceneManager')` / `('shapeManager')` in the constructor.
- Default reset: base `Tool.handlePointerUp()` returns to the default select tool via `useToolStore. setDefaultTool()`. Path-drawing tools intentionally do NOT call super on pointer-up (they finish on Enter/Esc/double-click via `setDefaultTool()` themselves).
- Current tools:
    - `SelectTool`: `getCollidedScene` selection (deep with Ctrl/Cmd+meta), modifier handle drag/resize/rotate, hover cursor updates (see `ResizeCursor`), single-click text cursor placement, double-click text editing, and reparent-on-drop via `repositionShape()`.
    - `ShapeTool`: creates rect/oval/star/polygon/text via `ShapeFactory`, sizes on drag, `handleTinyShapes()` guards < 5px results.
    - `GroupTool`: row/column/grid/frame containers; captures contained shapes after pointer up.
    - `ImageTool`: opens a file picker on construction, preloads via `createImageBitmap` + `MakeImageFromCanvasImageSource`, then places one image per click until the queue empties. `toolChange()` clears the preloaded cache.
    - `LineTool` / `PenTool` / `BezierTool`: draw `VectorPath`s by incrementally adding points; snap to existing path anchors (`Tool.findSnapPoint`); close by clicking the first point; Exit/Esc/Enter finishes.
    - `EditTool`: anchor/control-point/segment editing on `VectorPath`; double-click toggles smooth/corner or inserts a point; `Delete` removes a point; non-path shapes are flattened via `shape.convertToPathData()` into a `VectorPath` before editing.
    - `KeyboardTool` (singleton): printable chars/Enter/arrows/Delete/Backspace route to the text-capable selected shape, arrows also nudge the selected shape, and Ctrl+Z / Ctrl+Y drive `HistoryManager`.

## Shapes and Property Pipeline

- Shape creation goes through `ShapeFactory.createShape(type, pos, image?)` with `ShapeType` values; a `ShapeData` is registered in `EngineStateStore` (source of truth `shapeDataMap`, keyed by `crypto.randomUUID()` id).
- Shape-to-Node types: `ShapeNode` (leaf) and `ContainerNode` (group/layout). `type 'line'|'path'|'bezier'` all instantiate `VectorPath`; `'plainRect'` is the group/container backing shape; `SText`/`PText` cover text.
- Scene attachment and modifier ownership are handled by `ShapeManager.attachNode` / `detachShape` (which updates `useSceneStore.selectedShapeId` and `currentShapeProperties`). `ShapeManager.draw()` renders modifier handles + snap guides onto the canvas.
- Property editing loop:
    - UI edits in `PropertyBar` (transform/size/style/text/layout/arc/star/polygon/border-radius controls) call `shapeManager.updateProperty/updateSubProperty/updateStyle/updateBorderRadius/updateRadiusLock`.
    - `ShapeManager` pushes an `UpdateShapeAction` to `HistoryManager` and notifies `EngineStateStore` on every change; property sync to the store is throttled during drags (`throttle`, ~100ms).
    - `SceneNode.setProperties` delegates to the shape implementation.
- Any new editable property must be wired through: shape `getProperties`/`setProperties`, `Properties` in `src/lib/types/shapes.ts`, `PropertyBar` controls, and the `ShapeManager` update path above.
- `ShapeModifier` renders selection handles via each shape's native `drawModifierHandles(canvas, resource)` + `hitTestModifierHandle(...)` (replaces the legacy `Handles` array system), and shows a `SText` dimension label ("W x H") under the selection.
- Snapping: `SnapManager` singleton computes grid + shape-edge snap (`getSnapResult`, `snapDistance` 8px default) using `useSceneStore.gridSize`; `ShapeManager.drag()` patched the mouse event with snapped coords and `ShapeManager.drawSnapGuides()` renders indicators/guides (cached paint + dash are lazily created and per-`ShapeManager`).

## Rendering and Resource Lifecycle

- `Renderer` creates a CanvasKit WebGL surface (`MakeWebGLCanvasSurface`), falls back to GL v1, and runs a 60 FPS `requestAnimationFrame` loop via the surface. It subscribes to `onResize` to rebuild the surface.
- `Renderer.render()` still draws a debug rect (`LTRBRect(10, 10, 250, 100)`) with `paintManager.paint/stroke` — preserve or remove deliberately.
- `CanvasKitResources` owns shared CanvasKit objects (path, text/paragraph styles, `FontMgr`, canvasKit instance); `dispose()` on teardown. New code must not run before `CanvasKitResources.initialize()`.
- `PaintManager` centralizes fill/stroke/gradient/image shader creation, `PCache` (an LRU Map with `.delete()` on eviction), image cache, and cleanup of transient shaders in `resetPaint()`. Gradient coordinates in properties are percentages resolved against shape size at draw time.

## Stores and UI State

- `useToolStore` (Zustand): active `tool`, `defaultTool` (select), per-group remembered tool via `setTool(tool, groupId)`.
- `useCanvasManagerStore`: **React Context** (`CanvasManagerProvider` in `App.tsx`, hook `useCanvasManagerStore`) exposing `canvasManager` and its `shapeManager`. Not a Zustand store.
- `useSceneStore` (Zustand): `selectedShapeId`, `currentShapeProperties` (the mutable `PropertyBar` model), `gridSize` (snap grid). Subscribes to `EngineStateStore` to refresh the selected shape's props.
- `EngineStateStore` (singleton): `createShapeData` / `getShapeData` / `getAllShapeData` / `subscribe` / `notify`. Bridges engine and React.
- `HistoryManager` (singleton): `pushAction` / `undo` / `redo` of `Action` objects; `UpdateShapeAction` mutates `EngineStateStore` data and notifies. `CanvasManager.undo/redo` are still stubbed — use `HistoryManager`.

## Build and Workflow Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build` — typecheck happens here; `tsc -b` writes `tsconfig.tsbuildinfo`, which is committed)
- Lint: `npm run lint` (`eslint .`; enforces `import/no-cycle` with `maxDepth: Infinity`)
- No tests. Stack: React 19, Vite 6, TS 5.8 (strict, `noUnusedLocals`, `erasableSyntaxOnly`), CanvasKit, Zustand, Tailwind 4 (CSS-first, no `tailwind.config.js`).

## Import and Code Style Conventions

- Prefer TS path aliases (`@lib`, `@hooks`, `@ui`, `@/`) — auto-generated by `vite-aliases` from `src` folder names, so new folders work without config. `tsconfig.app.json` resets `paths: {}` but Vite still resolves aliases.
- Prettier style: 4-space indent, no semicolons, single quotes, printWidth 150, `arrowParens: avoid`, trailing comma es5. Not wired to a script; run `npx prettier --write <files>`.
- Keep manager/tool wiring explicit and centralized; resolve from `DependencyManager`, never create side copies.
- Keep comments focused and brief, no obvious narration.

## Gotchas

- Dev runs under `<StrictMode>`; the Canvas bootstrap effect double-fires, so `Canvas.tsx` guards re-init via refs. Preserve that guard when changing boot/teardown.
- `ToolBar` renders UI entries (`freeform`, `scale` under the select group) that have no matching `ToolType`/implementation — they still call `setTool`/switch tools.
- `SceneNode.destroy()` / `ContainerNode.destroy()` cascade to children; `ContainerNode.destroy()` deliberately clears children itself. Watch out for double-destroy when removing nodes manually.
- `src/lib/modifiers/{Handles,modifier,modifierUtility}.ts`, `src/lib/core/toImplement.ts`, and `PathOperator`/`BooleanAction` (boolean path ops) are unwired/dead — ignore unless explicitly resurrecting them.
- Keep `EventQueue` untouched (dormant). Add input flow via `InputManager` subscribers instead.
- `index.html` title is still "Vite + React + TS" (cosmetic).

## When Adding Features

- New tool:
    - Add a class under `src/lib/tools`, wired into `ToolManager.setCurrentTool`'s switch.
    - Add the key to the `ToolType` union in `src/lib/tools/toolTypes.ts`;
    - Add a UI entry in `ToolBar`.
    - Decide pointer-up behavior (auto-return to select vs. stateful completion for path tools).
- New shape:
    - Implement a primitive under `src/lib/shapes/primitives` (extend `Shape`), register it in `ShapeFactory` + `ShapeType`, extend `getDefaultProperties`.
    - Verify modifiers (`drawModifierHandles`, `hitTestModifierHandle`, `dragModifierHandle`) and property panel integration.
- New shared service:
    - Register in `CanvasManager` + `ServiceRegistry` in `DependencyManager`.
    - Resolve from the container where needed; clean up in the `destroy()` path.
    - If it syncs to React, register the id-keyed data in `EngineStateStore` and notify subscribers.

## Architecture Boundary and Resource Ownership (refactor in progress)

- Target tiers, with imports pointing one way only: `ui/` -> `bridge/` -> `engine/` -> `core/`. `src/engine/**` must stay headless (never import React, Zustand, `src/hooks`, or `src/component`); `src/core/**` must not import CanvasKit. Information flows back up as events.
- Use `@/*` (in `tsconfig.json` paths) or relative paths for tier imports. Do NOT use the auto-generated `@<folder>` aliases (e.g. `@engine/...`) — they are not in `tsconfig.json` paths and break typechecking.
- New WASM-owning helpers live in `src/engine/render/`: `PaintCache` (descriptor -> immutable `Paint`), `TextCache` (`Paragraph` keyed by version+width), `ResourceScope` (reverse-order disposal), `ResourceCounter` (dev-only `[skia]` log). CanvasKit resources are not garbage collected.
- Obtain paints via `PaintManager.getPaint({ color, opacity, size, stroke?, strokeWidth? })` (or `initFillPaint`/`initStrokePaint`). They return cached paints: **never** call `.setColor`/`.setShader`/`.setStrokeWidth` on the result — request a new descriptor instead. The legacy `paint`/`stroke` getters remain only for the dead `Handles.ts` fallback until Step 2.
- Already landed in Step 1: PText paragraphs cached and deleted by version, SText font/typeface and ShapeManager snap paints destroyed on teardown, ImageTool deletes unplaced preloaded images.

## Copilot Expectations for This Repo

- Favor minimal, targeted edits over broad rewrites.
- Preserve the existing architecture (input subscribers + manager graph + scene graph) unless a task explicitly asks for redesign.
- Validate changes through the real runtime chain (tool → manager → scene → render), not just type checks.