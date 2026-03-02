import type { LibraryObjectKind, SavedOutputKind, SharedState, WorkspaceSchemaVersion } from '../../types';

export type LibraryItemSource = 'manual' | 'import' | 'migration' | 'recovery' | 'generated';
export type VectorOrientation = 'column' | 'row';

interface BaseLibraryObject<TKind extends LibraryObjectKind> {
    kind: TKind;
    latex?: string;
}

export interface MatrixObject extends BaseLibraryObject<'matrix'> {
    rows: number;
    cols: number;
    values: (string | null)[][];
}

export interface VectorObject extends BaseLibraryObject<'vector'> {
    dimension: number;
    orientation: VectorOrientation;
    values: (string | null)[];
}

export interface VectorSetObject extends BaseLibraryObject<'vectorSet'> {
    dimension: number;
    vectors: (string | null)[][];
    labels?: string[];
}

export interface BasisObject extends BaseLibraryObject<'basis'> {
    dimension: number;
    vectors: (string | null)[][];
    ordered: boolean;
}

export interface LinearMapObject extends BaseLibraryObject<'linearMap'> {
    domainDimension: number;
    codomainDimension: number;
    matrix: (string | null)[][];
    domainBasisLabel?: string;
    codomainBasisLabel?: string;
    expression?: string;
}

export interface WorkspaceObject extends BaseLibraryObject<'workspace'> {
    snapshot: SharedState;
    snapshotSchemaVersion?: WorkspaceSchemaVersion;
}

export type LibraryObject =
    | MatrixObject
    | VectorObject
    | VectorSetObject
    | BasisObject
    | LinearMapObject
    | WorkspaceObject;

export interface SavedOutputMetadata {
    id: string;
    kind: SavedOutputKind;
    title: string;
    generatedAt: number;
    sourceItemId?: string;
    summary?: string;
    latex?: {
        primary?: string;
        secondary?: string;
    };
    metrics?: Record<string, string | number | boolean>;
}

export interface LibraryItem {
    id: string;
    kind: LibraryObjectKind;
    name: string;
    object: LibraryObject;
    tags: string[];
    folderId?: string;
    favorite: boolean;
    createdAt: number;
    updatedAt: number;
    lastOpenedAt?: number;
    source: LibraryItemSource;
    notes?: string;
    outputs?: SavedOutputMetadata[];
}

export interface LibraryFolder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: number;
    updatedAt: number;
}

export interface LibraryRecentEntry {
    itemId: string;
    openedAt: number;
}

export type LibraryHistoryAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'load'
    | 'favorite'
    | 'import'
    | 'export'
    | 'recover'
    | 'migrate';

export interface LibraryHistoryEntry {
    id: string;
    action: LibraryHistoryAction;
    at: number;
    itemId?: string;
    details?: Record<string, string | number | boolean | null>;
}

export interface LibraryCatalog {
    schemaVersion: number;
    items: LibraryItem[];
    folders: LibraryFolder[];
    recents: LibraryRecentEntry[];
    favorites: string[];
    history: LibraryHistoryEntry[];
    lastUpdatedAt: number;
}

export interface LibraryCatalogSummary {
    totalItems: number;
    favoriteCount: number;
    recentsCount: number;
    folderCounts: Record<string, number>;
    tagCounts: Record<string, number>;
}
