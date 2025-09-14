import { useEffect, useRef, useState } from 'react';
import { useSpotify } from '@providers/SpotifyProvider';
import { useTheme } from '@providers/ThemeProvider';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export function VoiceAssistant() {
  const { theme, setThemeByName, cycleTheme } = useTheme();
  const { togglePlay, nextTrack } = useSpotify();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Greeting on first load
    const greeted = sessionStorage.getItem('ssr_greeted');
    if (!greeted) {
      const u = new SpeechSynthesisUtterance('Welcome Mister Belisario');
      u.rate = 1;
      u.pitch = 1;
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
      sessionStorage.setItem('ssr_greeted', '1');
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec: SpeechRecognition = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
      const final = e.results[e.results.length - 1].isFinal;
      if (final) {
        const t = text.toLowerCase().trim();
        if (t.includes('play')) togglePlay();
        else if (t.includes('pause')) togglePlay();
        else if (t.includes('next')) nextTrack();
        else if (t.includes('theme')) {
          if (t.includes('chase')) setThemeByName('Chase');
          else if (t.includes('starlight')) setThemeByName('Starlight');
          else if (t.includes('romance')) setThemeByName('Romance');
          else cycleTheme();
        }
      }
    };
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, [togglePlay, nextTrack, setThemeByName, cycleTheme]);

  const toggleListen = () => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      if (!listening) rec.start();
      else rec.stop();
    } catch {
      // ignored
    }
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