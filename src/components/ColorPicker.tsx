import React, { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { usePopper } from "react-popper";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [opacity, setOpacity] = useState(100);
  // Track if we're interacting with the color picker
  const [isInteracting, setIsInteracting] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add effect to log state changes
  useEffect(() => {
    if (isOpen) {
      console.log("[ColorPicker] Opened");
    } else {
      console.log("[ColorPicker] Closed");
    }
  }, [isOpen]);

  const { styles, attributes, update } = usePopper(
    buttonRef.current,
    popoverRef.current,
    {
      placement: "bottom-start",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 8],
          },
        },
      ],
    }
  );

  // Manage click outside to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPointerUp = () => {
      if (isInteracting) {
        console.log("[ColorPicker] Interaction ended");
        setIsInteracting(false);
      }
    };

    const handleDocumentClick = (event: MouseEvent) => {
      // If we're currently interacting with the color picker, don't close
      if (isInteracting) {
        console.log("[ColorPicker] Ignoring click during interaction");
        event.stopPropagation();
        return;
      }

      // Don't close if clicking inside the color picker
      if (popoverRef.current?.contains(event.target as Node)) {
        console.log("[ColorPicker] Click inside popover - staying open");
        return;
      }

      // Don't close if clicking the trigger button
      if (buttonRef.current?.contains(event.target as Node)) {
        console.log("[ColorPicker] Click on trigger button - staying open");
        return;
      }

      // Otherwise close the popup
      console.log("[ColorPicker] Click outside - closing", {
        target: event.target,
      });
      setIsOpen(false);
    };

    // Critical: delay adding the event listener to avoid capturing the click that opened the popup
    const listenerTimeout = setTimeout(() => {
      console.log("[ColorPicker] Adding document click listener");
      document.addEventListener("mousedown", handleDocumentClick);
    }, 100);

    // These events track when interaction has completed
    document.addEventListener("pointerup", handleGlobalPointerUp);
    document.addEventListener("pointercancel", handleGlobalPointerUp);

    // Don't close popup when window loses focus
    const handleVisibilityChange = () => {
      console.log("[ColorPicker] Visibility changed - keeping open");
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
      console.log("[ColorPicker] Removed event listeners");
    };
  }, [isOpen, isInteracting]);

  // Update popper position when content changes
  useEffect(() => {
    update?.();
  }, [color, update]);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    console.log("[ColorPicker] Opacity slider change");
    const newOpacity = parseInt(e.target.value);
    setOpacity(newOpacity);

    // Convert hex to rgba
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    onChange(`rgba(${r}, ${g}, ${b}, ${newOpacity / 100})`);
  };

  const handleColorChange = (newColor: string) => {
    console.log("[ColorPicker] Color changed");
    onChange(newColor);
  };

  // Start interaction state for color picker components
  const startInteraction = () => {
    console.log("[ColorPicker] Starting interaction");
    setIsInteracting(true);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        className={`w-8 h-8 rounded border border-zinc-700 ${className}`}
        style={{ backgroundColor: color }}
        onClick={() => {
          console.log(
            "[ColorPicker] Toggle button clicked, current state:",
            isOpen
          );
          setIsOpen(!isOpen);
        }}
        aria-label="Pick color"
      />

      {isOpen && (
        <div
          ref={popoverRef}
          style={styles.popper}
          {...attributes.popper}
          className="z-50"
          onMouseDown={(e) => {
            console.log("[ColorPicker] Mouse down inside popover");
            e.stopPropagation();
          }}
          onClick={(e) => {
            console.log("[ColorPicker] Click inside popover");
            e.stopPropagation();
          }}
        >
          <div className="p-4 bg-zinc-900 rounded-lg shadow-xl border border-zinc-800">
            <div className="w-[200px]">
              <div
                onPointerDown={startInteraction}
                onTouchStart={startInteraction}
                onMouseDown={startInteraction}
              >
                <HexColorPicker
                  color={color}
                  onChange={handleColorChange}
                  className="mb-3"
                />
              </div>

              {/* Color Input */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Hex
                  </label>
                  <HexColorInput
                    color={color}
                    onChange={handleColorChange}
                    prefixed
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Opacity Control */}
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
                        console.log("[ColorPicker] Opacity slider mouse down");
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
          </div>
        </div>
      )}
    </div>
  );
};
