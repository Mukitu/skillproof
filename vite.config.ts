import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, 
      sourcemap: false,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      
      
      
      
  
      proxy: {
        '/api': {
          // Forward all /api/* requests to the local PHP dev server.
          // Run it with:
          //   php -S 127.0.0.1:8765 -t deploy/_build/staging_api/api deploy/_build/staging_api/api/index.php
          // (the index.php router handles every /api/* path under the
          // staging_api directory).
          target: 'http://127.0.0.1:8765',
          changeOrigin: true,
          secure: false,
          ws: false,
          // Rewrite so the PHP router — which expects /api/... — keeps
          // working. The dev server's URL is the root; we pass the path
          // through unchanged.
          rewrite: (p) => p,
        },
      },
    },
  };
});
