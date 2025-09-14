import { defineConfig, loadEnv, type ConfigEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), '');
  const deployTarget = env.VITE_DEPLOY_TARGET || 'ghpages';
  const repoBase = env.VITE_REPO_BASE || 'SsR';
  const base = deployTarget === 'ghpages' ? `/${repoBase}/` : '/';

  return {
    base,
    plugins: [
      tsconfigPaths(),
      react()
    ],
    server: {
      port: 5173,
      host: true,
      strictPort: false
    },
    build: {
      target: 'esnext',
      sourcemap: true,
      outDir: 'dist',
      assetsDir: 'assets'
    },
    preview: {
      port: 4173,
      host: true
    }
  };
});