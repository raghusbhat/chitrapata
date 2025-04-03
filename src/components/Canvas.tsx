import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { createWebGLContext } from "../lib/webgl/context";
import { Shape } from "../lib/webgl/types";
import { renderShape } from "../lib/webgl/shapes";
import { v4 as uuidv4 } from "uuid";
import { SelectionControls } from "./SelectionControls";

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
    zoom,
    pan,
    isDrawing,
    setSelectedShape,
    setIsDrawing,
    addShape,
    selectedShape,
    selectedShapeId,
    setSelectedShapeId,
    deleteShape,
    updateShape,
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
      // Set canvas dimensions to match the container
      canvas.width = width;
      canvas.height = height;
      console.log("Canvas dimensions set:", { width, height });

      glContextRef.current = createWebGLContext(canvas);
      const { gl } = glContextRef.current;

      // Set viewport
      gl.viewport(0, 0, canvas.width, canvas.height);
      console.log("WebGL viewport set:", {
        width: canvas.width,
        height: canvas.height,
      });

      // Set clear color (dark theme)
      gl.clearColor(0.1, 0.1, 0.1, 1.0);

      // Enable blending for transparent shapes
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      console.log("WebGL context initialized successfully");
    } catch (error) {
      console.error("Failed to initialize WebGL:", error);
    }

    // Cleanup
    return () => {
      if (glContextRef.current) {
        const { gl, program } = glContextRef.current;
        gl.deleteProgram(program);
        glContextRef.current = null;
        console.log("Cleaned up WebGL context on unmount");
      }
    };
  }, [width, height]);

  // Force resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !glContextRef.current) return;

    const { gl } = glContextRef.current;

    // Update canvas size if it differs from props
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      console.log("Resized canvas and viewport:", { width, height });
    }
  }, [width, height]);

  // Render shapes
  useEffect(() => {
    if (!glContextRef.current || !canvasRef.current) {
      console.log("No WebGL context or canvas available");
      return;
    }

    const { gl } = glContextRef.current;
    console.log("=== Rendering Shapes ===");
    console.log("Shapes count:", shapes.length);
    console.log("Selected shape type:", selectedShape?.type);
    console.log("Current shape:", currentShape);
    console.log("Is drawing:", isDrawing);
    console.log("Canvas dimensions:", {
      width: canvasRef.current.width,
      height: canvasRef.current.height,
    });

    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);

    try {
      // Sort shapes by zIndex (lower zIndex first, so they're rendered below)
      const sortedShapes = [...shapes]
        .filter((shape) => shape.isVisible !== false) // Only render visible shapes
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // Render existing shapes in order
      sortedShapes.forEach((shape, index) => {
        console.log(
          `Rendering shape ${index}:`,
          shape.type,
          shape.id,
          shape.x,
          shape.y,
          shape.width,
          shape.height,
          `zIndex: ${shape.zIndex || 0}`
        );
        renderShape(gl, shape, glContextRef.current!);
      });

      // Render current shape if drawing (always on top)
      if (currentShape && isDrawing) {
        console.log(
          "Rendering current shape while drawing:",
          currentShape.type,
          currentShape.id,
          currentShape.x,
          currentShape.y,
          currentShape.width,
          currentShape.height
        );
        renderShape(gl, currentShape, glContextRef.current!);
      }
    } catch (error) {
      console.error("Error rendering shapes:", error);
    }

    console.log("=== End Rendering Shapes ===");
  }, [shapes, zoom, pan, currentShape, isDrawing, selectedShape?.type]);

  // Find a shape at the given position
  const findShapeAtPosition = (x: number, y: number): string | null => {
    // Reverse order to check top-most shapes first (higher zIndex)
    const sortedShapes = [...shapes]
      .filter((shape) => shape.isVisible !== false) // Only consider visible shapes
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    for (const shape of sortedShapes) {
      if (
        x >= shape.x &&
        x <= shape.x + shape.width &&
        y >= shape.y &&
        y <= shape.y + shape.height
      ) {
        return shape.id;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log("=== Mouse Down Event ===");

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas ref is null");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    console.log("Mouse position:", { clientX: e.clientX, clientY: e.clientY });
    console.log("Canvas position:", { x, y });
    console.log("Selected shape type:", selectedShape?.type);

    // Find shape under cursor
    const shapeId = findShapeAtPosition(x, y);

    // If we found a shape
    if (shapeId) {
      const shape = shapes.find((s) => s.id === shapeId);

      console.log("Selecting shape:", shapeId);
      setSelectedShapeId(shapeId);

      // Don't allow moving if the shape is locked
      if (shape && shape.isLocked === true) {
        console.log("Shape is locked, cannot move");
        return;
      }

      setIsSelecting(true);
      setIsDrawing(false);
      setIsMoving(true);
      setMoveStart({ x, y });
      setSelectedShape(null); // Clear selected shape type when selecting existing shape
    }
    // If in drawing mode and we have a selected shape type, start drawing
    else if (selectedShape && !shapeId) {
      console.log("Starting drawing with shape type:", selectedShape.type);
      setDrawStart({ x, y });
      setIsDrawing(true);
      setIsSelecting(false);

      // Default colors for different shape types
      let defaultFill = "#FFFFFF";
      let defaultStroke = "#000000";

      // Create new shape with default properties
      const newShape: Shape = {
        id: uuidv4(),
        type: selectedShape.type,
        x,
        y,
        width: 1, // Start with minimal size
        height: 1, // Start with minimal size
        rotation: 0,
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth: 2,
        zIndex: shapes.length, // Set zIndex to be on top
        isVisible: true,
        isLocked: false,
        name: `${
          selectedShape.type.charAt(0).toUpperCase() +
          selectedShape.type.slice(1)
        } ${shapes.length + 1}`,
      };

      console.log("Created initial shape:", newShape);
      setCurrentShape(newShape);
    }

    console.log("=== End Mouse Down Event ===");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Skip if no canvas ref
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If we're resizing a shape via SelectionControls, don't do anything here
    if (useCanvasStore.getState().selectionState.activeHandle) return;

    // If we're drawing a new shape
    if (isDrawing && drawStart && currentShape) {
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
    // If we're moving an existing shape
    else if (isMoving && moveStart && selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);

      // Skip if the shape is locked
      if (shape && shape.isLocked) return;

      if (shape) {
        const deltaX = x - moveStart.x;
        const deltaY = y - moveStart.y;

        updateShape(selectedShapeId, {
          x: shape.x + deltaX,
          y: shape.y + deltaY,
        });

        setMoveStart({ x, y });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Skip if no canvas ref
    if (!canvasRef.current) return;

    // If we were drawing a new shape, finalize it
    if (isDrawing && currentShape) {
      // Only add the shape if it has some size
      if (currentShape.width > 5 && currentShape.height > 5) {
        // Find the highest zIndex in the current shapes
        const highestZIndex = shapes.reduce(
          (max, shape) => Math.max(max, shape.zIndex || 0),
          0
        );

        // Create final shape with a higher zIndex to be on top
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
        addShape(finalShape);
        setSelectedShapeId(finalShape.id);
      } else {
        console.log("Discarding tiny shape:", currentShape);
      }

      setCurrentShape(null);
    }

    // Reset all interaction states
    setIsDrawing(false);
    setIsMoving(false);
    setIsSelecting(false);
    setDrawStart(null);
    setMoveStart(null);
  };

  // Add keyboard event listener for delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedShapeId) {
        deleteShape(selectedShapeId);
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedShapeId, deleteShape, setSelectedShapeId]);

  // Get cursor style based on current state
  const getCursorStyle = () => {
    if (selectedShape) {
      return "crosshair";
    } else if (isMoving) {
      return "move";
    } else {
      return "default";
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="bg-zinc-900"
        style={{
          cursor: getCursorStyle(),
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        }}
      />

      {/* Render selection controls over the canvas */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <SelectionControls />
      </div>

      {shapes.map((shape) => (
        <div
          key={shape.id}
          className="absolute"
          style={{
            left: shape.x,
            top: shape.y,
            width: shape.width,
            height: shape.height,
            transform: `rotate(${shape.rotation || 0}deg)`,
            transformOrigin: "center center",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
