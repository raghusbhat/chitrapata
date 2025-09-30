import { useState } from "react";
import { FiShare2, FiEdit3 } from "react-icons/fi";
import logo from "../assets/chitrapata.svg";
import { Button, TextField } from "@radix-ui/themes";

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

  const toggleMode = (newMode: "design" | "dev") => {
    setMode(newMode);
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
        {isEditingName ? (
          <TextField.Root>
            <TextField.Slot>
              <input
                value={projectName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                className="text-center text-xs bg-transparent w-full"
                maxLength={50}
              />
            </TextField.Slot>
          </TextField.Root>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="text-zinc-300 hover:text-zinc-100 cursor-pointer px-2 py-0.5"
              onClick={() => setIsEditingName(true)}
            >
              {projectName}
            </span>
            <Button
              variant="ghost"
              onClick={() => setIsEditingName(true)}
              className="text-zinc-500 hover:text-white"
              title="Edit Project Name"
            >
              <FiEdit3 size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Right: Avatar, Share, Toggle */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Tab-style Toggle Button */}
        <div className="flex bg-zinc-900 rounded-md overflow-hidden p-0.5 text-xs shadow-inner shadow-black/50">
          <Button
            variant={mode === "design" ? "solid" : "ghost"}
            size="1"
            onClick={() => toggleMode("design")}
            className="min-w-[60px]"
          >
            Design
          </Button>
          <Button
            variant={mode === "dev" ? "solid" : "ghost"}
            size="1"
            onClick={() => toggleMode("dev")}
            className="min-w-[40px]"
          >
            Dev
          </Button>
        </div>

        {/* Share Button */}
        <Button
          variant="ghost"
          className="text-zinc-400 hover:text-white"
          title="Share"
        >
          <FiShare2 size={18} />
        </Button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full overflow-hidden">
          <img
            src={SAMPLE_AVATAR}
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
