import type { SavedMatrix } from '../../types';
import { createSafeStorage, safeJsonParse } from '../../services/storageService';
import type { LibraryCatalog } from '../../features/library/contracts';
import { libraryItemToSavedMatrix, migrateSavedMatricesToCatalog } from '../../features/library/compat';
import { createEmptyLibraryCatalog, folderNameById, normalizeLibraryCatalog } from '../../features/library/state';
import { writeTextWithRecovery } from '../recovery/recoveryCopies';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const LIBRARY_STORE_SCHEMA_VERSION = 2;

export interface PersistedLibraryStoreV2 {
    schemaVersion: number;
    savedAt: number;
    catalog: LibraryCatalog;
}

export interface LoadLibraryStoreResult {
    catalog: LibraryCatalog;
    source: 'v2' | 'legacy' | 'empty';
    migrated: boolean;
}

export interface SaveLibraryStoreResult {
    ok: boolean;
    key: string;
    recoveryKey?: string;
    mirroredLegacy: boolean;
    error?: string;
}

export interface SaveLibraryStoreOptions {
    now?: number;
    mirrorLegacy?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const libraryStoreKey = (profileId: string): string => `matrix-master:${profileId}:library-v2`;
export const legacyLibraryStoreKey = (profileId: string): string => `matrix-master:${profileId}:library`;

const decodePersistedStore = (
    raw: string | null | undefined,
    now = Date.now()
): { catalog: LibraryCatalog; migrated: boolean } => {
    if (!raw) return { catalog: createEmptyLibraryCatalog(now), migrated: false };

    const parsed = safeJsonParse<unknown>(raw, null);
    if (Array.isArray(parsed)) {
        return {
            catalog: migrateSavedMatricesToCatalog(parsed as SavedMatrix[], now),
            migrated: true
        };
    }

    if (!isRecord(parsed)) {
        return { catalog: createEmptyLibraryCatalog(now), migrated: false };
    }

    if (isRecord(parsed.catalog)) {
        return {
            catalog: normalizeLibraryCatalog(parsed.catalog as Partial<LibraryCatalog>, now),
            migrated: Number(parsed.schemaVersion) !== LIBRARY_STORE_SCHEMA_VERSION
        };
    }

    if (Array.isArray(parsed.items)) {
        return {
            catalog: normalizeLibraryCatalog(parsed as Partial<LibraryCatalog>, now),
            migrated: true
        };
    }

    return { catalog: createEmptyLibraryCatalog(now), migrated: false };
};

const toPersistedStore = (catalog: LibraryCatalog, savedAt = Date.now()): PersistedLibraryStoreV2 => ({
    schemaVersion: LIBRARY_STORE_SCHEMA_VERSION,
    savedAt,
    catalog
});

export const exportMatrixLibraryForLegacy = (catalog: LibraryCatalog): SavedMatrix[] =>
    catalog.items
        .map(item => libraryItemToSavedMatrix(item, folderId => folderNameById(catalog, folderId)))
        .filter((item): item is SavedMatrix => item !== null);

export const loadLibraryStore = (
    storage: StorageLike | null | undefined,
    profileId: string,
    now = Date.now()
): LoadLibraryStoreResult => {
    const safe = createSafeStorage(storage);
    const v2Raw = safe.getItem(libraryStoreKey(profileId));
    if (v2Raw) {
        const decoded = decodePersistedStore(v2Raw, now);
        return {
            catalog: decoded.catalog,
            source: 'v2',
            migrated: decoded.migrated
        };
    }

    const legacyRaw = safe.getItem(legacyLibraryStoreKey(profileId));
    if (legacyRaw) {
        const decoded = decodePersistedStore(legacyRaw, now);
        return {
            catalog: decoded.catalog,
            source: 'legacy',
            migrated: true
        };
    }

    return {
        catalog: createEmptyLibraryCatalog(now),
        source: 'empty',
        migrated: false
    };
};

export const saveLibraryStore = (
    storage: StorageLike | null | undefined,
    profileId: string,
    catalog: LibraryCatalog,
    options: SaveLibraryStoreOptions = {}
): SaveLibraryStoreResult => {
    if (!storage) {
        return {
            ok: false,
            key: libraryStoreKey(profileId),
            mirroredLegacy: false,
            error: 'Storage unavailable.'
        };
    }

    const now = options.now ?? Date.now();
    const mirrorLegacy = options.mirrorLegacy ?? true;
    const normalizedCatalog = normalizeLibraryCatalog(catalog, now);
    const persisted = toPersistedStore(normalizedCatalog, now);
    const nextValue = JSON.stringify(persisted);
    const key = libraryStoreKey(profileId);

    const writeResult = writeTextWithRecovery({
        storage,
        targetKey: key,
        nextValue,
        reason: 'library-overwrite',
        createdAt: now,
        sourceSchemaVersion: LIBRARY_STORE_SCHEMA_VERSION
    });

    if (!writeResult.ok) {
        return {
            ok: false,
            key,
            mirroredLegacy: false,
            recoveryKey: writeResult.recoveryKey,
            error: writeResult.error
        };
    }

    let mirroredLegacy = false;
    if (mirrorLegacy) {
        const legacyPayload = JSON.stringify(exportMatrixLibraryForLegacy(normalizedCatalog));
        try {
            storage.setItem(legacyLibraryStoreKey(profileId), legacyPayload);
            mirroredLegacy = true;
        } catch {
            mirroredLegacy = false;
        }
    }

    return {
        ok: true,
        key,
        recoveryKey: writeResult.recoveryKey,
        mirroredLegacy
    };
};
