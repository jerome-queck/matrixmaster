declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      onUpdateStatus?: (callback: (payload: any) => void) => () => void;
      onHealthStatus?: (callback: (payload: any) => void) => () => void;
      healthCheck?: () => Promise<{ isPackaged: boolean; appPath: string; indexPath: string; indexExists: boolean }>;
      checkForUpdates?: () => Promise<void>;
      downloadUpdate?: () => Promise<void>;
      installUpdate?: () => Promise<void>;
    };
  }
}

export {};
