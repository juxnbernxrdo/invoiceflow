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
            className="flex items-center gap-4 rounded-[18px] border border-border-light bg-surface p-4 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] shadow-[0_1px_4px_rgba(0,0,0,0.05)] group relative"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <div className="flex-shrink-0">{statusIcons[file.status]}</div>

            <div className="flex-1 min-w-0">
                <p className="text-[0.97rem] font-medium text-text truncate">{file.originalName}</p>

                {isPending && (
                    <div className="flex items-center gap-2 mt-1">
                        <Pencil size={12} className="text-text-muted" />
                        <input
                            type="text"
                            placeholder="Nombre de salida"
                            value={displayName}
                            onChange={(e) => setOutputName(file.id, e.target.value)}
                            className="flex-1 bg-transparent border-b border-border-light text-[0.86rem] text-text placeholder:text-text-faint outline-none focus:border-accent transition-colors py-0.5"
                        />
                        <span className="text-[0.86rem] text-text-muted font-mono">.xlsx</span>
                    </div>
                )}

                {!isPending && displayName && (
                    <p className="text-[0.79rem] text-text-muted mt-1">
                        Salida: {displayName}{displayName.endsWith('.xlsx') ? '' : '.xlsx'}
                    </p>
                )}

                {isDone && file.stats && (
                    <p className="text-[0.79rem] text-text-muted mt-1">
                        {file.stats.originalColumns} → {file.stats.finalColumns} columnas · {file.stats.recalculatedRows} filas
                    </p>
                )}

                {file.error && (
                    <p className="text-[0.79rem] text-danger mt-1">{file.error}</p>
                )}
            </div>

            {isDone && (
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[0.79rem] font-medium border border-border text-text-secondary hover:bg-surface-dim transition-all duration-200 disabled:opacity-50 opacity-0 group-hover:opacity-100"
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
                    className="flex-shrink-0 p-1.5 rounded-[10px] text-text-muted hover:text-danger hover:bg-surface-dim opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
