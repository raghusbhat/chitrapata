import { useEffect, useCallback } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { ShapeType } from "../lib/webgl/types";
import {
  FiSquare,
  FiCircle,
  FiMinus,
  FiMaximize,
  FiCopy,
  FiTrash2,
  FiPackage,
  FiFolder,
} from "react-icons/fi";
import { Button, Tooltip, Separator, Box, Flex } from "@radix-ui/themes";

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
  const toggleDrawingTool = useCallback(
    (tool: ShapeType) => {
      setCurrentDrawingTool(currentDrawingTool === tool ? null : tool);
    },
    [currentDrawingTool, setCurrentDrawingTool]
  );

  // Check if a tool is active
  const isToolActive = useCallback(
    (tool: ShapeType) => currentDrawingTool === tool,
    [currentDrawingTool]
  );

  // Create group from selected shapes
  const handleCreateGroup = useCallback(() => {
    if (hasMultipleSelection) {
      createGroup();
    }
  }, [hasMultipleSelection, createGroup]);

  // Ungroup the selected group
  const handleUngroup = useCallback(() => {
    if (hasSelection && selectedShapeIds.length === 1) {
      ungroup(selectedShapeIds[0]);
    }
  }, [hasSelection, selectedShapeIds, ungroup]);

  // Create frame from selected shapes or at default location
  const handleCreateFrame = useCallback(() => {
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
  }, [createFrame]);

  // Delete selected shapes
  const handleDelete = useCallback(() => {
    if (hasSelection) {
      deleteSelectedShapes();
    }
  }, [hasSelection, deleteSelectedShapes]);

  // Duplicate selected shapes
  const handleDuplicate = useCallback(() => {
    if (hasSelection) {
      duplicateSelectedShapes();
    }
  }, [hasSelection, duplicateSelectedShapes]);

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
    toggleDrawingTool,
    handleCreateGroup,
    handleUngroup,
    handleDelete,
    handleDuplicate,
    handleCreateFrame,
  ]);

  return (
    <Box className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
      <Box className="bg-zinc-950/90 backdrop-blur-sm border border-zinc-800/50 rounded-lg shadow-2xl transform-none">
        <Flex gap="4" p="4">
          {/* Drawing tools */}
          <Flex gap="4">
            <Tooltip content="Rectangle (R)">
              <Button
                variant={isToolActive("rectangle") ? "solid" : "ghost"}
                color={isToolActive("rectangle") ? "violet" : "gray"}
                onClick={() => toggleDrawingTool("rectangle")}
                size="2"
                className="transition-colors transform-none"
              >
                <FiSquare size={18} />
              </Button>
            </Tooltip>

            <Tooltip content="Ellipse (E)">
              <Button
                variant={isToolActive("ellipse") ? "solid" : "ghost"}
                color={isToolActive("ellipse") ? "violet" : "gray"}
                onClick={() => toggleDrawingTool("ellipse")}
                size="2"
                className="transition-colors transform-none"
              >
                <FiCircle size={18} />
              </Button>
            </Tooltip>

            <Tooltip content="Line (L)">
              <Button
                variant={isToolActive("line") ? "solid" : "ghost"}
                color={isToolActive("line") ? "violet" : "gray"}
                onClick={() => toggleDrawingTool("line")}
                size="2"
                className="transition-colors transform-none"
              >
                <FiMinus size={18} />
              </Button>
            </Tooltip>

            <Tooltip content="Frame (F)">
              <Button
                variant={isToolActive("frame") ? "solid" : "ghost"}
                color={isToolActive("frame") ? "violet" : "gray"}
                onClick={() => toggleDrawingTool("frame")}
                size="2"
                className="transition-colors transform-none"
              >
                <FiMaximize size={18} />
              </Button>
            </Tooltip>
          </Flex>

          <Separator orientation="vertical" size="4" />

          {/* Selection tools */}
          <Flex gap="4">
            <Tooltip content="Group (Ctrl+G)">
              <Button
                variant="ghost"
                color="gray"
                onClick={handleCreateGroup}
                disabled={!hasMultipleSelection}
                size="2"
                className="transition-colors transform-none"
              >
                <FiPackage size={18} />
              </Button>
            </Tooltip>

            <Tooltip content="Ungroup (Ctrl+Shift+G)">
              <Button
                variant="ghost"
                color="gray"
                onClick={handleUngroup}
                disabled={!hasSelection || selectedShapeIds.length !== 1}
                size="2"
                className="transition-colors transform-none"
              >
                <FiFolder size={18} />
              </Button>
            </Tooltip>

            <Tooltip content="Duplicate (Ctrl+D)">
              <Button
                variant="ghost"
                color="gray"
                onClick={handleDuplicate}
                disabled={!hasSelection}
                size="2"
                className="transition-colors transform-none"
              >
                <FiCopy size={18} />
              </Button>
            </Tooltip>

            <Tooltip content="Delete (Delete)">
              <Button
                variant="ghost"
                color="gray"
                onClick={handleDelete}
                disabled={!hasSelection}
                size="2"
                className="transition-colors transform-none"
              >
                <FiTrash2 size={18} />
              </Button>
            </Tooltip>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}
