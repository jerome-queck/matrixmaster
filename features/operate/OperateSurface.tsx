import React from 'react';
import { LatexRenderer } from '../../components/LatexRenderer';
import { parseInput, stringifySymbolicFraction } from '../../services/matrixService';
import type { Matrix, ValidMatrix } from '../../types';
import {
    computeMatrixVectorProduct,
    computeVectorArithmetic,
    makeVectorFromStrings,
    matrixNamedLatex,
    parseMatrixEntries,
    scalarToLatex,
    vectorToLatex,
} from '../../engines/exact/algebraEngine';
import type { ExactResultAction, ExactSurfaceResult } from '../../engines/exact/contracts';
import {
    createMatrixActions,
    createScalarActions,
    createVectorActions,
    executeExactAction,
    exportSurfaceResultsToLatex,
    exportSurfaceResultsToMarkdown,
} from '../../engines/exact/resultActions';
import {
    createStringMatrix,
    createStringVector,
    resizeStringVector,
    ExactMatrixEditor,
    VectorEditor,
} from './ExactEditors';

type MatrixOption = { key: string; label: string };

interface OperateSurfaceProps {
    matrixOptions: MatrixOption[];
    resolveMatrixByKey: (key: string) => Matrix | null;
    onUseMatrix: (matrix: ValidMatrix) => void;
    onSaveMatrix: (matrix: ValidMatrix, preferredName: string) => void;
    onResultsChange?: (results: ExactSurfaceResult[]) => void;
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

const ResultCard: React.FC<{
    title: string;
    latexBlocks: string[];
    actions: ExactResultAction[];
    onRunAction: (action: ExactResultAction) => Promise<void>;
}> = ({ title, latexBlocks, actions, onRunAction }) => (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <div className="space-y-2 overflow-x-auto">
            {latexBlocks.map((latex, index) => (
                <div key={`${title}-${index}`} className="min-w-max">
                    <LatexRenderer latex={latex} />
                </div>
            ))}
        </div>
        <div className="flex flex-wrap gap-2">
            {actions.map(action => (
                <button
                    key={action.id}
                    onClick={() => onRunAction(action)}
                    className="px-3 py-1 rounded-lg glass-btn text-xs"
                >
                    {action.label}
                </button>
            ))}
        </div>
    </div>
);

export const OperateSurface: React.FC<OperateSurfaceProps> = ({
    matrixOptions,
    resolveMatrixByKey,
    onUseMatrix,
    onSaveMatrix,
    onResultsChange,
    onError,
}) => {
    const [uEntries, setUEntries] = React.useState<string[]>(createStringVector(3));
    const [vEntries, setVEntries] = React.useState<string[]>(createStringVector(3));
    const [scalarInput, setScalarInput] = React.useState('2');

    const [matrixEntries, setMatrixEntries] = React.useState<string[][]>(createStringMatrix(3, 3));
    const [xEntries, setXEntries] = React.useState<string[]>(createStringVector(3));
    const [matrixSource, setMatrixSource] = React.useState('analysis');

    const [surfaceResults, setSurfaceResults] = React.useState<ExactSurfaceResult[]>([]);
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

    const applyAction = React.useCallback(
        async (action: ExactResultAction) => {
            const ok = await executeExactAction(action, {
                onUseMatrix,
                onSaveMatrix,
                onError: (message) => {
                    setStatusMessage(message);
                    onError?.(message);
                },
            });

            if (ok) {
                setStatusMessage(`${action.label} completed.`);
            }
        },
        [onError, onSaveMatrix, onUseMatrix]
    );

    React.useEffect(() => {
        onResultsChange?.(surfaceResults);
    }, [onResultsChange, surfaceResults]);

    const handleLoadMatrixSource = () => {
        const source = resolveMatrixByKey(matrixSource);
        if (!source) {
            setStatusMessage('Select a source matrix first.');
            return;
        }

        if (source.some(row => row.some(cell => !cell))) {
            setStatusMessage('Source matrix has empty cells. Fill them before loading here.');
            return;
        }

        const asValid = source as ValidMatrix;
        setMatrixEntries(asValid.map(row => row.map(entry => stringifySymbolicFraction(entry))));
        setXEntries(prev => resizeStringVector(prev, asValid[0]?.length ?? 1));
        setStatusMessage(`Loaded ${matrixSource} into matrix-vector workflow.`);
    };

    const runVectorArithmetic = () => {
        try {
            const u = makeVectorFromStrings(uEntries, 'u');
            const v = makeVectorFromStrings(vEntries, 'v');
            const scalar = parseInput(scalarInput.trim() || '1');

            const arithmetic = computeVectorArithmetic(u, v, scalar);
            const results: ExactSurfaceResult[] = [
                {
                    id: 'operate-vector-sum',
                    title: 'Vector Sum and Difference',
                    summary: 'Exact vector addition and subtraction.',
                    latexBlocks: [
                        `u + v = ${vectorToLatex(arithmetic.sum)}`,
                        `u - v = ${vectorToLatex(arithmetic.difference)}`,
                    ],
                    actions: [...createVectorActions('u+v', arithmetic.sum), ...createVectorActions('u-v', arithmetic.difference)],
                },
                {
                    id: 'operate-vector-scaling-dot',
                    title: 'Scaling and Dot Product',
                    summary: 'Exact scalar multiplication and inner product.',
                    latexBlocks: [
                        `${scalarToLatex(scalar)}u = ${vectorToLatex(arithmetic.scaled)}`,
                        `u \cdot v = ${scalarToLatex(arithmetic.dot)}`,
                    ],
                    actions: [...createVectorActions('a*u', arithmetic.scaled), ...createScalarActions('u\\cdot v', arithmetic.dot)],
                },
            ];

            setSurfaceResults(results);
            setStatusMessage('Vector arithmetic computed exactly.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute vector arithmetic.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const runMatrixVectorProduct = () => {
        try {
            const matrix = parseMatrixEntries(matrixEntries, 'A');
            const x = makeVectorFromStrings(xEntries, 'x');
            const product = computeMatrixVectorProduct(matrix, x);

            const result: ExactSurfaceResult = {
                id: 'operate-matrix-vector',
                title: 'Matrix-Vector Product',
                summary: 'Exact product Ax with reusable matrix/vector actions.',
                latexBlocks: [
                    matrixNamedLatex('A', matrix),
                    `x = ${vectorToLatex(x)}`,
                    `Ax = ${vectorToLatex(product.resultVector)}`,
                ],
                actions: [
                    ...createMatrixActions('A', matrix),
                    ...createVectorActions('x', x),
                    ...createVectorActions('Ax', product.resultVector),
                ],
            };

            setSurfaceResults([result]);
            setStatusMessage('Matrix-vector product computed exactly.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute matrix-vector product.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const handleExportLatex = () => {
        if (surfaceResults.length === 0) {
            setStatusMessage('No results available to export.');
            return;
        }
        downloadText('exact-operate-results.tex', exportSurfaceResultsToLatex(surfaceResults), 'text/plain');
        setStatusMessage('LaTeX export downloaded.');
    };

    const handleExportMarkdown = () => {
        if (surfaceResults.length === 0) {
            setStatusMessage('No results available to export.');
            return;
        }
        downloadText('exact-operate-results.md', exportSurfaceResultsToMarkdown(surfaceResults), 'text/markdown');
        setStatusMessage('Markdown export downloaded.');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <VectorEditor title="Vector u" entries={uEntries} onChange={setUEntries} symbol="u" />
                <VectorEditor title="Vector v" entries={vEntries} onChange={setVEntries} symbol="v" />
            </div>

            <div className="glass-panel rounded-2xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-ink">Vector Arithmetic Workflow</h4>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="text-secondary flex items-center gap-2">
                        Scalar a
                        <input
                            value={scalarInput}
                            onChange={event => setScalarInput(event.target.value)}
                            className="w-24 rounded-md glass-input px-2 py-1 text-ink"
                            placeholder="2"
                        />
                    </label>
                    <button onClick={runVectorArithmetic} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                        Compute Exact Arithmetic
                    </button>
                </div>
            </div>

            <ExactMatrixEditor title="Matrix A" matrix={matrixEntries} onChange={setMatrixEntries} />
            <VectorEditor title="Vector x" entries={xEntries} onChange={setXEntries} symbol="x" />

            <div className="glass-panel rounded-2xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-ink">Matrix-Vector Workflow</h4>
                <div className="flex flex-wrap items-center gap-3">
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
                    <button onClick={handleLoadMatrixSource} className="px-3 py-1 rounded-lg glass-btn text-xs">
                        Load Source
                    </button>
                    <button onClick={runMatrixVectorProduct} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                        Compute Ax
                    </button>
                </div>
            </div>

            {surfaceResults.length > 0 && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <button onClick={handleExportLatex} className="px-3 py-1 rounded-lg glass-btn text-xs">Export LaTeX</button>
                        <button onClick={handleExportMarkdown} className="px-3 py-1 rounded-lg glass-btn text-xs">Export Markdown</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {surfaceResults.map(result => (
                            <ResultCard
                                key={result.id}
                                title={result.title}
                                latexBlocks={result.latexBlocks}
                                actions={result.actions}
                                onRunAction={applyAction}
                            />
                        ))}
                    </div>
                </div>
            )}

            {statusMessage && <p className="text-xs text-secondary">{statusMessage}</p>}
        </div>
    );
};

export default OperateSurface;
