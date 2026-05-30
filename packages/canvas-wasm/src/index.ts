
export type WasmSource = BufferSource | URL | string | Response | Promise<Response>;

interface Exports {
  memory: WebAssembly.Memory;
  alloc(size:number):number; free(ptr:number):void;
  floodFill(ptr:number,w:number,h:number,x:number,y:number,r:number,g:number,b:number,a:number,tol:number):number;
  composite(dst:number,src:number,w:number,h:number,opacity:number,mode:number):void;
  brushStamp(ptr:number,w:number,h:number,cx:number,cy:number,radius:number,hardness:number,r:number,g:number,b:number,a:number,flow:number):void;
  halftone(ptr:number,w:number,h:number,cell:number,angleDeg:number,r:number,g:number,b:number):void;
  transformResample(src:number,sw:number,sh:number,dst:number,dw:number,dh:number,m00:number,m01:number,m10:number,m11:number,tx:number,ty:number):void;
}
export interface RGBA { r:number; g:number; b:number; a:number }

async function toBytes(src: WasmSource): Promise<BufferSource> {
  if (src instanceof ArrayBuffer || ArrayBuffer.isView(src)) return src as BufferSource;
  // Response or fetch URL
  const res = src instanceof Response || (src as any)?.then ? await (src as Promise<Response>)
            : await fetch(src as URL | string);
  return await (res as Response).arrayBuffer();
}

export class InkforgeWasm {
  private ex: Exports;
  private constructor(ex: Exports) { this.ex = ex; }

  static async load(source?: WasmSource): Promise<InkforgeWasm> {
    const src = source ?? new URL('./inkforge.wasm', import.meta.url);
    const bytes = await toBytes(src);
    const { instance } = await WebAssembly.instantiate(bytes, {});
    return new InkforgeWasm(instance.exports as unknown as Exports);
  }

  /** Copy a JS pixel buffer into wasm, run fn(ptr), copy back. */
  private withBuf(px: Uint8ClampedArray, fn: (ptr:number)=>void): void {
    const ptr = this.ex.alloc(px.length);
    new Uint8ClampedArray(this.ex.memory.buffer, ptr, px.length).set(px);
    fn(ptr);
    px.set(new Uint8ClampedArray(this.ex.memory.buffer, ptr, px.length));
    this.ex.free(ptr);
  }

  floodFill(px:Uint8ClampedArray, w:number, h:number, x:number, y:number, c:RGBA, tol:number): number {
    let filled = 0;
    this.withBuf(px, (ptr)=>{ filled = this.ex.floodFill(ptr,w,h,x,y,c.r,c.g,c.b,c.a,tol); });
    return filled;
  }
  composite(dst:Uint8ClampedArray, src:Uint8ClampedArray, w:number, h:number, opacity:number, mode:number): void {
    const dp = this.ex.alloc(dst.length), spr = this.ex.alloc(src.length);
    new Uint8ClampedArray(this.ex.memory.buffer, dp, dst.length).set(dst);
    new Uint8ClampedArray(this.ex.memory.buffer, spr, src.length).set(src);
    this.ex.composite(dp, spr, w, h, opacity, mode);
    dst.set(new Uint8ClampedArray(this.ex.memory.buffer, dp, dst.length));
    this.ex.free(dp); this.ex.free(spr);
  }
  brushStamp(px:Uint8ClampedArray, w:number, h:number, cx:number, cy:number, radius:number, hardness:number, c:RGBA, flow:number): void {
    this.withBuf(px, (ptr)=> this.ex.brushStamp(ptr,w,h,cx,cy,radius,hardness,c.r,c.g,c.b,c.a,flow));
  }
  halftone(px:Uint8ClampedArray, w:number, h:number, cell:number, angleDeg:number, c:{r:number;g:number;b:number}): void {
    this.withBuf(px, (ptr)=> this.ex.halftone(ptr,w,h,cell,angleDeg,c.r,c.g,c.b));
  }
  transform(src:Uint8ClampedArray, sw:number, sh:number, dw:number, dh:number, m:[number,number,number,number,number,number]): Uint8ClampedArray {
    const out = new Uint8ClampedArray(dw*dh*4);
    const sp = this.ex.alloc(src.length), dp = this.ex.alloc(out.length);
    new Uint8ClampedArray(this.ex.memory.buffer, sp, src.length).set(src);
    new Uint8ClampedArray(this.ex.memory.buffer, dp, out.length).fill(0);
    this.ex.transformResample(sp,sw,sh,dp,dw,dh,m[0],m[1],m[2],m[3],m[4],m[5]);
    out.set(new Uint8ClampedArray(this.ex.memory.buffer, dp, out.length));
    this.ex.free(sp); this.ex.free(dp);
    return out;
  }
}
