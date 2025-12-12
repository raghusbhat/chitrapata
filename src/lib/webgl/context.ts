import { WebGLContext } from "./types";

/**
 * Vertex shader for 2D shapes
 */
const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

uniform vec2 u_resolution;
uniform mat4 u_modelViewMatrix;
uniform mat4 u_cameraMatrix;

out vec2 v_texCoord;

void main() {
  // Apply model-view transformation
  vec4 mvPosition = u_modelViewMatrix * vec4(a_position, 0.0, 1.0);
  // Apply camera (pan & zoom)
  vec4 position = u_cameraMatrix * mvPosition;

  // Convert from pixels to clip space, accounting for device pixel ratio
  vec2 zeroToOne = position.xy / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  // Flip Y coordinate
  clipSpace.y = -clipSpace.y;

  gl_Position = vec4(clipSpace, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

/**
 * Fragment shader for 2D shapes with smart shape rendering
 */
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform vec4 u_fillColor;
uniform vec4 u_strokeColor;
uniform float u_strokeWidth;
uniform float u_smoothing;
uniform int u_shapeType; // 0=rectangle, 1=ellipse, 2=line

out vec4 outColor;

void main() {
  if (u_shapeType == 0) { // Rectangle
    // Calculate distance from edges
    float distFromEdgeX = min(v_texCoord.x, 1.0 - v_texCoord.x);
    float distFromEdgeY = min(v_texCoord.y, 1.0 - v_texCoord.y);
    float distFromEdge = min(distFromEdgeX, distFromEdgeY);

    // For stroke - ensure strokeEnd > strokeStart to avoid undefined smoothstep
    float strokeStart = u_strokeWidth;
    float strokeEnd = u_strokeWidth + max(u_smoothing, 0.001);

    // If we're within the stroke width
    if (distFromEdge < strokeEnd) {
      float strokeAlpha = 1.0 - smoothstep(strokeStart, strokeEnd, distFromEdge);
      outColor = mix(u_fillColor, u_strokeColor, strokeAlpha);
    } else {
      // Inside the shape, use fill color with its original alpha
      outColor = u_fillColor;
    }
  }
  else if (u_shapeType == 1) { // Ellipse
    vec2 center = vec2(0.5, 0.5);
    float dist = length(v_texCoord - center) * 2.0;

    // For stroke - ensure strokeEnd > strokeStart to avoid undefined smoothstep
    float strokeStart = 1.0 - u_strokeWidth;
    float strokeEnd = strokeStart + max(u_smoothing, 0.001);

    if (dist > strokeStart) {
      float strokeAlpha = 1.0 - smoothstep(strokeStart, strokeEnd, dist);
      outColor = mix(vec4(0.0), u_strokeColor, strokeAlpha);
    } else {
      float alpha = 1.0 - smoothstep(1.0 - max(u_smoothing, 0.001), 1.0, dist);
      // Use fill color with its original alpha
      outColor = u_fillColor;
    }
  }
  else { // Line
    outColor = u_strokeColor;
  }
}
`;

/**
 * Creates and initializes WebGL context with shaders
 */
export function createWebGLContext(canvas: HTMLCanvasElement): WebGLContext {
  console.log("🔵 [WebGL] Starting initialization...");

  // Create WebGL2 context with alpha disabled to prevent blending issues with white colors
  const gl = canvas.getContext("webgl2", {
    alpha: false, // Disabling alpha channel in the context
    premultipliedAlpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    console.error("❌ [WebGL] WebGL2 not supported by browser");
    throw new Error("WebGL2 not supported");
  }

  console.log("✅ [WebGL] WebGL2 context created");
  console.log("📊 [WebGL] Renderer:", gl.getParameter(gl.RENDERER));
  console.log("📊 [WebGL] Vendor:", gl.getParameter(gl.VENDOR));
  console.log("📊 [WebGL] Version:", gl.getParameter(gl.VERSION));
  console.log("📊 [WebGL] GLSL Version:", gl.getParameter(gl.SHADING_LANGUAGE_VERSION));

  // Create shader program
  console.log("🔵 [WebGL] Creating shader program...");
  const program = createProgram(gl);
  if (!program) {
    console.error("❌ [WebGL] Failed to create shader program");
    throw new Error("Failed to create shader program");
  }

  console.log("✅ [WebGL] Shader program created successfully");

  // Get attribute locations
  const attributes = {
    position: gl.getAttribLocation(program, "a_position"),
    texCoord: gl.getAttribLocation(program, "a_texCoord"),
  };

  // Use program before getting uniform locations
  gl.useProgram(program);

  // Get uniform locations
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    modelViewMatrix: gl.getUniformLocation(program, "u_modelViewMatrix"),
    cameraMatrix: gl.getUniformLocation(program, "u_cameraMatrix"),
    fillColor: gl.getUniformLocation(program, "u_fillColor"),
    strokeColor: gl.getUniformLocation(program, "u_strokeColor"),
    strokeWidth: gl.getUniformLocation(program, "u_strokeWidth"),
    smoothing: gl.getUniformLocation(program, "u_smoothing"),
    shapeType: gl.getUniformLocation(program, "u_shapeType"),
  };

  // Check if any uniforms are missing
  const missingUniforms = Object.entries(uniforms)
    .filter(([_, location]) => location === null)
    .map(([name]) => name);

  if (missingUniforms.length > 0) {
    throw new Error(`Missing uniform locations: ${missingUniforms.join(", ")}`);
  }

  return {
    gl,
    program,
    attributes,
    uniforms: uniforms as Record<string, WebGLUniformLocation>,
  };
}

/**
 * Creates and compiles shader program
 */
function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  console.log("🔵 [WebGL] Compiling vertex shader...");
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

  console.log("🔵 [WebGL] Compiling fragment shader...");
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  if (!vertexShader || !fragmentShader) {
    console.error("❌ [WebGL] Shader compilation failed");
    return null;
  }

  console.log("✅ [WebGL] Both shaders compiled successfully");

  const program = gl.createProgram();
  if (!program) {
    console.error("❌ [WebGL] Failed to create program object");
    return null;
  }

  console.log("🔵 [WebGL] Linking shader program...");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const linkError = gl.getProgramInfoLog(program);
    console.error("❌ [WebGL] Failed to link shader program:", linkError);
    return null;
  }

  console.log("✅ [WebGL] Shader program linked successfully");
  return program;
}

/**
 * Compiles a shader from source
 */
function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shaderTypeName = type === gl.VERTEX_SHADER ? "vertex" : "fragment";

  const shader = gl.createShader(type);
  if (!shader) {
    console.error(`❌ [WebGL] Failed to create ${shaderTypeName} shader object`);
    return null;
  }

  console.log(`🔵 [WebGL] Setting ${shaderTypeName} shader source (${source.length} chars)`);
  gl.shaderSource(shader, source);

  console.log(`🔵 [WebGL] Compiling ${shaderTypeName} shader...`);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const errorLog = gl.getShaderInfoLog(shader);

    console.error(`❌ [WebGL] ${shaderTypeName} shader compilation FAILED`);
    console.error(`📋 [WebGL] Error log: "${errorLog || '(empty)'}"`);
    console.error(`📋 [WebGL] Shader source (first 200 chars):\n${source.substring(0, 200)}`);
    console.error(`📋 [WebGL] First line char codes: [${source.split('\n')[0].split('').map(c => c.charCodeAt(0)).join(', ')}]`);

    gl.deleteShader(shader);
    return null;
  }

  console.log(`✅ [WebGL] ${shaderTypeName} shader compiled successfully`);
  return shader;
}
