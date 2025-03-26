import React, { useEffect } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { ResizeHandle } from "../lib/webgl/types";

interface HandleProps {
  position: { x: number; y: number };
  cursor: string;
  handle: ResizeHandle;
  onMouseDown: (handle: ResizeHandle, e: React.MouseEvent) => void;
}

const Handle: React.FC<HandleProps> = ({
  position,
  cursor,
  handle,
  onMouseDown,
}) => {
  return (
    <div
      className="absolute w-3 h-3 bg-white border border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: cursor,
      }}
      onMouseDown={(e) => onMouseDown(handle, e)}
    />
  );
};

export function SelectionControls() {
  const {
    selectedShapeId,
    getSelectedShape,
    startResizing,
    resizeSelectedShape,
    endResizing,
    selectionState,
  } = useCanvasStore();

  const shape = getSelectedShape();

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

  // Add document-level event listeners when resizing
  useEffect(() => {
    if (selectionState.activeHandle) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [selectionState.activeHandle, selectedShapeId]);

  if (!shape || !selectedShapeId) return null;

  const { x, y, width, height } = shape;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Selection outline */}
      <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

      {/* Handles - pointer events enabled for these */}
      <div className="pointer-events-auto">
        {/* Corner handles */}
        <Handle
          position={{ x: 0, y: 0 }}
          cursor="nwse-resize"
          handle="top-left"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width, y: 0 }}
          cursor="nesw-resize"
          handle="top-right"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: 0, y: height }}
          cursor="nesw-resize"
          handle="bottom-left"
          onMouseDown={handleMouseDown}
        />
        <Handle
          position={{ x: width, y: height }}
          cursor="nwse-resize"
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

        {/* Rotation handle (optional) 
        <Handle
          position={{ x: width / 2, y: -20 }}
          cursor="grab"
          handle="rotate"
          onMouseDown={handleMouseDown}
        />
        */}
      </div>
    </div>
  );
}
