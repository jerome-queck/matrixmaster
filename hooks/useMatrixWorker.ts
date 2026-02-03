import { useCallback, useEffect, useRef } from 'react';
import type { MatrixWorkerRequest, MatrixWorkerResponse } from '../types';
import { createAsyncDeduper } from '../services/asyncDeduper';
import { hashWorkerRequest } from '../services/hash';

export const useMatrixWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const workerRequestsRef = useRef(
        new Map<string, { resolve: (value: MatrixWorkerResponse['result']) => void; reject: (error: Error) => void; canceled?: boolean; group?: string; hash?: string }>()
    );
    const activeGroupRef = useRef(new Map<string, { id: string; hash: string }>());
    const inflightDeduperRef = useRef(createAsyncDeduper());
    const workerIdRef = useRef(0);

    useEffect(() => {
        const worker = new Worker(new URL('../services/matrixWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<MatrixWorkerResponse>) => {
            const message = event.data;
            const pending = workerRequestsRef.current.get(message.id);
            if (!pending) return;
            workerRequestsRef.current.delete(message.id);
            if (pending.canceled) return;
            if (pending.group) {
                const current = activeGroupRef.current.get(pending.group);
                if (current && current.id !== message.id) return;
            }
            if (message.ok) {
                pending.resolve(message.result);
            } else {
                pending.reject(new Error(message.error || 'Worker failed.'));
            }
        };
        worker.onerror = (event) => {
            console.error('Matrix worker error:', event);
        };
        workerRef.current = worker;
        return () => {
            worker.terminate();
            workerRef.current = null;
            workerRequestsRef.current.forEach(({ reject }) => reject(new Error('Worker terminated.')));
            workerRequestsRef.current.clear();
        };
    }, []);

    const runWorkerRequest = useCallback((type: MatrixWorkerRequest['type'], payload: MatrixWorkerRequest['payload'], group?: string) => {
        const requestHash = hashWorkerRequest(type, payload);
        const dedupeKey = `${type}:${requestHash}`;
        const shouldDedup = type !== 'details';

        const createRequest = () => new Promise<MatrixWorkerResponse['result']>((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker unavailable.'));
                return;
            }
            const id = `worker_${Date.now()}_${workerIdRef.current++}`;
            if (group) {
                const previous = activeGroupRef.current.get(group);
                if (previous && previous.hash !== requestHash) {
                    const pending = workerRequestsRef.current.get(previous.id);
                    if (pending && !pending.canceled) {
                        pending.canceled = true;
                        pending.reject(new Error('Request superseded.'));
                    }
                }
                activeGroupRef.current.set(group, { id, hash: requestHash });
            }
            workerRequestsRef.current.set(id, { resolve, reject, group, hash: requestHash });
            const message: MatrixWorkerRequest = { id, type, payload, requestHash };
            workerRef.current.postMessage(message);
        });

        if (!shouldDedup) {
            return createRequest();
        }

        return inflightDeduperRef.current.getOrCreate(dedupeKey, createRequest);
    }, []);

    return { runWorkerRequest };
};
