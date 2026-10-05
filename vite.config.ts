import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': '.',
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
    server: {
      hmr: process.env.DISABLE_HMR === 'true' ? false : { clientPort: 443 },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
