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
- The old `EventQueue` bus is **removed**; only a quarantine copy remains at `to-be-deleted/lib/core/EventQueue.ts` (excluded from tsconfig/eslint) for reference. `InputManager` direct subscribers are the only input path. Do not import it from `src/` and do not add new flow through it.
- Outbound (engine -> UI) flow is the typed `EngineBus` (`src/engine/events/EngineBus.ts`) with the `EngineEvents` map (`src/lib/core/EngineEvents.ts`). `CanvasManager` owns one `bus` and passes it to `ShapeManager` and `ToolManager`. `EngineBus.on` returns an unsubscribe function and `emit` iterates a snapshot of the listener set. The bus is the engine tier's seam: it never imports Zustand/React. The only place it meets the stores is `src/bridge/engineStoreBridge.ts` (`connectEngineToStores(bus)`), which `Canvas.tsx` calls and disconnects on cleanup.

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

- Base class is `src/lib/tools/Tool.ts`. Every tool's constructor is `(cnvs, ctx: ToolContext)`; it reads `ctx.sceneManager` / `ctx.shapeManager` and stores `ctx` as `protected ctx`. Tools must NOT `container.resolve(...)` or import any store. `ToolContext` (`src/lib/tools/ToolContext.ts`) is built once by `ToolManager` and exposes `defaultTool`, `sceneManager`, `shapeManager`, `shapeModifier`, `setTool`, `setCursor`, `requestRender`.
- Default reset: base `Tool.handlePointerUp()` returns to the default select tool via `ctx.setTool(ctx.defaultTool)`, which emits `tool:changed`. Path-drawing tools intentionally do NOT call super on pointer-up (they finish on Enter/Esc/double-click via `ctx.setTool(...)` themselves).
- Current tools:
    - `SelectTool`: `getCollidedScene` selection (deep with Ctrl/Cmd+meta), modifier handle drag/resize/rotate, hover cursor updates (see `ResizeCursor`), single-click text cursor placement, double-click text editing, and reparent-on-drop via `repositionShape()`.
    - `ShapeTool`: creates rect/oval/star/polygon/text via `ShapeFactory`, sizes on drag, `handleTinyShapes()` guards < 5px results.
    - `GroupTool`: row/column/grid/frame containers; captures contained shapes after pointer up.
    - `ImageTool`: opens a file picker on construction, preloads via `createImageBitmap` + `MakeImageFromCanvasImageSource`, then places one image per click until the queue empties. `toolChange()` clears the preloaded cache.
    - `LineTool` / `PenTool` / `BezierTool`: draw `VectorPath`s by incrementally adding points; snap to existing path anchors (`Tool.findSnapPoint`); close by clicking the first point; Exit/Esc/Enter finishes.
    - `EditTool`: anchor/control-point/segment editing on `VectorPath`; double-click toggles smooth/corner or inserts a point; `Delete` removes a point; non-path shapes are flattened via `shape.convertToPathData()` into a `VectorPath` before editing.
    - `KeyboardTool` (constructed by `ToolManager` with `ctx.shapeManager`, `ctx.commandManager`, and `EngineStateStore.getInstance().getDocument()`): printable chars/Enter/arrows/Delete/Backspace route to the text-capable selected shape, arrows also nudge the selected shape, Ctrl+Z / Ctrl+Y drive `commandManager.undo()/redo()`, and Escape calls `shapeManager.cancelDrag()` while `doc.isTransactionOpen` to revert a mid-drag change.

## Shapes and Property Pipeline

- Shape creation goes through `ShapeFactory.createShape(type, pos, image?)` with `ShapeType` values; a `ShapeData` is registered in `EngineStateStore` (source of truth `shapeDataMap`, keyed by `crypto.randomUUID()` id).
- Shape-to-Node types: `ShapeNode` (leaf) and `ContainerNode` (group/layout). `type 'line'|'path'|'bezier'` all instantiate `VectorPath`; `'plainRect'` is the group/container backing shape; `SText`/`PText` cover text.
- Scene attachment and modifier ownership are handled by `ShapeManager.attachNode` / `detachShape`; they emit `selection:changed` on the bus rather than writing to `useSceneStore` (the bridge performs the store write). `ShapeManager` also emits `document:changed` once per frame with the touched id during draws/drags/moves (unthrottled — the bridge throttles re-renders), and `ShapeManager.draw()` renders modifier handles + snap guides onto the canvas.
- Property editing loop:
    - UI edits in `PropertyBar` (transform/size/style/text/layout/arc/star/polygon/border-radius controls) read the live record via `useEntityThrottled(selectedShapeId)` (from `src/bridge`) and write with `editor.run(new UpdateProperties(id, null, patch))`, where `patch` comes from the pure builders in `src/bridge/propertyPatch.ts` (`patchProperty`/`patchBorderRadius`/`patchRadiusLock`/`patchStyle`).
    - `CommandManager.run` journals the change and emits `document:changed` (with `requestRender()`), so panel edits reach the canvas and undo/redo reach the panel.
    - `SceneNode.setProperties` delegates to the shape implementation.
- Any new editable property must be wired through: shape `getProperties`/`setProperties`, `Properties` in `src/lib/types/shapes.ts`, `PropertyBar` controls, and a `propertyPatch` builder if it is a nested/sectioned property.
- `ShapeModifier` renders selection handles via each shape's native `drawModifierHandles(canvas, resource)` + `hitTestModifierHandle(...)` (replaces the legacy `Handles` array system), and shows a `SText` dimension label ("W x H") under the selection.
- Snapping: `SnapManager` singleton computes grid + shape-edge snap (`getSnapResult`, `snapDistance` 8px default). The grid size is no longer read from `useSceneStore`: `Canvas.tsx` pushes it via `CanvasManager.setGridSize` -> `ShapeManager.setGridSize`, and `ShapeManager.drag()` passes it to `getSnapResult` and patches the mouse event with snapped coords. `ShapeManager.drawSnapGuides()` renders indicators/guides (cached paint + dash are lazily created and per-`ShapeManager`).

## Rendering and Resource Lifecycle

- `Renderer` creates a CanvasKit WebGL surface (`MakeWebGLCanvasSurface`), falls back to GL v1, and defers surface creation by one `requestAnimationFrame` (tracked as `bootRafId`, cancelled on `destroy`). Rendering is dirty-gated: it owns a `FrameScheduler` (`src/engine/render/FrameScheduler.ts`) and draws only when the dirty flag is set — there is no continuous loop. It subscribes to `onResize` to rebuild the surface and restart the scheduler.
- `Renderer.render()` still draws a debug rect (`LTRBRect(10, 10, 250, 100)`) with `PaintManager.getPaint` — preserve or remove deliberately.
- Non-render code asks for a frame via `requestRender()` from `@/engine/render/renderRequest`; `Renderer` registers itself with `setRenderRequest` on construct and clears it on `destroy` (single slot -> one live canvas assumed).
- `CanvasKitResources` owns shared CanvasKit objects (path, text/paragraph styles, `FontMgr`, canvasKit instance); `dispose()` on teardown. New code must not run before `CanvasKitResources.initialize()`.
- `PaintManager` centralizes fill/stroke/gradient/image shader creation, `PCache` (an LRU Map with `.delete()` on eviction), image cache, and cleanup of transient shaders in `resetPaint()`. Gradient coordinates in properties are percentages resolved against shape size at draw time.

## Stores and UI State

- `useToolStore` (Zustand): active `tool`, `defaultTool` (select), per-group remembered tool via `setTool(tool, groupId)`.
- `useCanvasManagerStore`: **React Context** (`CanvasManagerProvider` in `App.tsx`, hook `useCanvasManagerStore`) exposing `canvasManager` and its `shapeManager`. Not a Zustand store.
- `EditorProvider` (`src/bridge/EditorProvider.tsx`, wraps `CanvasManagerProvider`): `makeEditor(canvasManager)` exposes `{ doc, bus, run, undo, redo, canUndo, canRedo }` and provides it through `useEditor()`. The bridge hooks `useEntity(id)` / `useEntityThrottled(id)` (50ms) / `useDocumentRevision()` (100ms) subscribe to the bus's `document:changed` event and read the (in-place-mutated) `DocumentModel` record fresh — they intentionally do NOT snapshot `doc.get(id)` through `useSyncExternalStore` because the record identity never changes.
- `useSceneStore` (Zustand): `selectedShapeId`, `gridSize` (snap grid). Updated from the engine **only** through `src/bridge/engineStoreBridge.ts` (`selection:changed`); `gridSize` is pushed by `Canvas.tsx` -> `CanvasManager.setGridSize`.
- `src/bridge/engineStoreBridge.ts`: the React/Zustand seam over the `EngineBus` for selection and tool state. `connectEngineToStores(bus)` maps `tool:changed` (reset to default) and `selection:changed` onto the stores and returns a disconnect. `document:changed` is consumed by the `EditorProvider` hooks, not by this bridge. Any new engine->UI event must be handled here or in the editor hooks, never inside the engine.
- `EngineStateStore` (singleton, now a facade over a private `DocumentModel`): `createShapeData` / `getShapeData` / `getAllShapeData` / `subscribe` / `notify` unchanged; hands out live write-through `{ id, type, properties }` views. Bridges engine and React. Undo/redo lives in the engine: `CanvasManager.commandManager` (one `CommandManager` per canvas, `new CommandManager(doc, bus)`, registered in the container) exposes `run/begin/apply/commit/abort/undo/redo` and `canUndo/canRedo`. `CanvasManager.undo/redo` delegate to it. The old `HistoryManager` is quarantined at `to-be-deleted/lib/core/HistoryManager.ts` — nothing under `src/` may import it.

## Build and Workflow Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build` — typecheck happens here; `tsc -b` writes `tsconfig.tsbuildinfo`, which is committed)
- Lint: `npm run lint` (`eslint .`; enforces `import/no-cycle` with `maxDepth: Infinity`)
- Test: `npm run test` (`vitest run`); watch: `npm run test:watch` (`vitest`). Stack: React 19, Vite 6, TS 5.8 (strict, `noUnusedLocals`, `erasableSyntaxOnly`), CanvasKit, Zustand, Tailwind 4 (CSS-first, no `tailwind.config.js`).

## Import and Code Style Conventions

- Prefer TS path aliases (`@lib`, `@hooks`, `@ui`, `@/`) — auto-generated by `vite-aliases` from `src` folder names, so new folders work without config. `tsconfig.app.json` resets `paths: {}` but Vite still resolves aliases.
- Prettier style: 4-space indent, no semicolons, single quotes, printWidth 150, `arrowParens: avoid`, trailing comma es5. Not wired to a script; run `npx prettier --write <files>`.
- Keep manager/tool wiring explicit and centralized; resolve from `DependencyManager`, never create side copies.
- Keep comments focused and brief, no obvious narration.

## Gotchas

- Dev runs under `<StrictMode>`; the Canvas bootstrap effect double-fires, so `Canvas.tsx` guards re-init via refs. Preserve that guard when changing boot/teardown.
- `SceneNode.destroy()` / `ContainerNode.destroy()` cascade to children; `ContainerNode.destroy()` deliberately clears children itself. Watch out for double-destroy when removing nodes manually.
- The preserved dead/reference files are **quarantined** under `to-be-deleted/` (`to-be-deleted/lib/modifiers/{Handles,modifier,modifierUtility}.ts`, `to-be-deleted/lib/core/{toImplement,PathOperator,EventQueue,BooleanAction,HistoryManager}.ts`). They are excluded from tsconfig and eslint and are kept as working references whose new homes are not yet verified. Never import them from `src/`; delete the quarantine copy once the replacement is verified. `InputManager` subscribers are the only input path.
- `index.html` title is still "Vite + React + TS" (cosmetic).
- **Deferred tests:** matrix compose/invert, world-to-local round trips, and rect intersection are NOT tested yet because that math still lives behind the CanvasKit `Matrix` in `Scene.ts`/`Shape.ts`; add the tests once the math is extracted to the target `src/core` tier.
- **Running note (deliberately not fixed):** `LayoutEngine` handles numeric `gridTemplateColumns`/`gridTemplateRows` at runtime but `nodeTypes.ts` `GridLayout` types them without `number` (callers cast); `SnapManager.getSnapResult`'s third `gridSize` argument overwrites the value set via `setConfiguration`; `roundingUtil` clamps the star corner radius on odd indices but not even ones (source marks it unfinished); `TextEditor.splitAt` never updates the matching `indexMap` entry's `end`, so middle `insertText`/`deleteRange`/`applyStyle` use stale bounds and `deleteRange` can shrink `getLength()` without removing text (deliberately NOT pinned by tests); `throttle` initializes `lastCall = 0`, dropping the first call near the epoch; `PCache.set` with `limit <= 0` inserts over capacity; `getGradientPreview` sorts `gradient.stops` in place, mutating the caller's fill; `EngineStateStore` has no `clear()`, `removeShapeData` notifies with `undefined`, and `createShapeData` silently overwrites an existing id; `ResizeCursor` keys its cache by the unnormalized angle; `LayoutEngine` grid auto-resize is effectively dead (`requiredWidth`/`requiredHeight` equal the container size, so a grid never grows to fit children), its auto-resize totals add a phantom gap when the first child has no `dim`, and `space-around`/`space-evenly`/`space-between` divide by `children.length` instead of the real-child count; `getBackgroundStyleFromFillValue` returns `{ backgroundColor: null }` for a numeric `solid.color` and treats a `pattern` as an image `scaleMode: 'fill'` (ignoring `repeat`); `isPrintableCharUnicode` accepts a lone surrogate.

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
- Use `@/*`, `@engine/...` (both in `tsconfig.json` paths), or relative paths for tier imports. Only auto-generated `@<folder>` aliases that are NOT in `tsconfig.json` paths are unsafe — they break typechecking.
- New WASM-owning helpers live in `src/engine/render/`: `PaintCache` (descriptor -> immutable `Paint`), `TextCache` (`Paragraph` keyed by version+width), `ResourceScope` (reverse-order disposal), `ResourceCounter` (dev-only `[skia]` log). CanvasKit resources are not garbage collected.
- Obtain paints via `PaintManager.getPaint({ color, opacity, size, stroke?, strokeWidth? })` (or `initFillPaint`/`initStrokePaint`). They return cached paints: **never** call `.setColor`/`.setShader`/`.setStrokeWidth` on the result — request a new descriptor instead. The legacy `paint`/`stroke` getters remain only for the quarantined `Handles.ts` reference (`to-be-deleted/lib/modifiers/Handles.ts`); nothing live uses them.
- Already landed in Step 1: PText paragraphs cached and deleted by version, SText font/typeface and ShapeManager snap paints destroyed on teardown, ImageTool deletes unplaced preloaded images.
- Step 3 (the test harness) landed: Vitest added as a devDependency; root `vitest.config.ts` derives its `resolve.alias` from `tsconfig.json` `compilerOptions.paths`/`baseUrl` (deliberately no `vite-aliases` plugin — it spawns filesystem watchers that delay shutdown). Tests live in `src/lib/__tests__/*.test.ts` in a `node` environment (no CanvasKit/React/DOM): vector math, `clamp`/`normalizeAngle`/`handleUtil`/`pointInArc`, `roundingUtil`, `LayoutEngine` row/column/grid (padding/align/auto-resize), `SnapManager` grid, `PCache`, `debounce`/`throttle`, `EngineStateStore`/`HistoryManager`, `getBackgroundFill`, `DependencyManager`/`ResizeCursor`/`textUtil`, `TextEditor`, and the engine render caches via lightweight fakes. Add tests alongside each subsequent step.
- Step 4 (dirty-gated rendering) landed: `FrameScheduler` + `renderRequest` added under `src/engine/render/`; `Renderer` replaced its continuous 60 FPS loop with the scheduler and registers the process-wide `requestRender` hook. `requestRender()` is called from `ToolManager` pointer/key callbacks, `ShapeManager.attachNode/detachShape/updateProperty`, `HistoryManager.pushAction/undo/redo`, and the `TextCursor` blink interval. `src/engine/__tests__/frameScheduler.test.ts` adds 13 tests (fake rAF) — 13 files / 249 tests total. Runtime verification (idle = no frames) is still deferred.
- Step 5 (the outbound bus) landed: `CanvasManager` owns a typed `EngineBus` (`src/engine/events/EngineBus.ts`); `ToolContext` (`src/lib/tools/ToolContext.ts`) is the tools' constructor dependency; `src/bridge/engineStoreBridge.ts` is the only bus<->Zustand seam. `useToolStore`/`useSceneStore`/`zustand` appear nowhere under `src/lib` or `src/engine`.
- Step 6 (the document model) landed: `src/engine/document/{entity,journal,DocumentModel,serialize}.ts` is the headless source of truth (`EntityRecord { id, type, properties, parentId, version }`, journal entries `props|insert|remove|reparent`, `setProperties` journals changed keys in place, `reorder` journals a same-parent `reparent` entry, `remove` is leaf-only, indices clamp). `EngineStateStore` is now a thin facade over one `DocumentModel` (share it via `EngineStateStore.getInstance().getDocument()`), handing out live write-through `{ id, type, properties }` views. `SceneManager` takes the `doc` (`(shapeModifier, shapeManager, doc)`) and materializes a stable `nodeById` projection that reconciles on non-`props` journal entries; tools create/move/remove nodes only through `addShapeToScene(type, pos, image?)` / `insertNode(node, parentId, index?)` / `removeNode(id)` / `reorderNode(id, index)` / `getNode(id)` — no `new ShapeNode`/`addChildNode`/`removeChildNode` in `src/lib/tools`. `ShapeFactory.createShapeFromData(data, image?)` builds a `Shape` from an existing `ShapeData` without registering. Behaviour deltas: shapes drawn while a container is under the cursor register at the doc root; `props` journal entries never re-run tree reconciliation. Tests: `src/engine/__tests__/{documentModel,journal}.test.ts` — 17 files / 312 tests total.

- Step 7 (journal-backed commands) landed: undo is derived from the journal, not hand-written. `DocumentModel` gained transactions (`beginTransaction`/`commitTransaction`/`abortTransaction`, which reverts by replaying inverted entries in reverse), `applyEntry` (replay a journal entry without re-journaling, listeners notified) and `setPropertiesExplicit(id, before, after)` (journals the diff between two snapshots — required because shape-modifier drags mutate the live properties object in place). `src/engine/commands/CommandManager.ts` (`new CommandManager(doc, bus)`; `run/begin/apply/commit/abort/undo/redo`, `canUndo`/`canRedo`) replays journal inversions via `doc.applyEntry`, caps the undo stack at 200, coalesces consecutive same-`mergeKey` transactions, and emits `history:changed` + `requestRender()`. Commands live in `src/engine/commands/`: `CreateShape` (generates its id, exposes `resultId`), `TranslateNodes`, `UpdateProperties(id, oldProps|null, newProps)`, `DeleteNodes`, `ReparentNodes`, `ReorderNodes` (delegates to `doc.reorder`, which journals the same-parent `reparent` itself), `EditPath`. `src/engine/createEditor.ts` provides the headless editor; §2.2 test in `src/engine/__tests__/headless.test.ts` (create → translate → undo → redo, no canvas/React/store). Live wiring: `CanvasManager` constructs and registers the `CommandManager` (container key `commandManager`) and delegates `undo()/redo()` to it; `ShapeManager` wraps drags in `begin('Move', ...)/apply(UpdateProperties)/commit()` (or `abort()` when unchanged) and adds `cancelDrag()` for mid-drag Escape; `updateProperty` runs `UpdateProperties`; `ToolContext.commandManager` is injected from the container; `KeyboardTool` = `(shapeManager, commandManager, doc)`. `HistoryManager`/`UpdateShapeAction` moved to `to-be-deleted/lib/core/HistoryManager.ts`; coverage replaced in `src/lib/__tests__/engineState.test.ts`. Tests: `src/engine/__tests__/{headless,commandManager,commands}.test.ts` (28) + transaction additions to `documentModel.test.ts` — 20 files / 354 tests total. Manual smoke verification deferred.

- Step 8 (React cut-over, duplicates deleted) landed: `properties:changed` was replaced by `document:changed: { ids: string[] }` in `src/lib/core/EngineEvents.ts`. `ShapeManager` emits it per-frame with the touched id (unthrottled); `CommandManager` emits it on `commit()`/`undo()`/`redo()` (with `requestRender()`), so undo/redo now drive the panel too. New bridge layer: `src/bridge/editor.ts` (`makeEditor(canvasManager)` -> `EditorHandle { doc, bus, run, undo, redo, canUndo, canRedo }`), `EditorProvider.tsx`, `useEditor.ts`, `useEntity.ts` and `useEntityThrottled.ts` (50ms) and `useDocumentRevision.ts` (100ms) — the entity hooks subscribe to filtered `document:changed` and re-read `doc.get(id)` fresh (they deliberately do NOT use `useSyncExternalStore`, whose `Object.is` snapshot check silently skips re-render because records are mutated in place). `PropertyBar` is now a controlled component: it reads `useEntityThrottled(selectedShapeId)` and writes `commands.run(new UpdateProperties(id, null, patch))`; `src/bridge/propertyPatch.ts` provides pure unit-tested patch builders. `LayersPanel` reads its hierarchy from `doc` (`childrenOf(rootId)`, `ancestorsOf`, `layoutConstraints.type`) and refreshes via `useDocumentRevision()`. Deleted: `useSceneStore.currentShapeProperties` (+ `setCurrentShapeProperties`/`clearProperties` and the `EngineStateStore.subscribe` side-effect in `sceneStore.tsx`), `ShapeManager.{throttledUpdate,updateProperty,updateSubProperty,updateStyle,updateBorderRadius,updateRadiusLock}` and its `notify()` calls, the `properties:changed` mapping in `engineStoreBridge.ts`, and `src/lib/types/engine.ts`. Tests: `src/lib/__tests__/propertyPatch.test.ts` (+24), `engineStoreBridge.test.ts` resized, CommandManager render-count updated — 21 files / 379 tests total. Manual UI smoke (panel↔canvas round-trip + undo) still deferred; per-editor instances are Step 9.

## Copilot Expectations for This Repo

- Favor minimal, targeted edits over broad rewrites.
- Preserve the existing architecture (input subscribers + manager graph + scene graph) unless a task explicitly asks for redesign.
- Validate changes through the real runtime chain (tool → manager → scene → render), not just type checks.