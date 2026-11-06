export type Sound =
  | 'start'
  | 'jump'
  | 'land'
  | 'slide'
  | 'step'
  | 'star'
  | 'diamond'
  | 'combo'
  | 'power'
  | 'shield'
  | 'break'
  | 'level'
  | 'near'
  | 'over'
  | 'pause'
  | 'flight'
  | 'flap'
  | 'flip'
  | 'release'
  | 'warning';
function browserAudioContext() {
  const Context =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw Error('Bu tarayıcı oyun seslerini desteklemiyor.');
  return new Context({ latencyHint: 'interactive' });
}
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };
let playbackUsers = 0,
  previousSessionType: string | undefined;
function claimPlayback() {
  if (typeof navigator === 'undefined') return () => {};
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session) return () => {};
  try {
    if (playbackUsers === 0) {
      previousSessionType = session.type;
      session.type = 'playback';
    }
    playbackUsers++;
  } catch {
    return () => {};
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    playbackUsers = Math.max(0, playbackUsers - 1);
    if (!playbackUsers) {
      try {
        if (session.type === 'playback' && previousSessionType) session.type = previousSessionType;
      } catch {}
      previousSessionType = undefined;
    }
  };
}
type Voice = { source: AudioScheduledSourceNode; end: number; release: () => void };
export function createGameAudio(
  makeContext: () => AudioContext = browserAudioContext,
  onState: (running: boolean) => void = () => {},
) {
  let ac: AudioContext | null = null,
    master: GainNode | null = null,
    noise: AudioBuffer | null = null,
    enabled = false,
    lastStar = -Infinity,
    disposed = false,
    resuming: Promise<boolean> | null = null,
    generation = 0;
  let releasePlayback: (() => void) | null = null;
  const report = () => onState(!disposed && enabled && ac?.state === 'running');
  const voices = new Set<Voice>();
  function stop() {
    for (const v of [...voices]) {
      try {
        v.source.stop();
      } catch {}
      v.release();
    }
  }
  function retire() {
    generation++;
    resuming = null;
    stop();
    const old = ac;
    ac = null;
    master = null;
    noise = null;
    lastStar = -Infinity;
    if (old) {
      old.onstatechange = null;
      if (old.state !== 'closed') void old.close().catch(() => {});
    }
    report();
  }
  function setup() {
    if (ac && ac.state !== 'closed') return;
    if (ac) retire();
    ac = makeContext();
    ac.onstatechange = report;
    master = ac.createGain();
    master.gain.value = 0.82;
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.knee.value = 10;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.18;
    master.connect(limiter);
    limiter.connect(ac.destination);
    noise = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.6), ac.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.65;
  }
  function resume(): Promise<boolean> {
    if (disposed || !enabled) return Promise.resolve(false);
    try {
      releasePlayback ??= claimPlayback();
      setup();
    } catch (e) {
      releasePlayback?.();
      releasePlayback = null;
      report();
      return Promise.reject(e);
    }
    const context = ac!,
      epoch = generation;
    if (context.state === 'running') {
      report();
      return Promise.resolve(true);
    }
    if (resuming) return resuming;
    let timeout: ReturnType<typeof setTimeout>;
    // Called synchronously from the user's click, before server requests.
    const result = Promise.race([
      context.resume(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(Error('Ses yeniden başlatılmalı.')), 1800);
      }),
    ]);
    const task = result
      .then(() => !disposed && enabled && generation === epoch && context.state === 'running')
      .finally(() => {
        clearTimeout(timeout);
        if (resuming === task) resuming = null;
        report();
      });
    resuming = task;
    return task;
  }
  function setEnabled(next: boolean) {
    enabled = next;
    if (!next) {
      stop();
      releasePlayback?.();
      releasePlayback = null;
      report();
      return Promise.resolve(false);
    }
    return resume();
  }
  function restart() {
    if (disposed) return Promise.resolve(false);
    enabled = true;
    retire();
    return enabled ? resume() : Promise.resolve(false);
  }
  function slot() {
    if (!enabled || !ac || !master || ac.state !== 'running') return false;
    for (const v of [...voices]) if (v.end < ac.currentTime) v.release();
    return voices.size < 18;
  }
  function track(source: AudioScheduledSourceNode, end: number, links: AudioNode[]) {
    let released = false;
    const voice: Voice = {
      source,
      end,
      release() {
        if (released) return;
        released = true;
        voices.delete(voice);
        source.onended = null;
        source.disconnect();
        for (const n of links) n.disconnect();
      },
    };
    voices.add(voice);
    source.onended = voice.release;
  }
  function tone(
    hz: number,
    end: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.1,
    delay = 0,
  ) {
    if (!slot()) return;
    const context = ac!,
      at = context.currentTime + delay,
      o = context.createOscillator(),
      g = context.createGain();
    o.type = type;
    o.frequency.setValueAtTime(hz, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(25, end), at + duration);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.007);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    o.connect(g);
    g.connect(master!);
    track(o, at + duration + 0.03, [g]);
    o.start(at);
    o.stop(at + duration + 0.02);
  }
  function hiss(duration: number, gain: number, cutoff = 900, delay = 0) {
    if (!slot() || !noise) return;
    const context = ac!,
      at = context.currentTime + delay,
      n = context.createBufferSource(),
      g = context.createGain(),
      filter = context.createBiquadFilter();
    n.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    n.connect(filter);
    filter.connect(g);
    g.connect(master!);
    track(n, at + duration + 0.02, [filter, g]);
    n.start(at);
    n.stop(at + duration);
  }
  function play(sound: Sound, value = 1) {
    if (!enabled || !ac) return;
    if (sound === 'star') {
      if (ac.currentTime - lastStar < 0.055) return;
      lastStar = ac.currentTime;
      tone(880 + value * 55, 1320, 0.16, 'sine', 0.16);
      tone(1760, 2200, 0.22, 'sine', 0.035, 0.025);
    } else if (sound === 'diamond') {
      [1046, 1568, 2093].forEach((n, i) =>
        tone(n, n * 1.002, 0.32, 'sine', 0.11 - i * 0.023, i * 0.045),
      );
    } else if (sound === 'jump') {
      tone(145, 440, 0.18, 'triangle', 0.14);
      hiss(0.09, 0.07, 2200);
    } else if (sound === 'land') {
      hiss(0.085, 0.14, 420);
      tone(94, 42, 0.12, 'sine', 0.16);
    } else if (sound === 'slide') {
      hiss(0.25, 0.17, 1200);
      tone(150, 65, 0.18, 'triangle', 0.045);
    } else if (sound === 'step') {
      hiss(0.04, 0.06, 500 + value * 50);
      tone(75, 45, 0.035, 'sine', 0.05);
    } else if (sound === 'combo') {
      [659, 988, 1318].forEach((n, i) => tone(n, n, 0.2, 'sine', 0.11, i * 0.055));
    } else if (sound === 'power') {
      [330, 495, 660, 990].forEach((n, i) => tone(n, n * 1.015, 0.25, 'triangle', 0.09, i * 0.055));
      hiss(0.35, 0.08, 1800);
    } else if (sound === 'shield') {
      tone(120, 720, 0.35, 'sine', 0.17);
      tone(540, 1080, 0.28, 'triangle', 0.065, 0.08);
    } else if (sound === 'break') {
      hiss(0.32, 0.24, 2400);
      tone(380, 52, 0.35, 'sawtooth', 0.07);
      tone(65, 35, 0.3, 'sine', 0.2);
    } else if (sound === 'level') {
      [392, 587, 784].forEach((n, i) => tone(n, n, 0.3, 'sine', 0.11, i * 0.09));
    } else if (sound === 'near') {
      hiss(0.14, 0.13, 3000);
      tone(1000, 1900, 0.11, 'sine', 0.055);
    } else if (sound === 'start') {
      [330, 440, 660].forEach((n, i) => tone(n, n, 0.2, 'triangle', 0.14, i * 0.09));
      tone(110, 110, 0.35, 'sine', 0.12);
    } else if (sound === 'over') {
      hiss(0.2, 0.2, 650);
      [220, 165, 82].forEach((n, i) => tone(n, n * 0.85, 0.28, 'triangle', 0.13, i * 0.11));
    } else if (sound === 'pause') tone(420, 300, 0.1, 'sine', 0.08);
    else if (sound === 'flight') {
      hiss(0.55, 0.2, 1000);
      tone(300, 1200, 0.32, 'sine', 0.13);
      tone(1700, 900, 0.25, 'triangle', 0.08, 0.3);
    } else if (sound === 'flap') {
      hiss(0.15, 0.13, 680);
      hiss(0.09, 0.08, 1100, 0.16);
    } else if (sound === 'flip') {
      hiss(0.32, 0.18, 2200);
      tone(400, 1400, 0.2, 'sine', 0.07);
      tone(1400, 550, 0.19, 'sine', 0.06, 0.17);
    } else if (sound === 'release') {
      tone(1200, 600, 0.35, 'sine', 0.1);
      hiss(0.4, 0.13, 900);
    } else if (sound === 'warning') {
      tone(700, 700, 0.1, 'sine', 0.09);
      tone(900, 900, 0.1, 'sine', 0.09, 0.16);
    }
  }
  return {
    play,
    setEnabled,
    resume,
    restart,
    isRunning: () => enabled && ac?.state === 'running',
    stop,
    destroy() {
      disposed = true;
      enabled = false;
      retire();
      releasePlayback?.();
      releasePlayback = null;
    },
  };
}
