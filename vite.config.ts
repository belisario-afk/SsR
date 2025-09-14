import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/SsR/',
  plugins: [react(), tsconfigPaths()],
  build: {
    target: 'es2020',
    sourcemap: true
  },
  server: {
    host: true
  }
});