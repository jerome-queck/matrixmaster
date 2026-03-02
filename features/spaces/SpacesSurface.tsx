import React from 'react';
import { LatexRenderer } from '../../components/LatexRenderer';
import { stringifySymbolicFraction } from '../../services/matrixService';
import type { Matrix, ValidMatrix } from '../../types';
import {
    analyzeSpanBasisCoordinates,
    computeFundamentalSubspaces,
    computeSubspaceOperations,
    makeOrderedBasis,
    makeVectorFromStrings,
    makeVectorSet,
    matrixNamedLatex,
    parseMatrixEntries,
    vectorSetToLatex,
    vectorToColumnMatrix,
    vectorToLatex,
    vectorsToColumnMatrix,
} from '../../engines/exact/algebraEngine';
import type { ExactResultAction, ExactSurfaceResult } from '../../engines/exact/contracts';
import {
    createMatrixActions,
    createVectorActions,
    executeExactAction,
    exportSurfaceResultsToLatex,
    exportSurfaceResultsToMarkdown,
} from '../../engines/exact/resultActions';
import {
    createStringMatrix,
    createStringVector,
    createStringVectors,
    ExactMatrixEditor,
    VectorEditor,
    VectorSetEditor,
} from '../operate/ExactEditors';

type MatrixOption = { key: string; label: string };

interface SpacesSurfaceProps {
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
    summary: string;
    latexBlocks: string[];
    actions: ExactResultAction[];
    onRunAction: (action: ExactResultAction) => Promise<void>;
}> = ({ title, summary, latexBlocks, actions, onRunAction }) => (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <p className="text-xs text-secondary">{summary}</p>
        <div className="space-y-2 overflow-x-auto">
            {latexBlocks.map((latex, index) => (
                <div key={`${title}-${index}`} className="min-w-max">
                    <LatexRenderer latex={latex} />
                </div>
            ))}
        </div>
        <div className="flex flex-wrap gap-2">
            {actions.map(action => (
                <button key={action.id} onClick={() => onRunAction(action)} className="px-3 py-1 rounded-lg glass-btn text-xs">
                    {action.label}
                </button>
            ))}
        </div>
    </div>
);

export const SpacesSurface: React.FC<SpacesSurfaceProps> = ({
    matrixOptions,
    resolveMatrixByKey,
    onUseMatrix,
    onSaveMatrix,
    onResultsChange,
    onError,
}) => {
    const [spanVectors, setSpanVectors] = React.useState<string[][]>(createStringVectors(3, 3));
    const [targetVector, setTargetVector] = React.useState<string[]>(createStringVector(3));
    const [spanResults, setSpanResults] = React.useState<ExactSurfaceResult[]>([]);

    const [fundamentalMatrix, setFundamentalMatrix] = React.useState<string[][]>(createStringMatrix(3, 3));
    const [fundamentalSource, setFundamentalSource] = React.useState('analysis');
    const [fundamentalResults, setFundamentalResults] = React.useState<ExactSurfaceResult[]>([]);

    const [uBasisVectors, setUBasisVectors] = React.useState<string[][]>(createStringVectors(2, 3));
    const [wBasisVectors, setWBasisVectors] = React.useState<string[][]>(createStringVectors(2, 3));
    const [subspaceResults, setSubspaceResults] = React.useState<ExactSurfaceResult[]>([]);

    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

    const allResults = React.useMemo(
        () => [...spanResults, ...fundamentalResults, ...subspaceResults],
        [spanResults, fundamentalResults, subspaceResults]
    );

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

    React.useEffect(() => {
        onResultsChange?.(allResults);
    }, [allResults, onResultsChange]);

    const runSpanWorkflow = () => {
        try {
            const vectors = spanVectors.map((entries, index) => makeVectorFromStrings(entries, `v_${index + 1}`));
            const target = makeVectorFromStrings(targetVector, 'x');
            const set = makeVectorSet(vectors, 'S');
            const span = analyzeSpanBasisCoordinates(set, target);

            const basisMatrix = vectorsToColumnMatrix(span.extractedBasis.vectors);
            const results: ExactSurfaceResult[] = [
                {
                    id: 'spaces-span-membership',
                    title: 'Span and Independence',
                    summary: 'Witnesses for span-membership and linear independence.',
                    latexBlocks: [
                        `S = \left\{ ${vectorSetToLatex(vectors)} \right\}`,
                        `x = ${vectorToLatex(target)}`,
                        `\operatorname{rank}(S) = ${span.rankOfSet},\;\operatorname{rank}([S\mid x]) = ${span.rankOfAugmented}`,
                        `x ${span.spanMember ? '\\in' : '\\notin'} \operatorname{span}(S)`,
                        `S\ \text{is}\ ${span.independent ? '\\text{linearly independent}' : '\\text{linearly dependent}'}`,
                    ],
                    actions: [
                        ...createMatrixActions('Basis(S)', basisMatrix),
                        ...createVectorActions('x', target),
                    ],
                },
                {
                    id: 'spaces-basis-coordinates',
                    title: 'Basis Extraction and Coordinates',
                    summary: 'Extracted basis, dimension, and coordinate vector when solvable.',
                    latexBlocks: [
                        `\mathcal{B}_{\\text{extracted}} = \left\{ ${vectorSetToLatex(span.extractedBasis.vectors)} \right\}`,
                        `\dim(\operatorname{span}(S)) = ${span.extractedBasis.vectors.length}`,
                        ...(span.coordinates
                            ? [
                                  `[x]_{${span.extractedBasis.label}} = ${vectorToLatex(span.coordinates)}`,
                                  span.coordinatesUnique ? '\\text{Coordinate representation is unique.}' : '\\text{Coordinate representation is not unique.}',
                              ]
                            : ['\\text{No coordinate vector produced for the chosen basis.}']),
                    ],
                    actions: span.coordinates
                        ? [...createVectorActions('[x]_B', span.coordinates), ...createMatrixActions('B', basisMatrix)]
                        : createMatrixActions('B', basisMatrix),
                },
            ];

            setSpanResults(results);
            setStatusMessage('Span workflow computed with exact witnesses.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to run span workflow.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const loadFundamentalMatrixSource = () => {
        const source = resolveMatrixByKey(fundamentalSource);
        if (!source) {
            setStatusMessage('Select a matrix source first.');
            return;
        }
        if (source.some(row => row.some(cell => !cell))) {
            setStatusMessage('Selected matrix contains empty cells.');
            return;
        }

        const asValid = source as ValidMatrix;
        setFundamentalMatrix(asValid.map(row => row.map(entry => stringifySymbolicFraction(entry))));
        setStatusMessage(`Loaded ${fundamentalSource} for fundamental subspace analysis.`);
    };

    const runFundamentalWorkflow = () => {
        try {
            const matrix = parseMatrixEntries(fundamentalMatrix, 'A');
            const data = computeFundamentalSubspaces(matrix);

            const rowBasisMatrix = vectorsToColumnMatrix(data.rowBasis.vectors);
            const colBasisMatrix = vectorsToColumnMatrix(data.columnBasis.vectors);
            const nullBasisMatrix = vectorsToColumnMatrix(data.nullBasis.vectors);

            const result: ExactSurfaceResult = {
                id: 'spaces-fundamental',
                title: 'Fundamental Subspaces and Rank-Nullity',
                summary: 'Row/column/null spaces with exact bases and rank-nullity witness.',
                latexBlocks: [
                    matrixNamedLatex('A', matrix),
                    `\operatorname{Row}(A) = \operatorname{span}\left\{ ${vectorSetToLatex(data.rowBasis.vectors)} \right\}`,
                    `\operatorname{Col}(A) = \operatorname{span}\left\{ ${vectorSetToLatex(data.columnBasis.vectors)} \right\}`,
                    `\operatorname{Nul}(A) = \operatorname{span}\left\{ ${vectorSetToLatex(data.nullBasis.vectors)} \right\}`,
                    `\operatorname{rank}(A) = ${data.rank},\;\operatorname{nullity}(A) = ${data.nullity}`,
                    `\operatorname{rank}(A) + \operatorname{nullity}(A) = ${data.rank + data.nullity} = n`,
                ],
                actions: [
                    ...createMatrixActions('RowBasis(A)', rowBasisMatrix),
                    ...createMatrixActions('ColBasis(A)', colBasisMatrix),
                    ...createMatrixActions('NullBasis(A)', nullBasisMatrix),
                ],
            };

            setFundamentalResults([result]);
            setStatusMessage('Fundamental subspaces computed exactly.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute fundamental subspaces.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const runSubspaceWorkflow = () => {
        try {
            const uVectors = uBasisVectors.map((entries, index) => makeVectorFromStrings(entries, `u_${index + 1}`));
            const wVectors = wBasisVectors.map((entries, index) => makeVectorFromStrings(entries, `w_${index + 1}`));

            const uBasis = makeOrderedBasis(uVectors, 'U');
            const wBasis = makeOrderedBasis(wVectors, 'W');
            const data = computeSubspaceOperations(uBasis, wBasis);

            const sumMatrix = vectorsToColumnMatrix(data.sum.basis.vectors);
            const intersectionMatrix = vectorsToColumnMatrix(data.intersection.basis.vectors);

            const result: ExactSurfaceResult = {
                id: 'spaces-subspace-ops',
                title: 'Subspace Sum, Intersection, and Direct Sum',
                summary: 'Exact basis-level subspace arithmetic.',
                latexBlocks: [
                    `U = \operatorname{span}\left\{ ${vectorSetToLatex(uBasis.vectors)} \right\}`,
                    `W = \operatorname{span}\left\{ ${vectorSetToLatex(wBasis.vectors)} \right\}`,
                    `U + W = \operatorname{span}\left\{ ${vectorSetToLatex(data.sum.basis.vectors)} \right\}`,
                    `U \cap W = \operatorname{span}\left\{ ${vectorSetToLatex(data.intersection.basis.vectors)} \right\}`,
                    data.directSum
                        ? 'U \oplus W\ \text{is direct (intersection is trivial).}'
                        : 'U \oplus W\ \text{is not direct (intersection is non-trivial).}',
                ],
                actions: [
                    ...createMatrixActions('Basis(U+W)', sumMatrix),
                    ...createMatrixActions('Basis(U\\cap W)', intersectionMatrix),
                ],
            };

            setSubspaceResults([result]);
            setStatusMessage('Subspace operations completed with exact certificates.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute subspace operations.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const exportLatex = () => {
        if (allResults.length === 0) {
            setStatusMessage('No exact space results to export.');
            return;
        }
        downloadText('exact-spaces-results.tex', exportSurfaceResultsToLatex(allResults), 'text/plain');
        setStatusMessage('LaTeX export downloaded.');
    };

    const exportMarkdown = () => {
        if (allResults.length === 0) {
            setStatusMessage('No exact space results to export.');
            return;
        }
        downloadText('exact-spaces-results.md', exportSurfaceResultsToMarkdown(allResults), 'text/markdown');
        setStatusMessage('Markdown export downloaded.');
    };

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Span, Independence, Basis, Coordinates, Dimension</h3>
                <VectorSetEditor title="Generating set S" vectors={spanVectors} onChange={setSpanVectors} vectorPrefix="s" />
                <VectorEditor title="Target vector x" entries={targetVector} onChange={setTargetVector} symbol="x" />
                <button onClick={runSpanWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Run Span Workflow
                </button>
                {spanResults.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {spanResults.map(result => (
                            <ResultCard
                                key={result.id}
                                title={result.title}
                                summary={result.summary}
                                latexBlocks={result.latexBlocks}
                                actions={result.actions}
                                onRunAction={runAction}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Row / Column / Null Spaces + Rank-Nullity</h3>
                <ExactMatrixEditor title="Matrix A" matrix={fundamentalMatrix} onChange={setFundamentalMatrix} />
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-secondary flex items-center gap-2">
                        Load matrix from
                        <select
                            value={fundamentalSource}
                            onChange={event => setFundamentalSource(event.target.value)}
                            className="rounded-md glass-input px-2 py-1 text-ink"
                        >
                            {matrixOptions.map(option => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <button onClick={loadFundamentalMatrixSource} className="px-3 py-1 rounded-lg glass-btn text-xs">Load Source</button>
                    <button onClick={runFundamentalWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                        Run Fundamental Subspace Workflow
                    </button>
                </div>
                {fundamentalResults.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                        {fundamentalResults.map(result => (
                            <ResultCard
                                key={result.id}
                                title={result.title}
                                summary={result.summary}
                                latexBlocks={result.latexBlocks}
                                actions={result.actions}
                                onRunAction={runAction}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Subspace Sum / Intersection / Direct Sum</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <VectorSetEditor title="Basis candidates for U" vectors={uBasisVectors} onChange={setUBasisVectors} vectorPrefix="u" />
                    <VectorSetEditor title="Basis candidates for W" vectors={wBasisVectors} onChange={setWBasisVectors} vectorPrefix="w" />
                </div>
                <button onClick={runSubspaceWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Run Subspace Operations
                </button>
                {subspaceResults.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                        {subspaceResults.map(result => (
                            <ResultCard
                                key={result.id}
                                title={result.title}
                                summary={result.summary}
                                latexBlocks={result.latexBlocks}
                                actions={result.actions}
                                onRunAction={runAction}
                            />
                        ))}
                    </div>
                )}
            </section>

            <div className="flex flex-wrap gap-2">
                <button onClick={exportLatex} className="px-3 py-1 rounded-lg glass-btn text-xs">Export All LaTeX</button>
                <button onClick={exportMarkdown} className="px-3 py-1 rounded-lg glass-btn text-xs">Export All Markdown</button>
            </div>

            {statusMessage && <p className="text-xs text-secondary">{statusMessage}</p>}
        </div>
    );
};

export default SpacesSurface;
