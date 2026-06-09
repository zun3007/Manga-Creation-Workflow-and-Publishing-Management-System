export type Affine = [number,number,number,number,number,number]; // m00,m01,m10,m11,tx,ty
export interface TransformOpts { tx?:number; ty?:number; scaleX?:number; scaleY?:number; rotation?:number; originX?:number; originY?:number }
export function composeAffine(o: TransformOpts): Affine {
  const { tx=0, ty=0, scaleX=1, scaleY=1, rotation=0, originX=0, originY=0 } = o;
  const c=Math.cos(rotation), s=Math.sin(rotation);
  const m00=c*scaleX, m01=-s*scaleY, m10=s*scaleX, m11=c*scaleY;
  // keep `origin` fixed under the linear part, then translate
  const ox = originX - (m00*originX + m01*originY);
  const oy = originY - (m10*originX + m11*originY);
  // normalize -0 to 0
  const res: Affine = [m00, m01, m10, m11, tx+ox, ty+oy];
  for (let i = 0; i < res.length; i++) if (res[i] === 0) res[i] = 0;
  return res;
}
export function applyAffine(m: Affine, x:number, y:number) { return { x: m[0]*x + m[1]*y + m[4], y: m[2]*x + m[3]*y + m[5] }; }
