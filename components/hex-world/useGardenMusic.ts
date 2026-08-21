"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

const MUSIC_MUTED_KEY = 'narinyland:music-muted';
const MUSIC_GAIN = 0.022;
const CHORDS = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 261.63, 293.66],
] as const;

type BrowserAudioContext = AudioContext & { createGain(): GainNode };

type AudioRuntime = {
  context: BrowserAudioContext;
  gain: GainNode;
  oscillators: OscillatorNode[];
  timer: ReturnType<typeof setInterval>;
};

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  const candidate = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? candidate.webkitAudioContext ?? null;
}

export function useGardenMusic() {
  const [musicMuted, setMusicMuted] = useState(false);
  const mutedRef = useRef(false);
  const runtimeRef = useRef<AudioRuntime | null>(null);

  const setGain = useCallback((muted: boolean) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const now = runtime.context.currentTime;
    runtime.gain.gain.cancelScheduledValues(now);
    runtime.gain.gain.setTargetAtTime(muted ? 0 : MUSIC_GAIN, now, 0.18);
  }, []);

  const ensureStarted = useCallback(async () => {
    if (runtimeRef.current) {
      if (runtimeRef.current.context.state === 'suspended') await runtimeRef.current.context.resume().catch(() => undefined);
      setGain(mutedRef.current);
      return;
    }
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor() as BrowserAudioContext;
    const gain = context.createGain();
    gain.gain.value = mutedRef.current ? 0 : MUSIC_GAIN;
    gain.connect(context.destination);

    const oscillators = CHORDS[0].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      const voiceGain = context.createGain();
      voiceGain.gain.value = index === 0 ? 0.52 : 0.24;
      oscillator.connect(voiceGain);
      voiceGain.connect(gain);
      oscillator.start();
      return oscillator;
    });

    let chordIndex = 0;
    const timer = setInterval(() => {
      chordIndex = (chordIndex + 1) % CHORDS.length;
      const now = context.currentTime;
      oscillators.forEach((oscillator, index) => {
        oscillator.frequency.cancelScheduledValues(now);
        oscillator.frequency.linearRampToValueAtTime(CHORDS[chordIndex][index], now + 1.25);
      });
    }, 6500);

    runtimeRef.current = { context, gain, oscillators, timer };
    if (context.state === 'suspended') await context.resume().catch(() => undefined);
  }, [setGain]);

  useEffect(() => {
    let initialMuted = false;
    try {
      initialMuted = window.localStorage.getItem(MUSIC_MUTED_KEY) === 'true';
    } catch {
      initialMuted = false;
    }
    mutedRef.current = initialMuted;
    setMusicMuted(initialMuted);

    const unlock = () => {
      if (!mutedRef.current) void ensureStarted();
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ensureStarted]);

  useEffect(() => () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    clearInterval(runtime.timer);
    runtime.oscillators.forEach((oscillator) => {
      try { oscillator.stop(); } catch { /* already stopped */ }
    });
    void runtime.context.close().catch(() => undefined);
    runtimeRef.current = null;
  }, []);

  const toggleMusic = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMusicMuted(next);
    try {
      window.localStorage.setItem(MUSIC_MUTED_KEY, String(next));
    } catch {
      // Preference persistence is best-effort; the in-memory mute still works.
    }
    if (next) setGain(true);
    else void ensureStarted().then(() => setGain(false));
  }, [ensureStarted, setGain]);

  return { musicMuted, toggleMusic };
}
