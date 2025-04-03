/**
 * WebGL context types and interfaces
 */

export interface WebGLContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  attributes: {
    position: number;
    texCoord: number;
  };
  uniforms: Record<string, WebGLUniformLocation>;
}

export interface Shape {
  id: string;
  type: "rectangle" | "ellipse" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation?: number;
  name?: string;
  zIndex?: number;
  isVisible?: boolean;
  isLocked?: boolean;
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

export interface Point {
  x: number;
  y: number;
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
  initialMousePos: { x: number; y: number } | null;
  initialShapeBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}
