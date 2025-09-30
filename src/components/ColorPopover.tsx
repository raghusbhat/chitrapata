import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Text } from "@radix-ui/themes";
import { HexColorPicker, HexColorInput } from "react-colorful";

interface ColorPopoverProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export const ColorPopover: React.FC<ColorPopoverProps> = ({
  label,
  value,
  onChange,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Track if we're dragging or interacting with color picker
  const [isInteracting, setIsInteracting] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  // Add effect to log state changes
  useEffect(() => {
    // Only log in development mode
    if (isOpen) {
      console.log("[ColorPopover] Opened");
    }
    // Don't log every close event to reduce noise
  }, [isOpen]);

  // position of popup
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // drag state for popup dragging
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(
    null
  );

  // opacity slider
  const [opacity, setOpacity] = useState(() => {
    if (value.startsWith("rgba")) {
      const parts = value.replace(/rgba?\(|\)/g, "").split(",");
      return Math.round(parseFloat(parts[3].trim()) * 100);
    }
    return 100;
  });

  // open popup and compute initial position - position to the left of trigger
  const openPopup = () => {
    // console.log("[ColorPopover] Opening popup");
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(rect.left - 260, 10); // 260px is approximately the width of the popup
      setPosition({ x: left, y: rect.top });
    }
    setIsOpen(true);
  };

  // Manage global events while popup is open
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPointerUp = () => {
      if (isInteracting) {
        // console.log("[ColorPopover] Interaction ended");
        setIsInteracting(false);
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      // If we're currently interacting with the color picker, don't close
      if (isInteracting) {
        // console.log("[ColorPopover] Ignoring click during interaction");
        event.stopPropagation();
        return;
      }

      // Don't close if clicking inside the color picker
      if (containerRef.current?.contains(event.target as Node)) {
        // console.log("[ColorPopover] Click inside container - staying open");
        return;
      }

      // Don't close if clicking the trigger button
      if (triggerRef.current?.contains(event.target as Node)) {
        // console.log("[ColorPopover] Click on trigger button - staying open");
        return;
      }

      // Otherwise close the popup
      // console.log("[ColorPopover] Click outside - closing");
      setIsOpen(false);
    };

    // Critical: delay adding the event listener to avoid capturing the click that opened the popup
    const listenerTimeout = setTimeout(() => {
      console.log("[ColorPopover] Adding document click listener");
      document.addEventListener("mousedown", handleDocumentClick);
    }, 100);

    // These events track when interaction has completed
    document.addEventListener("pointerup", handleGlobalPointerUp);
    document.addEventListener("pointercancel", handleGlobalPointerUp);

    // Don't close popup when window loses focus
    const handleVisibilityChange = () => {
      // console.log("[ColorPopover] Visibility changed - keeping open");
      // Do nothing on visibility change - keep the popover open
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      clearTimeout(listenerTimeout);
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("pointerup", handleGlobalPointerUp);
      document.removeEventListener("pointercancel", handleGlobalPointerUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // console.log("[ColorPopover] Removed event listeners");
    };
  }, [isOpen, isInteracting]);

  // drag handlers on handle
  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    // console.log("[ColorPopover] Drag start");
    e.stopPropagation();
    setIsInteracting(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOrigin({ x: position.x, y: position.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart && dragOrigin) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({ x: dragOrigin.x + dx, y: dragOrigin.y + dy });
    }
  };

  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    // console.log("[ColorPopover] Drag end");
    setDragStart(null);
    setDragOrigin(null);
    setIsInteracting(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // handle opacity change
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log("[ColorPopover] Opacity slider change");
    e.stopPropagation();
    const newOp = parseInt(e.target.value, 10);
    setOpacity(newOp);

    let r: number, g: number, b: number;
    if (value.startsWith("rgba")) {
      const parts = value.replace(/rgba?\(|\)/g, "").split(",");
      [r, g, b] = parts.map((p) => parseInt(p.trim(), 10));
    } else {
      const hex = value.replace("#", "");
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    onChange(`rgba(${r}, ${g}, ${b}, ${newOp / 100})`);
  };

  // Handle color change
  const handleColorChange = (newColor: string) => {
    // console.log("[ColorPopover] Color changed");
    onChange(newColor);
  };

  // Start and end interaction states for color picker components
  const startInteraction = () => {
    // console.log("[ColorPopover] Starting interaction");
    setIsInteracting(true);
  };

  const swatchStyle: React.CSSProperties = {
    background: value,
    border: "1px solid #444",
    borderRadius: 4,
    width: 20,
    height: 20,
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
    display: "inline-block",
  };

  return (
    <Box className="mb-2 w-full">
      <Text className="block text-xs text-zinc-400 mb-1 select-none">
        {label}
      </Text>
      <button
        ref={triggerRef}
        onClick={openPopup}
        className="relative flex items-center gap-2 px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:border-indigo-400 transition-colors focus:outline-none w-full"
        style={{ minHeight: 28, height: 28, paddingLeft: 28, paddingRight: 8 }}
      >
        <span
          style={{
            ...swatchStyle,
            position: "absolute",
            left: 4,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <span
          className="text-xs text-zinc-200 font-mono select-none truncate"
          style={{ minWidth: 0, flex: 1, textAlign: "left" }}
        >
          {value.startsWith("linear") || value.startsWith("radial")
            ? "Gradient"
            : value}
        </span>
      </button>
      {isOpen &&
        triggerRef.current &&
        createPortal(
          <div
            ref={containerRef}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              zIndex: 9999,
            }}
            onMouseDown={(e) => {
              // console.log("[ColorPopover] Mouse down inside container");
              e.stopPropagation();
            }}
            onClick={(e) => {
              // console.log("[ColorPopover] Click inside container");
              e.stopPropagation();
            }}
          >
            <div
              className="h-5 bg-zinc-800 cursor-grab active:cursor-grabbing"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            />
            <div className="p-4 bg-zinc-900 rounded-lg shadow-xl border border-zinc-800">
              <div className="w-full">
                <div
                  onPointerDown={startInteraction}
                  onTouchStart={startInteraction}
                  onMouseDown={startInteraction}
                >
                  <HexColorPicker
                    color={value}
                    onChange={handleColorChange}
                    className="mb-3 w-[240px]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Hex
                  </label>
                  <HexColorInput
                    color={value}
                    onChange={handleColorChange}
                    prefixed
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Opacity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={handleOpacityChange}
                      className="flex-1 h-[4px] bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:appearance-none"
                      onPointerDown={startInteraction}
                      onTouchStart={startInteraction}
                      onMouseDown={(e) => {
                        // console.log("[ColorPopover] Opacity slider mouse down");
                        startInteraction();
                        e.stopPropagation();
                      }}
                    />
                    <span className="text-sm text-zinc-400 w-8">
                      {opacity}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Box>
  );
};
