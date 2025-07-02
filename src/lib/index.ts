// Core exports
export * from './core';
export * from './shapes';
export * from './modifiers';

// Default exports for direct access
export { default as CanvasManager } from './core/CanvasManager';
export { default as Shape } from './shapes/base/Shape';
export { default as Rectangle } from './shapes/primitives/Rect';
export { default as Oval } from './shapes/primitives/Oval';
export { default as DimensionModifier } from './modifiers/DimensionModifier';