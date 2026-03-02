import type { SavedMatrix } from '../../types';
import type { LibraryCatalog, LibraryItem, MatrixObject } from './contracts';
import { createEmptyLibraryCatalog, ensureLibraryFolder, upsertLibraryItem } from './state';

const normalizeMatrixRows = (matrix: unknown): (string | null)[][] => {
    if (!Array.isArray(matrix)) return [];
    return matrix.map(row => {
        if (!Array.isArray(row)) return [];
        return row.map(cell => {
            if (cell === null) return null;
            if (typeof cell === 'string') return cell;
            if (cell === undefined) return null;
            return String(cell);
        });
    });
};

const normalizeTags = (tags: string[] | undefined): string[] => {
    if (!tags) return [];
    const seen = new Set<string>();
    const next: string[] = [];
    for (const tag of tags) {
        const trimmed = tag.trim();
        const key = trimmed.toLowerCase();
        if (!trimmed || seen.has(key)) continue;
        seen.add(key);
        next.push(trimmed);
    }
    return next;
};

export const savedMatrixToLibraryItem = (
    saved: SavedMatrix,
    now = Date.now(),
    folderId?: string
): LibraryItem => {
    const values = normalizeMatrixRows(saved.matrix);
    const rows = saved.rows || values.length;
    const cols = saved.cols || (values[0]?.length || 0);
    const matrixObject: MatrixObject = {
        kind: 'matrix',
        rows,
        cols,
        values
    };

    return {
        id: saved.id || `m_${now}`,
        kind: 'matrix',
        name: saved.name?.trim() || `Matrix ${new Date(now).toISOString()}`,
        object: matrixObject,
        tags: normalizeTags(saved.tags),
        folderId,
        favorite: false,
        createdAt: saved.createdAt || now,
        updatedAt: saved.createdAt || now,
        source: 'migration'
    };
};

export const libraryItemToSavedMatrix = (
    item: LibraryItem,
    resolveFolderName?: (folderId?: string) => string | undefined
): SavedMatrix | null => {
    if (item.kind !== 'matrix' || item.object.kind !== 'matrix') return null;
    const matrixObject = item.object;
    return {
        id: item.id,
        name: item.name,
        matrix: matrixObject.values,
        rows: matrixObject.rows,
        cols: matrixObject.cols,
        tags: item.tags.length > 0 ? item.tags : undefined,
        folder: resolveFolderName?.(item.folderId),
        createdAt: item.createdAt
    };
};

export const migrateSavedMatricesToCatalog = (savedMatrices: SavedMatrix[], now = Date.now()): LibraryCatalog => {
    let catalog = createEmptyLibraryCatalog(now);
    for (const saved of savedMatrices) {
        if (!saved || typeof saved !== 'object') continue;
        let folderId: string | undefined;
        if (typeof saved.folder === 'string' && saved.folder.trim().length > 0) {
            const ensured = ensureLibraryFolder(catalog, saved.folder, undefined, now);
            catalog = ensured.catalog;
            folderId = ensured.folderId;
        }
        const item = savedMatrixToLibraryItem(saved, now, folderId);
        catalog = upsertLibraryItem(catalog, item, now);
    }
    return catalog;
};
