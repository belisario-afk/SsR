import React, { useState } from 'react';
import { useVoice } from '@providers/VoiceProvider';

export function VoiceButton() {
  const { speak, stop, isSpeaking } = useVoice();
  const [text, setText] = useState('The first move is what sets everything in motion.');

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Say something..."
        style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #333', background: '#111', color: '#eee' }}
      />
      {!isSpeaking ? (
        <button onClick={() => speak(text)} style={{ padding: '8px 12px' }}>Speak</button>
      ) : (
        <button onClick={stop} style={{ padding: '8px 12px' }}>Stop</button>
      )}
    </div>
  );
}