import { Shape, WebGLContext } from "./types";

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

  console.log("Created rectangle vertices:", vertices);
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

  console.log("Created ellipse vertices:", vertices);
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

  console.log("Created line vertices:", vertices);
  return vertices;
}

/**
 * Converts hex color to RGBA
 */
function hexToRGBA(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  return [r, g, b, a];
}

/**
 * Renders a shape using WebGL
 */
export function renderShape(
  gl: WebGL2RenderingContext,
  shape: Shape,
  context: WebGLContext
) {
  console.log("=== Rendering Shape ===");
  console.log("Shape:", shape);
  const { program, attributes, uniforms } = context;

  // Enable blending for transparent shapes
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Set uniforms
  gl.useProgram(program);
  console.log("Program activated");

  // Set resolution uniform
  gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
  console.log("Resolution uniform set:", gl.canvas.width, gl.canvas.height);

  // Convert colors to RGBA
  const fillColor = hexToRGBA(shape.fill || "#333333");
  const strokeColor = hexToRGBA(shape.stroke || "#000000");
  console.log("Fill color:", fillColor);
  console.log("Stroke color:", strokeColor);

  // Create vertices based on shape type
  let vertices: Float32Array;
  let vertexCount: number;
  let drawMode: number;
  let shapeTypeValue: number;

  switch (shape.type) {
    case "ellipse":
      vertices = createEllipseVertices(
        shape.x,
        shape.y,
        shape.width,
        shape.height
      );
      drawMode = gl.TRIANGLE_FAN;
      vertexCount = 130; // 128 segments + center + closing point
      shapeTypeValue = 1; // Ellipse
      break;
    case "line":
      vertices = createLineVertices(
        shape.x,
        shape.y,
        shape.width,
        shape.height
      );
      drawMode = gl.LINES;
      vertexCount = 2;
      shapeTypeValue = 2; // Line
      break;
    case "rectangle":
    default:
      vertices = createRectangleVertices(
        shape.x,
        shape.y,
        shape.width,
        shape.height
      );
      drawMode = gl.TRIANGLE_STRIP;
      vertexCount = 4;
      shapeTypeValue = 0; // Rectangle
      break;
  }

  console.log("Shape dimensions:", {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  });
  console.log("Shape type value:", shapeTypeValue);

  // Create and bind buffer
  const buffer = createShapeBuffer(gl, vertices);
  console.log("Buffer created");

  // Set up attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Enable attributes
  gl.enableVertexAttribArray(attributes.position);
  gl.enableVertexAttribArray(attributes.texCoord);

  // Set attribute pointers
  gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(attributes.texCoord, 2, gl.FLOAT, false, 16, 8);
  console.log("Attributes set up");

  // Set the shape type uniform
  gl.uniform1i(uniforms.shapeType, shapeTypeValue);

  // Set stroke and smoothing parameters based on shape type
  if (shape.type === "rectangle") {
    // For rectangles - thin, crisp border
    gl.uniform1f(uniforms.strokeWidth, 0.02); // Border thickness
    gl.uniform1f(uniforms.smoothing, 0.01); // Border smoothing
  } else if (shape.type === "ellipse") {
    // For ellipses - improved anti-aliasing
    gl.uniform1f(uniforms.strokeWidth, 0.0); // No border
    gl.uniform1f(uniforms.smoothing, 0.005); // Reduced smoothing for crisper edges
  } else {
    // For lines
    gl.uniform1f(uniforms.strokeWidth, 0.0); // No border
    gl.uniform1f(uniforms.smoothing, 0.01); // Minimal smoothing
  }

  // Set color uniforms
  gl.uniform4fv(uniforms.fillColor, fillColor);
  gl.uniform4fv(uniforms.strokeColor, strokeColor);

  // Draw
  gl.drawArrays(drawMode, 0, vertexCount);
  console.log(`Shape drawn with mode ${drawMode} and ${vertexCount} vertices`);

  // Cleanup
  gl.deleteBuffer(buffer);
  gl.disable(gl.BLEND);
  console.log("Buffer deleted");
  console.log("=== End Rendering Shape ===");
}
