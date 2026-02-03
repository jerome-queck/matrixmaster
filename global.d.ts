declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => string;
      openExternal: (url: string) => Promise<void>;
    };
  }
}

export {};
