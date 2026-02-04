/// <reference lib="webworker" />

import {
    calculate,
    calculateMatrixOperations,
    calculateRank,
    calculateTrace,
    numericEigen,
    numericDeterminant,
    numericNorm1,
    numericNorm2,
    numericNormFro,
    numericNormInf,
    numericLU,
    numericQR,
    numericRank,
    numericSVD,
    numericTrace,
    recalculateDetailsForSection,
    toNumericMatrix
} from './matrixService';
import type {
    AnalysisMode,
    AnyResult,
    MatrixAnalysisResult,
    MatrixWorkerRequest,
    MatrixWorkerResponse,
    SystemType,
    ValidMatrix
} from '../types';
import { createLruCache } from './lru';

const RESULT_CACHE_LIMIT = 75;
const RESULT_CACHE_TTL_MS = 10 * 60 * 1000;
const resultCache = createLruCache<{ value: MatrixWorkerResponse['result']; timestamp: number }>(RESULT_CACHE_LIMIT);

const buildAnalysisResult = (
    matrix: ValidMatrix,
    analysisMode: AnalysisMode,
    analysisOptions: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean }
): MatrixAnalysisResult => {
    const warnings: string[] = [];

    if (analysisMode === 'exact') {
        const rank = calculateRank(matrix);
        let trace;
        if (matrix.length === matrix[0]?.length) {
            trace = calculateTrace(matrix);
        } else {
            warnings.push('Trace is only defined for square matrices.');
        }
        return { kind: 'analysis', mode: 'exact', rank, trace, warnings };
    }

    const numericMatrix = toNumericMatrix(matrix);
    const rank = numericRank(numericMatrix);
    let trace: number | undefined;
    if (numericMatrix.length === numericMatrix[0]?.length) {
        trace = numericTrace(numericMatrix);
    } else {
        warnings.push('Trace is only defined for square matrices.');
    }

    const metrics: MatrixAnalysisResult['metrics'] = {
        norm1: numericNorm1(numericMatrix),
        normInf: numericNormInf(numericMatrix),
        normFro: numericNormFro(numericMatrix)
    };
    if (numericMatrix.length === numericMatrix[0]?.length) {
        metrics.determinant = numericDeterminant(numericMatrix);
    }

    const result: MatrixAnalysisResult = { kind: 'analysis', mode: 'numeric', rank, trace, warnings, metrics };

    if (analysisOptions.computeLU) {
        if (numericMatrix.length === numericMatrix[0]?.length) {
            result.lu = numericLU(numericMatrix);
        } else {
            warnings.push('LU decomposition requires a square matrix.');
        }
    }

    if (analysisOptions.computeQR) {
        result.qr = numericQR(numericMatrix);
    }

    if (analysisOptions.computeSVD) {
        result.svd = numericSVD(numericMatrix);
        const norm2 = numericNorm2(result.svd);
        metrics.norm2 = norm2;
        const minSingular = result.svd.singularValues.at(-1);
        if (norm2 !== undefined && minSingular !== undefined) {
            if (minSingular === 0) {
                metrics.conditionNumber = Number.POSITIVE_INFINITY;
                warnings.push('Matrix is singular; condition number is infinite.');
            } else {
                metrics.conditionNumber = norm2 / minSingular;
                if (metrics.conditionNumber > 1e8) {
                    warnings.push('Matrix appears ill-conditioned (condition number > 1e8).');
                }
            }
        }
    }

    if (analysisOptions.computeEigen) {
        if (numericMatrix.length === numericMatrix[0]?.length) {
            result.eigen = numericEigen(numericMatrix);
        } else {
            warnings.push('Eigenvalues require a square matrix.');
        }
    }

    return result;
};

const mapEntriesToMap = (entries: [string, ValidMatrix][]) => new Map<string, ValidMatrix>(entries);

const handleSystemSolver = (matrix: ValidMatrix, systemType: SystemType) => {
    return calculate(matrix, systemType, { summarized: true });
};

const handleMatrixOperations = (expression: string, entries: [string, ValidMatrix][]) => {
    const matrices = mapEntriesToMap(entries);
    return calculateMatrixOperations(expression, matrices, { summarized: true });
};

const handleBatch = (payload: MatrixWorkerRequest & { type: 'batch' }) => {
    const { mode, expression, analysisMode, analysisOptions, items } = payload.payload;

    return items.map(item => {
        try {
            if (mode === 'analysis') {
                const result = buildAnalysisResult(item.matrix, analysisMode, analysisOptions);
                return { id: item.id, name: item.name, result };
            }

            const matrices = new Map<string, ValidMatrix>();
            matrices.set('A', item.matrix);
            const result = calculateMatrixOperations(expression ?? 'A', matrices, { summarized: true });
            return { id: item.id, name: item.name, result };
        } catch (error) {
            return {
                id: item.id,
                name: item.name,
                error: error instanceof Error ? error.message : 'Batch run failed.'
            };
        }
    });
};

const handleDetails = (payload: MatrixWorkerRequest & { type: 'details' }) => {
    const { section, appMode, results, originalInputs } = payload.payload;
    return recalculateDetailsForSection(results, section, originalInputs, appMode);
};

self.onmessage = (event: MessageEvent<MatrixWorkerRequest>) => {
    const message = event.data;
    const baseResponse: Omit<MatrixWorkerResponse, 'result' | 'error' | 'ok'> = { id: message.id };
    const cacheKey = message.requestHash && message.type !== 'details'
        ? `${message.type}:${message.requestHash}`
        : null;

    if (cacheKey) {
        const cached = resultCache.get(cacheKey);
        if (cached !== undefined) {
            if (Date.now() - cached.timestamp <= RESULT_CACHE_TTL_MS) {
                const response: MatrixWorkerResponse = { ...baseResponse, ok: true, result: cached.value };
                self.postMessage(response);
                return;
            }
            resultCache.remove(cacheKey);
        }
    }

    try {
        let result: AnyResult | { id: string; name: string; result?: AnyResult; error?: string }[];

        switch (message.type) {
            case 'systemSolver':
                result = handleSystemSolver(message.payload.matrix, message.payload.systemType);
                break;
            case 'analysis':
                result = buildAnalysisResult(
                    message.payload.matrix,
                    message.payload.analysisMode,
                    message.payload.analysisOptions
                );
                break;
            case 'matrixOperations':
                result = handleMatrixOperations(message.payload.expression, message.payload.matrices);
                break;
            case 'batch':
                result = handleBatch(message);
                break;
            case 'details':
                result = handleDetails(message);
                break;
            default:
                throw new Error('Unknown worker request.');
        }

        if (cacheKey) {
            resultCache.set(cacheKey, { value: result, timestamp: Date.now() });
        }

        const response: MatrixWorkerResponse = { ...baseResponse, ok: true, result };
        self.postMessage(response);
    } catch (error) {
        const response: MatrixWorkerResponse = {
            ...baseResponse,
            ok: false,
            error: error instanceof Error ? error.message : 'Worker failed.'
        };
        self.postMessage(response);
    }
};
