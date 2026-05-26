/**
 * engine.ts
 * Concrete types for the CatalystReactor engine internals.
 * These replace the scattered `any` annotations across the codebase.
 */

import type { ColorProps } from './shapes'

// ── JSON-serializable hierarchy ──────────────────────────────────────────────
// Used wherever we do JSON.parse(JSON.stringify(…)) round-trips on shape
// property sub-sections (e.g. ShapeManager.updateSubProperty).

export type JsonPrimitive = string | number | boolean | null
export type JsonObject   = { [key: string]: JsonSerializable }
export type JsonArray    = JsonSerializable[]
export type JsonSerializable = JsonPrimitive | JsonObject | JsonArray

// ── ShapeManager helpers ──────────────────────────────────────────────────────

/**
 * Value passed to ShapeManager.updateStyle.
 * Both 'fill' and 'strokeColor' keys accept a ColorProps-shaped object.
 */
export type StyleUpdateValue = ColorProps

/**
 * Value passed to ShapeManager.updateSubProperty.
 * Any JSON-serializable value that can be placed inside a nested property
 * sub-section (e.g. stroke.width = 2  or  fill.color = '#ff0000').
 */
export type SubPropertyValue = JsonSerializable
