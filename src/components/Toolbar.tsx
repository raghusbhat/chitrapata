import { useState, useEffect } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { ShapeType } from "../lib/webgl/types";
import {
  FiSquare,
  FiCircle,
  FiMinus,
  FiLayers,
  FiMaximize,
  FiCopy,
  FiTrash2,
  FiMove,
  FiGrid,
  FiPackage,
  FiFolder,
  FiBold,
} from "react-icons/fi";

interface ShortcutKey {
  key: string;
  description: string;
  action: () => void;
  condition?: boolean;
}

export function Toolbar() {
  const {
    selectedShapeIds,
    setCurrentDrawingTool,
    currentDrawingTool,
    createGroup,
    ungroup,
    createFrame,
    deleteSelectedShapes,
    duplicateSelectedShapes,
  } = useCanvasStore();

  const hasSelection = selectedShapeIds.length > 0;
  const hasMultipleSelection = selectedShapeIds.length > 1;

  // Toggle drawing tool
  const toggleDrawingTool = (tool: ShapeType) => {
    setCurrentDrawingTool(currentDrawingTool === tool ? null : tool);
  };

  // Check if a tool is active
  const isToolActive = (tool: ShapeType) => currentDrawingTool === tool;

  // Create group from selected shapes
  const handleCreateGroup = () => {
    if (hasMultipleSelection) {
      createGroup();
    }
  };

  // Ungroup the selected group
  const handleUngroup = () => {
    if (hasSelection && selectedShapeIds.length === 1) {
      ungroup(selectedShapeIds[0]);
    }
  };

  // Create frame from selected shapes or at default location
  const handleCreateFrame = () => {
    // Create a frame at default position
    const centerX = window.innerWidth / 2 - 150;
    const centerY = window.innerHeight / 2 - 100;

    createFrame({
      x: centerX,
      y: centerY,
      width: 300,
      height: 200,
      name: "New Frame",
    });
  };

  // Delete selected shapes
  const handleDelete = () => {
    if (hasSelection) {
      deleteSelectedShapes();
    }
  };

  // Duplicate selected shapes
  const handleDuplicate = () => {
    if (hasSelection) {
      duplicateSelectedShapes();
    }
  };

  // Define keyboard shortcuts
  const shortcuts: ShortcutKey[] = [
    {
      key: "R",
      description: "Rectangle",
      action: () => toggleDrawingTool("rectangle"),
      condition: true,
    },
    {
      key: "E",
      description: "Ellipse",
      action: () => toggleDrawingTool("ellipse"),
      condition: true,
    },
    {
      key: "L",
      description: "Line",
      action: () => toggleDrawingTool("line"),
      condition: true,
    },
    {
      key: "F",
      description: "Frame",
      action: () => toggleDrawingTool("frame"),
      condition: true,
    },
    {
      key: "Shift+F",
      description: "Create Frame",
      action: handleCreateFrame,
      condition: true,
    },
    {
      key: "Ctrl+G",
      description: "Group",
      action: handleCreateGroup,
      condition: hasMultipleSelection,
    },
    {
      key: "Ctrl+Shift+G",
      description: "Ungroup",
      action: handleUngroup,
      condition: hasSelection && selectedShapeIds.length === 1,
    },
    {
      key: "Ctrl+D",
      description: "Duplicate",
      action: handleDuplicate,
      condition: hasSelection,
    },
    {
      key: "Delete",
      description: "Delete",
      action: handleDelete,
      condition: hasSelection,
    },
  ];

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle individual keys
      if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          toggleDrawingTool("rectangle");
        } else if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          toggleDrawingTool("ellipse");
        } else if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          toggleDrawingTool("line");
        } else if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          toggleDrawingTool("frame");
        } else if (e.key === "Delete" || e.key === "Backspace") {
          if (hasSelection) {
            e.preventDefault();
            handleDelete();
          }
        }
      }

      // Ctrl + key combinations
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === "g" && !e.shiftKey) {
          e.preventDefault();
          if (hasMultipleSelection) handleCreateGroup();
        } else if (e.key.toLowerCase() === "g" && e.shiftKey) {
          e.preventDefault();
          if (hasSelection && selectedShapeIds.length === 1) handleUngroup();
        } else if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          if (hasSelection) handleDuplicate();
        }
      }

      // Shift + key combinations
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          handleCreateFrame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasSelection,
    hasMultipleSelection,
    selectedShapeIds,
    currentDrawingTool,
  ]);

  // Function to create a shortcut label
  const ShortcutLabel = ({ shortcut }: { shortcut: string }) => (
    <span className="ml-2 text-xs text-zinc-500 font-mono">{shortcut}</span>
  );

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-zinc-950 p-1.5 rounded-lg shadow-xl z-10">
      {/* Drawing tools */}
      <div className="flex space-x-1 border-r border-zinc-700 pr-2">
        <button
          className={`p-1.5 rounded ${
            isToolActive("rectangle") ? "bg-indigo-700" : "hover:bg-zinc-800"
          }`}
          onClick={() => toggleDrawingTool("rectangle")}
          title="Rectangle (R)"
        >
          <FiSquare className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Rectangle</span>
        </button>
        <button
          className={`p-1.5 rounded ${
            isToolActive("ellipse") ? "bg-indigo-700" : "hover:bg-zinc-800"
          }`}
          onClick={() => toggleDrawingTool("ellipse")}
          title="Ellipse (E)"
        >
          <FiCircle className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Ellipse</span>
        </button>
        <button
          className={`p-1.5 rounded ${
            isToolActive("line") ? "bg-indigo-700" : "hover:bg-zinc-800"
          }`}
          onClick={() => toggleDrawingTool("line")}
          title="Line (L)"
        >
          <FiMinus className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Line</span>
        </button>
      </div>

      {/* Container tools */}
      <div className="flex space-x-1 border-r border-zinc-700 pr-2">
        <button
          className={`p-1.5 rounded ${
            isToolActive("frame") ? "bg-indigo-700" : "hover:bg-zinc-800"
          }`}
          onClick={() => toggleDrawingTool("frame")}
          title="Draw Frame (F)"
        >
          <FiMaximize className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Draw Frame</span>
        </button>
        <button
          className={`p-1.5 rounded ${
            hasSelection ? "hover:bg-zinc-800" : "opacity-50 cursor-not-allowed"
          }`}
          onClick={handleCreateFrame}
          disabled={!hasSelection}
          title="Create Frame from Selection (Shift+F)"
        >
          <FiPackage className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Create Frame</span>
        </button>
        <button
          className={`p-1.5 rounded ${
            hasMultipleSelection
              ? "hover:bg-zinc-800"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={handleCreateGroup}
          disabled={!hasMultipleSelection}
          title="Group (Ctrl+G)"
        >
          <FiLayers className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Group</span>
        </button>
        <button
          className={`p-1.5 rounded ${
            hasSelection && selectedShapeIds.length === 1
              ? "hover:bg-zinc-800"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={handleUngroup}
          disabled={!hasSelection || selectedShapeIds.length !== 1}
          title="Ungroup (Ctrl+Shift+G)"
        >
          <FiFolder className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Ungroup</span>
        </button>
      </div>

      {/* Edit tools */}
      <div className="flex space-x-1">
        <button
          className={`p-1.5 rounded ${
            hasSelection ? "hover:bg-zinc-800" : "opacity-50 cursor-not-allowed"
          }`}
          onClick={handleDuplicate}
          disabled={!hasSelection}
          title="Duplicate (Ctrl+D)"
        >
          <FiCopy className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Duplicate</span>
        </button>
        <button
          className={`p-1.5 rounded ${
            hasSelection ? "hover:bg-zinc-800" : "opacity-50 cursor-not-allowed"
          }`}
          onClick={handleDelete}
          disabled={!hasSelection}
          title="Delete (Delete)"
        >
          <FiTrash2 className="w-4 h-4 text-zinc-300" />
          <span className="sr-only">Delete</span>
        </button>
      </div>
    </div>
  );
}
