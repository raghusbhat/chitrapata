import { useCanvasStore } from "../store/canvasStore";
import { FiSquare, FiCircle, FiMinus, FiType } from "react-icons/fi";
import { Shape } from "../lib/webgl/types";

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? "bg-zinc-700 text-white"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}

export function Toolbar() {
  const { selectedShape, setSelectedShape } = useCanvasStore();

  const tools = [
    { id: "rectangle", icon: <FiSquare size={20} />, label: "Rectangle" },
    { id: "ellipse", icon: <FiCircle size={20} />, label: "Ellipse" },
    { id: "line", icon: <FiMinus size={20} />, label: "Line" },
    { id: "text", icon: <FiType size={20} />, label: "Text" },
  ];

  const handleToolSelect = (type: Shape["type"]) => {
    console.log("Tool selected:", type);
    const newShape: Shape = {
      id: "",
      type,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      fill: "#3b82f6",
      stroke: "#1d4ed8",
      strokeWidth: 2,
    };
    console.log("Setting selected shape:", newShape);
    setSelectedShape(newShape);
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 rounded-xl shadow-lg p-2 flex gap-2 border border-zinc-800">
      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          isActive={selectedShape?.type === tool.id}
          onClick={() => handleToolSelect(tool.id as Shape["type"])}
        />
      ))}
    </div>
  );
}
