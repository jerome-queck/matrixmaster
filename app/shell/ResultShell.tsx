import React from 'react';
import type { ReactNode } from 'react';
import type { ResultAction } from '../registry/contracts';

type ResultShellProps = {
    answer: ReactNode;
    diagnostics?: ReactNode;
    actions?: ResultAction[];
    steps?: ReactNode;
    explanation?: ReactNode;
    exportPanel?: ReactNode;
};

const ResultShellSection: React.FC<{ title: string; children: ReactNode; className?: string }> = ({ title, children, className }) => (
    <section className={className ?? 'no-print'}>
        <h3 className="text-sm font-semibold text-secondary mb-2 uppercase tracking-wide">{title}</h3>
        {children}
    </section>
);

const ResultShell: React.FC<ResultShellProps> = ({ answer, diagnostics, actions, steps, explanation, exportPanel }) => {
    return (
        <div className="space-y-4">
            <ResultShellSection title="Answer" className="">
                {answer}
            </ResultShellSection>

            {diagnostics ? (
                <ResultShellSection title="Diagnostics">
                    {diagnostics}
                </ResultShellSection>
            ) : null}

            {actions && actions.length > 0 ? (
                <ResultShellSection title="Actions">
                    <div className="flex flex-wrap gap-2">
                        {actions.map(action => (
                            <button
                                key={action.id}
                                onClick={action.run}
                                disabled={action.disabled}
                                className="py-2 px-3 rounded-lg glass-btn text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title={action.description}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </ResultShellSection>
            ) : null}

            {steps ? (
                <ResultShellSection title="Steps">
                    {steps}
                </ResultShellSection>
            ) : null}

            {explanation ? (
                <ResultShellSection title="Explanation">
                    {explanation}
                </ResultShellSection>
            ) : null}

            {exportPanel ? (
                <ResultShellSection title="Export">
                    {exportPanel}
                </ResultShellSection>
            ) : null}
        </div>
    );
};

export default ResultShell;
