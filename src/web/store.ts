import { create } from 'zustand';
import { FileInfo, uploadFiles, listFiles, removeFile as apiRemove, processFiles as apiProcess } from './api';
import { MODULES, ModuleDefinition } from '../core/modules';

interface AppStore {
    files: FileInfo[];
    selectedModule: ModuleDefinition;
    tipoGasto: string;
    isProcessing: boolean;
    isUploading: boolean;
    outputNames: Record<string, string>;
    setModule: (module: ModuleDefinition) => void;
    setTipoGasto: (v: string) => void;
    setOutputName: (id: string, name: string) => void;
    addFiles: (files: File[]) => Promise<void>;
    removeFile: (id: string) => Promise<void>;
    processAll: () => Promise<void>;
    refreshFiles: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
    files: [],
    selectedModule: MODULES[0],
    tipoGasto: 'EMPRESARIAL',
    isProcessing: false,
    isUploading: false,
    outputNames: {},

    setModule: (module) => set({ selectedModule: module, tipoGasto: 'EMPRESARIAL' }),

    setTipoGasto: (v) => set({ tipoGasto: v }),

    setOutputName: (id, name) => set((state) => ({
        outputNames: { ...state.outputNames, [id]: name },
    })),

    addFiles: async (files) => {
        set({ isUploading: true });
        try {
            await uploadFiles(files, get().selectedModule.id, get().tipoGasto);
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
            await apiProcess(get().selectedModule.id, get().tipoGasto, get().outputNames);
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
