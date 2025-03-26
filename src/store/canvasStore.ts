import { create } from "zustand";
import { Shape, ResizeHandle, SelectionState } from "../lib/webgl/types";

interface CanvasState {
  shapes: Shape[];
  selectedShape: Shape | null;
  selectedShapeId: string | null;
  isDrawing: boolean;
  zoom: number;
  pan: { x: number; y: number };
  selectionState: SelectionState;

  // Actions
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  setSelectedShape: (shape: Shape | null) => void;
  setSelectedShapeId: (id: string | null) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;

  // Selection and manipulation
  startResizing: (
    id: string,
    handle: ResizeHandle,
    position: { x: number; y: number },
    bounds: { x: number; y: number; width: number; height: number }
  ) => void;
  resizeSelectedShape: (
    position: { x: number; y: number },
    maintainAspectRatio: boolean
  ) => void;
  endResizing: () => void;
  getSelectedShape: () => Shape | null;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  shapes: [],
  selectedShape: null,
  selectedShapeId: null,
  isDrawing: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectionState: {
    selectedShapeId: null,
    activeHandle: null,
    initialMousePosition: null,
    initialShapeBounds: null,
  },

  addShape: (shape: Shape) =>
    set((state) => ({
      shapes: [...state.shapes, shape],
    })),

  updateShape: (id: string, updates: Partial<Shape>) =>
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    })),

  deleteShape: (id: string) =>
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeId:
        state.selectedShapeId === id ? null : state.selectedShapeId,
      selectedShape:
        state.selectedShape?.id === id ? null : state.selectedShape,
    })),

  setSelectedShape: (shape: Shape | null) =>
    set(() => ({
      selectedShape: shape,
    })),

  setSelectedShapeId: (id: string | null) =>
    set((state) => {
      const selectedShape = id
        ? state.shapes.find((shape) => shape.id === id) || null
        : null;
      return {
        selectedShapeId: id,
        selectedShape: selectedShape,
        selectionState: {
          ...state.selectionState,
          selectedShapeId: id,
        },
      };
    }),

  setIsDrawing: (isDrawing: boolean) =>
    set(() => ({
      isDrawing,
    })),

  setZoom: (zoom: number) =>
    set(() => ({
      zoom,
    })),

  setPan: (pan: { x: number; y: number }) =>
    set(() => ({
      pan,
    })),

  startResizing: (
    id: string,
    handle: ResizeHandle,
    position: { x: number; y: number },
    bounds: { x: number; y: number; width: number; height: number }
  ) =>
    set((state) => ({
      selectionState: {
        selectedShapeId: id,
        activeHandle: handle,
        initialMousePosition: position,
        initialShapeBounds: bounds,
      },
      selectedShapeId: id,
      selectedShape: state.shapes.find((shape) => shape.id === id) || null,
    })),

  resizeSelectedShape: (
    position: { x: number; y: number },
    maintainAspectRatio: boolean
  ) => {
    const state = get();
    const { selectionState } = state;

    if (
      !selectionState.selectedShapeId ||
      !selectionState.activeHandle ||
      !selectionState.initialMousePosition ||
      !selectionState.initialShapeBounds
    ) {
      return;
    }

    const shape = state.shapes.find(
      (s) => s.id === selectionState.selectedShapeId
    );
    if (!shape) return;

    const { initialMousePosition, initialShapeBounds, activeHandle } =
      selectionState;

    let newX = shape.x;
    let newY = shape.y;
    let newWidth = shape.width;
    let newHeight = shape.height;

    // Calculate deltas
    const deltaX = position.x - initialMousePosition.x;
    const deltaY = position.y - initialMousePosition.y;

    // Original aspect ratio if maintaining ratio
    const aspectRatio = initialShapeBounds.width / initialShapeBounds.height;

    // Apply transformations based on handle
    switch (activeHandle) {
      case "top-left":
        if (maintainAspectRatio) {
          // Use the larger delta to maintain aspect ratio
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newX = initialShapeBounds.x - scaledDelta * (deltaX < 0 ? -1 : 1);
          newY =
            initialShapeBounds.y -
            (scaledDelta / aspectRatio) * (deltaY < 0 ? -1 : 1);
          newWidth =
            initialShapeBounds.width + scaledDelta * (deltaX < 0 ? -1 : 1);
          newHeight =
            initialShapeBounds.height +
            (scaledDelta / aspectRatio) * (deltaY < 0 ? -1 : 1);
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
          newY =
            initialShapeBounds.y -
            (scaledDelta / aspectRatio) * (deltaY < 0 ? -1 : 1);
          newWidth =
            initialShapeBounds.width + scaledDelta * (deltaX > 0 ? 1 : -1);
          newHeight =
            initialShapeBounds.height +
            (scaledDelta / aspectRatio) * (deltaY < 0 ? -1 : 1);
        } else {
          newY = initialShapeBounds.y + deltaY;
          newWidth = initialShapeBounds.width + deltaX;
          newHeight = initialShapeBounds.height - deltaY;
        }
        break;
      case "bottom-left":
        if (maintainAspectRatio) {
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newX = initialShapeBounds.x - scaledDelta * (deltaX < 0 ? -1 : 1);
          newWidth =
            initialShapeBounds.width + scaledDelta * (deltaX < 0 ? -1 : 1);
          newHeight =
            initialShapeBounds.height +
            (scaledDelta / aspectRatio) * (deltaY > 0 ? 1 : -1);
        } else {
          newX = initialShapeBounds.x + deltaX;
          newWidth = initialShapeBounds.width - deltaX;
          newHeight = initialShapeBounds.height + deltaY;
        }
        break;
      case "bottom-right":
        if (maintainAspectRatio) {
          const scaledDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
          newWidth =
            initialShapeBounds.width + scaledDelta * (deltaX > 0 ? 1 : -1);
          newHeight =
            initialShapeBounds.height +
            (scaledDelta / aspectRatio) * (deltaY > 0 ? 1 : -1);
        } else {
          newWidth = initialShapeBounds.width + deltaX;
          newHeight = initialShapeBounds.height + deltaY;
        }
        break;
      case "top":
        newY = initialShapeBounds.y + deltaY;
        newHeight = initialShapeBounds.height - deltaY;
        if (maintainAspectRatio) {
          newWidth = newHeight * aspectRatio;
        }
        break;
      case "right":
        newWidth = initialShapeBounds.width + deltaX;
        if (maintainAspectRatio) {
          newHeight = newWidth / aspectRatio;
        }
        break;
      case "bottom":
        newHeight = initialShapeBounds.height + deltaY;
        if (maintainAspectRatio) {
          newWidth = newHeight * aspectRatio;
        }
        break;
      case "left":
        newX = initialShapeBounds.x + deltaX;
        newWidth = initialShapeBounds.width - deltaX;
        if (maintainAspectRatio) {
          newHeight = newWidth / aspectRatio;
        }
        break;
      // Rotation could be implemented here
    }

    // Ensure minimum size
    newWidth = Math.max(10, newWidth);
    newHeight = Math.max(10, newHeight);

    // Update shape
    state.updateShape(selectionState.selectedShapeId, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  },

  endResizing: () =>
    set((state) => ({
      selectionState: {
        ...state.selectionState,
        activeHandle: null,
        initialMousePosition: null,
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
}));
