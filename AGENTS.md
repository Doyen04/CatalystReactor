# AGENTS.md

CanvasKit (Skia WASM) vector editor. React 19 + Vite 6 + Tailwind 4 + Zustand + TypeScript. React UI is thin; logic lives in `src/lib/{core,shapes,tools,modifiers,node}`.

Read `.github/copilot-instructions.md` for the **current** architecture (event flow, scene graph, layout containers, tool/shape extension recipes). It is accurate and detailed.

**The active refactor plan and target architecture:** `docs/architecture.md` (engine-authoritative, headless, command/journal-based). This is the map for all work on the `refactor/engine-architecture` branch — one branch, all planned changes land here. Target end-state layout: `src/{core,engine,bridge,ui}` tiers with a monotone import direction (see the plan's section 3). If a change is listed in the plan, implement it there; do not improvise a parallel sketch in `src/lib`. Default tool is `select`; per-group remembered tools exist.

## Commands

- Dev: `npm run dev`
- Build: `npm run build` (runs `tsc -b && vite build` — typecheck happens here)
- Lint: `npm run lint` (`eslint .`)
- Test: `npm run test` (`vitest run`); watch: `npm run test:watch` (`vitest`)
- No typecheck-only or prettier script; import ordering and `git diff` will not be checked by CI.

Formatting is Prettier but not wired to a script; run `npx prettier --write <files>`. Config: 4-space indent, no semicolons, single quotes, printWidth 150, `arrowParens: avoid`, trailing comma es5.

## Import aliases (quirk)

`vite-aliases` (`deep: true`) auto-generates an `@<dirname>` alias for every folder under `src` at dev/build time. `@/*` → `src/*`, e.g. `@lib/core/CanvasManager`, `@hooks/useTool`. New folders under `src` get aliases automatically — do NOT hardcode path config. `tsconfig.json` `paths` mirrors this for the editor's typechecking; note `tsconfig.app.json` overrides `paths` to `{}` (Vite still resolves aliases so builds work).

## Architecture boundaries (enforced direction)

Imports point one way only: `ui/` → `bridge/` → `engine/` → `core/` (plan sections 2.4 and 11). Information travels back up as **events**, never as imports.

- `src/engine/**` must stay headless: never import React, Zustand, `src/ui`, `src/hooks`, or `src/component`. `src/engine/render/` is the first engine tier and owns WASM resource lifecycles.
- `src/core/**` (once it exists) must not import CanvasKit.
- WASM resources are **not** garbage-collected. `Paint`/`Path`/`Paragraph`/`Shader`/`Image` ownership goes through `src/engine/render/{PaintCache,ResourceScope,TextCache}`. Never mutate a paint returned by `PaintManager.getPaint`/`makeNewPaint` — request a new descriptor instead.
- Engine/tier imports may use `@/*`, `@engine/...` (both present in `tsconfig.json` paths), or relative paths. Only auto-generated `@<folder>` aliases that are NOT present in `tsconfig.json` paths are unsafe — they break typechecking.

## Refactor status (`refactor/engine-architecture`)

- **Step 1 (stop the leaks) landed:** `src/engine/render/{PaintCache,TextCache,ResourceScope,ResourceCounter}` added; paint creation routed through `PaintCache`; PText paragraphs cached by version+width; shared-paint mutation removed from all live shapes/tools (only the preserved dead `Handles.ts` fallback still uses the getters); dev-only `[skia]` counter wired in `Canvas.tsx`.
- **Step 2 (delete the dead code) landed:** removed the unimplemented `freeform`/`scale` entries from `ToolBar`, dropped `BooleanAction` from `HistoryManager`, removed the `EventQueue` wiring (import + `removeAllEvent()` call) from `CanvasManager`, and quarantined the preserved dead files into `to-be-deleted/`.
- **Step 3 (the test harness) landed:** Vitest added as a devDependency; root `vitest.config.ts` derives `resolve.alias` from `tsconfig.json` `compilerOptions.paths`/`baseUrl` (deliberately no `vite-aliases` plugin — it spawns filesystem watchers that delay shutdown). Tests live in `src/lib/__tests__/*.test.ts`, run in a `node` environment (no CanvasKit/React/DOM). Coverage: pure math (`Vector`, `clamp`/`normalizeAngle`/`handleUtil`/`pointInArc`, `roundingUtil`, `LayoutEngine` row/column/grid incl. padding/align/auto-resize branches, `SnapManager` grid, `PCache`, `debounce`/`throttle`), state (`EngineStateStore`/`HistoryManager`), fills (`getBackgroundFill`), `DependencyManager`/`ResizeCursor`/`textUtil`, `TextEditor` span logic, and the engine render caches (`PaintCache`/`TextCache`/`ResourceScope`/`ResourceCounter`) via lightweight fakes — 12 files, 244 tests passing. Add tests alongside each subsequent step.
- `PaintManager.getPaint(request)` returns an immutable cached paint and is the preferred API. The legacy `paint`/`stroke` getters remain only for the quarantined `Handles.ts` reference (`to-be-deleted/lib/modifiers/Handles.ts`); nothing live uses them.

## Boot flow

`src/component/Canvas.tsx` is the engine bootstrap: loads `canvaskit-wasm`, initializes singleton `CanvasKitResources`, then creates one `CanvasManager` per mounted canvas. `CanvasManager` registers services into `DependencyManager` in a fixed order (paintManager → shapeModifier → shapeManager → sceneManager → inputManager → renderer → toolManager); tools resolve dependencies from this container — never instantiate side copies.

Events: `InputManager` is the only input path — there is no event bus. It captures native pointer/key/resize events and fans them out to **direct subscriber callbacks** (`InputCallbacks`: `onPointerDown/Move/Up`, `onKeyDown/Up`, `onResize`); `ToolManager` and `Renderer` `subscribe()` to it. The old `EventQueue` class survives only as a reference copy in `to-be-deleted/lib/core/EventQueue.ts`; nothing under `src/` may import it. `setTool` creates a fresh tool instance each switch.

## Stores

- `useToolStore` (Zustand) — active/default tool, per-group remembered tool; `setDefaultTool()` returns to select.
- `useCanvasManagerStore` — **React Context** (`CanvasManagerProvider` in `App.tsx`), not Zustand; exposes `canvasManager` and its `shapeManager`.
- `useSceneStore` (Zustand) — `selectedShapeId`, `currentShapeProperties`, `gridSize` (drives SnapManager grid); syncs with `EngineStateStore`.
- `EngineStateStore` (singleton) — shape data map keyed by id; the shared source of truth bridges the canvas engine and React panels. **Any shape created via `ShapeFactory` registers here.**
- `HistoryManager` (singleton) — working undo/redo (`UpdateShapeAction`, keyed on `EngineStateStore` data); `ShapeManager.updateProperty/finishDrag` push actions; keyboard `Ctrl+Z` / `Ctrl+Y` call it. `CanvasManager.undo/redo` are still stubbed — use HistoryManager.

## Gotchas

- Dev runs under `<StrictMode>`, so the Canvas bootstrap effect double-fires; `Canvas.tsx` guards re-init via refs. Keep that guard when touching boot/teardown.
- `import/no-cycle` is an eslint error (maxDepth Infinity) — the manager graph in `src/lib/core` can tempt cycles.
- Tool type union is `ToolType` in `src/lib/tools/toolTypes.ts`; it includes `ContainerType` (row/column/grid/frame/none) used by group tools.
- `Renderer` and tool code assume `CanvasKitResources` is already initialized; anything running before canvas boot will fail.
- `SnapManager` is a singleton configured via `useSceneStore.gridSize`. `ShapeManager` lazily caches its snap-guide paint/dash; that cache is per-ShapeManager, reset on re-mount.
- **The preserved dead/reference files are quarantined under `to-be-deleted/`** (excluded from tsconfig and eslint): `to-be-deleted/lib/core/{toImplement.ts,PathOperator.ts,EventQueue.ts,BooleanAction.ts}` and `to-be-deleted/lib/modifiers/{Handles.ts,modifier.ts,modifierUtility.ts}`. They hold the working version of code that was refactored elsewhere (the new refactor wasn't working as it should, so the working copies were kept for reference). They are working reference implementations whose new homes are not yet verified; nothing under `src/` may import them, and the matching file should be deleted from `to-be-deleted/` once the new location is verified working.
- Tailwind 4 is CSS-first (`@import 'tailwindcss'` in `index.css`); there is no `tailwind.config.js`.
- `tsc -b` writes `tsconfig.tsbuildinfo` to the repo root; it is committed, not gitignored.
- Fonts load at boot from `public/fonts` (Inter variable) plus remote families in `src/lib/core/fonts.json`; requires network for the remote ones, best-effort via `Promise.allSettled`.
- **Deferred tests:** matrix compose/invert, world-to-local round trips, and rect intersection are NOT tested yet because that math still lives behind the CanvasKit `Matrix` in `Scene.ts`/`Shape.ts`. Add the tests once that math is extracted to the target `src/core` tier (Steps 5-6 of the plan).
- **Running note (deliberately not fixed):** (a) `LayoutEngine` handles numeric `gridTemplateColumns`/`gridTemplateRows` at runtime but `nodeTypes.ts` `GridLayout` types them without `number`, so callers must cast; (b) `SnapManager.getSnapResult`'s third `gridSize` argument overwrites the value set via `setConfiguration`; (c) `roundingUtil` clamps the star corner radius on odd indices but not even ones (source marks it unfinished); (d) `TextEditor.splitAt` never updates the matching `indexMap` entry's `end`, so middle `insertText`/`deleteRange`/`applyStyle` operate on stale bounds and `deleteRange` can shrink `getLength()` without removing text — this buggy behavior is deliberately NOT pinned by tests; fix it before building on range edits; (e) `throttle` initializes `lastCall = 0`, so the first call within `limit` ms of the epoch is dropped; (f) `PCache.set` with `limit <= 0` inserts over capacity; (g) `getGradientPreview` sorts `gradient.stops` in place, mutating the caller's fill; (h) `EngineStateStore` has no `clear()`, `removeShapeData` notifies with `undefined`, and `createShapeData` silently overwrites an existing id; (i) `ResizeCursor` keys its cache by the unnormalized angle, so equivalent angles do not share entries; (j) `LayoutEngine` grid auto-resize is effectively dead — `requiredWidth`/`requiredHeight` algebraically equal the container size, so a grid never grows to fit children (only float round-off trips it); when the first child has no `dim`, auto-resize totals add a phantom gap, and `space-around`/`space-evenly`/`space-between` divide by `children.length` rather than the real-child count; (k) `getBackgroundStyleFromFillValue` returns `{ backgroundColor: null }` for a numeric `solid.color` (`colorValue` passes only strings through), and a `pattern` fill with a url is treated as an image `scaleMode: 'fill'` so its `repeat` is ignored; (l) `isPrintableCharUnicode` accepts a lone surrogate.