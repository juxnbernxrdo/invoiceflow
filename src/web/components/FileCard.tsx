import { Pencil, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { FileInfo } from '../api';
import { useStore } from '../store';

interface FileCardProps {
    file: FileInfo;
    index: number;
}

const statusIcons = {
    pending: <FileText size={16} className="text-[var(--accent)]" />,
    processing: <Loader2 size={16} className="text-yellow-500 animate-spin" />,
    done: <CheckCircle2 size={16} className="text-green-500" />,
    error: <AlertCircle size={16} className="text-red-500" />,
};

export function FileCard({ file, index }: FileCardProps) {
    const { outputNames, setOutputName, removeFile } = useStore();
    const isPending = file.status === 'pending';
    const isDone = file.status === 'done';

    return (
        <div
            className={`
                flex items-center gap-3 rounded-2xl border border-white/[0.06]
                bg-[var(--surface)] px-4 py-3
                transition-all duration-200 ease-[var(--ease)]
                hover:shadow-[0_2px_16px_rgba(0,0,0,0.15)]
                group relative
            `}
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <div className="flex-shrink-0">{statusIcons[file.status]}</div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text)] truncate">{file.originalName}</p>

                {isPending && (
                    <div className="flex items-center gap-2 mt-1">
                        <Pencil size={12} className="text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Nombre de salida"
                            value={outputNames[file.id] || ''}
                            onChange={(e) => setOutputName(file.id, e.target.value)}
                            className="
                                flex-1 bg-transparent border-b border-white/[0.08]
                                text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
                                outline-none focus:border-[var(--accent)]
                                transition-colors py-0.5
                            "
                        />
                        <span className="text-xs text-[var(--text-muted)]">.xlsx</span>
                    </div>
                )}

                {!isPending && outputNames[file.id] && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Salida: {outputNames[file.id]}{outputNames[file.id].endsWith('.xlsx') ? '' : '.xlsx'}
                    </p>
                )}

                {isDone && file.stats && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        {file.stats.originalColumns} → {file.stats.finalColumns} columnas · {file.stats.recalculatedRows} filas
                    </p>
                )}

                {file.error && (
                    <p className="text-xs text-red-400 mt-1">{file.error}</p>
                )}
            </div>

            {isPending && (
                <button
                    onClick={() => removeFile(file.id)}
                    className="
                        flex-shrink-0 p-1 rounded-lg
                        text-[var(--text-muted)] hover:text-red-400
                        opacity-0 group-hover:opacity-100
                        transition-all
                    "
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
