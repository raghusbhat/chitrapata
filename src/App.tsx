import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { RightSidebar } from "./components/RightSidebar";
import { Titlebar } from "./components/Titlebar";
import { LeftSidebar } from "./components/LeftSidebar";
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth - 512);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 48);

  // Update canvas dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      // Both sidebars are 256px each (64 * 4)
      setCanvasWidth(window.innerWidth - 512);
      setCanvasHeight(window.innerHeight - 48);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Titlebar />
      <div className="fixed inset-0 flex pt-12">
        <LeftSidebar />
        <div className="flex-1">
          <Canvas width={canvasWidth} height={canvasHeight} />
        </div>
        <RightSidebar />
      </div>
      <Toolbar />
    </div>
  );
}

export default App;
