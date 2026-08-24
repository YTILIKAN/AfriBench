import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  // Chemins relatifs : le site est servi à la racine (nginx/Docker) comme sous
  // un sous-chemin (GitHub Pages sert /AfriBench/). Un base absolu casserait l'un des deux.
  base: './',
  // Les fichiers de public/ sont copiés tels quels dans dist/ : indispensable
  // pour le manifeste web (ses chemins d'icônes sont relatifs à lui-même, donc
  // un nom haché les casserait) et pour robots.txt, sitemap.xml et .nojekyll,
  // dont l'URL doit rester exacte.
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      // Le backoffice est un second point d'entrée : il passe donc par la même
      // chaîne que l'application (lint, minification, hachage) au lieu d'être
      // recopié tel quel avec son CSS et son JS en ligne.
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
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
