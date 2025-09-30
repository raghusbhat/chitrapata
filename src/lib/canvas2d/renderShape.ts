import { Shape } from "../webgl/types";

/**
 * Renders a shape using Canvas2D API
 * This is used as a fallback when WebGL isn't available or for specific rendering tasks
 */
export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  transform: DOMMatrix = ctx.getTransform()
): void {
  if (shape.isVisible === false) return;

  try {
    // Save initial context state
    ctx.save();

    // Apply absolute transform if provided
    if (shape.absoluteTransform) {
      // Reset the transform and apply the absolute transform
      ctx.setTransform(
        transform.a,
        transform.b,
        transform.c,
        transform.d,
        transform.e,
        transform.f
      );
      // Translate to top-left + half dimensions for center-based rotation
      ctx.translate(
        shape.absoluteTransform.x + shape.width / 2,
        shape.absoluteTransform.y + shape.height / 2
      );
      if (shape.absoluteTransform.rotation) {
        ctx.rotate((shape.absoluteTransform.rotation * Math.PI) / 180);
      }
    } else {
      // Apply the shape's transform (translate to center for rotation)
      ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2);
      if (shape.rotation) {
        ctx.rotate((shape.rotation * Math.PI) / 180);
      }
    }

    // Set shadow if enabled
    if (shape.shadow?.enabled) {
      const shadowColor = hexToRgba(
        shape.shadow.color || "#000000",
        shape.shadow.opacity || 0.5
      );
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shape.shadow.blur || 10;
      ctx.shadowOffsetX = shape.shadow.offsetX || 5;
      ctx.shadowOffsetY = shape.shadow.offsetY || 5;
    } else {
      // Reset shadow properties to default
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Apply fill style - IMPORTANT to set this before any drawing operations
    if (shape.fill && shape.fill !== "transparent") {
      ctx.fillStyle = shape.fill;
    }

    // Apply stroke style
    if (shape.stroke) {
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth = shape.strokeWidth || 1;
    }

    // Render based on shape type
    if (shape.type === "rectangle") {
      // Draw rectangle
      ctx.beginPath();
      if (shape.borderRadius) {
        roundRect(
          ctx,
          -shape.width / 2,
          -shape.height / 2,
          shape.width,
          shape.height,
          shape.borderRadius
        );
      } else {
        ctx.rect(
          -shape.width / 2,
          -shape.height / 2,
          shape.width,
          shape.height
        );
      }
      ctx.closePath();

      // IMPORTANT: First fill, then stroke to avoid the fill covering the stroke
      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }

      if (shape.stroke) {
        ctx.stroke();
      }
    } else if (shape.type === "ellipse") {
      // Draw ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, shape.width / 2, shape.height / 2, 0, 0, 2 * Math.PI);
      ctx.closePath();

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }

      if (shape.stroke) {
        ctx.stroke();
      }
    } else if (shape.type === "text") {
      // Apply text styling
      ctx.font = `${shape.fontWeight || "normal"} ${shape.fontSize || 16}px ${
        shape.fontFamily || "sans-serif"
      }`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fillStyle = shape.fill;
        ctx.fillText(shape.text || "", 0, 0);
      }

      if (shape.stroke) {
        ctx.strokeText(shape.text || "", 0, 0);
      }
    } else if (shape.type === "circle") {
      // Draw circle (same as ellipse but with equal radii)
      ctx.beginPath();
      const radius = Math.min(shape.width, shape.height) / 2;
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.closePath();

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }

      if (shape.stroke) {
        ctx.stroke();
      }
    } else if (shape.type === "triangle") {
      // Draw triangle
      ctx.beginPath();
      ctx.moveTo(0, -shape.height / 2); // Top center
      ctx.lineTo(-shape.width / 2, shape.height / 2); // Bottom left
      ctx.lineTo(shape.width / 2, shape.height / 2); // Bottom right
      ctx.closePath();

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }

      if (shape.stroke) {
        ctx.stroke();
      }
    } else if (shape.type === "line") {
      // Draw line
      ctx.beginPath();
      ctx.moveTo(-shape.width / 2, -shape.height / 2);
      ctx.lineTo(shape.width / 2, shape.height / 2);

      if (shape.stroke) {
        ctx.stroke();
      }
    } else if (shape.type === "image") {
      // Draw image placeholder (actual image rendering would require loading the image)
      ctx.beginPath();
      ctx.rect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      ctx.closePath();

      // Draw placeholder background
      ctx.fillStyle = "#cccccc";
      ctx.fill();

      if (shape.stroke) {
        ctx.stroke();
      }

      // Draw "X" to indicate image placeholder
      ctx.beginPath();
      ctx.moveTo(-shape.width / 2, -shape.height / 2);
      ctx.lineTo(shape.width / 2, shape.height / 2);
      ctx.moveTo(shape.width / 2, -shape.height / 2);
      ctx.lineTo(-shape.width / 2, shape.height / 2);
      ctx.strokeStyle = "#666666";
      ctx.stroke();
    } else if (shape.type === "path") {
      // Draw custom path (placeholder - would need path data)
      ctx.beginPath();
      ctx.rect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      ctx.closePath();

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }

      if (shape.stroke) {
        ctx.stroke();
      }
    } else if (shape.type === "frame" || shape.type === "group") {
      // Draw frame/group outline
      ctx.beginPath();
      ctx.rect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      ctx.closePath();

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }

      if (shape.stroke) {
        ctx.stroke();
      }
    } else {
      console.warn(`Unknown shape type: ${shape.type}`);
      ctx.beginPath();
      ctx.rect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      ctx.closePath();

      if (shape.fill && shape.fill !== "transparent") {
        ctx.fill();
      }
    }

    // Restore context state
    ctx.restore();
  } catch (error) {
    console.error(`Error rendering shape ${shape.id}:`, error);
    // Try basic rectangle as fallback
    try {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.fillStyle = shape.fill || "#888888";
      ctx.fillRect(
        -shape.width / 2,
        -shape.height / 2,
        shape.width,
        shape.height
      );
      ctx.restore();
    } catch (fallbackError) {
      console.error("Even fallback rendering failed:", fallbackError);
    }
  }
}

/**
 * Draws a rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Convert hex color to rgba string with opacity
 */
function hexToRgba(hex: string, opacity: number): string {
  if (!hex) {
    console.warn("Empty hex color provided");
    return `rgba(0, 0, 0, ${opacity})`;
  }

  // For named colors or non-hex formats, return with opacity
  if (!hex.startsWith("#")) {
    try {
      // For CSS color names, create a temp canvas to get computed values
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        console.warn("Could not create temporary context for color conversion");
        return hex;
      }

      // Set the fillStyle to convert the color
      tempCtx.fillStyle = hex;

      // If result is a hex, process it, otherwise return as is with opacity
      if (tempCtx.fillStyle.startsWith("#")) {
        return hexToRgba(tempCtx.fillStyle, opacity);
      } else if (tempCtx.fillStyle.startsWith("rgb")) {
        // Handle rgb value directly
        if (tempCtx.fillStyle.startsWith("rgba")) {
          return tempCtx.fillStyle;
        } else {
          // Convert rgb to rgba
          return tempCtx.fillStyle
            .replace("rgb", "rgba")
            .replace(")", `, ${opacity})`);
        }
      }

      // Fallback to original with opacity
      return hex.includes("rgba")
        ? hex
        : `${hex.replace(")", `, ${opacity})`)}`;
    } catch (e) {
      console.warn("Error processing color:", e);
      return hex;
    }
  }

  try {
    // Process hex color
    let r = 0,
      g = 0,
      b = 0;

    if (hex.length === 4) {
      // Short hex form (#RGB)
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      // Full hex form (#RRGGBB)
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    } else {
      console.warn(`Invalid hex color format: ${hex}`);
      return `rgba(0, 0, 0, ${opacity})`;
    }

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch (e) {
    console.warn("Error parsing hex color:", e);
    return `rgba(0, 0, 0, ${opacity})`;
  }
}
