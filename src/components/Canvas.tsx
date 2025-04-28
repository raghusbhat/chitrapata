import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { createWebGLContext } from "../lib/webgl/context";
import { Shape, ShapeType } from "../lib/webgl/types";
import { renderShape } from "../lib/webgl/shapes";
import { v4 as uuidv4 } from "uuid";
import { SelectionControls } from "./SelectionControls";
import { mat4 } from "gl-matrix";

interface CanvasProps {
  width: number;
  height: number;
}

export function Canvas({ width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glContextRef = useRef<ReturnType<typeof createWebGLContext> | null>(
    null
  );
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
    isResizing,
    setIsResizing,
    scale,
    setScale,
    canvasOffset,
    setCanvasOffset,
    setSelectedShapeIds,
    selectionState,
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
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);

  // Initialize WebGL context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clean up any existing WebGL context first
    if (glContextRef.current) {
      const { gl, program } = glContextRef.current;
      gl.deleteProgram(program);
      glContextRef.current = null;
      console.log("Cleaned up previous WebGL context");
    }

    console.log("Initializing WebGL context...");
    try {
      // Get device pixel ratio and CSS size
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.floor(width * dpr);
      const displayHeight = Math.floor(height * dpr);

      // Set canvas size in pixels
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Set canvas CSS size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      console.log("Canvas dimensions set:", {
        displayWidth,
        displayHeight,
        cssWidth: width,
        cssHeight: height,
        dpr,
      });

      glContextRef.current = createWebGLContext(canvas);
      const { gl } = glContextRef.current;

      // Set viewport to match canvas pixel size
      gl.viewport(0, 0, displayWidth, displayHeight);

      // Set clear color (dark theme)
      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Enable blending for anti-aliased edges
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Disable depth testing for 2D shapes - helps with transparency
      gl.disable(gl.DEPTH_TEST);

      // Tell WebGL how to unpack pixels, important for texture, alpha and performance
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      console.log("WebGL context initialized successfully");
    } catch (error) {
      console.error("Failed to initialize WebGL:", error);
    }
  }, [width, height]);

  // Force resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !glContextRef.current) return;

    const { gl } = glContextRef.current;

    // Get device pixel ratio and CSS size
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(width * dpr);
    const displayHeight = Math.floor(height * dpr);

    // Update canvas size if it differs from props
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      // Set canvas size in pixels
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Set canvas CSS size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Update viewport
      gl.viewport(0, 0, displayWidth, displayHeight);
      console.log("Resized canvas and viewport:", {
        displayWidth,
        displayHeight,
      });
    }
  }, [width, height]);

  // Sync selection state with local state
  useEffect(() => {
    // Initial state sync
    const activeHandle = useCanvasStore.getState().selectionState.activeHandle;
    setIsResizing(activeHandle !== null);

    // Create a subscription to selectionState.activeHandle changes
    const unsubscribe = useCanvasStore.subscribe((state) => {
      // When activeHandle changes, update isResizing
      const newActiveHandle = state.selectionState.activeHandle;
      if ((newActiveHandle !== null) !== isResizing) {
        setIsResizing(newActiveHandle !== null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [isResizing]);

  // Get flattened shapes for rendering with memoization
  const flattenedShapes = useMemo(() => {
    // Use the optimized flattened shapes from the store
    const allShapes = getFlattenedShapes();
    // Filter only visible shapes
    return allShapes.filter((shape) => shape.isVisible !== false);
  }, [getFlattenedShapes, shapes]); // Also depend on shapes so flattenedShapes updates on shape changes

  // Render shapes
  useEffect(() => {
    if (!glContextRef.current || !canvasRef.current) {
      console.log("No WebGL context or canvas available");
      return;
    }

    // Activate shader program before drawing
    const { gl, program } = glContextRef.current!;
    gl.useProgram(program);
    const { uniforms } = glContextRef.current!;
    const camMatrix = mat4.create();
    const dpr = window.devicePixelRatio || 1;
    mat4.translate(camMatrix, camMatrix, [canvasOffset.x * dpr, canvasOffset.y * dpr, 0]);
    mat4.scale(camMatrix, camMatrix, [scale, scale, 1]);
    gl.uniformMatrix4fv(uniforms.cameraMatrix, false, camMatrix);

    // Render directly to default framebuffer (antialias via context's antialias flag)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable blending for anti-aliased edges
    gl.enable(gl.BLEND);
    // Reset blend function before rendering
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    try {
      // Sort shapes by zIndex (lower zIndex first, so they're rendered below)
      const sortedShapes = [...flattenedShapes].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );

      // Log all shapes to be rendered
      console.log("[Canvas] Shapes to render:", sortedShapes.map(s => ({id: s.id, type: s.type, fill: s.fill, alpha: s.fill?.toString(), isVisible: s.isVisible})));

      // First, render all non-container shapes or containers with no clipping
      sortedShapes
        .filter((shape) => {
          if (shape.isVisible === false) {
            console.log(`[Canvas] Skipping invisible shape: ${shape.id}`);
            return false;
          }
          return !shape.clipContent;
        })
        .forEach((shape) => {
          // Use absolute transforms for rendering
          const renderProps = {
            ...shape,
            x: shape.absoluteTransform?.x ?? shape.x,
            y: shape.absoluteTransform?.y ?? shape.y,
            rotation: shape.absoluteTransform?.rotation ?? shape.rotation,
          };

          renderShape(gl, renderProps, glContextRef.current!);
        });

      // Then render containers with clipping (mostly frames)
      sortedShapes
        .filter((shape) => shape.clipContent)
        .forEach((shape) => {
          // Use absolute transforms for rendering
          const renderProps = {
            ...shape,
            x: shape.absoluteTransform?.x ?? shape.x,
            y: shape.absoluteTransform?.y ?? shape.y,
            rotation: shape.absoluteTransform?.rotation ?? shape.rotation,
          };

          // For frames with clipping, we need to handle special rendering
          renderShape(gl, renderProps, glContextRef.current!);

          // We would need a more complex implementation to properly handle WebGL clipping
          // In a real implementation, we would use scissor testing or stencil buffer
          // For now, we rely on the correct z-ordering and parent-child relationships
        });

      // Render current shape if drawing (always on top)
      if (currentShape && isDrawing) {
        console.log("Rendering current shape while drawing:", {
          type: currentShape.type,
          fill: currentShape.fill,
          stroke: currentShape.stroke,
          isVisible: currentShape.isVisible,
        });
        renderShape(gl, currentShape, glContextRef.current!);
      }
    } catch (error) {
      console.error("Error rendering shapes:", error);
    }
  }, [flattenedShapes, currentShape, isDrawing, scale, canvasOffset]);

  // Find a shape at the given position, considering hierarchy
  const findShapeAtPosition = useCallback(
    (x: number, y: number): string | null => {
      // Reverse order to check top-most shapes first (higher zIndex)
      const sortedShapes = [...flattenedShapes].sort(
        (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
      );

      for (const shape of sortedShapes) {
        // Use absolute transform for position checking
        const shapeX = shape.absoluteTransform?.x ?? shape.x;
        const shapeY = shape.absoluteTransform?.y ?? shape.y;

        if (
          x >= shapeX &&
          x <= shapeX + shape.width &&
          y >= shapeY &&
          y <= shapeY + shape.height
        ) {
          return shape.id;
        }
      }
      return null;
    },
    [flattenedShapes]
  );

  // Create a new frame when the button is clicked
  const handleCreateFrame = useCallback(() => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
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
    const canvas = canvasRef.current;
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
      setDrawStart({ x, y });
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
          x >= frameX &&
          x <= frameX + frame.width &&
          y >= frameY &&
          y <= frameY + frame.height
        ) {
          parentId = frame.id;
          break;
        }
      }

      // Create new shape with default properties
      const defaults = getDefaultPropertiesForShape(currentDrawingTool);

      const newShape: Shape = {
        id: uuidv4(),
        type: currentDrawingTool,
        x: parentId
          ? x -
            (framesAtPosition.find((frame) => frame.id === parentId)
              ?.absoluteTransform?.x ?? 0)
          : x,
        y: parentId
          ? y -
            (framesAtPosition.find((frame) => frame.id === parentId)
              ?.absoluteTransform?.y ?? 0)
          : y,
        width: 1, // Start with minimal size
        height: 1, // Start with minimal size
        fill: defaults.fill || "#FFFFFF",
        stroke: defaults.stroke || "#000000",
        strokeWidth: defaults.strokeWidth || 2,
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

      console.log("Selecting shape:", shapeId);
      setSelectedShapeId(shapeId);

      // Add to multi-selection if shift is pressed
      if (e.shiftKey) {
        toggleShapeSelection(shapeId);
      } else if (!selectedShapeIds.includes(shapeId)) {
        setSelectedShapeIds([shapeId]);
      }

      // Don't allow moving if the shape is locked
      if (shape && shape.isLocked === true) {
        console.log("Shape is locked, cannot move");
        return;
      }

      setIsSelecting(true);
      setIsDrawing(false);
      setIsMoving(true);
      setMoveStart({ x, y });
    }
    // If we didn't select anything, clear selection
    else {
      console.log("Deselecting shapes");
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
    if (!canvasRef.current) return;
    if (isResizing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If we're drawing a new shape
    if (isDrawing && drawStart && currentShape) {
      // For lines, use start and two points
      if (currentShape.type === "line") {
        const dx = x - drawStart.x;
        const dy = y - drawStart.y;
        setCurrentShape({
          ...currentShape,
          x: drawStart.x,
          y: drawStart.y,
          width: dx,
          height: dy,
        });
      } else {
        const newWidth = Math.abs(x - drawStart.x);
        const newHeight = Math.abs(y - drawStart.y);
        const newX = Math.min(x, drawStart.x);
        const newY = Math.min(y, drawStart.y);

        setCurrentShape({
          ...currentShape,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
    }
    // If we're moving an existing shape
    else if (isMoving && moveStart && selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);

      // Skip if the shape is locked
      if (shape && shape.isLocked) return;

      if (shape) {
        const deltaX = x - moveStart.x;
        const deltaY = y - moveStart.y;

        // Handle multi-select movement
        if (selectedShapeIds.length > 1) {
          selectedShapeIds.forEach((id) => {
            const s = shapes.find((shape) => shape.id === id);
            if (s && !s.isLocked) {
              updateShape(id, {
                x: s.x + deltaX,
                y: s.y + deltaY,
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

        setMoveStart({ x, y });
        invalidateCache(); // Ensure hierarchical cache is updated
      }
    }
    // Hover detection when idle (no drawing/moving/panning)
    if (!isDrawing && !isMoving && !panStart) {
      const hoverId = findShapeAtPosition(x, y);
      if (hoverId !== hoveredShapeId) {
        setHoveredShapeId(hoverId);
      }
    }
  };

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
    if (!canvasRef.current) return;

    // If we were drawing a new shape, finalize it
    if (isDrawing && currentShape) {
      // Only add the shape if it has sufficient size (special case for lines)
      const isLine = currentShape.type === "line";
      const length = Math.hypot(currentShape.width, currentShape.height);
      if ((isLine && length > 5) || (!isLine && currentShape.width > 5 && currentShape.height > 5)) {
        // Find the highest zIndex in the current shapes
        const highestZIndex = shapes.reduce(
          (max, shape) => Math.max(max, shape.zIndex || 0),
          0
        );

        // Create final shape with a higher zIndex to be on top
        // Preserve the fill color exactly as set in the currentShape
        const finalShape = {
          ...currentShape,
          zIndex: highestZIndex + 1,
          name:
            currentShape.name ||
            `${
              currentShape.type.charAt(0).toUpperCase() +
              currentShape.type.slice(1)
            } ${shapes.length + 1}`,
        };

        console.log("Adding new shape:", finalShape);

        // Batch these operations together to prevent setState during render
        const newShapeId = addShape(finalShape);

        // Use a setTimeout to defer the parent update to the next tick
        // This prevents setState during render errors
        if (finalShape.parentId) {
          setTimeout(() => {
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
          }, 0);
        }

        setSelectedShapeId(newShapeId);
        setSelectedShapeIds([newShapeId]);
      } else {
        console.log("Discarding tiny shape:", currentShape);
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
      setTimeout(() => {
        invalidateCache();
      }, 0);
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = canvasRef.current?.getBoundingClientRect();
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
      setCanvasOffset({ x: canvasOffset.x + e.deltaX, y: canvasOffset.y + e.deltaY });
    }
  }, [scale, canvasOffset, setScale, setCanvasOffset]);

  // Add keyboard event listener for delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Delete all selected shapes
        if (selectedShapeIds.length > 0) {
          selectedShapeIds.forEach((id) => deleteShape(id));
          setSelectedShapeId(null);
          invalidateCache();
        }
        // If no multi-selection, delete the single selected shape
        else if (selectedShapeId) {
          deleteShape(selectedShapeId);
          setSelectedShapeId(null);
          invalidateCache();
        }
      }
      // Shortcut for grouping (Ctrl+G)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (selectedShapeIds.length > 1) {
          handleCreateGroup();
        }
      }
      // Shortcut for ungrouping (Ctrl+Shift+G)
      else if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "g"
      ) {
        e.preventDefault();
        handleUngroup();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedShapeId,
    deleteShape,
    handleCreateGroup,
    handleUngroup,
    invalidateCache,
  ]);

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

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="bg-zinc-900"
        style={{ cursor: getCursorStyle() }}
      />

      {/* Render selection controls over the canvas */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          transform: `matrix(${scale}, 0, 0, ${scale}, ${canvasOffset.x}, ${canvasOffset.y})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Hover highlight outline (skip for lines) */}
        {hoveredShapeId && hoveredShapeId !== selectedShapeId && (() => {
          const shape = flattenedShapes.find((s) => s.id === hoveredShapeId);
          // Don't show hover box for line shapes
          if (!shape || shape.type === "line") return null;
          const hx = shape.absoluteTransform?.x ?? shape.x;
          const hy = shape.absoluteTransform?.y ?? shape.y;
          const rotationAngle = shape.absoluteTransform?.rotation ?? shape.rotation;
          return (
            <div
              className="absolute"
              style={{
                left: hx,
                top: hy,
                width: shape.width,
                height: shape.height,
                border: '1px solid rgba(96,165,250,0.7)',
                borderRadius: '4px',
                transform: `rotate(${rotationAngle}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
              }}
            />
          );
        })()}
        <SelectionControls />
      </div>
    </div>
  );
}

// Helper function to get default properties for different shape types
function getDefaultPropertiesForShape(type: ShapeType): Partial<Shape> {
  switch (type) {
    case "rectangle":
      return {
        rotation: 0,
        fill: "#FFFFFF",
        stroke: "transparent",
        strokeWidth: 0,
        isVisible: true,
        isLocked: false,
      };
    case "ellipse":
      return {
        rotation: 0,
        fill: "#FFFFFF",
        stroke: "transparent",
        strokeWidth: 0,
        isVisible: true,
        isLocked: false,
      };
    case "line":
      return {
        rotation: 0,
        fill: "transparent",
        stroke: "#FFFFFF",
        strokeWidth: 2,
        isVisible: true,
        isLocked: false,
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
      };
    default:
      return {
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeWidth: 1,
        isVisible: true,
        isLocked: false,
      };
  }
}
