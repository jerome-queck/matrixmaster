import type { LibraryObjectKind } from '../../types';
import type {
    LibraryCatalog,
    LibraryCatalogSummary,
    LibraryFolder,
    LibraryHistoryAction,
    LibraryHistoryEntry,
    LibraryItem,
    LibraryRecentEntry
} from './contracts';

export const LIBRARY_CATALOG_SCHEMA_VERSION = 1;
export const DEFAULT_RECENTS_LIMIT = 24;
export const DEFAULT_HISTORY_LIMIT = 300;

const FALLBACK_FOLDER_NAME = 'Unsorted';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const createId = (prefix: string, at: number) => `${prefix}_${at}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeTags = (tags: unknown): string[] => {
    if (!Array.isArray(tags)) return [];
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const raw of tags) {
        if (typeof raw !== 'string') continue;
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(trimmed);
    }
    return normalized;
};

const normalizeKind = (kind: unknown): LibraryObjectKind | null => {
    if (kind === 'matrix' || kind === 'vector' || kind === 'vectorSet' || kind === 'basis' || kind === 'linearMap' || kind === 'workspace') {
        return kind;
    }
    return null;
};

const hasMatchingObjectKind = (item: Record<string, unknown>, kind: LibraryObjectKind): boolean => {
    const object = item.object;
    return isRecord(object) && object.kind === kind;
};

const normalizeFolderName = (folderName: string): string => {
    const trimmed = folderName.trim();
    return trimmed.length > 0 ? trimmed : FALLBACK_FOLDER_NAME;
};

export const createFolderId = (folderName: string): string => {
    const normalized = normalizeFolderName(folderName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `folder_${normalized || 'unsorted'}`;
};

const pushHistory = (
    history: LibraryHistoryEntry[],
    action: LibraryHistoryAction,
    at: number,
    itemId?: string,
    details?: Record<string, string | number | boolean | null>,
    limit = DEFAULT_HISTORY_LIMIT
): LibraryHistoryEntry[] => {
    const entry: LibraryHistoryEntry = {
        id: createId('hist', at),
        action,
        at,
        itemId,
        details
    };
    const next = [...history, entry];
    if (next.length <= limit) return next;
    return next.slice(next.length - limit);
};

const syncFavorites = (items: LibraryItem[]): string[] => items.filter(item => item.favorite).map(item => item.id);

const normalizeRecentEntries = (recents: unknown): LibraryRecentEntry[] => {
    if (!Array.isArray(recents)) return [];
    return recents
        .filter(isRecord)
        .map(entry => ({
            itemId: typeof entry.itemId === 'string' ? entry.itemId : '',
            openedAt: typeof entry.openedAt === 'number' ? entry.openedAt : 0
        }))
        .filter(entry => entry.itemId.length > 0 && entry.openedAt > 0)
        .sort((a, b) => b.openedAt - a.openedAt);
};

const normalizeFolders = (folders: unknown, now: number): LibraryFolder[] => {
    if (!Array.isArray(folders)) return [];
    return folders
        .filter(isRecord)
        .map(folder => {
            const name = typeof folder.name === 'string' ? normalizeFolderName(folder.name) : FALLBACK_FOLDER_NAME;
            return {
                id: typeof folder.id === 'string' ? folder.id : createFolderId(name),
                name,
                parentId: typeof folder.parentId === 'string' ? folder.parentId : undefined,
                createdAt: typeof folder.createdAt === 'number' ? folder.createdAt : now,
                updatedAt: typeof folder.updatedAt === 'number' ? folder.updatedAt : now
            };
        });
};

const normalizeItems = (items: unknown, now: number): LibraryItem[] => {
    if (!Array.isArray(items)) return [];
    return items
        .filter(isRecord)
        .map(item => {
            const kind = normalizeKind(item.kind);
            if (!kind || !hasMatchingObjectKind(item, kind)) return null;
            const name = typeof item.name === 'string' ? item.name.trim() : '';
            const id = typeof item.id === 'string' ? item.id : '';
            if (!id || !name) return null;
            return {
                id,
                kind,
                name,
                object: item.object as LibraryItem['object'],
                tags: normalizeTags(item.tags),
                folderId: typeof item.folderId === 'string' ? item.folderId : undefined,
                favorite: Boolean(item.favorite),
                createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
                updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
                lastOpenedAt: typeof item.lastOpenedAt === 'number' ? item.lastOpenedAt : undefined,
                source: typeof item.source === 'string' ? (item.source as LibraryItem['source']) : 'manual',
                notes: typeof item.notes === 'string' ? item.notes : undefined,
                outputs: Array.isArray(item.outputs) ? (item.outputs as LibraryItem['outputs']) : undefined
            } satisfies LibraryItem;
        })
        .filter((item): item is LibraryItem => item !== null);
};

export const createEmptyLibraryCatalog = (now = Date.now()): LibraryCatalog => ({
    schemaVersion: LIBRARY_CATALOG_SCHEMA_VERSION,
    items: [],
    folders: [],
    recents: [],
    favorites: [],
    history: [],
    lastUpdatedAt: now
});

export const normalizeLibraryCatalog = (
    input: Partial<LibraryCatalog> | null | undefined,
    now = Date.now()
): LibraryCatalog => {
    if (!input || !isRecord(input)) return createEmptyLibraryCatalog(now);
    const items = normalizeItems(input.items, now);
    const folders = normalizeFolders(input.folders, now);
    const recents = normalizeRecentEntries(input.recents);
    const history = Array.isArray(input.history) ? (input.history as LibraryHistoryEntry[]) : [];
    return {
        schemaVersion: typeof input.schemaVersion === 'number' ? input.schemaVersion : LIBRARY_CATALOG_SCHEMA_VERSION,
        items,
        folders,
        recents,
        favorites: syncFavorites(items),
        history,
        lastUpdatedAt: typeof input.lastUpdatedAt === 'number' ? input.lastUpdatedAt : now
    };
};

export const ensureLibraryFolder = (
    catalog: LibraryCatalog,
    folderName: string,
    parentId?: string,
    at = Date.now()
): { catalog: LibraryCatalog; folderId: string } => {
    const normalizedName = normalizeFolderName(folderName);
    const existing = catalog.folders.find(folder => folder.name.toLowerCase() === normalizedName.toLowerCase() && folder.parentId === parentId);
    if (existing) {
        return {
            catalog,
            folderId: existing.id
        };
    }

    const newFolder: LibraryFolder = {
        id: createFolderId(normalizedName),
        name: normalizedName,
        parentId,
        createdAt: at,
        updatedAt: at
    };
    return {
        catalog: {
            ...catalog,
            folders: [...catalog.folders, newFolder],
            lastUpdatedAt: at
        },
        folderId: newFolder.id
    };
};

export const upsertLibraryItem = (catalog: LibraryCatalog, item: LibraryItem, at = Date.now()): LibraryCatalog => {
    const normalized: LibraryItem = {
        ...item,
        tags: normalizeTags(item.tags),
        favorite: Boolean(item.favorite),
        createdAt: item.createdAt || at,
        updatedAt: at,
        source: item.source || 'manual'
    };

    const existingIndex = catalog.items.findIndex(existing => existing.id === normalized.id);
    const items = [...catalog.items];
    const action: LibraryHistoryAction = existingIndex >= 0 ? 'update' : 'create';
    if (existingIndex >= 0) {
        normalized.createdAt = items[existingIndex].createdAt;
        items[existingIndex] = normalized;
    } else {
        items.push(normalized);
    }

    return {
        ...catalog,
        items,
        favorites: syncFavorites(items),
        history: pushHistory(catalog.history, action, at, normalized.id, { kind: normalized.kind }),
        lastUpdatedAt: at
    };
};

export const removeLibraryItem = (catalog: LibraryCatalog, itemId: string, at = Date.now()): LibraryCatalog => {
    const existing = catalog.items.find(item => item.id === itemId);
    if (!existing) return catalog;
    const items = catalog.items.filter(item => item.id !== itemId);
    const recents = catalog.recents.filter(entry => entry.itemId !== itemId);
    return {
        ...catalog,
        items,
        recents,
        favorites: syncFavorites(items),
        history: pushHistory(catalog.history, 'delete', at, itemId, { kind: existing.kind }),
        lastUpdatedAt: at
    };
};

export const markLibraryItemOpened = (
    catalog: LibraryCatalog,
    itemId: string,
    openedAt = Date.now(),
    recentsLimit = DEFAULT_RECENTS_LIMIT
): LibraryCatalog => {
    const index = catalog.items.findIndex(item => item.id === itemId);
    if (index < 0) return catalog;
    const items = [...catalog.items];
    items[index] = {
        ...items[index],
        lastOpenedAt: openedAt,
        updatedAt: Math.max(items[index].updatedAt, openedAt)
    };
    const dedupedRecents = catalog.recents.filter(entry => entry.itemId !== itemId);
    const recents = [{ itemId, openedAt }, ...dedupedRecents].slice(0, Math.max(1, recentsLimit));
    return {
        ...catalog,
        items,
        recents,
        history: pushHistory(catalog.history, 'load', openedAt, itemId),
        lastUpdatedAt: openedAt
    };
};

export const setLibraryItemFavorite = (
    catalog: LibraryCatalog,
    itemId: string,
    favorite?: boolean,
    at = Date.now()
): LibraryCatalog => {
    const index = catalog.items.findIndex(item => item.id === itemId);
    if (index < 0) return catalog;
    const items = [...catalog.items];
    const nextFavorite = favorite ?? !items[index].favorite;
    if (items[index].favorite === nextFavorite) return catalog;
    items[index] = {
        ...items[index],
        favorite: nextFavorite,
        updatedAt: at
    };
    return {
        ...catalog,
        items,
        favorites: syncFavorites(items),
        history: pushHistory(catalog.history, 'favorite', at, itemId, { value: nextFavorite }),
        lastUpdatedAt: at
    };
};

export const summarizeLibraryCatalog = (catalog: LibraryCatalog): LibraryCatalogSummary => {
    const folderCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    for (const item of catalog.items) {
        const folderId = item.folderId || 'unfiled';
        folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
        for (const tag of item.tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    }
    return {
        totalItems: catalog.items.length,
        favoriteCount: catalog.favorites.length,
        recentsCount: catalog.recents.length,
        folderCounts,
        tagCounts
    };
};

export const folderNameById = (catalog: LibraryCatalog, folderId?: string): string | undefined =>
    folderId ? catalog.folders.find(folder => folder.id === folderId)?.name : undefined;
