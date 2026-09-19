# CatalystReactor Architecture Guide

A working reference for structuring a Figma-style canvas editor built on React + CanvasKit, and a safe migration path from the current codebase to that structure.

Written to be read once end to end, then kept open while refactoring.

---

## Table of contents

1. [How to use this document](#1-how-to-use-this-document)
2. [The core idea: a headless engine](#2-the-core-idea-a-headless-engine)
3. [Target module map](#3-target-module-map)
4. [Seam 1: the document](#4-seam-1-the-document)
5. [Seam 2: the journal and commands](#5-seam-2-the-journal-and-commands)
6. [Seam 3: the engine and the frame](#6-seam-3-the-engine-and-the-frame)
7. [Seam 4: tools](#7-seam-4-tools)
8. [Seam 5: the React bridge](#8-seam-5-the-react-bridge)
9. [WASM resource ownership](#9-wasm-resource-ownership)
10. [Migration plan](#10-migration-plan)
11. [Enforcement, so it does not drift back](#11-enforcement-so-it-does-not-drift-back)
12. [What to deliberately not build](#12-what-to-deliberately-not-build)
13. [Decisions and open questions](#13-decisions-and-open-questions)
14. [Appendix A: target file layout](#appendix-a-target-file-layout)
15. [Appendix B: refactor safety rules](#appendix-b-refactor-safety-rules)

---

## 1. How to use this document

This is not a spec to implement in order from top to bottom. Sections 2 through 9 describe the destination. Section 10 is the only part with an order, and it is designed so that **every single step leaves the app working and shippable**.

The rule for the whole migration: if a step cannot be finished in one sitting and verified by running the app, it is too big and needs splitting.

If you only read two sections, read [section 2](#2-the-core-idea-a-headless-engine) and [section 10](#10-migration-plan).

---

## 2. The core idea: a headless engine

### 2.1 What it means

A headless engine is one that can open a document, apply changes, query the scene, and produce a frame **without React, without Zustand, and without a browser canvas being mounted**.

This is not an aesthetic preference. It is a load-bearing constraint, and everything good in this architecture falls out of it:

- Undo works reliably, because state lives in one place that can be snapshotted.
- Tests become possible, because you can construct an editor in a test file.
- Dragging stops re-rendering React, because React is not in the mutation path.
- Multiple canvases stop fighting, because nothing is a module-level singleton.
- Save and load become almost free, because the document is already serializable data.

### 2.2 The test

The single question that tells you whether the boundary is real:

> Can I write a test file that creates an editor, creates a rectangle, moves it, undoes the move, and asserts the position, **without importing React, Zustand, or mounting a DOM canvas**?

Concretely, this file should compile and pass:

```ts
// src/engine/__tests__/headless.test.ts
import { describe, expect, test } from 'vitest'
import { createEditor } from '@engine/createEditor'
import { CreateShape } from '@engine/commands/CreateShape'
import { TranslateNodes } from '@engine/commands/TranslateNodes'

describe('headless editor', () => {
    test('create, move, undo', () => {
        const editor = createEditor() // no canvas, no React

        const id = editor.run(new CreateShape('rect', { x: 0, y: 0, width: 100, height: 100 }))
        editor.run(new TranslateNodes([id], 40, 0))

        expect(editor.doc.get(id)!.properties.x).toBe(40)

        editor.undo()
        expect(editor.doc.get(id)!.properties.x).toBe(0)

        editor.redo()
        expect(editor.doc.get(id)!.properties.x).toBe(40)
    })
})
```

Notice what is absent: no CanvasKit init, no `Canvas.tsx`, no `useSceneStore`. Rendering is a **consumer** of the document, not a prerequisite for mutating it.

If you get this test green, most of the architecture problems in the audit are structurally impossible afterwards.

### 2.3 Why the current code is not headless

Not because it is badly written. Because of a handful of specific imports that quietly tie the engine to the UI framework:

| Place | What it does | Why it blocks headless |
| --- | --- | --- |
| `Tool.handlePointerUp()` | calls `useToolStore.setDefaultTool()` | engine layer imports Zustand |
| `SnapManager` | reads `useSceneStore.gridSize` | engine layer imports Zustand |
| `DependencyManager` | module-level singleton container | two editors share one container |
| `EngineStateStore` | module-level singleton | state survives unmount, leaks between tests |
| `HistoryManager` | module-level singleton | same |
| `SnapManager` | module-level singleton | same |
| `ShapeManager` | mutates shape objects directly | no single place to journal changes |
| `Renderer` | owns the rAF loop and the surface together | cannot render without a real canvas |

Every one of these is a small, local fix. None require rewriting the scene graph, the layout engine, the shapes, or the tools' actual logic. That is the good news and the reason this refactor is worth doing.

### 2.4 The dependency rule

```
  ui/          React components, panels, toolbars
    │  imports ↓
  bridge/      hooks that subscribe the UI to the engine
    │  imports ↓
  engine/      document, commands, scene, tools, renderer, skia
    │  imports ↓
  core/        pure math: matrix, rect, path, bounds, layout
```

Imports only ever point downward. Information travels back up as **events**, never as imports.

Two hard consequences, worth internalising:

- `engine/` may never `import` anything from `ui/`, `bridge/`, `hooks/`, or any Zustand store. Not once, not for convenience.
- `core/` may not import CanvasKit. It is pure TypeScript with no WASM dependency, which is what makes matrix and layout tests trivial to write.

---

## 3. Target module map

```
src/
  core/                      pure, dependency-free math
    matrix.ts                Mat2D compose/invert/apply
    rect.ts                  Rect, union, intersects, contains
    bounds.ts                world-bounds computation
    layout/
      flex.ts                row/column solver  (from LayoutEngine)
      grid.ts                grid solver
    path/
      pathdata.ts            path command list, no Skia

  engine/                    headless. no react, no zustand, no DOM
    createEditor.ts          composition root, returns an Editor
    Editor.ts                the public engine API surface
    document/
      DocumentModel.ts       THE source of truth
      journal.ts             JournalEntry types + inversion
      entity.ts              EntityRecord, EntityId
      serialize.ts           toJSON / fromJSON + formatVersion
    commands/
      Command.ts             interface
      CommandManager.ts      transactions, undo/redo, merge
      CreateShape.ts
      DeleteNodes.ts
      UpdateProperties.ts
      TranslateNodes.ts
      ReparentNodes.ts
      ReorderNodes.ts
      EditPath.ts
    scene/
      SceneManager.ts        projection of doc into a drawable tree
      SceneNode.ts           transforms, cached world matrix + bounds
      hitTest.ts             broad phase + exact
      SnapManager.ts         takes gridSize as a value, not from a store
    tools/
      ToolContext.ts         everything a tool is allowed to touch
      Tool.ts                base
      registry.ts            id -> factory + metadata
      SelectTool.ts
      ShapeTool.ts
      PathTool.ts            shared base for line / pen / bezier
      EditTool.ts
      GroupTool.ts
      ImageTool.ts
    render/
      Renderer.ts            draws a doc+scene to a surface
      FrameScheduler.ts      dirty flag + coalesced rAF
      Surface.ts             owns the CanvasKit surface lifecycle
      PaintCache.ts          descriptor -> immutable paint
      TextCache.ts           entity -> Paragraph, invalidated by version
      ResourceScope.ts       WASM ownership
      CanvasKitResources.ts  process-wide, shared, initialised once
    events/
      EngineBus.ts           typed emitter, engine -> outside world

  bridge/                    the ONLY place react meets the engine
    EditorProvider.tsx       creates one Editor per canvas
    useEditor.ts
    useEntity.ts             useSyncExternalStore on the bus
    useSelection.ts
    useHistoryState.ts

  ui/                        react only. never imports engine/ internals
    Canvas.tsx               mounts the surface, forwards pointer events
    ToolBar.tsx
    PropertyBar.tsx
    LayersPanel.tsx
    SideBar.tsx
```

Shapes are absent from this map on purpose. Section 4.4 explains where they go.

---

## 4. Seam 1: the document

### 4.1 Why one document model

Right now truth is split three ways:

- `EngineStateStore.shapeDataMap` holds properties
- the scene graph holds hierarchy and z-order
- `useSceneStore.currentShapeProperties` holds a React copy

Three copies means three ways to disagree, and you already have a confirmed divergence in `useSceneStore.updateProperty`. Every feature you add on top multiplies that risk: delete, group, reorder, copy/paste, save, load.

One model holds all three concerns.

### 4.2 The shape of it

```ts
// engine/document/entity.ts
export type EntityId = string

export interface EntityRecord {
    id: EntityId
    type: ShapeType
    properties: Properties     // keep your existing fat Properties for now
    parentId: EntityId | null
    version: number            // bumped on every property write
}
```

`version` is small and pays for itself constantly. It is how the text cache, the path cache, and `useSyncExternalStore` all know whether their copy is stale, without deep comparison.

```ts
// engine/document/DocumentModel.ts
export class DocumentModel {
    private entities = new Map<EntityId, EntityRecord>()
    private order = new Map<EntityId, EntityId[]>()   // parentId -> ordered child ids
    readonly rootId: EntityId = 'root'

    // ---- queries (no mutation, safe to call from anywhere) ----
    get(id: EntityId): EntityRecord | undefined
    has(id: EntityId): boolean
    childrenOf(id: EntityId): readonly EntityId[]
    parentOf(id: EntityId): EntityId | null
    indexOf(id: EntityId): number
    ancestorsOf(id: EntityId): EntityId[]
    descendantsOf(id: EntityId): EntityId[]
    all(): IterableIterator<EntityRecord>

    // ---- mutations (only reachable through a transaction) ----
    insert(record: EntityRecord, parentId: EntityId, index?: number): void
    remove(id: EntityId): void
    setProperties(id: EntityId, patch: Partial<Properties>): void
    reparent(id: EntityId, newParentId: EntityId, index: number): void
    reorder(id: EntityId, index: number): void
}
```

Two rules that matter more than they look:

**Flat map, not a nested tree.** Lookup by id is O(1), diffs are cheap, serialization is flat, and you never have to walk a tree to find something. Hierarchy lives in `parentId` plus the `order` map. This is what tldraw does and what Figma's document model effectively is.

**No Skia handles, no functions, no class instances inside `EntityRecord`.** It must be `structuredClone`-able and `JSON.stringify`-able. If you can serialize it, you can undo it, save it, diff it, and send it over a wire later. This single constraint is what makes everything downstream cheap.

### 4.3 The asset problem, fix it before the format sets

Right now image fills can end up with binary data living inside `Properties`. Do not let that survive into the document model, because the moment you serialize it, the format is locked.

```ts
// properties reference assets, never embed them
interface ImageFill {
    type: 'image'
    assetId: string          // key into AssetRegistry
    scaleMode: ScaleMode
    transform: Mat2D
}
```

```ts
// engine/render/AssetRegistry.ts
class AssetRegistry {
    private bytes = new Map<string, Uint8Array>()   // the durable part
    private gpu = new Map<string, Image>()          // the CanvasKit part, disposable
}
```

Only `bytes` goes in a save file. `gpu` is a cache you rebuild on load. Splitting these two now costs an afternoon; splitting them after you have saved documents costs a migration.

### 4.4 Where shapes live

The `Shape` classes and `SceneNode` do not go away. They change role.

- `EntityRecord` is **data**: what the shape is.
- `SceneNode` + `Shape` are a **projection**: how it draws, how it hit-tests, what handles it offers.

The scene tree is derived from the document and kept in sync by the same change events that drive React. This is the model Figma and Excalidraw actually use, and it is why ECS is the wrong answer here: your objects are heterogeneous, nested, and each has genuinely different draw and hit-test behaviour. Putting that behaviour in classes is correct. Putting the *data* in classes is what causes the pain, and that is the part this fixes.

---

## 5. Seam 2: the journal and commands

### 5.1 Stop hand-writing undo

Currently `UpdateShapeAction` does a `structuredClone` of the whole `Properties` bag per change. That is expensive per keystroke, and every new command type means hand-writing a matching `undo()`, which is exactly where undo bugs come from.

Replace it with a journal. `DocumentModel` records what it actually changed, and the inverse is derived mechanically.

```ts
// engine/document/journal.ts
export type JournalEntry =
    | { kind: 'props';    id: EntityId; before: Partial<Properties>; after: Partial<Properties> }
    | { kind: 'insert';   record: EntityRecord; parentId: EntityId; index: number }
    | { kind: 'remove';   record: EntityRecord; parentId: EntityId; index: number }
    | { kind: 'reparent'; id: EntityId; from: [EntityId, number]; to: [EntityId, number] }

export function invert(entry: JournalEntry): JournalEntry {
    switch (entry.kind) {
        case 'props':
            return { kind: 'props', id: entry.id, before: entry.after, after: entry.before }
        case 'insert':
            return { ...entry, kind: 'remove' }
        case 'remove':
            return { ...entry, kind: 'insert' }
        case 'reparent':
            return { kind: 'reparent', id: entry.id, from: entry.to, to: entry.from }
    }
}
```

Every mutating method on `DocumentModel` appends one entry while a transaction is open:

```ts
setProperties(id: EntityId, patch: Partial<Properties>): void {
    const rec = this.entities.get(id)
    if (!rec) return

    const before: Partial<Properties> = {}
    const after: Partial<Properties> = {}

    for (const key of Object.keys(patch) as (keyof Properties)[]) {
        if (Object.is(rec.properties[key], patch[key])) continue   // no-op writes never journal
        before[key] = rec.properties[key]
        after[key] = patch[key]
        rec.properties[key] = patch[key]!
    }

    if (Object.keys(after).length === 0) return

    rec.version++
    this.record({ kind: 'props', id, before, after })
    this.touch(id)
}
```

Note the two details doing real work: **only changed keys are journaled**, so no whole-object clones, and **no-op writes journal nothing**, so a property panel re-emitting the same value does not pollute the undo stack.

### 5.2 Commands

```ts
// engine/commands/Command.ts
export interface Command {
    readonly label: string           // shown in UI, useful in logs
    readonly mergeKey?: string       // consecutive commands with the same key coalesce
    apply(doc: DocumentModel, ctx: CommandContext): void
}
```

A command does not implement `undo()`. It only describes a forward mutation. The journal provides the inverse. This is the single biggest reduction in ongoing effort in the whole design, and it is why every future feature gets undo for free instead of as extra work.

```ts
// engine/commands/TranslateNodes.ts
export class TranslateNodes implements Command {
    readonly label = 'Move'
    readonly mergeKey: string

    constructor(private ids: EntityId[], private dx: number, private dy: number) {
        this.mergeKey = `translate:${ids.join(',')}`
    }

    apply(doc: DocumentModel) {
        for (const id of this.ids) {
            const p = doc.get(id)!.properties
            doc.setProperties(id, { x: p.x + this.dx, y: p.y + this.dy })
        }
    }
}
```

### 5.3 The command manager

```ts
// engine/commands/CommandManager.ts
interface Transaction {
    label: string
    mergeKey: string | null
    entries: JournalEntry[]
    touched: Set<EntityId>
}

export class CommandManager {
    private undoStack: Transaction[] = []
    private redoStack: Transaction[] = []
    private open: Transaction | null = null
    private limit = 200

    constructor(private doc: DocumentModel, private bus: EngineBus) {}

    /** one-shot command: begin, apply, commit */
    run(cmd: Command): void {
        this.begin(cmd.label, cmd.mergeKey ?? null)
        cmd.apply(this.doc, this.ctx)
        this.commit()
    }

    /** for drags: begin once on pointerdown, apply many times, commit on pointerup */
    begin(label: string, mergeKey: string | null = null): void
    apply(cmd: Command): void
    commit(): void
    abort(): void          // reverts the open transaction, for Esc during a drag

    undo(): void
    redo(): void
    get canUndo(): boolean
    get canRedo(): boolean
}
```

`abort()` is easy to overlook and very worth having. Pressing Escape mid-drag should put everything back exactly, and with a journal it is three lines instead of a special case per tool.

### 5.4 Drags

```
pointerdown  ->  commands.begin('Move', 'translate:a,b')
pointermove  ->  commands.apply(new TranslateNodes(ids, dx, dy))   // many times
pointerup    ->  commands.commit()                                  // ONE undo entry
Escape       ->  commands.abort()                                   // clean revert
```

This replaces the current throttle workaround. The throttle exists to stop history flooding. Once a drag is one transaction, the throttle is only about how often React repaints the property panel, which is a UI concern and belongs in the bridge, not in `ShapeManager`.

### 5.5 On `serialize()`

Do not add a required `serialize()` method to the `Command` interface right now. You declined the persistence phase, which means nothing would call it, nothing would test it, and it would silently drift out of sync with the real command behaviour until the day you need it.

The journal already gives you a serializable change log, because `JournalEntry` is plain data by construction. When you want persistence or sync, you serialize **journal entries**, not commands. That is a better target anyway: entries are uniform and small, commands are many and varied.

---

## 6. Seam 3: the engine and the frame

### 6.1 Separate the surface from the loop

Today `Renderer` owns the CanvasKit surface, the rAF loop, and the draw code all together, which is why nothing can render without a real canvas. Split into three:

```ts
// engine/render/Surface.ts        owns the WebGL surface + resize, nothing else
// engine/render/FrameScheduler.ts owns the dirty flag + rAF, no Skia at all
// engine/render/Renderer.ts       draw(scene, canvas), pure given a canvas
```

`Renderer.draw` takes a canvas argument instead of reaching for one. That alone makes it testable and makes offscreen or export rendering possible later without touching it.

### 6.2 Stop rendering when nothing changed

```ts
// engine/render/FrameScheduler.ts
export class FrameScheduler {
    private dirty = false
    private rafId: number | null = null
    private running = false

    constructor(private frame: () => void) {}

    request(): void {
        this.dirty = true
        if (this.rafId !== null || !this.running) return
        this.rafId = requestAnimationFrame(() => {
            this.rafId = null
            if (!this.dirty) return
            this.dirty = false
            this.frame()
        })
    }

    start(): void { this.running = true; this.request() }
    stop(): void {
        this.running = false
        if (this.rafId !== null) cancelAnimationFrame(this.rafId)
        this.rafId = null
    }
}
```

Who calls `request()`:

- `CommandManager.commit()` and `undo()` / `redo()`
- tools, during drags, on every pointer move
- `Surface` on resize
- selection changes, since handles are drawn

Idle cost drops to zero. On a laptop this is the difference between the fan running while the app sits open and it not.

### 6.3 Dirty tracking, phase two

Once scheduling works, add partial redraw:

```ts
interface RenderRequest {
    ids: Set<EntityId> | 'all'
    structural: boolean        // hierarchy or z-order changed, world matrices need recompute
}
```

- `structural: false` and a small id set means only recompute world matrices for those subtrees.
- `structural: true` means recompute from the affected node down.

Do not attempt dirty-rectangle compositing. The win is small compared to the complexity, and Skia's own clip handling already gets you most of it. Skipping the matrix recompute walk is where the real saving is.

### 6.4 Culling and hit testing

Cache world bounds on each `SceneNode`, invalidated by the same `version` counter used elsewhere. Then:

- **Render**: skip nodes whose world bounds do not intersect the viewport.
- **Hit test**: filter candidates by bounds first, then run exact `pointInShape` on the survivors.

Start with a flat array of `{ id, bounds }` kept in z-order. It is roughly eighty lines and handles low thousands of shapes comfortably. Add an R-tree only when a benchmark says the linear scan is actually the bottleneck. An R-tree you added on advice rather than measurement is code you maintain for no reason.

---

## 7. Seam 4: tools

### 7.1 ToolContext is the whole fix

The reason `Tool` imports Zustand is that it needs `setDefaultTool`. Give it that capability through a context object instead of an import, and the dependency inverts correctly with almost no code change.

```ts
// engine/tools/ToolContext.ts
export interface ToolContext {
    // read
    readonly doc: DocumentModel
    readonly scene: SceneManager
    readonly viewport: Viewport
    readonly snap: SnapManager
    readonly selection: readonly EntityId[]

    // write (the only way)
    run(cmd: Command): void
    begin(label: string, mergeKey?: string): void
    apply(cmd: Command): void
    commit(): void
    abort(): void

    // engine services, not react
    select(ids: EntityId[]): void
    setTool(id: ToolId): void
    setCursor(cursor: string): void
    requestRender(): void
}
```

Then `Tool.handlePointerUp()` becomes `ctx.setTool(ctx.defaultToolId)` and the Zustand import is gone. The React side is what listens for `tool:changed` on the bus and updates `useToolStore`. Information flows up as an event; nothing flows down as an import.

The same move fixes `SnapManager`: it receives `gridSize` as a constructor value or a setter, and React pushes changes in. It never reads a store.

### 7.2 Explicit tool state

```ts
type SelectState =
    | { phase: 'idle' }
    | { phase: 'marquee'; origin: Point }
    | { phase: 'dragging'; startDoc: Point; ids: EntityId[] }
    | { phase: 'handle'; handle: HandleId; pivot: Point; startBounds: Rect }
```

A discriminated union instead of scattered booleans. It makes illegal states unrepresentable and it makes the tool readable six months from now.

### 7.3 Merge the path tools

`LineTool`, `PenTool`, and `BezierTool` are near-duplicates. One `PathTool` base with a mode parameter removes three copies of the same snap, close-path, and finish logic. This is not architecture, it is just cheaper maintenance, but it is worth doing while you are in the file anyway.

### 7.4 Registry

```ts
// engine/tools/registry.ts
export const toolRegistry = {
    select: { create: (ctx: ToolContext) => new SelectTool(ctx), label: 'Select', shortcut: 'v' },
    rect:   { create: (ctx: ToolContext) => new ShapeTool(ctx, 'rect'), label: 'Rectangle', shortcut: 'r' },
    // ...
} satisfies Record<string, ToolDefinition>

export type ToolId = keyof typeof toolRegistry
```

`ToolId` is now derived from the registry rather than maintained as a parallel union. The `freeform` and `scale` toolbar entries that have no implementation become a compile error instead of a runtime surprise.

Do this one **late**. It is a real improvement but it is not blocking anything, and doing it before the tools are stable means doing it twice.

---

## 8. Seam 5: the React bridge

### 8.1 One provider, one editor

```tsx
// bridge/EditorProvider.tsx
const EditorCtx = createContext<Editor | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
    const [editor] = useState(() => createEditor())
    useEffect(() => () => editor.dispose(), [editor])
    return <EditorCtx.Provider value={editor}>{children}</EditorCtx.Provider>
}
```

`createEditor()` builds its own `DependencyManager` instance, its own `DocumentModel`, `CommandManager`, `SnapManager`, `SceneManager`. No module-level singletons. Two providers means two fully independent editors, which is what makes tests isolated and multi-canvas possible.

The one legitimate exception is `CanvasKitResources`: the WASM module and fonts are expensive, process-wide, and genuinely shared. Initialise it once, outside any editor, and document why in a comment so nobody "fixes" it later.

### 8.2 useSyncExternalStore, and delete the duplicate state

This is the piece that removes `EngineStateStore` plus `useSceneStore.currentShapeProperties` as separate copies of the same data.

```ts
// bridge/useEntity.ts
export function useEntity(id: EntityId | null): EntityRecord | null {
    const editor = useEditor()

    return useSyncExternalStore(
        useCallback(
            (onChange) => editor.bus.on('document:changed', (e) => {
                if (id && e.ids.includes(id)) onChange()
            }),
            [editor, id],
        ),
        useCallback(() => (id ? editor.doc.get(id) ?? null : null), [editor, id]),
    )
}
```

React reads from the document directly. There is no second copy to drift. `PropertyBar` becomes a controlled component over engine state, and the bug where a UI edit never reaches the engine becomes structurally impossible rather than fixed-by-vigilance.

### 8.3 Throttle at the bridge, not in the engine

During a drag the engine emits `document:changed` on every frame. React does not need sixty property-panel repaints per second.

```ts
// bridge/useEntityThrottled.ts   ~50ms is imperceptible in a number field
```

Throttle here, in the bridge. The engine stays exact, and the UI decides how often it wants to look. This is the right place for that decision, and it removes the throttle from `ShapeManager` where it currently sits.

### 8.4 Canvas becomes dumb

```tsx
// ui/Canvas.tsx
// 1. mount a <canvas>
// 2. hand the element to editor.attach(canvasEl)
// 3. that's it
```

Pointer events are attached by `InputManager` inside the engine. `Canvas.tsx` stops being the bootstrap for the whole application and becomes a mount point. The StrictMode double-mount guard stays, but it now guards `attach` / `detach` rather than the entire engine's construction, which is much harder to get wrong.

---

## 9. WASM resource ownership

This section is short and it is the one you should not defer. CanvasKit gives you no garbage collection. Every `Paint`, `Path`, `Paragraph`, `Typeface`, `Shader`, `Image`, `Picture`, and `ParagraphBuilder` you create stays in the WASM heap until you call `.delete()` on it.

The failure mode is not a visible bug. It is a tab that slowly grows to two gigabytes over an hour of editing and then dies, taking unsaved work with it. No benchmark in a phased plan catches this, because it measures frame time, not heap.

### 9.1 Paints: cache, never mutate

```ts
// engine/render/PaintCache.ts
export class PaintCache {
    private cache = new Map<string, Paint>()

    constructor(private ck: CanvasKit) {}

    get(desc: FillDescriptor): Paint {
        const key = hashFill(desc)
        let paint = this.cache.get(key)
        if (!paint) {
            paint = buildPaint(this.ck, desc)
            this.cache.set(key, paint)
        }
        return paint            // callers treat this as IMMUTABLE
    }

    dispose(): void {
        for (const p of this.cache.values()) p.delete()
        this.cache.clear()
    }
}
```

The rule that kills paint contamination as a category of bug: **nothing mutates a paint it did not create**. A draw call that needs a variation asks for a different descriptor. There is no shared mutable paint anywhere in the codebase.

### 9.2 Everything else: an owning scope

```ts
// engine/render/ResourceScope.ts
export class ResourceScope {
    private owned: { delete(): void }[] = []

    track<T extends { delete(): void }>(resource: T): T {
        this.owned.push(resource)
        return resource
    }

    dispose(): void {
        for (let i = this.owned.length - 1; i >= 0; i--) this.owned[i].delete()
        this.owned.length = 0
    }
}
```

One scope per entity for per-entity resources, one per editor for shared ones. When an entity is removed, its scope is disposed. When the editor is disposed, everything unwinds in reverse order.

### 9.3 Text is the one that will bite you

`Paragraph` objects are large and are rebuilt constantly if you are not careful.

```ts
// engine/render/TextCache.ts
interface CachedParagraph {
    paragraph: Paragraph
    version: number      // the EntityRecord.version it was built from
    width: number        // layout width it was built for
}
```

Rebuild only when `version` or `width` changed. Delete the old one before replacing it. Building a paragraph per frame per text node is the single fastest way to exhaust the WASM heap in this kind of app.

### 9.4 Make leaks visible

```ts
if (import.meta.env.DEV) {
    setInterval(() => {
        console.debug('[skia]', {
            paints: paintCache.size,
            paragraphs: textCache.size,
            scopes: scopeRegistry.size,
        })
    }, 5000)
}
```

Twenty lines. If those numbers climb while the app sits idle, you have a leak and you find it in minutes instead of a weekend.

---

## 10. Migration plan

The ordering principle here is different from the plan you were given. Each step is:

- **small enough to finish in one sitting**
- **independently verifiable by running the app**
- **independently revertable** (one branch, one merge)

No step depends on a later step. You can stop after any of them and be in a better place than you started. That property is what prevents a half-finished refactor from becoming a worse codebase.

---

### Step 0: baseline

**Goal:** know that you can tell when you have broken something.

- Tag the current commit: `git tag pre-refactor`
- Fix the 118 ESLint errors. Almost all are `no-unused-vars`, so prefix unused callback params with `_`. Delete the ones that reveal genuinely dead locals.
- Write down, in a file, five things you will manually check after every step: create a rect, drag it, resize it, undo, switch tools. This is your smoke test until Step 3 gives you a real one.

**Verify:** `npm run lint` and `npm run build` both clean.

**Revert:** trivial, nothing structural changed.

---

### Step 1: stop the leaks

**Goal:** the app can be left open for an hour without growing unboundedly.

- Add `ResourceScope` and `PaintCache` as described in section 9.
- Route paint creation through the cache. Remove every place that mutates a shared paint.
- Add the `TextCache` with version-based invalidation.
- Add the dev-only resource counter.

**Verify:** open the app, create a text node, edit it for two minutes, watch the counter. It should plateau, not climb. Check the same for creating and deleting shapes repeatedly.

**Revert:** additive, nothing else depends on it yet.

**Why first:** it is the only item on this whole list that can destroy a user's work, and it is independent of everything else.

---

### Step 2: delete the dead code

**Goal:** what you read is what runs.

- Delete `src/lib/core/toImplement.ts`
- Delete `src/lib/modifiers/{Handles,modifier,modifierUtility}.ts`
- Delete `PathOperator` and `BooleanAction`
- Delete `EventQueue` entirely, including the `removeAllEvent()` call in `CanvasManager.destroy()`
- Remove the `freeform` and `scale` toolbar entries that have no implementation

**Verify:** app runs, build clean. If something breaks, the file was not dead and you have learned something useful.

**Revert:** `git revert`, it is one commit of deletions.

**Why here:** doing this before the structural work means you refactor less code, and it means AI agents working in the repo stop wiring new features into dormant pipelines.

---

### Step 3: the test harness

**Goal:** a safety net exists before you touch anything load-bearing.

- Add Vitest.
- Write tests for the **pure math only**: matrix compose and invert, world-to-local round trips, `LayoutEngine` row/column/grid, `SnapManager` grid results, rect intersection.
- These need no CanvasKit and no React, so they are easy and fast.

**Verify:** `npm run test` green, and it runs in under two seconds.

**Revert:** additive.

**Why here:** Steps 4 through 7 change how data flows. Without these tests you are refactoring blind, and the layout and matrix code is exactly the kind that breaks silently.

---

### Step 4: dirty-gated rendering

**Goal:** idle costs nothing.

- Extract `FrameScheduler` from `Renderer`.
- Gate the frame on the dirty flag.
- Call `requestRender()` from: history changes, tool drags, resize, selection changes.

**Verify:** open devtools performance, sit idle, confirm no frames. Then drag a shape and confirm it is smooth.

**Revert:** one file plus a handful of call sites.

**Why here:** it is nearly independent of the state work, it is the most visible improvement, and it is a morale win before the long stretch.

---

### Step 5: ToolContext

**Goal:** `engine/` no longer imports Zustand.

- Define `ToolContext`.
- Change `Tool` and subclasses to take it in the constructor.
- Replace `useToolStore.setDefaultTool()` with `ctx.setTool(...)`.
- Replace `SnapManager`'s `useSceneStore.gridSize` read with a value passed in.
- `ToolManager` builds the context and holds the `setTool` implementation, which emits on the bus. React listens and updates `useToolStore`.

**Verify:** grep the engine directories for `useToolStore` and `useSceneStore`. Zero results. Run the smoke test.

**Revert:** contained to `tools/` plus `SnapManager` plus `ToolManager`.

**Why here:** it is a mechanical change with no behaviour difference, and it removes the dependency that would otherwise make Step 6 much harder.

---

### Step 6: DocumentModel, behind the existing API

**Goal:** one source of truth, without a big-bang cutover.

This is the largest step and the one that needs the most discipline. Use a strangler pattern:

1. Write `DocumentModel` and `journal.ts` as new files. Test them headlessly. Nothing uses them yet.
2. Make `EngineStateStore` a **thin facade over `DocumentModel`**, keeping its existing public methods (`createShapeData`, `getShapeData`, `getAllShapeData`, `subscribe`, `notify`). Every caller keeps working unchanged.
3. Move hierarchy and z-order into `DocumentModel`. `SceneManager` now derives its tree from the document rather than owning it.
4. Move `ShapeFactory` to create an `EntityRecord` plus a projection node.
5. Only now, one caller at a time, switch reads to `doc.get(id)` and delete the facade method it used.

**Verify:** after each of the five sub-steps, run the app and the smoke test. Do not batch them.

**Revert:** each sub-step is its own commit. If sub-step 3 goes wrong, revert 3 and keep 1 and 2.

**Why the facade matters:** it decouples "build the new model" from "change every consumer". Those are the two halves of the risk and doing them in the same commit is how refactors go bad.

---

### Step 7: journal-backed commands

**Goal:** every mutation is undoable, and undo is derived rather than hand-written.

- Add transaction methods to `DocumentModel`.
- Write `CommandManager` per section 5.3.
- Convert `UpdateShapeAction` to `UpdateProperties`.
- Add `CreateShape`, `DeleteNodes`, `ReparentNodes`, `ReorderNodes`, `EditPath` one at a time. After each one, manually verify that it undoes correctly.
- Convert drags to `begin` / `apply` / `commit`.
- Wire `CanvasManager.undo` / `redo` to the command manager and delete the stubs.
- Cap the undo stack.

**Verify:** headless test from section 2.2 passes. Then manually: create, group, reparent, edit a path, edit text, and undo all of it in reverse. This is the step where you should be most paranoid.

**Revert:** per command type, since they land individually.

---

### Step 8: cut React over, delete the duplicates

**Goal:** no second copy of shape state.

- Add `EditorProvider`, `useEditor`, `useEntity`.
- Switch `PropertyBar` to `useEntity` plus `commands.run(new UpdateProperties(...))`.
- Switch `LayersPanel` to read hierarchy from `doc`.
- Delete `useSceneStore.currentShapeProperties` and `updateProperty` entirely.
- Move the drag throttle from `ShapeManager` to the bridge hook.

**Verify:** edit a property in the panel, confirm the canvas updates. Drag on canvas, confirm the panel updates. Undo, confirm both update. This third case is the one that was broken before.

**Revert:** contained to `bridge/` and three UI components.

---

### Step 9: per-editor instances

**Goal:** no module-level singletons except `CanvasKitResources`.

- `DependencyManager` stops exporting a module singleton. `createEditor()` builds one.
- `SnapManager` and `CommandManager` become per-editor.
- `Canvas.tsx` becomes a mount point, `editor.attach(el)`.

**Verify:** render two `EditorProvider`s side by side in a scratch route. Draw in both. They should not interfere. Delete the scratch route afterwards or keep it as a dev page.

---

### Steps 10+: only when something hurts

In rough order of likely usefulness, and each gated on an actual symptom:

| Do this | When this happens |
| --- | --- |
| Tool and shape registries | adding a tool means editing five files and you have done it twice |
| Merge the path tools | you fix the same bug in `PenTool` and `BezierTool` |
| World-bounds culling | frames get slow with a realistic document |
| Flat bounds array for hit test | pointer move feels laggy |
| R-tree | the flat array shows up in a profile |
| Multi-fill and material compiler | you actually want layered fills |
| Persistence and save/load | you want to keep a document between sessions |
| Serializable journal for sync | you want collaboration |

Note what is at the bottom. Collaboration is a large, separate project. The architecture above does not block it and gives you the right seam for it, which is all you need right now.

---

## 11. Enforcement, so it does not drift back

Architecture rules that are not automated decay within weeks. Three cheap guards:

**Import boundaries.** Add `dependency-cruiser` or `eslint-plugin-boundaries`:

```js
// .dependency-cruiser.js
forbidden: [
    {
        name: 'engine-must-be-headless',
        severity: 'error',
        from: { path: '^src/engine' },
        to: { path: '^src/(ui|bridge|hooks)|^node_modules/(react|zustand)' },
    },
    {
        name: 'core-has-no-skia',
        severity: 'error',
        from: { path: '^src/core' },
        to: { path: 'canvaskit-wasm' },
    },
]
```

This is the single highest-value line of config in the project. Without it, the first time a shortcut is one import away, someone takes it, and it always looks harmless at the moment it is written.

**The headless test in CI.** It is one test, and it fails the moment the boundary breaks in a way the lint rule misses.

**Keep `AGENTS.md` current.** You already maintain it and `.github/copilot-instructions.md`. Add the dependency rule to both, explicitly, with the reason. AI agents will otherwise happily reintroduce a Zustand import into a tool because it is locally the simplest fix.

---

## 12. What to deliberately not build

Each of these has an argument for it. Each is wrong for this project right now.

**ECS.** Entity-Component-System pays off with thousands of homogeneous entities on a hot per-frame path, which describes a game, not a design editor. Your objects are heterogeneous, nested, and each has genuinely different draw and hit-test behaviour. Figma, tldraw, and Excalidraw all use node trees or flat record stores, not ECS. The `EntityRecord` plus flat map in section 4 already gives you the parts of ECS that actually help here: id-indexed data, cheap iteration, separable caches. Adopting real ECS would be a rewrite in exchange for nothing.

**`serialize()` on the Command interface.** Covered in section 5.5. Interface methods with no caller rot.

**R-trees, before measuring.** Covered in section 6.4.

**Dirty-rectangle compositing.** The complexity is real and the win over viewport culling plus Skia's clipping is small.

**A WGSL or GLSL shader layer.** Skia's `ColorFilter` and `ImageFilter` cover blurs, blends, and effects. Bypassing Skia means reimplementing text, paths, and antialiasing. That is a different product.

**CRDTs.** Only when you actually have two users.

A note on the "industry standard" reference material you were comparing against: treat it carefully. Its own code sample calls `MakeLinearGradient` with an empty first argument, so it was never run. Its headline recommends ECS while its own comparison table says scene graphs are what design tools use. And its claim that a nested object tree "will crash the browser" is not true as stated. Some of its individual ideas are good. It is not a source to plan against.

---

## 13. Decisions and open questions

Recording these so future-you knows what was deliberate rather than accidental.

| Decision | Choice | Revisit when |
| --- | --- | --- |
| ECS vs scene graph | scene graph with flat entity records | never, realistically |
| Undo mechanism | journal-derived inverse, not hand-written `undo()` | never |
| `Properties` shape | keep one fat object for now | a profile shows GC pressure from cloning |
| Hit test index | flat bounds array first | a profile shows the linear scan dominating |
| Command serialization | serialize journal entries, not commands | persistence or sync work starts |
| Persistence | deferred, but `formatVersion` goes in the envelope from day one | you want documents to survive a reload |
| Render loop | explicit rAF, dirty-gated | never |
| `CanvasKitResources` | the one permitted global | never |
| Behaviour location | in `Shape` classes, not in systems | never |

One item worth settling early even though persistence is deferred: put `formatVersion: 1` in `DocumentModel.toJSON()` now. It costs one line and it is the difference between a cheap migration and a painful one later.

---

## Appendix A: target file layout

Reproduced from section 3 for reference while working. The point is not that your tree must match this exactly. The point is the four-tier split and the direction of imports.

```
src/
  core/        pure math, no skia, no react, no zustand
  engine/      headless: document, commands, scene, tools, render
  bridge/      the only place react touches the engine
  ui/          react components
```

Everything else is detail.

---

## Appendix B: refactor safety rules

Rules for not destroying working code, which was the stated concern and is the right one.

**One branch per step.** Merge to main only when the app runs and the smoke test passes. Never have two steps in flight.

**dont use inline ignore script to avoid what you can fix by just following the insturction the error specified

**Tag before you start.** `git tag pre-refactor` already gives you an escape hatch. Tag before each large step too.

**Strangler, never big-bang.** Build the new thing beside the old one. Make the old API a facade over the new implementation. Migrate callers one at a time. Delete the facade last. Step 6 is built entirely around this.

**Never refactor and change behaviour in the same commit.** If a bug surfaces while you are restructuring, write it down and fix it in a separate commit afterwards. Mixed commits are impossible to bisect.

**Run the app after every sub-step.** Not after every step. Every sub-step. The cost of finding a break immediately is minutes. The cost of finding it three sub-steps later is an evening.

**If a step has been open for more than two days, it was too big.** Stop, revert to the last green state, split it, start again. This feels like losing work. It is not. A half-migrated codebase is worse than either endpoint.

**Keep a running note of what you deliberately did not fix.** Otherwise you either forget it or you get pulled into fixing it mid-step, which is how steps become too big.

---

## Closing note

The architecture above is not more ambitious than the plan you were already given. It is smaller. Steps 0 through 9 are the whole thing, they can be done in the order written, and stopping after any of them leaves you better off.

The parts that carry almost all the value are Step 1, Step 4, and Steps 6 through 8. Everything else is either cleanup or deferred until a symptom justifies it.

One last thought worth weighing. `AGENTS.md` and `copilot-instructions.md` are already done and are probably the highest-value artifacts from the sessions that produced this plan. The refactor below produces no new user-visible capability. If CatalystReactor is meant to be used, or to be shown to people, Steps 0 through 4 plus shipping one real feature will serve you better than completing all nine before anyone sees it.
