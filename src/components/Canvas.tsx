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
      // Render existing shapes
      shapes.forEach((shape, index) => {
        console.log(
          `Rendering shape ${index}:`,
          shape.type,
          shape.id,
          shape.x,
          shape.y,
          shape.width,
          shape.height
        );
        renderShape(gl, shape, glContextRef.current!);
      });

      // Render current shape if drawing
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
    // Reverse order to check top-most shapes first
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
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

    // Try to find a shape under the cursor first for selection
    const shapeId = findShapeAtPosition(x, y);

    // If we found a shape, select it and start moving
    if (shapeId) {
      console.log("Selecting shape for move:", shapeId);
      setSelectedShapeId(shapeId);
      setIsSelecting(true);
      setIsDrawing(false);
      setIsMoving(true);
      setMoveStart({ x, y });
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
      };

      console.log("Created initial shape:", newShape);
      setCurrentShape(newShape);
    }
    // If we didn't find a shape, deselect
    else {
      console.log("Deselecting shapes");
      setSelectedShapeId(null);
      setIsSelecting(false);
      setIsMoving(false);
      setSelectedShape(null);
    }

    console.log("=== End Mouse Down Event ===");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && drawStart && currentShape) {
      console.log("=== Mouse Move Event ===");

      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("Canvas ref is null");
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log("Current mouse:", { x, y });
      console.log("Draw start:", drawStart);

      // Calculate new width and height
      let newWidth = Math.abs(x - drawStart.x);
      let newHeight = Math.abs(y - drawStart.y);
      newWidth = Math.max(newWidth, 1); // Ensure minimum size
      newHeight = Math.max(newHeight, 1); // Ensure minimum size

      // Calculate new position (if dragging left or up)
      const newX = x < drawStart.x ? x : drawStart.x;
      const newY = y < drawStart.y ? y : drawStart.y;

      // If shift key is pressed, maintain aspect ratio
      if (e.shiftKey) {
        const maxDimension = Math.max(newWidth, newHeight);
        newWidth = maxDimension;
        newHeight = maxDimension;
      }

      // Update current shape
      const updatedShape = {
        ...currentShape,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };

      console.log(
        "Updated shape:",
        updatedShape.type,
        updatedShape.id,
        updatedShape.x,
        updatedShape.y,
        updatedShape.width,
        updatedShape.height
      );
      setCurrentShape(updatedShape);

      console.log("=== End Mouse Move Event ===");
    } else if (isMoving && moveStart && selectedShapeId) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const deltaX = x - moveStart.x;
      const deltaY = y - moveStart.y;

      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape) {
        updateShape(selectedShapeId, {
          x: shape.x + deltaX,
          y: shape.y + deltaY,
        });
        setMoveStart({ x, y });
      }
    }
  };

  const handleMouseUp = () => {
    console.log("=== Mouse Up Event ===");
    console.log("Current shape on mouse up:", currentShape);

    // Only finish drawing if we were drawing
    if (
      isDrawing &&
      currentShape &&
      currentShape.width > 0 &&
      currentShape.height > 0
    ) {
      // Ensure minimum size for better visibility
      const finalShape = {
        ...currentShape,
        width: Math.max(currentShape.width, 10),
        height: Math.max(currentShape.height, 10),
      };

      console.log(
        "Adding shape to canvas:",
        finalShape.type,
        finalShape.id,
        finalShape.x,
        finalShape.y,
        finalShape.width,
        finalShape.height
      );
      addShape(finalShape);
      setSelectedShapeId(finalShape.id);
      setCurrentShape(null);
    } else {
      console.log("Not drawing or shape too small");
    }

    setDrawStart(null);
    setIsDrawing(false);
    setIsSelecting(false);
    setIsMoving(false);
    setMoveStart(null);
    console.log("=== End Mouse Up Event ===");
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
      />

      {/* Render selection controls over the canvas */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <SelectionControls />
      </div>
    </div>
  );
}
