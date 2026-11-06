import { TRACKS } from './challenges';
export { TRACKS, QUESTION_COUNT } from './challenges';
export type { Challenge, Track } from './challenges';
export const DINO = [
  '          ▄████████▄',
  '          ██ ▀██████',
  '          ██████▀▀▀▀',
  ' ▄        █████▀▀',
  ' ██▄    ▄██████▄▄',
  ' ██████████████ ▀',
  '  ▀████████████',
  '    ▀████████▀',
  '      ██  ██',
  '      ██▄ ██▄',
].join('\n');
import { APPS, type AppId } from './desktop';
export { APPS, type AppId } from './desktop';
export type Phase =
  | 'boot'
  | 'typing'
  | 'answer'
  | 'warnings'
  | 'crash'
  | 'repair'
  | 'reboot'
  | 'desktop-return'
  | 'restore'
  | 'success';
export type TerminalState = {
  field: number;
  question: number;
  phase: Phase;
  frame: number;
  chars: number;
  progress: number;
  removed: string[];
  selected: string | null;
  attempt: number;
  app: AppId | null;
  openApps: AppId[];
  maximized: boolean;
  solved: string[];
  session: number;
};
export const initialTerminal: TerminalState = {
  field: 0,
  question: 0,
  phase: 'boot',
  frame: 0,
  chars: 0,
  progress: 0,
  removed: [],
  selected: null,
  attempt: 0,
  app: 'terminal',
  openApps: ['terminal'],
  maximized: false,
  solved: [],
  session: 0,
};
export const recovering = (s: TerminalState) =>
  ['warnings', 'crash', 'repair', 'reboot', 'desktop-return', 'restore'].includes(s.phase);
export type TerminalAction =
  | { type: 'tick'; instant?: boolean; session?: number }
  | { type: 'choose'; value: string }
  | { type: 'field'; index: number }
  | { type: 'question'; index: number }
  | { type: 'next' }
  | { type: 'reveal' }
  | { type: 'open'; app: AppId }
  | { type: 'close' }
  | { type: 'minimize' }
  | { type: 'maximize' }
  | { type: 'skip-recovery' };
function questionState(s: TerminalState, field: number, question: number): TerminalState {
  return {
    ...s,
    field,
    question,
    phase: 'boot',
    frame: 0,
    chars: 0,
    progress: 0,
    removed: [],
    selected: null,
    attempt: 0,
    session: s.session + 1,
    app: 'terminal',
    openApps: s.openApps.includes('terminal') ? s.openApps : [...s.openApps, 'terminal'],
  };
}
export function terminalReducer(s: TerminalState, a: TerminalAction): TerminalState {
  const q = TRACKS[s.field].questions[s.question];
  if (a.type === 'open') {
    if (recovering(s) || !APPS.includes(a.app)) return s;
    return {
      ...s,
      app: a.app,
      openApps: s.openApps.includes(a.app) ? s.openApps : [...s.openApps, a.app],
    };
  }
  if (a.type === 'close' || a.type === 'minimize') {
    if (recovering(s) || !s.app) return s;
    return {
      ...s,
      app: null,
      openApps: a.type === 'close' ? s.openApps.filter((id) => id !== s.app) : s.openApps,
    };
  }
  if (a.type === 'maximize') return recovering(s) || !s.app ? s : { ...s, maximized: !s.maximized };
  if (a.type === 'skip-recovery')
    return recovering(s)
      ? {
          ...s,
          phase: 'answer',
          chars: q.code.length,
          frame: 0,
          progress: 100,
          selected: null,
          app: 'terminal',
          session: s.session + 1,
        }
      : s;
  if (recovering(s) && a.type !== 'tick') return s;
  if (a.type === 'field') return TRACKS[a.index] ? questionState(s, a.index, 0) : s;
  if (a.type === 'question')
    return TRACKS[s.field].questions[a.index] ? questionState(s, s.field, a.index) : s;
  if (a.type === 'next')
    return s.phase === 'success'
      ? questionState(s, s.field, (s.question + 1) % TRACKS[s.field].questions.length)
      : s;
  if (a.type === 'reveal')
    return ['boot', 'typing'].includes(s.phase)
      ? { ...s, phase: 'answer', chars: q.code.length }
      : s;
  if (a.type === 'choose') {
    if (
      s.app !== 'terminal' ||
      s.phase !== 'answer' ||
      s.removed.includes(a.value) ||
      !q.options.includes(a.value)
    )
      return s;
    if (a.value === q.correct)
      return {
        ...s,
        phase: 'success',
        selected: a.value,
        solved: s.solved.includes(q.id) ? s.solved : [...s.solved, q.id],
      };
    return {
      ...s,
      phase: 'warnings',
      frame: 0,
      selected: a.value,
      removed: [...s.removed, a.value],
      progress: 0,
      attempt: s.attempt + 1,
    };
  }
  if (a.type === 'tick') {
    if (a.session !== undefined && a.session !== s.session) return s;
    if (s.app !== 'terminal' && !recovering(s)) return s;
    if (s.phase === 'boot')
      return a.instant || s.frame >= 10
        ? { ...s, phase: 'typing', frame: 11 }
        : { ...s, frame: s.frame + 1 };
    if (s.phase === 'typing') {
      const chars = a.instant ? q.code.length : Math.min(q.code.length, s.chars + 1);
      return { ...s, chars, phase: chars === q.code.length ? 'answer' : 'typing' };
    }
    if (s.phase === 'warnings')
      return s.frame >= 2 || a.instant
        ? { ...s, phase: 'crash', frame: 0 }
        : { ...s, frame: s.frame + 1 };
    if (s.phase === 'crash') return { ...s, phase: 'repair' };
    if (s.phase === 'repair')
      return s.progress === 100
        ? { ...s, phase: 'reboot', frame: 0, app: null }
        : {
            ...s,
            progress: a.instant ? 100 : Math.min(100, s.progress + (s.progress < 72 ? 12 : 7)),
          };
    if (s.phase === 'reboot')
      return s.frame >= 3 || a.instant
        ? { ...s, phase: 'desktop-return', frame: 0 }
        : { ...s, frame: s.frame + 1 };
    if (s.phase === 'desktop-return') return { ...s, phase: 'restore', app: 'terminal' };
    if (s.phase === 'restore') return { ...s, phase: 'typing', chars: 0, selected: null };
  }
  return s;
}
export function terminalDelay(s: TerminalState, pace: 'cinematic' | 'quick' = 'cinematic') {
  const quick = pace === 'quick';
  if (s.phase === 'warnings') return s.frame === 0 ? 550 : s.frame === 1 ? 420 : 620;
  if (s.phase === 'crash') return quick ? 450 : 1250;
  if (s.phase === 'repair')
    return s.progress === 100 ? (quick ? 250 : 900) : quick ? 95 : s.progress < 72 ? 340 : 440;
  if (s.phase === 'reboot') return quick ? 180 : 520;
  if (s.phase === 'desktop-return') return quick ? 400 : 1200;
  if (s.phase === 'restore') return 650;
  if (s.phase === 'boot') return 65;
  const c = TRACKS[s.field].questions[s.question].code[s.chars - 1];
  return c === '\n' ? 100 : /[;{}:]/.test(c || '') ? 65 : 12 + ((s.chars * 7) % 5) * 5;
}
