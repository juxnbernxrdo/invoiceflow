import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        root: path.resolve(__dirname),
        include: ['tests/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/src/web/**'],
    },
});
