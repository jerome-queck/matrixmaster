import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  const openMore = async (user: ReturnType<typeof userEvent.setup>) => {
    const header = screen.getAllByRole('banner')[0];
    await user.click(within(header).getByRole('button', { name: /open more menu/i }));
    const title = await screen.findByText('More', { selector: 'h2' });
    const dialog = title.closest('[role="dialog"]');
    if (!dialog) throw new Error('More dialog not found');
    return dialog as HTMLElement;
  };
  const openExportImport = async (user: ReturnType<typeof userEvent.setup>) => {
    const moreDialog = await openMore(user);
    await user.click(within(moreDialog).getByRole('button', { name: /export \/ import/i }));
  };
  const openCommandPalette = async () => {
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    let dialog = screen.queryByRole('dialog', { name: /command palette/i });
    if (!dialog) {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      dialog = await screen.findByRole('dialog', { name: /command palette/i });
    }
    return dialog as HTMLElement;
  };

  afterEach(() => {
    cleanup();
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

    const moreDialog = await openMore(user);
    await user.click(within(moreDialog).getByRole('button', { name: /advanced tools/i }));
    const toolsDialog = screen.getByRole('dialog', { name: /advanced tools/i });
    await user.click(within(toolsDialog).getByRole('button', { name: /workspace utilities/i }));
    await user.click(within(toolsDialog).getByRole('button', { name: /workspace profiles/i }));

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

  it('shows core-first controls by default and hides top-level advanced shortcuts', () => {
    setWorkerMock();
    render(<App />);

    expect(screen.getByRole('button', { name: /open more menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /calculate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open tools/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export or import/i })).not.toBeInTheDocument();
  });

  it('opens advanced tools from more menu', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    const moreDialog = await openMore(user);
    await user.click(within(moreDialog).getByRole('button', { name: /advanced tools/i }));
    const toolsDialog = screen.getByRole('dialog', { name: /advanced tools/i });
    expect(within(toolsDialog).getByRole('button', { name: /data & sharing/i })).toBeInTheDocument();
    expect(within(toolsDialog).getByRole('button', { name: /specialist math/i })).toBeInTheDocument();
  });

  it('defaults ui surface to core when no ui-surface key is stored', () => {
    setWorkerMock();
    render(<App />);

    expect(screen.queryByText('Specialist math, utilities, and study helpers.')).not.toBeInTheDocument();
  });

  it('restores advanced ui surface from storage', async () => {
    setWorkerMock();
    const storage = {
      getItem: vi.fn((key: string) => {
        if (key === 'matrix-master-ui-surface') return 'advanced';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Specialist math, utilities, and study helpers.')).toBeInTheDocument();
    });
  });

  it('keeps primary action labels correct across all core modes', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: /^calculate$/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^analysis$/i }));
    expect(screen.getByRole('button', { name: /^analyze$/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^matrix operations$/i }));
    expect(screen.getByRole('button', { name: /^calculate$/i })).toBeInTheDocument();
  });

  it('switches between all four top-level routes from primary navigation', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    const systemSolverRoute = screen.getByRole('button', { name: /^system solver$/i });
    const matrixOperationsRoute = screen.getByRole('button', { name: /^matrix operations$/i });
    const analysisRoute = screen.getByRole('button', { name: /^analysis$/i });
    const libraryRoute = screen.getByRole('button', { name: /^library$/i });

    expect(systemSolverRoute.className).toContain('active');
    expect(screen.getByRole('button', { name: /^calculate$/i })).toBeInTheDocument();

    await user.click(matrixOperationsRoute);
    expect(matrixOperationsRoute.className).toContain('active');
    expect(screen.getByRole('button', { name: /^calculate$/i })).toBeInTheDocument();

    await user.click(analysisRoute);
    expect(analysisRoute.className).toContain('active');
    expect(screen.getByRole('button', { name: /^analyze$/i })).toBeInTheDocument();

    await user.click(libraryRoute);
    expect(libraryRoute.className).toContain('active');
    expect(screen.getByLabelText(/load target/i)).toBeInTheDocument();

    await user.click(systemSolverRoute);
    expect(systemSolverRoute.className).toContain('active');
    expect(screen.getByRole('button', { name: /^calculate$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/load target/i)).not.toBeInTheDocument();
  });

  it('opens command palette via Cmd/Ctrl+K and runs a route command', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    const commandPalette = await openCommandPalette();
    const paletteScope = within(commandPalette);

    expect(paletteScope.getByRole('button', { name: /go to system solver/i })).toBeInTheDocument();
    expect(paletteScope.getByRole('button', { name: /go to matrix operations/i })).toBeInTheDocument();
    expect(paletteScope.getByRole('button', { name: /go to analysis/i })).toBeInTheDocument();
    expect(paletteScope.getByRole('button', { name: /go to library/i })).toBeInTheDocument();

    await user.type(paletteScope.getByPlaceholderText(/type a command/i), 'library');
    await user.click(paletteScope.getByRole('button', { name: /go to library/i }));

    const libraryRoute = screen.getByRole('button', { name: /^library$/i });
    expect(libraryRoute.className).toContain('active');
    expect(screen.getByLabelText(/load target/i)).toBeInTheDocument();
  });

  it('opens exact algebra studio from the analysis discovery panel route entry', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^analysis$/i }));
    expect(screen.getByText(/analyze workflows/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /exact spaces and maps/i }));
    expect(screen.getByRole('dialog', { name: /exact algebra studio/i })).toBeInTheDocument();
  });

  it('publishes an input-required placeholder when analyze matrix-properties route lacks matrix input', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^analysis$/i }));
    await user.click(screen.getByRole('button', { name: /matrix properties/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/status: input required/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/decomposition overview/i).length).toBeGreaterThan(0);
    });
  });

  it('exposes analyze route-discovery commands in command palette and executes matrix functions route', async () => {
    setWorkerMock();
    const user = userEvent.setup();
    render(<App />);

    const commandPalette = await openCommandPalette();
    const paletteScope = within(commandPalette);

    expect(paletteScope.getByRole('button', { name: /open exact algebra studio/i })).toBeInTheDocument();
    expect(paletteScope.getByRole('button', { name: /open matrix functions/i })).toBeInTheDocument();

    await user.type(paletteScope.getByPlaceholderText(/type a command/i), 'matrix functions');
    await user.click(paletteScope.getByRole('button', { name: /open matrix functions/i }));

    expect(screen.getByRole('dialog', { name: /matrix functions/i })).toBeInTheDocument();
  });
});
