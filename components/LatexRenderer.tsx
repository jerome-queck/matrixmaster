import React, { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';

const LATEX_CACHE_LIMIT = 500;
const latexCache = new Map<string, { latex: string; html: string }>();

const hashLatex = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
};

const getCachedLatex = (key: string, latex: string) => {
    const cached = latexCache.get(key);
    if (!cached || cached.latex !== latex) return null;
    latexCache.delete(key);
    latexCache.set(key, cached);
    return cached.html;
};

const setCachedLatex = (key: string, latex: string, html: string) => {
    latexCache.set(key, { latex, html });
    if (latexCache.size <= LATEX_CACHE_LIMIT) return;
    const oldestKey = latexCache.keys().next().value;
    if (oldestKey) latexCache.delete(oldestKey);
};

interface LatexRendererProps {
    latex: string;
    className?: string;
    displayMode?: boolean;
    containerClassName?: string;
    rowClassProvider?: (rowIndex: number) => string;
    lazy?: boolean;
    placeholderHeight?: number;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({
    latex,
    className,
    displayMode = true,
    containerClassName,
    rowClassProvider,
    lazy = false,
    placeholderHeight = 24
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = React.useState(!lazy);

    const renderResult = useMemo(() => {
        if (lazy && !isVisible) {
            return { html: '', error: null as string | null };
        }
        const cacheKey = `${displayMode ? 'd' : 'i'}:${hashLatex(latex)}`;
        const cachedHtml = getCachedLatex(cacheKey, latex);
        if (cachedHtml) {
            return { html: cachedHtml, error: null as string | null };
        }

        try {
            const html = katex.renderToString(latex, {
                displayMode,
                throwOnError: true,
                strict: 'ignore'
            });
            setCachedLatex(cacheKey, latex, html);
            return { html, error: null as string | null };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to render LaTeX.';
            return { html: '', error: message };
        }
    }, [latex, displayMode, lazy, isVisible]);

    useEffect(() => {
        if (!lazy || !containerRef.current) return;
        const node = containerRef.current;
        if (!('IntersectionObserver' in window)) {
            setIsVisible(true);
            return;
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '200px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, [lazy]);

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
                <p className="mt-2 text-xs text-secondary">Input: <code className="font-mono glass-panel p-1 rounded">{sanitizedLatex}</code></p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`${className || ''} ${containerClassName || ''} ${!displayMode ? 'inline-block align-middle' : ''}`}
            style={lazy && !isVisible ? { minHeight: placeholderHeight } : undefined}
            dangerouslySetInnerHTML={{ __html: renderResult.html }}
        />
    );
};
