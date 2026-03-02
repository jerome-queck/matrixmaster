import { describe, expect, it } from 'vitest';
import { loadLibraryStore, saveLibraryStore } from '../../persistence/local/libraryStore';
import { migrateSavedMatricesToCatalog } from '../../features/library/compat';

const createMemoryStorage = () => {
    const map = new Map<string, string>();
    return {
        map,
        storage: {
            getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
            setItem: (key: string, value: string) => {
                map.set(key, value);
            },
            removeItem: (key: string) => {
                map.delete(key);
            }
        }
    };
};

describe('libraryStore persistence', () => {
    it('loads and migrates legacy saved matrix arrays', () => {
        const { map, storage } = createMemoryStorage();
        map.set(
            'matrix-master:default:library',
            JSON.stringify([
                {
                    id: 'legacy-1',
                    name: 'Legacy',
                    matrix: [['1', '0']],
                    rows: 1,
                    cols: 2,
                    folder: 'Favorites',
                    tags: ['legacy']
                }
            ])
        );

        const loaded = loadLibraryStore(storage, 'default', 1000);
        expect(loaded.source).toBe('legacy');
        expect(loaded.migrated).toBe(true);
        expect(loaded.catalog.items).toHaveLength(1);
        expect(loaded.catalog.items[0].kind).toBe('matrix');
        expect(loaded.catalog.folders[0].name).toBe('Favorites');
    });

    it('writes v2 catalog and captures recovery copy before overwrite', () => {
        const { map, storage } = createMemoryStorage();
        const key = 'matrix-master:default:library-v2';
        map.set(key, JSON.stringify({ schemaVersion: 2, savedAt: 1, catalog: { items: [] } }));

        const catalog = migrateSavedMatricesToCatalog([
            {
                id: 'm1',
                name: 'A',
                matrix: [['1']],
                rows: 1,
                cols: 1
            }
        ], 2000);

        const result = saveLibraryStore(storage, 'default', catalog, { now: 2001 });
        expect(result.ok).toBe(true);
        expect(result.key).toBe(key);
        expect(result.recoveryKey).toBeDefined();
        expect(result.recoveryKey ? map.has(result.recoveryKey) : false).toBe(true);
        expect(map.has('matrix-master:default:library')).toBe(true);
    });
});
