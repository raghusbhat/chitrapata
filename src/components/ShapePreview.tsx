import React from "react";
import { Shape } from "../lib/webgl/types";

interface ShapePreviewProps {
  shape: Shape;
  size?: number;
}

export const ShapePreview: React.FC<ShapePreviewProps> = ({
  shape,
  size = 16,
}) => {
  const { type, fill, stroke, strokeWidth } = shape;

  const previewStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    background: fill || "transparent",
    border: stroke && strokeWidth ? `${strokeWidth}px solid ${stroke}` : "none",
    opacity: shape.isVisible === false ? 0.4 : 1,
  };

  switch (type) {
    case "rectangle":
      return <div style={previewStyle} className="rounded-sm" />;

    case "ellipse":
      return <div style={{ ...previewStyle, borderRadius: "50%" }} />;

    case "line":
      return (
        <div
          style={{
            width: `${size}px`,
            height: `${strokeWidth || 1}px`,
            background: stroke || "#000",
            marginTop: `${(size - (strokeWidth || 1)) / 2}px`,
            opacity: shape.isVisible === false ? 0.4 : 1,
          }}
        />
      );

    case "frame":
      return (
        <div
          style={{
            ...previewStyle,
            background: fill || "#fff",
            border: stroke
              ? `${strokeWidth || 1}px solid ${stroke}`
              : "1px solid #4f46e5",
            borderRadius: "1px",
          }}
        />
      );

    case "group":
      return (
        <div
          className="relative"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              width: `${size * 0.7}px`,
              height: `${size * 0.7}px`,
              background: fill || "transparent",
              border: stroke
                ? `${strokeWidth || 1}px solid ${stroke}`
                : "1px dashed #4f46e5",
              opacity: shape.isVisible === false ? 0.4 : 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "0",
              right: "0",
              width: `${size * 0.7}px`,
              height: `${size * 0.7}px`,
              background: fill || "transparent",
              border: stroke
                ? `${strokeWidth || 1}px solid ${stroke}`
                : "1px dashed #4f46e5",
              opacity: shape.isVisible === false ? 0.4 : 1,
            }}
          />
        </div>
      );

    default:
      return <div style={previewStyle} />;
  }
};
