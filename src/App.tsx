import React from "react";
import { Canvas } from "./components/Canvas";
import { LeftSidebar } from "./components/LeftSidebar";
import { Toolbar } from "./components/Toolbar";
import { RightSidebar } from "./components/RightSidebar";
import { Titlebar } from "./components/Titlebar";
import { useEffect, useState, useCallback } from "react";
// @ts-ignore - Fix for missing types
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import "./App.css";

// Key for saving panel layout in localStorage
const PANEL_LAYOUT_KEY = "chitrapata-panel-layout";

function App() {
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth - 512);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 48);

  // Get default panel sizes from localStorage or use defaults
  const getDefaultPanelSizes = () => {
    try {
      const savedLayout = localStorage.getItem(PANEL_LAYOUT_KEY);
      if (savedLayout) {
        return JSON.parse(savedLayout);
      }
    } catch (error) {
      console.error("Error loading panel layout:", error);
    }
    return [15, 65, 20]; // Default sizes: left, main, right
  };

  const defaultSizes = getDefaultPanelSizes();

  // Update canvas dimensions
  const updateCanvasDimensions = useCallback(() => {
    const mainPanelElement = document.getElementById("main-panel");
    if (mainPanelElement) {
      setCanvasWidth(mainPanelElement.clientWidth);
      setCanvasHeight(window.innerHeight - 48);
    }
  }, []);

  // Handle panel resize
  const handlePanelResize = useCallback(
    (sizes: number[]) => {
      // Save panel layout to localStorage
      try {
        localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(sizes));
      } catch (error) {
        console.error("Error saving panel layout:", error);
      }

      // Update canvas dimensions
      updateCanvasDimensions();
    },
    [updateCanvasDimensions]
  );

  // Update dimensions on window resize
  useEffect(() => {
    window.addEventListener("resize", updateCanvasDimensions);
    // Initial size update
    updateCanvasDimensions();

    return () => window.removeEventListener("resize", updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Titlebar />
      <div className="fixed inset-0 flex pt-12">
        <PanelGroup direction="horizontal" onLayout={handlePanelResize}>
          {/* Left Sidebar */}
          <Panel defaultSize={defaultSizes[0]} minSize={10} maxSize={25}>
            <LeftSidebar />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle />

          {/* Main Content */}
          <Panel id="main-panel" defaultSize={defaultSizes[1]} minSize={40}>
            <div className="h-full relative">
              <Toolbar />
              <Canvas width={canvasWidth} height={canvasHeight} />
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle />

          {/* Right Sidebar */}
          <Panel defaultSize={defaultSizes[2]} minSize={15} maxSize={30}>
            <RightSidebar />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default App;
