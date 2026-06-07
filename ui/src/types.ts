// スティック設定の型定義
export interface StickConfig {
  mode: 'none' | 'mouse' | '8way' | 'dial';
  sensitivity?: number;
  mappings?: { [dir: string]: string };
  dials?: {
    [dir: string]: {
      increase?: string;
      decrease?: string;
    };
  };
}

// マッピング全体の型定義
export type Mapping = { [key: string]: string | StickConfig };

// Joy-Conデバイスの型定義
export interface JoyConDevice {
  id: string;
  type: 'L' | 'R';
  battery: number;
  buttons?: { [key: string]: boolean };
}
