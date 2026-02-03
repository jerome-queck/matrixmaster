
import React from 'react';
import type { CalculationResult, RowOperationStep, DeterminantRowOpStep, ValidMatrix, SolutionResult, NullSpaceResult, SymbolicFraction, InverseResult, CramersRuleResult, AdjointMethodResult, MatrixOperationsResult, DeterminantOfOperationResult, MatrixOperationStep, AppMode, DeterminantResult, MatrixMultiplicationDetail, CofactorStep, SystemType, MatrixAnalysisResult, NumberFormatOptions, VariableAssumption, Matrix } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { formatMatrixToLatex, formatSymbolicFractionToLatex, formatVectorsToLatex, formatAugmentedMatrixToLatex, generateAssumptionSteps, parseInput, areSFEqual, formatNumericMatrixToLatex, formatNumberToLatex, symbolicFractionToNumber, toNumericMatrix, numericConditionNumber, numericTrace, addSF, multiplySF } from '../services/matrixService';
import { hashMatrix, hashNumericMatrix } from '../services/hash';
import { createLruCache } from '../services/lru';

type AllResultTypes = CalculationResult | MatrixOperationsResult | DeterminantOfOperationResult | MatrixAnalysisResult;

interface ResultsDisplayProps {
    results: AllResultTypes;
    appMode: AppMode;
    originalMatrix: ValidMatrix | null;
    analysisMatrix?: ValidMatrix | null;
    tutorMode?: boolean;
    numberFormat?: NumberFormatOptions;
    variableAssumptions?: VariableAssumption[];
    openSections: Record<string, boolean>;
    onToggleSection: (section: string) => void;
    onRequestDetails: (section: string, payload?: any) => void;
    onUseResult: (matrix: ValidMatrix) => void;
    loadingDetails: string | null;
    onExplain: (topic: string) => void;
    onInfo?: (key: string) => void;
}

// Props that are passed down through the component tree
interface SharedDisplayProps extends ResultsDisplayProps {
    handleRequestAndShowDetails: (section: string, payload?: any) => void;
    toggleDetailsVisibility: (section: string, forceCollapse?: boolean) => void;
    collapsedSections: Record<string, boolean>;
    formatMatrixCached: (matrix: ValidMatrix) => string;
    formatNumericMatrixCached: (matrix: number[][], numberFormat?: NumberFormatOptions) => string;
}

const isSystemSolverResult = (res: AllResultTypes): res is CalculationResult => 'systemType' in res;
const isMatrixOpsResult = (res: AllResultTypes): res is MatrixOperationsResult => 'finalResult' in res;
const isDeterminantOfOpsResult = (res: AllResultTypes): res is DeterminantOfOperationResult => 'operationResult' in res;
const isAnalysisResult = (res: AllResultTypes): res is MatrixAnalysisResult => 'kind' in res && res.kind === 'analysis';

const useLatexCache = () => {
    const matrixCacheRef = React.useRef(createLruCache<string>(200));
    const numericCacheRef = React.useRef(createLruCache<string>(200));

    const formatMatrixCached = React.useCallback((matrix: ValidMatrix) => {
        const key = hashMatrix(matrix);
        const cached = matrixCacheRef.current.get(key);
        if (cached) return cached;
        const latex = formatMatrixToLatex(matrix);
        matrixCacheRef.current.set(key, latex);
        return latex;
    }, []);

    const formatNumericMatrixCached = React.useCallback((matrix: number[][], numberFormat?: NumberFormatOptions) => {
        const key = `${hashNumericMatrix(matrix)}|${numberFormat?.mode ?? ''}|${numberFormat?.digits ?? ''}|${numberFormat?.fractionMaxDenominator ?? ''}`;
        const cached = numericCacheRef.current.get(key);
        if (cached) return cached;
        const latex = formatNumericMatrixToLatex(matrix, numberFormat);
        numericCacheRef.current.set(key, latex);
        return latex;
    }, []);

    return { formatMatrixCached, formatNumericMatrixCached };
};

const SummaryBar: React.FC<{ results: AllResultTypes; numberFormat?: NumberFormatOptions }> = ({ results, numberFormat }) => {
    const items: { label: string; content: React.ReactNode }[] = [];

    if (isAnalysisResult(results)) {
        items.push({ label: 'Mode', content: results.mode === 'numeric' ? 'Numeric' : 'Exact' });
        items.push({ label: 'Rank', content: results.rank });
        if (results.trace !== undefined) {
            const traceLatex = typeof results.trace === 'number' ? formatNumberToLatex(results.trace, numberFormat) : formatSymbolicFractionToLatex(results.trace);
            items.push({ label: 'Trace', content: <LatexRenderer latex={traceLatex} displayMode={false} /> });
        }
        if (results.warnings.length > 0) {
            items.push({ label: 'Warnings', content: results.warnings.length });
        }
    } else if (isMatrixOpsResult(results)) {
        items.push({ label: 'Steps', content: results.steps.length });
        if (results.conditions.length > 0) items.push({ label: 'Conditions', content: results.conditions.length });
    } else if (isDeterminantOfOpsResult(results)) {
        items.push({ label: 'Determinant', content: <LatexRenderer latex={`\\det(A) = ${formatSymbolicFractionToLatex(results.determinant.value)}`} displayMode={false} /> });
        if (results.conditions.length > 0) items.push({ label: 'Conditions', content: results.conditions.length });
    } else {
        const solver = results as CalculationResult;
        items.push({ label: 'System', content: solver.systemType === 'homogeneous' ? 'Homogeneous' : 'Non-homogeneous' });
        if (solver.solutionSetRref) {
            items.push({ label: 'Consistent', content: solver.solutionSetRref.isConsistent ? 'Yes' : 'No' });
        }
        if (solver.conditions.length > 0) items.push({ label: 'Assumptions', content: solver.conditions.length });
    }

    if (items.length === 0) return null;

    return (
        <div className="sticky top-0 z-10 mb-4">
            <div className="glass-panel rounded-2xl px-4 py-2 flex flex-wrap gap-3 items-center">
                <span className="text-xs uppercase tracking-wide text-secondary">Summary</span>
                {items.map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-ink bg-white/40 px-3 py-1 rounded-full">
                        <span className="text-xs uppercase tracking-wide text-secondary">{item.label}</span>
                        <span className="font-semibold">{item.content}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const useVirtualWindow = (itemCount: number, estimateHeight: number, overscan = 4) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = React.useState(0);
    const [viewportHeight, setViewportHeight] = React.useState(0);

    React.useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const update = () => setViewportHeight(node.clientHeight);
        update();

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(node);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            else window.removeEventListener('resize', update);
        };
    }, []);

    const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(event.currentTarget.scrollTop);
    };

    const startIndex = Math.max(0, Math.floor(scrollTop / estimateHeight) - overscan);
    const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + viewportHeight) / estimateHeight) + overscan);
    const topSpacer = startIndex * estimateHeight;
    const bottomSpacer = Math.max(0, (itemCount - endIndex - 1) * estimateHeight);

    return { containerRef, onScroll, startIndex, endIndex, topSpacer, bottomSpacer };
};

const VirtualizedList: React.FC<{
    itemCount: number;
    estimateHeight: number;
    maxHeight: number;
    className?: string;
    renderItem: (index: number) => React.ReactNode;
}> = ({ itemCount, estimateHeight, maxHeight, className, renderItem }) => {
    const { containerRef, onScroll, startIndex, endIndex, topSpacer, bottomSpacer } = useVirtualWindow(itemCount, estimateHeight);
    const items: React.ReactNode[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
        items.push(renderItem(i));
    }

    return (
        <div ref={containerRef} onScroll={onScroll} className={className} style={{ maxHeight, overflowY: 'auto' }}>
            <div style={{ height: topSpacer }} />
            {items}
            <div style={{ height: bottomSpacer }} />
        </div>
    );
};

const ResultSection: React.FC<{ title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode; isNested?: boolean; onExplain?: (topic: string) => void }> = ({ title, isOpen, onToggle, children, isNested, onExplain }) => (
    <div className={`${isNested ? 'glass-panel rounded-2xl' : 'glass-card rounded-2xl'}`}>
        <div className={`w-full p-4 flex items-center gap-2 transition-colors ${isNested ? 'hover:bg-white/10 rounded-2xl' : 'hover:bg-white/10'} ${isOpen ? (isNested ? '' : 'rounded-t-2xl') : 'rounded-2xl'}`}>
            <button
                onClick={onToggle}
                aria-expanded={isOpen}
                className="min-w-0 flex-1 flex items-center justify-between text-left"
            >
                <h2 className="text-xl font-semibold break-words w-full text-left pr-4 text-ink">{title}</h2>
                <svg className={`w-6 h-6 transform transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {onExplain && (
                <button
                    onClick={() => onExplain(title)}
                    className="p-1 rounded-full text-secondary hover:bg-white/10 transition-colors flex-shrink-0"
                    aria-label={`Explain ${title}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
        <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
            <div className="min-w-0">
                <div className={`p-4 ${isNested ? '' : 'border-t border-white/10'}`}>
                    {children}
                </div>
            </div>
        </div>
    </div>
);

const DetailsToggleButton: React.FC<{
    sectionName: string;
    detailsExist: boolean;
    onCalculate: (section: string, payload?: any) => void;
    loadingDetails: string | null;
    payload?: any;
    onClick?: () => void;
    children?: React.ReactNode;
}> = ({ sectionName, detailsExist, onCalculate, loadingDetails, payload, onClick, children }) => {
    
    const isLoadingThis = loadingDetails === sectionName;

    if (detailsExist) return null;

    const buttonContent = isLoadingThis 
        ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Calculating...</>
        : children ?? 'Calculate & Show Details';

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        if (!detailsExist) {
            onCalculate(sectionName, payload);
        }
    };
    
    return (
        <div className="mt-4 flex justify-center">
            <button
                onClick={handleClick}
                disabled={!!loadingDetails}
                className="flex items-center justify-center glass-btn glass-btn-primary font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
                {buttonContent}
            </button>
        </div>
    );
};

type MatrixLike = { length: number; [index: number]: { length: number } };

const LARGE_MATRIX_THRESHOLD = 8;
const MATRIX_MAX_HEIGHT = '60vh';
const needsVerticalScroll = (matrix?: MatrixLike | null) => (matrix?.length ?? 0) > LARGE_MATRIX_THRESHOLD;
const isLargeMatrix = (matrix?: MatrixLike | null) => {
    if (!matrix || matrix.length === 0) return false;
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    return rows > LARGE_MATRIX_THRESHOLD || cols > LARGE_MATRIX_THRESHOLD;
};

// A robust wrapper for making LaTeX content scrollable
const ScrollableLatex: React.FC<{latex: string, displayMode?: boolean, rowClassProvider?: (r: number) => string, lazy?: boolean, showCopy?: boolean, allowYScroll?: boolean, maxHeight?: string}> = ({ latex, displayMode = true, rowClassProvider, lazy, showCopy = true, allowYScroll = false, maxHeight }) => (
    <div className={`overflow-x-auto w-full p-2 flex justify-center relative ${allowYScroll ? 'overflow-y-auto' : ''}`} style={allowYScroll && maxHeight ? { maxHeight } : undefined}>
      {showCopy && (
        <button
          className="absolute right-2 top-2 px-2 py-1 rounded-md text-xs glass-btn"
          onClick={() => navigator.clipboard.writeText(latex)}
          aria-label="Copy LaTeX"
        >
          Copy LaTeX
        </button>
      )}
      <div className="min-w-max">
        <LatexRenderer latex={latex} displayMode={displayMode} rowClassProvider={rowClassProvider} lazy={lazy} />
      </div>
    </div>
);

const MatrixModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; latex: string; }> = ({ isOpen, onClose, title, latex }) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="matrix-modal-title"
        >
            <div
                className="rounded-2xl shadow-xl w-full max-w-5xl m-4 p-6 text-ink glass-panel"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 id="matrix-modal-title" className="text-xl font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-secondary hover:text-ink transition-colors"
                        aria-label="Close matrix preview"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <ScrollableLatex latex={latex} allowYScroll={true} maxHeight="75vh" />
            </div>
        </div>
    );
};

const MatrixReveal: React.FC<{
    matrix?: MatrixLike | null;
    latex: string;
    title?: string;
    rowClassProvider?: (r: number) => string;
    lazy?: boolean;
}> = ({ matrix, latex, title = 'Full Matrix', rowClassProvider, lazy }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    if (!matrix) return null;
    if (isLargeMatrix(matrix)) {
        return (
            <div className="flex flex-col items-center gap-2 w-full">
                <button onClick={() => setIsOpen(true)} className="px-3 py-2 rounded-lg glass-btn text-sm">
                    View Full Matrix
                </button>
                <MatrixModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title} latex={latex} />
            </div>
        );
    }
    return (
        <ScrollableLatex
            latex={latex}
            rowClassProvider={rowClassProvider}
            lazy={lazy}
            allowYScroll={needsVerticalScroll(matrix)}
            maxHeight={MATRIX_MAX_HEIGHT}
        />
    );
};

const AssumptionSteps: React.FC<{ condition: SymbolicFraction }> = ({ condition }) => {
    const steps = generateAssumptionSteps(condition);
    if (steps.length <= 1) return <ScrollableLatex latex={steps[0] || ''} />;
    return (
        <div className="overflow-x-auto w-full">
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 min-w-max">
                {steps.map((step, i) => (
                    <React.Fragment key={i}><LatexRenderer latex={step} />{i < steps.length - 1 && <LatexRenderer latex={`\\implies`} />}</React.Fragment>
                ))}
            </div>
        </div>
    );
};

const AssumptionsDisplay: React.FC<{ conditions: SymbolicFraction[] }> = ({ conditions }) => (
    <div className="bg-yellow-400/20 border border-yellow-500/30 text-yellow-800 rounded-lg p-4 space-y-4">
        <p className="font-bold break-words">To proceed with the calculation, the following assumptions were made. The results below are valid only if these conditions are met:</p>
        <ul className="space-y-3">{conditions.map((cond, i) => <li key={i} className="p-3 glass-panel rounded-md"><AssumptionSteps condition={cond} /></li>)}</ul>
    </div>
);

const OperationWorkingsDisplay: React.FC<{ details: MatrixMultiplicationDetail }> = ({ details }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-left">
        {details.steps.map(step => <div key={step.position} className="p-2 glass-panel rounded-xl"><ScrollableLatex latex={step.calculation} displayMode={true} /></div>)}
    </div>
);

const SummaryMessageDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="p-3 bg-blue-400/20 border border-blue-500/30 text-blue-800 rounded-lg text-sm"><p className="break-words">{message}</p></div>
);

const UserAssumptionsDisplay: React.FC<{ assumptions: VariableAssumption[] }> = ({ assumptions }) => (
    <div className="p-3 bg-emerald-400/20 border border-emerald-500/30 text-emerald-800 rounded-lg text-sm space-y-2">
        <p className="font-semibold">User Assumptions</p>
        <ul className="list-disc list-inside space-y-1">
            {assumptions.map((a, i) => (
                <li key={`${a.variable}-${i}`}>
                    <LatexRenderer latex={`\\text{${a.variable}}\\ \\text{is ${a.constraint}}`} displayMode={false} />
                </li>
            ))}
        </ul>
    </div>
);

const AnalysisResultDisplay: React.FC<{ result: MatrixAnalysisResult; analysisMatrix: ValidMatrix | null; numberFormat?: NumberFormatOptions }> = ({ result, analysisMatrix, numberFormat }) => {
    const { formatMatrixCached, formatNumericMatrixCached } = useLatexCache();
    const vectorToLatex = (values: number[]) => `\\begin{bmatrix} ${values.map(v => formatNumberToLatex(v, numberFormat)).join(' \\\\ ')} \\end{bmatrix}`;
    const [localOpen, setLocalOpen] = React.useState<Record<string, boolean>>({});
    const isOpen = (section: string) => localOpen[section] !== false;
    const toggleSection = (section: string) => {
        setLocalOpen(prev => ({ ...prev, [section]: prev[section] === undefined ? false : !prev[section] }));
    };
    const [epsilon, setEpsilon] = React.useState(1e-3);
    const [showRounding, setShowRounding] = React.useState(false);
    const numericMatrix = React.useMemo(() => {
        if (!analysisMatrix || result.mode !== 'numeric') return null;
        try { return toNumericMatrix(analysisMatrix); } catch { return null; }
    }, [analysisMatrix, result.mode]);
    const conditionNumber = React.useMemo(() => {
        if (!numericMatrix) return null;
        try { return numericConditionNumber(numericMatrix); } catch { return null; }
    }, [numericMatrix]);
    const perturbation = React.useMemo(() => {
        if (!numericMatrix) return null;
        const perturbed = numericMatrix.map(row => row.map(v => v + epsilon));
        const trace = numericTrace(numericMatrix);
        const tracePerturbed = numericTrace(perturbed);
        return {
            traceDelta: tracePerturbed - trace,
            maxDelta: epsilon,
        };
    }, [numericMatrix, epsilon]);

    return (
        <div className="space-y-4">
            {analysisMatrix && (
                <ResultSection title="Input Matrix" isOpen={isOpen("Input Matrix")} onToggle={() => toggleSection("Input Matrix")}>
                    <MatrixReveal matrix={analysisMatrix} latex={formatMatrixCached(analysisMatrix)} title="Analysis Matrix" />
                </ResultSection>
            )}
            <ResultSection title="Summary" isOpen={isOpen("Summary")} onToggle={() => toggleSection("Summary")}>
                <div className="space-y-3">
                    <div className="text-secondary"><span className="font-semibold">Rank:</span> {result.rank}</div>
                    {result.trace !== undefined && (
                        <div className="text-secondary">
                            <span className="font-semibold">Trace:</span>{' '}
                            <LatexRenderer latex={`\\operatorname{tr}(A) = ${result.mode === 'exact' ? formatSymbolicFractionToLatex(result.trace) : formatNumberToLatex(result.trace, numberFormat)}`} displayMode={false} />
                        </div>
                    )}
                    {conditionNumber !== null && Number.isFinite(conditionNumber) && (
                        <div className="text-secondary">
                            <span className="font-semibold">Condition number:</span> {conditionNumber.toExponential(2)}
                        </div>
                    )}
                    {result.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-400/20 border border-yellow-500/30 text-yellow-800 rounded-lg text-sm space-y-1">
                            {result.warnings.map((warning, i) => <p key={i}>{warning}</p>)}
                        </div>
                    )}
                </div>
            </ResultSection>

            {result.mode === 'numeric' && numericMatrix && (
                <ResultSection title="Sensitivity" isOpen={isOpen("Sensitivity")} onToggle={() => toggleSection("Sensitivity")}>
                    <div className="space-y-3 text-sm text-secondary">
                        <label className="flex items-center gap-2">
                            <span>ε</span>
                            <input type="number" value={epsilon} onChange={e => setEpsilon(parseFloat(e.target.value) || 0)} className="w-24 glass-input rounded-md px-2 py-1" />
                        </label>
                        {perturbation && (
                            <div>Trace Δ ≈ {perturbation.traceDelta.toExponential(2)} · Max Δ entry ≈ {perturbation.maxDelta}</div>
                        )}
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && numericMatrix && (
                <ResultSection title="Floating-point Error" isOpen={isOpen("Floating-point Error")} onToggle={() => toggleSection("Floating-point Error")}>
                    <div className="space-y-2 text-sm text-secondary">
                        <button onClick={() => setShowRounding(prev => !prev)} className={`px-2 py-1 rounded-lg ${showRounding ? 'glass-btn-primary text-white' : 'glass-btn'}`}>
                            {showRounding ? 'Hide rounded' : 'Show rounded'}
                        </button>
                        {showRounding && (
                            <div>
                                <div className="text-xs text-secondary mb-1">Rounded matrix (by number format)</div>
                                <MatrixReveal
                                    matrix={numericMatrix}
                                    latex={formatNumericMatrixCached(numericMatrix.map(row => row.map(v => {
                                        const digits = numberFormat?.digits ?? 6;
                                        const factor = Math.pow(10, digits);
                                        return Math.round(v * factor) / factor;
                                    })), numberFormat)}
                                    title="Rounded Matrix"
                                />
                            </div>
                        )}
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.lu && (
                <ResultSection title="LU Decomposition" isOpen={isOpen("LU Decomposition")} onToggle={() => toggleSection("LU Decomposition")}>
                    <div className="space-y-3">
                        <p className="text-secondary break-words">Permutation matrix P, lower L, and upper U such that P·A = L·U.</p>
                        <MatrixReveal matrix={result.lu.P} latex={`P = ${formatNumericMatrixCached(result.lu.P, numberFormat)}`} title="LU Decomposition (P)" />
                        <MatrixReveal matrix={result.lu.L} latex={`L = ${formatNumericMatrixCached(result.lu.L, numberFormat)}`} title="LU Decomposition (L)" />
                        <MatrixReveal matrix={result.lu.U} latex={`U = ${formatNumericMatrixCached(result.lu.U, numberFormat)}`} title="LU Decomposition (U)" />
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.qr && (
                <ResultSection title="QR Decomposition" isOpen={isOpen("QR Decomposition")} onToggle={() => toggleSection("QR Decomposition")}>
                    <div className="space-y-3">
                        <p className="text-secondary break-words">Q has orthonormal columns, and A = Q·R.</p>
                        <MatrixReveal matrix={result.qr.Q} latex={`Q = ${formatNumericMatrixCached(result.qr.Q, numberFormat)}`} title="QR Decomposition (Q)" />
                        <MatrixReveal matrix={result.qr.R} latex={`R = ${formatNumericMatrixCached(result.qr.R, numberFormat)}`} title="QR Decomposition (R)" />
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.svd && (
                <ResultSection title="Singular Value Decomposition" isOpen={isOpen("Singular Value Decomposition")} onToggle={() => toggleSection("Singular Value Decomposition")}>
                    <div className="space-y-3">
                        <p className="text-secondary break-words">A = U·S·Vᵀ (economy SVD).</p>
                        <MatrixReveal matrix={result.svd.U} latex={`U = ${formatNumericMatrixCached(result.svd.U, numberFormat)}`} title="SVD (U)" />
                        <MatrixReveal matrix={result.svd.S} latex={`S = ${formatNumericMatrixCached(result.svd.S, numberFormat)}`} title="SVD (S)" />
                        <MatrixReveal matrix={result.svd.Vt} latex={`V^T = ${formatNumericMatrixCached(result.svd.Vt, numberFormat)}`} title="SVD (V^T)" />
                        <div className="text-secondary text-sm">
                            <span className="font-semibold">Singular values:</span>{' '}
                            <LatexRenderer latex={vectorToLatex(result.svd.singularValues)} displayMode={false} />
                        </div>
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.eigen && (
                <ResultSection title="Eigen Analysis" isOpen={isOpen("Eigen Analysis")} onToggle={() => toggleSection("Eigen Analysis")}>
                    <div className="space-y-3">
                        <p className="text-secondary break-words">
                            {result.eigen.symmetric ? 'Eigenvalues and eigenvectors computed with a symmetric Jacobi solver.' : 'Eigenvalues computed with QR iteration. Eigenvectors are only available for symmetric matrices.'}
                        </p>
                        <div className="text-secondary text-sm">
                            <span className="font-semibold">Eigenvalues:</span>{' '}
                            <LatexRenderer latex={vectorToLatex(result.eigen.values)} displayMode={false} />
                        </div>
                        {result.eigen.vectors && (
                            <MatrixReveal matrix={result.eigen.vectors} latex={`V = ${formatNumericMatrixCached(result.eigen.vectors, numberFormat)}`} title="Eigenvectors" />
                        )}
                        <div className="text-xs text-secondary">Iterations: {result.eigen.iterations} · {result.eigen.converged ? 'Converged' : 'Max iterations reached'}</div>
                    </div>
                </ResultSection>
            )}
        </div>
    );
};

const DeterminantDisplay: React.FC<{ determinant: DeterminantResult } & SharedDisplayProps> = ({ determinant, onToggleSection, openSections, collapsedSections, toggleDetailsVisibility, handleRequestAndShowDetails, onExplain, loadingDetails }) => {
    const sectionName = "Determinant";
    const detailsExist = !!determinant.cofactorSteps && determinant.cofactorSteps.length > 0;
    const cofactorSectionName = "Method 1: Cofactor Expansion";
    const rowOpSectionName = "Method 2: Row Operations";

    return (
     <ResultSection title={sectionName} isOpen={!!openSections[sectionName]} onToggle={() => {
        if (!openSections[sectionName]) {
            toggleDetailsVisibility(cofactorSectionName, true);
            toggleDetailsVisibility(rowOpSectionName, true);
        }
        onToggleSection(sectionName);
    }} onExplain={onExplain}>
         <p className="text-secondary mb-2 font-semibold break-words">Final Value:</p>
         <div className="text-center text-xl sm:text-2xl font-bold p-4 glass-panel rounded-md mb-6"><ScrollableLatex latex={`\\det(A) = ${formatSymbolicFractionToLatex(determinant.value)}`} /></div>
        
        <DetailsToggleButton 
            sectionName={sectionName}
            detailsExist={detailsExist}
            onCalculate={handleRequestAndShowDetails}
            loadingDetails={loadingDetails}
        />
        
        {detailsExist && (
            <div className="space-y-4 mt-4">
                <ResultSection title={cofactorSectionName} isOpen={!collapsedSections[cofactorSectionName]} onToggle={() => toggleDetailsVisibility(cofactorSectionName)} isNested>
                    <div className="glass-panel p-4 rounded-lg space-y-4">
                         <p className="text-secondary break-words">The determinant is found by recursively breaking down the matrix into smaller 2x2 matrices.</p>
                         {determinant.summaryMessage ? <SummaryMessageDisplay message={determinant.summaryMessage} /> : <div className="text-left space-y-2">{determinant.cofactorSteps.map((step, i) => <div key={i} className="pl-2"><ScrollableLatex latex={step} displayMode={true} /></div>)}</div>}
                    </div>
                </ResultSection>

                <ResultSection title={rowOpSectionName} isOpen={!collapsedSections[rowOpSectionName]} onToggle={() => toggleDetailsVisibility(rowOpSectionName)} isNested>
                     <div className="glass-panel p-4 rounded-lg">
                        <DeterminantRowOpsRenderer steps={determinant.rowOpSteps} />
                        <div className="border-t border-[var(--glass-border)] my-6"></div>
                        <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">Final Calculation</h4></div>
                        <p className="text-secondary mb-3 break-words">{determinant.rowOpFinalCalculation.description}</p>
                        <ScrollableLatex latex={determinant.rowOpFinalCalculation.equation} />
                     </div>
                </ResultSection>
            </div>
        )}
    </ResultSection>
)};

const MatrixOperationsResultDisplay: React.FC<{ result: MatrixOperationsResult, onUseResult: (matrix: ValidMatrix) => void } & SharedDisplayProps> = ({ result, onToggleSection, openSections, onUseResult, handleRequestAndShowDetails, collapsedSections, toggleDetailsVisibility, loadingDetails, formatMatrixCached }) => {
    const [stepsOpen, setStepsOpen] = React.useState(true);
    const sectionNameForWorkings = (index: number) => `op-workings-${index}`;

    return (
    <div className="space-y-4">
        {result.conditions.length > 0 && <ResultSection title="Assumptions Made During Calculation" isOpen={!!openSections["Assumptions Made During Calculation"]} onToggle={() => onToggleSection("Assumptions Made During Calculation")}><AssumptionsDisplay conditions={result.conditions} /></ResultSection>}
        <ResultSection title="Step-by-step Calculation" isOpen={stepsOpen} onToggle={() => setStepsOpen(prev => !prev)}><div className="flex flex-col items-center space-y-4">{result.steps.map((step, index) => {
            const workingsSectionName = sectionNameForWorkings(index);
            const detailsExist = !!step.details;
            const isWorkingsCollapsed = !!collapsedSections[workingsSectionName];

            return (
            <div key={`op-step-${index}`} className="flex flex-col items-center w-full space-y-2 p-4 glass-panel rounded-lg">
                <div className="flex flex-col items-center text-primary w-full">
                    <div className="mt-1 px-3 py-1 glass-panel rounded-md shadow-inner text-center w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                </div>
                <div className="glass-panel p-2 rounded-lg my-2 w-full">
                    <MatrixReveal matrix={step.result} latex={`= ${formatMatrixCached(step.result)}`} title="Operation Result" />
                </div>
                
                {detailsExist && (
                     <button
                        onClick={() => toggleDetailsVisibility(workingsSectionName)}
                        className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 text-sm"
                    >
                        {isWorkingsCollapsed ? "Show Workings" : "Hide Workings"}
                    </button>
                )}

                {!detailsExist && (
                     <DetailsToggleButton 
                        sectionName={workingsSectionName}
                        detailsExist={false}
                        onCalculate={() => handleRequestAndShowDetails("matrixOperations")}
                        loadingDetails={loadingDetails}
                    >Show Workings</DetailsToggleButton>
                )}
                
                {detailsExist && !isWorkingsCollapsed && <OperationWorkingsDisplay details={step.details!} />}
            </div>
            )
        })}</div></ResultSection>
        <ResultSection title="Final Result" isOpen={true} onToggle={() => {}}>
            <div className="p-4 glass-panel rounded-lg w-full">
                <MatrixReveal matrix={result.finalResult} latex={formatMatrixCached(result.finalResult)} title="Final Result" />
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={() => onUseResult(result.finalResult)} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Use Result...</button>
            </div>
        </ResultSection>
    </div>
)};

const DeterminantOfOperationResultDisplay: React.FC<{ result: DeterminantOfOperationResult, onUseResult: (matrix: ValidMatrix) => void } & SharedDisplayProps> = ({ result, ...props }) => (
    <div className="space-y-4">
        {result.conditions.length > 0 && <ResultSection title="Assumptions Made During Calculation" isOpen={!!props.openSections["Assumptions Made During Calculation"]} onToggle={() => props.onToggleSection("Assumptions Made During Calculation")}><AssumptionsDisplay conditions={result.conditions} /></ResultSection>}
        <ResultSection title="Matrix Operation Evaluation" isOpen={!!props.openSections["Matrix Operation Evaluation"]} onToggle={() => props.onToggleSection("Matrix Operation Evaluation")}><MatrixOperationsResultDisplay result={result.operationResult} {...props} /></ResultSection>
        <DeterminantDisplay determinant={result.determinant} {...props} />
    </div>
);

const SystemSolverResultDisplay: React.FC<SharedDisplayProps> = (props) => {
    const { results, originalMatrix, onToggleSection, openSections, toggleDetailsVisibility } = props;
    const calcResults = results as CalculationResult;
    const allCalcSteps = calcResults.gaussJordanSteps;
    const firstBackwardStepIndex = allCalcSteps.findIndex(step => step.operation.startsWith('R_') && (step.operation.includes('\\to \\left(') || step.operation.includes('Eliminate upward')));
    const splitIndex = firstBackwardStepIndex === -1 ? allCalcSteps.length : firstBackwardStepIndex;
    const refSteps = allCalcSteps.slice(0, splitIndex);
    const rrefSteps = allCalcSteps.slice(splitIndex);
    const finalRefMatrix = refSteps.length > 0 && refSteps[refSteps.length - 1].matrix ? refSteps[refSteps.length - 1].matrix! : (originalMatrix || []);
    const finalRrefMatrix = allCalcSteps.length > 0 && allCalcSteps[allCalcSteps.length - 1].matrix ? allCalcSteps[allCalcSteps.length - 1].matrix! : (originalMatrix || []);
    
    const numRows = originalMatrix ? originalMatrix.length : 0;
    const numCols = originalMatrix && originalMatrix.length > 0 ? originalMatrix[0].length : 0;
    const coeffCols = calcResults.systemType === 'non-homogeneous' ? numCols - 1 : numCols;
    const isCoeffMatrixSquare = numRows > 0 && numRows === coeffCols;
    
    const refSectionName = "Row Echelon Form (REF)";
    const rrefSectionName = "Reduced Row Echelon Form (RREF)";
    const solutionSetRefSectionName = "Solution Set (via Back Substitution)";
    const solutionSetRrefSectionName = "Solution Set (from RREF)";
    const homogeneousSolutionSetSectionName = "Solution Set";
    const inverseSectionName = "Matrix Inverse";
    const cramersRuleSectionName = "Cramer's Rule";
    const nullSpaceSectionName = "Null Space (Kernel)";

    return (
        <div className="space-y-4">
            {calcResults.conditions.length > 0 && <ResultSection title="Assumptions Made During Calculation" isOpen={!!openSections["Assumptions Made During Calculation"]} onToggle={() => onToggleSection("Assumptions Made During Calculation")}><AssumptionsDisplay conditions={calcResults.conditions} /></ResultSection>}
            
            <ResultSection title={refSectionName} isOpen={!!openSections[refSectionName]} onToggle={() => {
                if (!openSections[refSectionName]) { toggleDetailsVisibility(refSectionName, true); }
                onToggleSection(refSectionName);
            }} onExplain={props.onExplain}>
                <p className="text-secondary mb-2 font-semibold break-words">Final Matrix:</p>
                <div className="p-4 glass-panel rounded-lg w-full mb-6">
                    <MatrixReveal matrix={finalRefMatrix} latex={formatAugmentedMatrixToLatex(finalRefMatrix, calcResults.systemType)} title="Final REF" />
                </div>
                <StepsSection sectionName={refSectionName} steps={refSteps} formName="Row Echelon Form" systemType={calcResults.systemType} summaryMessage={calcResults.summaryMessage} {...props} />
            </ResultSection>

            {calcResults.solutionSetRef && <ResultSection title={solutionSetRefSectionName} isOpen={!!openSections[solutionSetRefSectionName]} onToggle={() => {
                if (!openSections[solutionSetRefSectionName]) { toggleDetailsVisibility(solutionSetRefSectionName, true); }
                onToggleSection(solutionSetRefSectionName);
            }}><SolutionDisplay result={calcResults.solutionSetRef} {...props} sectionName={solutionSetRefSectionName} /></ResultSection>}
            
            <ResultSection title={rrefSectionName} isOpen={!!openSections[rrefSectionName]} onToggle={() => {
                if (!openSections[rrefSectionName]) { toggleDetailsVisibility(rrefSectionName, true); }
                onToggleSection(rrefSectionName);
            }} onExplain={props.onExplain}>
                <p className="text-secondary mb-2 font-semibold break-words">Final Matrix:</p>
                <div className="p-4 glass-panel rounded-lg w-full mb-6">
                    <MatrixReveal matrix={finalRrefMatrix} latex={formatAugmentedMatrixToLatex(finalRrefMatrix, calcResults.systemType)} title="Final RREF" />
                </div>
                 <StepsSection sectionName={rrefSectionName} steps={rrefSteps} formName="Reduced Row Echelon Form" systemType={calcResults.systemType} summaryMessage={calcResults.summaryMessage} {...props} />
            </ResultSection>

            {calcResults.solutionSetRref && <ResultSection title={solutionSetRrefSectionName} isOpen={!!openSections[solutionSetRrefSectionName]} onToggle={() => {
                if (!openSections[solutionSetRrefSectionName]) { toggleDetailsVisibility(solutionSetRrefSectionName, true); }
                onToggleSection(solutionSetRrefSectionName);
            }}><SolutionDisplay result={calcResults.solutionSetRref} {...props} sectionName={solutionSetRrefSectionName} /></ResultSection>}
            
            {calcResults.homogeneousSolutionSet && <ResultSection title={homogeneousSolutionSetSectionName} isOpen={!!openSections[homogeneousSolutionSetSectionName]} onToggle={() => {
                if (!openSections[homogeneousSolutionSetSectionName]) { toggleDetailsVisibility(homogeneousSolutionSetSectionName, true); }
                onToggleSection(homogeneousSolutionSetSectionName);
            }}><SolutionDisplay result={calcResults.homogeneousSolutionSet} {...props} sectionName={homogeneousSolutionSetSectionName} /></ResultSection>}
            
            {calcResults.determinant && <DeterminantDisplay determinant={calcResults.determinant} {...props} />}
            
            {calcResults.inverse && <ResultSection title={inverseSectionName} isOpen={!!openSections[inverseSectionName]} onToggle={() => {
                if (!openSections[inverseSectionName]) { 
                    toggleDetailsVisibility("Method 1: Gauss-Jordan Elimination", true);
                    toggleDetailsVisibility("Method 2: Adjoint Method", true);
                    toggleDetailsVisibility("Verification", true);
                    toggleDetailsVisibility("verification-workings-1", true);
                    toggleDetailsVisibility("verification-workings-2", true);
                }
                onToggleSection(inverseSectionName);
            }} onExplain={props.onExplain}><InverseMatrixDisplay result={calcResults.inverse} {...props}/></ResultSection>}
            
            {isCoeffMatrixSquare && <ResultSection title={cramersRuleSectionName} isOpen={!!openSections[cramersRuleSectionName]} onToggle={() => {
                if (!openSections[cramersRuleSectionName]) { toggleDetailsVisibility(cramersRuleSectionName, true); }
                onToggleSection(cramersRuleSectionName);
            }} onExplain={props.onExplain}><CramersRuleDisplay result={calcResults.cramersRule} {...props} systemType={calcResults.systemType} numRows={numRows} /></ResultSection>}
            
            {calcResults.rowSpaceBasis && <ResultSection title="Row Space" isOpen={!!openSections["Row Space"]} onToggle={() => onToggleSection("Row Space")} onExplain={props.onExplain}><BasisDisplay title="Row(A)" basis={calcResults.rowSpaceBasis} explanation={<p className="text-secondary break-words">The basis for the row space is the set of non-zero rows from the Row Echelon Form of the matrix.</p>} /></ResultSection>}
            
            {calcResults.colSpaceBasis && <ResultSection title="Column Space" isOpen={!!openSections["Column Space"]} onToggle={() => onToggleSection("Column Space")} onExplain={props.onExplain}><BasisDisplay title="Col(A)" basis={calcResults.colSpaceBasis} explanation={<p className="text-secondary break-words">The basis for the column space is the set of columns from the *original* matrix that correspond to the pivot columns in the Row Echelon Form.</p>} /></ResultSection>}
            
            {calcResults.nullSpace && <ResultSection title={nullSpaceSectionName} isOpen={!!openSections[nullSpaceSectionName]} onToggle={() => {
                if (!openSections[nullSpaceSectionName]) { toggleDetailsVisibility(nullSpaceSectionName, true); }
                onToggleSection(nullSpaceSectionName);
            }} onExplain={props.onExplain}><NullSpaceDisplay result={calcResults.nullSpace} {...props} sectionName={nullSpaceSectionName} /></ResultSection>}
        </div>
    );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = (props) => {
    const { results, onUseResult } = props;
    const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});
    const assumptions = props.variableAssumptions || [];
    const { formatMatrixCached, formatNumericMatrixCached } = useLatexCache();

    const constraintWarnings = React.useMemo(() => {
        if (assumptions.length === 0) return [];
        const matrices: (Matrix | null)[] = [];
        matrices.push(props.originalMatrix || null);
        matrices.push(props.analysisMatrix || null);
        if (isMatrixOpsResult(results)) matrices.push(results.finalResult);
        if (isDeterminantOfOpsResult(results)) matrices.push(results.operationResult.finalResult);
        const warnings: string[] = [];
        const checkValue = (value: number, assumption: VariableAssumption) => {
            if (assumption.constraint === 'nonzero' && Math.abs(value) < 1e-12) return `${assumption.variable} is assumed nonzero but encountered 0.`;
            if (assumption.constraint === 'positive' && value <= 0) return `${assumption.variable} is assumed positive but encountered ${value}.`;
            if (assumption.constraint === 'negative' && value >= 0) return `${assumption.variable} is assumed negative but encountered ${value}.`;
            if (assumption.constraint === 'integer' && Math.abs(value - Math.round(value)) > 1e-10) return `${assumption.variable} is assumed integer but encountered ${value}.`;
            return null;
        };
        matrices.forEach(matrix => {
            if (!matrix) return;
            matrix.forEach(row => row.forEach(cell => {
                const numeric = cell ? symbolicFractionToNumber(cell) : null;
                if (numeric === null) return;
                assumptions.forEach(a => {
                    const warning = checkValue(numeric, a);
                    if (warning) warnings.push(warning);
                });
            }));
        });
        return warnings;
    }, [assumptions, props.originalMatrix, props.analysisMatrix, results]);

    const handleRequestAndShowDetails = (section: string, payload?: any) => {
        setCollapsedSections(prev => ({ ...prev, [section]: false }));
        props.onRequestDetails(section, payload);
    };

    const toggleDetailsVisibility = (section: string, forceCollapse?: boolean) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: forceCollapse === true ? true : !prev[section],
        }));
    };

    const sharedProps: SharedDisplayProps = { 
        ...props,
        collapsedSections,
        toggleDetailsVisibility,
        handleRequestAndShowDetails,
        formatMatrixCached,
        formatNumericMatrixCached
    };

    return (
        <div className="space-y-4">
            <SummaryBar results={results} numberFormat={props.numberFormat} />
            {assumptions.length > 0 && <UserAssumptionsDisplay assumptions={assumptions} />}
            {constraintWarnings.length > 0 && (
                <div className="p-3 bg-red-400/20 border border-red-500/30 rounded-lg text-sm space-y-1">
                    <div className="font-semibold text-red-700 ">Constraint Violations</div>
                    {constraintWarnings.map((w, i) => <div key={i} className="text-red-700 ">{w}</div>)}
                </div>
            )}
            {isSystemSolverResult(results) && <SystemSolverResultDisplay {...sharedProps} />}
            {isMatrixOpsResult(results) && <MatrixOperationsResultDisplay result={results} onUseResult={onUseResult} {...sharedProps} />}
            {isDeterminantOfOpsResult(results) && <DeterminantOfOperationResultDisplay result={results} onUseResult={onUseResult} {...sharedProps} />}
            {isAnalysisResult(results) && <AnalysisResultDisplay result={results} analysisMatrix={props.analysisMatrix || null} numberFormat={props.numberFormat} />}
        </div>
    );
};

const StepsSection: React.FC<{ sectionName: string, steps: RowOperationStep[], formName: string, systemType: SystemType, summaryMessage?: string } & SharedDisplayProps> = 
({ sectionName, steps, formName, systemType, summaryMessage, collapsedSections, toggleDetailsVisibility, handleRequestAndShowDetails, loadingDetails, tutorMode, onInfo }) => {
    const detailsExist = steps.every(step => step.matrix);
    const isCollapsed = !!collapsedSections[sectionName];

    return (
        <>
            <DetailsToggleButton
                sectionName={sectionName}
                detailsExist={detailsExist}
                onCalculate={handleRequestAndShowDetails}
                loadingDetails={loadingDetails}
            />
            {detailsExist && (
                <>
                    <button onClick={() => toggleDetailsVisibility(sectionName)} className="mt-4 flex justify-center w-full text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                        {isCollapsed ? 'Show Step-by-step Calculation' : 'Hide Step-by-step Calculation'}
                    </button>
                    <div className={`accordion-content ${!isCollapsed ? 'open' : ''}`}>
                        <div className="pt-4 border-t border-[var(--glass-border)] mt-4">
                            {summaryMessage && <SummaryMessageDisplay message={summaryMessage} />}
                            <StepsRenderer steps={steps} formName={formName} systemType={systemType} tutorMode={tutorMode} onInfo={onInfo} />
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

const StepsRenderer: React.FC<{steps: RowOperationStep[], formName: string, systemType: 'homogeneous' | 'non-homogeneous', isAugmented?: boolean, augmentedCols?: number, tutorMode?: boolean, onInfo?: (key: string) => void}> = ({ steps, formName, systemType, isAugmented = true, augmentedCols = 1, tutorMode = false, onInfo }) => { 
    const [viewMode, setViewMode] = React.useState<'list' | 'side-by-side' | 'timeline'>('list');
    const [timelineIndex, setTimelineIndex] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [bookmarks, setBookmarks] = React.useState<number[]>([]);
    const [highlightDiff, setHighlightDiff] = React.useState(false);
    const [verifyInputs, setVerifyInputs] = React.useState<Record<number, string>>({});
    const [verifyResults, setVerifyResults] = React.useState<Record<number, { ok: boolean; mismatches: number[] }>>({});

    const applyRowOperation = (matrix: ValidMatrix, input: string): ValidMatrix => {
        const tokens = input.trim().toLowerCase().split(/\s+/);
        if (tokens.length < 3) throw new Error('Use: swap r1 r2 | scale r1 k | add r1 r2 k');
        const clone = matrix.map(row => row.map(cell => cell));
        if (tokens[0] === 'swap') {
            const r1 = parseInt(tokens[1].replace('r', ''), 10) - 1;
            const r2 = parseInt(tokens[2].replace('r', ''), 10) - 1;
            [clone[r1], clone[r2]] = [clone[r2], clone[r1]];
            return clone;
        }
        if (tokens[0] === 'scale') {
            const r = parseInt(tokens[1].replace('r', ''), 10) - 1;
            const k = parseInput(tokens[2]);
            clone[r] = clone[r].map(cell => multiplySF(cell as any, k));
            return clone;
        }
        if (tokens[0] === 'add') {
            const r1 = parseInt(tokens[1].replace('r', ''), 10) - 1;
            const r2 = parseInt(tokens[2].replace('r', ''), 10) - 1;
            const k = parseInput(tokens[3] || '1');
            clone[r1] = clone[r1].map((cell, idx) => addSF(cell as any, multiplySF(clone[r2][idx] as any, k)));
            return clone;
        }
        throw new Error('Unsupported operation.');
    };

    const handleVerifyStep = (index: number, step: RowOperationStep) => {
        try {
            if (!step.matrixBefore || !step.matrix) throw new Error('Step data unavailable.');
            const input = verifyInputs[index] || '';
            const computed = applyRowOperation(step.matrixBefore, input);
            const mismatches: number[] = [];
            computed.forEach((row, r) => {
                for (let c = 0; c < row.length; c++) {
                    if (!areSFEqual(row[c], step.matrix![r][c])) {
                        mismatches.push(r);
                        break;
                    }
                }
            });
            setVerifyResults(prev => ({ ...prev, [index]: { ok: mismatches.length === 0, mismatches } }));
        } catch {
            setVerifyResults(prev => ({ ...prev, [index]: { ok: false, mismatches: [-1] } }));
        }
    };

    const explainOperation = (operation: string) => {
        const swap = operation.match(/R_\\{(\\d+)\\}.*leftrightarrow.*R_\\{(\\d+)\\}/);
        if (swap) return `Swap row ${swap[1]} with row ${swap[2]} to move a better pivot into place.`;

        const scale = operation.match(/R_\\{(\\d+)\\}.*\\left\\((.+)\\) R_\\{\\d+\\}/);
        if (scale && !operation.includes('-')) return `Scale row ${scale[1]} by ${scale[2]} to normalize the pivot.`;

        const add = operation.match(/R_\\{(\\d+)\\}.*R_\\{\\d+\\}.*\\left\\((.+)\\).*R_\\{(\\d+)\\}/);
        if (add) return `Combine row ${add[1]} with a multiple of row ${add[3]} to create a zero in the pivot column.`;

        return 'Apply a row operation to simplify the system and reveal pivots.';
    };

    if (!steps || steps.length === 0) {
        return (
            <div className="text-center glass-panel p-4 rounded-lg">
                <p className="text-secondary break-words">No operations were needed for this phase.</p>
            </div>
        );
    }
    
    const isFirstStepAPlaceholder = steps[0].operation === 'Initial Matrix' || steps[0].operation === 'Start with [A|I]';
    
    const initialMatrix = isFirstStepAPlaceholder ? steps[0].matrix : steps[0].matrixBefore;
    const actualSteps = isFirstStepAPlaceholder ? steps.slice(1) : steps;

    const matrixFormatter = (m: ValidMatrix) => isAugmented ? formatAugmentedMatrixToLatex(m, systemType, augmentedCols) : props.formatMatrixCached(m);

    const maxMatrixRows = React.useMemo(() => {
        const sizes = actualSteps.map(step => step.matrix?.length ?? step.matrixBefore?.length ?? 0);
        const initialSize = initialMatrix?.length ?? 0;
        return Math.max(initialSize, ...sizes);
    }, [actualSteps, initialMatrix]);

    const maxMatrixCols = React.useMemo(() => {
        const sizes = actualSteps.map(step => step.matrix?.[0]?.length ?? step.matrixBefore?.[0]?.length ?? 0);
        const initialSize = initialMatrix?.[0]?.length ?? 0;
        return Math.max(initialSize, ...sizes);
    }, [actualSteps, initialMatrix]);
    
    const rowHasChanged = (rowA: SymbolicFraction[], rowB: SymbolicFraction[]) => {
        if (rowA.length !== rowB.length) return true;
        for (let i = 0; i < rowA.length; i++) {
            if (!areSFEqual(rowA[i], rowB[i])) return true;
        }
        return false;
    };
    
    if (actualSteps.length === 0 && isFirstStepAPlaceholder) {
        return (
            <div className="text-center glass-panel p-4 rounded-lg">
                <p className="text-secondary mb-4 break-words">No operations were needed. The starting matrix is already in {formName}.</p>
                {initialMatrix && (
                    <div className="glass-panel p-2 rounded-lg w-full">
                        <MatrixReveal matrix={initialMatrix} latex={matrixFormatter(initialMatrix)} title="Initial Matrix" />
                    </div>
                )}
            </div>
        );
    }

    const pivotIndices = React.useMemo(() => {
        const matches = actualSteps.map((step, index) => {
            const op = step.operation || '';
            const isSwap = /leftrightarrow/.test(op);
            const isScale = /R_\\{\\d+\\}.*\\left\\(.+\\)\\s*R_\\{\\d+\\}/.test(op);
            return isSwap || isScale ? index : -1;
        }).filter(index => index >= 0);
        return matches;
    }, [actualSteps]);

    React.useEffect(() => {
        if (timelineIndex > actualSteps.length - 1) {
            setTimelineIndex(Math.max(0, actualSteps.length - 1));
        }
    }, [actualSteps.length, timelineIndex]);

    React.useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setTimelineIndex(prev => {
                if (prev >= actualSteps.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 800);
        return () => clearInterval(interval);
    }, [isPlaying, actualSteps.length]);

    const toggleBookmark = () => {
        setBookmarks(prev => {
            if (prev.includes(timelineIndex)) {
                return prev.filter(i => i !== timelineIndex);
            }
            return [...prev, timelineIndex].sort((a, b) => a - b);
        });
    };

    const jumpToNextPivot = () => {
        const next = pivotIndices.find(i => i > timelineIndex);
        if (next !== undefined) setTimelineIndex(next);
    };

    const jumpToPrevPivot = () => {
        const prev = [...pivotIndices].reverse().find(i => i < timelineIndex);
        if (prev !== undefined) setTimelineIndex(prev);
    };

    const shouldVirtualizeSteps = actualSteps.length > 30 && maxMatrixRows <= LARGE_MATRIX_THRESHOLD && maxMatrixCols <= LARGE_MATRIX_THRESHOLD;
    const stepList = (index: number) => {
        const step = actualSteps[index];
        const lazy = shouldVirtualizeSteps;
        const verify = verifyResults[index];
        const rowProvider = (r: number) => {
            if (verify && verify.mismatches.includes(r)) return 'bg-red-200/60';
            if (highlightDiff && step.matrixBefore && rowHasChanged(step.matrixBefore![r], step.matrix![r])) return 'bg-amber-100/60';
            return '';
        };
        return (
            <div key={`${formName}-step-${index}`} className="flex flex-col items-center w-full space-y-2 mb-4">
                <div className="flex flex-col items-center text-primary w-full">
                    <LatexRenderer latex={`\\downarrow`} displayMode={true} />
                    <div className="mt-1 px-3 py-1 glass-panel rounded-xl text-center w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                </div>
                {step.description && <p className="text-sm text-secondary italic mt-2 text-center break-words">{step.description}</p>}
                {tutorMode && <div className="text-xs text-secondary glass-panel rounded-md px-3 py-2 text-center">{explainOperation(step.operation)}</div>}
                {step.matrix ? (
                    <div className="glass-panel p-2 rounded-2xl w-full">
                        <MatrixReveal
                            matrix={step.matrix}
                            latex={matrixFormatter(step.matrix)}
                            title="Step Matrix"
                            lazy={lazy}
                            rowClassProvider={rowProvider}
                        />
                    </div>
                ) : (
                    <p className="text-sm text-secondary">(Intermediate matrix hidden for performance)</p>
                )}
                {step.matrixBefore && (
                    <div className="w-full flex flex-wrap gap-2 items-center">
                        <input
                            value={verifyInputs[index] || ''}
                            onChange={(e) => setVerifyInputs(prev => ({ ...prev, [index]: e.target.value }))}
                            placeholder="swap r1 r2 | scale r1 2 | add r1 r2 -3"
                            className="flex-1 rounded-md glass-input px-2 py-1 text-xs"
                        />
                        <button onClick={() => handleVerifyStep(index, step)} className="px-2 py-1 rounded-lg glass-btn text-xs">Verify</button>
                        {verify && <span className={`text-xs ${verify.ok ? 'text-emerald-600' : 'text-red-600'}`}>{verify.ok ? 'OK' : 'Mismatch'}</span>}
                    </div>
                )}
            </div>
        );
    };
    const stepSideBySide = (index: number) => {
        const step = actualSteps[index];
        const lazy = shouldVirtualizeSteps;
        return (
            <div key={`${formName}-sbs-step-${index}`} className="p-4 glass-panel rounded-2xl space-y-2 mb-4">
                <div className="px-3 py-1 glass-panel rounded-xl text-center w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                {step.description && <p className="text-sm text-secondary italic text-center break-words">{step.description}</p>}
                {tutorMode && <div className="text-xs text-secondary glass-panel rounded-md px-3 py-2 text-center">{explainOperation(step.operation)}</div>}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center">
                    <div className="w-full">
                        {step.matrixBefore && (
                            <MatrixReveal
                                matrix={step.matrixBefore}
                                latex={matrixFormatter(step.matrixBefore)}
                                title="Matrix Before"
                                rowClassProvider={(r) => rowHasChanged(step.matrixBefore![r], step.matrix![r]) ? 'bg-cyan-100/50' : ''}
                                lazy={lazy}
                            />
                        )}
                    </div>
                    <div className="hidden md:block text-primary"><LatexRenderer latex={`\\Rightarrow`} displayMode={true} /></div>
                    <div className="w-full">
                        {step.matrix && (
                            <MatrixReveal
                                matrix={step.matrix}
                                latex={matrixFormatter(step.matrix)}
                                title="Matrix After"
                                rowClassProvider={(r) => rowHasChanged(step.matrixBefore![r], step.matrix![r]) ? 'bg-cyan-100/50' : ''}
                                lazy={lazy}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center space-y-4">
             <div className="flex self-end items-center text-sm flex-wrap gap-2">
                <span className="mr-2 text-secondary">View:</span>
                <div className="flex glass-panel rounded-2xl p-1">
                    <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded-xl transition-colors text-xs glass-tab ${viewMode==='list' ? 'tab active' : ''}`}>List</button>
                    <button onClick={() => setViewMode('side-by-side')} className={`px-2 py-1 rounded-xl transition-colors text-xs glass-tab ${viewMode==='side-by-side' ? 'tab active' : ''}`}>Side-by-Side</button>
                    <button onClick={() => setViewMode('timeline')} className={`px-2 py-1 rounded-xl transition-colors text-xs glass-tab ${viewMode==='timeline' ? 'tab active' : ''}`}>Timeline</button>
                </div>
                <button onClick={() => setHighlightDiff(prev => !prev)} className={`px-2 py-1 rounded-xl text-xs ${highlightDiff ? 'glass-btn-primary' : 'glass-btn'}`}>{highlightDiff ? 'Diff On' : 'Diff Off'}</button>
                {onInfo && (
                    <button
                        type="button"
                        onClick={() => onInfo('timeline')}
                        className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] info-dot"
                        aria-label="Step timeline info"
                    >
                        i
                    </button>
                )}
             </div>

            {initialMatrix && (
                <>
                    <p className="text-secondary break-words">
                        {isFirstStepAPlaceholder ? "Starting with the initial matrix:" : "Starting matrix for this phase:"}
                    </p>
                    <div className="glass-panel p-2 rounded-2xl w-full">
                        <MatrixReveal
                            matrix={initialMatrix}
                            latex={matrixFormatter(initialMatrix)}
                            title="Initial Matrix"
                            lazy={shouldVirtualizeSteps}
                        />
                    </div>
                </>
            )}

            {viewMode === 'list' ? (
                shouldVirtualizeSteps ? (
                    <VirtualizedList
                        itemCount={actualSteps.length}
                        estimateHeight={260}
                        maxHeight={560}
                        className="w-full pr-1"
                        renderItem={stepList}
                    />
                ) : (
                    <div className="w-full">
                        {actualSteps.map((_, index) => stepList(index))}
                    </div>
                )
            ) : viewMode === 'side-by-side' ? (
                shouldVirtualizeSteps ? (
                    <VirtualizedList
                        itemCount={actualSteps.length}
                        estimateHeight={320}
                        maxHeight={560}
                        className="w-full pr-1"
                        renderItem={stepSideBySide}
                    />
                ) : (
                    <div className="w-full">
                        {actualSteps.map((_, index) => stepSideBySide(index))}
                    </div>
                )
            ) : (
                <div className="w-full space-y-4">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsPlaying(p => !p)} className="px-3 py-1 rounded-xl glass-btn glass-btn-primary text-xs">{isPlaying ? 'Pause' : 'Play'}</button>
                            <button onClick={() => setTimelineIndex(0)} className="px-3 py-1 rounded-xl glass-btn text-xs">Start</button>
                            <button onClick={() => setTimelineIndex(Math.max(0, actualSteps.length - 1))} className="px-3 py-1 rounded-xl glass-btn text-xs">End</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={jumpToPrevPivot} className="px-3 py-1 rounded-xl glass-btn text-xs">Prev Pivot</button>
                            <button onClick={jumpToNextPivot} className="px-3 py-1 rounded-xl glass-btn text-xs">Next Pivot</button>
                            <button onClick={toggleBookmark} className={`px-3 py-1 rounded-xl text-xs ${bookmarks.includes(timelineIndex) ? 'glass-btn-primary' : 'glass-btn'}`}>{bookmarks.includes(timelineIndex) ? 'Bookmarked' : 'Bookmark'}</button>
                        </div>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(0, actualSteps.length - 1)}
                        value={timelineIndex}
                        onChange={(e) => setTimelineIndex(parseInt(e.target.value, 10))}
                        className="w-full"
                    />
                    <div className="text-xs text-secondary">Step {timelineIndex + 1} of {actualSteps.length}</div>
                    {bookmarks.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            {bookmarks.map(b => (
                                <button key={b} onClick={() => setTimelineIndex(b)} className="px-2 py-1 rounded-md glass-panel text-emerald-700 ">
                                    Bookmark {b + 1}
                                </button>
                            ))}
                        </div>
                    )}
                    {actualSteps[timelineIndex] && (
                        <div className="space-y-2">
                            <div className="px-3 py-1 glass-panel rounded-xl text-center w-full">
                                <ScrollableLatex latex={actualSteps[timelineIndex].operation} displayMode={false} />
                            </div>
                            {actualSteps[timelineIndex].description && <p className="text-sm text-secondary italic text-center break-words">{actualSteps[timelineIndex].description}</p>}
                            {tutorMode && <div className="text-xs text-secondary glass-panel rounded-md px-3 py-2 text-center">{explainOperation(actualSteps[timelineIndex].operation)}</div>}
                            {actualSteps[timelineIndex].matrix && (
                                <div className="glass-panel p-2 rounded-2xl w-full">
                                    <MatrixReveal
                                        matrix={actualSteps[timelineIndex].matrix!}
                                        latex={matrixFormatter(actualSteps[timelineIndex].matrix!)}
                                        title="Step Matrix"
                                        lazy={shouldVirtualizeSteps}
                                        rowClassProvider={highlightDiff && actualSteps[timelineIndex].matrixBefore ? (r) => rowHasChanged(actualSteps[timelineIndex].matrixBefore![r], actualSteps[timelineIndex].matrix![r]) ? 'bg-amber-100/60' : '' : undefined}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SolutionDisplay: React.FC<{ result: SolutionResult, sectionName: string } & SharedDisplayProps> = ({ result, sectionName, ...props }) => {
    const detailsExist = result.steps.length > 1;
    const isCollapsed = !!props.collapsedSections[sectionName];

    return (
        <div className="space-y-4">
            {result.conditions.length > 0 && <div><div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">Provided the assumptions hold:</h4></div><ul className="list-disc list-inside text-secondary space-y-1">{result.conditions.map((c, i) => <li key={i}><ScrollableLatex latex={c} /></li>)}</ul></div>}
            <div className="p-4 glass-panel rounded-lg w-full"><ScrollableLatex latex={result.steps[result.steps.length - 1]} /></div>
            
            <DetailsToggleButton 
                sectionName={sectionName}
                detailsExist={detailsExist}
                onCalculate={props.handleRequestAndShowDetails}
                loadingDetails={props.loadingDetails}
            />

            {detailsExist && (
                <>
                    <button onClick={() => props.toggleDetailsVisibility(sectionName)} className="mt-4 flex justify-center w-full text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                        {isCollapsed ? 'Show Derivation' : 'Hide Derivation'}
                    </button>
                    <div className={`accordion-content ${!isCollapsed ? 'open' : ''}`}>
                        <div className="pt-4 border-t border-[var(--glass-border)] mt-4 glass-panel p-4 rounded-lg space-y-4 text-left">
                            {result.steps.slice(0, -1).map((step, i) => <div key={i} className="pl-2"><ScrollableLatex latex={step} /></div>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const BasisDisplay: React.FC<{ title: string, basis: ValidMatrix[], explanation: React.ReactNode }> = ({ title, basis, explanation }) => (
    <div className="space-y-4">
        {explanation}
        <div className="p-4 glass-panel rounded-lg w-full">
            <ScrollableLatex latex={`${title} = \\text{span} \\left\\{ ${formatVectorsToLatex(basis)} \\right\\}`} />
        </div>
    </div>
);

const NullSpaceDisplay: React.FC<{ result: NullSpaceResult, sectionName: string } & SharedDisplayProps> = ({ result, sectionName, ...props }) => {
    const detailsExist = !!result.derivation && result.derivation.length > 0;
    const isCollapsed = !!props.collapsedSections[sectionName];

    return (
        <div className="space-y-4">
            <p className="text-secondary break-words">The basis for the null space (or kernel) of A, denoted Nul(A), is a set of vectors that span the solution space of the homogeneous equation Ax = 0.</p>
            <div className="p-4 glass-panel rounded-lg w-full">
                <ScrollableLatex latex={`\\text{Nul}(A) = \\text{span} \\left\\{ ${formatVectorsToLatex(result.basis)} \\right\\}`} />
            </div>
            
            <DetailsToggleButton 
                sectionName={sectionName}
                detailsExist={detailsExist}
                onCalculate={props.handleRequestAndShowDetails}
                loadingDetails={props.loadingDetails}
            />

            {detailsExist && (
                <>
                    <button onClick={() => props.toggleDetailsVisibility(sectionName)} className="mt-4 flex justify-center w-full text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                        {isCollapsed ? 'Show Derivation' : 'Hide Derivation'}
                    </button>
                    <div className={`accordion-content ${!isCollapsed ? 'open' : ''}`}>
                        <div className="pt-4 border-t border-[var(--glass-border)] mt-4 glass-panel p-4 rounded-lg space-y-4 text-left">
                            {result.derivation.map((step, i) => <div key={i} className="pl-2"><ScrollableLatex latex={step} /></div>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const AdjointMethodDetails: React.FC<{ result: AdjointMethodResult }> = ({ result }) => {
    const { formatMatrixCached } = useLatexCache();
    return (
        <div className="space-y-6">
            {result.summaryMessage && <SummaryMessageDisplay message={result.summaryMessage} />}
            {!result.summaryMessage && (
                <>
                    <div>
                        <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">1. Calculate Determinant</h4></div>
                        <ScrollableLatex latex={`\\det(A) = ${formatSymbolicFractionToLatex(result.determinantOfA)}`} />
                    </div>
                    <div>
                        <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">2. Find Matrix of Cofactors</h4></div>
                        <MatrixReveal matrix={result.cofactorMatrix} latex={`C = ${formatMatrixCached(result.cofactorMatrix)}`} title="Cofactor Matrix" />
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-left">
                            {result.cofactorSteps.map(step => <div key={step.position} className="p-2 glass-panel rounded"><ScrollableLatex latex={step.calculation} displayMode={true} /></div>)}
                        </div>
                    </div>
                    <div>
                        <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">3. Find Adjoint (Adjugate) Matrix</h4></div>
                        <p className="text-secondary mb-3 break-words">The adjoint is the transpose of the cofactor matrix.</p>
                        <MatrixReveal matrix={result.adjointMatrix} latex={`\\text{adj}(A) = C^T = ${formatMatrixCached(result.adjointMatrix)}`} title="Adjoint Matrix" />
                    </div>
                    <div>
                        <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">4. Calculate Inverse</h4></div>
                        <p className="text-secondary mb-3 break-words">The inverse is calculated using the formula A⁻¹ = (1/det(A)) * adj(A).</p>
                        <MatrixReveal matrix={result.inverseMatrix} latex={`A^{-1} = \\frac{1}{${formatSymbolicFractionToLatex(result.determinantOfA)}} ${formatMatrixCached(result.adjointMatrix)} = ${formatMatrixCached(result.inverseMatrix)}`} title="Inverse Matrix" />
                    </div>
                </>
            )}
        </div>
    );
};

const VerificationCheck: React.FC<{ titleLatex: string, details: MatrixMultiplicationDetail, workingsSectionName: string } & SharedDisplayProps> = 
({ titleLatex, details, workingsSectionName, collapsedSections, toggleDetailsVisibility, formatMatrixCached }) => {
    const isWorkingsCollapsed = !!collapsedSections[workingsSectionName];

    return (
        <div>
            <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words"><LatexRenderer latex={titleLatex} /></h4></div>
            <MatrixReveal matrix={details.product} latex={formatMatrixCached(details.product)} title="Verification Product" />
            <button
                onClick={() => toggleDetailsVisibility(workingsSectionName)}
                className="mt-4 flex items-center justify-center bg-indigo-600/80 hover:bg-indigo-700/80 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
                {isWorkingsCollapsed ? "Show Workings" : "Hide Workings"}
            </button>
            <div className={`accordion-content ${!isWorkingsCollapsed ? 'open' : ''}`}>
                <div className="mt-4 glass-panel p-4 rounded-lg">
                    <OperationWorkingsDisplay details={details} />
                </div>
            </div>
        </div>
    );
};

const InverseMatrixDisplay: React.FC<{ result: InverseResult } & SharedDisplayProps> = ({ result, ...props }) => {
    const gjSectionName = "Method 1: Gauss-Jordan Elimination";
    const adjointSectionName = "Method 2: Adjoint Method";
    const verificationSectionName = "Verification";

    if (!result.exists) {
        return <p className="text-yellow-600  break-words">{result.reason}</p>;
    }

    const detailsExist = !!result.gaussJordanSteps;

    return (
        <div className="space-y-4">
            <p className="text-secondary mb-2 font-semibold break-words">Final Inverse Matrix (A⁻¹):</p>
            <div className="p-4 glass-panel rounded-lg w-full mb-6">
                {result.inverseMatrix ? (
                    <MatrixReveal matrix={result.inverseMatrix} latex={props.formatMatrixCached(result.inverseMatrix)} title="Inverse Matrix" />
                ) : (
                    <p>Calculation not performed yet.</p>
                )}
            </div>

            <DetailsToggleButton 
                sectionName="Matrix Inverse"
                detailsExist={detailsExist}
                onCalculate={props.handleRequestAndShowDetails}
                loadingDetails={props.loadingDetails}
            />
            
            {detailsExist && (
                <div className="space-y-4">
                    <ResultSection title={gjSectionName} isOpen={!props.collapsedSections[gjSectionName]} onToggle={() => props.toggleDetailsVisibility(gjSectionName)} isNested>
                        <div className="glass-panel p-4 rounded-lg">
                            {result.summaryMessage && <SummaryMessageDisplay message={result.summaryMessage} />}
                            <StepsRenderer steps={result.gaussJordanSteps!} formName="Inverse" systemType="non-homogeneous" augmentedCols={result.inverseMatrix ? result.inverseMatrix[0].length : 1} tutorMode={props.tutorMode} />
                        </div>
                    </ResultSection>
                    
                    <ResultSection title={adjointSectionName} isOpen={!props.collapsedSections[adjointSectionName]} onToggle={() => props.toggleDetailsVisibility(adjointSectionName)} isNested>
                        {result.adjointMethod ? <AdjointMethodDetails result={result.adjointMethod} /> : <p>Details not available.</p>}
                    </ResultSection>

                     <ResultSection title={verificationSectionName} isOpen={!props.collapsedSections[verificationSectionName]} onToggle={() => {
                        if (props.collapsedSections[verificationSectionName] !== false) { // On open
                            props.toggleDetailsVisibility("verification-workings-1", true);
                            props.toggleDetailsVisibility("verification-workings-2", true);
                        }
                        props.toggleDetailsVisibility(verificationSectionName);
                     }} isNested>
                         {result.verification ? (<div className="glass-panel p-4 rounded-lg space-y-6">
                            <VerificationCheck titleLatex="A A^{-1} = I" details={result.verification!.a_times_ainv} workingsSectionName="verification-workings-1" {...props} />
                            <div className="border-t border-[var(--glass-border)] my-2"></div>
                            <VerificationCheck titleLatex="A^{-1} A = I" details={result.verification!.ainv_times_a} workingsSectionName="verification-workings-2" {...props} />
                        </div>) : <p>Details not available.</p>}
                    </ResultSection>
                </div>
            )}
        </div>
    );
};

const CramersRuleDisplay: React.FC<{ result: CramersRuleResult | null, systemType: SystemType, numRows: number } & SharedDisplayProps> = ({ result, systemType, numRows, ...props }) => {
    const sectionName = "Cramer's Rule";
    const detailsExist = result?.variableSolutions !== undefined;
    const isCollapsed = !!props.collapsedSections[sectionName];
    const [bVectorInput, setBVectorInput] = React.useState<string[]>(Array(numRows).fill(''));
    const [bVectorError, setBVectorError] = React.useState<string | null>(null);

    const handleCalculateHomogeneous = () => {
        try {
            const bVector = bVectorInput.map(val => parseInput(val));
            setBVectorError(null);
            props.handleRequestAndShowDetails(sectionName, { bVector });
        } catch (e) {
            if (e instanceof Error) setBVectorError(e.message);
        }
    };

    if (!result) return <p>Waiting for calculation...</p>;
    if (!result.isApplicable && !result.summaryMessage) {
        return <p className="text-yellow-600  break-words">{result.reason}</p>;
    }

    return (
        <div className="space-y-4">
            {result.summaryMessage && <SummaryMessageDisplay message={result.summaryMessage} />}
            
            {!detailsExist && systemType === 'homogeneous' ? (
                <div className="p-4 glass-panel rounded-lg">
                    <p className="text-secondary mb-3 break-words">Cramer's rule is for non-homogeneous systems (Ax=b). Your system is homogeneous (Ax=0). To solve a related Ax=b system, please provide the vector 'b' below.</p>
                    <div className="flex items-start gap-4">
                        <div className="overflow-x-auto"><LatexRenderer latex="\mathbf{b} = " /></div>
                        <div className="flex flex-col gap-2">{[...Array(numRows)].map((_, i) => <input key={i} type="text" value={bVectorInput[i]} onChange={(e) => { const newB = [...bVectorInput]; newB[i] = e.target.value; setBVectorInput(newB); }} className="w-24 glass-input rounded-md px-3 py-1 focus:outline-none" />)}</div>
                    </div>
                    {bVectorError && <p className="text-red-500 mt-2">{bVectorError}</p>}
                    <DetailsToggleButton sectionName={sectionName} detailsExist={false} onCalculate={() => {}} loadingDetails={props.loadingDetails} onClick={handleCalculateHomogeneous}>Calculate with this 'b'</DetailsToggleButton>
                </div>
            ) : (
                <DetailsToggleButton 
                    sectionName={sectionName}
                    detailsExist={detailsExist}
                    onCalculate={props.handleRequestAndShowDetails}
                    loadingDetails={props.loadingDetails}
                />
            )}
            
            {detailsExist && (
                <>
                    <button onClick={() => props.toggleDetailsVisibility(sectionName)} className="mt-4 flex justify-center w-full text-sm text-indigo-500 hover:text-indigo-600 font-medium">
                        {isCollapsed ? 'Show Details' : 'Hide Details'}
                    </button>
                    <div className={`accordion-content ${!isCollapsed ? 'open' : ''}`}>
                        <div className="pt-4 border-t border-[var(--glass-border)] mt-4">
                            <div><div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">1. Determinant of Coefficient Matrix (A)</h4></div><ScrollableLatex latex={`\\det(A) = ${formatSymbolicFractionToLatex(result.determinantOfA!)}`} /></div>
                            {result.variableSolutions!.map((sol, i) => (
                                <div key={sol.variableName} className="space-y-2 pt-4">
                                    <div className="min-w-0"><h4 className="font-semibold text-lg text-primary mb-2 break-words">2.{i+1}. Solve for <LatexRenderer latex={sol.variableName} displayMode={false} /></h4></div>
                                    <p className="text-secondary break-words">Replace column {i+1} of A with the vector b to form A_{'{'}{sol.variableName.match(/\d+/)?.[0] || i+1}{'}'}.</p>
                                    <MatrixReveal matrix={sol.matrixAi} latex={`A_{${sol.variableName.match(/\d+/)?.[0] || i+1}} = ${props.formatMatrixCached(sol.matrixAi)}`} title={`Matrix A_${sol.variableName.match(/\\d+/)?.[0] || i + 1}`} />
                                    <p className="text-secondary break-words">Calculate the determinant of A_{'{'}{sol.variableName.match(/\d+/)?.[0] || i+1}{'}'}.</p>
                                    <ScrollableLatex latex={`\\det(A_{${sol.variableName.match(/\d+/)?.[0] || i+1}}) = ${formatSymbolicFractionToLatex(sol.determinantOfAi)}`} />
                                    <ScrollableLatex latex={sol.finalCalculation} />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const DeterminantRowOpsRenderer: React.FC<{ steps: DeterminantRowOpStep[] }> = ({ steps }) => {
    const { formatMatrixCached } = useLatexCache();
    const shouldVirtualize = steps.length > 30;
    const renderStep = (index: number) => {
        const step = steps[index];
        return (
            <div key={index} className="p-3 glass-panel rounded-lg mb-4">
                <div className="px-3 py-1 glass-panel rounded-md shadow-inner text-center mb-2 w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                <p className="text-sm text-secondary italic mb-3 break-words">{step.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center">
                    <div className="w-full">
                        <MatrixReveal matrix={step.matrixBefore} latex={`\\det${formatMatrixCached(step.matrixBefore)}`} title="Determinant (Before)" lazy={shouldVirtualize} />
                    </div>
                    <div className="hidden md:block text-primary"><LatexRenderer latex={`\\Rightarrow`} displayMode={true} /></div>
                    <div className="w-full">
                        <MatrixReveal matrix={step.matrixAfter} latex={`\\det${formatMatrixCached(step.matrixAfter)}`} title="Determinant (After)" lazy={shouldVirtualize} />
                    </div>
                </div>
            </div>
        );
    };

    if (steps.length === 0) return null;

    return shouldVirtualize ? (
        <VirtualizedList
            itemCount={steps.length}
            estimateHeight={260}
            maxHeight={560}
            className="w-full pr-1"
            renderItem={renderStep}
        />
    ) : (
        <div className="space-y-4">
            {steps.map((_, index) => renderStep(index))}
        </div>
    );
};
