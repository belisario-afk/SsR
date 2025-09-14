// Spotify OAuth (PKCE) for SPA on GitHub Pages and local dev

export const SPOTIFY_CLIENT_ID = '927fda6918514f96903e828fcd6bb576';
// Dynamically match current origin + Vite base so it works locally and on Pages.
// Make sure BOTH values are registered in your Spotify app settings:
// - https://belisario-afk.github.io/SsR/
// - http://localhost:5173/
export const SPOTIFY_REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}`;

const SCOPE = [
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-modify-playback-state',
  'user-read-playback-state',
  'playlist-read-private',
  'user-read-currently-playing',
  'app-remote-control',
  'offline_access'
].join(' ');

// Safe base64url encoding
function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hashBuffer);
}

function randString(length: number = 64) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('spotify_access_token');
}

function setToken(token: string, expiresInSec: number, refreshToken?: string) {
  localStorage.setItem('spotify_access_token', token);
  localStorage.setItem('spotify_token_expires_in', String(expiresInSec));
  localStorage.setItem('spotify_token_issued_at', String(Date.now()));
  if (refreshToken) localStorage.setItem('spotify_refresh_token', refreshToken);
}

export async function ensureSpotifyAuth(clientId: string, redirectUri: string) {
  // Handle callback with ?code= and ?state=
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  if (error) {
    console.warn('Spotify auth error:', error);
  }
  if (code) {
    const expectedState = sessionStorage.getItem('spotify_oauth_state');
    if (!expectedState || expectedState !== state) {
      console.warn('State mismatch; aborting token exchange');
      return;
    }
    const verifier = sessionStorage.getItem('spotify_code_verifier')!;
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json();
    if (data.access_token) {
      setToken(data.access_token, data.expires_in, data.refresh_token);
      // Clean URL
      window.history.replaceState({}, document.title, redirectUri);
      return;
    } else {
      console.error('Token exchange failed:', data);
    }
  }
  // If no token, start auth
  if (!getAccessToken()) {
    const verifier = randString(64);
    const challenge = await sha256(verifier);
    const newState = randString(16);
    sessionStorage.setItem('spotify_code_verifier', verifier);
    sessionStorage.setItem('spotify_oauth_state', newState);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('state', newState);
    // Optional: minimize Spotify's dialog prompts
    // authUrl.searchParams.set('show_dialog', 'false');

    window.location.href = authUrl.toString();
  }
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  setToken(data.access_token, data.expires_in, data.refresh_token);
  return data.access_token as string;
}