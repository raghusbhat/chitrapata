import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useCanvasStore } from "../store/canvasStore";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiUnlock,
  FiEdit2,
  FiChevronRight,
  FiChevronDown,
  FiSquare,
  FiCircle,
  FiMinus,
  FiMaximize,
  FiLayers,
  FiSearch,
} from "react-icons/fi";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Shape } from "../lib/webgl/types";
import {
  Button,
  Tooltip,
  TextField,
  ContextMenu,
  Box,
  Flex,
  Text,
  ScrollArea,
} from "@radix-ui/themes";

// Hierarchical tree node representation
interface TreeNode {
  id: string;
  shape: Shape;
  children: TreeNode[];
  level: number;
  path: string[];
  isExpanded?: boolean;
}

interface SortableLayerItemProps {
  node: TreeNode;
  selectedShapeId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onToggleLock: (id: string, isLocked: boolean) => void;
  onRename: (id: string, newName: string) => void;
  onToggleExpand: (id: string) => void;
  expandedIds: Set<string>;
  isDropTarget: boolean;
}

// Sortable layer item component
function SortableLayerItem({
  node,
  selectedShapeId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onToggleExpand,
  expandedIds,
  isDropTarget,
}: SortableLayerItemProps) {
  const { shape, level } = node;
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(shape.name || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const isExpanded = expandedIds.has(shape.id);

  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: shape.id,
    disabled: isRenaming,
  });

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleStartRenaming = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setNameInput(
      shape.name ||
        `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}`
    );
  };

  const handleSaveRename = () => {
    onRename(
      shape.id,
      nameInput.trim() ||
        `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}`
    );
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(shape.id);
  };

  // Determine if this is a container (frame or group)
  const isContainer =
    shape.isContainer || shape.type === "frame" || shape.type === "group";

  // Add specific styling for different types
  const getTypeSpecificStyles = () => {
    switch (shape.type) {
      case "frame":
        return "border-l-2 border-blue-500 dark:border-blue-400";
      case "group":
        return "border-l-2 border-purple-500 dark:border-purple-400";
      default:
        return "";
    }
  };

  // Get an icon and background color based on the shape type
  const getTypeIndicator = () => {
    switch (shape.type) {
      case "frame":
        return {
          icon: <FiMaximize className="w-3 h-3" />,
          bg: "bg-blue-500 dark:bg-blue-400",
        };
      case "group":
        return {
          icon: <FiLayers className="w-3 h-3" />,
          bg: "bg-purple-500 dark:bg-purple-400",
        };
      case "rectangle":
        return {
          icon: <FiSquare className="w-3 h-3" />,
          bg: "bg-zinc-500",
        };
      case "ellipse":
        return {
          icon: <FiCircle className="w-3 h-3" />,
          bg: "bg-zinc-500",
        };
      case "line":
        return {
          icon: <FiMinus className="w-3 h-3" />,
          bg: "bg-zinc-500",
        };
      default:
        return {
          icon: <FiSquare className="w-3 h-3" />,
          bg: "bg-zinc-500",
        };
    }
  };

  const typeIndicator = getTypeIndicator();

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          ref={setNodeRef}
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            zIndex: isDragging ? 999 : "auto",
          }}
          className={`px-3 py-1.5 flex items-center text-xs cursor-pointer hover:bg-zinc-800 ${
            selectedShapeId === shape.id ? "bg-zinc-800" : ""
          } ${getTypeSpecificStyles()} ${
            isDropTarget ? "border-2 border-indigo-500" : ""
          }`}
          onClick={() => onSelect(shape.id)}
        >
          <Flex
            className="flex-1 flex items-center gap-1 truncate relative"
            style={{ paddingLeft: `${level * 16}px` }}
          >
            {/* Vertical connection lines for parent-child relationships */}
            {level > 0 && (
              <Box
                className="absolute border-l border-zinc-700 h-full"
                style={{ left: `${level * 16 - 12}px`, top: 0 }}
              />
            )}

            {/* Expand/collapse button for containers */}
            {isContainer && (
              <Button
                variant="ghost"
                size="1"
                className="w-4 h-4 flex items-center justify-center text-zinc-400 z-10"
                onClick={handleToggleExpand}
              >
                {isExpanded ? (
                  <FiChevronDown className="w-3 h-3" />
                ) : (
                  <FiChevronRight className="w-3 h-3" />
                )}
              </Button>
            )}

            {/* Type indicator */}
            <Box
              className={`w-4 h-4 rounded flex items-center justify-center ${typeIndicator.bg}`}
            >
              {typeIndicator.icon}
            </Box>

            {/* Name or rename input */}
            {isRenaming ? (
              <TextField.Root
                size="1"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveRename}
                ref={inputRef}
              />
            ) : (
              <Text className="truncate">{shape.name || shape.type}</Text>
            )}

            {/* Controls */}
            <Flex gap="1" className="ml-auto">
              <Tooltip content={shape.isVisible ? "Hide" : "Show"}>
                <Button
                  variant="ghost"
                  size="1"
                  className="text-zinc-400 hover:text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onToggleVisibility(shape.id, !shape.isVisible);
                  }}
                >
                  {shape.isVisible ? (
                    <FiEye className="w-3 h-3" />
                  ) : (
                    <FiEyeOff className="w-3 h-3" />
                  )}
                </Button>
              </Tooltip>

              <Tooltip content={shape.isLocked ? "Unlock" : "Lock"}>
                <Button
                  variant="ghost"
                  size="1"
                  className="text-zinc-400 hover:text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onToggleLock(shape.id, !shape.isLocked);
                  }}
                >
                  {shape.isLocked ? (
                    <FiLock className="w-3 h-3" />
                  ) : (
                    <FiUnlock className="w-3 h-3" />
                  )}
                </Button>
              </Tooltip>
            </Flex>
          </Flex>
        </Box>
      </ContextMenu.Trigger>

      <ContextMenu.Content>
        <ContextMenu.Item onClick={handleStartRenaming}>
          <FiEdit2 className="w-3 h-3 mr-2" />
          Rename
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleVisibility(shape.id, !shape.isVisible);
          }}
        >
          {shape.isVisible ? (
            <>
              <FiEyeOff className="w-3 h-3 mr-2" />
              Hide
            </>
          ) : (
            <>
              <FiEye className="w-3 h-3 mr-2" />
              Show
            </>
          )}
        </ContextMenu.Item>
        <ContextMenu.Item
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleLock(shape.id, !shape.isLocked);
          }}
        >
          {shape.isLocked ? (
            <>
              <FiUnlock className="w-3 h-3 mr-2" />
              Unlock
            </>
          ) : (
            <>
              <FiLock className="w-3 h-3 mr-2" />
              Lock
            </>
          )}
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

export function LeftSidebar() {
  const {
    shapes,
    selectedShapeId,
    setSelectedShapeId,
    updateShape,
    reorderShapes,
    getPathToRoot,
    invalidateCache,
  } = useCanvasStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Add an effect to track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Toggle expanded state for a shape
  const toggleExpandShape = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Auto-expand parents of selected shape
  useEffect(() => {
    if (!selectedShapeId || !isMountedRef.current) return;

    const path = getPathToRoot(selectedShapeId);
    if (path.length > 0) {
      // Expand all parent containers except the last one (which is the selected shape)
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        path.slice(0, -1).forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  }, [selectedShapeId, getPathToRoot]);

  // Build the hierarchical tree structure for rendering
  const hierarchicalTree = useMemo(() => {
    // Start with root nodes (no parent)
    const rootNodes = shapes.filter((s) => !s.parentId);
    const nodeMap = new Map<string, TreeNode>();

    // Create flat map of all nodes
    shapes.forEach((shape) => {
      nodeMap.set(shape.id, {
        id: shape.id,
        shape,
        children: [],
        level: 0,
        path: [shape.id],
      });
    });

    // Build the tree structure
    const buildTree = (
      nodeId: string,
      level: number,
      path: string[]
    ): TreeNode => {
      const node = nodeMap.get(nodeId);
      if (!node) throw new Error(`Node ${nodeId} not found`);

      const shape = shapes.find((s) => s.id === nodeId);
      if (!shape) throw new Error(`Shape ${nodeId} not found`);

      // Get child shapes
      const childIds = shape.childIds || [];
      const children: TreeNode[] = [];

      // Sort children by z-index (higher z-index first)
      const sortedChildIds = [...childIds].sort((a, b) => {
        const shapeA = shapes.find((s) => s.id === a);
        const shapeB = shapes.find((s) => s.id === b);
        return (shapeB?.zIndex || 0) - (shapeA?.zIndex || 0);
      });

      // Build children recursively
      for (const childId of sortedChildIds) {
        const childShape = shapes.find((s) => s.id === childId);
        if (childShape) {
          const childPath = [...path, childId];
          const childNode = buildTree(childId, level + 1, childPath);
          children.push(childNode);
        }
      }

      return {
        id: nodeId,
        shape,
        children,
        level,
        path,
        isExpanded: expandedIds.has(nodeId),
      };
    };

    // Sort root nodes by z-index (higher z-index first)
    const sortedRootNodes = [...rootNodes].sort(
      (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
    );

    // Build tree from each root node
    return sortedRootNodes.map((node) => buildTree(node.id, 0, [node.id]));
  }, [shapes, expandedIds]);

  // Filtered tree based on search term
  const filteredTree = useMemo(() => {
    if (!searchTerm) return hierarchicalTree;

    const matchesSearch = (node: TreeNode): boolean => {
      const shape = node.shape;
      const nameMatches =
        shape.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shape.type.toLowerCase().includes(searchTerm.toLowerCase());

      // If this node matches, include it
      if (nameMatches) return true;

      // If any children match, include this node
      return node.children.some(matchesSearch);
    };

    // Filter function that preserves hierarchy
    const filterTree = (node: TreeNode): TreeNode | null => {
      // Check if this node or any of its descendants match
      if (!matchesSearch(node)) return null;

      // If this node matches directly, keep it with all its children
      const thisNodeMatches =
        node.shape.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.shape.type.toLowerCase().includes(searchTerm.toLowerCase());

      if (thisNodeMatches) return node;

      // Otherwise, filter children
      const filteredChildren = node.children
        .map(filterTree)
        .filter((n): n is TreeNode => n !== null);

      // If no children match, don't include this node
      if (filteredChildren.length === 0) return null;

      // Return node with filtered children
      return {
        ...node,
        children: filteredChildren,
      };
    };

    return hierarchicalTree
      .map(filterTree)
      .filter((n): n is TreeNode => n !== null);
  }, [hierarchicalTree, searchTerm]);

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag over event to highlight potential drop areas
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveDropTarget(null);
      return;
    }

    if (active.id !== over.id) {
      const overNode = findNodeById(filteredTree, over.id as string);
      if (overNode && overNode.shape.isContainer) {
        setActiveDropTarget(over.id as string);
      } else {
        setActiveDropTarget(null);
      }
    }
  };

  // Reset drop target when drag ends
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDropTarget(null);

    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find the nodes being dragged
    const activeNode = findNodeById(filteredTree, active.id as string);
    const overNode = findNodeById(filteredTree, over.id as string);

    if (!activeNode || !overNode) return;

    // Get parent path
    const activePath = activeNode.path;
    const overPath = overNode.path;

    const currentShape = shapes.find((s) => s.id === activeNode.id);
    const targetShape = shapes.find((s) => s.id === overNode.id);

    if (!currentShape || !targetShape) return;

    // If dragging to a new parent
    if (
      activePath[0] !== overPath[0] ||
      activeNode.path.length !== overNode.path.length
    ) {
      // Handle different parent cases

      // Check if dropping on a frame or group (container)
      if (targetShape.isContainer) {
        // Drop inside a container
        moveShapeToContainer(activeNode.id, targetShape.id);
        return;
      }

      // Drop as sibling of another shape
      const targetParentId = targetShape.parentId;
      moveShapeToContainer(activeNode.id, targetParentId || null);

      // Reorder to be next to the target
      const siblings = targetParentId
        ? shapes.filter((s) => s.parentId === targetParentId)
        : shapes.filter((s) => !s.parentId);

      const newOrder = siblings.map((s) => s.id);
      const oldIndex = newOrder.indexOf(activeNode.id);
      const newIndex = newOrder.indexOf(overNode.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(newOrder, oldIndex, newIndex);
        reorderShapes(reordered);
      }

      return;
    }

    // Same parent, just reordering siblings
    const siblings = getSiblings(filteredTree, activeNode);

    const oldIndex = siblings.findIndex((node) => node.id === activeNode.id);
    const newIndex = siblings.findIndex((node) => node.id === overNode.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(siblings, oldIndex, newIndex);
      const newOrder = reordered.map((node) => node.id);
      reorderShapes(newOrder);
    }
  };

  // Helper to move a shape to a new container
  const moveShapeToContainer = (
    shapeId: string,
    newParentId: string | null
  ) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (!shape) return;

    // Calculate absolute position before removing from old parent
    let absoluteX = shape.x;
    let absoluteY = shape.y;

    // If shape has a parent, calculate its absolute position based on parent
    if (shape.parentId) {
      const oldParent = shapes.find((s) => s.id === shape.parentId);
      if (oldParent) {
        // Add parent's position to get absolute coordinates
        absoluteX = oldParent.x + shape.x;
        absoluteY = oldParent.y + shape.y;
      }

      // Remove from old parent's childIds
      updateShape(shape.parentId, {
        childIds: (oldParent?.childIds || []).filter((id) => id !== shapeId),
      });
    }

    // If moving to a new parent, calculate relative position to that parent
    let newX = absoluteX;
    let newY = absoluteY;

    if (newParentId) {
      const newParent = shapes.find((s) => s.id === newParentId);
      if (newParent) {
        // Subtract new parent's position to get relative coordinates
        newX = absoluteX - newParent.x;
        newY = absoluteY - newParent.y;
      }
    }

    // Update shape with new parentId and position
    updateShape(shapeId, {
      parentId: newParentId || undefined,
      x: newX,
      y: newY,
    });

    invalidateCache();
  };

  // Helper to find a node by ID in the tree
  const findNodeById = (tree: TreeNode[], id: string): TreeNode | null => {
    for (const node of tree) {
      if (node.id === id) return node;

      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  };

  // Helper to get siblings of a node
  const getSiblings = (tree: TreeNode[], node: TreeNode): TreeNode[] => {
    // If node is at the root level
    if (node.level === 0) return tree;

    // Find the parent
    const parentId = node.path[node.path.length - 2];
    const parent = findNodeById(tree, parentId);

    if (!parent) return [];
    return parent.children;
  };

  // Add useCallback to all handlers
  const toggleVisibility = useCallback(
    (id: string, isVisible: boolean) => {
      updateShape(id, { isVisible: !isVisible });
    },
    [updateShape]
  );

  const toggleLock = useCallback(
    (id: string, isLocked: boolean) => {
      updateShape(id, { isLocked: !isLocked });
    },
    [updateShape]
  );

  const renameShape = useCallback(
    (id: string, newName: string) => {
      updateShape(id, { name: newName });
    },
    [updateShape]
  );

  // Flatten tree for Sortable Context
  const flattenTree = (tree: TreeNode[]): string[] => {
    let result: string[] = [];

    for (const node of tree) {
      result.push(node.id);
      if (node.children.length > 0 && expandedIds.has(node.id)) {
        result = [...result, ...flattenTree(node.children)];
      }
    }

    return result;
  };

  // Get flattened item IDs for sortable context
  const sortableIds = flattenTree(filteredTree);

  return (
    <Box className="h-full w-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <Box className="p-3 border-b border-zinc-800">
        <Text className="text-sm font-medium text-zinc-300 mb-2">Layers</Text>
        <Box className="relative">
          <TextField.Root
            placeholder="Search layers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-800/50 text-zinc-300 text-xs rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none border-zinc-700/50"
            size="2"
          >
            <TextField.Slot>
              <FiSearch className="h-4 w-4 text-zinc-500" />
            </TextField.Slot>
          </TextField.Root>
        </Box>
      </Box>

      <ScrollArea className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <Box className="py-1">
              {filteredTree.map((node) => (
                <SortableLayerItem
                  key={node.id}
                  node={node}
                  selectedShapeId={selectedShapeId}
                  onSelect={setSelectedShapeId}
                  onToggleVisibility={toggleVisibility}
                  onToggleLock={toggleLock}
                  onRename={renameShape}
                  onToggleExpand={toggleExpandShape}
                  expandedIds={expandedIds}
                  isDropTarget={activeDropTarget === node.id}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
        {filteredTree.length === 0 && (
          <Flex align="center" justify="center" className="h-20">
            <Text className="text-zinc-500 text-xs">
              {searchTerm
                ? "No layers match your search"
                : "No layers created yet"}
            </Text>
          </Flex>
        )}
      </ScrollArea>
    </Box>
  );
}
