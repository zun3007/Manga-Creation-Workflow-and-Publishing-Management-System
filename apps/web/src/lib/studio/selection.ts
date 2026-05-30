export function rectMask(w:number,h:number,x0:number,y0:number,x1:number,y1:number): Uint8Array {
  const m = new Uint8Array(w*h);
  const ax=Math.max(0,Math.min(x0,x1)|0), bx=Math.min(w-1,Math.max(x0,x1)|0);
  const ay=Math.max(0,Math.min(y0,y1)|0), by=Math.min(h-1,Math.max(y0,y1)|0);
  for (let y=ay;y<=by;y++) for (let x=ax;x<=bx;x++) m[y*w+x]=255;
  return m;
}

export function ellipseMask(w:number,h:number,x0:number,y0:number,x1:number,y1:number): Uint8Array {
  const m=new Uint8Array(w*h); const cx=(x0+x1)/2, cy=(y0+y1)/2;
  const rx=Math.abs(x1-x0)/2||0.5, ry=Math.abs(y1-y0)/2||0.5;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){ const nx=(x-cx)/rx, ny=(y-cy)/ry; if (nx*nx+ny*ny<=1) m[y*w+x]=255; }
  return m;
}

export function pointInPolygon(px:number,py:number,poly:{x:number;y:number}[]): boolean {
  let inside=false;
  for (let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const hit=((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi);
    if (hit) inside=!inside;
  }
  return inside;
}

export function lassoMask(w:number,h:number,poly:{x:number;y:number}[]): Uint8Array {
  const m=new Uint8Array(w*h); if (poly.length<3) return m;
  let minx=w,miny=h,maxx=0,maxy=0;
  for (const p of poly){ minx=Math.min(minx,p.x); miny=Math.min(miny,p.y); maxx=Math.max(maxx,p.x); maxy=Math.max(maxy,p.y); }
  for (let y=Math.max(0,miny|0);y<=Math.min(h-1,maxy|0);y++)
    for (let x=Math.max(0,minx|0);x<=Math.min(w-1,maxx|0);x++)
      if (pointInPolygon(x+0.5,y+0.5,poly)) m[y*w+x]=255;
  return m;
}

export function wandMask(buf:Uint8ClampedArray,w:number,h:number,sx:number,sy:number,tol:number): Uint8Array {
  const m=new Uint8Array(w*h); if (sx<0||sy<0||sx>=w||sy>=h) return m;
  const si=(sy*w+sx)*4; const sr=buf[si],sg=buf[si+1],sb=buf[si+2],sa=buf[si+3]; const t2=tol*tol*4;
  const st:number[]=[sy*w+sx]; const seen=new Uint8Array(w*h);
  while (st.length){ const idx=st.pop()!; if (seen[idx]) continue; seen[idx]=1;
    const o=idx*4; const dr=buf[o]-sr,dg=buf[o+1]-sg,db=buf[o+2]-sb,da=buf[o+3]-sa;
    if (dr*dr+dg*dg+db*db+da*da>t2) continue; m[idx]=255;
    const cx=idx%w, cy=(idx/w)|0;
    if (cx>0) st.push(idx-1); if (cx<w-1) st.push(idx+1); if (cy>0) st.push(idx-w); if (cy<h-1) st.push(idx+w);
  }
  return m;
}
