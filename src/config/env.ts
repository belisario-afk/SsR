type Env = {
  VITE_APP_TITLE?: string;
  VITE_DEPLOY_TARGET?: string;
  VITE_REPO_BASE?: string;
  VITE_MODEL_URL?: string;
};

function requireEnv(name: keyof Env): string {
  const val = (import.meta.env as any)[name];
  if (!val || String(val).trim().length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(val);
}

export const ENV = {
  TITLE: (import.meta.env.VITE_APP_TITLE as string) || 'SsR Opel Z',
  DEPLOY_TARGET: (import.meta.env.VITE_DEPLOY_TARGET as string) || 'ghpages',
  REPO_BASE: (import.meta.env.VITE_REPO_BASE as string) || 'SsR',
  MODEL_URL: requireEnv('VITE_MODEL_URL')
};