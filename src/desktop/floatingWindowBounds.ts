export type Point = {
  x: number;
  y: number;
};

export type Rect = Point & {
  width: number;
  height: number;
};

export function createFloatingWindowBounds(workArea: Rect, cursorPoint: Point, currentBounds: Rect, margin = 14): Rect {
  const preferredX = cursorPoint.x + margin;
  const preferredY = cursorPoint.y + margin;
  const maxX = workArea.x + workArea.width;
  const maxY = workArea.y + workArea.height;

  return {
    x:
      preferredX + currentBounds.width > maxX
        ? Math.max(workArea.x + margin, cursorPoint.x - currentBounds.width - margin)
        : Math.max(workArea.x + margin, preferredX),
    y:
      preferredY + currentBounds.height > maxY
        ? Math.max(workArea.y + margin, cursorPoint.y - currentBounds.height - margin)
        : Math.max(workArea.y + margin, preferredY),
    width: currentBounds.width,
    height: currentBounds.height
  };
}
