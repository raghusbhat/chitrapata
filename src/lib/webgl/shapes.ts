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
  const { program, attributes, uniforms } = context;
  const {
    x,
    y,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
    rotation = 0,
  } = shape;

  // Create model-view matrix
  const modelViewMatrix = mat4.create();

  // Translate to shape's position
  mat4.translate(modelViewMatrix, modelViewMatrix, [
    x + width / 2,
    y + height / 2,
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
    -(x + width / 2),
    -(y + height / 2),
    0,
  ]);

  // Set uniforms
  gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
  gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, modelViewMatrix);
  gl.uniform4f(
    uniforms.fillColor,
    parseInt(fill.slice(1, 3), 16) / 255,
    parseInt(fill.slice(3, 5), 16) / 255,
    parseInt(fill.slice(5, 7), 16) / 255,
    1.0
  );
  gl.uniform4f(
    uniforms.strokeColor,
    parseInt(stroke.slice(1, 3), 16) / 255,
    parseInt(stroke.slice(3, 5), 16) / 255,
    parseInt(stroke.slice(5, 7), 16) / 255,
    1.0
  );
  gl.uniform1f(uniforms.strokeWidth, strokeWidth / Math.min(width, height));
  gl.uniform1f(uniforms.smoothing, 1.0 / Math.min(width, height));

  // Create vertex buffer
  const vertices = new Float32Array([
    x,
    y,
    x + width,
    y,
    x,
    y + height,
    x + width,
    y + height,
  ]);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Set up vertex attributes
  gl.enableVertexAttribArray(attributes.position);
  gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 0, 0);

  // Create texture coordinate buffer
  const texCoords = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  // Set up texture coordinate attribute
  gl.enableVertexAttribArray(attributes.texCoord);
  gl.vertexAttribPointer(attributes.texCoord, 2, gl.FLOAT, false, 0, 0);

  // Set shape type
  gl.uniform1i(
    uniforms.shapeType,
    shape.type === "rectangle" ? 0 : shape.type === "ellipse" ? 1 : 2
  );

  // Draw the shape
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Clean up
  gl.deleteBuffer(vertexBuffer);
  gl.deleteBuffer(texCoordBuffer);
}
