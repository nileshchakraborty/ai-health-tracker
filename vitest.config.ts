import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
        exclude: ['mobile/**', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['src/test/**', '**/*.d.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/ports': path.resolve(__dirname, './src/ports'),
            '@/adapters': path.resolve(__dirname, './src/adapters'),
            '@/use-cases': path.resolve(__dirname, './src/use-cases'),
            '@/entities': path.resolve(__dirname, './src/entities'),
        },
    },
});
