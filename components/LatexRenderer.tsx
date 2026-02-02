import React, { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';

interface LatexRendererProps {
    latex: string;
    className?: string;
    displayMode?: boolean;
    containerClassName?: string;
    rowClassProvider?: (rowIndex: number) => string;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({
    latex,
    className,
    displayMode = true,
    containerClassName,
    rowClassProvider
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderResult = useMemo(() => {
        try {
            const html = katex.renderToString(latex, {
                displayMode,
                throwOnError: true,
                strict: 'ignore'
            });
            return { html, error: null as string | null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to render LaTeX.';
            return { html: '', error: message };
        }
    }, [latex, displayMode]);

    useEffect(() => {
        if (!rowClassProvider || !containerRef.current) return;
        const rows = containerRef.current.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const rowClass = rowClassProvider(index);
            if (rowClass) {
                row.classList.add(...rowClass.split(' ').filter(Boolean));
            }
        });
    }, [rowClassProvider, renderResult.html]);

    if (renderResult.error) {
        const sanitizedLatex = latex.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return (
            <div className={`text-red-400 mt-1 p-2 bg-red-900/40 rounded text-left ${className || ''}`}>
                <p className="font-bold">Error:</p>
                <p className="font-mono text-sm">{renderResult.error.replace(/</g, '&lt;')}</p>
                <p className="mt-2 text-xs text-gray-400">Input: <code className="font-mono bg-gray-700 p-1 rounded">{sanitizedLatex}</code></p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`${className || ''} ${containerClassName || ''} ${!displayMode ? 'inline-block align-middle' : ''}`}
            dangerouslySetInnerHTML={{ __html: renderResult.html }}
        />
    );
};
