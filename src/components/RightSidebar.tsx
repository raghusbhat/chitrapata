import React, { useState, useEffect, useRef } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { Shape } from "../lib/webgl/types";
import {
  FiMessageCircle,
  FiSettings,
  FiSend,
  FiCopy,
  FiRefreshCw,
  FiRotateCcw,
  FiEye,
  FiLock,
  FiPlus,
  FiMinus,
} from "react-icons/fi";
import { generateAIResponse } from "../lib/api";
import "./custom-spin-hide.css";
import { ColorPopover } from "./ColorPopover";
import {
  Tabs,
  Box,
  Text,
  ScrollArea,
  TextField,
  Tooltip,
  Button,
  Flex,
  Separator,
  Checkbox,
  Switch,
  Slider,
} from "@radix-ui/themes";

type TabType = "properties" | "ai";

interface Message {
  type: "user" | "assistant";
  content: string;
}

export function RightSidebar() {
  const { shapes, selectedShapeId, selectedShapeIds, updateShape, addShape } =
    useCanvasStore();
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [multipleSelection, setMultipleSelection] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("properties");
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "assistant",
      content:
        "Hello! I can help you with your design. What would you like to do?",
    },
  ]);

  // Add a ref to store the last prompt for the redo functionality
  const lastPromptRef = useRef<string>("");

  // Get the selected shape from the store
  useEffect(() => {
    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape) {
        setSelectedShape(shape);
        setMultipleSelection(false);
      }
    } else if (selectedShapeIds.length > 1) {
      setSelectedShape(null);
      setMultipleSelection(true);
    } else {
      setSelectedShape(null);
      setMultipleSelection(false);
    }
  }, [selectedShapeId, selectedShapeIds, shapes]);

  // Handle property changes
  const handlePropertyChange = (
    property: keyof Shape,
    value: string | number | boolean | object
  ) => {
    if (selectedShape) {
      updateShape(selectedShape.id, { [property]: value });
    } else if (multipleSelection) {
      // Apply changes to all selected shapes
      selectedShapeIds.forEach((id) => {
        updateShape(id, { [property]: value });
      });
    }
  };

  // Send a message in the AI conversation
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const prompt = inputMessage.trim();

    // Store the current prompt for later use with redo
    lastPromptRef.current = prompt;

    // Add user message
    setMessages([...messages, { type: "user", content: prompt }]);

    // Clear input immediately for better UX
    setInputMessage("");

    // Set loading state
    setIsLoading(true);

    try {
      // Call the AI API using our utility function
      const aiResponse = await generateAIResponse(prompt);
      if (Array.isArray(aiResponse)) {
        // Add each JSON-defined shape to canvas
        aiResponse.forEach((shape) => addShape(shape));
        // Notify user
        setMessages((prev) => [
          ...prev,
          { type: "assistant", content: "Added shapes to canvas." },
        ]);
      } else {
        // Display text response
        setMessages((prev) => [
          ...prev,
          { type: "assistant", content: aiResponse },
        ]);
      }
    } catch (error) {
      console.error("Error calling AI API:", error);

      // Add error message to the conversation
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content:
            "I'm sorry, I encountered an error processing your request. Please try again later.",
        },
      ]);
    } finally {
      // Clear loading state
      setIsLoading(false);
    }
  };

  // Handle the redo action for the last prompt
  const handleRedoLastPrompt = async () => {
    if (!lastPromptRef.current || isLoading) return;

    // Set the input message to the last prompt
    setInputMessage(lastPromptRef.current);
  };

  // Handle copying text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // You could add a toast notification here
        console.log("Text copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  // Icon map for input labels
  const labelIconMap: Record<string, React.ReactNode> = {
    x: <Text className="text-xs font-medium text-zinc-400">X</Text>,
    y: <Text className="text-xs font-medium text-zinc-400">Y</Text>,
    w: <Text className="text-xs font-medium text-zinc-400">W</Text>,
    h: <Text className="text-xs font-medium text-zinc-400">H</Text>,
    angle: <FiRotateCcw className="w-3.5 h-3.5 text-zinc-400" />,
  };

  // Format number to 2 decimal places only if needed
  const formatNumber = (value: number): string => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  // Render numeric input with icon inside
  const NumberProperty = ({
    value,
    property,
    min,
    max,
    step = 1,
    isDegree = false,
    iconLabel,
    shadowKey,
  }: {
    value: number;
    property: keyof Shape | string;
    min?: number;
    max?: number;
    step?: number;
    isDegree?: boolean;
    iconLabel?: string;
    shadowKey?: string;
  }) => {
    // Custom scroll wheel handler
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.preventDefault();
      let newValue = value;
      if (e.deltaY < 0) {
        newValue = value + (step || 1);
      } else if (e.deltaY > 0) {
        newValue = value - (step || 1);
      }
      // Clamp to min/max
      if (typeof min === "number") newValue = Math.max(newValue, min);
      if (typeof max === "number") newValue = Math.min(newValue, max);

      if (shadowKey && selectedShape?.shadow) {
        // Handle shadow property change
        const updatedShadow = {
          ...selectedShape.shadow,
          [shadowKey]: newValue,
        };
        handlePropertyChange("shadow", updatedShadow);
      } else {
        // Handle regular property change
        handlePropertyChange(property as keyof Shape, newValue);
      }
    };

    const displayValue = formatNumber(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      if (shadowKey && selectedShape?.shadow) {
        // Handle shadow property change
        const updatedShadow = {
          ...selectedShape.shadow,
          [shadowKey]: newValue,
        };
        handlePropertyChange("shadow", updatedShadow);
      } else {
        // Handle regular property change
        handlePropertyChange(property as keyof Shape, newValue);
      }
    };

    return (
      <Box className="mb-2.5">
        <Flex align="center" gap="2">
          {iconLabel && labelIconMap[iconLabel] && (
            <Box className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {labelIconMap[iconLabel]}
            </Box>
          )}
          <TextField.Root
            className="flex-1"
            type="number"
            value={displayValue}
            min={min}
            max={max}
            step={step}
            onChange={handleChange}
            onWheel={handleWheel}
            size="1"
            radius="small"
          >
            {isDegree && (
              <TextField.Slot>
                <Text className="text-xs text-zinc-400 pr-0.5">°</Text>
              </TextField.Slot>
            )}
          </TextField.Root>
        </Flex>
      </Box>
    );
  };

  // Render color picker with Figma-like popover
  const ColorProperty = ({
    label,
    value,
    property,
  }: {
    label: string;
    value: string;
    property: "fill" | "stroke" | string;
  }) => {
    const handleChange = (color: string) => {
      if (property === "shadow.color" && selectedShape?.shadow) {
        const updatedShadow = {
          ...selectedShape.shadow,
          color,
        };
        handlePropertyChange("shadow", updatedShadow);
      } else {
        handlePropertyChange(property as keyof Shape, color);
      }
    };
    return <ColorPopover label={label} value={value} onChange={handleChange} />;
  };

  // Render checkbox with label
  const BooleanProperty = ({
    label,
    value,
    property,
    icon,
  }: {
    label: string;
    value: boolean;
    property: keyof Shape;
    icon?: React.ReactNode;
  }) => {
    return (
      <Flex align="center" gap="2" className="mb-2">
        <Checkbox
          checked={value}
          onCheckedChange={(checked) =>
            handlePropertyChange(property, Boolean(checked))
          }
          size="1"
        />
        {icon && <Box className="text-zinc-400">{icon}</Box>}
        <Text className="text-xs text-zinc-400">{label}</Text>
      </Flex>
    );
  };

  // Render shadow control
  const ShadowControl = () => {
    const shadow = selectedShape?.shadow || {
      enabled: false,
      offsetX: 0,
      offsetY: 4,
      blur: 8,
      spread: 0,
      color: "#000000",
      opacity: 0.2,
    };

    const handleShadowChange = (key: string, value: any) => {
      // Debug shadow change
      console.log(
        `Changing shadow ${key} from`,
        shadow[key as keyof typeof shadow],
        "to",
        value
      );

      // Test how shadow color renders with current color
      if (key === "color") {
        const testCanvas = document.createElement("canvas");
        const ctx = testCanvas.getContext("2d");
        if (ctx) {
          console.log("Testing shadow color rendering");
          ctx.fillStyle = value;
          const computedColor = ctx.fillStyle;
          console.log(`Color ${value} computed as ${computedColor}`);

          // Check if we're in dark mode
          const isDarkTheme =
            document.body.classList.contains("dark-theme") ||
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          console.log(
            `Current theme detection: ${isDarkTheme ? "dark" : "light"}`
          );
        }
      }

      const updatedShadow = {
        ...shadow,
        [key]: value,
      };
      handlePropertyChange("shadow", updatedShadow);
    };

    const handleToggle = (checked: boolean) => {
      handleShadowChange("enabled", checked);
    };

    // Detect color theme
    const isDarkTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    return (
      <Box className="space-y-2.5">
        <Flex justify="between" align="center" className="mb-2">
          <Flex align="center" gap="2">
            <Text className="text-xs text-zinc-300 font-medium">
              Drop shadow {isDarkTheme ? "(Dark Mode)" : "(Light Mode)"}
            </Text>
          </Flex>
          <Switch
            size="1"
            checked={shadow.enabled}
            onCheckedChange={handleToggle}
          />
        </Flex>

        {shadow.enabled && (
          <Box className="space-y-2.5">
            <Box>
              <Text className="text-xs text-zinc-400 mb-1">Color</Text>
              <ColorProperty
                label=""
                value={shadow.color}
                property="shadow.color"
              />
              <Text className="text-[10px] text-zinc-500 mt-1">
                Current: {shadow.color}
                {isDarkTheme && shadow.color.toLowerCase().includes("f00") && (
                  <span className="text-red-400 ml-1">
                    (Red shadows may need contrast adjustment in dark mode)
                  </span>
                )}
              </Text>
            </Box>

            <Flex direction="column" gap="2">
              <Flex gap="2">
                <Box className="flex-1">
                  <Text className="text-xs text-zinc-400 mb-1">X</Text>
                  <NumberProperty
                    value={shadow.offsetX}
                    property="shadow"
                    shadowKey="offsetX"
                    min={-100}
                    max={100}
                    step={1}
                    iconLabel="x"
                  />
                </Box>
                <Box className="flex-1">
                  <Text className="text-xs text-zinc-400 mb-1">Y</Text>
                  <NumberProperty
                    value={shadow.offsetY}
                    property="shadow"
                    shadowKey="offsetY"
                    min={-100}
                    max={100}
                    step={1}
                    iconLabel="y"
                  />
                </Box>
              </Flex>

              <Flex gap="2">
                <Box className="flex-1">
                  <Text className="text-xs text-zinc-400 mb-1">Blur</Text>
                  <NumberProperty
                    value={shadow.blur}
                    property="shadow"
                    shadowKey="blur"
                    min={0}
                    max={100}
                    step={1}
                    iconLabel="angle"
                  />
                </Box>
                <Box className="flex-1">
                  <Text className="text-xs text-zinc-400 mb-1">Spread</Text>
                  <NumberProperty
                    value={shadow.spread}
                    property="shadow"
                    shadowKey="spread"
                    min={-100}
                    max={100}
                    step={1}
                  />
                </Box>
              </Flex>

              <Flex gap="2">
                <Box className="flex-1">
                  <Text className="text-xs text-zinc-400 mb-1">Opacity</Text>
                  <Slider
                    size="1"
                    radius="full"
                    value={[shadow.opacity * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => {
                      handleShadowChange("opacity", value[0] / 100);
                    }}
                    className="py-2"
                  />
                </Box>
              </Flex>
            </Flex>
          </Box>
        )}
      </Box>
    );
  };

  // Render AI conversation UI
  const renderAIConversation = () => {
    return (
      <Box className="flex flex-col h-full">
        <Box className="flex-1 overflow-y-auto px-2 py-3">
          {messages.map((message, index) => (
            <Box
              key={index}
              className={`mb-3 p-2 rounded-lg max-w-[85%] ${
                message.type === "user"
                  ? "ml-auto bg-indigo-700 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <Flex justify="between" align="start">
                <Text className="text-xs">{message.content}</Text>
                <Flex gap="2">
                  <Button
                    onClick={() => handleCopyText(message.content)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    variant="ghost"
                    size="1"
                  >
                    <FiCopy className="w-3 h-3" />
                  </Button>
                </Flex>
              </Flex>
            </Box>
          ))}
          {isLoading && (
            <Box className="mb-3 p-2 rounded-lg max-w-[85%] bg-zinc-800 text-zinc-200">
              <Text className="text-xs">Thinking...</Text>
            </Box>
          )}
        </Box>
        <Box className="p-2 border-t border-zinc-800">
          <Flex gap="2" align="center">
            <TextField.Root
              className="flex-1"
              placeholder="Ask AI for design help..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDownCapture={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !isLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              size="2"
              variant="surface"
            >
              <TextField.Slot>
                <FiMessageCircle className="h-4 w-4 text-zinc-500" />
              </TextField.Slot>
            </TextField.Root>
            <Button
              onClick={handleRedoLastPrompt}
              variant="ghost"
              size="1"
              disabled={!lastPromptRef.current || isLoading}
            >
              <FiRefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              variant="solid"
              size="1"
              disabled={isLoading}
            >
              <FiSend className="w-4 h-4" />
            </Button>
          </Flex>
        </Box>
      </Box>
    );
  };

  // Render the properties panel
  const renderPropertiesPanel = () => {
    if (!selectedShape && !multipleSelection) {
      return (
        <Text className="text-xs text-zinc-500 text-center mt-8">
          Select a shape to edit properties
        </Text>
      );
    }

    // Multiple selection
    if (multipleSelection) {
      return (
        <>
          <Text className="text-sm font-medium text-zinc-200 mb-4">
            Multiple Selection
          </Text>

          <Box className="border-b border-zinc-800 pb-4 mb-4">
            <Text className="text-xs text-zinc-400 mb-2">
              {selectedShapeIds.length} shapes selected
            </Text>

            <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
              Common Properties
            </Text>

            <ColorProperty label="Fill Color" value="#4f46e5" property="fill" />

            <ColorProperty
              label="Stroke Color"
              value="#000000"
              property="stroke"
            />

            <Box className="mt-3">
              <Text className="text-xs text-zinc-400 mb-1">Stroke Width</Text>
              <NumberProperty
                value={1}
                property="strokeWidth"
                min={0}
                max={10}
                step={0.1}
              />
            </Box>

            <Box className="mt-3">
              <Flex gap="4">
                <BooleanProperty
                  label="Visible"
                  value={true}
                  property="isVisible"
                  icon={<FiEye className="w-3.5 h-3.5" />}
                />

                <BooleanProperty
                  label="Locked"
                  value={false}
                  property="isLocked"
                  icon={<FiLock className="w-3.5 h-3.5" />}
                />
              </Flex>
            </Box>
          </Box>
        </>
      );
    }

    // Single shape selection
    return (
      <>
        {/* Object Name at the top (not editable) */}
        <Flex gap="2" align="center" className="mb-4 px-0.5">
          <Text
            className="text-sm font-medium text-zinc-100 truncate"
            title={selectedShape?.name}
          >
            {selectedShape?.name ||
              `${selectedShape?.type?.charAt(0).toUpperCase() ?? ""}${
                selectedShape?.type?.slice(1) ?? ""
              }`}
          </Text>
        </Flex>

        {/* Position Section */}
        <Box className="border-b border-zinc-800/50 pb-4 mb-4">
          <Text className="text-[11px] text-zinc-400 mb-3 tracking-wider font-medium uppercase">
            Position
          </Text>
          <Flex direction="column" gap="2">
            <Flex gap="2">
              <Box className="flex-1">
                <Text className="text-xs text-zinc-400 mb-1">X</Text>
                <NumberProperty
                  value={selectedShape?.x || 0}
                  property="x"
                  step={1}
                  iconLabel="x"
                />
              </Box>
              <Box className="flex-1">
                <Text className="text-xs text-zinc-400 mb-1">Y</Text>
                <NumberProperty
                  value={selectedShape?.y || 0}
                  property="y"
                  step={1}
                  iconLabel="y"
                />
              </Box>
            </Flex>
            <Box>
              <Text className="text-xs text-zinc-400 mb-1">Rotation</Text>
              <NumberProperty
                value={selectedShape?.rotation || 0}
                property="rotation"
                min={-360}
                max={360}
                step={0.1}
                isDegree={true}
                iconLabel="angle"
              />
            </Box>
          </Flex>
        </Box>

        {/* Layout Section */}
        <Box className="border-b border-zinc-800/50 pb-4 mb-4">
          <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
            Layout
          </Text>
          <Flex gap="2">
            <Box className="flex-1">
              <Text className="text-xs text-zinc-400 mb-1">Width</Text>
              <NumberProperty
                value={selectedShape?.width || 0}
                property="width"
                min={1}
                step={1}
              />
            </Box>
            <Box className="flex-1">
              <Text className="text-xs text-zinc-400 mb-1">Height</Text>
              <NumberProperty
                value={selectedShape?.height || 0}
                property="height"
                min={1}
                step={1}
              />
            </Box>
          </Flex>
          {selectedShape?.isContainer && (
            <Box className="mt-3">
              <BooleanProperty
                label="Clip content"
                value={selectedShape.clipContent !== false}
                property="clipContent"
              />
            </Box>
          )}
        </Box>

        {/* Appearance Section */}
        <Box className="border-b border-zinc-800/50 pb-4 mb-4">
          <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
            Appearance
          </Text>
          <Box className="space-y-3">
            <Box>
              <Text className="text-xs text-zinc-400 mb-1">Fill</Text>
              <ColorProperty
                label=""
                value={selectedShape?.fill || "#000000"}
                property="fill"
              />
            </Box>
            <Box>
              <Text className="text-xs text-zinc-400 mb-1">Stroke</Text>
              <ColorProperty
                label=""
                value={selectedShape?.stroke || "#000000"}
                property="stroke"
              />
            </Box>
            <Box>
              <Text className="text-xs text-zinc-400 mb-1">Stroke Width</Text>
              <NumberProperty
                value={selectedShape?.strokeWidth || 0}
                property="strokeWidth"
                min={0}
                max={10}
                step={0.1}
              />
            </Box>
          </Box>
        </Box>

        {/* Effects Section */}
        <Box className="border-b border-zinc-800/50 pb-4 mb-4">
          <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
            Effects
          </Text>
          <ShadowControl />
        </Box>

        {/* Options Section */}
        <Box className="mb-4">
          <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
            Options
          </Text>
          <Flex gap="4">
            <BooleanProperty
              label="Visible"
              value={selectedShape?.isVisible !== false}
              property="isVisible"
              icon={<FiEye className="w-3.5 h-3.5" />}
            />
            <BooleanProperty
              label="Locked"
              value={selectedShape?.isLocked === true}
              property="isLocked"
              icon={<FiLock className="w-3.5 h-3.5" />}
            />
          </Flex>
        </Box>

        {renderContainerProperties()}
      </>
    );
  };

  const renderContainerProperties = () => {
    if (!selectedShape || !selectedShape.isContainer) return null;

    // Display different options based on container type
    if (selectedShape.type === "frame") {
      return (
        <Box className="border-b border-zinc-800/50 pb-4 mb-4">
          <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
            Frame Properties
          </Text>

          <BooleanProperty
            label="Clip Content"
            value={selectedShape.clipContent !== false}
            property="clipContent"
          />

          <Box className="mt-3">
            <Text className="text-xs text-zinc-400 mb-1">
              Layout Constraints
            </Text>
            <Box className="bg-zinc-800/40 p-2 rounded mt-1">
              <Text className="text-xs text-zinc-500">
                Constraints control how child elements behave when the frame is
                resized.
              </Text>
            </Box>
          </Box>
        </Box>
      );
    }

    // For groups
    if (selectedShape.type === "group") {
      return (
        <Box className="border-b border-zinc-800/50 pb-4 mb-4">
          <Text className="text-[11px] font-medium text-zinc-400 mb-3 tracking-wider uppercase">
            Group Properties
          </Text>

          <BooleanProperty
            label="Auto-resize"
            value={selectedShape.autoResize !== false}
            property="autoResize"
          />

          <Box className="mt-3">
            <Text className="text-xs text-zinc-500">
              Groups automatically adjust their boundaries to enclose all child
              elements.
            </Text>
          </Box>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box className="h-full w-full bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden">
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
        className="h-full flex flex-col"
      >
        <Tabs.List className="border-b border-zinc-800">
          <Tabs.Trigger value="properties" className="flex items-center gap-1">
            <FiSettings className="w-4 h-4" />
            <Text className="hidden sm:inline">Properties</Text>
          </Tabs.Trigger>
          <Tabs.Trigger value="ai" className="flex items-center gap-1">
            <FiMessageCircle className="w-4 h-4" />
            <Text className="hidden sm:inline">AI</Text>
          </Tabs.Trigger>
        </Tabs.List>

        <Box className="flex-1 overflow-hidden">
          <ScrollArea
            className="h-full"
            scrollbars="vertical"
            type="always"
            style={{
              height: "calc(100vh - 48px - 40px)", // Subtract header and tab heights
              overflowY: "auto",
            }}
          >
            <Box className="p-3">
              <Tabs.Content value="properties">
                {renderPropertiesPanel()}
              </Tabs.Content>
              <Tabs.Content value="ai">{renderAIConversation()}</Tabs.Content>
            </Box>
          </ScrollArea>
        </Box>
      </Tabs.Root>
    </Box>
  );
}
