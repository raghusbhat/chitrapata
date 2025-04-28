import { create } from "zustand";
import { Shape, Point, ResizeHandle, ShapeType } from "../lib/webgl/types";
import { v4 as uuidv4 } from "uuid";

interface SelectionState {
  selectedShapeId: string | null;
  activeHandle: ResizeHandle | null;
  initialMousePos: Point | null;
  initialShapeBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

interface CanvasState {
  shapes: Shape[];
  selectedShapeId: string | null;
  selectedShapeIds: string[];
  draggedShapeId: string | null;
  isMultiSelecting: boolean;
  multiSelectRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  scale: number;
  canvasOffset: { x: number; y: number };
  isDragging: boolean;
  isResizing: boolean;
  isDrawing: boolean;
  currentDrawingTool: ShapeType | null;
  lastMousePosition: { x: number; y: number } | null;
  zoom: number;
  pan: Point;
  selectionState: SelectionState;
  cache: {
    flattenedShapes: Shape[];
    needsUpdate: boolean;
  };

  // Basic shape operations
  addShape: (shape: Partial<Shape>) => string;
  updateShape: (id: string, updatedProps: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;
  setSelectedShapeId: (id: string | null) => void;
  setSelectedShapeIds: (ids: string[]) => void;
  toggleShapeSelection: (id: string) => void;
  setDraggedShapeId: (id: string | null) => void;
  setMultiSelecting: (isSelecting: boolean) => void;
  setMultiSelectRect: (
    rect: { x: number; y: number; width: number; height: number } | null
  ) => void;
  setScale: (scale: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsResizing: (isResizing: boolean) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setCurrentDrawingTool: (tool: ShapeType | null) => void;
  setLastMousePosition: (position: { x: number; y: number } | null) => void;
  reorderShapes: (newShapeOrder: string[]) => void;

  // Hierarchy operations
  createGroup: () => void;
  ungroup: (groupId: string) => void;
  createFrame: (params: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    name?: string;
  }) => void;
  moveShapeToParent: (shapeId: string, parentId: string | null) => void;
  getPathToRoot: (shapeId: string) => string[];

  // Helper methods
  getShapeById: (id: string) => Shape | undefined;
  getDescendantIds: (id: string) => string[];
  getFlattenedShapes: () => Shape[];
  getChildShapes: (id: string) => Shape[];
  invalidateCache: () => void;
  generateId: () => string;
  getNextZIndex: () => number;
  duplicateSelectedShapes: () => void;

  // Resize operations
  startResizing: (
    id: string,
    handle: ResizeHandle,
    mousePos: Point,
    shapeBounds: { x: number; y: number; width: number; height: number }
  ) => void;
  resizeSelectedShape: (
    currentMousePos: Point,
    maintainAspectRatio?: boolean
  ) => void;
  endResizing: () => void;
  getSelectedShape: () => Shape | null;
}

function calculateRotationAngle(center: Point, point: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI);
}

function calculateGroupBounds(shapes: Shape[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Find the min and max points
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    // Consider absolute transform if available
    const x = shape.absoluteTransform?.x ?? shape.x;
    const y = shape.absoluteTransform?.y ?? shape.y;
    const width = shape.width;
    const height = shape.height;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function calculateBoundsForChildren(shapes: Shape[]): {
  width: number;
  height: number;
} {
  if (shapes.length === 0) {
    return { width: 0, height: 0 };
  }

  // Find the min and max points for all child shapes
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const shape of shapes) {
    // Get the bounds of this shape
    const left = shape.x;
    const top = shape.y;
    const right = shape.x + shape.width;
    const bottom = shape.y + shape.height;

    // Update the min/max values
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  }

  // Calculate width and height
  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  shapes: [],
  selectedShapeId: null,
  selectedShapeIds: [],
  draggedShapeId: null,
  isMultiSelecting: false,
  multiSelectRect: null,
  scale: 1,
  canvasOffset: { x: 0, y: 0 },
  isDragging: false,
  isResizing: false,
  isDrawing: false,
  currentDrawingTool: null,
  lastMousePosition: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectionState: {
    selectedShapeId: null,
    activeHandle: null,
    initialMousePos: null,
    initialShapeBounds: null,
  },
  cache: {
    flattenedShapes: [],
    needsUpdate: true,
  },

  // Helper to invalidate the cache
  invalidateCache: () =>
    set((state) => ({
      cache: {
        ...state.cache,
        needsUpdate: true,
      },
    })),

  // Helper to generate unique IDs
  generateId: () => uuidv4(),

  // Helper to get next z-index
  getNextZIndex: () => {
    const shapes = get().shapes;
    return (
      shapes.reduce((max, shape) => Math.max(max, shape.zIndex || 0), 0) + 1
    );
  },

  // Get shape by ID (memoized)
  getShapeById: (id: string) => {
    return get().shapes.find((s) => s.id === id);
  },

  // Get all descendant IDs of a shape
  getDescendantIds: (id: string) => {
    const result: string[] = [];
    const shapes = get().shapes;

    const collectDescendants = (shapeId: string) => {
      const shape = shapes.find((s) => s.id === shapeId);
      if (!shape || !shape.childIds?.length) return;

      for (const childId of shape.childIds) {
        result.push(childId);
        collectDescendants(childId);
      }
    };

    collectDescendants(id);
    return result;
  },

  // Get flattened list of shapes for rendering (with proper transform)
  getFlattenedShapes: () => {
    const state = get();

    // Use cached result if available
    if (!state.cache.needsUpdate && state.cache.flattenedShapes.length > 0) {
      return state.cache.flattenedShapes;
    }

    // Find all root shapes (no parent)
    const rootShapes = state.shapes.filter((s) => !s.parentId);
    const result: Shape[] = [];

    // Process shapes in hierarchy order for correct z-index
    const processShape = (
      shape: Shape,
      parentTransform?: Shape["absoluteTransform"]
    ) => {
      // Calculate absolute transform based on parent
      const absoluteTransform = {
        x: (parentTransform?.x || 0) + shape.x,
        y: (parentTransform?.y || 0) + shape.y,
        rotation: (parentTransform?.rotation || 0) + (shape.rotation || 0),
        scale: parentTransform?.scale || 1,
      };

      // Create a new shape with absolute transform for rendering
      const transformedShape = {
        ...shape,
        absoluteTransform,
      };

      // Add to result
      result.push(transformedShape);

      // Process children
      if (shape.childIds?.length) {
        // Get actual child shapes
        const childShapes = shape.childIds
          .map((id) => state.shapes.find((s) => s.id === id))
          .filter(Boolean) as Shape[];

        // Sort by zIndex
        childShapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        // Process each child
        for (const childShape of childShapes) {
          processShape(childShape, absoluteTransform);
        }
      }
    };

    // Sort root shapes by zIndex
    rootShapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // Process each root shape
    for (const rootShape of rootShapes) {
      processShape(rootShape);
    }

    // Use setTimeout to defer state update to prevent setState during render issues
    setTimeout(() => {
      set((state) => ({
        cache: {
          ...state.cache,
          flattenedShapes: result,
          needsUpdate: false,
        },
      }));
    }, 0);

    return result;
  },

  // Get path from shape to root (for breadcrumb/selection)
  getPathToRoot: (id: string) => {
    const result: string[] = [];
    const shapes = get().shapes;

    let currentId = id;
    while (currentId) {
      result.push(currentId);
      const shape = shapes.find((s) => s.id === currentId);
      if (!shape || !shape.parentId) break;
      currentId = shape.parentId;
    }

    return result.reverse();
  },

  // Get direct children of a container
  getChildShapes: (id: string) => {
    const shapes = get().shapes;
    const parent = shapes.find((s) => s.id === id);

    if (!parent || !parent.childIds?.length) return [];

    return parent.childIds
      .map((childId) => shapes.find((s) => s.id === childId))
      .filter(Boolean) as Shape[];
  },

  // Add a new shape
  addShape: (shape) => {
    const { generateId, getNextZIndex } = get();
    const id = generateId();

    // The incoming shape should already have defaults applied
    // from getDefaultPropertiesForShape in Canvas.tsx.
    // We just need to ensure required fields have fallbacks.

    const newShape: Shape = {
      id,
      name:
        shape.name || `${shape.type || "rectangle"} ${get().shapes.length + 1}`,
      type: shape.type || "rectangle",
      x: shape.x !== undefined ? shape.x : 0,
      y: shape.y !== undefined ? shape.y : 0,
      width: shape.width !== undefined ? shape.width : 100,
      height: shape.height !== undefined ? shape.height : 100,
      rotation: shape.rotation !== undefined ? shape.rotation : 0,
      // Use provided fill, or default to white if somehow missing
      fill: shape.fill !== undefined ? shape.fill : "#FFFFFF",
      // Use provided stroke, or default to black
      stroke: shape.stroke !== undefined ? shape.stroke : "#000000",
      // Use provided strokeWidth, or default to 2 (consistent with Canvas.tsx)
      strokeWidth: shape.strokeWidth !== undefined ? shape.strokeWidth : 2,
      zIndex: shape.zIndex || getNextZIndex(),
      isVisible: shape.isVisible !== false,
      isLocked: shape.isLocked || false,
      parentId: shape.parentId,
      childIds: shape.childIds || [],
      isContainer: shape.isContainer || false,
      // Ensure other potential properties from Partial<Shape> have defaults
      clipContent: shape.clipContent || shape.type === "frame",
      autoResize: shape.autoResize || shape.type === "group",
    };

    set((state) => {
      // If this shape has a parent, add it to the parent's childIds
      let updatedShapes = [...state.shapes];

      if (newShape.parentId) {
        const parentIndex = updatedShapes.findIndex(
          (s) => s.id === newShape.parentId
        );
        if (parentIndex !== -1) {
          const parent = updatedShapes[parentIndex];
          updatedShapes[parentIndex] = {
            ...parent,
            childIds: [...parent.childIds, newShape.id],
          };
        }
      }

      return {
        shapes: [...updatedShapes, newShape],
        selectedShapeId: id,
        selectedShapeIds: [id],
      };
    });

    return id;
  },

  // Update shape
  updateShape: (id, updatedProps) => {
    set((state) => {
      const shapeIndex = state.shapes.findIndex((shape) => shape.id === id);
      if (shapeIndex === -1) return state;

      const updatedShapes = [...state.shapes];
      const currentShape = updatedShapes[shapeIndex];

      // Check if we're updating parentId
      const oldParentId = currentShape.parentId;
      const newParentId = updatedProps.parentId;

      // Apply the updates to the current shape
      updatedShapes[shapeIndex] = {
        ...currentShape,
        ...updatedProps,
      };

      // Update the shape after applying updates
      const updatedShape = updatedShapes[shapeIndex];

      // Auto-resize group if this is a child shape that's been modified
      if (currentShape.parentId) {
        const parentIndex = updatedShapes.findIndex(
          (s) => s.id === currentShape.parentId
        );

        if (parentIndex !== -1) {
          const parent = updatedShapes[parentIndex];

          // Only auto-resize if parent is a group with autoResize property
          if (parent.type === "group" && parent.autoResize) {
            // Get all children of this group
            const childIds = parent.childIds || [];
            const childShapes = childIds
              .map((childId) => updatedShapes.find((s) => s.id === childId))
              .filter(Boolean) as Shape[];

            if (childShapes.length > 0) {
              // Calculate new bounds based on children positions
              const childBounds = calculateBoundsForChildren(childShapes);

              // Update group dimensions to fit children
              updatedShapes[parentIndex] = {
                ...parent,
                width: childBounds.width,
                height: childBounds.height,
              };
            }
          }
        }
      }

      // If this is a container and position or size or rotation is changing,
      // update all children recursively
      if (updatedShape.isContainer && updatedShape.childIds.length > 0) {
        const positionChanged =
          "x" in updatedProps ||
          "y" in updatedProps ||
          "rotation" in updatedProps ||
          "width" in updatedProps ||
          "height" in updatedProps;

        if (positionChanged) {
          // Calculate transformation changes
          const deltaX =
            updatedProps.x !== undefined ? updatedProps.x - currentShape.x : 0;
          const deltaY =
            updatedProps.y !== undefined ? updatedProps.y - currentShape.y : 0;
          const scaleX =
            updatedProps.width !== undefined && currentShape.width !== 0
              ? updatedProps.width / currentShape.width
              : 1;
          const scaleY =
            updatedProps.height !== undefined && currentShape.height !== 0
              ? updatedProps.height / currentShape.height
              : 1;
          const deltaRotation =
            updatedProps.rotation !== undefined
              ? updatedProps.rotation - (currentShape.rotation || 0)
              : 0;

          // Helper function to recursively transform children
          const transformChildren = (
            childIds: string[],
            parentDeltaX: number,
            parentDeltaY: number,
            parentScaleX: number,
            parentScaleY: number,
            parentDeltaRotation: number
          ) => {
            childIds.forEach((childId) => {
              const childIndex = updatedShapes.findIndex(
                (s) => s.id === childId
              );
              if (childIndex === -1) return;

              const child = updatedShapes[childIndex];

              // Apply transformations
              // For translation, simply add delta
              let newX = child.x + parentDeltaX;
              let newY = child.y + parentDeltaY;

              // Apply scaling
              if (parentScaleX !== 1 || parentScaleY !== 1) {
                // Scale relative to parent's origin
                newX = child.x * parentScaleX;
                newY = child.y * parentScaleY;
              }

              // Apply rotation if needed
              let newRotation = child.rotation || 0;
              if (parentDeltaRotation !== 0) {
                newRotation = (child.rotation || 0) + parentDeltaRotation;
              }

              // Update the child
              updatedShapes[childIndex] = {
                ...child,
                x: newX,
                y: newY,
                rotation: newRotation,
              };

              // Recursively transform this child's children if it's a container
              if (child.isContainer && child.childIds?.length > 0) {
                transformChildren(
                  child.childIds,
                  parentDeltaX,
                  parentDeltaY,
                  parentScaleX,
                  parentScaleY,
                  parentDeltaRotation
                );
              }
            });
          };

          // Start the recursive transformation with the current shape's children
          transformChildren(
            updatedShape.childIds,
            deltaX,
            deltaY,
            scaleX,
            scaleY,
            deltaRotation
          );
        }
      }

      // Handle parent change if needed
      if (newParentId !== undefined && oldParentId !== newParentId) {
        // Remove from old parent's childIds
        if (oldParentId) {
          const oldParentIndex = updatedShapes.findIndex(
            (s) => s.id === oldParentId
          );
          if (oldParentIndex !== -1) {
            const oldParent = updatedShapes[oldParentIndex];
            updatedShapes[oldParentIndex] = {
              ...oldParent,
              childIds: oldParent.childIds.filter((childId) => childId !== id),
            };

            // Auto-resize old parent if it's a group
            if (oldParent.type === "group" && oldParent.autoResize) {
              const remainingChildShapes = oldParent.childIds
                .filter((childId) => childId !== id)
                .map((childId) => updatedShapes.find((s) => s.id === childId))
                .filter(Boolean) as Shape[];

              if (remainingChildShapes.length > 0) {
                const newBounds =
                  calculateBoundsForChildren(remainingChildShapes);
                updatedShapes[oldParentIndex] = {
                  ...updatedShapes[oldParentIndex],
                  width: newBounds.width,
                  height: newBounds.height,
                };
              }
            }
          }
        }

        // Add to new parent's childIds
        if (newParentId) {
          const newParentIndex = updatedShapes.findIndex(
            (s) => s.id === newParentId
          );
          if (newParentIndex !== -1) {
            const newParent = updatedShapes[newParentIndex];
            updatedShapes[newParentIndex] = {
              ...newParent,
              childIds: [...newParent.childIds, id],
            };

            // Auto-resize new parent if it's a group
            if (newParent.type === "group" && newParent.autoResize) {
              const childShapes = [...newParent.childIds, id]
                .map((childId) => updatedShapes.find((s) => s.id === childId))
                .filter(Boolean) as Shape[];

              if (childShapes.length > 0) {
                const newBounds = calculateBoundsForChildren(childShapes);
                updatedShapes[newParentIndex] = {
                  ...updatedShapes[newParentIndex],
                  width: newBounds.width,
                  height: newBounds.height,
                };
              }
            }
          }
        }
      }

      return {
        shapes: updatedShapes,
        cache: {
          ...state.cache,
          needsUpdate: true,
        },
      };
    });
  },

  // Delete shape (and all its descendants)
  deleteShape: (id) => {
    const state = get();
    const shape = state.shapes.find((s) => s.id === id);
    if (!shape) return;

    // Get all descendant IDs to delete
    const descendantIds = state.getDescendantIds(id);
    const idsToDelete = [id, ...descendantIds];

    // Update parent's children array if needed
    let updatedShapes = [...state.shapes];
    if (shape.parentId) {
      updatedShapes = updatedShapes.map((s) => {
        if (s.id === shape.parentId) {
          return {
            ...s,
            childIds: (s.childIds || []).filter((childId) => childId !== id),
          };
        }
        return s;
      });
    }

    // Filter out deleted shapes
    updatedShapes = updatedShapes.filter((s) => !idsToDelete.includes(s.id));

    // Update selection if needed
    const newSelectedId = idsToDelete.includes(state.selectedShapeId || "")
      ? null
      : state.selectedShapeId;

    set({
      shapes: updatedShapes,
      selectedShapeId: newSelectedId,
      selectedShapeIds: state.selectedShapeIds.filter(
        (selId) => !idsToDelete.includes(selId)
      ),
      cache: {
        ...state.cache,
        needsUpdate: true,
      },
    });
  },

  // Delete selected shapes
  deleteSelectedShapes: () => {
    const { selectedShapeIds, deleteShape } = get();

    // Create a copy to avoid modifying while iterating
    const shapesToDelete = [...selectedShapeIds];

    // First, find root shapes (those not contained in other selected shapes)
    const { shapes } = get();
    const selectedSet = new Set(selectedShapeIds);

    // A shape is a root shape if it has no parent or its parent is not selected
    const rootShapesToDelete = shapesToDelete.filter((id) => {
      const shape = shapes.find((s) => s.id === id);
      return !shape?.parentId || !selectedSet.has(shape.parentId);
    });

    // Only delete the root shapes - their children will be deleted recursively
    rootShapesToDelete.forEach((id) => deleteShape(id));
  },

  // Set selected shape ID
  setSelectedShapeId: (id) => {
    set((state) => {
      return {
        selectedShapeId: id,
        selectionState: {
          ...state.selectionState,
          selectedShapeId: id,
        },
      };
    });
  },

  // Set selected shape IDs
  setSelectedShapeIds: (ids) => {
    set({
      selectedShapeIds: ids,
    });
  },

  // Toggle shape selection
  toggleShapeSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedShapeIds.includes(id);
      if (isSelected) {
        return {
          selectedShapeIds: state.selectedShapeIds.filter(
            (selId) => selId !== id
          ),
          selectedShapeId:
            state.selectedShapeId === id ? null : state.selectedShapeId,
        };
      } else {
        return {
          selectedShapeIds: [...state.selectedShapeIds, id],
          selectedShapeId: id,
        };
      }
    });
  },

  // Set dragged shape ID
  setDraggedShapeId: (id) => {
    set({ draggedShapeId: id });
  },

  // Set multi-selecting flag
  setMultiSelecting: (isSelecting) => {
    set({ isMultiSelecting: isSelecting });
  },

  // Set multi-select rectangle
  setMultiSelectRect: (rect) => {
    set({ multiSelectRect: rect });
  },

  // Set scale
  setScale: (scale) => {
    set({ scale });
  },

  // Set canvas offset
  setCanvasOffset: (offset) => {
    set({ canvasOffset: offset });
  },

  // Set isDragging flag
  setIsDragging: (isDragging) => {
    set({ isDragging });
  },

  // Set isResizing flag
  setIsResizing: (isResizing) => {
    set({ isResizing });
  },

  // Set isDrawing flag
  setIsDrawing: (isDrawing) => {
    set({ isDrawing });
  },

  // Set current drawing tool
  setCurrentDrawingTool: (tool) => {
    set({ currentDrawingTool: tool });
  },

  // Set last mouse position
  setLastMousePosition: (position) => {
    set({ lastMousePosition: position });
  },

  // Create a new frame
  createFrame: (params) => {
    const state = get();
    const highestZIndex = state.shapes.reduce(
      (max, shape) => Math.max(max, shape.zIndex || 0),
      0
    );

    const newFrame: Shape = {
      id: uuidv4(),
      type: "frame",
      x: params.x,
      y: params.y,
      width: params.width || 300,
      height: params.height || 200,
      fill: "#88888810", // Light gray with low opacity
      stroke: "#888888",
      strokeWidth: 1,
      rotation: 0,
      name:
        params.name ||
        `Frame ${state.shapes.filter((s) => s.type === "frame").length + 1}`,
      isVisible: true,
      isLocked: false,
      isContainer: true,
      clipContent: true, // Frames clip overflowing content
      autoResize: false, // Frames don't auto-resize
      childIds: [],
      zIndex: highestZIndex + 1,
    };

    state.addShape(newFrame);
    state.setSelectedShapeId(newFrame.id);
  },

  // Create a group from selected shapes
  createGroup: () => {
    const state = get();
    const shapeIds = state.selectedShapeIds;
    if (shapeIds.length < 2) return;

    // Get shapes to group
    const shapesToGroup = state.shapes.filter((s) => shapeIds.includes(s.id));
    if (shapesToGroup.length < 2) return;

    // Check if any shape is already in another container
    const hasParents = shapesToGroup.some((s) => s.parentId);
    if (hasParents) return; // Don't allow nested containers yet

    // Calculate group bounds
    const bounds = calculateGroupBounds(shapesToGroup);

    // Get highest zIndex for proper stacking
    const highestZIndex = Math.max(...shapesToGroup.map((s) => s.zIndex || 0));

    // Create group
    const groupId = uuidv4();
    const groupShape: Shape = {
      id: groupId,
      type: "group",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      fill: "transparent",
      stroke: "#6366f180",
      strokeWidth: 1,
      rotation: 0,
      name: `Group ${
        state.shapes.filter((s) => s.type === "group").length + 1
      }`,
      isVisible: true,
      isLocked: false,
      isContainer: true,
      childIds: shapeIds,
      clipContent: false, // Groups don't clip content
      autoResize: true, // Groups auto-resize based on children
      zIndex: highestZIndex + 1,
    };

    // Update all child shapes to reference their parent
    const updatedShapes = state.shapes.map((s) => {
      if (shapeIds.includes(s.id)) {
        // Update child positions to be relative to group
        return {
          ...s,
          parentId: groupId,
          x: s.x - bounds.x, // Make coordinates relative to group
          y: s.y - bounds.y,
        };
      }
      return s;
    });

    set({
      shapes: [...updatedShapes, groupShape],
      selectedShapeId: groupId,
      selectedShapeIds: [groupId],
      cache: {
        ...state.cache,
        needsUpdate: true,
      },
    });
  },

  // Ungroup a group
  ungroup: (groupId) => {
    const state = get();
    const group = state.shapes.find((s) => s.id === groupId);

    if (!group || !group.isContainer || !group.childIds?.length) return;

    // Update child positions to be absolute again
    const updatedShapes = state.shapes.map((s) => {
      if (s.parentId === groupId) {
        return {
          ...s,
          parentId: undefined,
          x: s.x + group.x, // Make coordinates absolute again
          y: s.y + group.y,
        };
      }
      return s;
    });

    // Filter out the group
    set({
      shapes: updatedShapes.filter((s) => s.id !== groupId),
      selectedShapeId: null,
      selectedShapeIds: [],
      cache: {
        ...state.cache,
        needsUpdate: true,
      },
    });
  },

  // Move shape to parent
  moveShapeToParent: (shapeId, parentId) => {
    const state = get();
    const shape = state.shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    // Update shape with new parent
    state.updateShape(shapeId, {
      parentId: parentId === null ? undefined : parentId,
    });
  },

  // Start resizing a shape
  startResizing: (id, handle, mousePos, shapeBounds) => {
    set((state) => ({
      selectionState: {
        selectedShapeId: id,
        activeHandle: handle,
        initialMousePos: mousePos,
        initialShapeBounds: shapeBounds,
      },
      cache: {
        ...state.cache,
        needsUpdate: true,
      },
    }));
  },

  // Resize a shape (existing implementation)
  resizeSelectedShape: (currentMousePos, maintainAspectRatio = false) => {
    const state = get();
    if (!state.selectionState.activeHandle || !state.selectedShapeId) return;

    const shape = state.shapes.find((s) => s.id === state.selectedShapeId);
    if (!shape) return;

    const { initialMousePos, initialShapeBounds, activeHandle } =
      state.selectionState;
    if (!initialMousePos || !initialShapeBounds) return;

    if (activeHandle === "rotate") {
      const centerX = initialShapeBounds.x + initialShapeBounds.width / 2;
      const centerY = initialShapeBounds.y + initialShapeBounds.height / 2;
      const center = { x: centerX, y: centerY };

      const initialAngle = calculateRotationAngle(center, initialMousePos);
      const currentAngle = calculateRotationAngle(center, currentMousePos);

      let deltaAngle = currentAngle - initialAngle;

      // Update shape with new rotation
      set((state) => ({
        shapes: state.shapes.map((s) =>
          s.id === state.selectedShapeId
            ? {
                ...s,
                rotation:
                  ((((s.rotation || 0) + deltaAngle) % 360) + 360) % 360,
              }
            : s
        ),
        cache: {
          ...state.cache,
          needsUpdate: true,
        },
      }));

      // Update initial position for next calculation
      set((state) => ({
        selectionState: {
          ...state.selectionState,
          initialMousePos: currentMousePos,
        },
      }));
      return;
    }

    // Special-case resizing for lines: move only the clicked endpoint
    if (shape.type === "line") {
      const endX = initialShapeBounds.x + initialShapeBounds.width;
      const endY = initialShapeBounds.y + initialShapeBounds.height;
      let newX = initialShapeBounds.x;
      let newY = initialShapeBounds.y;
      let newWidth = initialShapeBounds.width;
      let newHeight = initialShapeBounds.height;
      if (activeHandle === "top-left") {
        newX = initialShapeBounds.x + currentMousePos.x - initialMousePos.x;
        newY = initialShapeBounds.y + currentMousePos.y - initialMousePos.y;
        newWidth = endX - newX;
        newHeight = endY - newY;
      } else if (activeHandle === "bottom-right") {
        newWidth = initialShapeBounds.width + currentMousePos.x - initialMousePos.x;
        newHeight = initialShapeBounds.height + currentMousePos.y - initialMousePos.y;
      }
      set((state) => ({
        shapes: state.shapes.map((s) =>
          s.id === state.selectedShapeId
            ? { ...s, x: newX, y: newY, width: newWidth, height: newHeight }
            : s
        ),
        cache: { ...state.cache, needsUpdate: true },
      }));
      return;
    }

    // Handle resizing
    const deltaX = currentMousePos.x - initialMousePos.x;
    const deltaY = currentMousePos.y - initialMousePos.y;
    let newX = initialShapeBounds.x;
    let newY = initialShapeBounds.y;
    let newWidth = initialShapeBounds.width;
    let newHeight = initialShapeBounds.height;
    const aspectRatio = initialShapeBounds.width / initialShapeBounds.height;

    switch (activeHandle) {
      case "top-left":
        if (maintainAspectRatio) {
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newX = initialShapeBounds.x - scaledDelta;
          newY = initialShapeBounds.y - scaledDelta / aspectRatio;
          newWidth = initialShapeBounds.width + scaledDelta;
          newHeight = initialShapeBounds.height + scaledDelta / aspectRatio;
        } else {
          newX = initialShapeBounds.x + deltaX;
          newY = initialShapeBounds.y + deltaY;
          newWidth = initialShapeBounds.width - deltaX;
          newHeight = initialShapeBounds.height - deltaY;
        }
        break;
      case "top-right":
        if (maintainAspectRatio) {
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newY = initialShapeBounds.y - scaledDelta / aspectRatio;
          newWidth = initialShapeBounds.width + scaledDelta;
          newHeight = initialShapeBounds.height + scaledDelta / aspectRatio;
        } else {
          newY = initialShapeBounds.y + deltaY;
          newWidth = initialShapeBounds.width + deltaX;
          newHeight = initialShapeBounds.height - deltaY;
        }
        break;
      case "bottom-left":
        if (maintainAspectRatio) {
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newX = initialShapeBounds.x - scaledDelta;
          newWidth = initialShapeBounds.width + scaledDelta;
          newHeight = initialShapeBounds.height + scaledDelta / aspectRatio;
        } else {
          newX = initialShapeBounds.x + deltaX;
          newWidth = initialShapeBounds.width - deltaX;
          newHeight = initialShapeBounds.height + deltaY;
        }
        break;
      case "bottom-right":
        if (maintainAspectRatio) {
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newWidth = initialShapeBounds.width + scaledDelta;
          newHeight = initialShapeBounds.height + scaledDelta / aspectRatio;
        } else {
          newWidth = initialShapeBounds.width + deltaX;
          newHeight = initialShapeBounds.height + deltaY;
        }
        break;
      case "top":
        newY = initialShapeBounds.y + deltaY;
        newHeight = initialShapeBounds.height - deltaY;
        break;
      case "right":
        newWidth = initialShapeBounds.width + deltaX;
        break;
      case "bottom":
        newHeight = initialShapeBounds.height + deltaY;
        break;
      case "left":
        newX = initialShapeBounds.x + deltaX;
        newWidth = initialShapeBounds.width - deltaX;
        break;
    }

    // Ensure minimum size
    newWidth = Math.max(10, newWidth);
    newHeight = Math.max(10, newHeight);

    // Update shape
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === state.selectedShapeId
          ? {
              ...s,
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
            }
          : s
      ),
      cache: {
        ...state.cache,
        needsUpdate: true,
      },
    }));

    // Mark cache as needing update at the end
    state.invalidateCache();
  },

  // End resizing
  endResizing: () =>
    set((state) => ({
      selectionState: {
        ...state.selectionState,
        activeHandle: null,
        initialMousePos: null,
        initialShapeBounds: null,
      },
    })),

  // Get selected shape
  getSelectedShape: () => {
    const state = get();
    if (!state.selectedShapeId) return null;

    return state.shapes.find((s) => s.id === state.selectedShapeId) || null;
  },

  // Reorder shapes (for layer panel)
  reorderShapes: (newOrder) =>
    set((state) => {
      // Map IDs to their new z-index value
      const zIndexMap: Record<string, number> = {};
      newOrder.forEach((id, idx) => {
        zIndexMap[id] = newOrder.length - idx; // Higher index = higher z-index
      });

      // Update shapes with new z-index values
      return {
        shapes: state.shapes.map((shape) => ({
          ...shape,
          zIndex:
            zIndexMap[shape.id] !== undefined
              ? zIndexMap[shape.id]
              : shape.zIndex,
        })),
        cache: {
          ...state.cache,
          needsUpdate: true,
        },
      };
    }),

  // Duplicate selected shapes
  duplicateSelectedShapes: () => {
    const state = get();
    if (state.selectedShapeIds.length === 0) return;

    const shapesToDuplicate = state.shapes.filter((s) =>
      state.selectedShapeIds.includes(s.id)
    );

    const newShapeIds: string[] = [];
    const idMap: Record<string, string> = {};

    // Create duplicates
    shapesToDuplicate.forEach((shape) => {
      const newId = uuidv4();
      idMap[shape.id] = newId;

      const duplicate: Shape = {
        ...shape,
        id: newId,
        name: `${shape.name || shape.type} (copy)`,
        x: shape.x + 10, // Offset slightly
        y: shape.y + 10,
        childIds: [], // Will be populated for containers
      };

      state.addShape(duplicate);
      newShapeIds.push(newId);
    });

    // Update parent-child relationships
    for (const originalId in idMap) {
      const originalShape = state.shapes.find((s) => s.id === originalId);
      const newId = idMap[originalId];

      if (originalShape && originalShape.childIds.length > 0) {
        const newChildIds = originalShape.childIds
          .filter((childId) => idMap[childId]) // Only include children we duplicated
          .map((childId) => idMap[childId]); // Map to new IDs

        if (newChildIds.length > 0) {
          state.updateShape(newId, { childIds: newChildIds });
        }
      }
    }

    // Select the new shapes
    set({
      selectedShapeIds: newShapeIds,
      selectedShapeId: newShapeIds[0] || null,
    });
  },
}));
