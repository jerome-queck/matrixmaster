import React from 'react';

export const createStringVector = (dimension: number, fill = ''): string[] =>
    Array.from({ length: Math.max(1, dimension) }, () => fill);

export const createStringVectors = (count: number, dimension: number, fill = ''): string[][] =>
    Array.from({ length: Math.max(1, count) }, () => createStringVector(dimension, fill));

export const createStringMatrix = (rows: number, cols: number, fill = ''): string[][] =>
    Array.from({ length: Math.max(1, rows) }, () => Array.from({ length: Math.max(1, cols) }, () => fill));

export const resizeStringVector = (vector: string[], nextDimension: number): string[] => {
    const dimension = Math.max(1, nextDimension);
    const next = createStringVector(dimension);
    for (let i = 0; i < Math.min(vector.length, dimension); i += 1) {
        next[i] = vector[i];
    }
    return next;
};

export const resizeStringVectors = (vectors: string[][], nextCount: number, nextDimension: number): string[][] => {
    const count = Math.max(1, nextCount);
    const dimension = Math.max(1, nextDimension);
    const next = createStringVectors(count, dimension);

    for (let i = 0; i < Math.min(count, vectors.length); i += 1) {
        for (let j = 0; j < Math.min(dimension, vectors[i].length); j += 1) {
            next[i][j] = vectors[i][j];
        }
    }

    return next;
};

export const resizeStringMatrix = (matrix: string[][], nextRows: number, nextCols: number): string[][] => {
    const rows = Math.max(1, nextRows);
    const cols = Math.max(1, nextCols);
    const next = createStringMatrix(rows, cols);

    for (let r = 0; r < Math.min(rows, matrix.length); r += 1) {
        for (let c = 0; c < Math.min(cols, matrix[r].length); c += 1) {
            next[r][c] = matrix[r][c];
        }
    }

    return next;
};

interface VectorEditorProps {
    title: string;
    entries: string[];
    onChange: (next: string[]) => void;
    symbol?: string;
    allowResize?: boolean;
}

export const VectorEditor: React.FC<VectorEditorProps> = ({
    title,
    entries,
    onChange,
    symbol = 'v',
    allowResize = true,
}) => {
    const dimension = entries.length;

    const setDimension = (nextDimension: number) => {
        onChange(resizeStringVector(entries, nextDimension));
    };

    return (
        <div className="glass-panel rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-ink">{title}</h4>
                {allowResize && (
                    <label className="text-xs text-secondary flex items-center gap-2">
                        Dim
                        <input
                            type="number"
                            min={1}
                            value={dimension}
                            onChange={(event) => setDimension(parseInt(event.target.value, 10) || 1)}
                            className="w-16 rounded-md glass-input px-2 py-1 text-ink"
                        />
                    </label>
                )}
            </div>
            <div className="overflow-x-auto">
                <div className="inline-flex items-center gap-2">
                    <span className="text-sm text-secondary">{symbol} =</span>
                    <span className="text-lg text-secondary">[</span>
                    <div className="flex flex-col gap-2">
                        {entries.map((value, index) => (
                            <input
                                key={`${symbol}-${index}`}
                                value={value}
                                onChange={(event) => {
                                    const next = entries.slice();
                                    next[index] = event.target.value;
                                    onChange(next);
                                }}
                                className="w-20 rounded-md glass-input px-2 py-1 text-sm text-ink"
                                placeholder="0"
                            />
                        ))}
                    </div>
                    <span className="text-lg text-secondary">]</span>
                </div>
            </div>
        </div>
    );
};

interface VectorSetEditorProps {
    title: string;
    vectors: string[][];
    onChange: (next: string[][]) => void;
    vectorPrefix?: string;
}

export const VectorSetEditor: React.FC<VectorSetEditorProps> = ({ title, vectors, onChange, vectorPrefix = 'v' }) => {
    const vectorCount = vectors.length;
    const dimension = vectors[0]?.length ?? 1;

    const setSize = (nextCount: number, nextDimension: number) => {
        onChange(resizeStringVectors(vectors, nextCount, nextDimension));
    };

    return (
        <div className="glass-panel rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-ink">{title}</h4>
                <div className="flex items-center gap-3 text-xs text-secondary">
                    <label className="flex items-center gap-2">
                        Count
                        <input
                            type="number"
                            min={1}
                            value={vectorCount}
                            onChange={(event) => setSize(parseInt(event.target.value, 10) || 1, dimension)}
                            className="w-16 rounded-md glass-input px-2 py-1 text-ink"
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        Dim
                        <input
                            type="number"
                            min={1}
                            value={dimension}
                            onChange={(event) => setSize(vectorCount, parseInt(event.target.value, 10) || 1)}
                            className="w-16 rounded-md glass-input px-2 py-1 text-ink"
                        />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vectors.map((vector, vectorIndex) => (
                    <div key={`${vectorPrefix}-${vectorIndex}`} className="rounded-xl border border-[var(--glass-border)] p-3 space-y-2">
                        <div className="text-xs text-secondary">{vectorPrefix}{vectorIndex + 1}</div>
                        <div className="flex items-center gap-2">
                            <span className="text-secondary">[</span>
                            <div className="flex flex-col gap-1">
                                {vector.map((value, entryIndex) => (
                                    <input
                                        key={`${vectorPrefix}-${vectorIndex}-${entryIndex}`}
                                        value={value}
                                        onChange={(event) => {
                                            const next = vectors.map(row => row.slice());
                                            next[vectorIndex][entryIndex] = event.target.value;
                                            onChange(next);
                                        }}
                                        className="w-20 rounded-md glass-input px-2 py-1 text-sm text-ink"
                                        placeholder="0"
                                    />
                                ))}
                            </div>
                            <span className="text-secondary">]</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ExactMatrixEditorProps {
    title: string;
    matrix: string[][];
    onChange: (next: string[][]) => void;
    allowResize?: boolean;
}

export const ExactMatrixEditor: React.FC<ExactMatrixEditorProps> = ({ title, matrix, onChange, allowResize = true }) => {
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 1;

    const setSize = (nextRows: number, nextCols: number) => {
        onChange(resizeStringMatrix(matrix, nextRows, nextCols));
    };

    return (
        <div className="glass-panel rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-ink">{title}</h4>
                {allowResize && (
                    <div className="flex items-center gap-3 text-xs text-secondary">
                        <label className="flex items-center gap-2">
                            Rows
                            <input
                                type="number"
                                min={1}
                                value={rows}
                                onChange={(event) => setSize(parseInt(event.target.value, 10) || 1, cols)}
                                className="w-16 rounded-md glass-input px-2 py-1 text-ink"
                            />
                        </label>
                        <label className="flex items-center gap-2">
                            Cols
                            <input
                                type="number"
                                min={1}
                                value={cols}
                                onChange={(event) => setSize(rows, parseInt(event.target.value, 10) || 1)}
                                className="w-16 rounded-md glass-input px-2 py-1 text-ink"
                            />
                        </label>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto">
                <div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(4rem, 1fr))` }}>
                    {matrix.map((row, r) =>
                        row.map((value, c) => (
                            <input
                                key={`m-${r}-${c}`}
                                value={value}
                                onChange={(event) => {
                                    const next = matrix.map(existingRow => existingRow.slice());
                                    next[r][c] = event.target.value;
                                    onChange(next);
                                }}
                                className="rounded-md glass-input px-2 py-1 text-sm text-ink"
                                placeholder="0"
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
