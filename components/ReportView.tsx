import React from 'react';
import type { AppMode, CalculationResult, DeterminantOfOperationResult, MatrixAnalysisResult, MatrixOperationsResult, NumberFormatOptions, ReportOptions, ValidMatrix, VariableAssumption } from '../types';
import { LatexRenderer } from './LatexRenderer';
import { formatAugmentedMatrixToLatex, formatMatrixToLatex, formatNumericMatrixToLatex, formatNumberToLatex, formatSymbolicFractionToLatex, formatVectorsToLatex } from '../services/matrixService';

type AnyResult = CalculationResult | MatrixOperationsResult | DeterminantOfOperationResult | MatrixAnalysisResult;

interface ReportViewProps {
    title?: string;
    results: AnyResult | null;
    appMode: AppMode;
    originalMatrix: ValidMatrix | null;
    analysisMatrix?: ValidMatrix | null;
    numberFormat?: NumberFormatOptions;
    variableAssumptions?: VariableAssumption[];
    reportOptions: ReportOptions;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="report-section">
        <h2 className="report-section-title">{title}</h2>
        {children}
    </section>
);

const LatexBlock: React.FC<{ latex: string }> = ({ latex }) => (
    <div className="report-latex">
        <LatexRenderer latex={latex} displayMode={true} />
    </div>
);

const renderAssumptions = (assumptions: VariableAssumption[]) => (
    <ul className="report-list">
        {assumptions.map((a, i) => (
            <li key={`${a.variable}-${i}`}>
                <LatexRenderer latex={`\text{${a.variable}}\ \text{is ${a.constraint}}`} displayMode={false} />
            </li>
        ))}
    </ul>
);

const renderConditions = (conditions: string[]) => (
    <ul className="report-list">
        {conditions.map((cond, i) => (
            <li key={`${cond}-${i}`}><LatexRenderer latex={cond} displayMode={false} /></li>
        ))}
    </ul>
);

const renderRowSteps = (steps: CalculationResult['gaussJordanSteps'], systemType: CalculationResult['systemType'], includeMatrices: boolean, includeNotes: boolean) => (
    <div className="report-steps">
        {steps.map((step, index) => (
            <div key={`step-${index}`} className="report-step">
                <LatexRenderer latex={step.operation} displayMode={false} />
                {includeNotes && step.description && <p className="text-xs text-secondary">{step.description}</p>}
                {step.matrix && includeMatrices && (
                    <LatexBlock latex={systemType === 'homogeneous' ? formatMatrixToLatex(step.matrix) : formatAugmentedMatrixToLatex(step.matrix, systemType, 1)} />
                )}
            </div>
        ))}
    </div>
);

const renderMatrixSteps = (steps: MatrixOperationsResult['steps'], includeMatrices: boolean, includeNotes: boolean) => (
    <div className="report-steps">
        {steps.map((step, index) => (
            <div key={`op-step-${index}`} className="report-step">
                <LatexRenderer latex={step.operation} displayMode={false} />
                {includeNotes && step.details && <p className="text-xs text-secondary">Includes multiplication details.</p>}
                {includeMatrices && <LatexBlock latex={formatMatrixToLatex(step.result)} />}
            </div>
        ))}
    </div>
);

export const ReportView: React.FC<ReportViewProps> = ({
    title = 'Matrix Master Report',
    results,
    appMode,
    originalMatrix,
    analysisMatrix,
    numberFormat,
    variableAssumptions,
    reportOptions
}) => {
    if (!results) return null;

    const toc: string[] = ['Summary'];
    if (appMode === 'analysis') {
        toc.push('Input Matrix', 'Analysis');
    } else if (appMode === 'matrixOperations') {
        toc.push('Operation Result');
        if (reportOptions.includeSteps) toc.push('Operation Steps');
    } else if (appMode === 'determinantOfOperation') {
        toc.push('Operation Result', 'Determinant');
    } else {
        toc.push('Input Matrix', 'Determinant', 'Matrix Inverse', 'Row/Column/Null Space', 'Solutions');
    }
    if (reportOptions.includeAssumptions && variableAssumptions && variableAssumptions.length > 0) toc.push('User Assumptions');

    return (
        <div className="print-only report-root report-main">
            {reportOptions.includeCover && (
                <div className="report-cover page-break">
                    <h1>{title}</h1>
                    <p>{new Date().toLocaleString()}</p>
                    <p className="report-subtitle">{appMode === 'analysis' ? 'Matrix Analysis' : 'Linear Algebra Report'}</p>
                </div>
            )}

            {reportOptions.includeTOC && (
                <div className="report-toc page-break">
                    <h2>Table of Contents</h2>
                    <ol>
                        {toc.map(item => <li key={item}>{item}</li>)}
                    </ol>
                </div>
            )}

            <div className="report-body">
                {reportOptions.includeAssumptions && variableAssumptions && variableAssumptions.length > 0 && (
                    <Section title="User Assumptions">
                        {renderAssumptions(variableAssumptions)}
                    </Section>
                )}

                <Section title="Summary">
                    {appMode === 'analysis' && (results as MatrixAnalysisResult) && (
                        <div className="report-summary">
                            <p>Rank: {(results as MatrixAnalysisResult).rank}</p>
                            {(results as MatrixAnalysisResult).trace !== undefined && (
                                <LatexRenderer
                                    latex={`\\operatorname{tr}(A) = ${typeof (results as MatrixAnalysisResult).trace === 'number'
                                        ? formatNumberToLatex((results as MatrixAnalysisResult).trace as number, numberFormat)
                                        : formatSymbolicFractionToLatex((results as MatrixAnalysisResult).trace as any)}`}
                                    displayMode={false}
                                />
                            )}
                        </div>
                    )}
                    {appMode === 'matrixOperations' && (
                        <div className="report-summary">
                            <p>Operation completed. Final result below.</p>
                        </div>
                    )}
                    {appMode === 'determinantOfOperation' && (
                        <div className="report-summary">
                            <p>Determinant of operation computed.</p>
                        </div>
                    )}
                    {appMode === 'systemSolver' && (
                        <div className="report-summary">
                            <p>System type: {(results as CalculationResult).systemType}</p>
                        </div>
                    )}
                </Section>

                {appMode === 'analysis' && analysisMatrix && (
                    <Section title="Input Matrix">
                        <LatexBlock latex={formatMatrixToLatex(analysisMatrix)} />
                    </Section>
                )}

                {appMode === 'analysis' && (
                    <Section title="Analysis">
                        {(() => {
                            const res = results as MatrixAnalysisResult;
                            return (
                                <div className="report-analysis">
                                    <p>Rank: {res.rank}</p>
                                    {res.trace !== undefined && (
                                        <LatexRenderer
                                            latex={`\\operatorname{tr}(A) = ${res.mode === 'exact'
                                                ? formatSymbolicFractionToLatex(res.trace as any)
                                                : formatNumberToLatex(res.trace as number, numberFormat)}`}
                                            displayMode={false}
                                        />
                                    )}
                                    {res.mode === 'numeric' && res.lu && (
                                        <LatexBlock latex={`L = ${formatNumericMatrixToLatex(res.lu.L, numberFormat)}`} />
                                    )}
                                    {res.mode === 'numeric' && res.qr && (
                                        <LatexBlock latex={`Q = ${formatNumericMatrixToLatex(res.qr.Q, numberFormat)}`} />
                                    )}
                                    {res.mode === 'numeric' && res.svd && (
                                        <LatexBlock latex={`S = ${formatNumericMatrixToLatex(res.svd.S, numberFormat)}`} />
                                    )}
                                    {res.mode === 'numeric' && res.eigen && (
                                        <LatexBlock latex={`\\lambda = ${formatNumericMatrixToLatex([res.eigen.values], numberFormat)}`} />
                                    )}
                                </div>
                            );
                        })()}
                    </Section>
                )}

                {appMode === 'matrixOperations' && (
                    <Section title="Operation Result">
                        <LatexBlock latex={formatMatrixToLatex((results as MatrixOperationsResult).finalResult)} />
                    </Section>
                )}

                {appMode === 'matrixOperations' && reportOptions.includeSteps && (
                    <Section title="Operation Steps">
                        {renderMatrixSteps((results as MatrixOperationsResult).steps, reportOptions.includeDetails, reportOptions.includeTutorNotes)}
                    </Section>
                )}

                {appMode === 'determinantOfOperation' && (
                    <Section title="Operation Result">
                        <LatexBlock latex={formatMatrixToLatex((results as DeterminantOfOperationResult).operationResult.finalResult)} />
                    </Section>
                )}

                {appMode === 'determinantOfOperation' && (
                    <Section title="Determinant">
                        <LatexBlock latex={`\det = ${formatSymbolicFractionToLatex((results as DeterminantOfOperationResult).determinant.value)}`} />
                    </Section>
                )}

                {appMode === 'systemSolver' && originalMatrix && (
                    <Section title="Input Matrix">
                        <LatexBlock latex={formatMatrixToLatex(originalMatrix)} />
                    </Section>
                )}

                {appMode === 'systemSolver' && (results as CalculationResult).determinant && (
                    <Section title="Determinant">
                        <LatexBlock latex={`\det(A) = ${formatSymbolicFractionToLatex((results as CalculationResult).determinant!.value)}`} />
                    </Section>
                )}

                {appMode === 'systemSolver' && (results as CalculationResult).inverse && (
                    <Section title="Matrix Inverse">
                        {(results as CalculationResult).inverse?.inverseMatrix
                            ? <LatexBlock latex={formatMatrixToLatex((results as CalculationResult).inverse!.inverseMatrix!)} />
                            : <p>No inverse available.</p>}
                    </Section>
                )}

                {appMode === 'systemSolver' && (
                    <Section title="Row/Column/Null Space">
                        {(results as CalculationResult).rowSpaceBasis && (
                            <LatexBlock latex={`Row(A) = \text{span}\{${formatVectorsToLatex((results as CalculationResult).rowSpaceBasis!)}\}`} />
                        )}
                        {(results as CalculationResult).colSpaceBasis && (
                            <LatexBlock latex={`Col(A) = \text{span}\{${formatVectorsToLatex((results as CalculationResult).colSpaceBasis!)}\}`} />
                        )}
                        {(results as CalculationResult).nullSpace && (
                            <LatexBlock latex={`Nul(A) = \text{span}\{${formatVectorsToLatex((results as CalculationResult).nullSpace!.basis)}\}`} />
                        )}
                    </Section>
                )}

                {appMode === 'systemSolver' && reportOptions.includeSteps && (
                    <Section title="Row Reduction Steps">
                        {renderRowSteps((results as CalculationResult).gaussJordanSteps, (results as CalculationResult).systemType, reportOptions.includeDetails, reportOptions.includeTutorNotes)}
                    </Section>
                )}

                {appMode === 'systemSolver' && reportOptions.includeAssumptions && (results as CalculationResult).conditions.length > 0 && (
                    <Section title="Assumptions Made During Calculation">
                        {renderConditions((results as CalculationResult).conditions.map(cond => formatSymbolicFractionToLatex(cond)))}
                    </Section>
                )}
            </div>
        </div>
    );
};

export default ReportView;
