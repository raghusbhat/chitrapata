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
  currentScale?: number; // Current canvas zoom level
}

export type ShapeType = "rectangle" | "ellipse" | "line" | "frame" | "group";

export type ResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | "rotate";

export type ConstraintType =
  | "left"
  | "right"
  | "center"
  | "top"
  | "bottom"
  | "middle"
  | "scale";

export interface Constraints {
  horizontal: ConstraintType;
  vertical: ConstraintType;
  fixed?: boolean;
}

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  isVisible?: boolean;
  isLocked?: boolean;
  isContainer?: boolean;
  clipContent?: boolean;
  name?: string;
  zIndex?: number;
  autoResize?: boolean;
  parentId?: string;
  childIds?: string[];
  absoluteTransform?: {
    x: number;
    y: number;
    rotation: number;
  };
  scaleStrokeWidth?: boolean; // Controls whether stroke width scales with resize
  borderRadius?: number; // Rounded corners for rectangles
  shadow?: {
    enabled: boolean;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  };
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

export interface Shadow {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}
