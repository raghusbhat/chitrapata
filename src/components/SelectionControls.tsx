import React, { useEffect, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { ResizeHandle } from "../lib/webgl/types";

// Double-headed arrow SVG paths
const ROTATE_PATHS = '<path d="M105.011,215.096L87.069,262.1L135.437,248.251C119.542,247.569 104.329,230.992 105.011,215.096Z" fill="white"/><path d="M345.609,215.192L363.8,262.1L315.359,248.508C331.251,247.741 346.376,231.084 345.609,215.192Z" fill="white"/><path d="M113.593,237.759C187.19,177.459 261.694,176.607 337.147,237.9" stroke="white" fill="none" stroke-width="15"/>';
// Return a CSS cursor URL with the arrow rotated for the given handle
function getRotateCursor(handle: ResizeHandle): string {
  // Figma-like arrow orientation: arc faces the shape
  const angleMap: Partial<Record<ResizeHandle, number>> = {
    "top-left": -135,
    "top-right": -45,
    "bottom-right": 45,
    "bottom-left": 135,
    "rotate": 0,
  };
  const angle = angleMap[handle] ?? 0;
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g transform='translate(16,16) rotate(${angle}) scale(0.07,0.07) translate(-242,-258)'>${ROTATE_PATHS}</g></svg>") 16 16, auto`;
}

interface HandleProps {
  position: { x: number; y: number };
  cursor: string;
  handle: ResizeHandle;
  onMouseDown: (handle: ResizeHandle, e: React.MouseEvent) => void;
}

// Add a new component for rotation zones with cursor persistence
const RotationZone: React.FC<HandleProps> = ({
  position,
  cursor,
  handle,
  onMouseDown,
}) => {
  // Enhanced rotation zone: larger hit area and diagonal arrow rotation
  const size = 20;
  const half = size / 2;
  const posX = position.x;
  const posY = position.y + (handle.includes("bottom") ? half : -half);

  const [isRotating, setIsRotating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isRotating) {
      document.body.style.cursor = cursor;
      const handleMouseUp = () => {
        setIsRotating(false);
        document.body.style.cursor = "";
      };
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
      };
    }
  }, [isRotating, cursor]);

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: `${posX}px`,
        top: `${posY}px`,
        cursor,
        width: '10px', 
        height: '10px',
        zIndex: 10,
        pointerEvents: 'auto',
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={(e) => {
        setIsRotating(true);
        onMouseDown("rotate", e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Only show arc on hover or while rotating */}
      {isHovered || isRotating ? (() => {
        // Center the arc's center exactly at the corner point
        const arcProps: Record<string, { d: string; style?: React.CSSProperties }> = {
          'top-left': {
            d: 'M2,14 A12,12 0 0,1 14,2',
            style: { left: '-14px', top: '-14px' },
          },
          'top-right': {
            d: 'M14,2 A12,12 0 0,1 26,14',
            style: { right: '-14px', top: '-14px' },
          },
          'bottom-right': {
            d: 'M26,14 A12,12 0 0,1 14,26',
            style: { right: '-14px', bottom: '-14px' },
          },
          'bottom-left': {
            d: 'M14,26 A12,12 0 0,1 2,14',
            style: { left: '-14px', bottom: '-14px' },
          },
        };
        const arc = arcProps[handle];
        if (!arc) return null;
        return (
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              ...arc.style,
            }}
          >
            <path
              d={arc.d}
              fill="none"
              stroke="#75777a"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
              strokeDasharray="4,3"
            />
          </svg>
        );
      })() : null}
    </div>
  );
};

const Handle: React.FC<HandleProps> = ({
  position,
  cursor,
  handle,
  onMouseDown,
}) => (
  <div
    className="absolute w-2 h-2 bg-white border-2 border-primary"
    style={{
      left: `${position.x}px`,
      top: `${position.y}px`,
      cursor,
      transform: "translate(-50%, -50%)",
    }}
    onMouseDown={(e) => onMouseDown(handle, e)}
  />
);

export function SelectionControls() {
  const {
    selectedShapeId,
    startResizing,
    resizeSelectedShape,
    endResizing,
    selectionState,
  } = useCanvasStore();

  // Subscribe selected shape to react to rotation/resizing updates
  const shape = useCanvasStore((state) => state.getSelectedShape());

  const handleMouseDown = (handle: ResizeHandle, e: React.MouseEvent) => {
    if (!selectedShapeId || !shape) return;
    e.stopPropagation();
    startResizing(
      selectedShapeId,
      handle,
      { x: e.clientX, y: e.clientY },
      { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
    );
  };

  const handleMouseMove = (e: MouseEvent) => {
    resizeSelectedShape(
      { x: e.clientX, y: e.clientY },
      e.shiftKey // Pass shiftKey to maintain aspect ratio
    );
  };

  const handleMouseUp = () => {
    endResizing();
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    if (selectionState.activeHandle) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [selectionState.activeHandle]);

  if (!shape || !selectedShapeId) return null;

  // For lines, show only start/end handles (no bounding box)
  if (shape.type === "line") {
    const start = { x: shape.x, y: shape.y };
    const end = { x: shape.x + shape.width, y: shape.y + shape.height };
    return (
      <>
        <Handle position={start} cursor="pointer" handle="top-left" onMouseDown={handleMouseDown} />
        <Handle position={end} cursor="pointer" handle="bottom-right" onMouseDown={handleMouseDown} />
      </>
    );
  }

  const { x, y, width, height, rotation = 0 } = shape;

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }}
    >
      {/* Selection outline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          border: "1px solid rgb(var(--primary-color))",
          boxShadow: "0 0 0 1px rgba(var(--primary-color), 0.5)",
        }}
      />

      {/* Handles */}
      <div className="pointer-events-auto">
        {/* Four corner rotation zones only */}
        <RotationZone
          position={{ x: 0, y: 0 }}
          cursor={getRotateCursor("top-left")}
          handle="top-left"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: 0, y: 0 }}
          cursor="nw-resize"
          handle="top-left"
          onMouseDown={handleMouseDown}
        />

        <RotationZone
          position={{ x: width, y: 0 }}
          cursor={getRotateCursor("top-right")}
          handle="top-right"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width, y: 0 }}
          cursor="ne-resize"
          handle="top-right"
          onMouseDown={handleMouseDown}
        />

        <RotationZone
          position={{ x: width, y: height }}
          cursor={getRotateCursor("bottom-right")}
          handle="bottom-right"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width, y: height }}
          cursor="se-resize"
          handle="bottom-right"
          onMouseDown={handleMouseDown}
        />

        <RotationZone
          position={{ x: 0, y: height }}
          cursor={getRotateCursor("bottom-left")}
          handle="bottom-left"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: 0, y: height }}
          cursor="sw-resize"
          handle="bottom-left"
          onMouseDown={handleMouseDown}
        />

        {/* Edge handles remain unchanged */}
        <Handle position={{ x: width / 2, y: 0 }} cursor="ns-resize" handle="top" onMouseDown={handleMouseDown} />
        <Handle position={{ x: width, y: height / 2 }} cursor="ew-resize" handle="right" onMouseDown={handleMouseDown} />
        <Handle position={{ x: width / 2, y: height }} cursor="ns-resize" handle="bottom" onMouseDown={handleMouseDown} />
        <Handle position={{ x: 0, y: height / 2 }} cursor="ew-resize" handle="left" onMouseDown={handleMouseDown} />
      </div>
    </div>
  );
}
