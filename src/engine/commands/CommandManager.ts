import { DocumentModel } from '@/engine/document/DocumentModel'
import type { CommandContext } from '@/engine/commands/CommandContext'
import type { Command } from '@/engine/commands/Command'
import type { EntityId } from '@/engine/document/entity'
import { invert, type JournalEntry } from '@/engine/document/journal'
import { requestRender } from '@/engine/render/renderRequest'
import type { EngineBus } from '@/engine/events/EngineBus'
import type { EngineEvents } from '@lib/core/EngineEvents'

export interface Transaction {
    label: string
    mergeKey: string | null
    entries: JournalEntry[]
    touched: Set<EntityId>
}

function entryId(entry: JournalEntry): EntityId {
    return entry.kind === 'props' || entry.kind === 'reparent' ? entry.id : entry.record.id
}

export class CommandManager {
    private undoStack: Transaction[] = []
    private redoStack: Transaction[] = []
    private open: Transaction | null = null
    private limit = 200
    private ctx: CommandContext
    private lastCanUndo = false
    private lastCanRedo = false

    constructor(
        private doc: DocumentModel,
        private bus: EngineBus<EngineEvents>
    ) {
        this.ctx = { doc }
    }

    run(cmd: Command): void {
        if (this.open !== null) {
            cmd.apply(this.doc, this.ctx)
            return
        }
        this.begin(cmd.label, cmd.mergeKey ?? null)
        cmd.apply(this.doc, this.ctx)
        this.commit()
    }

    begin(label: string, mergeKey: string | null = null): void {
        this.doc.beginTransaction()
        this.open = { label, mergeKey, entries: [], touched: new Set() }
    }

    apply(cmd: Command): void {
        cmd.apply(this.doc, this.ctx)
    }

    commit(): void {
        if (this.open === null) return
        const open = this.open
        this.open = null
        const entries = this.doc.commitTransaction()
        if (entries.length === 0) return
        open.entries = entries
        for (const entry of entries) open.touched.add(entryId(entry))

        const top = this.undoStack[this.undoStack.length - 1]
        if (open.mergeKey !== null && top !== undefined && top.mergeKey === open.mergeKey) {
            top.entries.push(...open.entries)
            for (const id of open.touched) top.touched.add(id)
        } else {
            this.undoStack.push(open)
            if (this.undoStack.length > this.limit) {
                this.undoStack.splice(0, this.undoStack.length - this.limit)
            }
        }
        this.redoStack.length = 0
        this.emitHistoryState()
        this.emitDocumentChanged(open.touched)
    }

    abort(): void {
        if (this.open === null) return
        this.open = null
        this.doc.abortTransaction()
        this.emitHistoryState()
    }

    undo(): void {
        const top = this.undoStack.pop()
        if (top === undefined) return
        for (let i = top.entries.length - 1; i >= 0; i--) {
            this.doc.applyEntry(invert(top.entries[i]))
        }
        this.redoStack.push(top)
        this.emitHistoryState()
        this.emitDocumentChanged(new Set(top.entries.map(entryId)))
        requestRender()
    }

    redo(): void {
        const top = this.redoStack.pop()
        if (top === undefined) return
        for (const entry of top.entries) {
            this.doc.applyEntry(entry)
        }
        this.undoStack.push(top)
        this.emitHistoryState()
        this.emitDocumentChanged(new Set(top.entries.map(entryId)))
        requestRender()
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0
    }

    private emitHistoryState(): void {
        const canUndo = this.canUndo
        const canRedo = this.canRedo
        if (canUndo === this.lastCanUndo && canRedo === this.lastCanRedo) return
        this.lastCanUndo = canUndo
        this.lastCanRedo = canRedo
        this.bus.emit('history:changed', { canUndo, canRedo })
        requestRender()
    }

    private emitDocumentChanged(touched: Set<EntityId>): void {
        const ids = [...touched]
        if (ids.length === 0) return
        this.bus.emit('document:changed', { ids })
        requestRender()
    }
}
