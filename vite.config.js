import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lib build: one self-executing file, CSS inlined by src/main.js (styles.css?inline).
// Output: dist/mep-module.min.js -> served by jsDelivr from a git tag (never @latest).
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2019',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'IwfMepModule',
      formats: ['iife'],
      fileName: () => 'mep-module.min.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  server: { port: 5173 },
});
