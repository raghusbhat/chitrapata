import React, { useEffect, useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { ResizeHandle } from "../lib/webgl/types";

// Add the custom cursor as a constant at the top
const ROTATE_CURSOR = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16,16) scale(0.07,0.07) translate(-242,-258)"><path d="M105.011,215.096L87.069,262.1L135.437,248.251C119.542,247.569 104.329,230.992 105.011,215.096Z" fill="white"/><path d="M345.609,215.192L363.8,262.1L315.359,248.508C331.251,247.741 346.376,231.084 345.609,215.192Z" fill="white"/><path d="M113.593,237.759C187.19,177.459 261.694,176.607 337.147,237.9" stroke="white" fill="none" stroke-width="15"/></g></svg>') 16 16, auto`;

interface HandleProps {
  position: { x: number; y: number };
  cursor: string;
  handle: ResizeHandle;
  onMouseDown: (handle: ResizeHandle, e: React.MouseEvent) => void;
}

// Add a new component for rotation zones with cursor persistence
const RotationZone: React.FC<HandleProps> = ({
  position,
  handle,
  onMouseDown,
}) => {
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (isRotating) {
      // Add a class to the body when rotating to maintain cursor
      document.body.style.cursor = ROTATE_CURSOR;

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
  }, [isRotating]);

  return (
    <div
      className="absolute w-6 h-6"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 24}px`, // Position it 24px above the corner
        cursor: ROTATE_CURSOR,
        transform: "translate(-50%, -50%)",
      }}
      onMouseDown={(e) => {
        setIsRotating(true);
        onMouseDown("rotate", e);
      }}
    />
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
        {/* Corner handles with rotation zones */}
        <RotationZone
          position={{ x: 0, y: 0 }}
          cursor={ROTATE_CURSOR}
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
          cursor={ROTATE_CURSOR}
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
          position={{ x: 0, y: height }}
          cursor={ROTATE_CURSOR}
          handle="bottom-left"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: 0, y: height }}
          cursor="sw-resize"
          handle="bottom-left"
          onMouseDown={handleMouseDown}
        />

        <RotationZone
          position={{ x: width, y: height }}
          cursor={ROTATE_CURSOR}
          handle="bottom-right"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width, y: height }}
          cursor="se-resize"
          handle="bottom-right"
          onMouseDown={handleMouseDown}
        />

        {/* Edge handles */}
        <Handle
          position={{ x: width / 2, y: 0 }}
          cursor="ns-resize"
          handle="top"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width, y: height / 2 }}
          cursor="ew-resize"
          handle="right"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width / 2, y: height }}
          cursor="ns-resize"
          handle="bottom"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: 0, y: height / 2 }}
          cursor="ew-resize"
          handle="left"
          onMouseDown={handleMouseDown}
        />

        {/* Rotation handle */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: `${width / 2}px`,
            top: `-20px`,
            width: "8px",
            height: "8px",
            transform: "translate(-50%, -50%)",
            cursor: ROTATE_CURSOR,
          }}
          onMouseDown={(e) => {
            document.body.style.cursor = ROTATE_CURSOR;
            handleMouseDown("rotate", e);
          }}
          onMouseUp={() => {
            document.body.style.cursor = "";
          }}
        >
          <div className="w-full h-full bg-white rounded-full border border-primary" />
        </div>

        {/* Rotation handle line */}
        <div
          className="absolute bg-primary"
          style={{
            left: `${width / 2}px`,
            top: `-20px`,
            width: "1px",
            height: "20px",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
