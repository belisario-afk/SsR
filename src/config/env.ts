function resolveModelUrl(): string {
  const raw = (import.meta.env.VITE_MODEL_URL as string) || 'models/hitem3d.glb';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (import.meta.env.BASE_URL as string) || '/';
  const baseTrimmed = base.endsWith('/') ? base : base + '/';
  const rel = raw.startsWith('/') ? raw.slice(1) : raw;
  return baseTrimmed + rel;
}

export const ENV = {
  TITLE: (import.meta.env.VITE_APP_TITLE as string) || 'SsR Opel Z',
  DEPLOY_TARGET: (import.meta.env.VITE_DEPLOY_TARGET as string) || 'ghpages',
  REPO_BASE: (import.meta.env.VITE_REPO_BASE as string) || 'SsR',
  MODEL_URL: resolveModelUrl()
};