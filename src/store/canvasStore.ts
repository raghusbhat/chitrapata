import { create } from "zustand";
import { Shape, Point, ResizeHandle } from "../lib/webgl/types";
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
  selectedShape: Shape | null;
  isDrawing: boolean;
  zoom: number;
  pan: Point;
  selectionState: SelectionState;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  setSelectedShape: (shape: Shape | null) => void;
  setSelectedShapeId: (id: string | null) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  startResizing: (
    id: string,
    handle: ResizeHandle,
    mousePos: Point,
    shapeBounds: { x: number; y: number; width: number; height: number }
  ) => void;
  resizeSelectedShape: (
    currentMousePos: Point,
    maintainAspectRatio: boolean
  ) => void;
  endResizing: () => void;
  getSelectedShape: () => Shape | null;
  reorderShapes: (newOrder: string[]) => void;
}

function calculateRotationAngle(center: Point, point: Point): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  shapes: [],
  selectedShapeId: null,
  selectedShape: null,
  isDrawing: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectionState: {
    selectedShapeId: null,
    activeHandle: null,
    initialMousePos: null,
    initialShapeBounds: null,
  },

  addShape: (shape) =>
    set((state) => ({
      shapes: [...state.shapes, { ...shape, id: shape.id || uuidv4() }],
    })),

  updateShape: (id, updates) =>
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    })),

  deleteShape: (id) =>
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeId:
        state.selectedShapeId === id ? null : state.selectedShapeId,
    })),

  setSelectedShape: (shape) =>
    set(() => ({
      selectedShape: shape,
    })),

  setSelectedShapeId: (id) =>
    set((state) => {
      const selectedShape = id
        ? state.shapes.find((shape) => shape.id === id) || null
        : null;
      return {
        selectedShapeId: id,
        selectionState: {
          ...state.selectionState,
          selectedShapeId: id,
        },
      };
    }),

  setIsDrawing: (isDrawing) =>
    set(() => ({
      isDrawing,
    })),

  startResizing: (id, handle, mousePos, shapeBounds) =>
    set((state) => ({
      selectionState: {
        selectedShapeId: id,
        activeHandle: handle,
        initialMousePos: mousePos,
        initialShapeBounds: shapeBounds,
      },
    })),

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
      }));

      // Update initial position for next calculation
      state.selectionState.initialMousePos = currentMousePos;
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
    }));
  },

  endResizing: () =>
    set((state) => ({
      selectionState: {
        ...state.selectionState,
        activeHandle: null,
        initialMousePos: null,
        initialShapeBounds: null,
      },
    })),

  getSelectedShape: () => {
    const state = get();
    if (!state.selectedShapeId) return null;
    return (
      state.shapes.find((shape) => shape.id === state.selectedShapeId) || null
    );
  },

  reorderShapes: (newOrder) =>
    set((state) => {
      // Map IDs to their new z-index value (reverse order: last = highest z-index)
      const zIndexMap: Record<string, number> = {};
      newOrder.forEach((id, idx) => {
        zIndexMap[id] = newOrder.length - idx; // Higher index = higher z-index (appears on top)
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
      };
    }),
}));
