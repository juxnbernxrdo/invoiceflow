import { Pencil, FileText, CheckCircle2, AlertCircle, Loader2, X, Download } from 'lucide-react';
import { FileInfo, downloadFile } from '../api';
import { useStore } from '../store';
import { useState } from 'react';

interface FileCardProps {
    file: FileInfo;
    index: number;
}

const statusIcons = {
    pending: <FileText size={16} className="text-accent" />,
    processing: <Loader2 size={16} className="text-warning animate-spin" />,
    done: <CheckCircle2 size={16} className="text-success" />,
    error: <AlertCircle size={16} className="text-danger" />,
};

export function FileCard({ file, index }: FileCardProps) {
    const { outputNames, setOutputName, removeFile } = useStore();
    const [downloading, setDownloading] = useState(false);
    const isPending = file.status === 'pending';
    const isDone = file.status === 'done';

    // For pending files, use the local outputNames store (user is still editing).
    // For processed files, use the server-stored outputName (authoritative).
    const displayName = isPending
        ? (outputNames[file.id] || '')
        : (file.outputName || '');

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await downloadFile(file);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3 transition-all duration-200 hover:shadow-[0_2px_16px_rgba(0,0,0,0.15)] group relative"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <div className="flex-shrink-0">{statusIcons[file.status]}</div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">{file.originalName}</p>

                {isPending && (
                    <div className="flex items-center gap-2 mt-1">
                        <Pencil size={12} className="text-text-muted" />
                        <input
                            type="text"
                            placeholder="Nombre de salida"
                            value={displayName}
                            onChange={(e) => setOutputName(file.id, e.target.value)}
                            className="flex-1 bg-transparent border-b border-border-light text-sm text-text placeholder:text-text-muted outline-none focus:border-accent transition-colors py-0.5"
                        />
                        <span className="text-xs text-text-muted">.xlsx</span>
                    </div>
                )}

                {!isPending && displayName && (
                    <p className="text-xs text-text-muted mt-1">
                        Salida: {displayName}{displayName.endsWith('.xlsx') ? '' : '.xlsx'}
                    </p>
                )}

                {isDone && file.stats && (
                    <p className="text-xs text-text-muted mt-1">
                        {file.stats.originalColumns} → {file.stats.finalColumns} columnas · {file.stats.recalculatedRows} filas
                    </p>
                )}

                {file.error && (
                    <p className="text-xs text-danger mt-1">{file.error}</p>
                )}
            </div>

            {isDone && (
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface-dim transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                >
                    {downloading ? (
                        <div className="w-3 h-3 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                    ) : (
                        <Download size={12} />
                    )}
                </button>
            )}

            {isPending && (
                <button
                    onClick={() => removeFile(file.id)}
                    className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
