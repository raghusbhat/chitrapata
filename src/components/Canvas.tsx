import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { Shape, ShapeType, WebGLContext } from "../lib/webgl/types";
import { renderShape } from "../lib/canvas2d/renderShape";
import { renderShape as renderShapeWebGL } from "../lib/webgl/shapes";
import { createWebGLContext } from "../lib/webgl/context";
import { v4 as uuidv4 } from "uuid";
import { SelectionControls } from "./SelectionControls";
import { calculateAbsoluteTransform } from "../lib/utils/transformUtils";
import { mat4 } from "gl-matrix";

interface CanvasProps {
  width: number;
  height: number;
}

export function Canvas({ width, height }: CanvasProps) {
  // Dual canvas refs
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const glContextRef = useRef<WebGLContext | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const {
    shapes,
    isDrawing,
    setIsDrawing,
    addShape,
    selectedShapeId,
    setSelectedShapeId,
    deleteShape,
    updateShape,
    createFrame,
    createGroup,
    ungroup,
    getFlattenedShapes,
    invalidateCache,
    selectedShapeIds,
    toggleShapeSelection,
    currentDrawingTool,
    setCurrentDrawingTool,
    scale,
    setScale,
    canvasOffset,
    setCanvasOffset,
    setSelectedShapeIds,
    selectionState,
    deleteSelectedShapes,
  } = useCanvasStore();

  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveStart, setMoveStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const initialClickPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize dual canvas dimensions and WebGL context
  useEffect(() => {
    const webglCanvas = webglCanvasRef.current;
    const canvas2d = canvas2dRef.current;
    if (!webglCanvas || !canvas2d) return;

    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(width * dpr);
    const displayHeight = Math.floor(height * dpr);

    // Set WebGL canvas size
    webglCanvas.width = displayWidth;
    webglCanvas.height = displayHeight;
    webglCanvas.style.width = `${width}px`;
    webglCanvas.style.height = `${height}px`;

    // Set Canvas2D overlay size
    canvas2d.width = displayWidth;
    canvas2d.height = displayHeight;
    canvas2d.style.width = `${width}px`;
    canvas2d.style.height = `${height}px`;

    // Initialize WebGL context for rendering shapes (ONLY if not already initialized)
    if (!glContextRef.current) {
      try {
        const glContext = createWebGLContext(webglCanvas);
        if (glContext) {
          glContextRef.current = glContext;
          console.log("✅ [Canvas] WebGL context created and stored");
        } else {
          glContextRef.current = null;
          console.warn("⚠️ [Canvas] WebGL context creation returned null");
        }
      } catch (error) {
        console.error("❌ [Canvas] WebGL initialization failed:", error);
        glContextRef.current = null;
      }
    } else {
      console.log("♻️ [Canvas] Reusing existing WebGL context");
    }

    // Handle WebGL context loss/restore events
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("⚠️ [Canvas] WebGL context lost - will attempt to restore");
    };

    const handleContextRestored = () => {
      console.log("🔄 [Canvas] WebGL context restored - reinitializing");
      try {
        const glContext = createWebGLContext(webglCanvas);
        if (glContext) {
          glContextRef.current = glContext;
          console.log("✅ [Canvas] WebGL context re-created after restore");
        }
      } catch (error) {
        console.error("❌ [Canvas] Failed to restore WebGL context:", error);
        glContextRef.current = null;
      }
    };

    webglCanvas.addEventListener('webglcontextlost', handleContextLost);
    webglCanvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Cleanup WebGL resources and event listeners on unmount
    return () => {
      webglCanvas.removeEventListener('webglcontextlost', handleContextLost);
      webglCanvas.removeEventListener('webglcontextrestored', handleContextRestored);

      if (glContextRef.current) {
        const { gl, program } = glContextRef.current;
        // Delete the program and lose context
        gl.deleteProgram(program);
        const loseContextExt = gl.getExtension('WEBGL_lose_context');
        if (loseContextExt) {
          loseContextExt.loseContext();
        }
        glContextRef.current = null;
      }
    };
  }, [width, height]);


  // Sync selection state with local state (use local state to avoid infinite loop)
  const [localIsResizing, setLocalIsResizing] = useState(false);

  useEffect(() => {
    // Create a subscription to selectionState.activeHandle changes
    const unsubscribe = useCanvasStore.subscribe((state) => {
      // When activeHandle changes, update local resizing state
      const newActiveHandle = state.selectionState.activeHandle;
      setLocalIsResizing(newActiveHandle !== null);
    });

    // Initial state sync
    const activeHandle = useCanvasStore.getState().selectionState.activeHandle;
    setLocalIsResizing(activeHandle !== null);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty deps is correct - subscription doesn't need to be recreated

  // Get flattened shapes for rendering with memoization
  const flattenedShapes = useMemo(() => {
    // Use the optimized flattened shapes from the store
    const allShapes = getFlattenedShapes();
    // Filter only visible shapes
    return allShapes.filter((shape) => shape.isVisible !== false);
  }, [shapes]); // Depend on shapes directly - getFlattenedShapes reads from store

  // Hybrid rendering: WebGL for shapes, Canvas2D for selection
  useEffect(() => {
    const webglCanvas = webglCanvasRef.current;
    const canvas2d = canvas2dRef.current;
    const glContext = glContextRef.current;

    if (!canvas2d) return;

    const dpr = window.devicePixelRatio || 1;

    // ============ WebGL Rendering (Layer 1: Shapes) ============
    if (webglCanvas && glContext) {
      const { gl, program, uniforms } = glContext;

      // Clear WebGL canvas
      gl.clearColor(0.09, 0.09, 0.11, 1.0); // #18181b
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use shader program
      gl.useProgram(program);

      // Set up camera matrix for pan/zoom
      const cameraMatrix = mat4.create();
      mat4.identity(cameraMatrix);
      mat4.translate(cameraMatrix, cameraMatrix, [canvasOffset.x * dpr, canvasOffset.y * dpr, 0]);
      mat4.scale(cameraMatrix, cameraMatrix, [scale, scale, 1]);

      gl.uniformMatrix4fv(uniforms.cameraMatrix, false, cameraMatrix);

      // Render shapes with WebGL (use flattenedShapes for correct absolute positions)
      flattenedShapes.forEach((shape) => {
        if (canUseWebGL(shape)) {
          try {
            renderShapeWebGL(gl, shape, { ...glContext, currentScale: scale });
          } catch (e) {
            console.error(`WebGL render failed for ${shape.id}, falling back to Canvas2D:`, e);
          }
        }
      });

      // Draw preview of shape being created with WebGL
      if (currentShape && isDrawing && canUseWebGL(currentShape)) {
        try {
          // If shape has a parent, calculate absoluteTransform for rendering
          const parentFrame = currentShape.parentId
            ? flattenedShapes.find(s => s.id === currentShape.parentId)
            : undefined;
          const shapeToRender = calculateAbsoluteTransform(currentShape, parentFrame);

          renderShapeWebGL(gl, shapeToRender, { ...glContext, currentScale: scale });
        } catch (e) {
          console.error("WebGL preview render failed:", e);
        }
      }
    }

    // ============ Canvas2D Rendering (Layer 2: Selection & Fallback) ============
    const ctx = canvas2d.getContext("2d", {
      alpha: true,
      willReadFrequently: false,
    });

    if (!ctx) return;

    const canvasWidth = canvas2d.width;
    const canvasHeight = canvas2d.height;

    // Clear and setup Canvas2D
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // If WebGL failed, draw background with Canvas2D
    if (!glContext) {
      ctx.fillStyle = theme === "dark" ? "#18181b" : "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Set up high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Apply device pixel ratio
    ctx.scale(dpr, dpr);

    // Apply viewport transform (pan and zoom)
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(scale, scale);

    // Render shapes that can't use WebGL (fallback)
    if (!glContext) {
      // No WebGL - render all shapes with Canvas2D (use flattenedShapes for correct transforms)
      flattenedShapes.forEach((shape) => {
        try {
          renderShape(ctx, shape, ctx.getTransform());
        } catch (e) {
          console.error(`Failed to render shape ${shape.id}:`, e);
        }
      });
    } else {
      // WebGL available - only render shapes that WebGL can't handle
      flattenedShapes.forEach((shape) => {
        if (!canUseWebGL(shape)) {
          try {
            renderShape(ctx, shape, ctx.getTransform());
          } catch (e) {
            console.error(`Failed to render shape ${shape.id}:`, e);
          }
        }
      });
    }

    // Draw the shape being created (preview while dragging)
    // Only render with Canvas2D if WebGL can't handle it
    if (currentShape && isDrawing && (!glContext || !canUseWebGL(currentShape))) {
      try {
        ctx.save();
        // Draw with semi-transparent style to show it's a preview
        ctx.globalAlpha = 0.7;

        // If shape has a parent, calculate absoluteTransform for rendering
        const parentFrame = currentShape.parentId
          ? flattenedShapes.find(s => s.id === currentShape.parentId)
          : undefined;
        const shapeToRender = calculateAbsoluteTransform(currentShape, parentFrame);

        renderShape(ctx, shapeToRender, ctx.getTransform());
        ctx.restore();
      } catch (e) {
        console.error("Error drawing shape preview:", e);
      }
    }

    // Selection rendering is now handled by SelectionControls component
    // (removed duplicate Canvas2D selection rendering)
  }, [shapes, selectedShapeIds, canvasOffset, scale, theme, localIsResizing, width, height, currentShape, isDrawing]);

  // Find a shape at the given position, considering hierarchy
  const findShapeAtPosition = useCallback(
    (x: number, y: number): string | null => {
      // Convert screen coordinates to canvas coordinates
      const adjustedX = (x - canvasOffset.x) / scale;
      const adjustedY = (y - canvasOffset.y) / scale;

      // Figma-like selection: prioritize children over containers
      // Sort by zIndex descending, but children should be checked before their parents
      const sortedShapes = [...flattenedShapes].sort((a, b) => {
        // First, sort by zIndex (higher = checked first)
        const zDiff = (b.zIndex || 0) - (a.zIndex || 0);
        if (zDiff !== 0) return zDiff;

        // If same zIndex, prioritize non-containers (children) over containers
        if (a.isContainer && !b.isContainer) return 1;  // b comes first
        if (!a.isContainer && b.isContainer) return -1; // a comes first

        return 0;
      });

      const isPointInShape = (shape: typeof sortedShapes[0]) => {
        const shapeX = shape.absoluteTransform?.x ?? shape.x;
        const shapeY = shape.absoluteTransform?.y ?? shape.y;
        const shapeRotation =
          shape.absoluteTransform?.rotation ?? shape.rotation ?? 0;

        // If no rotation, simple bounding box check
        if (shapeRotation === 0 || Math.abs(shapeRotation) < 0.01) {
          return (
            adjustedX >= shapeX &&
            adjustedX <= shapeX + shape.width &&
            adjustedY >= shapeY &&
            adjustedY <= shapeY + shape.height
          );
        } else {
          // For rotated shapes, check if point is inside the rotated rectangle
          const centerX = shapeX + shape.width / 2;
          const centerY = shapeY + shape.height / 2;

          // Convert rotation to radians
          const rotationRad = (-shapeRotation * Math.PI) / 180;

          // Translate point to origin of rotation (center of shape)
          const translatedX = adjustedX - centerX;
          const translatedY = adjustedY - centerY;

          // Rotate point
          const rotatedX =
            translatedX * Math.cos(rotationRad) -
            translatedY * Math.sin(rotationRad);
          const rotatedY =
            translatedX * Math.sin(rotationRad) +
            translatedY * Math.cos(rotationRad);

          // Translate back
          const finalX = rotatedX + centerX;
          const finalY = rotatedY + centerY;

          // Check if the rotated point is within the original un-rotated rectangle bounds
          return (
            finalX >= shapeX &&
            finalX <= shapeX + shape.width &&
            finalY >= shapeY &&
            finalY <= shapeY + shape.height
          );
        }
      };

      for (const shape of sortedShapes) {
        // Skip invisible shapes for selection
        if (shape.isVisible === false) continue;

        if (isPointInShape(shape)) {
          return shape.id;
        }
      }
      return null;
    },
    [flattenedShapes, scale, canvasOffset]
  );

  // Create a new frame when the button is clicked
  const handleCreateFrame = useCallback(() => {
    if (!canvas2dRef.current) return;

    const rect = canvas2dRef.current.getBoundingClientRect();
    const centerX = rect.width / 2 - 150; // Half frame width
    const centerY = rect.height / 2 - 100; // Half frame height

    // Call createFrame with proper parameters
    const params = {
      x: centerX,
      y: centerY,
      width: 300,
      height: 200,
      name: "New Frame",
    };

    createFrame(params);
  }, [createFrame]);

  // Create a group from selected shapes
  const handleCreateGroup = useCallback(() => {
    if (selectedShapeIds.length < 2) return;

    createGroup();
  }, [selectedShapeIds, createGroup]);

  // Ungroup a group
  const handleUngroup = useCallback(() => {
    if (!selectedShapeId) return;
    const shape = shapes.find((s) => s.id === selectedShapeId);
    if (shape?.type === "group") {
      ungroup(selectedShapeId);
    }
  }, [selectedShapeId, shapes, ungroup]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Skip Canvas logic when a resize handle is active
    if (selectionState.activeHandle) return;
    // Setup mouse buttons
    const isLeft = e.button === 0;
    const isMiddle = e.button === 1;
    const isRight = e.button === 2;
    // Suppress default context menu for middle/right
    if (isMiddle || isRight) e.preventDefault();
    // Compute canvas-relative coords
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Hit-test shape
    const shapeId = findShapeAtPosition(x, y);
    // Pan: middle-click OR Space-held + left-click on any area
    if (isMiddle || (isLeft && isPanning)) {
      e.preventDefault();
      setPanStart({ x: e.clientX, y: e.clientY });
      // Cancel any shape interactions
      setIsMoving(false);
      setIsDrawing(false);
      setIsSelecting(false);
      setDrawStart(null);
      setMoveStart(null);
      return;
    }
    // Only left-click proceeds to shape logic
    if (!isLeft) return;

    // Add shape of the selected tool
    if (currentDrawingTool) {
      // Convert screen coordinates to canvas coordinates (accounting for pan/zoom)
      const canvasX = (x - canvasOffset.x) / scale;
      const canvasY = (y - canvasOffset.y) / scale;

      setDrawStart({ x: canvasX, y: canvasY });
      setIsDrawing(true);
      setIsSelecting(false);

      // Find if cursor is inside a frame
      let parentId: string | undefined = undefined;
      const framesAtPosition = flattenedShapes
        .filter((shape) => shape.type === "frame")
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

      for (const frame of framesAtPosition) {
        const frameX = frame.absoluteTransform?.x ?? frame.x;
        const frameY = frame.absoluteTransform?.y ?? frame.y;

        if (
          canvasX >= frameX &&
          canvasX <= frameX + frame.width &&
          canvasY >= frameY &&
          canvasY <= frameY + frame.height
        ) {
          parentId = frame.id;
          break;
        }
      }

      // Create new shape with default properties
      const defaults = getDefaultPropertiesForShape(currentDrawingTool);

      // Convert to frame-relative coordinates if inside a frame
      let shapeX = canvasX;
      let shapeY = canvasY;

      if (parentId) {
        const parentFrame = framesAtPosition.find(f => f.id === parentId);
        if (parentFrame) {
          const frameX = parentFrame.absoluteTransform?.x ?? parentFrame.x;
          const frameY = parentFrame.absoluteTransform?.y ?? parentFrame.y;
          const frameRotation = parentFrame.absoluteTransform?.rotation ?? parentFrame.rotation ?? 0;

          // Translate to frame's origin
          const translatedX = canvasX - frameX;
          const translatedY = canvasY - frameY;

          // If frame is rotated, apply inverse rotation to get local coordinates
          if (frameRotation !== 0) {
            const rotRad = (-frameRotation * Math.PI) / 180; // Negative for inverse
            const cos = Math.cos(rotRad);
            const sin = Math.sin(rotRad);
            shapeX = translatedX * cos - translatedY * sin;
            shapeY = translatedX * sin + translatedY * cos;
          } else {
            shapeX = translatedX;
            shapeY = translatedY;
          }
        }
      }

      const newShape: Shape = {
        id: uuidv4(),
        type: currentDrawingTool,
        x: shapeX,
        y: shapeY,
        width: 1, // Start with minimal size
        height: 1, // Start with minimal size
        fill: defaults.fill || "#FFFFFF",
        stroke: defaults.stroke || "transparent",
        strokeWidth: defaults.strokeWidth || 0,
        rotation: defaults.rotation || 0,
        isVisible: defaults.isVisible !== undefined ? defaults.isVisible : true,
        isLocked: defaults.isLocked !== undefined ? defaults.isLocked : false,
        name: defaults.name,
        zIndex: 0,
        childIds: defaults.childIds || [],
        isContainer: defaults.isContainer || false,
        parentId: parentId,
      };

      setCurrentShape(newShape);
      return;
    }

    // If we found a shape
    if (shapeId) {
      const shape = shapes.find((s) => s.id === shapeId);

      setSelectedShapeId(shapeId);

      // Add to multi-selection if shift is pressed
      if (e.shiftKey) {
        toggleShapeSelection(shapeId);
      } else if (!selectedShapeIds.includes(shapeId)) {
        setSelectedShapeIds([shapeId]);
      }

      // Don't allow moving if the shape is locked
      if (shape && shape.isLocked === true) {
        return;
      }

      setIsSelecting(true);
      setIsDrawing(false);
      setIsMoving(true);
      setMoveStart({ x, y });
    }
    // If we didn't select anything, clear selection
    else {
      setSelectedShapeId(null);
      setSelectedShapeIds([]);
      setIsSelecting(false);
      setIsMoving(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasOffset({ x: canvasOffset.x + dx, y: canvasOffset.y + dy });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    if (!canvas2dRef.current) return;
    if (localIsResizing) return;

    const rect = canvas2dRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert screen coordinates to canvas coordinates (accounting for pan/zoom)
    const canvasX = (screenX - canvasOffset.x) / scale;
    const canvasY = (screenY - canvasOffset.y) / scale;

    // If we're drawing a new shape
    if (isDrawing && drawStart && currentShape) {
      // For lines, use start and two points
      if (currentShape.type === "line") {
        const dx = canvasX - drawStart.x;
        const dy = canvasY - drawStart.y;
        const updatedShape = {
          ...currentShape,
          x: drawStart.x,
          y: drawStart.y,
          width: dx,
          height: dy,
        };
        setCurrentShape(updatedShape);
      } else {
        let newWidth = Math.abs(canvasX - drawStart.x);
        let newHeight = Math.abs(canvasY - drawStart.y);
        let newX = Math.min(canvasX, drawStart.x);
        let newY = Math.min(canvasY, drawStart.y);

        // Convert to frame-relative if shape has a parent
        if (currentShape.parentId) {
          const parentFrame = flattenedShapes.find(s => s.id === currentShape.parentId);
          if (parentFrame) {
            const frameX = parentFrame.absoluteTransform?.x ?? parentFrame.x;
            const frameY = parentFrame.absoluteTransform?.y ?? parentFrame.y;
            newX = newX - frameX;
            newY = newY - frameY;
          }
        }

        const updatedShape = {
          ...currentShape,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        };
        setCurrentShape(updatedShape);
      }
    }
    // If we're moving an existing shape
    else if (isMoving && moveStart && selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);

      // Skip if the shape is locked
      if (shape && shape.isLocked) return;

      if (shape) {
        let deltaX = canvasX - moveStart.x;
        let deltaY = canvasY - moveStart.y;

        // If shape has a parent, transform delta to parent's local space
        if (shape.parentId) {
          const parent = shapes.find((s) => s.id === shape.parentId);
          if (parent && parent.rotation) {
            // Inverse rotate the delta to get local-space movement
            const rotRad = (-parent.rotation * Math.PI) / 180;
            const cos = Math.cos(rotRad);
            const sin = Math.sin(rotRad);
            const localDX = deltaX * cos - deltaY * sin;
            const localDY = deltaX * sin + deltaY * cos;
            deltaX = localDX;
            deltaY = localDY;
          }
        }

        // Handle multi-select movement
        if (selectedShapeIds.length > 1) {
          selectedShapeIds.forEach((id) => {
            const s = shapes.find((shape) => shape.id === id);
            if (s && !s.isLocked) {
              // Each shape might have different parent, recalculate delta
              let shapeDeltaX = canvasX - moveStart.x;
              let shapeDeltaY = canvasY - moveStart.y;

              if (s.parentId) {
                const parent = shapes.find((p) => p.id === s.parentId);
                if (parent && parent.rotation) {
                  const rotRad = (-parent.rotation * Math.PI) / 180;
                  const cos = Math.cos(rotRad);
                  const sin = Math.sin(rotRad);
                  const localDX = shapeDeltaX * cos - shapeDeltaY * sin;
                  const localDY = shapeDeltaX * sin + shapeDeltaY * cos;
                  shapeDeltaX = localDX;
                  shapeDeltaY = localDY;
                }
              }

              updateShape(id, {
                x: s.x + shapeDeltaX,
                y: s.y + shapeDeltaY,
              });
            }
          });
        } else {
          // Single shape movement
          updateShape(selectedShapeId, {
            x: shape.x + deltaX,
            y: shape.y + deltaY,
          });
        }

        setMoveStart({ x: canvasX, y: canvasY });
        invalidateCache(); // Ensure hierarchical cache is updated
      }
    }
    // Hover detection when idle (no drawing/moving/panning)
    if (!isDrawing && !isMoving && !panStart) {
      const hoverId = findShapeAtPosition(screenX, screenY);
      if (hoverId !== hoveredShapeId) {
        setHoveredShapeId(hoverId);
      }
    }
  };

  // Helper to find which frame (if any) contains a shape's center point
  const findContainingFrame = useCallback(
    (shapeX: number, shapeY: number, shapeWidth: number, shapeHeight: number, excludeId?: string): string | null => {
      // Calculate shape's center in canvas coordinates
      const centerX = shapeX + shapeWidth / 2;
      const centerY = shapeY + shapeHeight / 2;

      // Find all frames sorted by zIndex (highest first)
      const frames = flattenedShapes
        .filter((s) => s.type === "frame" && s.id !== excludeId && s.isVisible !== false)
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

      // Check if center point is inside any frame
      for (const frame of frames) {
        const frameX = frame.absoluteTransform?.x ?? frame.x;
        const frameY = frame.absoluteTransform?.y ?? frame.y;

        if (
          centerX >= frameX &&
          centerX <= frameX + frame.width &&
          centerY >= frameY &&
          centerY <= frameY + frame.height
        ) {
          return frame.id;
        }
      }

      return null;
    },
    [flattenedShapes]
  );

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panStart) {
      setPanStart(null);
      // Reset interactions after pan
      setIsMoving(false);
      setIsDrawing(false);
      setIsSelecting(false);
      setDrawStart(null);
      setMoveStart(null);
      return;
    }
    if (!canvas2dRef.current) return;

    // If we just finished moving a shape, check if it should enter/exit a frame (Figma behavior)
    if (isMoving && selectedShapeId) {
      // Use flattenedShapes to get absoluteTransform
      const movedShape = flattenedShapes.find((s) => s.id === selectedShapeId);
      if (movedShape && movedShape.type !== "frame" && movedShape.type !== "group") {
        // Get absolute position for frame detection
        const absoluteX = movedShape.absoluteTransform?.x ?? movedShape.x;
        const absoluteY = movedShape.absoluteTransform?.y ?? movedShape.y;

        // Find which frame (if any) now contains this shape's center
        const newContainingFrameId = findContainingFrame(
          absoluteX,
          absoluteY,
          movedShape.width,
          movedShape.height,
          selectedShapeId
        );

        // Check if parent changed
        if (newContainingFrameId !== movedShape.parentId) {
          if (newContainingFrameId) {
            // Moving INTO a frame
            // CRITICAL: Use flattenedShapes to get absoluteTransform
            const frame = flattenedShapes.find((s) => s.id === newContainingFrameId);
            if (frame) {
              // Convert absolute coordinates to be relative to frame
              const frameX = frame.absoluteTransform?.x ?? frame.x;
              const frameY = frame.absoluteTransform?.y ?? frame.y;
              const frameRotation = frame.absoluteTransform?.rotation ?? frame.rotation ?? 0;

              let relX = absoluteX - frameX;
              let relY = absoluteY - frameY;

              // If frame is rotated, inverse-rotate into frame's local space
              if (frameRotation !== 0) {
                const rotRad = (-frameRotation * Math.PI) / 180;
                const cos = Math.cos(rotRad);
                const sin = Math.sin(rotRad);

                // Translate to frame center
                relX = relX - frame.width / 2;
                relY = relY - frame.height / 2;

                // Rotate
                const localX = relX * cos - relY * sin;
                const localY = relX * sin + relY * cos;

                // Translate back from center
                relX = localX + frame.width / 2;
                relY = localY + frame.height / 2;
              }

              updateShape(selectedShapeId, {
                parentId: newContainingFrameId,
                x: relX,
                y: relY,
              });
            }
          } else if (movedShape.parentId) {
            // Moving OUT of a frame - coordinates are already absolute from movement
            updateShape(selectedShapeId, {
              parentId: undefined,
              x: absoluteX,
              y: absoluteY,
            });
          }
        }
      }
    }

    // If we were drawing a new shape, finalize it
    if (isDrawing && currentShape) {
      // Only add the shape if it has sufficient size (special case for lines)
      const isLine = currentShape.type === "line";
      const length = Math.hypot(currentShape.width, currentShape.height);
      if (
        (isLine && length > 5) ||
        (!isLine && currentShape.width > 5 && currentShape.height > 5)
      ) {
        // Find the highest zIndex in the current shapes
        const highestZIndex = shapes.reduce(
          (max, shape) => Math.max(max, shape.zIndex || 0),
          0
        );

        // Create final shape with a higher zIndex to be on top
        // Preserve the fill color exactly as set in the currentShape
        let finalShape = {
          ...currentShape,
          zIndex: highestZIndex + 1,
          name:
            currentShape.name ||
            `${
              currentShape.type.charAt(0).toUpperCase() +
              currentShape.type.slice(1)
            } ${shapes.length + 1}`,
        };

        // No coordinate conversion needed - shapes are already stored in frame-relative coordinates

        // Batch these operations together to prevent setState during render
        const newShapeId = addShape(finalShape);

        // Use requestAnimationFrame to defer the parent update safely
        // This prevents setState during render errors
        if (finalShape.parentId) {
          const frameId = requestAnimationFrame(() => {
            const parentShape = shapes.find(
              (shape) => shape.id === finalShape.parentId
            );
            if (parentShape) {
              updateShape(parentShape.id, {
                childIds: [...(parentShape.childIds || []), newShapeId],
              });
              // Invalidate cache after the parent update
              invalidateCache();
            }
          });
          // Cleanup is not needed as this runs once and completes
        }

        setSelectedShapeId(newShapeId);
        setSelectedShapeIds([newShapeId]);
      }

      setCurrentShape(null);
      setCurrentDrawingTool(null);
    }

    // Reset all interaction states
    setIsDrawing(false);
    setIsMoving(false);
    setIsSelecting(false);
    setDrawStart(null);
    setMoveStart(null);

    // Defer cache invalidation to prevent setState during render
    if (!isDrawing || !currentShape?.parentId) {
      requestAnimationFrame(() => {
        invalidateCache();
      });
    }
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas2dRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const delta = -e.deltaY * 0.001;
        const newScale = Math.max(0.1, scale * (1 + delta));
        const offsetX = canvasOffset.x - (x / scale) * (newScale - scale);
        const offsetY = canvasOffset.y - (y / scale) * (newScale - scale);
        setScale(newScale);
        setCanvasOffset({ x: offsetX, y: offsetY });
      } else {
        setCanvasOffset({
          x: canvasOffset.x + e.deltaX,
          y: canvasOffset.y + e.deltaY,
        });
      }
    },
    [scale, canvasOffset, setScale, setCanvasOffset]
  );

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvas2dRef.current || !webglCanvasRef.current) return;

      const rect = canvas2dRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Resize both canvases
      canvas2dRef.current.width = rect.width * dpr;
      canvas2dRef.current.height = rect.height * dpr;
      webglCanvasRef.current.width = rect.width * dpr;
      webglCanvasRef.current.height = rect.height * dpr;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);


  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeIds.length > 0) {
          e.preventDefault();
          deleteSelectedShapes();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShapeIds, deleteSelectedShapes]);

  // Space key toggles panning
  useEffect(() => {
    const handleKeyDownSpace = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const handleKeyUpSpace = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleKeyDownSpace);
    window.addEventListener("keyup", handleKeyUpSpace);
    return () => {
      window.removeEventListener("keydown", handleKeyDownSpace);
      window.removeEventListener("keyup", handleKeyUpSpace);
    };
  }, []);

  const getCursorStyle = () => {
    if (panStart) return "grabbing";
    if (isPanning) return "grab";
    if (currentDrawingTool) return "crosshair";
    if (isMoving) return "move";
    return "default";
  };

  // Listen for theme changes from system preferences
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(isDarkMode ? "dark" : "light");
    };

    // Check theme on mount
    checkTheme();

    // Set up listener for theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Layer 1: WebGL Canvas (background, shapes) */}
      <canvas
        ref={webglCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 bg-zinc-900"
        style={{ pointerEvents: "none" }}
      />

      {/* Layer 2: Canvas2D Overlay (selection, UI) */}
      <canvas
        ref={canvas2dRef}
        onContextMenu={(e) => e.preventDefault()}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="absolute top-0 left-0"
        style={{ cursor: getCursorStyle() }}
      />

      {/* Render selection controls over the canvas */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          transform: `matrix(${scale}, 0, 0, ${scale}, ${canvasOffset.x}, ${canvasOffset.y})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Hover highlight outline (skip for lines) - Figma style */}
        {hoveredShapeId &&
          hoveredShapeId !== selectedShapeId &&
          (() => {
            const shape = flattenedShapes.find((s) => s.id === hoveredShapeId);
            // Don't show hover box for line shapes
            if (!shape || shape.type === "line") return null;
            const hx = shape.absoluteTransform?.x ?? shape.x;
            const hy = shape.absoluteTransform?.y ?? shape.y;
            const rotationAngle =
              shape.absoluteTransform?.rotation ?? shape.rotation;
            return (
              <div
                className="absolute"
                style={{
                  left: hx,
                  top: hy,
                  width: shape.width,
                  height: shape.height,
                  border: "1.5px solid #1E90FF",
                  borderRadius: "1px",
                  opacity: 0.5,
                  transform: `rotate(${rotationAngle}deg)`,
                  transformOrigin: "center center",
                  pointerEvents: "none",
                }}
              />
            );
          })()}
        <SelectionControls />
      </div>
    </div>
  );
}

// Helper function to determine if a shape can be rendered with WebGL
function canUseWebGL(shape: Shape): boolean {
  // WebGL currently supports: rectangle, ellipse, line
  // Canvas2D fallback for: frame, group, text (future), or shapes with complex features

  // Don't use WebGL if shape has features WebGL doesn't support yet
  if (shape.shadow?.enabled) return false;
  if (shape.borderRadius) return false;

  // Check shape type
  const webglSupportedTypes: ShapeType[] = ["rectangle", "ellipse", "line"];
  return webglSupportedTypes.includes(shape.type);
}

// Helper function to get default properties for different shape types
function getDefaultPropertiesForShape(type: ShapeType): Partial<Shape> {
  const defaultShadow = {
    enabled: false,
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
    color: "#000000",
    opacity: 0.2,
  };

  switch (type) {
    case "rectangle":
      return {
        rotation: 0,
        fill: "#FFFFFF",
        stroke: "transparent",
        strokeWidth: 0,
        isVisible: true,
        isLocked: false,
        shadow: defaultShadow,
      };
    case "ellipse":
      return {
        rotation: 0,
        fill: "#FFFFFF",
        stroke: "transparent",
        strokeWidth: 0,
        isVisible: true,
        isLocked: false,
        shadow: defaultShadow,
      };
    case "line":
      return {
        rotation: 0,
        fill: "transparent",
        stroke: "#FFFFFF",
        strokeWidth: 2,
        isVisible: true,
        isLocked: false,
        shadow: defaultShadow,
      };
    case "frame":
      return {
        rotation: 0,
        fill: "#88888810",
        stroke: "#888888",
        strokeWidth: 1,
        isVisible: true,
        isLocked: false,
        isContainer: true,
        childIds: [],
        clipContent: true, // Frames clip overflowing content
        autoResize: false, // Frames don't auto-resize
        shadow: defaultShadow,
      };
    case "group":
      return {
        rotation: 0,
        fill: "transparent",
        stroke: "#6366f180",
        strokeWidth: 1,
        isVisible: true,
        isLocked: false,
        isContainer: true,
        childIds: [],
        clipContent: false, // Groups don't clip content
        autoResize: true, // Groups auto-resize based on children
        shadow: defaultShadow,
      };
    default:
      return {
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeWidth: 1,
        isVisible: true,
        isLocked: false,
        shadow: defaultShadow,
      };
  }
}

// Draw selection handles for the selected shape
function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  zoom: number
) {
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const handleSize = 8 / zoom; // Keep handle size consistent regardless of zoom

  // Corner handles
  const handles = [
    { x: -halfWidth, y: -halfHeight }, // Top-left
    { x: halfWidth, y: -halfHeight }, // Top-right
    { x: halfWidth, y: halfHeight }, // Bottom-right
    { x: -halfWidth, y: halfHeight }, // Bottom-left
    { x: 0, y: -halfHeight }, // Top-center
    { x: halfWidth, y: 0 }, // Middle-right
    { x: 0, y: halfHeight }, // Bottom-center
    { x: -halfWidth, y: 0 }, // Middle-left
  ];

  // Draw each handle
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#6633cc";
  ctx.lineWidth = 1 / zoom;

  handles.forEach((handle) => {
    ctx.beginPath();
    ctx.rect(
      handle.x - handleSize / 2,
      handle.y - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.fill();
    ctx.stroke();
  });

  // Draw rotation handle
  const rotationHandleY = -halfHeight - 30 / zoom;
  ctx.beginPath();
  ctx.moveTo(0, -halfHeight);
  ctx.lineTo(0, rotationHandleY);
  ctx.stroke();

  // Draw rotation circle
  ctx.beginPath();
  ctx.arc(0, rotationHandleY, handleSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
