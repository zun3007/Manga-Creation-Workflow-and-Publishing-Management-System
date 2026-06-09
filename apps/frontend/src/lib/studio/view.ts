export interface View {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number /* rad */;
}

export interface Pt {
  x: number;
  y: number;
}

export function makeView(v: Partial<View>): View {
  return { zoom: 1, panX: 0, panY: 0, rotation: 0, ...v };
}

/** screen point -> document pixel coords (inverse of zoom*R + pan). */
export function screenToDoc(v: View, s: Pt): Pt {
  const dx = s.x - v.panX;
  const dy = s.y - v.panY;
  const c = Math.cos(-v.rotation);
  const sn = Math.sin(-v.rotation);
  const rx = dx * c - dy * sn;
  const ry = dx * sn + dy * c;
  return { x: rx / v.zoom, y: ry / v.zoom };
}

/** document pixel coords -> screen point. */
export function docToScreen(v: View, d: Pt): Pt {
  const zx = d.x * v.zoom;
  const zy = d.y * v.zoom;
  const c = Math.cos(v.rotation);
  const sn = Math.sin(v.rotation);
  return { x: zx * c - zy * sn + v.panX, y: zx * sn + zy * c + v.panY };
}
