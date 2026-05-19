# CatalystReactor Production Readiness Audit

## 1. SOLID Principles
**[SOLID Principles] File: `src/lib/shapes/base/Shape.ts` — `Shape` class (lines 286-319)**
*   **Problem:** Contains over 20 empty default implementations (e.g., `getArcAngles()`, `getVertexCount()`, `insertText()`, `setBorderRadius()`) purely to avoid `instanceof` checks in `SceneNode`.
*   **Risk:** Violates Interface Segregation & Liskov Substitution. Subclasses are forced to inherit methods they don't support, and adding a new shape requires modifying the core abstract class, breaking the Open/Closed Principle.
*   **Fix:** Extract behavior into explicit interfaces (`TextEditable`, `ArcShape`) and use Type Guards (e.g., `isArcShape(shape): shape is ArcShape`) or the Visitor pattern when traversing.

**[SOLID Principles] File: `src/lib/shapes/base/Shape.ts` — Constructor (line 65); `src/lib/node/ContainerNode.ts` (line 18)**
*   **Problem:** High-level base modules directly invoke `container.resolve('paintManager')` during instantiation.
*   **Risk:** Violates Dependency Inversion. It forces a hard dependency on the global DI container, preventing these core classes from being unit-tested in isolation without mocking the entire container setup.
*   **Fix:** Pass `PaintManager` (or a `RenderContext` object) statically when shapes are instantiated, or pass the manager into the `draw(canvas, renderContext)` lifecycle phase.

## 2. DRY (Don't Repeat Yourself)
**[DRY] File: `src/lib/core/CanvasKitResource.ts` — `get resource()` accessor**
*   **Problem:** The exact same 8-line getter (`get resource() { const resources = CanvasKitResources.getInstance()... }`) is duplicated manually across `Renderer.ts` (lines 61-70), `PaintManager.ts` (lines 20-24), `Scene.ts` (lines 14-23), and `Shape.ts` (lines 82-91).
*   **Risk:** Code bloat and inconsistent null handling (some logs warn, some throw, some remain silent).
*   **Fix:** Export a central utility function `getCanvasKit()` or bind the resources explicitly within the `DependencyManager` for unified injection.

**[DRY] File: `src/component/PropertyBar.tsx` — Property merging logic (lines 18-50)**
*   **Problem:** Repetitive cloning and mutation logic exists between `handlePropertyChange`, `toggle`, and `handleColorChange` where they repetitively fetch `const { style } = currentShapeProperties` and merge changes manually.
*   **Risk:** High surface area for bugs (e.g., missing spread operators) where deeply nested updates accidentally mutate previous references.
*   **Fix:** Implement a specialized wrapper hook (`useUpdateShape()`) that centralizes the property merge logic and the dispatching to `shapeManager`.

## 3. Correctness and Runtime Safety
**[Correctness] File: `src/lib/core/PaintManager.ts` — `setPaint` (lines 68-109)**
*   **Problem:** The shader caching logic is commented out (`this.shaderCache.set(key, shader)` etc.), resulting in a new WASM shader allocation every frame via `MakeLinearGradient` and `MakeRadialGradient` *without* any accompanying `.delete()` call.
*   **Risk:** Severe WASM heap memory leak. The `Shader` references will accumulate until the CanvasKit runtime crashes with an out-of-memory exception.
*   **Fix:** Uncomment caching logic. If dynamic shaders are necessary, ensure that previously unused shaders are explicitly `.delete()`d when a shape's paint properties change, or implement a Least-Recently-Used (LRU) WASM garbage collection queue.

**[Correctness] File: `src/lib/core/Renderer.ts` — `makeSurface` (line 84 & 96)**
*   **Problem:** The function attempts to validate `this.resource` (line 84), but subsequently calls `this.resource.canvasKit.MakeWebGLCanvasSurface` on line 104 with unsafe fallback catches that assume the resource exists.
*   **Risk:** Unhandled null reference exceptions during component mounting if fonts haven't loaded yet, breaking the entire React render tree.
*   **Fix:** Change renderer initialization logic to strictly await a promise ensuring CanvasKit is fully hydrated before bridging WebGL.

## 4. Performance
**[Performance] File: `src/lib/shapes/primitives/Rect.ts` — `draw` (line 200)**
*   **Problem:** Execution of `const rect = this.resource.canvasKit.XYWHRect(...)` happens locally in the 60fps render loop.
*   **Risk:** CanvasKit's `XYWHRect` allocates a new Float32Array every single frame for every rectangle. It causes massive pressure on the Garbage Collector, producing micro-stutters during drags.
*   **Fix:** Cache the `Float32Array` on the class instance in the constructor, and update its coordinates in-place via index assignment (`this.bounds[0] = x`, `this.bounds[2] = w`, etc.) when `setDim()` or `setCoord()` is called.

**[Performance] File: `src/component/PropertyBar.tsx` — Zustand Subscription (line 15)**
*   **Problem:** Binds to the root of the store: `const { currentShapeProperties } = useSceneStore()`. 
*   **Risk:** When you drag a shape around the canvas, their coordinates update in the store. This granular event forces the entire `PropertyBar` component to re-render 60 times a second.
*   **Fix:** Use fine-grained Zustand selector logic (`useSceneStore(state => state.currentShapeProperties?.transform)`) or split fields into memoized presentation components.

## 5. Memory and Lifecycle
**[Memory] File: `src/lib/tools/SelectTool.ts` — `handleClickCount` (line 59)**
*   **Problem:** `this.clickTimer = setTimeout` schedules work but isn't cleared strictly if the tool is deactivated rapidly.
*   **Risk:** The callback executes against a potentially detached DOM element or corrupted `currentScene` state, causing race condition crashes.
*   **Fix:** Add `clearTimeout(this.clickTimer)` into `SelectTool.destroy()` and `SelectTool.toolChange()`. (Note: you do have partial coverage in `toolChange()` but it must be airtight in `destroy()`).

**[Memory] File: `src/lib/core/Renderer.ts` — `destroy` (lines 194-206)**
*   **Problem:** While `this.surf` is detached, `this.skCnvs` itself isn't explicitly nullified or managed. Hard reference chains left hanging.
*   **Risk:** Garbage collection of the primary canvas proxy is restricted.
*   **Fix:** Ensure everything instantiated from the WASM bridge in Renderer yields null strictly during teardown.

## 6. Coupling and Extensibility
**[Coupling] File: `src/lib/core/ShapeManager.ts` — `finishDrag` (line 60)**
*   **Problem:** Direct type checking: `if (this.scene instanceof ContainerNode)`.
*   **Risk:** Every time an equivalent layout container class is implemented, you have to find and modify `ShapeManager`.
*   **Fix:** Polymorphism. Have an abstract `SceneNode.applyLayoutIfNecessary()` method which defaults to no-op, and have `ContainerNode` override it.

**[Coupling] File: `src/lib/core/ToolManager.ts` — `setCurrentTool` (line 29)**
*   **Problem:** A monolithic 20-line switch statement hardcoding strings (`'row'`, `'oval'`, `'text'`) to concrete constructors (`new GroupTool`, `new ShapeTool`).
*   **Risk:** This breaks the Open-Closed principle completely. Tool implementation requires core file editing.
*   **Fix:** Implement a centralized ToolFactory or Registration map. Let tools self-register their activation keys at startup.

## 7. Code Organisation and Standards
**[Code Org] File: `src/lib/node/Scene.ts` — Proxy Boilerplate (lines 252-298)**
*   **Problem:** Almost 20 proxy methods simply pushing invocations to `this.shape?.method()`.
*   **Risk:** Incredible code bloat for no logical gain.
*   **Fix:** Encapsulate Shape access cleanly, exposing an interface `getInnerShape(): Shape`, and operate directly on the shape payload when node interactions require physical dimension properties.

**[Code Org] File: `src/lib/core/Renderer.ts` — Test code in prod (line 184)**
*   **Problem:** Lines 184-186: `const rect = this.resource.canvasKit.LTRBRect(10, 10, 250, 100); skCnvs!.drawRect(rect, this.paintManager.paint!);`
*   **Risk:** Hardcoded visual debug elements left directly in the production 60fps rendering pipeline.
*   **Fix:** Delete it.

## 8. React-Specific
**[React] File: `src/hooks/sceneStore.tsx` — `updateProperty` (line 24)**
*   **Problem:** The hook does a shallow clone via `...state.currentShapeProperties, [key]: value`. 
*   **Risk:** This means nested objects (`style`, `transform`, `borderRadius`) share object references. When `PropertyBar.tsx` pushes changes into `style`, React bypasses re-rendering mechanisms because the reference pointer to `style` hasn't mathematically changed under deep observation unless consumers spread meticulously (which they routinely fail to do).
*   **Fix:** Use `immer` (or native structuredClone) when updating deep Zustand architectures linked to external Canvas logic.

## 9. Architecture Smells
**[Arch Smells] File: `src/lib/node/Scene.ts` — "Delegated shape-specific methods" Comment**
*   **Problem:** Line 248's comment explicitly admits: "Delegated shape-specific methods (no instanceof needed)". Indirection was deliberately chosen over Type Guards.
*   **Risk:** You've built a fragile homogeny. Container logic is merged with Primitive logic.
*   **Fix:** Remove the homogenization. Allow `SceneNode` to contain distinct generic variants, or rely exclusively on Type Guards (`if (isContainerNode(node)) { ... }`).

**[Arch Smells] File: `src/lib/core/CanvasKitResource.ts` — `loadInterFont` (line 103)**
*   **Problem:** While looping over `fontMap`, line 103 arbitrarily fetches `/fonts/Inter-VariableFont_opsz,wght.ttf` as a hardcoded static requirement.
*   **Risk:** The overarching application engine is intrinsically chained to reading "Inter" locally, halting extensibility.
*   **Fix:** Centralize all default fonts directly within the `fontMap` configuration JSON.

---

### Ranked List of Top 10 Issues by Production Impact

1.  **WASM Memory Leak** (`PaintManager.ts` abandoned `.delete()` and PCache). — *Critical Crash.*
2.  **60fps Float32Array Allocations** (`Rect.ts` creating arrays inline). — *Performance / Jitter.*
3.  **PropertyBar Zustand Subscriptions** (`PropertyBar.tsx` over-subscribing). — *React Re-Render Lock.*
4.  **Liskov/OpenClosed Violation on Shapes** (`Shape.ts` default overrides). — *Extensibility block.*
5.  **SceneNode API Bloat** (`Scene.ts` boilerplate proxies). — *Code maintenance risk.*
6.  **Hard Dependency on Global DI** (`ContainerNode.ts`/`Shape.ts` using `container.resolve`). — *Tightly coupled architecture.*
7.  **Unchecked WASM Object Deletion** (`Renderer.ts` canvas surface lifecycles). — *Memory Leak.*
8.  **Test Code Left in Render Loop** (`Renderer.ts` drawing LTRBRect test). — *Visual bug.*
9.  **ToolManager Switch Statement** (`ToolManager.ts` stringly-typed mapping). — *Code modification risk.*
10. **Null Fallbacks Assuming Instance** (`Renderer.ts` unassigned CanvasKit). — *Race Condition Crash.*

### Files That Are "Safe" (Need No Major Changes)
*(Based on the provided codebase review scope)*
*   `src/lib/core/EventQueue.ts` (Standard queuing, isolated footprint)
*   `src/lib/helper/vector.ts` (Simple pure mathematical constructs)
*   `src/lib/helper/clamp.ts` / `debounce.ts` / `throttle.ts` (Self-contained, pure utils)
*   `src/lib/types/shapes.ts` (Static type definitions are safe)

### Estimated Effort Breakdown

**~1 Hour (Immediate Wins / Quick Refs)**
*   Removing the `Renderer.ts` test rectangle code.
*   Replacing `ContainerNode.ts` instanceof checks.
*   Removing the Hardcoded "Inter" font logic into `fonts.json`.
*   Fixing the `SelectTool.ts` timer clearing in destroy().
*   Updating `PropertyBar.tsx` to fix the `useSceneStore` granular subscription mapping.

**~1 Day (Moderate Refactoring / Deep Implementation)**
*   Consolidating the `CanvasKitResource.ts` repeated accessor patterns cleanly into DI bindings.
*   Fixing the WASM Pointer Memory leaks (`PaintManager.ts` caching, `.delete()` tracking arrays for Shaders/Paths). 
*   Refactoring primitive rendering (`Rect.ts`) to pre-allocate `Float32Array` buffers instead of inline instantiations.
*   Fixing Zustand shallow-clone issues with `immer`.

**~1 Week (Major Architectural Shifts)**
*   Purging the `SceneNode.ts` and `Shape.ts` indirection proxy boilerplate. Overhauling the generic `SceneGraph` node relationships using interfaces, composition, and proper Type Guards.
*   Eliminating global `container.resolve()` calls inside Shapes in favor of standard Dependency Injection.
*   Writing the dynamic `ToolRegistryFactory` to replace the massive Switch matrix in `ToolManager.ts`.
