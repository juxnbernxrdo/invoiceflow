import { create } from 'zustand';
import { FileInfo, uploadFiles, listFiles, removeFile as apiRemove, processFiles as apiProcess } from './api';

interface AppStore {
    files: FileInfo[];
    tipoGasto: string;
    isProcessing: boolean;
    isUploading: boolean;
    outputNames: Record<string, string>;
    setTipoGasto: (v: string) => void;
    setOutputName: (id: string, name: string) => void;
    addFiles: (files: File[]) => Promise<void>;
    removeFile: (id: string) => Promise<void>;
    processAll: () => Promise<void>;
    refreshFiles: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
    files: [],
    tipoGasto: 'EMPRESARIAL',
    isProcessing: false,
    isUploading: false,
    outputNames: {},

    setTipoGasto: (v) => set({ tipoGasto: v }),

    setOutputName: (id, name) => set((state) => ({
        outputNames: { ...state.outputNames, [id]: name },
    })),

    addFiles: async (files) => {
        set({ isUploading: true });
        try {
            await uploadFiles(files, get().tipoGasto);
            const updated = await listFiles();
            set({ files: updated });
        } finally {
            set({ isUploading: false });
        }
    },

    removeFile: async (id) => {
        await apiRemove(id);
        const updated = await listFiles();
        set((state) => {
            const { [id]: _, ...rest } = state.outputNames;
            return { files: updated, outputNames: rest };
        });
    },

    processAll: async () => {
        set({ isProcessing: true });
        try {
            await apiProcess(get().tipoGasto, get().outputNames);
            const updated = await listFiles();
            set({ files: updated, outputNames: {} });
        } finally {
            set({ isProcessing: false });
        }
    },

    refreshFiles: async () => {
        const files = await listFiles();
        set({ files });
    },
}));
