import { useEffect, useRef, useState } from 'react';
import { useSpotify } from '@providers/SpotifyProvider';
import { useTheme } from '@providers/ThemeProvider';
import { useGesture } from '@providers/GestureProvider';
import { useUI } from '@providers/UIProvider';
import { fetchCurrentWeather, getCoords, wmoToDescription } from '@utils/weather';
import { motion } from 'framer-motion';
import { ensureSpotifyAuth, getAccessToken, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '@utils/oauth';

async function getTokenEnsured(): Promise<string> {
  let token = getAccessToken();
  if (!token) {
    await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
    token = getAccessToken();
  }
  return token || '';
}

async function searchAndPlayTrack(query: string, artist?: string) {
  const token = await getTokenEnsured();
  if (!token) throw new Error('No token');
  const q = encodeURIComponent(artist ? `${query} artist:${artist}` : query);
  const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  const track = data?.tracks?.items?.[0];
  if (!track?.uri) throw new Error('No track found');
  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [track.uri] })
  });
  return { name: track.name as string, artist: (track.artists?.map((a: any) => a.name).join(', ') as string) || '' };
}

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export function VoiceAssistant() {
  const { theme, setThemeByName, cycleTheme } = useTheme();
  const { togglePlay, nextTrack, prevTrack, setVolume } = useSpotify();
  const { togglePlaylistVisible, togglePlayerVisible, toggleDashboardVisible } = useGesture();
  const { demoMode, setDemoMode } = useUI();

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef<any>(null);

  // Greeting only first visit
  useEffect(() => {
    const greeted = sessionStorage.getItem('ssr_greeted');
    if (!greeted) {
      speak('Welcome. Say Help to hear commands.');
      sessionStorage.setItem('ssr_greeted', '1');
    }
  }, []);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec: any = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
      const final = e.results[e.results.length - 1].isFinal;
      if (final) {
        handleCommand(text.toLowerCase().trim());
      }
    };
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, []);

  async function handleCommand(t: string) {
    if (!t) return;

    // Song search/play (handle BEFORE generic "play" toggle)
    // 1) "play song ..." / "search song ..." / "play track ..."
    const songCmd = t.match(/\b(?:play|search)\s+(?:song|track)\s+(.+)$/);
    if (songCmd?.[1]) {
      const q = songCmd[1].trim();
      try {
        const info = await searchAndPlayTrack(q);
        speak(`Playing ${info.name} by ${info.artist}.`);
      } catch {
        speak('Sorry, I could not find that song.');
      }
      return;
    }
    // 2) "play ... by ..."
    const playBy = t.match(/\bplay\s+(.+?)\s+by\s+(.+)$/);
    if (playBy?.[1]) {
      const q = playBy[1].trim();
      const a = (playBy[2] || '').trim();
      try {
        const info = await searchAndPlayTrack(q, a);
        speak(`Playing ${info.name} by ${info.artist}.`);
      } catch {
        speak('Sorry, I could not find that song.');
      }
      return;
    }

    // Help
    if (/\bhelp\b/.test(t)) {
      speak('Try: play, pause, next, previous, volume 50 percent, louder, quieter, show or hide player, show or hide dashboard, open playlists, play song thriller, play hotel california by eagles, set theme to spy gadget, cycle theme, weather, time, battery, navigate to somewhere, toggle demo mode.');
      return;
    }

    // Music controls
    if (/\b(play|pause|resume|start)\b/.test(t)) {
      await togglePlay();
      speak('Toggling playback.');
      return;
    }
    if (/\bnext\b/.test(t)) {
      await nextTrack().catch(() => {});
      speak('Next track.');
      return;
    }
    if (/\b(previous|prev|back)\b/.test(t)) {
      await prevTrack().catch(() => {});
      speak('Previous track.');
      return;
    }
    // Volume up/down/to X%
    const volMatch = t.match(/volume\s*(\d{1,3})\s*%?/);
    if (volMatch) {
      const pct = Math.max(0, Math.min(100, Number(volMatch[1])));
      setVolume(pct / 100);
      speak(`Volume set to ${pct} percent`);
      return;
    }
    if (/\b(mute)\b/.test(t)) {
      setVolume(0);
      speak('Muted.');
      return;
    }
    if (/\b(unmute)\b/.test(t)) {
      setVolume(0.5);
      speak('Volume fifty percent.');
      return;
    }
    if (/\b(louder|volume up|increase volume)\b/.test(t)) {
      setVolume((v: any) => Math.min(1, (typeof v === 'number' ? v : 0.5) + 0.1));
      speak('Louder.');
      return;
    }
    if (/\b(quieter|volume down|decrease volume|softer)\b/.test(t)) {
      setVolume((v: any) => Math.max(0, (typeof v === 'number' ? v : 0.5) - 0.1));
      speak('Quieter.');
      return;
    }

    // UI controls
    if (/\b(show|open)\s+(player|now playing)\b/.test(t)) {
      togglePlayerVisible();
      speak('Showing player.');
      return;
    }
    if (/\b(hide|close)\s+(player|now playing)\b/.test(t)) {
      togglePlayerVisible();
      speak('Hiding player.');
      return;
    }
    if (/\b(open|show)\s+(playlist|playlists)\b/.test(t)) {
      togglePlaylistVisible();
      speak('Opening playlists.');
      return;
    }
    if (/\b(close|hide)\s+(playlist|playlists)\b/.test(t)) {
      togglePlaylistVisible();
      speak('Closing playlists.');
      return;
    }
    if (/\b(show|hide|toggle)\s+dashboard\b/.test(t)) {
      toggleDashboardVisible();
      speak('Toggling dashboard.');
      return;
    }

    // Theme
    const themeMatch = t.match(/theme.*\b(chase|starlight|romance|spygadget|neon 2d|neon2d|reactive)\b/);
    if (themeMatch?.[1]) {
      const raw = themeMatch[1].toLowerCase();
      const key = raw.replace(/\s+/g, ' ');
      const themeMap: Record<string, string> = {
        chase: 'Chase',
        starlight: 'Starlight',
        romance: 'Romance',
        spygadget: 'SpyGadget',
        'neon 2d': 'Neon2D',
        neon2d: 'Neon2D',
        reactive: 'Reactive'
      };
      const name = themeMap[key] ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
      setThemeByName(name);
      speak(`Theme set to ${name}.`);
      return;
    }
    if (/\b(cycle|next)\s+theme\b/.test(t)) {
      cycleTheme();
      speak('Cycling theme.');
      return;
    }

    // Info
    if (/\bwhat(?:'s| is)?\s+the\s+time\b|\bwhat time is it\b/.test(t)) {
      const d = new Date();
      const timesay = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      speak(`It is ${timesay}.`);
      return;
    }
    if (/\b(weather|forecast)\b/.test(t)) {
      const coords = await getCoords();
      const lat = coords?.lat ?? 40.7128;
      const lon = coords?.lon ?? -74.006;
      try {
        const w = await fetchCurrentWeather(lat, lon);
        const desc = wmoToDescription(w.weathercode);
        speak(`It's ${Math.round(w.temperature)} degrees Celsius with ${desc}. Wind ${Math.round(w.windspeed)} kilometers per hour.`);
      } catch {
        speak('Weather is unavailable right now.');
      }
      return;
    }
    if (/\b(battery|battery level)\b/.test(t)) {
      const navAny = navigator as any;
      if (navAny.getBattery) {
        try {
          const bat = await navAny.getBattery();
          speak(`Battery is at ${Math.round(bat.level * 100)} percent ${bat.charging ? 'and charging' : ''}.`);
        } catch {
          speak('Battery info is unavailable.');
        }
      } else {
        speak('Battery info is not supported on this device.');
      }
      return;
    }

    // Navigation
    const navMatch = t.match(/navigate to (.+)$/);
    const dest = navMatch?.[1]?.trim();
    if (dest && dest.length > 0) {
      const q = encodeURIComponent(dest);
      const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
      window.open(url, '_blank', 'noopener');
      speak(`Opening directions to ${dest}.`);
      return;
    } else if (/\bnavigate to\b/.test(t)) {
      speak('Please say the destination, for example: navigate to Starbucks.');
      return;
    }

    // Demo mode
    if (/\b(toggle|turn (on|off))\s+demo mode\b/.test(t)) {
      setDemoMode(!demoMode);
      speak(`Demo mode ${!demoMode ? 'enabled' : 'disabled'}.`);
      return;
    }

    // Fallback
    speak("Sorry, I didn't get that. Say 'help' to hear examples.");
  }

  const toggleListen = () => {
    const rec: any = recRef.current;
    if (!rec) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }
    try {
      if (!listening) rec.start();
      else rec.stop();
    } catch {}
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1">
      <button
        onClick={toggleListen}
        className="h-16 w-16 rounded-full border border-white/10 bg-black/60 grid place-items-center"
        aria-label="Toggle voice assistant"
        style={{ boxShadow: `0 0 40px ${theme.colors.accentHex}55` }}
      >
        <motion.div
          className="h-10 w-10 rounded-full"
          animate={{ boxShadow: listening ? `0 0 24px ${theme.colors.accentHex}` : `0 0 0px ${theme.colors.accentHex}` }}
          transition={{ duration: 0.3 }}
          style={{ background: listening ? theme.colors.accentHex : '#111' }}
        />
      </button>
      <div className="min-h-[20px] text-xs text-white/70 max-w-[80vw] truncate">{transcript}</div>
    </div>
  );
}