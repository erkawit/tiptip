import { Howl } from 'howler';

/**
 * Plays alert sound via Howler.js, with audio synthesis fallback.
 */
export const playAlertSound = (soundUrl: string, volumePercent: number = 80): Promise<void> => {
  return new Promise((resolve) => {
    const vol = Math.min(Math.max(volumePercent / 100, 0), 1);

    if (!soundUrl) {
      playSyntheticEmeraldChime(vol);
      resolve();
      return;
    }

    try {
      const sound = new Howl({
        src: [soundUrl],
        volume: vol,
        html5: true, // Stream larger files smoothly
        onloaderror: () => {
          console.warn('[TipTip Audio] Failed to load external sound, playing synthetic chime.');
          playSyntheticEmeraldChime(vol);
          resolve();
        },
        onplayerror: () => {
          console.warn('[TipTip Audio] Autoplay blocked or decode error.');
          playSyntheticEmeraldChime(vol);
          resolve();
        },
        onend: () => {
          resolve();
        },
      });

      sound.play();
    } catch (err) {
      console.warn('[TipTip Audio] Howler error, using Web Audio fallback:', err);
      playSyntheticEmeraldChime(vol);
      resolve();
    }
  });
};

/**
 * Fallback Web Audio API synthesizer for an emerald sparkling chime
 */
export const playSyntheticEmeraldChime = (gainValue: number = 0.5) => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Emerald Major Chime)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(gainValue * 0.4, ctx.currentTime + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 1.0);
    });
  } catch (e) {
    console.error('AudioContext synthesis failed:', e);
  }
};

/**
 * Text to Speech handler using native Web Speech API
 */
export const playTTS = (text: string, voiceName?: string): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      if (voiceName) {
        const found = voices.find((v) => v.name.includes(voiceName) || v.lang.includes(voiceName));
        if (found) utterance.voice = found;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
};
