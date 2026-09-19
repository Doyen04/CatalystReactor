# AGENTS.md

CanvasKit (Skia WASM) vector editor. React 19 + Vite 6 + Tailwind 4 + Zustand + TypeScript. React UI is thin; logic lives in `src/lib/{core,shapes,tools,modifiers,node}`.

Read `.github/copilot-instructions.md` for the **current** architecture (event flow, scene graph, layout containers, tool/shape extension recipes). It is accurate and detailed.

**The active refactor plan and target architecture:** `docs/arcthitecture.md` (engine-authoritative, headless, command/journal-based). This is the map for all work on the `refactor/engine-architecture` branch — one branch, all planned changes land here. Target end-state layout: `src/{core,engine,bridge,ui}` tiers with a monotone import direction (see the plan's section 3). If a change is listed in the plan, implement it there; do not improvise a parallel sketch in `src/lib`. Default tool is `select`; per-group remembered tools exist.

## Commands

- Dev: `npm run dev`
- Build: `npm run build` (runs `tsc -b && vite build` — typecheck happens here)
- Lint: `npm run lint` (`eslint .`)
- No tests exist. No typecheck-only or prettier script; import ordering and `git diff` will not be checked by CI.

Formatting is Prettier but not wired to a script; run `npx prettier --write <files>`. Config: 4-space indent, no semicolons, single quotes, printWidth 150, `arrowParens: avoid`, trailing comma es5.

## Import aliases (quirk)

`vite-aliases` (`deep: true`) auto-generates an `@<dirname>` alias for every folder under `src` at dev/build time. `@/*` → `src/*`, e.g. `@lib/core/CanvasManager`, `@hooks/useTool`. New folders under `src` get aliases automatically — do NOT hardcode path config. `tsconfig.json` `paths` mirrors this for the editor's typechecking; note `tsconfig.app.json` overrides `paths` to `{}` (Vite still resolves aliases so builds work).

## Architecture boundaries (enforced direction)

Imports point one way only: `ui/` → `bridge/` → `engine/` → `core/` (plan sections 2.4 and 11). Information travels back up as **events**, never as imports.

- `src/engine/**` must stay headless: never import React, Zustand, `src/ui`, `src/hooks`, or `src/component`. `src/engine/render/` is the first engine tier and owns WASM resource lifecycles.
- `src/core/**` (once it exists) must not import CanvasKit.
- WASM resources are **not** garbage-collected. `Paint`/`Path`/`Paragraph`/`Shader`/`Image` ownership goes through `src/engine/render/{PaintCache,ResourceScope,TextCache}`. Never mutate a paint returned by `PaintManager.getPaint`/`makeNewPaint` — request a new descriptor instead.
- Engine/tier imports use `@/*` (present in `tsconfig.json` paths) or relative paths. Do **not** use the auto-generated `@<folder>` aliases (e.g. `@engine/...`) for engine imports — they are missing from `tsconfig.json` paths and break typechecking.

## Refactor status (`refactor/engine-architecture`)

- **Step 1 (stop the leaks) landed:** `src/engine/render/{PaintCache,TextCache,ResourceScope,ResourceCounter}` added; paint creation routed through `PaintCache`; PText paragraphs cached by version+width; shared-paint mutation removed from all live shapes/tools (only the preserved dead `Handles.ts` fallback still uses the getters); dev-only `[skia]` counter wired in `Canvas.tsx`.
- `PaintManager.getPaint(request)` returns an immutable cached paint and is the preferred API. The `paint`/`stroke` getters remain only for the dead `Handles.ts` reference file until Step 2.

## Boot flow

`src/component/Canvas.tsx` is the engine bootstrap: loads `canvaskit-wasm`, initializes singleton `CanvasKitResources`, then creates one `CanvasManager` per mounted canvas. `CanvasManager` registers services into `DependencyManager` in a fixed order (paintManager → shapeModifier → shapeManager → sceneManager → inputManager → renderer → toolManager); tools resolve dependencies from this container — never instantiate side copies.

Events: `InputManager` captures native pointer/key/resize events and fans them out to **direct subscriber callbacks** (`InputCallbacks`: `onPointerDown/Move/Up`, `onKeyDown/Up`, `onResize`). `ToolManager` and `Renderer` `subscribe()` to it. The old `EventQueue` bus is dormant (still defined in `EventQueue.ts`, only `removeAllEvent()` is called during teardown) — don't add new flow to it. `setTool` creates a fresh tool instance each switch.

## Stores

- `useToolStore` (Zustand) — active/default tool, per-group remembered tool; `setDefaultTool()` returns to select.
- `useCanvasManagerStore` — **React Context** (`CanvasManagerProvider` in `App.tsx`), not Zustand; exposes `canvasManager` and its `shapeManager`.
- `useSceneStore` (Zustand) — `selectedShapeId`, `currentShapeProperties`, `gridSize` (drives SnapManager grid); syncs with `EngineStateStore`.
- `EngineStateStore` (singleton) — shape data map keyed by id; the shared source of truth bridges the canvas engine and React panels. **Any shape created via `ShapeFactory` registers here.**
- `HistoryManager` (singleton) — working undo/redo (`UpdateShapeAction`, keyed on `EngineStateStore` data); `ShapeManager.updateProperty/finishDrag` push actions; keyboard `Ctrl+Z` / `Ctrl+Y` call it. `CanvasManager.undo/redo` are still stubbed — use HistoryManager.

## Gotchas

- Dev runs under `<StrictMode>`, so the Canvas bootstrap effect double-fires; `Canvas.tsx` guards re-init via refs. Keep that guard when touching boot/teardown.
- `import/no-cycle` is an eslint error (maxDepth Infinity) — the manager graph in `src/lib/core` can tempt cycles.
- Tool type union is `ToolType` in `src/lib/tools/toolTypes.ts`; it includes `ContainerType` (row/column/grid/frame/none) used by group tools. Note `ToolBar` shows UI entries (e.g. `freeform`, `scale`) that have no matching `ToolType`/implementation.
- `Renderer` and tool code assume `CanvasKitResources` is already initialized; anything running before canvas boot will fail.
- `SnapManager` is a singleton configured via `useSceneStore.gridSize`. `ShapeManager` lazily caches its snap-guide paint/dash; that cache is per-ShapeManager, reset on re-mount.
- **Files that look dead but are the working fallback — do NOT delete.** They contain the working version of code that was refactored elsewhere (the new refactor wasn't working as it should, so the working copies were kept for reference): `src/lib/modifiers/{Handles,modifier,modifierUtility}.ts`, `src/lib/core/toImplement.ts`, `PathOperator`/`BooleanAction` (unwired boolean ops), `EventQueue` (dormant bus, `removeAllEvent()` only). Treat them as reference implementations, not trash. The architecture plan (docs/arcthitecture.md) describes the migration; when migrating a concern, carry the working logic across — don't delete the file until the new location is verified working.
- Tailwind 4 is CSS-first (`@import 'tailwindcss'` in `index.css`); there is no `tailwind.config.js`.
- `tsc -b` writes `tsconfig.tsbuildinfo` to the repo root; it is committed, not gitignored.
- Fonts load at boot from `public/fonts` (Inter variable) plus remote families in `src/lib/core/fonts.json`; requires network for the remote ones, best-effort via `Promise.allSettled`.