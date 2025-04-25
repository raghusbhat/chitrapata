import { WebGLContext } from "./types";

/**
 * Vertex shader for 2D shapes
 */
const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  in vec2 a_texCoord;
  
  uniform vec2 u_resolution;
  uniform mat4 u_modelViewMatrix;
  
  out vec2 v_texCoord;
  
  void main() {
    // Apply model-view transformation
    vec4 position = u_modelViewMatrix * vec4(a_position, 0, 1);
    
    // Convert from pixels to clip space, accounting for device pixel ratio
    vec2 zeroToOne = position.xy / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
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
    if (u_shapeType == 0) { // Rectangle
      // Calculate distance from edges
      float distFromEdgeX = min(v_texCoord.x, 1.0 - v_texCoord.x);
      float distFromEdgeY = min(v_texCoord.y, 1.0 - v_texCoord.y);
      float distFromEdge = min(distFromEdgeX, distFromEdgeY);
      
      // For stroke
      float strokeStart = u_strokeWidth;
      float strokeEnd = u_strokeWidth + u_smoothing;
      
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
      
      // For stroke
      float strokeStart = 1.0 - u_strokeWidth;
      float strokeEnd = strokeStart + u_smoothing;
      
      if (dist > strokeStart) {
        float strokeAlpha = 1.0 - smoothstep(strokeStart, strokeEnd, dist);
        outColor = mix(vec4(0.0), u_strokeColor, strokeAlpha);
      } else {
        float alpha = 1.0 - smoothstep(1.0 - u_smoothing, 1.0, dist);
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
  console.log("Creating WebGL context for canvas:", canvas);

  // Create WebGL2 context with alpha disabled to prevent blending issues with white colors
  const gl = canvas.getContext("webgl2", {
    alpha: false, // Disabling alpha channel in the context
    premultipliedAlpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });

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
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    modelViewMatrix: gl.getUniformLocation(program, "u_modelViewMatrix"),
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
