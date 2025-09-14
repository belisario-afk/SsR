import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const deployTarget = env.VITE_DEPLOY_TARGET || '';
  const repoBase = env.VITE_REPO_BASE || 'SsR';

  // Vercel/most hosts -> '/'; GitHub Pages -> '/<repo>/'
  const base = deployTarget === 'ghpages' ? `/${repoBase}/` : '/';

  return defineConfig({
    plugins: [react()],
    base,
    resolve: {
      alias: {
        '@styles': path.resolve(process.cwd(), 'src/styles'),
        '@components': path.resolve(process.cwd(), 'src/components'),
        '@config': path.resolve(process.cwd(), 'src/config'),
        '@providers': path.resolve(process.cwd(), 'src/providers'),
        '@utils': path.resolve(process.cwd(), 'src/utils')
      }
    },
    server: {
      port: 5173,
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
      strictPort: false
    }
  });
};