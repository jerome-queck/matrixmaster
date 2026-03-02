import { parseInput } from '../../services/matrixService';
import type { MatrixOperationStep, MatrixOperationsResult, ValidMatrix } from '../../types';
import type { ExactResultAction, ExactSurfaceResult } from '../../engines/exact/contracts';
import type { LeastSquaresData } from '../../engines/numeric/orthogonality';

type MatrixLike = number[][] | ValidMatrix;

type ExtraStep = {
    label: string;
    matrix: MatrixLike;
};

export interface DecompositionSurfacePayload {
    input?: MatrixLike;
    lu?: { L: MatrixLike; U: MatrixLike; P?: MatrixLike };
    qr?: { Q: MatrixLike; R: MatrixLike };
    svd?: { U: MatrixLike; S: MatrixLike; Vt: MatrixLike };
    eigen?: { values: number[]; vectors?: MatrixLike };
}

const fallbackMatrix = (): ValidMatrix => [[parseInput('0')]];

const toLatexText = (value: string): string =>
    `\\text{${value.replace(/[{}]/g, '').replace(/\\/g, '').trim() || 'Result'}}`;

const toValidMatrix = (matrix: MatrixLike): ValidMatrix => {
    if (!Array.isArray(matrix) || matrix.length === 0) return fallbackMatrix();
    const firstValue = matrix[0]?.[0];

    if (typeof firstValue === 'number') {
        return (matrix as number[][]).map((row) => {
            const safeRow = Array.isArray(row) && row.length > 0 ? row : [0];
            return safeRow.map((cell) => parseInput(String(Number.isFinite(cell) ? cell : 0)));
        }) as ValidMatrix;
    }

    return (matrix as ValidMatrix).map((row) => {
        const safeRow = Array.isArray(row) && row.length > 0 ? row : [parseInput('0')];
        return safeRow.map((cell) => cell ?? parseInput('0'));
    }) as ValidMatrix;
};

const toStep = (label: string, matrix: MatrixLike): MatrixOperationStep => ({
    operation: toLatexText(label),
    result: toValidMatrix(matrix)
});

const vectorToColumnMatrix = (vector: number[]): number[][] => vector.map((value) => [value]);

const exactActionMatrix = (actions: ExactResultAction[]): ValidMatrix | null => {
    const action = actions.find((entry) => entry.matrix && entry.matrix.length > 0);
    return action?.matrix ?? null;
};

const stableHash = (value: string): number => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) % 9973;
    }
    return hash;
};

const summarizeExactResultToMatrix = (result: ExactSurfaceResult, index: number): number[][] => {
    const actionSignature = result.actions
        .map((action) => `${action.id}:${action.kind}:${action.label}`)
        .join('|');
    const latexSignature = result.latexBlocks.join('|');
    const fingerprint = stableHash(`${result.id}|${result.title}|${result.summary}|${actionSignature}|${latexSignature}`);
    const summaryFingerprint = stableHash(`${result.summary}|${latexSignature}`);

    return [
        [index + 1, result.actions.length, result.latexBlocks.length, fingerprint],
        [result.title.length, result.summary.length, result.witness?.certificateLatex.length ?? 0, summaryFingerprint]
    ];
};

const buildStatusMatrix = (label: string, requiredInputs: string[], diagnostics: string[]): number[][] => {
    const rows: number[][] = [[0, requiredInputs.length, diagnostics.length, stableHash(label)]];
    requiredInputs.forEach((input, index) => {
        rows.push([1, index + 1, input.length, stableHash(input)]);
    });
    diagnostics.forEach((diagnostic, index) => {
        rows.push([2, index + 1, diagnostic.length, stableHash(diagnostic)]);
    });
    return rows;
};

export const adaptMatrixSurfaceToSharedResult = (
    label: string,
    matrix: MatrixLike,
    extraSteps: ExtraStep[] = []
): MatrixOperationsResult => {
    const finalResult = toValidMatrix(matrix);
    const steps: MatrixOperationStep[] = [
        ...extraSteps.map((step) => toStep(step.label, step.matrix)),
        toStep(label, finalResult)
    ];

    return {
        steps,
        finalResult,
        conditions: []
    };
};

const methodLabel = (method: 'jacobi' | 'gs' | 'cg' | 'gmres'): string => {
    if (method === 'jacobi') return 'Jacobi';
    if (method === 'gs') return 'Gauss-Seidel';
    if (method === 'cg') return 'Conjugate Gradient';
    return 'GMRES';
};

export const adaptIterativeSurfaceToSharedResult = (
    method: 'jacobi' | 'gs' | 'cg' | 'gmres',
    solution: number[],
    residuals: number[]
): MatrixOperationsResult => {
    const solutionMatrix = solution.map((value) => [value]);
    const residualMatrix = residuals.slice(0, 24).map((value) => [value]);
    const extras: ExtraStep[] = residualMatrix.length > 0
        ? [{ label: 'Residual history', matrix: residualMatrix }]
        : [];

    return adaptMatrixSurfaceToSharedResult(`${methodLabel(method)} solution vector`, solutionMatrix, extras);
};

export const adaptExactSurfaceResultsToSharedResult = (
    label: string,
    results: ExactSurfaceResult[]
): MatrixOperationsResult => {
    if (results.length === 0) {
        return adaptMatrixSurfaceToSharedResult(`${label} (no results)`, [[0]]);
    }

    const steps: MatrixOperationStep[] = [];
    results.forEach((result, index) => {
        const actionMatrix = exactActionMatrix(result.actions);
        const matrix = actionMatrix ?? summarizeExactResultToMatrix(result, index);
        const title = result.summary?.trim()
            ? `${result.title}: ${result.summary}`
            : result.title;
        steps.push(toStep(title, matrix));
    });

    return {
        steps,
        finalResult: steps[steps.length - 1].result,
        conditions: []
    };
};

export const adaptInputRequiredRoutePlaceholderToSharedResult = (
    label: string,
    requiredInputs: string[],
    diagnostics: string[] = []
): MatrixOperationsResult => {
    const normalizedRequiredInputs = requiredInputs.length > 0
        ? requiredInputs
        : ['Provide the required route inputs to compute this result.'];
    const normalizedDiagnostics = diagnostics.length > 0
        ? diagnostics
        : ['Route execution deferred until required inputs are available.'];
    const statusMatrix = buildStatusMatrix(label, normalizedRequiredInputs, normalizedDiagnostics);

    const extras: ExtraStep[] = [
        { label: 'Status: Input required', matrix: statusMatrix },
        ...normalizedRequiredInputs.map((input, index) => ({
            label: `Required input ${index + 1}: ${input}`,
            matrix: [[index + 1, input.length, stableHash(input), 0]]
        })),
        ...normalizedDiagnostics.map((diagnostic, index) => ({
            label: `Diagnostic ${index + 1}: ${diagnostic}`,
            matrix: [[index + 1, diagnostic.length, stableHash(diagnostic), 0]]
        }))
    ];

    return adaptMatrixSurfaceToSharedResult(`${label} (awaiting input)`, statusMatrix, extras);
};

export const adaptOrthogonalityBasisToSharedResult = (
    label: string,
    inputMatrix: number[][],
    basisMatrix: number[][],
    dependentInputIndices: number[]
): MatrixOperationsResult => {
    const extras: ExtraStep[] = [{ label: 'Input vectors', matrix: inputMatrix }];
    if (dependentInputIndices.length > 0) {
        extras.push({
            label: `Dependent vector indices (${dependentInputIndices.map((index) => index + 1).join(', ')})`,
            matrix: [dependentInputIndices.map((index) => index + 1)]
        });
    }
    return adaptMatrixSurfaceToSharedResult(label, basisMatrix, extras);
};

export const adaptLeastSquaresSurfaceToSharedResult = (
    label: string,
    matrix: number[][],
    rhs: number[],
    data: LeastSquaresData
): MatrixOperationsResult => {
    const diagnostics = data.diagnostics;
    const extras: ExtraStep[] = [
        { label: 'Input matrix A', matrix },
        { label: 'Input vector b', matrix: vectorToColumnMatrix(rhs) },
        { label: 'Fitted vector Ax', matrix: vectorToColumnMatrix(data.fitted) },
        { label: 'Residual vector r = b - Ax', matrix: vectorToColumnMatrix(data.residual) },
        {
            label: 'Diagnostics [||r||_2, relative ||r||_2, kappa(A)]',
            matrix: [[diagnostics.residualNorm2, diagnostics.relativeResidualNorm2, diagnostics.conditionNumber]]
        }
    ];

    return adaptMatrixSurfaceToSharedResult(label, vectorToColumnMatrix(data.solution), extras);
};

export const adaptDecompositionSurfaceToSharedResult = (
    label: string,
    payload: DecompositionSurfacePayload
): MatrixOperationsResult => {
    const extras: ExtraStep[] = [];
    if (payload.input) extras.push({ label: 'Input matrix A', matrix: payload.input });
    if (payload.lu?.P) extras.push({ label: 'LU permutation P', matrix: payload.lu.P });
    if (payload.lu?.L) extras.push({ label: 'LU lower factor L', matrix: payload.lu.L });
    if (payload.lu?.U) extras.push({ label: 'LU upper factor U', matrix: payload.lu.U });
    if (payload.qr?.Q) extras.push({ label: 'QR orthogonal Q', matrix: payload.qr.Q });
    if (payload.qr?.R) extras.push({ label: 'QR upper-triangular R', matrix: payload.qr.R });
    if (payload.svd?.U) extras.push({ label: 'SVD left singular vectors U', matrix: payload.svd.U });
    if (payload.svd?.S) extras.push({ label: 'SVD diagonal S', matrix: payload.svd.S });
    if (payload.svd?.Vt) extras.push({ label: 'SVD right singular vectors V^T', matrix: payload.svd.Vt });
    if (payload.eigen?.vectors) extras.push({ label: 'Eigenvector matrix V', matrix: payload.eigen.vectors });
    if (payload.eigen?.values) extras.push({ label: 'Eigenvalues', matrix: [payload.eigen.values] });

    const finalMatrix =
        payload.eigen?.vectors
        || payload.svd?.S
        || payload.qr?.R
        || payload.lu?.U
        || payload.input
        || [[0]];

    return adaptMatrixSurfaceToSharedResult(label, finalMatrix, extras);
};
