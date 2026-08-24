import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  // Chemins relatifs : le site est servi à la racine (nginx/Docker) comme sous
  // un sous-chemin (GitHub Pages sert /AfriBench/). Un base absolu casserait l'un des deux.
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
