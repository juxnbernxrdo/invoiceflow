import { FileJob } from '../core/types';
import * as fs from 'fs';

export interface SessionStore {
    addFile(id: string, job: FileJob, tempPath: string): void;
    getFile(id: string): FileJob | undefined;
    getAllFiles(): FileJob[];
    removeFile(id: string): boolean;
    updateFile(id: string, updates: Partial<FileJob>): void;
    getTempPath(id: string): string | undefined;
}

export class InMemoryStore implements SessionStore {
    private files: Map<string, FileJob> = new Map();
    private tempPaths: Map<string, string> = new Map();

    addFile(id: string, job: FileJob, tempPath: string): void {
        this.files.set(id, job);
        this.tempPaths.set(id, tempPath);
    }

    getFile(id: string): FileJob | undefined {
        return this.files.get(id);
    }

    getAllFiles(): FileJob[] {
        return Array.from(this.files.values());
    }

    removeFile(id: string): boolean {
        const tempPath = this.tempPaths.get(id);
        if (tempPath) {
            try { fs.unlinkSync(tempPath); } catch {}
            this.tempPaths.delete(id);
        }
        return this.files.delete(id);
    }

    updateFile(id: string, updates: Partial<FileJob>): void {
        const existing = this.files.get(id);
        if (existing) {
            this.files.set(id, { ...existing, ...updates });
        }
    }

    getTempPath(id: string): string | undefined {
        return this.tempPaths.get(id);
    }
}

// Default store instance (backward compatible)
const defaultStore = new InMemoryStore();

export function getStore(): SessionStore {
    return defaultStore;
}

export function addFile(id: string, job: FileJob, tempPath: string): void {
    defaultStore.addFile(id, job, tempPath);
}

export function getFile(id: string): FileJob | undefined {
    return defaultStore.getFile(id);
}

export function getAllFiles(): FileJob[] {
    return defaultStore.getAllFiles();
}

export function removeFile(id: string): boolean {
    return defaultStore.removeFile(id);
}

export function updateFile(id: string, updates: Partial<FileJob>): void {
    defaultStore.updateFile(id, updates);
}
