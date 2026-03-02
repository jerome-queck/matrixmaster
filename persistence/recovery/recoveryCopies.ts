type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const RECOVERY_SCHEMA_VERSION = 1;
export const DEFAULT_RECOVERY_PREFIX = 'matrix-master:recovery';

export interface RecoveryCopyEnvelope<TPayload = unknown> {
    schemaVersion: number;
    id: string;
    targetKey: string;
    reason: string;
    createdAt: number;
    sourceSchemaVersion?: number;
    payload: TPayload;
}

export interface SaveRecoveryCopyOptions<TPayload = unknown> {
    storage: StorageLike;
    targetKey: string;
    payload: TPayload;
    reason: string;
    createdAt?: number;
    sourceSchemaVersion?: number;
    prefix?: string;
}

export interface SaveRecoveryCopyResult {
    ok: boolean;
    recoveryKey: string;
    error?: string;
}

export interface WriteTextWithRecoveryOptions {
    storage: StorageLike;
    targetKey: string;
    nextValue: string;
    reason: string;
    createdAt?: number;
    sourceSchemaVersion?: number;
    prefix?: string;
}

export interface WriteTextWithRecoveryResult {
    ok: boolean;
    hadPreviousValue: boolean;
    restoredPreviousValue: boolean;
    recoveryKey?: string;
    error?: string;
}

const sanitizeTarget = (targetKey: string): string => targetKey.replace(/[^a-zA-Z0-9:_-]+/g, '_');

const createId = (at: number): string => `rcv_${at}_${Math.random().toString(36).slice(2, 8)}`;

export const buildRecoveryKey = (
    targetKey: string,
    createdAt = Date.now(),
    prefix = DEFAULT_RECOVERY_PREFIX
): string => `${prefix}:${sanitizeTarget(targetKey)}:${createdAt}`;

export const createRecoveryCopy = <TPayload>(
    targetKey: string,
    payload: TPayload,
    reason: string,
    createdAt = Date.now(),
    sourceSchemaVersion?: number
): RecoveryCopyEnvelope<TPayload> => ({
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    id: createId(createdAt),
    targetKey,
    reason,
    createdAt,
    sourceSchemaVersion,
    payload
});

export const saveRecoveryCopy = <TPayload>({
    storage,
    targetKey,
    payload,
    reason,
    createdAt = Date.now(),
    sourceSchemaVersion,
    prefix = DEFAULT_RECOVERY_PREFIX
}: SaveRecoveryCopyOptions<TPayload>): SaveRecoveryCopyResult => {
    const recoveryKey = buildRecoveryKey(targetKey, createdAt, prefix);
    const envelope = createRecoveryCopy(targetKey, payload, reason, createdAt, sourceSchemaVersion);
    try {
        storage.setItem(recoveryKey, JSON.stringify(envelope));
        return { ok: true, recoveryKey };
    } catch (error) {
        return {
            ok: false,
            recoveryKey,
            error: error instanceof Error ? error.message : 'Failed to persist recovery copy.'
        };
    }
};

export const writeTextWithRecovery = ({
    storage,
    targetKey,
    nextValue,
    reason,
    createdAt = Date.now(),
    sourceSchemaVersion,
    prefix = DEFAULT_RECOVERY_PREFIX
}: WriteTextWithRecoveryOptions): WriteTextWithRecoveryResult => {
    let previousRaw: string | null = null;
    try {
        previousRaw = storage.getItem(targetKey);
    } catch {
        previousRaw = null;
    }

    let recoveryKey: string | undefined;
    if (previousRaw !== null) {
        const recoveryResult = saveRecoveryCopy({
            storage,
            targetKey,
            payload: previousRaw,
            reason,
            createdAt,
            sourceSchemaVersion,
            prefix
        });
        recoveryKey = recoveryResult.recoveryKey;
    }

    try {
        storage.setItem(targetKey, nextValue);
        return {
            ok: true,
            hadPreviousValue: previousRaw !== null,
            restoredPreviousValue: false,
            recoveryKey
        };
    } catch (error) {
        let restoredPreviousValue = false;
        if (previousRaw !== null) {
            try {
                storage.setItem(targetKey, previousRaw);
                restoredPreviousValue = true;
            } catch {
                restoredPreviousValue = false;
            }
        }

        return {
            ok: false,
            hadPreviousValue: previousRaw !== null,
            restoredPreviousValue,
            recoveryKey,
            error: error instanceof Error ? error.message : 'Failed to write value.'
        };
    }
};

export const captureIncompatibleImport = (
    storage: StorageLike,
    rawImportText: string,
    reason = 'incompatible-import',
    createdAt = Date.now()
): SaveRecoveryCopyResult =>
    saveRecoveryCopy({
        storage,
        targetKey: 'imports',
        payload: rawImportText,
        reason,
        createdAt
    });
