export type BlendMode = 'normal'|'multiply'|'screen'|'overlay'|'add'|'darken'|'lighten';
export const BLEND_INT: Record<BlendMode, number> = {
  normal:0, multiply:1, screen:2, overlay:3, add:4, darken:5, lighten:6,
};

export type ToolId =
  | 'brush'|'pencil'|'ink'|'eraser'|'airbrush'|'marker'
  | 'bucket'|'gradient'|'eyedropper'
  | 'select-rect'|'select-ellipse'|'lasso'|'wand'|'move'|'transform'
  | 'text'|'bubble'|'panel'|'tone'|'line'|'pan';

export interface RGBA { r:number; g:number; b:number; a:number } // 0..255

export type LayerKind = 'raster'|'text'|'group';

export interface TextData {
  content:string; fontFamily:string; fontSize:number; color:string;
  bold:boolean; align:'left'|'center'|'right'; vertical:boolean; x:number; y:number;
}

export interface LayerData {
  id:string; name:string; kind:LayerKind;
  visible:boolean; opacity:number /*0..1*/; blendMode:BlendMode;
  locked:boolean; alphaLocked:boolean; clipped:boolean;
  parentId:string|null;          // group nesting (null = top level)
  text?:TextData;                // when kind==='text'
}

export interface DocumentData {
  id:string; width:number; height:number; dpi:number;
  background:'transparent'|'white';
  layers:LayerData[];            // index 0 = bottom of stack
  activeLayerId:string|null;
}

export interface BrushSettings {
  tool:ToolId; size:number; opacity:number /*0..1*/; flow:number /*0..1*/;
  hardness:number /*0..1*/; spacing:number /*0..1 of size*/; stabilize:number /*0..1*/;
  pressureSize:boolean; pressureOpacity:boolean;
}

export interface RectN { x:number; y:number; width:number; height:number } // normalized 0..1

export interface LayerDocManifest {
  version: 1;
  doc: DocumentData;
  layerImages: Record<string /*layerId*/, string /*uploads url*/>;
}
