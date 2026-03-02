import { describe, expect, it } from 'vitest';
import { decodeMMatrixWorkspace, encodeMMatrixWorkspace, toLegacySharePayload } from '../../persistence/workspace/mmatrixCodec';

describe('mmatrix codec', () => {
    it('migrates legacy v2 share payloads into schema v3', () => {
        const legacyPayload = {
            version: 2,
            state: { appMode: 'systemSolver' },
            library: [
                {
                    id: 'm1',
                    name: 'Example Matrix',
                    matrix: [['1', '2'], ['3', '4']],
                    rows: 2,
                    cols: 2,
                    folder: 'Classwork',
                    tags: ['core']
                }
            ],
            history: [{ id: 'h1', name: 'Snapshot 1', createdAt: 10, state: { appMode: 'analysis' } }]
        };

        const decoded = decodeMMatrixWorkspace(JSON.stringify(legacyPayload), 1000);
        expect(decoded.migrated).toBe(true);
        expect(decoded.sourceSchemaVersion).toBe(2);
        expect(decoded.snapshot.schemaVersion).toBe(3);
        expect(decoded.snapshot.library.items).toHaveLength(1);
        expect(decoded.snapshot.library.items[0].kind).toBe('matrix');
        expect(decoded.snapshot.library.folders).toHaveLength(1);
        expect(decoded.snapshot.library.folders[0].name).toBe('Classwork');
    });

    it('round-trips schema v3 payloads without migration', () => {
        const decoded = decodeMMatrixWorkspace(
            JSON.stringify({
                version: 2,
                state: { appMode: 'analysis' },
                library: []
            }),
            2000
        );

        const encoded = encodeMMatrixWorkspace(decoded.snapshot, true);
        const roundTrip = decodeMMatrixWorkspace(encoded, 2100);

        expect(roundTrip.migrated).toBe(false);
        expect(roundTrip.snapshot.schemaVersion).toBe(3);
        expect(roundTrip.snapshot.state.appMode).toBe('analysis');
    });

    it('emits legacy-compatible payload with matrix-only library entries', () => {
        const decoded = decodeMMatrixWorkspace(
            JSON.stringify({
                version: 2,
                state: { appMode: 'systemSolver' },
                library: [
                    {
                        id: 'm2',
                        name: 'Legacy Matrix',
                        matrix: [['5']],
                        rows: 1,
                        cols: 1
                    }
                ]
            }),
            3000
        );

        const legacy = toLegacySharePayload(decoded.snapshot);
        expect(legacy.version).toBe(2);
        expect(Array.isArray(legacy.library)).toBe(true);
        expect(legacy.library?.[0].name).toBe('Legacy Matrix');
    });
});
