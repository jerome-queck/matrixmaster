import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMatrixWorker } from '../../hooks/useMatrixWorker';
import { parseInput } from '../../services/matrixService';
import type { MatrixWorkerRequest } from '../../types';

let lastWorker: any = null;

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    lastWorker = this;
  }
}

const makeMatrix = () => [[parseInput('1')]];

const HookHarness: React.FC<{ onReady: (api: ReturnType<typeof useMatrixWorker>) => void }> = ({ onReady }) => {
  const api = useMatrixWorker();
  React.useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
};

describe('useMatrixWorker', () => {
  it('coalesces duplicate requests', async () => {
    vi.stubGlobal('Worker', MockWorker as any);
    let api: ReturnType<typeof useMatrixWorker> | null = null;
    render(<HookHarness onReady={(next) => { api = next; }} />);
    const payload: MatrixWorkerRequest['payload'] = { matrix: makeMatrix(), analysisMode: 'numeric', analysisOptions: { computeLU: true, computeQR: false, computeSVD: false, computeEigen: false } };
    const promiseA = api!.runWorkerRequest('analysis', payload, 'calculate');
    const promiseB = api!.runWorkerRequest('analysis', payload, 'calculate');

    expect(lastWorker.postMessage).toHaveBeenCalledTimes(1);
    const sent = lastWorker.postMessage.mock.calls[0][0];
    lastWorker.onmessage?.({ data: { id: sent.id, ok: true, result: { kind: 'analysis', mode: 'numeric', rank: 1, warnings: [] } } } as MessageEvent);

    const [resultA, resultB] = await Promise.all([promiseA, promiseB]);
    expect(resultA).toEqual(resultB);
  });

  it('cancels in-flight group requests', async () => {
    vi.stubGlobal('Worker', MockWorker as any);
    let api: ReturnType<typeof useMatrixWorker> | null = null;
    render(<HookHarness onReady={(next) => { api = next; }} />);
    const payload: MatrixWorkerRequest['payload'] = { matrix: makeMatrix(), analysisMode: 'numeric', analysisOptions: { computeLU: true, computeQR: false, computeSVD: false, computeEigen: false } };
    const promise = api!.runWorkerRequest('analysis', payload, 'calculate');
    api!.cancelGroup('calculate', { terminate: true, reason: 'Calculation canceled.' });

    await expect(promise).rejects.toThrow('Calculation canceled.');
  });
});
