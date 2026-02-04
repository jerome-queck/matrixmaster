import React, { memo, useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { Matrix, SystemType } from '../types';
import { parseInput, stringifySymbolicFraction, validateInput } from '../services/matrixService';
import { readFromClipboard } from '../services/clipboardService';

interface MatrixInputProps {
    rows: number;
    cols: number;
    matrix: Matrix;
    systemType: SystemType;
    onMatrixChange: (matrix: Matrix) => void;
    onSave: () => void;
    onLoad: () => void;
    title?: string;
    onClipboardError?: (message: string, data?: unknown) => void;
}

export const MatrixInput: React.FC<MatrixInputProps> = memo(({ rows, cols, matrix, systemType, onMatrixChange, onSave, onLoad, title, onClipboardError }) => {
    
    const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
    const [validationErrors, setValidationErrors] = useState<boolean[][]>([]);

    useEffect(() => {
        // Initialize refs and validation state
        inputRefs.current = Array(rows).fill(null).map(() => Array(cols).fill(null));
        setValidationErrors(Array(rows).fill(null).map(() => Array(cols).fill(false)));
    }, [rows, cols]);

    const handleCellChange = useCallback((r: number, c: number, value: string, updateMatrix: boolean) => {
        // Instant validation on every change
        const isValid = validateInput(value);
        setValidationErrors(prev => {
            const newErrors = prev.map(row => [...row]);
            newErrors[r][c] = !isValid;
            return newErrors;
        });

        // Only update the main matrix state on blur (or when forced)
        if (updateMatrix && isValid) {
            const newMatrix = matrix.map(row => [...row]);
            try {
                if (value.trim() === '') {
                    newMatrix[r][c] = null;
                } else {
                    newMatrix[r][c] = parseInput(value);
                }
            } catch (error) {
                newMatrix[r][c] = null; // Should not happen due to validation, but as a fallback
            }
            onMatrixChange(newMatrix);
        }
    }, [matrix, onMatrixChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
        let nr = r, nc = c;
        switch (e.key) {
            case 'ArrowUp':    nr = r > 0 ? r - 1 : rows - 1; break;
            case 'ArrowDown':  nr = r < rows - 1 ? r + 1 : 0; break;
            case 'ArrowLeft':  nc = c > 0 ? c - 1 : cols - 1; break;
            case 'ArrowRight': nc = c < cols - 1 ? c + 1 : 0; break;
            case 'Enter':      nr = r < rows - 1 ? r + 1 : 0; nc = c; break;
            default: return;
        }
        e.preventDefault();
        inputRefs.current[nr]?.[nc]?.focus();
        inputRefs.current[nr]?.[nc]?.select();
    }, [rows, cols]);
    
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const r = Number(e.currentTarget.dataset.row);
        const c = Number(e.currentTarget.dataset.col);
        if (Number.isNaN(r) || Number.isNaN(c)) return;
        handleCellChange(r, c, e.currentTarget.value, false);
    }, [handleCellChange]);

    const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        const r = Number(e.currentTarget.dataset.row);
        const c = Number(e.currentTarget.dataset.col);
        if (Number.isNaN(r) || Number.isNaN(c)) return;
        handleCellChange(r, c, e.currentTarget.value, true);
    }, [handleCellChange]);

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        const r = Number((e.currentTarget as HTMLInputElement).dataset.row);
        const c = Number((e.currentTarget as HTMLInputElement).dataset.col);
        if (Number.isNaN(r) || Number.isNaN(c)) return;
        handleKeyDown(e, r, c);
    }, [handleKeyDown]);

    const handlePaste = async () => {
        try {
            const text = await readFromClipboard();
            const newMatrix = matrix.map(row => [...row]);
            const pastedRows = text.split(/\r?\n/).map(row => row.split(/[\t,]/));
            
            for (let r = 0; r < Math.min(rows, pastedRows.length); r++) {
                for (let c = 0; c < Math.min(cols, pastedRows[r].length); c++) {
                    const value = pastedRows[r][c].trim();
                     if (validateInput(value)) {
                        newMatrix[r][c] = value === '' ? null : parseInput(value);
                        if(inputRefs.current[r][c]) inputRefs.current[r][c]!.value = value;
                    }
                }
            }
            onMatrixChange(newMatrix);
        } catch (err) {
            onClipboardError?.('Clipboard unavailable. Unable to paste.', err);
        }
    };

    const isAugmentedCol = (c: number) => systemType === 'non-homogeneous' && c === cols - 1;
    const cellValues = useMemo(() => matrix.map(row => row.map(cell => stringifySymbolicFraction(cell))), [matrix]);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                {title && <h3 className="text-lg font-semibold text-primary">{title}</h3>}
                 <div className="flex gap-2">
                    <button onClick={handlePaste} className="text-xs py-1 px-3 rounded-xl glass-btn">Paste from Clipboard</button>
                    <button onClick={onSave} className="text-xs py-1 px-3 rounded-xl glass-btn glass-btn-primary">Save to Library</button>
                    <button onClick={onLoad} className="text-xs py-1 px-3 rounded-xl glass-btn">Load from Library</button>
                </div>
            </div>
            <div className="overflow-x-auto p-3 glass-panel rounded-2xl flex justify-center">
                <div className="grid gap-1 sm:gap-2 min-w-max" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {matrix.map((row, r) =>
                        row.map((cell, c) => (
                            <div key={`${r}-${c}`} className={`relative ${isAugmentedCol(c) ? 'ml-2' : ''}`}>
                                {isAugmentedCol(c) && <div className="absolute top-0 bottom-0 -left-2 w-px bg-cyan-400/50" />}
                                <input
                                    ref={el => { if (inputRefs.current[r]) inputRefs.current[r][c] = el; }}
                                    type="text"
                                    defaultValue={cellValues[r]?.[c] ?? ''}
                                    data-row={r}
                                    data-col={c}
                                    onChange={handleInputChange}
                                    onBlur={handleInputBlur}
                                    onKeyDown={handleInputKeyDown}
                                    className={`matrix-cell-style border rounded-md text-center glass-input focus:ring-0 transition-all hover:border-cyan-300 
                                    ${isAugmentedCol(c) ? 'bg-white/10' : ''}
                                    ${validationErrors[r]?.[c] ? '!border-red-500 ring-red-500/50' : ''}`}
                                    aria-invalid={validationErrors[r]?.[c] || undefined}
                                    aria-label={`Matrix cell row ${r+1} column ${c+1}`}
                                />
                                {validationErrors[r]?.[c] && (
                                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-red-400 whitespace-nowrap">
                                        Invalid
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
});
