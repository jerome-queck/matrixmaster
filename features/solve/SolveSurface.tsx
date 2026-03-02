import React from 'react';
import { LatexRenderer } from '../../components/LatexRenderer';
import {
    formatMatrixToLatex,
    formatSymbolicFractionToLatex,
    stringifySymbolicFraction,
} from '../../services/matrixService';
import type { Matrix, SystemType, ValidMatrix } from '../../types';
import { parseMatrixEntries, runSolveReuse } from '../../engines/exact/algebraEngine';
import type { ExactResultAction, ExactSurfaceResult } from '../../engines/exact/contracts';
import {
    createMatrixActions,
    executeExactAction,
    exportSurfaceResultsToLatex,
    exportSurfaceResultsToMarkdown,
} from '../../engines/exact/resultActions';
import { createStringMatrix, ExactMatrixEditor } from '../operate/ExactEditors';

type MatrixOption = { key: string; label: string };

interface SolveSurfaceProps {
    matrixOptions: MatrixOption[];
    resolveMatrixByKey: (key: string) => Matrix | null;
    onUseMatrix: (matrix: ValidMatrix) => void;
    onSaveMatrix: (matrix: ValidMatrix, preferredName: string) => void;
    onError?: (message: string) => void;
}

const downloadText = (filename: string, content: string, contentType = 'text/plain') => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

const basisListToColumnMatrix = (basis: ValidMatrix[] | null): ValidMatrix => {
    if (!basis || basis.length === 0) return [];

    const vectors = basis.map(vector => {
        if (vector.length === 0) return [] as any[];
        if ((vector[0]?.length ?? 0) === 1) {
            return vector.map(row => row[0]);
        }
        if (vector.length === 1) {
            return vector[0];
        }
        return vector.map(row => row[0]);
    });

    const ambient = vectors[0]?.length ?? 0;
    return Array.from({ length: ambient }, (_, r) => vectors.map(vector => vector[r]));
};

const ResultCard: React.FC<{
    result: ExactSurfaceResult;
    onRunAction: (action: ExactResultAction) => Promise<void>;
}> = ({ result, onRunAction }) => (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-ink">{result.title}</h4>
        <p className="text-xs text-secondary">{result.summary}</p>
        <div className="space-y-2 overflow-x-auto">
            {result.latexBlocks.map((latex, index) => (
                <div key={`${result.id}-${index}`} className="min-w-max">
                    <LatexRenderer latex={latex} />
                </div>
            ))}
        </div>
        <div className="flex flex-wrap gap-2">
            {result.actions.map(action => (
                <button key={action.id} onClick={() => onRunAction(action)} className="px-3 py-1 rounded-lg glass-btn text-xs">
                    {action.label}
                </button>
            ))}
        </div>
    </div>
);

export const SolveSurface: React.FC<SolveSurfaceProps> = ({
    matrixOptions,
    resolveMatrixByKey,
    onUseMatrix,
    onSaveMatrix,
    onError,
}) => {
    const [systemType, setSystemType] = React.useState<SystemType>('non-homogeneous');
    const [solveMatrix, setSolveMatrix] = React.useState<string[][]>(createStringMatrix(3, 4));
    const [matrixSource, setMatrixSource] = React.useState('solver');
    const [results, setResults] = React.useState<ExactSurfaceResult[]>([]);
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

    const runAction = React.useCallback(
        async (action: ExactResultAction) => {
            const ok = await executeExactAction(action, {
                onUseMatrix,
                onSaveMatrix,
                onError: (message) => {
                    setStatusMessage(message);
                    onError?.(message);
                },
            });
            if (ok) setStatusMessage(`${action.label} completed.`);
        },
        [onError, onSaveMatrix, onUseMatrix]
    );

    const loadMatrixSource = () => {
        const source = resolveMatrixByKey(matrixSource);
        if (!source) {
            setStatusMessage('Select a matrix source first.');
            return;
        }

        if (source.some(row => row.some(cell => !cell))) {
            setStatusMessage('Selected matrix has empty cells.');
            return;
        }

        const asValid = source as ValidMatrix;
        setSolveMatrix(asValid.map(row => row.map(entry => stringifySymbolicFraction(entry))));
        setStatusMessage(`Loaded ${matrixSource} for exact solve reuse.`);
    };

    const runSolveWorkflow = () => {
        try {
            const matrix = parseMatrixEntries(solveMatrix, 'Solve matrix');
            const solved = runSolveReuse(matrix, systemType);
            const calculation = solved.calculation;

            const pivotSummary: ExactSurfaceResult = {
                id: 'solve-pivot-summary',
                title: 'Pivot / Free Variable Summary',
                summary: 'RREF pivot positions and free-variable structure.',
                latexBlocks: [
                    `\text{Pivot columns} = \{${solved.pivotColumns.map(col => col + 1).join(', ')}\}`,
                    `\text{Free columns} = \{${solved.freeColumns.map(col => col + 1).join(', ')}\}`,
                    ...(solved.rrefMatrix ? [`\operatorname{RREF} = ${formatMatrixToLatex(solved.rrefMatrix)}`] : []),
                ],
                actions: solved.rrefMatrix ? createMatrixActions('RREF', solved.rrefMatrix) : [],
            };

            const solveAndDet: ExactSurfaceResult = {
                id: 'solve-core-reuse',
                title: 'Solve/Determinant/Inverse Reuse',
                summary: 'Reuse exact solve artifacts with matrix actions and export-ready LaTeX.',
                latexBlocks: [
                    ...(calculation.determinant
                        ? [`\det(A) = ${formatSymbolicFractionToLatex(calculation.determinant.value)}`]
                        : ['\\text{Determinant unavailable (non-square coefficient matrix).}']),
                    ...(calculation.inverse?.inverseMatrix
                        ? [`A^{-1} = ${formatMatrixToLatex(calculation.inverse.inverseMatrix)}`]
                        : [`\\text{Inverse: }${calculation.inverse?.reason ?? 'not available'}`]),
                    ...(calculation.homogeneousSolutionSet?.steps
                        ? [`\\text{Homogeneous solution: } ${calculation.homogeneousSolutionSet.steps[calculation.homogeneousSolutionSet.steps.length - 1]}`]
                        : []),
                    ...(calculation.solutionSetRref?.steps
                        ? [`\\text{RREF solution set: } ${calculation.solutionSetRref.steps[calculation.solutionSetRref.steps.length - 1]}`]
                        : []),
                    ...(calculation.cramersRule?.variableSolutions
                        ? [`\\text{Cramer's rule solved ${calculation.cramersRule.variableSolutions.length} variables.}`]
                        : []),
                    ...(calculation.determinant?.cofactorSteps
                        ? [`\\text{Cofactor/minor witness steps: } ${calculation.determinant.cofactorSteps.length}`]
                        : []),
                ],
                actions: [
                    ...(calculation.inverse?.inverseMatrix ? createMatrixActions('A^{-1}', calculation.inverse.inverseMatrix) : []),
                    ...(calculation.gaussJordanSteps.length > 0 && calculation.gaussJordanSteps[0].matrix
                        ? createMatrixActions('Initial', calculation.gaussJordanSteps[0].matrix)
                        : []),
                ],
            };

            const rowBasis = basisListToColumnMatrix(calculation.rowSpaceBasis);
            const colBasis = basisListToColumnMatrix(calculation.colSpaceBasis);
            const nullBasis = basisListToColumnMatrix(calculation.nullSpace?.basis ?? null);
            const rank = calculation.colSpaceBasis?.length ?? 0;
            const coeffCols = systemType === 'non-homogeneous' ? Math.max(0, (matrix[0]?.length ?? 0) - 1) : (matrix[0]?.length ?? 0);
            const nullity = calculation.nullSpace?.basis.length ?? 0;

            const spacesReuse: ExactSurfaceResult = {
                id: 'solve-space-reuse',
                title: 'Row / Column / Null Space Reuse',
                summary: 'Exact spaces routed into reusable matrix actions.',
                latexBlocks: [
                    ...(calculation.rowSpaceBasis
                        ? [`\operatorname{Row}(A) = \operatorname{span}\left\{ ${calculation.rowSpaceBasis.map(item => formatMatrixToLatex(item)).join(', ')} \right\}`]
                        : []),
                    ...(calculation.colSpaceBasis
                        ? [`\operatorname{Col}(A) = \operatorname{span}\left\{ ${calculation.colSpaceBasis.map(item => formatMatrixToLatex(item)).join(', ')} \right\}`]
                        : []),
                    ...(calculation.nullSpace?.basis
                        ? [`\operatorname{Nul}(A) = \operatorname{span}\left\{ ${calculation.nullSpace.basis.map(item => formatMatrixToLatex(item)).join(', ')} \right\}`]
                        : []),
                    `\operatorname{rank}(A) + \operatorname{nullity}(A) = ${rank} + ${nullity} = ${coeffCols}`,
                ],
                actions: [
                    ...(rowBasis.length > 0 ? createMatrixActions('RowBasis(A)', rowBasis) : []),
                    ...(colBasis.length > 0 ? createMatrixActions('ColBasis(A)', colBasis) : []),
                    ...(nullBasis.length > 0 ? createMatrixActions('NullBasis(A)', nullBasis) : []),
                ],
            };

            setResults([pivotSummary, solveAndDet, spacesReuse]);
            setStatusMessage('Exact solve reuse workflow completed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to run exact solve workflow.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const exportLatex = () => {
        if (results.length === 0) {
            setStatusMessage('No solve results to export.');
            return;
        }
        downloadText('exact-solve-results.tex', exportSurfaceResultsToLatex(results), 'text/plain');
        setStatusMessage('LaTeX export downloaded.');
    };

    const exportMarkdown = () => {
        if (results.length === 0) {
            setStatusMessage('No solve results to export.');
            return;
        }
        downloadText('exact-solve-results.md', exportSurfaceResultsToMarkdown(results), 'text/markdown');
        setStatusMessage('Markdown export downloaded.');
    };

    return (
        <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-4 space-y-3">
                <h3 className="text-base font-semibold text-ink">Exact Solve + Operate Reuse</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex glass-panel rounded-2xl p-1 max-w-sm">
                        <button
                            onClick={() => setSystemType('homogeneous')}
                            className={`flex-1 py-2 rounded-xl text-sm glass-tab ${systemType === 'homogeneous' ? 'tab active' : ''}`}
                        >
                            Homogeneous
                        </button>
                        <button
                            onClick={() => setSystemType('non-homogeneous')}
                            className={`flex-1 py-2 rounded-xl text-sm glass-tab ${systemType === 'non-homogeneous' ? 'tab active' : ''}`}
                        >
                            Non-homogeneous
                        </button>
                    </div>
                    <label className="text-xs text-secondary flex items-center gap-2">
                        Load matrix from
                        <select
                            value={matrixSource}
                            onChange={event => setMatrixSource(event.target.value)}
                            className="rounded-md glass-input px-2 py-1 text-ink"
                        >
                            {matrixOptions.map(option => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <button onClick={loadMatrixSource} className="px-3 py-1 rounded-lg glass-btn text-xs">Load Source</button>
                </div>
                <p className="text-xs text-secondary">
                    For non-homogeneous systems, provide an augmented matrix [A|b]. For homogeneous systems, provide only A.
                </p>
            </div>

            <ExactMatrixEditor title={systemType === 'non-homogeneous' ? 'Augmented matrix [A|b]' : 'Coefficient matrix A'} matrix={solveMatrix} onChange={setSolveMatrix} />

            <div className="flex flex-wrap gap-2">
                <button onClick={runSolveWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Run Exact Solve Reuse
                </button>
                <button onClick={exportLatex} className="px-3 py-1 rounded-lg glass-btn text-xs">Export LaTeX</button>
                <button onClick={exportMarkdown} className="px-3 py-1 rounded-lg glass-btn text-xs">Export Markdown</button>
            </div>

            {results.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {results.map(result => (
                        <ResultCard key={result.id} result={result} onRunAction={runAction} />
                    ))}
                </div>
            )}

            {statusMessage && <p className="text-xs text-secondary">{statusMessage}</p>}
        </div>
    );
};

export default SolveSurface;
