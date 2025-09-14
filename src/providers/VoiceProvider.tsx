import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ElevenLabsClient, type ElevenLabs } from '@elevenlabs/elevenlabs-js';

type SpeakOptions = {
  voiceId?: string;
  modelId?: string;
  outputFormat?: ElevenLabs.TextToSpeechConvertRequestOutputFormat;
};

type VoiceContextType = {
  isSpeaking: boolean;
  speak: (text: string, opts?: SpeakOptions) => Promise<void>;
  stop: () => void;
  defaultVoiceId: string;
  defaultModelId: string;
};

const VoiceContext = createContext<VoiceContextType | null>(null);

// If your UI is on Vercel with the API function in the same project, this can stay '/api/tts'
const TTS_PROXY_URL = import.meta.env.VITE_TTS_PROXY_URL || '/api/tts';

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  // Local dev convenience only; do NOT ship client with this set in production
  const localApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;

  const defaultVoiceId = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string) || 'JBFqnCBsd6RMkjVDRZzb';
  const defaultModelId = (import.meta.env.VITE_ELEVENLABS_MODEL_ID as string) || 'eleven_multilingual_v2';

  const client = useMemo(() => {
    if (!localApiKey) return null;
    return new ElevenLabsClient({ apiKey: localApiKey });
  }, [localApiKey]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const currentUrl = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (currentAudio.current) {
      try {
        currentAudio.current.pause();
      } catch {}
    }
    if (currentUrl.current) {
      URL.revokeObjectURL(currentUrl.current);
    }
    currentAudio.current = null;
    currentUrl.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, opts?: SpeakOptions) => {
      if (!text || !text.trim()) return;

      // Stop any previous playback
      stop();
      setIsSpeaking(true);

      const voiceId = opts?.voiceId || defaultVoiceId;
      const modelId = opts?.modelId || defaultModelId;
      const outputFormat: ElevenLabs.TextToSpeechConvertRequestOutputFormat =
        opts?.outputFormat ?? 'mp3_44100_128';

      try {
        let blob: Blob;

        if (client) {
          // Local dev path (uses SDK directly — returns a ReadableStream)
          const stream = await client.textToSpeech.convert(voiceId, {
            text,
            modelId,
            outputFormat,
          });
          // Convert ReadableStream -> Blob for <audio> playback
          blob = await new Response(stream as unknown as ReadableStream<Uint8Array>).blob();
        } else {
          // Production path via serverless proxy (returns audio bytes/stream)
          const res = await fetch(TTS_PROXY_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text, voiceId, modelId, outputFormat }),
          });
          if (!res.ok) throw new Error(`TTS proxy failed: ${res.status}`);
          blob = await res.blob();
        }

        const mime =
          typeof outputFormat === 'string' && outputFormat.startsWith('mp3') ? 'audio/mpeg' : 'audio/wav';
        const typedBlob = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });

        const url = URL.createObjectURL(typedBlob);
        currentUrl.current = url;

        const el = new Audio(url);
        currentAudio.current = el;

        await el.play();
        el.onended = () => {
          stop();
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('TTS speak() failed:', e);
        stop();
      }
    },
    [client, defaultModelId, defaultVoiceId, stop]
  );

  const value = useMemo<VoiceContextType>(
    () => ({
      isSpeaking,
      speak,
      stop,
      defaultVoiceId,
      defaultModelId,
    }),
    [isSpeaking, speak, stop, defaultVoiceId, defaultModelId]
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within a VoiceProvider');
  return ctx;
}