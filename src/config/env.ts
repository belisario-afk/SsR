function resolveModelUrl(): string {
  // If VITE_MODEL_URL is absolute (http/https), use it. Otherwise, resolve relative to Vite's BASE_URL.
  const raw = (import.meta.env.VITE_MODEL_URL as string) || 'models/hitem3d.glb';
  const isAbsolute = /^https?:\/\//i.test(raw);
  return isAbsolute ? raw : new URL(raw, import.meta.env.BASE_URL).toString();
}

export const ENV = {
  TITLE: (import.meta.env.VITE_APP_TITLE as string) || 'SsR Opel Z',
  DEPLOY_TARGET: (import.meta.env.VITE_DEPLOY_TARGET as string) || 'ghpages',
  REPO_BASE: (import.meta.env.VITE_REPO_BASE as string) || 'SsR',
  MODEL_URL: resolveModelUrl()
};