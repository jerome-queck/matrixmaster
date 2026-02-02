
import React from 'react';
import type { CalculationResult, RowOperationStep, DeterminantRowOpStep, ValidMatrix, SolutionResult, NullSpaceResult, SymbolicFraction, InverseResult, CramersRuleResult, AdjointMethodResult, MatrixOperationsResult, DeterminantOfOperationResult, MatrixOperationStep, AppMode, DeterminantResult, MatrixMultiplicationDetail, CofactorStep, SystemType, MatrixAnalysisResult, NumberFormatOptions, VariableAssumption } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { formatMatrixToLatex, formatSymbolicFractionToLatex, formatVectorsToLatex, formatAugmentedMatrixToLatex, generateAssumptionSteps, parseInput, areSFEqual, formatNumericMatrixToLatex, formatNumberToLatex } from '../services/matrixService';

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
}

const isSystemSolverResult = (res: AllResultTypes): res is CalculationResult => 'systemType' in res;
const isMatrixOpsResult = (res: AllResultTypes): res is MatrixOperationsResult => 'finalResult' in res;
const isDeterminantOfOpsResult = (res: AllResultTypes): res is DeterminantOfOperationResult => 'operationResult' in res;
const isAnalysisResult = (res: AllResultTypes): res is MatrixAnalysisResult => 'kind' in res && res.kind === 'analysis';

const ResultSection: React.FC<{ title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode; isNested?: boolean; onExplain?: (topic: string) => void }> = ({ title, isOpen, onToggle, children, isNested, onExplain }) => (
    <div className={`${isNested ? 'glass-panel rounded-2xl' : 'glass-card rounded-2xl'}`}>
        <button onClick={onToggle} className={`w-full p-4 text-left flex justify-between items-center transition-colors ${isNested ? 'hover:bg-white/10 rounded-2xl' : 'hover:bg-white/10'} ${isOpen ? (isNested ? '' : 'rounded-t-2xl') : 'rounded-2xl'}`}>
            <div className="min-w-0 flex-1 flex items-center gap-2">
                <h2 className={`text-xl font-semibold break-words w-full text-left pr-4 ${isNested ? 'text-slate-700 dark:text-sky-200' : 'text-slate-800 dark:text-sky-100'}`}>{title}</h2>
                {onExplain && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onExplain(title); }}
                        className="p-1 rounded-full text-slate-600 dark:text-sky-100 hover:bg-white/10 transition-colors flex-shrink-0"
                        aria-label={`Explain ${title}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>
            <svg className={`w-6 h-6 transform transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </button>
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
                className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
            >
                {buttonContent}
            </button>
        </div>
    );
};

// A robust wrapper for making LaTeX content scrollable
const ScrollableLatex: React.FC<{latex: string, displayMode?: boolean, rowClassProvider?: (r: number) => string}> = ({ latex, displayMode = true, rowClassProvider }) => (
    <div className="overflow-x-auto w-full p-2 flex justify-center">
      <div className="min-w-max">
        <LatexRenderer latex={latex} displayMode={displayMode} rowClassProvider={rowClassProvider} />
      </div>
    </div>
);

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
    <div className="bg-yellow-400/20 dark:bg-yellow-900/50 border border-yellow-500/30 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 rounded-lg p-4 space-y-4">
        <p className="font-bold break-words">To proceed with the calculation, the following assumptions were made. The results below are valid only if these conditions are met:</p>
        <ul className="space-y-3">{conditions.map((cond, i) => <li key={i} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-md"><AssumptionSteps condition={cond} /></li>)}</ul>
    </div>
);

const OperationWorkingsDisplay: React.FC<{ details: MatrixMultiplicationDetail }> = ({ details }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-left">
        {details.steps.map(step => <div key={step.position} className="p-2 glass-panel rounded-xl"><ScrollableLatex latex={step.calculation} displayMode={true} /></div>)}
    </div>
);

const SummaryMessageDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="p-3 bg-blue-400/20 dark:bg-blue-900/50 border border-blue-500/30 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded-lg text-sm"><p className="break-words">{message}</p></div>
);

const UserAssumptionsDisplay: React.FC<{ assumptions: VariableAssumption[] }> = ({ assumptions }) => (
    <div className="p-3 bg-emerald-400/20 dark:bg-emerald-900/40 border border-emerald-500/30 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm space-y-2">
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
    const vectorToLatex = (values: number[]) => `\\begin{bmatrix} ${values.map(v => formatNumberToLatex(v, numberFormat)).join(' \\\\ ')} \\end{bmatrix}`;

    return (
        <div className="space-y-4">
            {analysisMatrix && (
                <ResultSection title="Input Matrix" isOpen={true} onToggle={() => {}}>
                    <ScrollableLatex latex={formatMatrixToLatex(analysisMatrix)} />
                </ResultSection>
            )}
            <ResultSection title="Summary" isOpen={true} onToggle={() => {}}>
                <div className="space-y-3">
                    <div className="text-gray-600 dark:text-gray-300"><span className="font-semibold">Rank:</span> {result.rank}</div>
                    {result.trace !== undefined && (
                        <div className="text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">Trace:</span>{' '}
                            <LatexRenderer latex={`\\operatorname{tr}(A) = ${result.mode === 'exact' ? formatSymbolicFractionToLatex(result.trace) : formatNumberToLatex(result.trace, numberFormat)}`} displayMode={false} />
                        </div>
                    )}
                    {result.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-400/20 dark:bg-yellow-900/40 border border-yellow-500/30 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm space-y-1">
                            {result.warnings.map((warning, i) => <p key={i}>{warning}</p>)}
                        </div>
                    )}
                </div>
            </ResultSection>

            {result.mode === 'numeric' && result.lu && (
                <ResultSection title="LU Decomposition" isOpen={true} onToggle={() => {}}>
                    <div className="space-y-3">
                        <p className="text-gray-500 dark:text-gray-400 break-words">Permutation matrix P, lower L, and upper U such that P·A = L·U.</p>
                        <ScrollableLatex latex={`P = ${formatNumericMatrixToLatex(result.lu.P, numberFormat)}`} />
                        <ScrollableLatex latex={`L = ${formatNumericMatrixToLatex(result.lu.L, numberFormat)}`} />
                        <ScrollableLatex latex={`U = ${formatNumericMatrixToLatex(result.lu.U, numberFormat)}`} />
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.qr && (
                <ResultSection title="QR Decomposition" isOpen={true} onToggle={() => {}}>
                    <div className="space-y-3">
                        <p className="text-gray-500 dark:text-gray-400 break-words">Q has orthonormal columns, and A = Q·R.</p>
                        <ScrollableLatex latex={`Q = ${formatNumericMatrixToLatex(result.qr.Q, numberFormat)}`} />
                        <ScrollableLatex latex={`R = ${formatNumericMatrixToLatex(result.qr.R, numberFormat)}`} />
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.svd && (
                <ResultSection title="Singular Value Decomposition" isOpen={true} onToggle={() => {}}>
                    <div className="space-y-3">
                        <p className="text-gray-500 dark:text-gray-400 break-words">A = U·S·Vᵀ (economy SVD).</p>
                        <ScrollableLatex latex={`U = ${formatNumericMatrixToLatex(result.svd.U, numberFormat)}`} />
                        <ScrollableLatex latex={`S = ${formatNumericMatrixToLatex(result.svd.S, numberFormat)}`} />
                        <ScrollableLatex latex={`V^T = ${formatNumericMatrixToLatex(result.svd.Vt, numberFormat)}`} />
                        <div className="text-gray-600 dark:text-gray-300 text-sm">
                            <span className="font-semibold">Singular values:</span>{' '}
                            <LatexRenderer latex={vectorToLatex(result.svd.singularValues)} displayMode={false} />
                        </div>
                    </div>
                </ResultSection>
            )}

            {result.mode === 'numeric' && result.eigen && (
                <ResultSection title="Eigen Analysis" isOpen={true} onToggle={() => {}}>
                    <div className="space-y-3">
                        <p className="text-gray-500 dark:text-gray-400 break-words">
                            {result.eigen.symmetric ? 'Eigenvalues and eigenvectors computed with a symmetric Jacobi solver.' : 'Eigenvalues computed with QR iteration. Eigenvectors are only available for symmetric matrices.'}
                        </p>
                        <div className="text-gray-600 dark:text-gray-300 text-sm">
                            <span className="font-semibold">Eigenvalues:</span>{' '}
                            <LatexRenderer latex={vectorToLatex(result.eigen.values)} displayMode={false} />
                        </div>
                        {result.eigen.vectors && (
                            <ScrollableLatex latex={`V = ${formatNumericMatrixToLatex(result.eigen.vectors, numberFormat)}`} />
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">Iterations: {result.eigen.iterations} · {result.eigen.converged ? 'Converged' : 'Max iterations reached'}</div>
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
         <p className="text-gray-600 dark:text-gray-300 mb-2 font-semibold break-words">Final Value:</p>
         <div className="text-center text-xl sm:text-2xl font-bold p-4 bg-gray-100 dark:bg-gray-900/50 rounded-md mb-6"><ScrollableLatex latex={`\\det(A) = ${formatSymbolicFractionToLatex(determinant.value)}`} /></div>
        
        <DetailsToggleButton 
            sectionName={sectionName}
            detailsExist={detailsExist}
            onCalculate={handleRequestAndShowDetails}
            loadingDetails={loadingDetails}
        />
        
        {detailsExist && (
            <div className="space-y-4 mt-4">
                <ResultSection title={cofactorSectionName} isOpen={!collapsedSections[cofactorSectionName]} onToggle={() => toggleDetailsVisibility(cofactorSectionName)} isNested>
                    <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg space-y-4">
                         <p className="text-gray-500 dark:text-gray-400 break-words">The determinant is found by recursively breaking down the matrix into smaller 2x2 matrices.</p>
                         {determinant.summaryMessage ? <SummaryMessageDisplay message={determinant.summaryMessage} /> : <div className="text-left space-y-2">{determinant.cofactorSteps.map((step, i) => <div key={i} className="pl-2"><ScrollableLatex latex={step} displayMode={true} /></div>)}</div>}
                    </div>
                </ResultSection>

                <ResultSection title={rowOpSectionName} isOpen={!collapsedSections[rowOpSectionName]} onToggle={() => toggleDetailsVisibility(rowOpSectionName)} isNested>
                     <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                        <DeterminantRowOpsRenderer steps={determinant.rowOpSteps} />
                        <div className="border-t border-gray-300 dark:border-gray-700/50 my-6"></div>
                        <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">Final Calculation</h4></div>
                        <p className="text-gray-500 dark:text-gray-400 mb-3 break-words">{determinant.rowOpFinalCalculation.description}</p>
                        <ScrollableLatex latex={determinant.rowOpFinalCalculation.equation} />
                     </div>
                </ResultSection>
            </div>
        )}
    </ResultSection>
)};

const MatrixOperationsResultDisplay: React.FC<{ result: MatrixOperationsResult, onUseResult: (matrix: ValidMatrix) => void } & SharedDisplayProps> = ({ result, onToggleSection, openSections, onUseResult, handleRequestAndShowDetails, collapsedSections, toggleDetailsVisibility, loadingDetails }) => {
    
    const sectionNameForWorkings = (index: number) => `op-workings-${index}`;

    return (
    <div className="space-y-4">
        {result.conditions.length > 0 && <ResultSection title="Assumptions Made During Calculation" isOpen={!!openSections["Assumptions Made During Calculation"]} onToggle={() => onToggleSection("Assumptions Made During Calculation")}><AssumptionsDisplay conditions={result.conditions} /></ResultSection>}
        <ResultSection title="Step-by-step Calculation" isOpen={true} onToggle={() => {}}><div className="flex flex-col items-center space-y-4">{result.steps.map((step, index) => {
            const workingsSectionName = sectionNameForWorkings(index);
            const detailsExist = !!step.details;
            const isWorkingsCollapsed = !!collapsedSections[workingsSectionName];

            return (
            <div key={`op-step-${index}`} className="flex flex-col items-center w-full space-y-2 p-4 bg-gray-100 dark:bg-gray-900/40 rounded-lg">
                <div className="flex flex-col items-center text-cyan-600 dark:text-cyan-400 w-full">
                    <div className="mt-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md shadow-inner text-center w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg my-2 w-full"><ScrollableLatex latex={`= ${formatMatrixToLatex(step.result)}`} /></div>
                
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
        <ResultSection title="Final Result" isOpen={true} onToggle={() => {}}><div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"><ScrollableLatex latex={formatMatrixToLatex(result.finalResult)} /></div><div className="mt-4 flex justify-end"><button onClick={() => onUseResult(result.finalResult)} className="py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Use Result...</button></div></ResultSection>
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
                <p className="text-gray-600 dark:text-gray-300 mb-2 font-semibold break-words">Final Matrix:</p>
                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full mb-6"><ScrollableLatex latex={formatAugmentedMatrixToLatex(finalRefMatrix, calcResults.systemType)} /></div>
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
                <p className="text-gray-600 dark:text-gray-300 mb-2 font-semibold break-words">Final Matrix:</p>
                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full mb-6"><ScrollableLatex latex={formatAugmentedMatrixToLatex(finalRrefMatrix, calcResults.systemType)} /></div>
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
            
            {calcResults.rowSpaceBasis && <ResultSection title="Row Space" isOpen={!!openSections["Row Space"]} onToggle={() => onToggleSection("Row Space")} onExplain={props.onExplain}><BasisDisplay title="Row(A)" basis={calcResults.rowSpaceBasis} explanation={<p className="text-gray-500 dark:text-gray-400 break-words">The basis for the row space is the set of non-zero rows from the Row Echelon Form of the matrix.</p>} /></ResultSection>}
            
            {calcResults.colSpaceBasis && <ResultSection title="Column Space" isOpen={!!openSections["Column Space"]} onToggle={() => onToggleSection("Column Space")} onExplain={props.onExplain}><BasisDisplay title="Col(A)" basis={calcResults.colSpaceBasis} explanation={<p className="text-gray-500 dark:text-gray-400 break-words">The basis for the column space is the set of columns from the *original* matrix that correspond to the pivot columns in the Row Echelon Form.</p>} /></ResultSection>}
            
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
        handleRequestAndShowDetails
    };

    return (
        <div className="space-y-4">
            {assumptions.length > 0 && <UserAssumptionsDisplay assumptions={assumptions} />}
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
                        <div className="pt-4 border-t border-gray-300/50 dark:border-gray-700/50 mt-4">
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
            <div className="text-center bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 break-words">No operations were needed for this phase.</p>
            </div>
        );
    }
    
    const isFirstStepAPlaceholder = steps[0].operation === 'Initial Matrix' || steps[0].operation === 'Start with [A|I]';
    
    const initialMatrix = isFirstStepAPlaceholder ? steps[0].matrix : steps[0].matrixBefore;
    const actualSteps = isFirstStepAPlaceholder ? steps.slice(1) : steps;

    const matrixFormatter = (m: ValidMatrix) => isAugmented ? formatAugmentedMatrixToLatex(m, systemType, augmentedCols) : formatMatrixToLatex(m);
    
    const rowHasChanged = (rowA: SymbolicFraction[], rowB: SymbolicFraction[]) => {
        if (rowA.length !== rowB.length) return true;
        for (let i = 0; i < rowA.length; i++) {
            if (!areSFEqual(rowA[i], rowB[i])) return true;
        }
        return false;
    };
    
    if (actualSteps.length === 0 && isFirstStepAPlaceholder) {
        return (
            <div className="text-center bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-4 break-words">No operations were needed. The starting matrix is already in {formName}.</p>
                {initialMatrix && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg w-full">
                        <ScrollableLatex latex={matrixFormatter(initialMatrix)} />
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

    return (
        <div className="flex flex-col items-center space-y-4">
             <div className="flex self-end items-center text-sm flex-wrap gap-2">
                <span className="mr-2 text-gray-500 dark:text-gray-400">View:</span>
                <div className="flex glass-panel rounded-2xl p-1">
                    <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded-xl transition-colors text-xs glass-tab ${viewMode==='list' ? 'tab active' : ''}`}>List</button>
                    <button onClick={() => setViewMode('side-by-side')} className={`px-2 py-1 rounded-xl transition-colors text-xs glass-tab ${viewMode==='side-by-side' ? 'tab active' : ''}`}>Side-by-Side</button>
                    <button onClick={() => setViewMode('timeline')} className={`px-2 py-1 rounded-xl transition-colors text-xs glass-tab ${viewMode==='timeline' ? 'tab active' : ''}`}>Timeline</button>
                </div>
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
                    <p className="text-gray-500 dark:text-gray-400 break-words">
                        {isFirstStepAPlaceholder ? "Starting with the initial matrix:" : "Starting matrix for this phase:"}
                    </p>
                    <div className="glass-panel p-2 rounded-2xl w-full">
                        <ScrollableLatex latex={matrixFormatter(initialMatrix)} />
                    </div>
                </>
            )}

            {viewMode === 'list' ? (
                actualSteps.map((step, index) => (
                    <div key={`${formName}-step-${index}`} className="flex flex-col items-center w-full space-y-2">
                        <div className="flex flex-col items-center text-indigo-500 dark:text-indigo-400 w-full">
                            <LatexRenderer latex={`\\downarrow`} displayMode={true} />
                            <div className="mt-1 px-3 py-1 glass-panel rounded-xl text-center w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                        </div>
                        {step.description && <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2 text-center break-words">{step.description}</p>}
                        {tutorMode && <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-100/60 dark:bg-blue-900/30 rounded-md px-3 py-2 text-center">{explainOperation(step.operation)}</div>}
                        {step.matrix ? <div className="glass-panel p-2 rounded-2xl w-full"><ScrollableLatex latex={matrixFormatter(step.matrix)} /></div> : <p className="text-sm text-gray-500">(Intermediate matrix hidden for performance)</p>}
                    </div>
                ))
            ) : viewMode === 'side-by-side' ? (
                <div className="space-y-4 w-full">
                    {actualSteps.map((step, index) => (
                    <div key={`${formName}-sbs-step-${index}`} className="p-4 glass-panel rounded-2xl space-y-2">
                        <div className="px-3 py-1 glass-panel rounded-xl text-center w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                        {step.description && <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center break-words">{step.description}</p>}
                        {tutorMode && <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-100/60 dark:bg-blue-900/30 rounded-md px-3 py-2 text-center">{explainOperation(step.operation)}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center">
                            <div className="w-full">{step.matrixBefore && <ScrollableLatex latex={matrixFormatter(step.matrixBefore)} rowClassProvider={(r) => rowHasChanged(step.matrixBefore![r], step.matrix![r]) ? 'bg-cyan-100/50 dark:bg-cyan-900/20' : ''} />}</div>
                            <div className="hidden md:block text-indigo-500 dark:text-indigo-400"><LatexRenderer latex={`\\Rightarrow`} displayMode={true} /></div>
                            <div className="w-full">{step.matrix && <ScrollableLatex latex={matrixFormatter(step.matrix)} rowClassProvider={(r) => rowHasChanged(step.matrixBefore![r], step.matrix![r]) ? 'bg-cyan-100/50 dark:bg-cyan-900/20' : ''} />}</div>
                        </div>
                    </div>))}
                </div>
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
                    <div className="text-xs text-gray-500 dark:text-gray-400">Step {timelineIndex + 1} of {actualSteps.length}</div>
                    {bookmarks.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            {bookmarks.map(b => (
                                <button key={b} onClick={() => setTimelineIndex(b)} className="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
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
                            {actualSteps[timelineIndex].description && <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center break-words">{actualSteps[timelineIndex].description}</p>}
                            {tutorMode && <div className="text-xs text-gray-600 dark:text-gray-300 bg-blue-100/60 dark:bg-blue-900/30 rounded-md px-3 py-2 text-center">{explainOperation(actualSteps[timelineIndex].operation)}</div>}
                            {actualSteps[timelineIndex].matrix && (
                                <div className="glass-panel p-2 rounded-2xl w-full">
                                    <ScrollableLatex latex={matrixFormatter(actualSteps[timelineIndex].matrix!)} />
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
            {result.conditions.length > 0 && <div><div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">Provided the assumptions hold:</h4></div><ul className="list-disc list-inside text-gray-500 dark:text-gray-400 space-y-1">{result.conditions.map((c, i) => <li key={i}><ScrollableLatex latex={c} /></li>)}</ul></div>}
            <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full"><ScrollableLatex latex={result.steps[result.steps.length - 1]} /></div>
            
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
                        <div className="pt-4 border-t border-gray-300/50 dark:border-gray-700/50 mt-4 bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg space-y-4 text-left">
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
        <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full">
            <ScrollableLatex latex={`${title} = \\text{span} \\left\\{ ${formatVectorsToLatex(basis)} \\right\\}`} />
        </div>
    </div>
);

const NullSpaceDisplay: React.FC<{ result: NullSpaceResult, sectionName: string } & SharedDisplayProps> = ({ result, sectionName, ...props }) => {
    const detailsExist = !!result.derivation && result.derivation.length > 0;
    const isCollapsed = !!props.collapsedSections[sectionName];

    return (
        <div className="space-y-4">
            <p className="text-gray-500 dark:text-gray-400 break-words">The basis for the null space (or kernel) of A, denoted Nul(A), is a set of vectors that span the solution space of the homogeneous equation Ax = 0.</p>
            <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full">
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
                        <div className="pt-4 border-t border-gray-300/50 dark:border-gray-700/50 mt-4 bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg space-y-4 text-left">
                            {result.derivation.map((step, i) => <div key={i} className="pl-2"><ScrollableLatex latex={step} /></div>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const AdjointMethodDetails: React.FC<{ result: AdjointMethodResult }> = ({ result }) => (
    <div className="space-y-6">
        {result.summaryMessage && <SummaryMessageDisplay message={result.summaryMessage} />}
        {!result.summaryMessage && (
            <>
                <div>
                    <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">1. Calculate Determinant</h4></div>
                    <ScrollableLatex latex={`\\det(A) = ${formatSymbolicFractionToLatex(result.determinantOfA)}`} />
                </div>
                <div>
                    <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">2. Find Matrix of Cofactors</h4></div>
                    <ScrollableLatex latex={`C = ${formatMatrixToLatex(result.cofactorMatrix)}`} />
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-left">
                        {result.cofactorSteps.map(step => <div key={step.position} className="p-2 bg-gray-200 dark:bg-gray-800/60 rounded"><ScrollableLatex latex={step.calculation} displayMode={true} /></div>)}
                    </div>
                </div>
                <div>
                    <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">3. Find Adjoint (Adjugate) Matrix</h4></div>
                    <p className="text-gray-500 dark:text-gray-400 mb-3 break-words">The adjoint is the transpose of the cofactor matrix.</p>
                    <ScrollableLatex latex={`\\text{adj}(A) = C^T = ${formatMatrixToLatex(result.adjointMatrix)}`} />
                </div>
                <div>
                    <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">4. Calculate Inverse</h4></div>
                    <p className="text-gray-500 dark:text-gray-400 mb-3 break-words">The inverse is calculated using the formula A⁻¹ = (1/det(A)) * adj(A).</p>
                    <ScrollableLatex latex={`A^{-1} = \\frac{1}{${formatSymbolicFractionToLatex(result.determinantOfA)}} ${formatMatrixToLatex(result.adjointMatrix)} = ${formatMatrixToLatex(result.inverseMatrix)}`} />
                </div>
            </>
        )}
    </div>
);

const VerificationCheck: React.FC<{ titleLatex: string, details: MatrixMultiplicationDetail, workingsSectionName: string } & SharedDisplayProps> = 
({ titleLatex, details, workingsSectionName, collapsedSections, toggleDetailsVisibility }) => {
    const isWorkingsCollapsed = !!collapsedSections[workingsSectionName];

    return (
        <div>
            <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words"><LatexRenderer latex={titleLatex} /></h4></div>
            <ScrollableLatex latex={formatMatrixToLatex(details.product)} />
            <button
                onClick={() => toggleDetailsVisibility(workingsSectionName)}
                className="mt-4 flex items-center justify-center bg-indigo-600/80 hover:bg-indigo-700/80 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
            >
                {isWorkingsCollapsed ? "Show Workings" : "Hide Workings"}
            </button>
            <div className={`accordion-content ${!isWorkingsCollapsed ? 'open' : ''}`}>
                <div className="mt-4 bg-gray-200/50 dark:bg-gray-800/50 p-4 rounded-lg">
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
        return <p className="text-yellow-600 dark:text-yellow-400 break-words">{result.reason}</p>;
    }

    const detailsExist = !!result.gaussJordanSteps;

    return (
        <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300 mb-2 font-semibold break-words">Final Inverse Matrix (A⁻¹):</p>
            <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg w-full mb-6">
                {result.inverseMatrix ? <ScrollableLatex latex={formatMatrixToLatex(result.inverseMatrix)} /> : <p>Calculation not performed yet.</p>}
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
                        <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
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
                         {result.verification ? (<div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg space-y-6">
                            <VerificationCheck titleLatex="A A^{-1} = I" details={result.verification!.a_times_ainv} workingsSectionName="verification-workings-1" {...props} />
                            <div className="border-t border-gray-300/50 dark:border-gray-700/50 my-2"></div>
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
        return <p className="text-yellow-600 dark:text-yellow-400 break-words">{result.reason}</p>;
    }

    return (
        <div className="space-y-4">
            {result.summaryMessage && <SummaryMessageDisplay message={result.summaryMessage} />}
            
            {!detailsExist && systemType === 'homogeneous' ? (
                <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-300 mb-3 break-words">Cramer's rule is for non-homogeneous systems (Ax=b). Your system is homogeneous (Ax=0). To solve a related Ax=b system, please provide the vector 'b' below.</p>
                    <div className="flex items-start gap-4">
                        <div className="overflow-x-auto"><LatexRenderer latex="\mathbf{b} = " /></div>
                        <div className="flex flex-col gap-2">{[...Array(numRows)].map((_, i) => <input key={i} type="text" value={bVectorInput[i]} onChange={(e) => { const newB = [...bVectorInput]; newB[i] = e.target.value; setBVectorInput(newB); }} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />)}</div>
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
                        <div className="pt-4 border-t border-gray-300/50 dark:border-gray-700/50 mt-4">
                            <div><div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">1. Determinant of Coefficient Matrix (A)</h4></div><ScrollableLatex latex={`\\det(A) = ${formatSymbolicFractionToLatex(result.determinantOfA!)}`} /></div>
                            {result.variableSolutions!.map((sol, i) => (
                                <div key={sol.variableName} className="space-y-2 pt-4">
                                    <div className="min-w-0"><h4 className="font-semibold text-lg text-cyan-700 dark:text-cyan-400 mb-2 break-words">2.{i+1}. Solve for <LatexRenderer latex={sol.variableName} displayMode={false} /></h4></div>
                                    <p className="text-gray-500 dark:text-gray-400 break-words">Replace column {i+1} of A with the vector b to form A_{'{'}{sol.variableName.match(/\d+/)?.[0] || i+1}{'}'}.</p>
                                    <ScrollableLatex latex={`A_{${sol.variableName.match(/\d+/)?.[0] || i+1}} = ${formatMatrixToLatex(sol.matrixAi)}`} />
                                    <p className="text-gray-500 dark:text-gray-400 break-words">Calculate the determinant of A_{'{'}{sol.variableName.match(/\d+/)?.[0] || i+1}{'}'}.</p>
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

const DeterminantRowOpsRenderer: React.FC<{ steps: DeterminantRowOpStep[] }> = ({ steps }) => (
    <div className="space-y-4">
        {steps.map((step, i) => (
            <div key={i} className="p-3 bg-gray-200 dark:bg-gray-800/60 rounded-lg">
                <div className="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded-md shadow-inner text-center mb-2 w-full"><ScrollableLatex latex={step.operation} displayMode={false} /></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3 break-words">{step.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center">
                    <div className="w-full"><ScrollableLatex latex={`\\det${formatMatrixToLatex(step.matrixBefore)}`} /></div>
                    <div className="hidden md:block text-indigo-500 dark:text-indigo-400"><LatexRenderer latex={`\\Rightarrow`} displayMode={true} /></div>
                    <div className="w-full"><ScrollableLatex latex={`\\det${formatMatrixToLatex(step.matrixAfter)}`} /></div>
                </div>
            </div>
        ))}
    </div>
);
