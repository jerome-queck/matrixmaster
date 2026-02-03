declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      onUpdateStatus?: (callback: (payload: any) => void) => () => void;
      checkForUpdates?: () => Promise<void>;
      downloadUpdate?: () => Promise<void>;
      installUpdate?: () => Promise<void>;
    };
  }
}

export {};
