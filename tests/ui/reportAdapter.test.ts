import { describe, expect, it } from 'vitest';
import {
    adaptExactSurfaceResultsToSharedResult,
    adaptInputRequiredRoutePlaceholderToSharedResult,
    adaptIterativeSurfaceToSharedResult,
    adaptMatrixSurfaceToSharedResult
} from '../../features/advanced/reportAdapter';
import type { ExactSurfaceResult } from '../../engines/exact/contracts';
import { parseInput } from '../../services/matrixService';

describe('advanced report adapter', () => {
    it('adapts matrix-based advanced outputs to shared matrix-operations results', () => {
        const adapted = adaptMatrixSurfaceToSharedResult('Jordan form', [[1, 0], [0, 2]], [
            { label: 'Input matrix A', matrix: [[1, 2], [3, 4]] }
        ]);

        expect(adapted.finalResult).toHaveLength(2);
        expect(adapted.finalResult[0]).toHaveLength(2);
        expect(adapted.steps).toHaveLength(2);
        expect(adapted.steps[0].operation).toContain('Input matrix A');
        expect(adapted.steps[1].operation).toContain('Jordan form');
        expect(adapted.conditions).toEqual([]);
    });

    it('adapts iterative solver outputs to shared matrix-operations results', () => {
        const adapted = adaptIterativeSurfaceToSharedResult('gmres', [1, -2, 3], [1, 0.2, 0.05, 0.01]);

        expect(adapted.finalResult).toHaveLength(3);
        expect(adapted.finalResult[0]).toHaveLength(1);
        expect(adapted.steps).toHaveLength(2);
        expect(adapted.steps[0].operation).toContain('Residual history');
        expect(adapted.steps[1].operation).toContain('GMRES');
    });

    it('keeps exact-card adaptation deterministic without borrowing prior matrices', () => {
        const results: ExactSurfaceResult[] = [
            {
                id: 'exact-card-with-matrix',
                title: 'Card One',
                summary: 'Has matrix action',
                latexBlocks: ['A = \\begin{bmatrix}1\\end{bmatrix}'],
                actions: [
                    {
                        id: 'use-a',
                        kind: 'use-matrix',
                        label: 'Use A',
                        matrix: [[parseInput('9')]]
                    }
                ]
            },
            {
                id: 'exact-card-without-matrix',
                title: 'Card Two',
                summary: 'No matrix action available',
                latexBlocks: ['\\text{No matrix action on this card}'],
                actions: [
                    {
                        id: 'copy-card-two',
                        kind: 'copy-latex',
                        label: 'Copy LaTeX',
                        latex: '\\text{No matrix action on this card}'
                    }
                ]
            }
        ];

        const adapted = adaptExactSurfaceResultsToSharedResult('Exact Studio', results);

        expect(adapted.steps).toHaveLength(2);
        expect(adapted.steps[0].result).not.toEqual(adapted.steps[1].result);
        expect(adapted.finalResult).toEqual(adapted.steps[1].result);
    });

    it('builds deterministic input-required placeholders for route-driven flows', () => {
        const first = adaptInputRequiredRoutePlaceholderToSharedResult(
            'Matrix functions',
            ['Select a source matrix.', 'Fill every cell in the source matrix.'],
            ['Route execution deferred.']
        );
        const second = adaptInputRequiredRoutePlaceholderToSharedResult(
            'Matrix functions',
            ['Select a source matrix.', 'Fill every cell in the source matrix.'],
            ['Route execution deferred.']
        );

        expect(first).toEqual(second);
        expect(first.steps[0].operation).toContain('Status: Input required');
        expect(first.steps.some((step) => step.operation.includes('Required input 1'))).toBe(true);
        expect(first.steps.some((step) => step.operation.includes('Diagnostic 1'))).toBe(true);
    });
});
