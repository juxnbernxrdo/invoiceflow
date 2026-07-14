export interface TransformOptions {
    tipoGasto?: string;
    outputName?: string;
    module?: string;
}

export interface TransformStats {
    originalColumns: number;
    finalColumns: number;
    deletedColumns: string[];
    replacedColumns: { red: string; green: string }[];
    recalculatedRows: number;
}

export type ProgressCallback = (current: number, total: number, message: string) => void;

export interface FileJob {
    id: string;
    originalName: string;
    outputName?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    module?: string;
    stats?: TransformStats;
    error?: string;
    outputPath?: string;
    createdAt: number;
}
