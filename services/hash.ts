import type { AnalysisMode, MatrixWorkerRequest, ValidMatrix } from '../types';
import { normalizeExpression, stringifySymbolicFraction } from './matrixService';

const hashString = (value: string): string => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
};

export const hashMatrix = (matrix: ValidMatrix): string => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    const parts: string[] = [`${rows}x${cols}`];
    for (let r = 0; r < rows; r++) {
        const row = matrix[r];
        for (let c = 0; c < cols; c++) {
            parts.push(stringifySymbolicFraction(row[c]));
        }
    }
    return hashString(parts.join('|'));
};

export const hashNumericMatrix = (matrix: number[][]): string => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    const parts: string[] = [`${rows}x${cols}`];
    for (let r = 0; r < rows; r++) {
        const row = matrix[r];
        for (let c = 0; c < cols; c++) {
            parts.push(String(row[c]));
        }
    }
    return hashString(parts.join('|'));
};

const hashMatrices = (entries: [string, ValidMatrix][]): string => {
    const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b));
    const parts: string[] = [];
    for (const [name, matrix] of sorted) {
        parts.push(name, hashMatrix(matrix));
    }
    return hashString(parts.join('|'));
};

const hashAnalysisOptions = (analysisMode: AnalysisMode, analysisOptions: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean }): string => {
    return hashString([
        analysisMode,
        analysisOptions.computeLU ? 'lu1' : 'lu0',
        analysisOptions.computeQR ? 'qr1' : 'qr0',
        analysisOptions.computeSVD ? 'svd1' : 'svd0',
        analysisOptions.computeEigen ? 'eig1' : 'eig0'
    ].join('|'));
};

export const hashWorkerRequest = (type: MatrixWorkerRequest['type'], payload: MatrixWorkerRequest['payload']): string => {
    switch (type) {
        case 'systemSolver':
            return hashString(`systemSolver|${hashMatrix(payload.matrix)}|${payload.systemType}`);
        case 'analysis':
            return hashString(`analysis|${hashMatrix(payload.matrix)}|${hashAnalysisOptions(payload.analysisMode, payload.analysisOptions)}`);
        case 'matrixOperations':
            return hashString(`matrixOps|${normalizeExpression(payload.expression)}|${hashMatrices(payload.matrices)}`);
        case 'batch': {
            const items = payload.items.map(item => `${item.id}:${hashMatrix(item.matrix)}`).sort();
            const normalizedExpression = payload.expression ? normalizeExpression(payload.expression) : '';
            return hashString(`batch|${payload.mode}|${normalizedExpression}|${hashAnalysisOptions(payload.analysisMode, payload.analysisOptions)}|${items.join('|')}`);
        }
        case 'details':
            return hashString(`details|${payload.section}|${payload.appMode}`);
        default:
            return hashString(`${type}`);
    }
};
