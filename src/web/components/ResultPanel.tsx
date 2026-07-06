import { CheckCircle2, Download, Zap } from 'lucide-react';
import { FileInfo, downloadAll } from '../api';
import { useState } from 'react';

interface ResultPanelProps {
    files: FileInfo[];
}

export function ResultPanel({ files }: ResultPanelProps) {
    const [downloadingAll, setDownloadingAll] = useState(false);
    const doneFiles = files.filter(f => f.status === 'done');
    const errorFiles = files.filter(f => f.status === 'error');

    if (files.length === 0) return null;

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        try {
            await downloadAll(files);
        } finally {
            setDownloadingAll(false);
        }
    };

    return (
        <div
            className="
                p-4 rounded-2xl border border-white/[0.06]
                bg-[var(--surface)]
                fade-in
            "
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <span className="text-sm font-medium text-[var(--text)]">
                        Resultados
                    </span>
                </div>

                {doneFiles.length > 0 && (
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloadingAll}
                        className="
                            flex items-center gap-2 px-4 py-2
                            rounded-xl text-sm font-medium
                            bg-[var(--accent)] text-white
                            hover:bg-[var(--accent-hover)]
                            transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        {downloadingAll ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Descargando...
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                Descargar todo
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="space-y-1">
                {doneFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="truncate">{f.originalName}</span>
                        <span className="text-xs ml-auto">
                            {f.stats?.finalColumns} col · {f.stats?.recalculatedRows} filas
                        </span>
                    </div>
                ))}
                {errorFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm text-red-400">
                        <Zap size={12} />
                        <span className="truncate">{f.originalName}</span>
                        <span className="text-xs ml-auto">{f.error}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
