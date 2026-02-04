import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  const openTools = async (user: ReturnType<typeof userEvent.setup>) => {
    const header = screen.getAllByRole('banner')[0];
    await user.click(within(header).getByRole('button', { name: /open tools/i }));
  };
  const openExportImport = async (user: ReturnType<typeof userEvent.setup>) => {
    const header = screen.getAllByRole('banner')[0];
    await user.click(within(header).getByRole('button', { name: /export or import/i }));
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

  it('falls back to default profile when stored profiles are invalid', async () => {
    setWorkerMock();
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === 'matrix-master-profiles') return '{bad json';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    const user = userEvent.setup();
    render(<App />);

    await openTools(user);
    const toolsDialog = screen.getByRole('dialog', { name: /tools/i });
    const profilesButtons = within(toolsDialog).getAllByRole('button', { name: /workspace profiles/i });
    await user.click(profilesButtons[0]);

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows copy-to-clipboard controls in export modal', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    await openExportImport(user);
    const copySection = await screen.findByText('Copy to Clipboard');
    const dialog = copySection.closest('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const { getByRole } = within(dialog as HTMLElement);
    expect(getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });
});
