/**
 * A short, unmistakable alert tone for new "I need help" notifications — synthesised
 * with the Web Audio API so the feature doesn't depend on hosting an audio file.
 * Browsers may block audio before the user has interacted with the page at all;
 * that's fine, the toast/notification still gets shown either way.
 */
let ctx: AudioContext | null = null;

export function playAlertSound(): void {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    [0, 0.22].forEach((offset, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1046.5;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch {
    /* best-effort — a missing sound should never break the alert itself */
  }
}
