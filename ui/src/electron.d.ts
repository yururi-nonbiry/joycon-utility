interface Window {
  electron: {
    executeShortcut: (shortcut: string) => void;
    setVolume: (volume: number) => void;
    onActiveWindowChange: (callback: (appName: string) => void) => void;
  };
}
