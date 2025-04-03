import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../store/canvasStore";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiUnlock,
  FiMoreVertical,
  FiEdit2,
  FiCheck,
  FiX,
} from "react-icons/fi";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

interface SortableLayerItemProps {
  shape: Shape;
  index: number;
  selectedShapeId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onToggleLock: (id: string, isLocked: boolean) => void;
  onRename: (id: string, newName: string) => void;
}

// Sortable layer item component
function SortableLayerItem({
  shape,
  index,
  selectedShapeId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
}: SortableLayerItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(shape.name || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
        `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${
          index + 1
        }`
    );
  };

  const handleSaveRename = () => {
    onRename(
      shape.id,
      nameInput.trim() ||
        `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${
          index + 1
        }`
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`px-3 py-1.5 flex items-center text-xs cursor-pointer hover:bg-zinc-800 ${
        selectedShapeId === shape.id ? "bg-zinc-800" : ""
      }`}
      onClick={() => onSelect(shape.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-1 flex items-center gap-2 truncate">
        <div
          className="cursor-grab text-zinc-500"
          {...attributes}
          {...listeners}
        >
          <FiMoreVertical className="w-3.5 h-3.5" />
        </div>
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{
            backgroundColor: shape.fill || "#6366f1",
            opacity: shape.isVisible === false ? 0.4 : 1,
          }}
        />

        {isRenaming ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-zinc-700 text-white text-xs rounded px-1.5 py-0.5 flex-1 min-w-0 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveRename();
              }}
              className="p-0.5 text-green-400 hover:text-green-300"
            >
              <FiCheck className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelRename();
              }}
              className="p-0.5 text-red-400 hover:text-red-300"
            >
              <FiX className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 truncate flex-1">
            <span className="truncate">
              {shape.name ||
                `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${
                  index + 1
                }`}
            </span>
            {isHovered && (
              <button
                onClick={handleStartRenaming}
                className="opacity-50 hover:opacity-100 text-zinc-400 hover:text-zinc-200"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {isHovered && !isRenaming && (
        <div className="flex gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(shape.id, shape.isVisible !== false);
            }}
            className="text-zinc-400 hover:text-zinc-200"
          >
            {shape.isVisible === false ? (
              <FiEyeOff className="w-3.5 h-3.5" />
            ) : (
              <FiEye className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(shape.id, shape.isLocked === true);
            }}
            className="text-zinc-400 hover:text-zinc-200"
          >
            {shape.isLocked === true ? (
              <FiLock className="w-3.5 h-3.5" />
            ) : (
              <FiUnlock className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </li>
  );
}

export function LeftSidebar() {
  const {
    shapes,
    selectedShapeId,
    setSelectedShapeId,
    updateShape,
    reorderShapes,
  } = useCanvasStore();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredShapes = shapes
    .filter(
      (shape) =>
        shape.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shape.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = filteredShapes.findIndex((item) => item.id === active.id);
    const newIndex = filteredShapes.findIndex((item) => item.id === over.id);

    if (oldIndex !== newIndex) {
      const newShapesOrder = arrayMove(filteredShapes, oldIndex, newIndex);
      const newOrder = newShapesOrder.map((shape) => shape.id);
      reorderShapes(newOrder);
    }
  };

  const toggleVisibility = (id: string, isVisible: boolean) => {
    updateShape(id, { isVisible: !isVisible });
  };

  const toggleLock = (id: string, isLocked: boolean) => {
    updateShape(id, { isLocked: !isLocked });
  };

  const renameShape = (id: string, newName: string) => {
    updateShape(id, { name: newName });
  };

  return (
    <div className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300 mb-2">Layers</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search layers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-300 text-xs rounded px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredShapes.map((shape) => shape.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="py-1">
              {filteredShapes.map((shape, index) => (
                <SortableLayerItem
                  key={shape.id}
                  shape={shape}
                  index={index}
                  selectedShapeId={selectedShapeId}
                  onSelect={setSelectedShapeId}
                  onToggleVisibility={toggleVisibility}
                  onToggleLock={toggleLock}
                  onRename={renameShape}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {filteredShapes.length === 0 && (
          <div className="flex items-center justify-center h-20 text-zinc-500 text-xs">
            {searchTerm
              ? "No layers match your search"
              : "No layers created yet"}
          </div>
        )}
      </div>
    </div>
  );
}
