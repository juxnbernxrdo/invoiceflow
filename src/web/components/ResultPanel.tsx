import { CheckCircle2, Download, Zap, FileText, Inbox } from 'lucide-react';
import { FileInfo, downloadFile, downloadAll } from '../api';
import { useState } from 'react';
import { useStore } from '../store';

interface ResultPanelProps {
    files: FileInfo[];
}

export function ResultPanel({ files }: ResultPanelProps) {
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const selectedModule = useStore(s => s.selectedModule);
    const moduleFiles = files.filter(f => f.module === selectedModule.id);
    const doneFiles = moduleFiles.filter(f => f.status === 'done');
    const errorFiles = moduleFiles.filter(f => f.status === 'error');
    const hasResults = doneFiles.length > 0 || errorFiles.length > 0;

    if (!hasResults) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-dim px-6 py-16 text-center fade-in">
                <Inbox size={32} className="text-text-faint mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-muted">Sin resultados</p>
                <p className="text-xs text-text-faint mt-1">
                    Los archivos procesados aparecerán aquí
                </p>
            </div>
        );
    }

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        try {
            await downloadAll(moduleFiles);
        } finally {
            setDownloadingAll(false);
        }
    };

    const handleDownloadOne = async (file: FileInfo) => {
        setDownloadingId(file.id);
        try {
            await downloadFile(file);
        } finally {
            setDownloadingId(null);
        }
    };

    const getDisplayName = (f: FileInfo) => {
        if (f.outputName) {
            return f.outputName.endsWith('.xlsx') ? f.outputName : f.outputName + '.xlsx';
        }
        return f.originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
    };

    return (
        <div className="p-4 rounded-2xl border border-border-light bg-surface fade-in">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-success" />
                    <span className="text-sm font-medium text-text">
                        Resultados
                    </span>
                </div>

                {doneFiles.length > 0 && (
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloadingAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="space-y-2">
                {doneFiles.map(f => (
                    <div key={f.id} className="flex items-start gap-3 rounded-xl border border-border-light bg-surface-dim px-4 py-3">
                        <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">
                                {getDisplayName(f)}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <FileText size={10} className="text-text-faint" />
                                <p className="text-xs text-text-faint truncate">
                                    {f.originalName}
                                </p>
                            </div>
                            {f.stats && (
                                <p className="text-xs text-text-muted mt-1">
                                    {f.stats.finalColumns} columnas · {f.stats.recalculatedRows} filas
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => handleDownloadOne(f)}
                            disabled={downloadingId === f.id}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface-dim transition-colors disabled:opacity-50"
                        >
                            {downloadingId === f.id ? (
                                <div className="w-3 h-3 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                            ) : (
                                <Download size={12} />
                            )}
                            Descargar
                        </button>
                    </div>
                ))}
                {errorFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm text-danger px-4 py-2">
                        <Zap size={12} />
                        <span className="truncate">{f.originalName}</span>
                        <span className="text-xs ml-auto">{f.error}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
