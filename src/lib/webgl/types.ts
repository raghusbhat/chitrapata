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
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number;
  zIndex: number;
  isVisible: boolean;
  isLocked: boolean;
  name?: string;

  // Hierarchy properties
  parentId?: string; // ID of parent container (frame or group)
  childIds: string[]; // IDs of child shapes
  isContainer: boolean; // Whether this shape can contain other shapes

  // Frame-specific properties
  clipContent?: boolean; // Whether to clip content that overflows the frame's boundaries
  constraints?: Constraints; // Used by frames to define child positioning behavior

  // Group-specific properties
  autoResize?: boolean; // Whether the group auto-adjusts its size based on children

  // Render properties
  absoluteTransform?: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
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
