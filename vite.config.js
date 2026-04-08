import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildId = process.env.BUILD_ID || `dev-${new Date().toISOString()}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __EB28_BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
});
