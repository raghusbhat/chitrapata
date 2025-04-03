import { useState } from "react";
import { FiShare2, FiEdit3, FiUser } from "react-icons/fi";
import logo from "../assets/chitrapata.svg";

// Sample avatar image - replace with your actual user avatar system later
const SAMPLE_AVATAR =
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";

export function Titlebar() {
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditingName, setIsEditingName] = useState(false);
  const [mode, setMode] = useState<"design" | "dev">("design");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
  };

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === "design" ? "dev" : "design"));
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-zinc-925 z-50 flex items-center justify-between px-4 border-b border-zinc-800/50 shadow-md text-sm">
      {/* Left: Logo and App Name */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <img src={logo} alt="Chitrapata Logo" className="h-8 w-auto" />
        <span className="font-baloo font-bold text-zinc-200 text-2xl">
          Chitrapata
        </span>
      </div>

      {/* Middle: Editable Project Name + Edit Icon */}
      <div className="flex items-center gap-2 flex-grow justify-center min-w-0 px-4">
        <input
          type="text"
          value={projectName}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          onFocus={() => setIsEditingName(true)}
          readOnly={!isEditingName}
          className={`bg-transparent text-center outline-none w-auto max-w-[250px] truncate transition-colors font-semibold ${
            isEditingName
              ? "text-zinc-100 ring-1 ring-primary/50 rounded px-2 py-0.5"
              : "text-zinc-300 hover:text-zinc-100 cursor-pointer px-2 py-0.5"
          }`}
          maxLength={50}
        />
        <button
          onClick={() => setIsEditingName(true)}
          className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
          title="Edit Project Name"
        >
          <FiEdit3 size={16} />
        </button>
      </div>

      {/* Right: Avatar, Share, Toggle */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Tab-style Toggle Button */}
        <div className="flex bg-zinc-900 rounded-md overflow-hidden p-0.5 text-xs shadow-inner shadow-black/50">
          <button
            onClick={() => setMode("design")}
            className={`relative px-3 py-1 rounded ${
              mode === "design"
                ? "text-white bg-primary"
                : "text-zinc-400 hover:text-zinc-300"
            } transition-colors font-medium min-w-[60px]`}
          >
            Design
          </button>
          <button
            onClick={() => setMode("dev")}
            className={`relative px-3 py-1 rounded ${
              mode === "dev"
                ? "text-white bg-primary"
                : "text-zinc-400 hover:text-zinc-300"
            } transition-colors font-medium min-w-[40px]`}
          >
            Dev
          </button>
        </div>

        {/* Share Button */}
        <button
          className="text-zinc-400 hover:text-white transition-colors"
          title="Share"
        >
          <FiShare2 size={18} />
        </button>

        {/* Avatar with sample image */}
        <button
          className="w-7 h-7 rounded-full overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-colors"
          title="User Profile"
        >
          <img
            src={SAMPLE_AVATAR}
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </div>
  );
}
