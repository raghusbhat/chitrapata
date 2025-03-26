import { WebGLContext } from "./types";

/**
 * Vertex shader for 2D shapes
 */
const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  in vec2 a_texCoord;
  
  uniform vec2 u_resolution;
  
  out vec2 v_texCoord;
  
  void main() {
    // Convert from pixels to clip space
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
    
    // Flip Y coordinate
    clipSpace.y = -clipSpace.y;
    
    gl_Position = vec4(clipSpace, 0, 1);
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
    // Different rendering based on shape type
    if (u_shapeType == 0) { // Rectangle
      // For rectangles, calculate distance from edges
      float distFromEdgeX = min(v_texCoord.x, 1.0 - v_texCoord.x);
      float distFromEdgeY = min(v_texCoord.y, 1.0 - v_texCoord.y);
      float distFromEdge = min(distFromEdgeX, distFromEdgeY);
      
      // Apply border with smooth transition
      if (distFromEdge < u_strokeWidth) {
        // In the border region
        float borderFactor = distFromEdge / u_strokeWidth;
        // Smooth transition from stroke to fill
        float smoothBorder = smoothstep(0.0, u_smoothing, borderFactor);
        outColor = mix(u_strokeColor, u_fillColor, smoothBorder);
      } else {
        // Inside the fill region
        outColor = u_fillColor;
      }
    } 
    else if (u_shapeType == 1) { // Ellipse
      // For ellipses, use distance from center
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(v_texCoord, center);
      
      // Calculate distance from edge (0.5 is the normalized radius)
      float edgeDistance = 0.5 - dist;
      
      // Apply edge smoothing for the outer edge
      float alpha = smoothstep(-u_smoothing, 0.0, edgeDistance);
      
      // Determine if we're in the stroke region
      float strokeEdge = u_strokeWidth;
      float fillFactor = smoothstep(strokeEdge - u_smoothing, strokeEdge, edgeDistance);
      
      // Mix fill and stroke colors
      outColor = mix(u_strokeColor, u_fillColor, fillFactor);
      
      // Apply alpha for edge smoothing
      outColor.a *= alpha;
    }
    else { // Line or other
      outColor = u_strokeColor;
    }
  }
`;

/**
 * Creates and initializes WebGL context with shaders
 */
export function createWebGLContext(canvas: HTMLCanvasElement): WebGLContext {
  console.log("Creating WebGL context for canvas:", canvas);
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("WebGL2 not supported");
  }

  // Create shader program
  const program = createProgram(gl);
  if (!program) {
    throw new Error("Failed to create shader program");
  }

  // Get attribute locations
  const attributes = {
    position: gl.getAttribLocation(program, "a_position"),
    texCoord: gl.getAttribLocation(program, "a_texCoord"),
  };

  console.log("Attribute locations:", attributes);

  // Use program before getting uniform locations
  gl.useProgram(program);

  // Get uniform locations
  const uniforms: Record<string, WebGLUniformLocation | null> = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
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

  // Cast all uniforms to non-null after checking
  const safeUniforms = Object.fromEntries(
    Object.entries(uniforms).map(([key, val]) => [key, val!])
  ) as Record<string, WebGLUniformLocation>;

  console.log("Uniform locations:", safeUniforms);

  return { gl, program, attributes, uniforms: safeUniforms };
}

/**
 * Creates and compiles shader program
 */
function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  console.log("Creating shader program");
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      "Failed to link shader program:",
      gl.getProgramInfoLog(program)
    );
    return null;
  }

  console.log("Shader program created successfully");
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
  console.log(
    `Compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader`
  );
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    return null;
  }

  console.log("Shader compiled successfully");
  return shader;
}
