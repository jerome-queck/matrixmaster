import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import App from '../../App';

const originalClipboard = navigator.clipboard;
const originalStorage = window.localStorage;
const originalWorker = (globalThis as any).Worker;
const restoreClipboard = () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: originalClipboard,
    configurable: true,
  });
};

describe('App integration', () => {
  const setWorkerMock = () => {
    (globalThis as any).Worker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage() {}
      terminate() {}
    };
  };

  afterEach(() => {
    vi.restoreAllMocks();
    restoreClipboard();
    Object.defineProperty(window, 'localStorage', {
      value: originalStorage,
      configurable: true,
    });
    (globalThis as any).Worker = originalWorker;
  });

  it('shows a toast when storage writes fail', async () => {
    setWorkerMock();
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Local storage unavailable. Changes won’t persist.')).toBeInTheDocument();
    });
  });

  it('shows a toast when clipboard paste fails', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    setWorkerMock();

    render(<App />);

    const pasteButtons = screen.getAllByRole('button', { name: /paste from clipboard/i });
    await user.click(pasteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Clipboard unavailable. Unable to paste.').length).toBeGreaterThan(0);
    });
  });
});
