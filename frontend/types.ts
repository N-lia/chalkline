
export enum AppState {
  IDLE = 'IDLE',
  EDITOR = 'EDITOR'
}

export type StickmanStyle = 'minimal' | 'bold' | 'sketchy' | 'neon' | 'cyber' | 'organic';

export interface Asset {
  id: string;
  name: string;
  author: string;
  style: StickmanStyle;
  previewColor: string;
  likes: number;
  tags: string[];
}

export interface AnimationScene {
  id: string;
  title: string;
  narrative: string;
  stickmanAction: 'pointing' | 'explaining' | 'thinking' | 'waving';
  assetId: string;
  mathContent: string;
  duration: number; // in seconds
}

export interface ProjectData {
  title: string;
  scenes: AnimationScene[];
}
