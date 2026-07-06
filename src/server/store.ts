import { FileJob } from '../core/types';
import * as fs from 'fs';

export interface SessionStore {
    files: Map<string, FileJob>;
    tempPaths: Map<string, string>;
}

const store: SessionStore = {
    files: new Map(),
    tempPaths: new Map(),
};

export function getStore(): SessionStore {
    return store;
}

export function addFile(id: string, job: FileJob, tempPath: string): void {
    store.files.set(id, job);
    store.tempPaths.set(id, tempPath);
}

export function getFile(id: string): FileJob | undefined {
    return store.files.get(id);
}

export function getAllFiles(): FileJob[] {
    return Array.from(store.files.values());
}

export function removeFile(id: string): boolean {
    const tempPath = store.tempPaths.get(id);
    if (tempPath) {
        try { fs.unlinkSync(tempPath); } catch {}
        store.tempPaths.delete(id);
    }
    return store.files.delete(id);
}

export function updateFile(id: string, updates: Partial<FileJob>): void {
    const existing = store.files.get(id);
    if (existing) {
        store.files.set(id, { ...existing, ...updates });
    }
}
