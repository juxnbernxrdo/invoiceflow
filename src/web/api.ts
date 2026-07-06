const BASE = '/api';

export interface FileInfo {
    id: string;
    originalName: string;
    outputName?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: {
        originalColumns: number;
        finalColumns: number;
        deletedColumns: string[];
        recalculatedRows: number;
    };
    error?: string;
}

export async function uploadFiles(files: File[], tipoGasto: string): Promise<{ files: { id: string; originalName: string }[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('tipoGasto', tipoGasto);

    const res = await fetch(`${BASE}/files`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

export async function listFiles(): Promise<FileInfo[]> {
    const res = await fetch(`${BASE}/files`);
    const data = await res.json();
    return data.files;
}

export async function removeFile(id: string): Promise<void> {
    await fetch(`${BASE}/files/${id}`, { method: 'DELETE' });
}

export async function processFiles(
    tipoGasto: string,
    outputNames?: Record<string, string>
): Promise<any> {
    const res = await fetch(`${BASE}/files/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoGasto, outputNames }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

export function downloadUrl(id: string): string {
    return `${BASE}/files/${id}/download`;
}

export async function downloadAll(files: FileInfo[]): Promise<void> {
    const doneFiles = files.filter(f => f.status === 'done');
    for (let i = 0; i < doneFiles.length; i++) {
        const f = doneFiles[i];
        const a = document.createElement('a');
        a.href = downloadUrl(f.id);
        if (f.outputName) {
            a.download = f.outputName.endsWith('.xlsx') ? f.outputName : f.outputName + '.xlsx';
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (i < doneFiles.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }
}
