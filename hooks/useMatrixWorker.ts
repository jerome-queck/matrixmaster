import { useCallback, useEffect, useRef } from 'react';
import type { MatrixWorkerRequest, MatrixWorkerResponse } from '../types';
import { createAsyncDeduper } from '../services/asyncDeduper';
import { hashWorkerRequest } from '../services/hash';

const MAX_INFLIGHT = 2;
const MAX_QUEUE = 40;
const DEFAULT_TIMEOUT_MS = 60_000;

type PendingRequest = {
    resolve: (value: MatrixWorkerResponse['result']) => void;
    reject: (error: Error) => void;
    canceled?: boolean;
    group?: string;
    hash?: string;
    timeoutId?: number;
};

type QueuedRequest = {
    type: MatrixWorkerRequest['type'];
    payload: MatrixWorkerRequest['payload'];
    group?: string;
    requestHash: string;
    resolve: (value: MatrixWorkerResponse['result']) => void;
    reject: (error: Error) => void;
    timeoutMs: number;
};

export const useMatrixWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const workerRequestsRef = useRef(new Map<string, PendingRequest>());
    const activeGroupRef = useRef(new Map<string, { id: string; hash: string }>());
    const inflightDeduperRef = useRef(createAsyncDeduper());
    const workerIdRef = useRef(0);
    const queueRef = useRef<QueuedRequest[]>([]);
    const inflightCountRef = useRef(0);

    const initializeWorker = useCallback(() => {
        const worker = new Worker(new URL('../services/matrixWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<MatrixWorkerResponse>) => {
            const message = event.data;
            const pending = workerRequestsRef.current.get(message.id);
            if (!pending) return;
            if (pending.timeoutId) {
                window.clearTimeout(pending.timeoutId);
            }
            workerRequestsRef.current.delete(message.id);
            if (pending.canceled) {
                inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
                pumpQueue();
                return;
            }
            if (pending.group) {
                const current = activeGroupRef.current.get(pending.group);
                if (current && current.id !== message.id) return;
            }
            if (message.ok) {
                pending.resolve(message.result);
            } else {
                pending.reject(new Error(message.error || 'Worker failed.'));
            }
            inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
            pumpQueue();
        };
        worker.onerror = (event) => {
            console.error('Matrix worker error:', event);
            inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
            pumpQueue();
        };
        workerRef.current = worker;
    }, []);

    const resetWorker = useCallback((reason = 'Worker reset.') => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        queueRef.current.forEach(item => item.reject(new Error(reason)));
        queueRef.current = [];
        workerRequestsRef.current.forEach(({ reject, timeoutId }) => {
            if (timeoutId) window.clearTimeout(timeoutId);
            reject(new Error(reason));
        });
        workerRequestsRef.current.clear();
        inflightCountRef.current = 0;
        initializeWorker();
    }, [initializeWorker]);

    useEffect(() => {
        initializeWorker();
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
            workerRef.current = null;
            workerRequestsRef.current.forEach(({ reject, timeoutId }) => {
                if (timeoutId) window.clearTimeout(timeoutId);
                reject(new Error('Worker terminated.'));
            });
            workerRequestsRef.current.clear();
        };
    }, []);

    const pumpQueue = useCallback(() => {
        if (!workerRef.current) return;
        while (inflightCountRef.current < MAX_INFLIGHT && queueRef.current.length > 0) {
            const next = queueRef.current.shift();
            if (!next) break;
            inflightCountRef.current += 1;
            const { type, payload, group, requestHash, resolve, reject, timeoutMs } = next;
            const requestId = `worker_${Date.now()}_${workerIdRef.current++}`;
            const timeoutId = window.setTimeout(() => {
                const pending = workerRequestsRef.current.get(requestId);
                if (!pending) return;
                pending.canceled = true;
                workerRequestsRef.current.delete(requestId);
                reject(new Error('Request timed out.'));
                inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
                pumpQueue();
            }, timeoutMs);

            if (group) {
                activeGroupRef.current.set(group, { id: requestId, hash: requestHash });
            }

            workerRequestsRef.current.set(requestId, { resolve, reject, group, hash: requestHash, timeoutId });
            const message: MatrixWorkerRequest = { id: requestId, type, payload, requestHash };
            workerRef.current.postMessage(message);
        }
    }, []);

    const enqueueRequest = useCallback(
        (type: MatrixWorkerRequest['type'], payload: MatrixWorkerRequest['payload'], group?: string, timeoutMs = DEFAULT_TIMEOUT_MS) => {
            return new Promise<MatrixWorkerResponse['result']>((resolve, reject) => {
                if (!workerRef.current) {
                    reject(new Error('Worker unavailable.'));
                    return;
                }
                if (queueRef.current.length >= MAX_QUEUE) {
                    reject(new Error('Request queue is full.'));
                    return;
                }
                const requestHash = hashWorkerRequest(type, payload);
                if (group) {
                    const previous = activeGroupRef.current.get(group);
                    if (previous && previous.hash !== requestHash) {
                        const pending = workerRequestsRef.current.get(previous.id);
                        if (pending && !pending.canceled) {
                            pending.canceled = true;
                            if (pending.timeoutId) window.clearTimeout(pending.timeoutId);
                            pending.reject(new Error('Request superseded.'));
                            inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
                        }
                        activeGroupRef.current.delete(group);
                        pumpQueue();
                    }
                    queueRef.current = queueRef.current.filter(item => {
                        if (item.group !== group) return true;
                        if (item.requestHash === requestHash) return true;
                        item.reject(new Error('Request superseded.'));
                        return false;
                    });
                }
                queueRef.current.push({ type, payload, group, requestHash, resolve, reject, timeoutMs });
                pumpQueue();
            });
        },
        [pumpQueue]
    );

    const runWorkerRequest = useCallback((type: MatrixWorkerRequest['type'], payload: MatrixWorkerRequest['payload'], group?: string) => {
        const requestHash = hashWorkerRequest(type, payload);
        const dedupeKey = `${type}:${requestHash}`;
        const shouldDedup = type !== 'details';
        const createRequest = () => enqueueRequest(type, payload, group, DEFAULT_TIMEOUT_MS);

        if (!shouldDedup) {
            return createRequest();
        }

        return inflightDeduperRef.current.getOrCreate(dedupeKey, createRequest);
    }, [enqueueRequest]);

    const cancelGroup = useCallback((group: string, options?: { terminate?: boolean; reason?: string }) => {
        const reason = options?.reason || 'Request canceled.';
        queueRef.current = queueRef.current.filter(item => {
            if (item.group !== group) return true;
            item.reject(new Error(reason));
            return false;
        });
        workerRequestsRef.current.forEach((pending, id) => {
            if (pending.group !== group) return;
            pending.canceled = true;
            if (pending.timeoutId) window.clearTimeout(pending.timeoutId);
            pending.reject(new Error(reason));
            workerRequestsRef.current.delete(id);
            inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
        });
        activeGroupRef.current.delete(group);
        pumpQueue();
        if (options?.terminate) {
            resetWorker(reason);
        }
    }, [resetWorker]);

    return { runWorkerRequest, cancelGroup };
};
