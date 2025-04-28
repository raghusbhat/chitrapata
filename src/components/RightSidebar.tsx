import React, { useState, useEffect, useRef } from "react";
import { useCanvasStore } from "../store/canvasStore";
import { Shape } from "../lib/webgl/types";
import {
  FiMessageCircle,
  FiSettings,
  FiSend,
  FiCopy,
  FiRefreshCw,
} from "react-icons/fi";
import { generateAIResponse } from "../lib/api";

type TabType = "properties" | "ai";

interface TabProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const Tab: React.FC<TabProps> = ({ isActive, onClick, children }) => (
  <button
    className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
      isActive
        ? "text-primary border-primary bg-zinc-900/80"
        : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/30"
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

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
  const handlePropertyChange = (property: keyof Shape, value: any) => {
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

  // Render color picker with label
  const ColorProperty = ({
    label,
    value,
    property,
  }: {
    label: string;
    value: string;
    property: "fill" | "stroke";
  }) => {
    return (
      <div className="mb-3">
        <label className="block text-xs text-zinc-400 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => handlePropertyChange(property, e.target.value)}
            className="w-8 h-8 rounded bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => handlePropertyChange(property, e.target.value)}
            className="flex-1 bg-zinc-800 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    );
  };

  // Render numeric input with label
  const NumberProperty = ({
    label,
    value,
    property,
    min,
    max,
    step = 1,
  }: {
    label: string;
    value: number;
    property: keyof Shape;
    min?: number;
    max?: number;
    step?: number;
  }) => {
    return (
      <div className="mb-3">
        <label className="block text-xs text-zinc-400 mb-1">{label}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) =>
            handlePropertyChange(property, Number(e.target.value))
          }
          className="w-full bg-zinc-800 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    );
  };

  // Render text input with label
  const TextProperty = ({
    label,
    value,
    property,
  }: {
    label: string;
    value: string;
    property: keyof Shape;
  }) => {
    return (
      <div className="mb-3">
        <label className="block text-xs text-zinc-400 mb-1">{label}</label>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => handlePropertyChange(property, e.target.value)}
          className="w-full bg-zinc-800 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    );
  };

  // Render checkbox with label
  const BooleanProperty = ({
    label,
    value,
    property,
  }: {
    label: string;
    value: boolean;
    property: keyof Shape;
  }) => {
    return (
      <div className="mb-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handlePropertyChange(property, e.target.checked)}
          className="rounded bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
        />
        <label className="block text-xs text-zinc-400">{label}</label>
      </div>
    );
  };

  // Render AI conversation UI
  const renderAIConversation = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-3 p-2 rounded-lg max-w-[85%] ${
                message.type === "user"
                  ? "ml-auto bg-indigo-700 text-white"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-xs">{message.content}</p>
                <div className="flex ml-2">
                  <button
                    onClick={() => handleCopyText(message.content)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors"
                    title="Copy text"
                  >
                    <FiCopy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-3 p-2 rounded-lg max-w-[85%] bg-zinc-800 text-zinc-200">
              <p className="text-xs">Thinking...</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              // intercept before any parent DOM handlers (including shortcuts)
              onKeyDownCapture={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !isLoading) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask AI for design help..."
              className="flex-1 bg-zinc-800 text-xs rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              onClick={handleRedoLastPrompt}
              className={`p-2 rounded ${
                !lastPromptRef.current || isLoading
                  ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              }`}
              disabled={!lastPromptRef.current || isLoading}
              title="Use last prompt"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSendMessage}
              className={`p-2 rounded ${
                isLoading
                  ? "bg-zinc-700 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
              disabled={isLoading}
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render the properties panel
  const renderPropertiesPanel = () => {
    if (!selectedShape && !multipleSelection) {
      return (
        <div className="text-xs text-zinc-500 text-center mt-8">
          Select a shape to edit properties
        </div>
      );
    }

    // Multiple selection
    if (multipleSelection) {
      return (
        <>
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Multiple Selection
          </h2>

          <div className="border-b border-zinc-800 pb-3 mb-3">
            <div className="text-xs text-zinc-400 mb-2">
              {selectedShapeIds.length} shapes selected
            </div>

            <h3 className="text-xs font-medium text-zinc-300 mb-2">
              Common Properties
            </h3>

            <ColorProperty label="Fill Color" value="#4f46e5" property="fill" />

            <ColorProperty
              label="Stroke Color"
              value="#000000"
              property="stroke"
            />

            <NumberProperty
              label="Stroke Width"
              value={1}
              property="strokeWidth"
              min={0}
              max={10}
              step={0.1}
            />

            <div className="flex space-x-2">
              <BooleanProperty
                label="Visible"
                value={true}
                property="isVisible"
              />

              <BooleanProperty
                label="Locked"
                value={false}
                property="isLocked"
              />
            </div>
          </div>
        </>
      );
    }

    // Single shape selection
    return (
      <>
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Properties</h2>

        <div className="border-b border-zinc-800 pb-3 mb-3">
          <TextProperty
            label="Name"
            value={
              selectedShape?.name ||
              `${selectedShape?.type?.charAt(0).toUpperCase() ?? ""}${
                selectedShape?.type?.slice(1) ?? ""
              }`
            }
            property="name"
          />
        </div>

        <div className="border-b border-zinc-800 pb-3 mb-3">
          <h3 className="text-xs font-medium text-zinc-300 mb-2">
            Position & Size
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <NumberProperty
              label="X Position"
              value={selectedShape?.x || 0}
              property="x"
            />
            <NumberProperty
              label="Y Position"
              value={selectedShape?.y || 0}
              property="y"
            />
            <NumberProperty
              label="Width"
              value={selectedShape?.width || 0}
              property="width"
              min={1}
            />
            <NumberProperty
              label="Height"
              value={selectedShape?.height || 0}
              property="height"
              min={1}
            />
          </div>
        </div>

        <div className="border-b border-zinc-800 pb-3 mb-3">
          <h3 className="text-xs font-medium text-zinc-300 mb-2">Appearance</h3>

          <ColorProperty
            label="Fill Color"
            value={selectedShape?.fill || "#000000"}
            property="fill"
          />

          <ColorProperty
            label="Stroke Color"
            value={selectedShape?.stroke || "#000000"}
            property="stroke"
          />

          <NumberProperty
            label="Stroke Width"
            value={selectedShape?.strokeWidth || 0}
            property="strokeWidth"
            min={0}
            max={10}
            step={0.1}
          />

          <NumberProperty
            label="Rotation"
            value={selectedShape?.rotation || 0}
            property="rotation"
            min={0}
            max={360}
          />
        </div>

        <div>
          <h3 className="text-xs font-medium text-zinc-300 mb-2">Options</h3>

          <div className="flex space-x-2">
            <BooleanProperty
              label="Visible"
              value={selectedShape?.isVisible !== false}
              property="isVisible"
            />

            <BooleanProperty
              label="Locked"
              value={selectedShape?.isLocked === true}
              property="isLocked"
            />
          </div>
        </div>

        {renderContainerProperties()}
      </>
    );
  };

  const renderContainerProperties = () => {
    if (!selectedShape || !selectedShape.isContainer) return null;

    // Display different options based on container type
    if (selectedShape.type === "frame") {
      return (
        <div className="border-b border-zinc-800 pb-3 mb-3">
          <h3 className="text-xs font-medium text-zinc-300 mb-2">
            Frame Properties
          </h3>

          <BooleanProperty
            label="Clip Content"
            value={selectedShape.clipContent !== false}
            property="clipContent"
          />

          <div className="mt-3">
            <label className="block text-xs text-zinc-400 mb-1">
              Layout Constraints
            </label>
            <div className="bg-zinc-800 p-2 rounded">
              <div className="text-xs text-zinc-500 italic">
                Constraints control how child elements behave when the frame is
                resized.
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For groups
    if (selectedShape.type === "group") {
      return (
        <div className="border-b border-zinc-800 pb-3 mb-3">
          <h3 className="text-xs font-medium text-zinc-300 mb-2">
            Group Properties
          </h3>

          <BooleanProperty
            label="Auto-resize"
            value={selectedShape.autoResize !== false}
            property="autoResize"
          />

          <div className="mt-3">
            <div className="text-xs text-zinc-500">
              Groups automatically adjust their boundaries to enclose all child
              elements.
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full w-full bg-zinc-900 border-l border-zinc-800 flex flex-col">
      <div className="flex border-b border-zinc-800">
        <Tab
          isActive={activeTab === "properties"}
          onClick={() => setActiveTab("properties")}
        >
          <div className="flex items-center justify-center gap-1">
            <FiSettings className="w-4 h-4" />
            <span className="hidden sm:inline">Properties</span>
          </div>
        </Tab>
        <Tab isActive={activeTab === "ai"} onClick={() => setActiveTab("ai")}>
          <div className="flex items-center justify-center gap-1">
            <FiMessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">AI</span>
          </div>
        </Tab>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "properties"
          ? renderPropertiesPanel()
          : renderAIConversation()}
      </div>
    </div>
  );
}
