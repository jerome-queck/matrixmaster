import { formatNumberToLatex } from '../../services/matrixService';
import type { NumericMatrix, NumericVector } from './types';

export const EPSILON = 1e-10;

export interface ScalarCluster {
    value: number;
    indices: number[];
}

export const cloneMatrix = (matrix: NumericMatrix): NumericMatrix => matrix.map((row) => [...row]);

export const assertRectangularMatrix = (matrix: NumericMatrix, label = 'matrix'): void => {
    if (!Array.isArray(matrix)) throw new Error(`${label} must be an array.`);
    if (matrix.length === 0) return;
    const width = matrix[0].length;
    for (let r = 1; r < matrix.length; r++) {
        if (matrix[r].length !== width) {
            throw new Error(`${label} must be rectangular.`);
        }
    }
};

export const assertSquareMatrix = (matrix: NumericMatrix, label = 'matrix'): void => {
    assertRectangularMatrix(matrix, label);
    if (matrix.length === 0) throw new Error(`${label} must be non-empty.`);
    if (matrix.length !== matrix[0].length) throw new Error(`${label} must be square.`);
};

export const assertEqualVectorLengths = (a: NumericVector, b: NumericVector, label = 'vectors'): void => {
    if (a.length !== b.length) throw new Error(`${label} must have equal length.`);
};

export const zeroMatrix = (rows: number, cols: number): NumericMatrix =>
    Array.from({ length: rows }, () => Array(cols).fill(0));

export const identityMatrix = (n: number): NumericMatrix => {
    const matrix = zeroMatrix(n, n);
    for (let i = 0; i < n; i++) matrix[i][i] = 1;
    return matrix;
};

export const matrixTranspose = (matrix: NumericMatrix): NumericMatrix => {
    if (matrix.length === 0) return [];
    const rows = matrix.length;
    const cols = matrix[0].length;
    const t = zeroMatrix(cols, rows);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) t[c][r] = matrix[r][c];
    }
    return t;
};

export const matrixAdd = (a: NumericMatrix, b: NumericMatrix): NumericMatrix => {
    assertRectangularMatrix(a, 'a');
    assertRectangularMatrix(b, 'b');
    if (a.length !== b.length || (a[0]?.length ?? 0) !== (b[0]?.length ?? 0)) {
        throw new Error('Matrix addition requires matching dimensions.');
    }
    return a.map((row, r) => row.map((value, c) => value + b[r][c]));
};

export const matrixSubtract = (a: NumericMatrix, b: NumericMatrix): NumericMatrix => {
    assertRectangularMatrix(a, 'a');
    assertRectangularMatrix(b, 'b');
    if (a.length !== b.length || (a[0]?.length ?? 0) !== (b[0]?.length ?? 0)) {
        throw new Error('Matrix subtraction requires matching dimensions.');
    }
    return a.map((row, r) => row.map((value, c) => value - b[r][c]));
};

export const matrixScale = (matrix: NumericMatrix, scalar: number): NumericMatrix =>
    matrix.map((row) => row.map((value) => value * scalar));

export const matrixMultiply = (a: NumericMatrix, b: NumericMatrix): NumericMatrix => {
    assertRectangularMatrix(a, 'a');
    assertRectangularMatrix(b, 'b');
    if (a.length === 0 || b.length === 0) return [];
    const rows = a.length;
    const shared = a[0].length;
    const cols = b[0].length;
    if (shared !== b.length) throw new Error('Matrix multiplication dimension mismatch.');

    const result = zeroMatrix(rows, cols);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let sum = 0;
            for (let k = 0; k < shared; k++) sum += a[r][k] * b[k][c];
            result[r][c] = sum;
        }
    }
    return result;
};

export const matrixVectorMultiply = (matrix: NumericMatrix, vector: NumericVector): NumericVector => {
    assertRectangularMatrix(matrix, 'matrix');
    if (matrix.length === 0) return [];
    if (matrix[0].length !== vector.length) throw new Error('Matrix-vector dimension mismatch.');
    return matrix.map((row) => dot(row, vector));
};

export const matrixColumns = (matrix: NumericMatrix): NumericVector[] => {
    if (matrix.length === 0) return [];
    const cols = matrix[0].length;
    return Array.from({ length: cols }, (_, c) => matrix.map((row) => row[c]));
};

export const columnsToMatrix = (columns: NumericVector[]): NumericMatrix => {
    if (columns.length === 0) return [];
    const rows = columns[0].length;
    for (const column of columns) {
        if (column.length !== rows) throw new Error('All columns must have the same length.');
    }
    const matrix = zeroMatrix(rows, columns.length);
    for (let c = 0; c < columns.length; c++) {
        for (let r = 0; r < rows; r++) matrix[r][c] = columns[c][r];
    }
    return matrix;
};

export const dot = (a: NumericVector, b: NumericVector): number => {
    assertEqualVectorLengths(a, b);
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
};

export const vectorAdd = (a: NumericVector, b: NumericVector): NumericVector => {
    assertEqualVectorLengths(a, b);
    return a.map((value, i) => value + b[i]);
};

export const vectorSubtract = (a: NumericVector, b: NumericVector): NumericVector => {
    assertEqualVectorLengths(a, b);
    return a.map((value, i) => value - b[i]);
};

export const vectorScale = (vector: NumericVector, scalar: number): NumericVector =>
    vector.map((value) => value * scalar);

export const vectorNorm2 = (vector: NumericVector): number => Math.sqrt(Math.max(dot(vector, vector), 0));

export const vectorNorm1 = (vector: NumericVector): number =>
    vector.reduce((sum, value) => sum + Math.abs(value), 0);

export const vectorNormInf = (vector: NumericVector): number =>
    vector.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

export const frobeniusNorm = (matrix: NumericMatrix): number =>
    Math.sqrt(matrix.reduce((sum, row) => sum + row.reduce((rowSum, value) => rowSum + value * value, 0), 0));

export const maxAbsEntry = (matrix: NumericMatrix): number => {
    let max = 0;
    for (const row of matrix) {
        for (const value of row) max = Math.max(max, Math.abs(value));
    }
    return max;
};

export const rref = (
    matrix: NumericMatrix,
    tolerance = EPSILON
): { matrix: NumericMatrix; pivotColumns: number[] } => {
    assertRectangularMatrix(matrix, 'matrix');
    const reduced = cloneMatrix(matrix);
    const rows = reduced.length;
    const cols = rows > 0 ? reduced[0].length : 0;
    const pivotColumns: number[] = [];

    let pivotRow = 0;
    for (let pivotCol = 0; pivotCol < cols && pivotRow < rows; pivotCol++) {
        let bestRow = pivotRow;
        let bestValue = Math.abs(reduced[pivotRow][pivotCol]);
        for (let r = pivotRow + 1; r < rows; r++) {
            const candidate = Math.abs(reduced[r][pivotCol]);
            if (candidate > bestValue) {
                bestValue = candidate;
                bestRow = r;
            }
        }

        if (bestValue <= tolerance) continue;
        if (bestRow !== pivotRow) [reduced[pivotRow], reduced[bestRow]] = [reduced[bestRow], reduced[pivotRow]];

        const pivot = reduced[pivotRow][pivotCol];
        for (let c = pivotCol; c < cols; c++) reduced[pivotRow][c] /= pivot;

        for (let r = 0; r < rows; r++) {
            if (r === pivotRow) continue;
            const factor = reduced[r][pivotCol];
            if (Math.abs(factor) <= tolerance) continue;
            for (let c = pivotCol; c < cols; c++) {
                reduced[r][c] -= factor * reduced[pivotRow][c];
                if (Math.abs(reduced[r][c]) <= tolerance) reduced[r][c] = 0;
            }
        }

        pivotColumns.push(pivotCol);
        pivotRow++;
    }

    return { matrix: reduced, pivotColumns };
};

export const matrixRank = (matrix: NumericMatrix, tolerance = EPSILON): number => rref(matrix, tolerance).pivotColumns.length;

export const nullSpace = (matrix: NumericMatrix, tolerance = EPSILON, columnsHint?: number): NumericVector[] => {
    assertRectangularMatrix(matrix, 'matrix');
    const rows = matrix.length;
    const cols = rows > 0 ? matrix[0].length : (columnsHint ?? 0);
    if (cols === 0) return [];

    if (rows === 0) {
        return Array.from({ length: cols }, (_, idx) => {
            const basis = Array(cols).fill(0);
            basis[idx] = 1;
            return basis;
        });
    }

    const { matrix: reduced, pivotColumns } = rref(matrix, tolerance);
    const pivotSet = new Set(pivotColumns);
    const freeColumns: number[] = [];
    for (let c = 0; c < cols; c++) {
        if (!pivotSet.has(c)) freeColumns.push(c);
    }
    if (freeColumns.length === 0) return [];

    const basis: NumericVector[] = [];
    for (const freeCol of freeColumns) {
        const vector = Array(cols).fill(0);
        vector[freeCol] = 1;
        for (let row = 0; row < pivotColumns.length; row++) {
            const pivotCol = pivotColumns[row];
            vector[pivotCol] = -(reduced[row][freeCol] ?? 0);
        }
        basis.push(vector);
    }
    return basis;
};

export const solveUpperTriangular = (
    upper: NumericMatrix,
    rhs: NumericVector,
    tolerance = EPSILON
): NumericVector | null => {
    assertRectangularMatrix(upper, 'upper');
    const n = upper.length;
    if (n === 0 || upper[0].length !== n || rhs.length !== n) return null;

    const x = Array(n).fill(0);
    for (let row = n - 1; row >= 0; row--) {
        let sum = rhs[row];
        for (let c = row + 1; c < n; c++) sum -= upper[row][c] * x[c];
        const pivot = upper[row][row];
        if (Math.abs(pivot) <= tolerance) return null;
        x[row] = sum / pivot;
    }
    return x;
};

export const matrixInverse = (matrix: NumericMatrix, tolerance = EPSILON): NumericMatrix | null => {
    assertSquareMatrix(matrix, 'matrix');
    const n = matrix.length;
    const augmented = matrix.map((row, r) => [...row, ...identityMatrix(n)[r]]);

    let pivotRow = 0;
    for (let pivotCol = 0; pivotCol < n && pivotRow < n; pivotCol++) {
        let bestRow = pivotRow;
        let bestValue = Math.abs(augmented[pivotRow][pivotCol]);
        for (let r = pivotRow + 1; r < n; r++) {
            const candidate = Math.abs(augmented[r][pivotCol]);
            if (candidate > bestValue) {
                bestValue = candidate;
                bestRow = r;
            }
        }

        if (bestValue <= tolerance) return null;
        if (bestRow !== pivotRow) [augmented[pivotRow], augmented[bestRow]] = [augmented[bestRow], augmented[pivotRow]];

        const pivot = augmented[pivotRow][pivotCol];
        for (let c = 0; c < 2 * n; c++) augmented[pivotRow][c] /= pivot;

        for (let r = 0; r < n; r++) {
            if (r === pivotRow) continue;
            const factor = augmented[r][pivotCol];
            if (Math.abs(factor) <= tolerance) continue;
            for (let c = 0; c < 2 * n; c++) augmented[r][c] -= factor * augmented[pivotRow][c];
        }

        pivotRow++;
    }

    return augmented.map((row) => row.slice(n));
};

export const flattenMatrix = (matrix: NumericMatrix): NumericVector => {
    const flattened: number[] = [];
    for (const row of matrix) {
        for (const value of row) flattened.push(value);
    }
    return flattened;
};

export const integerMatrixPower = (matrix: NumericMatrix, exponent: number): NumericMatrix => {
    assertSquareMatrix(matrix, 'matrix');
    if (!Number.isInteger(exponent) || exponent < 0) throw new Error('Exponent must be a non-negative integer.');
    if (exponent === 0) return identityMatrix(matrix.length);
    if (exponent === 1) return cloneMatrix(matrix);

    let power = exponent;
    let base = cloneMatrix(matrix);
    let result = identityMatrix(matrix.length);
    while (power > 0) {
        if (power % 2 === 1) result = matrixMultiply(result, base);
        power = Math.floor(power / 2);
        if (power > 0) base = matrixMultiply(base, base);
    }
    return result;
};

export const clusterScalars = (values: number[], tolerance = 1e-6): ScalarCluster[] => {
    if (values.length === 0) return [];
    const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);

    const clusters: ScalarCluster[] = [];
    for (const entry of sorted) {
        const current = clusters[clusters.length - 1];
        if (!current) {
            clusters.push({ value: entry.value, indices: [entry.index] });
            continue;
        }
        const scale = Math.max(1, Math.abs(current.value), Math.abs(entry.value));
        if (Math.abs(entry.value - current.value) <= tolerance * scale) {
            current.indices.push(entry.index);
            const total = current.indices.length;
            current.value = ((current.value * (total - 1)) + entry.value) / total;
        } else {
            clusters.push({ value: entry.value, indices: [entry.index] });
        }
    }
    return clusters;
};

export const formatVectorToLatex = (vector: NumericVector): string => {
    const body = vector.map((value) => formatNumberToLatex(value)).join(' \\\\ ');
    return `\\begin{bmatrix} ${body} \\end{bmatrix}`;
};

export const formatPolynomialLatex = (
    coefficientsHighToLow: number[],
    variable = '\\lambda',
    tolerance = 1e-10
): string => {
    const degree = coefficientsHighToLow.length - 1;
    const terms: string[] = [];

    coefficientsHighToLow.forEach((coefficient, idx) => {
        if (Math.abs(coefficient) <= tolerance) return;
        const power = degree - idx;
        const absCoeff = Math.abs(coefficient);
        const coeffText = formatNumberToLatex(absCoeff);
        let term = '';

        if (power === 0) {
            term = coeffText;
        } else if (power === 1) {
            term = Math.abs(absCoeff - 1) <= tolerance ? `${variable}` : `${coeffText}${variable}`;
        } else {
            term = Math.abs(absCoeff - 1) <= tolerance ? `${variable}^{${power}}` : `${coeffText}${variable}^{${power}}`;
        }

        if (terms.length === 0) {
            terms.push(coefficient < 0 ? `- ${term}` : term);
        } else {
            terms.push(coefficient < 0 ? `- ${term}` : `+ ${term}`);
        }
    });

    return terms.length > 0 ? terms.join(' ') : '0';
};

export const normalizeJordanBlockSizes = (rawSizes: number[], algebraicMultiplicity: number): number[] => {
    const positiveSizes = rawSizes.filter((size) => size > 0).map((size) => Math.round(size));
    let total = positiveSizes.reduce((sum, size) => sum + size, 0);
    const normalized = [...positiveSizes];

    while (total < algebraicMultiplicity) {
        normalized.push(1);
        total++;
    }

    while (total > algebraicMultiplicity && normalized.length > 0) {
        normalized.sort((a, b) => b - a);
        const largest = normalized.shift();
        if (largest === undefined) break;
        if (largest > 1) {
            normalized.push(largest - 1);
            total--;
        }
    }

    if (normalized.length === 0 && algebraicMultiplicity > 0) {
        return Array.from({ length: algebraicMultiplicity }, () => 1);
    }

    return normalized.sort((a, b) => b - a);
};

export const conditionNumberFromSingularValues = (singularValues: number[], tolerance = EPSILON): number => {
    if (singularValues.length === 0) return Infinity;
    const max = Math.max(...singularValues.map((value) => Math.abs(value)));
    const positive = singularValues.map((value) => Math.abs(value)).filter((value) => value > tolerance);
    const min = positive.length > 0 ? Math.min(...positive) : 0;
    if (!Number.isFinite(max) || !Number.isFinite(min) || min <= tolerance) return Infinity;
    return max / min;
};
