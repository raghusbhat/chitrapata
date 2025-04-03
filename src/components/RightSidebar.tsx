import React, { useState } from "react";
import { useCanvasStore } from "../store/canvasStore";

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

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<"properties" | "ai">("properties");
  const { selectedShapeId, getSelectedShape } = useCanvasStore();
  const selectedShape = selectedShapeId ? getSelectedShape() : null;

  return (
    <div className="w-72 h-full bg-zinc-925/95 border-l border-zinc-800/50 flex flex-col backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800/50 bg-zinc-900/80">
        <Tab
          isActive={activeTab === "properties"}
          onClick={() => setActiveTab("properties")}
        >
          Properties
        </Tab>
        <Tab isActive={activeTab === "ai"} onClick={() => setActiveTab("ai")}>
          AI Chat
        </Tab>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "properties" ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                Object Properties
              </h3>
              {selectedShape && (
                <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
                  {selectedShape.type}
                </span>
              )}
            </div>
            {selectedShape ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Position
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={selectedShape.x}
                        readOnly
                        className="w-full bg-zinc-800/50 text-zinc-200 text-sm border border-zinc-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                        X
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={selectedShape.y}
                        readOnly
                        className="w-full bg-zinc-800/50 text-zinc-200 text-sm border border-zinc-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                        Y
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Size
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={selectedShape.width}
                        readOnly
                        className="w-full bg-zinc-800/50 text-zinc-200 text-sm border border-zinc-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                        W
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={selectedShape.height}
                        readOnly
                        className="w-full bg-zinc-800/50 text-zinc-200 text-sm border border-zinc-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                        H
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Rotation
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={selectedShape.rotation || 0}
                      readOnly
                      className="w-full bg-zinc-800/50 text-zinc-200 text-sm border border-zinc-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                      °
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 space-y-2">
                <svg
                  className="w-8 h-8 text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                <p className="text-sm text-zinc-500">
                  Select an object to view properties
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">
                AI Assistant
              </h3>
              <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
                Beta
              </span>
            </div>
            <div className="space-y-4">
              <textarea
                placeholder="Ask me anything about your design..."
                className="w-full h-32 bg-zinc-800/50 text-zinc-200 text-sm border border-zinc-700/50 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder-zinc-500"
              />
              <button className="w-full bg-primary/90 text-white text-sm py-2.5 px-4 rounded-lg hover:bg-primary transition-colors duration-200 flex items-center justify-center gap-2">
                <span>Send Message</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center h-32 space-y-2">
                <svg
                  className="w-8 h-8 text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <p className="text-sm text-zinc-500">
                  Start a conversation with AI
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
