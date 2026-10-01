/**
 * THE SOUNDS, made in the browser: short tones from the Web Audio API, one for each thing that happens (a
 * step, drawing back, a key, an arrow bumping, an arrow flying off, an unlock, a solve, a loss). There are no
 * recordings, so there is nothing to fetch and nothing to credit. Nothing is made until the first sound is
 * asked for, a browser with no audio, or one that has not been touched yet, is silent without an error, and
 * a sound that comes too soon after the last of its kind is dropped.
 */
export const MEIKYUU_SOUND_KINDS = ["step", "back", "key", "bump", "fly", "unlock", "solve", "lose", "tap"] as const;
export type MeikyuuSoundKind = (typeof MEIKYUU_SOUND_KINDS)[number];

export type MeikyuuSounds = {
  play(kind: MeikyuuSoundKind): void;
  destroy(): void;
};

/** What each sound is: its notes in hertz, how long each lasts in seconds, the waveform, and the loudness. */
const SOUNDS: Record<MeikyuuSoundKind, { notes: number[]; each: number; wave: OscillatorType; gain: number; gap: number }> = {
  step: { notes: [520], each: 0.035, wave: "sine", gain: 0.035, gap: 0.045 },
  back: { notes: [380], each: 0.035, wave: "sine", gain: 0.035, gap: 0.045 },
  key: { notes: [660, 880], each: 0.09, wave: "triangle", gain: 0.09, gap: 0.1 },
  bump: { notes: [150, 110], each: 0.08, wave: "square", gain: 0.05, gap: 0.12 },
  fly: { notes: [500, 720, 1000], each: 0.05, wave: "sine", gain: 0.06, gap: 0.08 },
  unlock: { notes: [523, 659, 784], each: 0.1, wave: "triangle", gain: 0.09, gap: 0.2 },
  solve: { notes: [523, 659, 784, 1047], each: 0.14, wave: "triangle", gain: 0.1, gap: 0.5 },
  lose: { notes: [392, 330, 262], each: 0.16, wave: "sawtooth", gain: 0.05, gap: 0.5 },
  tap: { notes: [440], each: 0.03, wave: "sine", gain: 0.03, gap: 0.05 },
};

export function createMeikyuuSounds(): MeikyuuSounds {
  let context: AudioContext | null = null;
  const lastAt = new Map<MeikyuuSoundKind, number>();
  const contextOf = (): AudioContext | null => {
    if (context !== null) return context;
    const Audio = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (Audio === undefined) return null;
    try {
      context = new Audio();
    } catch {
      return null;
    }
    return context;
  };
  return {
    play: (kind) => {
      const audio = contextOf();
      if (audio === null) return;
      const sound = SOUNDS[kind];
      const now = audio.currentTime;
      if (now - (lastAt.get(kind) ?? -10) < sound.gap) return;
      lastAt.set(kind, now);
      void audio.resume?.().catch(() => undefined);
      sound.notes.forEach((hertz, index) => {
        const start = now + index * sound.each;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = sound.wave;
        oscillator.frequency.value = hertz;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(sound.gain, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + sound.each * 1.6);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + sound.each * 1.7);
      });
    },
    destroy: () => {
      void context?.close().catch(() => undefined);
      context = null;
    },
  };
}
