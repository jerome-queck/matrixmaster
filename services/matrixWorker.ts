/// <reference lib="webworker" />

import {
    calculate,
    calculateDeterminantOfOperation,
    calculateMatrixOperations,
    calculateRank,
    calculateTrace,
    numericEigen,
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

    const result: MatrixAnalysisResult = { kind: 'analysis', mode: 'numeric', rank, trace, warnings };

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

const handleDeterminantOfOperation = (expression: string, entries: [string, ValidMatrix][]) => {
    const matrices = mapEntriesToMap(entries);
    return calculateDeterminantOfOperation(expression, matrices, { summarized: true });
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
            case 'determinantOfOperation':
                result = handleDeterminantOfOperation(message.payload.expression, message.payload.matrices);
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
