import type { SymbolicFraction, ValidMatrix } from '../../types';
import { copyToClipboard } from '../../services/clipboardService';
import { formatMatrixToLatex, formatSymbolicFractionToLatex } from '../../services/matrixService';
import type { ExactResultAction, ExactSurfaceResult, ExactVector } from './contracts';

export interface ExactActionHandlers {
    onUseMatrix?: (matrix: ValidMatrix) => void;
    onSaveMatrix?: (matrix: ValidMatrix, preferredName: string) => void;
    onError?: (message: string) => void;
}

const actionId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const vectorToColumnMatrix = (vector: ExactVector): ValidMatrix => vector.entries.map(entry => [entry]);

export const createMatrixActions = (label: string, matrix: ValidMatrix): ExactResultAction[] => {
    const latex = `${label} = ${formatMatrixToLatex(matrix)}`;
    const matrixJson = matrix.map(row => row.map(cell => cell));
    return [
        { id: actionId('copy_latex'), kind: 'copy-latex', label: 'Copy LaTeX', latex },
        { id: actionId('copy_json'), kind: 'copy-json', label: 'Copy JSON', data: matrixJson },
        { id: actionId('use_matrix'), kind: 'use-matrix', label: 'Use Matrix', matrix, preferredName: label },
        { id: actionId('save_matrix'), kind: 'save-matrix', label: 'Save Matrix', matrix, preferredName: label },
    ];
};

export const createVectorActions = (label: string, vector: ExactVector): ExactResultAction[] => {
    const matrix = vectorToColumnMatrix(vector);
    const latex = `${label} = ${formatMatrixToLatex(matrix)}`;
    return [
        { id: actionId('copy_latex'), kind: 'copy-latex', label: 'Copy LaTeX', latex },
        { id: actionId('copy_json'), kind: 'copy-json', label: 'Copy JSON', data: vector.entries },
        { id: actionId('use_matrix'), kind: 'use-matrix', label: 'Use as Column Matrix', matrix, preferredName: label },
        { id: actionId('save_matrix'), kind: 'save-matrix', label: 'Save as Matrix', matrix, preferredName: label },
    ];
};

export const createScalarActions = (label: string, scalar: SymbolicFraction): ExactResultAction[] => {
    const latex = `${label} = ${formatSymbolicFractionToLatex(scalar)}`;
    return [
        { id: actionId('copy_latex'), kind: 'copy-latex', label: 'Copy LaTeX', latex },
        { id: actionId('copy_json'), kind: 'copy-json', label: 'Copy JSON', data: scalar },
    ];
};

export const executeExactAction = async (action: ExactResultAction, handlers: ExactActionHandlers): Promise<boolean> => {
    try {
        if (action.kind === 'copy-latex') {
            const ok = await copyToClipboard(action.latex ?? '');
            if (!ok) throw new Error('Clipboard unavailable.');
            return true;
        }

        if (action.kind === 'copy-json') {
            const ok = await copyToClipboard(JSON.stringify(action.data ?? null, null, 2));
            if (!ok) throw new Error('Clipboard unavailable.');
            return true;
        }

        if (action.kind === 'use-matrix') {
            if (!action.matrix) throw new Error('No matrix payload found for this action.');
            handlers.onUseMatrix?.(action.matrix);
            return true;
        }

        if (action.kind === 'save-matrix') {
            if (!action.matrix) throw new Error('No matrix payload found for this action.');
            handlers.onSaveMatrix?.(action.matrix, action.preferredName || 'Exact Result');
            return true;
        }

        return false;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to complete result action.';
        handlers.onError?.(message);
        return false;
    }
};

export const exportSurfaceResultsToLatex = (results: ExactSurfaceResult[]): string => {
    const sections = results
        .filter(result => result.latexBlocks.length > 0)
        .map(result => {
            const blocks = result.latexBlocks.map(block => `\\[
${block}
\\]`).join('\n\n');
            return `% ${result.title}\n${blocks}`;
        });

    return sections.join('\n\n');
};

export const exportSurfaceResultsToMarkdown = (results: ExactSurfaceResult[]): string => {
    return results
        .filter(result => result.latexBlocks.length > 0)
        .map(result => {
            const blocks = result.latexBlocks.map(block => `$$\n${block}\n$$`).join('\n\n');
            return `## ${result.title}\n\n${blocks}`;
        })
        .join('\n\n');
};
