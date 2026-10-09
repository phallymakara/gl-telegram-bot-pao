/**
 * @file sound.ts
 * @description Audio synthesizer using Web Audio API to play a refined, modern
 * ascending crystal chime (C6 -> E6 -> G6 major triad) for notifications.
 */

export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Elegant 3-note ascending crystal chime: C6 (1046.50 Hz) -> E6 (1318.51 Hz) -> G6 (1567.98 Hz)
    const notes = [
      { freq: 1046.5, time: now, duration: 0.35, gain: 0.18 },
      { freq: 1318.51, time: now + 0.08, duration: 0.45, gain: 0.22 },
      { freq: 1567.98, time: now + 0.16, duration: 0.6, gain: 0.25 },
    ];

    notes.forEach(({ freq, time, duration, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      // Clean, soft acoustic envelope with natural decay
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(peakGain, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    });
  } catch {
    // Ignore if audio context cannot be initialized
  }
}

export function triggerBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(title, options);
      } catch {
        // Fallback
      }
    } else if (Notification.permission === "default") {
      try {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            try {
              new Notification(title, options);
            } catch {}
          }
        });
      } catch {}
    }
  }
}
