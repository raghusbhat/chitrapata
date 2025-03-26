/**
 * WebGL context types and interfaces
 */

export interface WebGLContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation>;
}

export interface Shape {
  id: string;
  type: "rectangle" | "ellipse" | "line" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface TransformHandle {
  type: "scale" | "rotate" | "move";
  position: { x: number; y: number };
  size: number;
}

export interface CanvasState {
  selectedShape: Shape | null;
  isDrawing: boolean;
  zoom: number;
  pan: { x: number; y: number };
  shapes: Shape[];
}

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "rotate";

export interface SelectionState {
  selectedShapeId: string | null;
  activeHandle: ResizeHandle | null;
  initialMousePosition: { x: number; y: number } | null;
  initialShapeBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}
