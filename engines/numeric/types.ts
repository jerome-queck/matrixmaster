import type { NumericMatrix as ServiceNumericMatrix } from '../../services/matrixService';

export type NumericMatrix = ServiceNumericMatrix;
export type NumericVector = number[];

export interface LatexPayload {
    summary: string;
    details?: string[];
    matrices?: Record<string, string>;
    vectors?: Record<string, string>;
    scalars?: Record<string, string>;
}

export interface ReusePayload {
    matrices?: Record<string, NumericMatrix>;
    vectors?: Record<string, NumericVector>;
    scalars?: Record<string, number>;
}

export interface ExportPayload {
    csv?: Record<string, string>;
    json?: Record<string, unknown>;
}

export interface NumericWorkflowEnvelope<TData> {
    data: TData;
    warnings: string[];
    latex: LatexPayload;
    reuse: ReusePayload;
    exports: ExportPayload;
}
