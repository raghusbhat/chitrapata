import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="fixed inset-0">
        <Canvas width={window.innerWidth} height={window.innerHeight} />
      </div>
      <Toolbar />
    </div>
  );
}

export default App;
