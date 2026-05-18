# CatalystReactor - Copilot Instructions

## Purpose

- This repository is a React + CanvasKit interactive editor.
- UI composition is intentionally thin; editor behavior is in `src/lib` managers, nodes, tools, and shapes.

## Runtime Architecture

- App shell in `src/App.tsx` mounts `SideBar`, `Canvas`, and `PropertyBar` (plus a simple header).
- `src/component/Canvas.tsx` is the bootstrapping boundary:
    - Loads CanvasKit wasm via `canvaskit-wasm/bin/canvaskit.wasm?url`.
    - Loads fonts through `CanvasKitResources.loadInterFont()`.
    - Initializes singleton `CanvasKitResources`.
    - Creates one `CanvasManager` per mounted canvas and stores it in Zustand (`useCanvasManagerStore`).
- `CanvasManager` registers core services in `DependencyManager` in this order:
    - `paintManager` -> `shapeModifier` -> `shapeManager` -> `sceneManager` -> `renderer` -> `inputManager` -> `toolManager`
- Service resolution for tools/managers relies on this container setup. If you add a new shared subsystem, register it here.

## Event and Input Flow

- Native events are captured by `InputManager` and re-emitted through synchronous `EventQueue` events:
    - Pointer: `pointer:down`, `pointer:move`, `pointer:up`
    - Keyboard: `key:down`, `key:up`
    - Surface/render orchestration: `create:surface`, `render:scene`
    - Tool lifecycle: `tool:change`
- `ToolManager` subscribes current tool handlers and keyboard handler to these events.
- `setCurrentTool` creates a fresh tool instance and emits `ToolChange`; this resets pointer state naturally per tool switch.
- `ToolManager.setUpEvent()` always unsubscribes then re-subscribes. Keep this idempotent behavior when modifying event plumbing.

## Scene Graph and Transform Rules

- Root scene is a `ContainerNode` with no shape (`new ContainerNode(null, null)`) and child nodes hold visible scene content.
- Hit-testing:
    - `SceneManager.flattenScene()` traverses descendants.
    - Collision checks are performed on reversed flattened order for topmost pick behavior.
- Transform system:
    - Every `SceneNode` stores `localMatrix` and `worldMatrix`.
    - Shape mutations mark `canComputeMatrix = true`; matrices are recomputed during `updateWorldMatrix()`.
    - Draw routines use local matrix concat (`canvas.concat(localMatrix)`) and parent propagation builds world matrices.
- Coordinate conversions (`worldToLocal`, `worldToParentLocal`, `localToWorld`) are used heavily in tool logic. Preserve these when refactoring drag/drop or container reparenting behavior.

## Layout Containers

- Container layouts are implemented by `ContainerNode.applyLayout()` using `LayoutEngine` helpers:
    - Flex-like: row/column (`gap`, `mainAlign`, `crossAlign`, `padding`)
    - Grid: `gridRowGap`, `gridColumnGap`, templates, auto flow
    - Frame: free positioning
- `ContainerNode.drawPaddingAndGap()` draws debug overlays for padding/gaps. If layout semantics change, update both layout math and debug visualization.
- Group creation (`GroupTool`) creates a plain rectangular shape node and attaches layout constraints based on container type.

## Tooling Behavior

- Base class is `src/lib/tools/Tool.ts`.
- All tools resolve `sceneManager` and `shapeManager` from `DependencyManager`.
- Default tool reset behavior: base `Tool.handlePointerUp()` sets Zustand tool to default select.
- Current concrete tools:
    - `SelectTool`: selection, modifier drag/resize/rotate, hover cursor updates, text double-click editing, container reparent-on-drop.
    - `ShapeTool`: creates geometric/text nodes via `ShapeFactory` and sizes on drag.
    - `GroupTool`: creates row/column/grid/frame containers and captures contained shapes after pointer up.
    - `ImageTool`: opens file picker immediately on tool creation, preloads selected images, places one image per click/drag until queue is empty.
    - `KeyboardTool`: text editing keys and arrow-key movement for selected shape.

## Shape and Property Pipeline

- Shape creation goes through `ShapeFactory.createShape` with `ShapeType` values.
- Scene attachment and modifier ownership are managed by `ShapeManager.attachNode`/`detachShape`.
- Property panel loop:
    - UI edits in `PropertyBar`
    - Local store update via `useSceneStore.updateProperty`
    - Runtime update via `shapeManager.updateProperty`
    - `SceneNode.setProperties` delegates to shape implementation
- `ShapeManager` throttles property sync back to store for drag operations and modifier updates.
- Any new editable shape property must be wired through:
    - shape `getProperties` / `setProperties`
    - `Properties` typing in `src/lib/types/shapes.ts`
    - `PropertyBar` controls and handlers
    - manager update path above

## Rendering and Resource Lifecycle

- `Renderer` creates a CanvasKit surface, preferring WebGL and falling back to GL v1 options.
- Render loop targets 60 FPS and flushes each frame.
- Scene drawing currently includes an additional debug rectangle in `Renderer.render`; preserve or remove intentionally when changing render output.
- `CanvasKitResources` owns shared CanvasKit objects (font manager, styles, path, canvasKit instance); call `dispose()` on teardown.
- `PaintManager` centralizes fill/stroke paint, gradient/image shader creation, and caches.

## Stores and UI State

- `useToolStore`:
    - active tool
    - default tool (`select`)
    - per-group remembered tool (`selectedByGroup`)
- `useCanvasManagerStore`:
    - active `canvasManager`
    - exposed `shapeManager` for React-side editing
- `useSceneStore`:
    - selected node properties
    - mutable property editing model for `PropertyBar`

## Build and Workflow Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tech stack: React 19, Vite 6, TypeScript, CanvasKit, Zustand.

## Import and Code Style Conventions

- Prefer TS path aliases (`@lib`, `@hooks`, `@ui`, `@/`) instead of long relative paths.
- Keep manager/tool wiring explicit and centralized; do not instantiate independent manager copies inside tools/components.
- Keep comments focused and brief. Avoid obvious narration comments.

## High-Impact Gotchas (Current Code)

- Event listeners in `InputManager` use `.bind(this)` inline for add/remove, which can break removal symmetry. If editing input lifecycle, convert to stable bound handlers to avoid leaked listeners.
- `EventQueue.unSubscribeAll(event)` removes all handlers for that event globally. Use carefully because one module can clear another module's listeners.
- `ShapeNode.destroy()` and `ContainerNode.destroy()` call parent destruction paths; changing deletion flow without care can cascade destruct unexpectedly.
- `ToolManager` imports `Tool` from `SelectTool` rather than base `Tool.ts`; fix carefully if touching type declarations there.
- `SceneNode.resource` expects `CanvasKitResources` initialized; manager/tool code that runs before canvas boot will fail.

## When Adding Features

- New tool:
    - Add tool class under `src/lib/tools`.
    - Support it in `ToolManager.setCurrentTool`.
    - Add UI entry in `ToolBar`/button groups.
    - Ensure `ToolType` union includes the new key.
- New shape:
    - Implement primitive under `src/lib/shapes/primitives`.
    - Register in `ShapeFactory`.
    - Verify modifier behavior and property panel integration.
- New shared service:
    - Register in `CanvasManager`.
    - Resolve from `DependencyManager` where needed.
    - Clean up in `destroy()` path.

## Copilot Expectations for This Repo

- Favor minimal, targeted edits over broad rewrites.
- Preserve existing architecture (container + event bus + manager graph) unless a task explicitly asks for redesign.
- Validate changes through the real runtime chain (tool -> manager -> scene -> render), not just type checks.
