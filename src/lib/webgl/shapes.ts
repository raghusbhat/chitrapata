import { Shape, WebGLContext } from "./types";
import { mat4 } from "gl-matrix";

/**
 * Creates a WebGL buffer for shape vertices
 */
function createShapeBuffer(
  gl: WebGL2RenderingContext,
  vertices: Float32Array
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error("Failed to create buffer");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  return buffer;
}

/**
 * Creates vertices for a rectangle
 */
function createRectangleVertices(
  x: number,
  y: number,
  width: number,
  height: number
): Float32Array {
  // Each vertex has 4 components: position (x,y) and texCoord (u,v)
  // Using simple triangle strip format
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;

  // For a rectangle, texCoords should be at corners (0,0), (1,0), (0,1), (1,1)
  // This ensures the fragment shader uses the correct distance calculation
  const vertices = new Float32Array([
    // Position (x,y), TexCoord (u,v)
    x1,
    y1,
    0.0,
    0.0, // Top-left
    x2,
    y1,
    1.0,
    0.0, // Top-right
    x1,
    y2,
    0.0,
    1.0, // Bottom-left
    x2,
    y2,
    1.0,
    1.0, // Bottom-right
  ]);

  return vertices;
}

/**
 * Creates vertices for an ellipse
 */
function createEllipseVertices(
  x: number,
  y: number,
  width: number,
  height: number
): Float32Array {
  const segments = 128; // Increased number of segments for smoother circles
  const vertices = new Float32Array((segments + 2) * 4); // +2 for center and closing point

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  // Center point
  vertices[0] = centerX;
  vertices[1] = centerY;
  vertices[2] = 0.5; // texCoord u (center)
  vertices[3] = 0.5; // texCoord v (center)

  // Generate points around the ellipse
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const vertexX = centerX + radiusX * cos;
    const vertexY = centerY + radiusY * sin;

    // Calculate texture coordinates (normalized from 0-1)
    // We add 0.5 to center around the middle, and multiply by 0.5 to scale to 0-1 range
    const texCoordU = 0.5 + 0.5 * cos;
    const texCoordV = 0.5 + 0.5 * sin;

    const index = (i + 1) * 4;
    vertices[index] = vertexX;
    vertices[index + 1] = vertexY;
    vertices[index + 2] = texCoordU;
    vertices[index + 3] = texCoordV;
  }

  return vertices;
}

/**
 * Creates vertices for a line
 */
function createLineVertices(
  x: number,
  y: number,
  width: number,
  height: number
): Float32Array {
  const vertices = new Float32Array([
    // Position (x,y)    TexCoord (u,v)
    x,
    y,
    0.0,
    0.5, // Start point
    x + width,
    y + height,
    1.0,
    0.5, // End point
  ]);

  return vertices;
}

/**
 * Converts hex color to RGBA
 */
function hexToRGBA(hex: string): [number, number, number, number] {
  // Handle transparent or empty color
  if (!hex || hex === "transparent") {
    return [0, 0, 0, 0];
  }

  // Make sure the hex starts with #
  if (!hex.startsWith("#")) {
    // Try to handle common color names or formats
    if (hex.toLowerCase() === "white") return [1, 1, 1, 1];
    if (hex.toLowerCase() === "black") return [0, 0, 0, 1];
    if (hex.toLowerCase() === "red") return [1, 0, 0, 1];
    if (hex.toLowerCase() === "transparent") return [0, 0, 0, 0];

    // Check if it's an rgb/rgba format
    if (hex.startsWith("rgb")) {
      const values = hex.match(/\d+/g);
      if (values && values.length >= 3) {
        const r = parseInt(values[0], 10) / 255;
        const g = parseInt(values[1], 10) / 255;
        const b = parseInt(values[2], 10) / 255;
        const a = values.length >= 4 ? parseFloat(values[3]) : 1;
        return [r, g, b, a];
      }
    }

    // Fallback: use Canvas2D to parse named CSS colors
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = hex;
        const computed = ctx.fillStyle; // e.g. "#rrggbb" or "rgb(...)"
        return hexToRGBA(computed);
      }
    } catch (e) {
      console.error("Error parsing CSS color:", hex, e);
    }
    return [0, 0, 0, 1]; // Default to black
  }

  try {
    // Standard hex color
    if (hex.length >= 7) {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
      return [r, g, b, a];
    }
    // Shorthand hex like #FFF
    else if (hex.length >= 4) {
      const r = parseInt(hex[1] + hex[1], 16) / 255;
      const g = parseInt(hex[2] + hex[2], 16) / 255;
      const b = parseInt(hex[3] + hex[3], 16) / 255;
      const a = hex.length === 5 ? parseInt(hex[4] + hex[4], 16) / 255 : 1;
      return [r, g, b, a];
    }
    // Invalid format
    console.error("Invalid hex format:", hex);
    return [1, 1, 1, 1]; // Default to white
  } catch (e) {
    console.error("Error parsing color format:", hex, e);
    return [1, 1, 1, 1]; // Default to white
  }
}

/**
 * Renders a shape using WebGL
 */
export function renderShape(
  gl: WebGL2RenderingContext,
  shape: Shape,
  context: WebGLContext
) {
  const { program, attributes, uniforms } = context;

  // Use absoluteTransform if available (for shapes with parents)
  const x = shape.absoluteTransform?.x ?? shape.x;
  const y = shape.absoluteTransform?.y ?? shape.y;
  const rotation = shape.absoluteTransform?.rotation ?? shape.rotation ?? 0;

  const {
    width,
    height,
    fill = "#FFFFFF",
    stroke = "#000000",
    strokeWidth = 1,
    type = "rectangle",
    scaleStrokeWidth = false,
  } = shape;

  // Get device pixel ratio
  const dpr = window.devicePixelRatio || 1;

  // Create model-view matrix
  const modelViewMatrix = mat4.create();

  // Scale coordinates by device pixel ratio
  const scaledX = x * dpr;
  const scaledY = y * dpr;
  const scaledWidth = width * dpr;
  const scaledHeight = height * dpr;

  // Translate to shape's position
  mat4.translate(modelViewMatrix, modelViewMatrix, [
    scaledX + scaledWidth / 2,
    scaledY + scaledHeight / 2,
    0,
  ]);

  // Rotate around center
  mat4.rotate(
    modelViewMatrix,
    modelViewMatrix,
    (rotation * Math.PI) / 180,
    [0, 0, 1]
  );

  // Translate back to origin
  mat4.translate(modelViewMatrix, modelViewMatrix, [
    -(scaledX + scaledWidth / 2),
    -(scaledY + scaledHeight / 2),
    0,
  ]);

  // Set uniforms
  gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
  gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, modelViewMatrix);

  // Convert colors using the safer hexToRGBA function
  const fillRGBA = hexToRGBA(fill);
  const strokeRGBA = hexToRGBA(stroke);

  gl.uniform4f(
    uniforms.fillColor,
    fillRGBA[0],
    fillRGBA[1],
    fillRGBA[2],
    fillRGBA[3]
  );

  gl.uniform4f(
    uniforms.strokeColor,
    strokeRGBA[0],
    strokeRGBA[1],
    strokeRGBA[2],
    strokeRGBA[3]
  );

  // Use a uniform stroke width regardless of scale if scaleStrokeWidth is false
  const effectiveStrokeWidth = scaleStrokeWidth
    ? strokeWidth
    : strokeWidth / context.currentScale;

  // Scale stroke width by device pixel ratio
  const normalizedStrokeWidth =
    (effectiveStrokeWidth * dpr) / Math.min(scaledWidth, scaledHeight);
  gl.uniform1f(uniforms.strokeWidth, normalizedStrokeWidth);
  // Reset smoothing based on shape dimensions
  gl.uniform1f(uniforms.smoothing, 1.0 / Math.min(scaledWidth, scaledHeight));

  // Get appropriate vertices for shape type
  let vertices;
  if (type === "ellipse") {
    vertices = createEllipseVertices(
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight
    );
    gl.uniform1i(uniforms.shapeType, 1);
  } else if (type === "line") {
    vertices = createLineVertices(scaledX, scaledY, scaledWidth, scaledHeight);
    gl.uniform1i(uniforms.shapeType, 2);
  } else {
    // Default to rectangle
    vertices = createRectangleVertices(
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight
    );
    gl.uniform1i(uniforms.shapeType, 0);
  }

  // Create vertex buffer
  const vertexBuffer = createShapeBuffer(gl, vertices);

  // Set up vertex attributes
  gl.enableVertexAttribArray(attributes.position);
  gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(attributes.texCoord);
  gl.vertexAttribPointer(attributes.texCoord, 2, gl.FLOAT, false, 16, 8);

  // Draw the shape (use triangle strips for rectangles and triangles for complex shapes)
  let drawMode: number;
  if (type === "line") drawMode = gl.LINES;
  else if (type === "ellipse") drawMode = gl.TRIANGLE_FAN;
  else drawMode = gl.TRIANGLE_STRIP;
  const vertexCount = type === "rectangle" ? 4 : vertices.length / 4;
  gl.drawArrays(drawMode, 0, vertexCount);

  // Clean up
  gl.deleteBuffer(vertexBuffer);
}
