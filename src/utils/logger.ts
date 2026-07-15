export interface DebugContext {
    stage: string;
    file?: string;
    sheet?: string;
    row?: number;
    column?: string;
    detail?: string;
}

let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
    debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
    return debugEnabled;
}

export function debugLog(context: DebugContext, message: string): void {
    if (!debugEnabled) return;

    const parts: string[] = [];
    if (context.stage) parts.push(`[${context.stage}]`);
    if (context.file) parts.push(`File: ${context.file}`);
    if (context.sheet) parts.push(`Sheet: ${context.sheet}`);
    if (context.row !== undefined) parts.push(`Row: ${context.row}`);
    if (context.column) parts.push(`Col: ${context.column}`);
    if (context.detail) parts.push(context.detail);

    console.log(`  [DEBUG] ${parts.join(' | ')} — ${message}`);
}

export function debugError(context: DebugContext, err: any): void {
    if (!debugEnabled) return;

    const parts: string[] = [];
    if (context.stage) parts.push(`[${context.stage}]`);
    if (context.file) parts.push(`File: ${context.file}`);
    if (context.sheet) parts.push(`Sheet: ${context.sheet}`);
    if (context.row !== undefined) parts.push(`Row: ${context.row}`);
    if (context.column) parts.push(`Col: ${context.column}`);

    console.error(`  [DEBUG ERROR] ${parts.join(' | ')}`);
    console.error(`    Message: ${err.message}`);
    if (err.stack && debugEnabled) {
        console.error(`    Stack: ${err.stack}`);
    }
}
