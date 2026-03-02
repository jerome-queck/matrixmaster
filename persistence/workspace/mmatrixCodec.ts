import type {
    MatrixRecipe,
    SavedMatrix,
    SharedState,
    VariableAssumption,
    WorkspaceSnapshot
} from '../../types';
import type { LibraryCatalog, SavedOutputMetadata } from '../../features/library/contracts';
import { libraryItemToSavedMatrix, migrateSavedMatricesToCatalog } from '../../features/library/compat';
import { createEmptyLibraryCatalog, folderNameById, normalizeLibraryCatalog } from '../../features/library/state';

export const MMATRIX_FORMAT = 'mmatrix' as const;
export const MMATRIX_CURRENT_SCHEMA_VERSION = 3 as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceSharedState = (value: unknown): SharedState => {
    if (isRecord(value) && typeof value.appMode === 'string') {
        return value as SharedState;
    }
    return {
        appMode: 'systemSolver'
    };
};

const normalizeSettings = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const normalizeOutputs = (value: unknown): SavedOutputMetadata[] =>
    Array.isArray(value) ? (value as SavedOutputMetadata[]) : [];

export interface MMatrixWorkspaceV3 extends WorkspaceSnapshot {
    format: typeof MMATRIX_FORMAT;
    schemaVersion: typeof MMATRIX_CURRENT_SCHEMA_VERSION;
    state: SharedState;
    library: LibraryCatalog;
    recipes: MatrixRecipe[];
    assumptions: VariableAssumption[];
    history: unknown[];
    settings: Record<string, unknown>;
    outputs: SavedOutputMetadata[];
    metadata: {
        canonicalExtension: '.mmatrix';
        localOnly: true;
        migratedFromVersion?: number;
        migrationNotes?: string[];
    };
}

export interface LegacyMMatrixWorkspaceV2 {
    version?: number;
    state?: SharedState;
    library?: SavedMatrix[];
    recipes?: MatrixRecipe[];
    assumptions?: VariableAssumption[];
    history?: unknown[];
    settings?: Record<string, unknown>;
}

export interface DecodedMMatrixWorkspace {
    snapshot: MMatrixWorkspaceV3;
    migrated: boolean;
    sourceSchemaVersion: number;
    warnings: string[];
}

const createSnapshotFromState = (state: SharedState, now = Date.now()): MMatrixWorkspaceV3 => ({
    format: MMATRIX_FORMAT,
    schemaVersion: MMATRIX_CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    state,
    library: createEmptyLibraryCatalog(now),
    recipes: [],
    assumptions: [],
    history: [],
    settings: {},
    outputs: [],
    metadata: {
        canonicalExtension: '.mmatrix',
        localOnly: true
    }
});

const normalizeSnapshot = (snapshot: MMatrixWorkspaceV3, now = Date.now()): MMatrixWorkspaceV3 => ({
    format: MMATRIX_FORMAT,
    schemaVersion: MMATRIX_CURRENT_SCHEMA_VERSION,
    createdAt: typeof snapshot.createdAt === 'number' ? snapshot.createdAt : now,
    updatedAt: typeof snapshot.updatedAt === 'number' ? snapshot.updatedAt : now,
    state: coerceSharedState(snapshot.state),
    library: normalizeLibraryCatalog(snapshot.library, now),
    recipes: Array.isArray(snapshot.recipes) ? snapshot.recipes : [],
    assumptions: Array.isArray(snapshot.assumptions) ? snapshot.assumptions : [],
    history: Array.isArray(snapshot.history) ? snapshot.history : [],
    settings: normalizeSettings(snapshot.settings),
    outputs: normalizeOutputs(snapshot.outputs),
    metadata: {
        canonicalExtension: '.mmatrix',
        localOnly: true,
        ...(isRecord(snapshot.metadata) ? snapshot.metadata : {})
    }
});

const isV3Snapshot = (value: unknown): value is MMatrixWorkspaceV3 =>
    isRecord(value)
    && value.format === MMATRIX_FORMAT
    && value.schemaVersion === MMATRIX_CURRENT_SCHEMA_VERSION
    && 'state' in value;

const isLegacyV2Snapshot = (value: unknown): value is LegacyMMatrixWorkspaceV2 =>
    isRecord(value)
    && 'state' in value
    && value.format !== MMATRIX_FORMAT;

export const migrateLegacyV2ToV3 = (
    legacy: LegacyMMatrixWorkspaceV2,
    now = Date.now()
): MMatrixWorkspaceV3 => {
    const migratedFromVersion = typeof legacy.version === 'number' ? legacy.version : 2;
    return {
        format: MMATRIX_FORMAT,
        schemaVersion: MMATRIX_CURRENT_SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now,
        state: coerceSharedState(legacy.state),
        library: migrateSavedMatricesToCatalog(Array.isArray(legacy.library) ? legacy.library : [], now),
        recipes: Array.isArray(legacy.recipes) ? legacy.recipes : [],
        assumptions: Array.isArray(legacy.assumptions) ? legacy.assumptions : [],
        history: Array.isArray(legacy.history) ? legacy.history : [],
        settings: normalizeSettings(legacy.settings),
        outputs: [],
        metadata: {
            canonicalExtension: '.mmatrix',
            localOnly: true,
            migratedFromVersion,
            migrationNotes: ['Migrated from legacy Matrix Master share payload.']
        }
    };
};

export const decodeMMatrixWorkspace = (input: string | unknown, now = Date.now()): DecodedMMatrixWorkspace => {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    const warnings: string[] = [];

    if (isRecord(parsed) && parsed.format === MMATRIX_FORMAT && typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > MMATRIX_CURRENT_SCHEMA_VERSION) {
        throw new Error(`Unsupported .mmatrix schema version ${parsed.schemaVersion}.`);
    }

    if (isV3Snapshot(parsed)) {
        const normalized = normalizeSnapshot(parsed, now);
        return {
            snapshot: normalized,
            migrated: false,
            sourceSchemaVersion: MMATRIX_CURRENT_SCHEMA_VERSION,
            warnings
        };
    }

    if (isLegacyV2Snapshot(parsed)) {
        const migrated = migrateLegacyV2ToV3(parsed, now);
        warnings.push('Loaded legacy workspace payload and migrated to schema v3.');
        return {
            snapshot: migrated,
            migrated: true,
            sourceSchemaVersion: typeof parsed.version === 'number' ? parsed.version : 2,
            warnings
        };
    }

    if (isRecord(parsed) && typeof parsed.appMode === 'string') {
        warnings.push('Loaded legacy shared state payload and wrapped it in .mmatrix schema v3.');
        return {
            snapshot: createSnapshotFromState(parsed as SharedState, now),
            migrated: true,
            sourceSchemaVersion: 1,
            warnings
        };
    }

    throw new Error('Unrecognized .mmatrix payload.');
};

export const encodeMMatrixWorkspace = (snapshot: MMatrixWorkspaceV3, pretty = false): string =>
    JSON.stringify(normalizeSnapshot(snapshot), null, pretty ? 2 : undefined);

export const toLegacySharePayload = (snapshot: MMatrixWorkspaceV3): LegacyMMatrixWorkspaceV2 => {
    const normalized = normalizeSnapshot(snapshot);
    const legacyLibrary = normalized.library.items
        .map(item => libraryItemToSavedMatrix(item, folderId => folderNameById(normalized.library, folderId)))
        .filter((item): item is SavedMatrix => item !== null);
    return {
        version: 2,
        state: normalized.state,
        library: legacyLibrary,
        recipes: normalized.recipes,
        assumptions: normalized.assumptions,
        history: normalized.history,
        settings: normalized.settings
    };
};

export const encodeLegacyCompatibleMMatrix = (snapshot: MMatrixWorkspaceV3, pretty = false): string =>
    JSON.stringify(toLegacySharePayload(snapshot), null, pretty ? 2 : undefined);
