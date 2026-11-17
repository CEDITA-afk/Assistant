export type HapticPattern =
  | 'taskComplete'
  | 'dragDrop'
  | 'pomodoroComplete'
  | 'waterLog'
  | 'voiceCapture'
  | 'tap'
  | 'error';

const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  taskComplete: [18, 35, 28],
  dragDrop: [12, 20, 14],
  pomodoroComplete: [40, 60, 40, 60, 70],
  waterLog: [14, 24, 18],
  voiceCapture: [20, 30, 20],
  tap: 10,
  error: [30, 40, 30],
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      audioCtx = new Ctor();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTactileTone(pattern: HapticPattern) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (pattern === 'taskComplete' || pattern === 'waterLog') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (pattern === 'pomodoroComplete') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.11;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.07, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } else if (pattern === 'dragDrop' || pattern === 'tap' || pattern === 'voiceCapture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pattern === 'voiceCapture' ? 620 : 380, now);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

type HapticListener = (label: string) => void;
const listeners = new Set<HapticListener>();

export function subscribeHapticPulse(listener: HapticListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerHaptic(
  pattern: HapticPattern,
  options: { hapticsEnabled?: boolean; soundEnabled?: boolean; label?: string } = {}
) {
  const { hapticsEnabled = true, soundEnabled = true, label } = options;

  if (hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(VIBRATION_PATTERNS[pattern]);
    } catch {
      // Desktop browsers may ignore vibrate
    }
  }

  if (soundEnabled) {
    playTactileTone(pattern);
  }

  if (hapticsEnabled && label) {
    listeners.forEach((fn) => fn(label));
  }
}
