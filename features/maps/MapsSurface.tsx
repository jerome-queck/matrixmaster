import React from 'react';
import { LatexRenderer } from '../../components/LatexRenderer';
import type { ValidMatrix } from '../../types';
import {
    analyzeLinearMapFromMatrix,
    basisRelativeRepresentation,
    buildLinearMapFromBasisImages,
    changeOfBasisMatrix,
    makeOrderedBasis,
    makeVectorFromStrings,
    matrixNamedLatex,
    parseMatrixEntries,
    similarityTransform,
    vectorSetToLatex,
    vectorsToColumnMatrix,
} from '../../engines/exact/algebraEngine';
import type { ExactResultAction, ExactSurfaceResult, LinearMapAnalysisResult } from '../../engines/exact/contracts';
import {
    createMatrixActions,
    executeExactAction,
    exportSurfaceResultsToLatex,
    exportSurfaceResultsToMarkdown,
} from '../../engines/exact/resultActions';
import {
    createStringMatrix,
    createStringVectors,
    ExactMatrixEditor,
    VectorSetEditor,
} from '../operate/ExactEditors';

interface MapsSurfaceProps {
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

const identityStringMatrix = (n: number): string[][] =>
    Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? '1' : '0')));

const identityStringVectors = (n: number): string[][] =>
    Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => (r === c ? '1' : '0')));

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

export const MapsSurface: React.FC<MapsSurfaceProps> = ({ onUseMatrix, onSaveMatrix, onError }) => {
    const [definitionMode, setDefinitionMode] = React.useState<'matrix' | 'basisImages'>('matrix');

    const [mapMatrixInput, setMapMatrixInput] = React.useState<string[][]>(identityStringMatrix(2));
    const [domainBasisInput, setDomainBasisInput] = React.useState<string[][]>(identityStringVectors(2));
    const [imageVectorsInput, setImageVectorsInput] = React.useState<string[][]>(identityStringVectors(2));

    const [relativeDomainBasisInput, setRelativeDomainBasisInput] = React.useState<string[][]>(identityStringVectors(2));
    const [relativeCodomainBasisInput, setRelativeCodomainBasisInput] = React.useState<string[][]>(identityStringVectors(2));

    const [changeFromBasisInput, setChangeFromBasisInput] = React.useState<string[][]>(identityStringVectors(2));
    const [changeToBasisInput, setChangeToBasisInput] = React.useState<string[][]>(identityStringVectors(2));

    const [similarityMatrixInput, setSimilarityMatrixInput] = React.useState<string[][]>(identityStringMatrix(2));
    const [similarityPInput, setSimilarityPInput] = React.useState<string[][]>(identityStringMatrix(2));

    const [mapAnalysis, setMapAnalysis] = React.useState<LinearMapAnalysisResult | null>(null);
    const [surfaceResults, setSurfaceResults] = React.useState<ExactSurfaceResult[]>([]);
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

    const runMapWorkflow = () => {
        try {
            let analysis: LinearMapAnalysisResult;
            if (definitionMode === 'matrix') {
                const matrix = parseMatrixEntries(mapMatrixInput, 'T-matrix');
                analysis = analyzeLinearMapFromMatrix(matrix, 'T');
            } else {
                const domainBasis = makeOrderedBasis(
                    domainBasisInput.map((entries, index) => makeVectorFromStrings(entries, `b_${index + 1}`)),
                    'B'
                );
                const images = imageVectorsInput.map((entries, index) => makeVectorFromStrings(entries, `T(b_${index + 1})`));
                analysis = buildLinearMapFromBasisImages(domainBasis, images, 'T');
            }

            setMapAnalysis(analysis);

            const mapMatrix = analysis.map.definition.matrix;
            const kernelMatrix = vectorsToColumnMatrix(analysis.kernel.basis.vectors);
            const rangeMatrix = vectorsToColumnMatrix(analysis.range.basis.vectors);

            const result: ExactSurfaceResult = {
                id: 'maps-core-analysis',
                title: 'Linear Map: Kernel / Range / Injectivity / Surjectivity',
                summary: 'Exact map analysis from matrix or basis images.',
                latexBlocks: [
                    matrixNamedLatex('A_T', mapMatrix),
                    `\ker(T) = \operatorname{span}\left\{ ${vectorSetToLatex(analysis.kernel.basis.vectors)} \right\}`,
                    `\operatorname{range}(T) = \operatorname{span}\left\{ ${vectorSetToLatex(analysis.range.basis.vectors)} \right\}`,
                    `\operatorname{rank}(T) = ${analysis.rank},\;\operatorname{nullity}(T) = ${analysis.nullity}`,
                    analysis.injective ? 'T\ \text{is injective}.' : 'T\ \text{is not injective}.',
                    analysis.surjective ? 'T\ \text{is surjective}.' : 'T\ \text{is not surjective}.',
                    analysis.bijective ? 'T\ \text{is bijective}.' : 'T\ \text{is not bijective}.',
                ],
                actions: [
                    ...createMatrixActions('A_T', mapMatrix),
                    ...createMatrixActions('KerBasis(T)', kernelMatrix),
                    ...createMatrixActions('RangeBasis(T)', rangeMatrix),
                ],
            };

            setSurfaceResults([result]);
            setStatusMessage('Linear map analysis completed exactly.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to analyze linear map.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const runRelativeRepresentation = () => {
        try {
            const mapMatrix = mapAnalysis ? mapAnalysis.map.definition.matrix : parseMatrixEntries(mapMatrixInput, 'T-matrix');
            const domainBasis = makeOrderedBasis(
                relativeDomainBasisInput.map((entries, index) => makeVectorFromStrings(entries, `b_${index + 1}`)),
                'B'
            );
            const codomainBasis = makeOrderedBasis(
                relativeCodomainBasisInput.map((entries, index) => makeVectorFromStrings(entries, `c_${index + 1}`)),
                'C'
            );

            const relative = basisRelativeRepresentation(mapMatrix, domainBasis, codomainBasis);

            const result: ExactSurfaceResult = {
                id: 'maps-relative-representation',
                title: 'Basis-Relative Representation',
                summary: 'Compute [T]_{C<-B} = C^{-1}AB.',
                latexBlocks: [
                    matrixNamedLatex('A', mapMatrix),
                    `B = \left\{ ${vectorSetToLatex(domainBasis.vectors)} \right\}`,
                    `C = \left\{ ${vectorSetToLatex(codomainBasis.vectors)} \right\}`,
                    `[T]_{C\\leftarrow B} = ${matrixNamedLatex('', relative).replace(' = ', '')}`,
                ],
                actions: createMatrixActions('[T]_{C<-B}', relative),
            };

            setSurfaceResults(prev => [...prev.filter(item => item.id !== result.id), result]);
            setStatusMessage('Basis-relative representation computed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute basis-relative representation.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const runChangeOfBasisWorkflow = () => {
        try {
            const fromBasis = makeOrderedBasis(
                changeFromBasisInput.map((entries, index) => makeVectorFromStrings(entries, `f_${index + 1}`)),
                'F'
            );
            const toBasis = makeOrderedBasis(
                changeToBasisInput.map((entries, index) => makeVectorFromStrings(entries, `g_${index + 1}`)),
                'G'
            );

            const change = changeOfBasisMatrix(fromBasis, toBasis);

            const result: ExactSurfaceResult = {
                id: 'maps-change-of-basis',
                title: 'Change of Basis Matrix',
                summary: 'Compute transition matrix P_{G<-F} = G^{-1}F.',
                latexBlocks: [
                    `F = \left\{ ${vectorSetToLatex(fromBasis.vectors)} \right\}`,
                    `G = \left\{ ${vectorSetToLatex(toBasis.vectors)} \right\}`,
                    `P_{G\\leftarrow F} = ${matrixNamedLatex('', change).replace(' = ', '')}`,
                ],
                actions: createMatrixActions('P_{G<-F}', change),
            };

            setSurfaceResults(prev => [...prev.filter(item => item.id !== result.id), result]);
            setStatusMessage('Change-of-basis matrix computed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute change-of-basis matrix.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const runSimilarityWorkflow = () => {
        try {
            const a = parseMatrixEntries(similarityMatrixInput, 'A');
            const p = parseMatrixEntries(similarityPInput, 'P');
            const transformed = similarityTransform(a, p);

            const result: ExactSurfaceResult = {
                id: 'maps-similarity',
                title: 'Similarity Transform',
                summary: 'Compute P^{-1}AP and reuse as a new matrix workflow seed.',
                latexBlocks: [
                    matrixNamedLatex('A', a),
                    matrixNamedLatex('P', p),
                    `P^{-1}AP = ${matrixNamedLatex('', transformed).replace(' = ', '')}`,
                ],
                actions: createMatrixActions('P^{-1}AP', transformed),
            };

            setSurfaceResults(prev => [...prev.filter(item => item.id !== result.id), result]);
            setStatusMessage('Similarity workflow completed exactly.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to compute similarity transform.';
            setStatusMessage(message);
            onError?.(message);
        }
    };

    const exportLatex = () => {
        if (surfaceResults.length === 0) {
            setStatusMessage('No map results to export.');
            return;
        }
        downloadText('exact-maps-results.tex', exportSurfaceResultsToLatex(surfaceResults), 'text/plain');
        setStatusMessage('LaTeX export downloaded.');
    };

    const exportMarkdown = () => {
        if (surfaceResults.length === 0) {
            setStatusMessage('No map results to export.');
            return;
        }
        downloadText('exact-maps-results.md', exportSurfaceResultsToMarkdown(surfaceResults), 'text/markdown');
        setStatusMessage('Markdown export downloaded.');
    };

    return (
        <div className="space-y-8">
            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Linear Map Definition + Kernel/Range</h3>
                <div className="flex glass-panel rounded-2xl p-1 max-w-xs">
                    <button
                        onClick={() => setDefinitionMode('matrix')}
                        className={`flex-1 py-2 rounded-xl text-sm glass-tab ${definitionMode === 'matrix' ? 'tab active' : ''}`}
                    >
                        By Matrix
                    </button>
                    <button
                        onClick={() => setDefinitionMode('basisImages')}
                        className={`flex-1 py-2 rounded-xl text-sm glass-tab ${definitionMode === 'basisImages' ? 'tab active' : ''}`}
                    >
                        By Basis Images
                    </button>
                </div>

                {definitionMode === 'matrix' ? (
                    <ExactMatrixEditor title="Map matrix A" matrix={mapMatrixInput} onChange={setMapMatrixInput} />
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <VectorSetEditor title="Ordered domain basis B" vectors={domainBasisInput} onChange={setDomainBasisInput} vectorPrefix="b" />
                        <VectorSetEditor title="Images T(b_i)" vectors={imageVectorsInput} onChange={setImageVectorsInput} vectorPrefix="Tb" />
                    </div>
                )}

                <button onClick={runMapWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Analyze Linear Map
                </button>
            </section>

            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Basis-Relative Matrix Representation</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <VectorSetEditor title="Domain basis B" vectors={relativeDomainBasisInput} onChange={setRelativeDomainBasisInput} vectorPrefix="b" />
                    <VectorSetEditor title="Codomain basis C" vectors={relativeCodomainBasisInput} onChange={setRelativeCodomainBasisInput} vectorPrefix="c" />
                </div>
                <button onClick={runRelativeRepresentation} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Compute [T]_(C&lt;-B)
                </button>
            </section>

            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Change of Basis</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <VectorSetEditor title="From basis F" vectors={changeFromBasisInput} onChange={setChangeFromBasisInput} vectorPrefix="f" />
                    <VectorSetEditor title="To basis G" vectors={changeToBasisInput} onChange={setChangeToBasisInput} vectorPrefix="g" />
                </div>
                <button onClick={runChangeOfBasisWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Compute P_(G←F)
                </button>
            </section>

            <section className="space-y-4">
                <h3 className="text-base font-semibold text-ink">Similarity Workflow</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ExactMatrixEditor title="Matrix A" matrix={similarityMatrixInput} onChange={setSimilarityMatrixInput} />
                    <ExactMatrixEditor title="Change matrix P" matrix={similarityPInput} onChange={setSimilarityPInput} />
                </div>
                <button onClick={runSimilarityWorkflow} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
                    Compute P^-1 A P
                </button>
            </section>

            {surfaceResults.length > 0 && (
                <section className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <button onClick={exportLatex} className="px-3 py-1 rounded-lg glass-btn text-xs">Export All LaTeX</button>
                        <button onClick={exportMarkdown} className="px-3 py-1 rounded-lg glass-btn text-xs">Export All Markdown</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {surfaceResults.map(result => (
                            <ResultCard key={result.id} result={result} onRunAction={runAction} />
                        ))}
                    </div>
                </section>
            )}

            {statusMessage && <p className="text-xs text-secondary">{statusMessage}</p>}
        </div>
    );
};

export default MapsSurface;
