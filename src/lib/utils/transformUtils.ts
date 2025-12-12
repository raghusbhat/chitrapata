import { Shape } from "../webgl/types";

/**
 * Calculate absolute transform for a shape that has a parent frame
 * Handles rotation matrix transformation for rotated parent frames
 */
export function calculateAbsoluteTransform(
  shape: Shape,
  parentFrame: Shape | undefined
): Shape {
  if (!shape.parentId || !parentFrame) {
    return shape;
  }

  const frameX = parentFrame.absoluteTransform?.x ?? parentFrame.x;
  const frameY = parentFrame.absoluteTransform?.y ?? parentFrame.y;
  const frameRotation = parentFrame.absoluteTransform?.rotation ?? parentFrame.rotation ?? 0;

  let absoluteX, absoluteY;

  if (frameRotation !== 0) {
    // Apply rotation matrix to child's local position
    const rotRad = (frameRotation * Math.PI) / 180;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    const rotatedLocalX = shape.x * cos - shape.y * sin;
    const rotatedLocalY = shape.x * sin + shape.y * cos;
    absoluteX = frameX + rotatedLocalX;
    absoluteY = frameY + rotatedLocalY;
  } else {
    absoluteX = frameX + shape.x;
    absoluteY = frameY + shape.y;
  }

  return {
    ...shape,
    absoluteTransform: {
      x: absoluteX,
      y: absoluteY,
      rotation: frameRotation + (shape.rotation ?? 0),
      scale: 1
    }
  };
}
