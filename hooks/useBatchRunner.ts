import { useCallback, useState } from 'react';
import type { AnalysisMode, AnyResult, MatrixWorkerRequest, SavedMatrix, ValidMatrix } from '../types';

interface UseBatchRunnerArgs {
    library: SavedMatrix[];
    analysisMode: AnalysisMode;
    analysisOptions: { computeLU: boolean; computeQR: boolean; computeSVD: boolean; computeEigen: boolean };
    extractMatrixNames: (expr: string) => string[];
    parseSavedMatrixToValid: (saved: SavedMatrix) => ValidMatrix;
    runWorkerRequest: (type: MatrixWorkerRequest['type'], payload: MatrixWorkerRequest['payload'], group?: string) => Promise<any>;
    setError: (message: string | null) => void;
}

export const useBatchRunner = ({
    library,
    analysisMode,
    analysisOptions,
    extractMatrixNames,
    parseSavedMatrixToValid,
    runWorkerRequest,
    setError
}: UseBatchRunnerArgs) => {
    const [batchMode, setBatchMode] = useState<'analysis' | 'expression'>('analysis');
    const [batchExpression, setBatchExpression] = useState('A');
    const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
    const [batchResults, setBatchResults] = useState<{ id: string; name: string; result?: AnyResult; error?: string }[]>([]);
    const [batchRunning, setBatchRunning] = useState(false);

    const handleRunBatch = useCallback(async () => {
        setBatchRunning(true);
        setError(null);
        const selected = library.filter(item => batchSelectedIds.includes(item.id));
        if (selected.length === 0) {
            setBatchRunning(false);
            setError('Select at least one matrix to run.');
            return;
        }

        const expressionNames = extractMatrixNames(batchExpression);
        if (batchMode === 'expression' && expressionNames.some(name => name !== 'A')) {
            setBatchRunning(false);
            setError('Batch expression mode currently supports only matrix A.');
            return;
        }

        const order = selected.map(item => item.id);
        const nameMap = new Map(selected.map(item => [item.id, item.name]));
        const resultMap = new Map<string, { id: string; name: string; result?: AnyResult; error?: string }>();
        const validItems: { id: string; name: string; matrix: ValidMatrix }[] = [];

        selected.forEach(item => {
            try {
                const validMatrix = parseSavedMatrixToValid(item);
                validItems.push({ id: item.id, name: item.name, matrix: validMatrix });
            } catch (e) {
                resultMap.set(item.id, {
                    id: item.id,
                    name: item.name,
                    error: e instanceof Error ? e.message : 'Batch run failed.'
                });
            }
        });

        if (validItems.length === 0) {
            setBatchResults(order.map(id => resultMap.get(id) || { id, name: nameMap.get(id) || '', error: 'Batch run failed.' }));
            setBatchRunning(false);
            return;
        }

        try {
            const payload = {
                mode: batchMode,
                expression: batchExpression,
                analysisMode,
                analysisOptions,
                items: validItems
            } as MatrixWorkerRequest['payload'];
            const workerResult = await runWorkerRequest('batch', payload, 'batch');
            if (Array.isArray(workerResult)) {
                workerResult.forEach(item => resultMap.set(item.id, item));
            }
            const results = order.map(id => resultMap.get(id) || { id, name: nameMap.get(id) || '', error: 'Missing batch result.' });
            setBatchResults(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Batch run failed.');
        } finally {
            setBatchRunning(false);
        }
    }, [analysisMode, analysisOptions, batchExpression, batchMode, batchSelectedIds, library, parseSavedMatrixToValid, runWorkerRequest, setError, extractMatrixNames]);

    return {
        batchMode,
        setBatchMode,
        batchExpression,
        setBatchExpression,
        batchSelectedIds,
        setBatchSelectedIds,
        batchResults,
        setBatchResults,
        batchRunning,
        handleRunBatch
    };
};
