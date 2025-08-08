# TODO.md

## 🎨 Color Picker Optimizations

### GradientPicker Component
- [ ] Remove duplicate `useEffect` that runs twice on mount
- [ ] Fix type switching logic - remove unnecessary gradient reassignment
- [ ] Extract gradient type validation into utility function
- [ ] Memoize `gradientTypeOptions` to prevent recreation on every render
- [ ] Add proper dependency array to `useEffect` or remove if not needed
- [ ] Create custom hook `useGradientTypeSwitch` for type switching logic
- [ ] Add error boundary for gradient picker components
- [ ] Optimize conditional rendering with early returns

### LinearGradientPicker Optimizations
- [ ] Extract gradient preview component into reusable `GradientPreview` component
- [ ] Optimize color stop rendering with `useMemo` for sorted stops
- [ ] Create custom hook `useGradientStops` for stop management (add, remove, update)
- [ ] Extract direction controls into separate `DirectionControls` component
- [ ] Memoize preset gradient buttons to prevent unnecessary re-renders
- [ ] Add debouncing for real-time input changes (offset, coordinates)
- [ ] Extract gradient angle calculation to utility function
- [ ] Optimize drag and drop for color stops reordering
- [ ] Remove console.log statements from production code
- [ ] Fix incomplete JSX mapping in direction presets

### RadialGradientPicker Optimizations  
- [ ] Create shared gradient stop logic between Linear and Radial pickers
- [ ] Extract center point controls into reusable component
- [ ] Optimize radius slider with better visual feedback
- [ ] Add preset radial gradients (similar to linear presets)
- [ ] Create shared gradient utilities (color stop validation, offset normalization)
- [ ] Implement gradient interpolation preview for better UX
- [ ] Add keyboard navigation for accessibility
- [ ] Optimize re-renders with `React.memo` and proper dependency arrays

### Shared Gradient Components
- [ ] Create `GradientStopEditor` component for reuse between Linear/Radial
- [ ] Extract `ColorStopList` component with drag-and-drop functionality
- [ ] Create `GradientPresetGrid` component for preset gradients
- [ ] Build `GradientPreview` component with angle display
- [ ] Implement `GradientExport` utility for CSS/canvas output
- [ ] Add `GradientValidator` for input validation
- [ ] Create `GradientAnimator` for smooth transitions between types

## 🔧 Shape Class Optimizations

### Extract Common Functions from Shape.ts
- [ ] Move `setPaint()` logic to separate utility class `PaintManager`
- [ ] Extract shader creation methods into `ShaderFactory` class:
  - [ ] `createLinearGradientShader(gradient, bounds)`
  - [ ] `createRadialGradientShader(gradient, bounds)`
  - [ ] `createImageShader(imageFill, bounds)`
  - [ ] `createSolidColorPaint(color)`
- [ ] Create `BoundingRectCalculator` utility class for common bounding rect operations
- [ ] Extract handle positioning logic into `HandlePositionCalculator`
- [ ] Move transform operations to `TransformManager` class
- [ ] Create `StyleManager` for fill/stroke management
- [ ] Extract resource management into `CanvasKitResourceManager`
- [ ] Remove repetitive paint initialization code

### Shape Refactoring Tasks
- [ ] Create base `Drawable` interface for common drawing operations
- [ ] Implement `Transformable` mixin for rotation/scale operations
- [ ] Extract `Selectable` behavior into separate concern
- [ ] Create `PropertyManager` for shape property serialization/deserialization
- [ ] Implement factory pattern for shape creation
- [ ] Add shape validation utilities
- [ ] Create shape cloning/copying utilities
- [ ] Fix incomplete gradient cases in `setPaint()` method
- [ ] Complete image and pattern fill implementations

### Resource Management
- [ ] Fix potential memory leaks in shader creation
- [ ] Implement proper cleanup for `resetPaint()` method
- [ ] Add resource pooling for frequently used paints
- [ ] Create automatic resource disposal on shape destruction
- [ ] Add error handling for CanvasKit resource failures

## 📝 Text Optimization (Standalone)

### Remove Shape Dependency
- [ ] Create standalone `TextRenderer` class independent of Shape hierarchy
- [ ] Implement `ITextDrawable` interface for text-specific operations
- [ ] Extract text measurement utilities to `TextMetrics` class
- [ ] Create `FontManager` for font loading and caching
- [ ] Implement `TextLayout` class for text positioning and wrapping
- [ ] Add `TextStyleManager` for font styling (size, weight, color, etc.)
- [ ] Create `TextSelection` utilities for cursor positioning and text selection
- [ ] Implement `TextEditor` component for inline text editing

### PText (Paragraph Text) Optimization
- [ ] Create `ParagraphLayout` engine for multi-line text
- [ ] Implement text flow algorithms (word wrapping, line breaking)
- [ ] Add support for rich text formatting (bold, italic, underline)
- [ ] Create `TextBlock` component for paragraph-level styling
- [ ] Implement text alignment utilities (left, center, right, justify)
- [ ] Add line spacing and paragraph spacing controls
- [ ] Create text overflow handling (ellipsis, scroll, auto-resize)
- [ ] Implement text search and replace functionality

### Text Performance
- [ ] Add text caching for unchanged content
- [ ] Implement virtual text rendering for large documents
- [ ] Optimize font metrics calculation
- [ ] Add text layout memoization
- [ ] Create efficient text change detection

## 🚀 Performance Improvements

### General Optimizations
- [ ] Implement object pooling for frequently created/destroyed objects
- [ ] Add lazy loading for gradient previews
- [ ] Optimize canvas rendering with dirty region tracking
- [ ] Implement virtual scrolling for large gradient preset lists
- [ ] Add request animation frame throttling for real-time updates
- [ ] Create efficient color space conversion utilities
- [ ] Implement worker threads for heavy gradient calculations
- [ ] Add proper error boundaries for component isolation

### Memory Management
- [ ] Audit and fix memory leaks in CanvasKit resources
- [ ] Implement proper cleanup for shader objects
- [ ] Add resource pooling for paint objects
- [ ] Create automatic garbage collection triggers
- [ ] Monitor and optimize bundle size
- [ ] Implement code splitting for gradient picker components

### Code Quality
- [ ] Remove all console.log statements from production code
- [ ] Add TypeScript strict mode compliance
- [ ] Implement proper error handling throughout
- [ ] Add loading states for async operations
- [ ] Create consistent naming conventions
- [ ] Add proper JSDoc documentation

## 🧪 Testing & Quality

### Unit Tests
- [ ] Add unit tests for gradient utilities
- [ ] Test shape transformation calculations
- [ ] Add text rendering test suite
- [ ] Test color conversion functions
- [ ] Add gradient interpolation tests
- [ ] Test gradient type switching logic

### Integration Tests
- [ ] Test gradient picker user interactions
- [ ] Add shape manipulation test scenarios
- [ ] Test text editing workflows
- [ ] Add performance regression tests

### Bug Fixes
- [ ] Fix `useEffect` running twice in GradientPicker
- [ ] Complete incomplete JSX mapping in LinearGradientPicker
- [ ] Fix gradient type validation edge cases
- [ ] Resolve CanvasKit resource null checks
- [ ] Fix incomplete switch cases in Shape.setPaint()

## ♿ Accessibility
- [ ] Keyboard-only operation for all pickers and editors
- [ ] Proper ARIA roles for sliders, lists, and buttons
- [ ] Color contrast and non-color cues for gradients

## 🧩 UX / Design
- [ ] Live CSS value copy (linear-gradient()/radial-gradient())
- [ ] Snap-to increments for angles/offsets/radius (e.g., 5%)
- [ ] Undo/redo for gradient and shape edits

## 🛠️ DX / Tooling
- [ ] ESLint + Prettier + strict TS config
- [ ] Storybook for pickers and text components
- [ ] Plop generators for new shapes/components

## 🔁 CI/CD & Quality Gates
- [ ] GitHub Actions: type-check, lint, test, build
- [ ] Bundle size check with threshold
- [ ] Visual regression tests (Chromatic/Playwright)

## 📈 Telemetry & Errors
- [ ] Error boundary with user-friendly fallback
- [ ] Optional analytics on feature usage (opt-in)
- [ ] Logging for CanvasKit resource failures

## 📚 Documentation
- [ ] Architecture overview (shapes, rendering, resources)
- [ ] Gradient model spec (stops, coords, units)
- [ ] Shape API docs and extension guide

## 🚢 Release Checklist
- [ ] Remove dev-only logs
- [ ] Verify memory cleanup for shaders/images
- [ ]

**Priority Order:** 
1. **Bug Fixes** (useEffect, incomplete JSX, console.logs)
2. **Color Picker Optimizations** (shared components, performance)
3. **Shape Refactoring** (extract utilities, resource management)  
4. **Text Standalone** (decouple from Shape)
5. **Performance & Testing**

**Next Sprint Focus:** Fix GradientPicker issues and create shared gradient components