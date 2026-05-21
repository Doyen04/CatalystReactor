# CatalystReactor — Senior Code Audit

**Scope:** Full codebase review covering bugs, memory leaks, race conditions, and architecture.
**Stack:** React 19 + Vite + CanvasKit-WASM + Zustand + TypeScript

---

## Summary

| Category | Count |
|---|---|
| Critical bugs | 7 |
| Memory leaks (WASM heap) | 6 |
| Race conditions / lifecycle | 5 |
| Architecture / design | 8 |

---

## Critical Bugs — Incorrect Behavior

### 1. Arc sweep update silently dropped — wrong key name
**File:** `src/component/PropertyBar.tsx` ~line 117

The sweep input passes `'endAngle'` as the key, but `arcSegment` has the field named `sweep`. The check `key in arcSegment` evaluates false so the update is swallowed silently. The arc sweep slider has never worked.

```tsx
// PropertyBar.tsx — wrong key
<Input
  value={arcSegment.sweep}
  onChange={value => handlePropertyChange('endAngle', value)} />
// arcSegment = { startAngle, sweep, ratio } — 'endAngle' is not a key
```

**Fix:** Change the key string to `'sweep'`.

---

### 2. Rotation handle cursor never activates
**File:** `src/lib/tools/SelectTool.ts` · `setCursorForHandle`

`hitTestModifierHandle` in `Shape.ts` returns the string `'angle'`. The cursor switch checks `handleID.startsWith('angle-')` — with a trailing dash. This never matches. The rotation handle exists and is clickable, but the cursor never changes to indicate it.

```ts
// Shape.ts — what is returned
if (Math.abs(x - cx) <= s && Math.abs(y - cy) <= s) return 'angle'

// SelectTool.ts — what is checked
} else if (handleID.startsWith('angle-')) {  // never true — 'angle' ≠ 'angle-'
```

**Fix:** Change condition to `handleID === 'angle'`.

---

### 3. Skia rAF ID cancelled with browser cancelAnimationFrame
**File:** `src/lib/core/Renderer.ts` · `stopLoop`

`startLoop` uses `this.surf.requestAnimationFrame()` which returns a Skia surface rAF handle. `stopLoop` passes that handle to the browser's `cancelAnimationFrame()`. These are different systems — the cancel call is a silent no-op. The render loop only stops because `isRunning = false` causes `drawFrame` to early-return on the next tick.

```ts
// Renderer.ts
this.animationId = this.surf?.requestAnimationFrame(this.drawFrame)  // Skia handle

public stopLoop() {
  this.isRunning = false
  cancelAnimationFrame(this.animationId)  // browser API — wrong target
}
```

**Fix:** Remove the `cancelAnimationFrame` call. The `isRunning = false` guard is the correct stop mechanism. If needed, expose `surf.cancelAnimationFrame(id)` via the Skia bindings.

---

### 4. Debug rect drawn every frame — corrupts shared paint state
**File:** `src/lib/core/Renderer.ts` · `render`

A hardcoded rect is drawn using the shared `paintManager.paint` and `paintManager.stroke` before any scene shapes draw. This leaves those paint objects in whatever color/state they had from the last frame, which bleeds into any shape that calls `initFillPaint` / `initStrokePaint`.

```ts
// Renderer.ts ~line 108 — leftover debug code
const rect = this.resource.canvasKit.LTRBRect(10, 10, 250, 100)
skCnvs!.drawRect(rect, this.paintManager.paint!)   // corrupts shared paint
skCnvs!.drawRect(rect, this.paintManager.stroke!)  // corrupts shared stroke
this.sceneManager.draw(skCnvs)                     // runs after dirty paint
```

**Fix:** Delete both `drawRect` debug calls.

---

### 5. EngineStateStore module-level subscription never removed
**File:** `src/hooks/sceneStore.tsx` · module scope

The subscription at module level is registered on first import and never cleaned up. On hot reload or React StrictMode double-mount, multiple subscribers accumulate. Since `EngineStateStore` is a true singleton persisting across React lifecycles, every HMR cycle adds another active listener that fires on every shape update.

```ts
// sceneStore.tsx — module scope, runs once per import, never removed
EngineStateStore.getInstance().subscribe((shapeId) => {
  const state = useSceneStore.getState()
  // ... updates zustand store
})
// no unsubscribe handle stored, no cleanup mechanism
```

**Fix:** Store the returned unsubscribe handle. Expose a `cleanup()` from the store, or wire it into the Canvas unmount effect alongside `CanvasManager.destroy()`.

---

### 6. HistoryManager stale actions survive session reset
**File:** `src/lib/core/CanvasManager.ts` · `destroy` / `src/lib/core/HistoryManager.ts`

`CanvasManager.destroy()` never calls `HistoryManager.getInstance().clear()`. The singleton undo/redo stacks accumulate `UpdateShapeAction` instances referencing shape IDs from the old session. After reinit, calling undo looks up those IDs in `EngineStateStore`, finds `undefined`, and silently skips — but the stacks remain polluted and the undo count is misleading.

**Fix:** Add `HistoryManager.getInstance().clear()` inside `CanvasManager.destroy()`.

---

### 7. Input onChange fires only on Enter — blur discards edits
**File:** `src/ui/Input.tsx` · `onKeyDown` handler

The internal `current` state updates on every keystroke but `onChange(current)` is only called on Enter. If the user types a new value then clicks somewhere else, the `useEffect` syncs from the incoming prop and resets the field. Every property bar edit that doesn't end with Enter is silently discarded.

```tsx
// Input.tsx
onKeyDown={e => {
  if (e.key === 'Enter') onChange(current)  // only path that fires onChange
}}
// no onBlur handler — clicking away loses the typed value
```

**Fix:** Add `onBlur={() => onChange(current)}` to the input element.

---

## Memory Leaks — WASM Heap

### 8. Paragraph not deleted before replacement in PText
**File:** `src/lib/shapes/primitives/PText.ts` · `setUpParagraph`

Every call to `setUpParagraph()` — triggered on every keystroke, resize, cursor move, and selection change — builds a new Skia `Paragraph` via `this.builder.build()` and assigns it to `this.paragraph`. The previous paragraph object is never `.delete()`d, leaking its WASM backing memory. This accumulates for the entire session.

```ts
private setUpParagraph() {
  // ...
  this.paragraph = this.builder.build()  // old this.paragraph is leaked
  this.paragraph.layout(layoutWidth)
}
```

**Fix:** Add `if (this.paragraph) { this.paragraph.delete(); this.paragraph = null; }` before `this.builder.build()`.

---

### 9. SText creates Typeface per instance with no delete
**File:** `src/lib/shapes/primitives/SText.ts` · constructor

`SText` is instantiated in `ShapeModifier`'s constructor for the dimension label. Each new `ShapeModifier` creates a `Typeface` from raw font bytes via `MakeFreeTypeFaceFromData`. The typeface is never `.delete()`d — not in `SText.destroy()`, not in `SText.cleanUp()`, nowhere.

```ts
// SText.ts constructor
const typeface = this.resource.canvasKit
  .Typeface.MakeFreeTypeFaceFromData(this.resource.fontData[0])
this.font = new this.resource.canvasKit.Font(typeface, this.textStyle.fontSize)
// typeface reference not stored, never deleted
```

**Fix:** Store `this.typeface = typeface` and call `this.typeface.delete(); this.font.delete()` in `SText.destroy()`.

---

### 10. Per-frame Paint allocations in all shape modifier handle draws
**File:** `src/lib/shapes/base/Shape.ts`, `Oval.ts`, `Rect.ts`, `Star.ts`, `Polygon.ts`

Every call to `drawModifierHandles()` creates 2 `new cw.Paint()` objects and deletes them at the end. Sub-classes call `super.drawModifierHandles()` and then create their own — meaning an Oval with handles visible allocates 4 Paint objects per frame. At 60fps this is 240 WASM allocations per second for a single selected shape.

**Fix:** Create cached Paint objects once (e.g., static members on `ShapeModifier` or per-shape), reuse across frames, only update color/width when state changes.

---

### 11. EngineStateStore.shapeDataMap never purged
**File:** `src/lib/core/EngineStateStore.ts` · `createShapeData`

Every shape created via `ShapeFactory.createShape` inserts into `EngineStateStore.shapeDataMap`. When shapes are destroyed via `ShapeNode.destroy()` → `shape.destroy()`, no corresponding removal from `shapeDataMap` occurs. The map grows unboundedly throughout the session.

**Fix:** Add `removeShapeData(id: string)` to `EngineStateStore` and call it from `Shape.destroy()`.

---

### 12. Gradient and image shaders created every frame without cache or delete
**File:** `src/lib/core/PaintManager.ts` · `setPaint`

The shader cache calls are commented out. On every draw call for a gradient or image fill, new `Shader` objects are created via `Shader.MakeLinearGradient`, `Shader.MakeRadialGradient`, or `makeImageShader`, but never `.delete()`d. At 60fps with any gradient-filled shape, this is the most aggressive WASM leak in the codebase.

```ts
// PaintManager.ts — cache disabled, leak active
// const cached = this.shaderCache.get(key)
// if (cached) return cached
const shader = this.resource.canvasKit.Shader.MakeLinearGradient(...)
// this.shaderCache.set(key, shader)
return shader  // caller never deletes this
```

**Fix:** Re-enable the shader cache and implement invalidation keyed on fill property changes. Alternatively, call `shader.delete()` in `resetPaint()` if not caching.

---

### 13. Handles borrow shared PaintManager paints — cross-shape state bleed
**File:** `src/lib/modifiers/Handles.ts` · `createPaint`

`Handle.createPaint()` modifies `paintManager.paint` and `paintManager.stroke` in place and returns references to the same objects. Any Handle draw call contaminates the paint state for the next operation that uses these shared objects. This compounds the bug in issue #4.

**Fix:** Handles should own dedicated cached `Paint` objects (created once, deleted in cleanup), not borrow the shared PaintManager paints.

---

## Race Conditions & Lifecycle

### 14. Concurrent CanvasKit async init — guard check fires too early
**File:** `src/component/Canvas.tsx` · `load()` inside `useEffect`

The guard `if (canvasResourcesRef.current || canvasManagerRef.current) return` is checked synchronously before the awaited `CanvasKitInit()` call. If `load()` is invoked twice before either resolves (possible in React StrictMode timing), both calls pass the guard and both proceed to initialize, creating two `CanvasManager` instances and two `Renderer` loops on the same canvas element.

```ts
const load = async () => {
  cleanupExisting()
  if (canvasResourcesRef.current || canvasManagerRef.current) return  // checked here
  const canvasKit = await CanvasKitInit(...)  // both concurrent calls reach this
  // ...
  canvasManagerRef.current = new CanvasManager(canvasRef.current)  // double init
}
```

**Fix:** Use an `aborted` flag declared in the effect closure, set to `true` in the cleanup return. Check it after every `await` before applying state.

```ts
useEffect(() => {
  let aborted = false
  const load = async () => {
    const canvasKit = await CanvasKitInit(...)
    if (aborted) return  // effect cleaned up mid-flight
    // ... rest of init
  }
  load()
  return () => { aborted = true; cleanupExisting() }
}, [setCanvasManager])
```

---

### 15. canvasRef as useEffect dependency is meaningless
**File:** `src/component/Canvas.tsx` · `useEffect` deps array

`useRef` returns a stable object — its identity never changes between renders. Including `canvasRef` in the dependency array has no effect on when the effect re-runs. It conveys false intent and will trip future lint rules around stale closures.

```ts
useEffect(() => { ... }, [canvasRef, setCanvasManager])
//                        ^^^^^^^^^ never changes, never triggers re-run
```

**Fix:** Remove `canvasRef` from the dependency array.

---

### 16. VectorPath.recomputeBounds shifts all coordinates as a side effect
**File:** `src/lib/shapes/primitives/VectorPath.ts` · `recomputeBounds`

`recomputeBounds()` is called on every point mutation (`addPoint`, `insertPoint`, `removePoint`, `updatePoint`, `updateControlPoint`, `updateLastPoint`). It normalizes all points back to origin by subtracting `minX/minY` from every coordinate and adding them to the shape's transform. Code that reads point coordinates between two operations — common in `LineTool` and `PenTool` during mouse move — may be operating in a shifted coordinate space without knowing it.

**Fix:** Separate bounds computation from coordinate normalization. Only normalize on finalize (e.g., when the tool calls `finishPath()`), or document and enforce the invariant that coordinates must always be re-queried via `worldToLocal` after any mutation.

---

### 17. Tool replacement doesn't abort in-flight async operations
**File:** `src/lib/core/ToolManager.ts` · `setCurrentTool`

When `setCurrentTool` replaces a tool, `toolChange()` is called on the old tool, but any in-flight async operations (e.g., `ImageTool`'s file picker and image preloading callbacks) still hold a reference to the old tool's `this`. If those callbacks mutate the scene or shape manager after the new tool has taken over, the behavior is undefined and likely corrupts state.

**Fix:** Add an `aborted: boolean` flag to the base `Tool` class, set to `true` in `toolChange()`. Tools with async operations must check `this.aborted` before applying any state changes from async callbacks.

---

### 18. Throttle captures wrong `this` context
**File:** `src/lib/helper/throttle.ts`

The throttle wrapper uses `fn.apply(this, args)` inside a regular function, where `this` is whatever the call site provides — not the original function's intended `this`. For the current zustand usage this happens to be harmless, but the implementation is broken for any method function passed to it.

```ts
return function (...args: Parameters<T>) {
  if (now - lastCall >= limit) {
    fn.apply(this, args)  // `this` = call-site context, not fn's context
  }
}
```

**Fix:** Use `fn(...args)` directly (arrow function body), or accept an explicit `context` parameter.

---

## Architecture & Design

### 19. Engine layer directly calls React store — inverted dependency
**File:** `src/lib/core/ShapeManager.ts`, `src/lib/tools/keyboardTool.ts`

`ShapeManager` calls `useSceneStore.getState()` in its constructor and throughout its methods. This means the pure-JS engine layer has a hard compile-time dependency on Zustand and on the shape of the React store. The engine cannot be tested, instantiated, or reused without React. Any store schema change breaks engine code.

**Fix:** Invert the dependency. Pass a plain callback `onPropertiesChange: (props: Properties | null) => void` into `ShapeManager` from the React layer. The engine emits data; React subscribes and updates its own state. The engine stays framework-agnostic.

---

### 20. Module-level singleton cascade creates fragile cleanup choreography
**File:** `EngineStateStore.ts`, `HistoryManager.ts`, `CanvasKitResources.ts`, `DependencyManager.ts`

Four singletons with independent static lifetimes must be manually cleaned up in the correct order on every canvas teardown. A missed step in any destroy chain causes stale state bugs. HMR makes this worse — Vite may cache module exports across reloads, leaving singleton state from the previous session.

**Fix:** Group all per-session singleton state under a single `EngineSession` class, instantiated by `CanvasManager` and passed down to all subsystems. Replace `static instance` patterns with instance properties scoped to the session lifetime.

---

### 21. DI container mixes constructor injection and runtime resolve inconsistently
**File:** `src/lib/core/DependencyManager.ts` and usages across codebase

`CanvasManager` correctly uses constructor injection. But `Handle`, `ShapeModifier`, `SText`, `PText`, and all Tool subclasses call `container.resolve()` at construction time, creating an implicit dependency on the global container being populated at that exact moment. If any of these are instantiated before their dependencies are registered (or after `container.clear()`), `resolve()` returns `null` with only a `console.warn`.

**Fix:** Pick one strategy. Since shapes are created dynamically at runtime via `ShapeFactory`, the cleanest fix is to pass required services (particularly `paintManager`) as explicit constructor parameters through the factory.

---

### 22. EventQueue defined but entirely bypassed — dead infrastructure
**File:** `src/lib/core/EventQueue.ts`

The `EventQueue` bus defines 12 typed event types and a full subscriber/trigger system. A comment in `InputManager` states it "replaces the EventQueue for 1:1 input routing." The only remaining usage is `EventQueue.removeAllEvent()` in `CanvasManager.destroy()` — cleaning up a system nothing uses. ~150 lines of dead code.

**Fix:** Delete `EventQueue.ts` and the `EventQueue.removeAllEvent()` call in `CanvasManager.destroy()`.

---

### 23. TextEditor.ts is a complete unused implementation
**File:** `src/lib/shapes/base/TextEditor.ts`

`TextEditor.ts` implements a sophisticated span-based rich text model with style runs, split/merge, range operations, and adjacency merging — ~300 lines. `PText.ts` uses a simple flat string (`this.text`). `TextEditor` is never imported or referenced anywhere in the codebase.

**Fix:** Either delete it if rich text is out of scope, or wire it into `PText` as the backing model and remove the flat string implementation. Leaving competing implementations creates long-term confusion.

---

### 24. modifierUtility.ts is dead code — superseded by dragModifierHandle
**File:** `src/lib/modifiers/modifierUtility.ts`

All functions in this file (`updateShapeRadii`, `updateShapeDim`, `updateOvalRatio`, `updateStarRatio`, `updateShapeArc`, `updateShapeVertices`, `updateShapeAngle`) were the original modifier logic, since replaced by the `dragModifierHandle` virtual method pattern on each `Shape` subclass. The file is no longer imported or called anywhere.

**Fix:** Delete `modifierUtility.ts`.

---

### 25. Shared mutable Paint anti-pattern throughout draw pipeline
**File:** `src/lib/core/PaintManager.ts` · `get paint()` / `get stroke()`

`PaintManager` exposes two shared `Paint` objects via public getters. Every shape, handle, and modifier that draws mutates these objects then relies on `resetPaint()` being called at the right time to restore clean state. The call order is the only thing preventing color bleed between shapes — and the debug rect bug (issue #4) demonstrates this is already broken in practice.

**Fix:** The existing `makeNewPaint()` method is the correct pattern — create purpose-specific paints, use them, delete after use. The shared paints should be private implementation details used only for cases where a well-defined ownership model exists. Modifier handle paints should be cached instances on `ShapeModifier`, not borrowed from `PaintManager`.

---

### 26. App.tsx placeholder text in production header
**File:** `src/App.tsx` · line 9

The header element contains the literal string `'44544ffff'`. The `SideBar` component renders an empty div. These affect the workspace height calculation (`h-[calc(100vh-(36px))]`) and will confuse contributors.

```tsx
<header className={'header'}>44544ffff</header>
```

**Fix:** Implement the header or replace the text content with a proper component. If it's intentional scaffolding, at minimum remove the placeholder string.

---

## Issue Priority Matrix

| Priority | Issues |
|---|---|
| Fix immediately | #1 (arc sweep), #4 (debug rect), #3 (rAF cancel), #8 (paragraph leak) |
| Fix before next feature | #2 (cursor), #5 (subscription leak), #6 (history), #7 (input blur), #12 (shader leak) |
| Fix this sprint | #9, #10, #11, #13, #14, #15, #16 |
| Refactor backlog | #19, #20, #21, #17, #18 |
| Cleanup | #22, #23, #24, #25, #26 |