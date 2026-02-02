import { useCallback, useEffect, useRef } from 'react';
import type { MatrixWorkerRequest, MatrixWorkerResponse } from '../types';

export const useMatrixWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const workerRequestsRef = useRef(
        new Map<string, { resolve: (value: MatrixWorkerResponse['result']) => void; reject: (error: Error) => void; canceled?: boolean; group?: string }>()
    );
    const activeGroupRef = useRef(new Map<string, string>());
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
                const currentId = activeGroupRef.current.get(pending.group);
                if (currentId && currentId !== message.id) return;
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
        return new Promise<MatrixWorkerResponse['result']>((resolve, reject) => {
            if (!workerRef.current) {
                reject(new Error('Worker unavailable.'));
                return;
            }
            const id = `worker_${Date.now()}_${workerIdRef.current++}`;
            if (group) {
                const previousId = activeGroupRef.current.get(group);
                if (previousId) {
                    const previous = workerRequestsRef.current.get(previousId);
                    if (previous && !previous.canceled) {
                        previous.canceled = true;
                        previous.reject(new Error('Request superseded.'));
                    }
                }
                activeGroupRef.current.set(group, id);
            }
            workerRequestsRef.current.set(id, { resolve, reject, group });
            const message: MatrixWorkerRequest = { id, type, payload };
            workerRef.current.postMessage(message);
        });
    }, []);

    return { runWorkerRequest };
};
