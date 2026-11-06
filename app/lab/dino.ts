import { findFile, listFiles, resolvePath, type VirtualFiles } from './filesystem';
import type { ShellResult } from './shell';
export type DinoCommand = { type: 'start' | 'hint' | 'restart' | 'hide' };
export type DinoReaction = 'watch' | 'read' | 'error' | 'success';
export type DinoAdvice = { text: string; command?: string; tone: DinoReaction };
export type DinoGuide = {
  enabled: boolean;
  step: number | null;
  advice: DinoAdvice | null;
  turn: number;
};
export const initialDinoGuide: DinoGuide = { enabled: true, step: null, advice: null, turn: 0 };
export const DINO_HELP = [
  '/dino          Terminal turunu başlat veya sürdür.',
  '/dino ipucu    Komut rehberini tekrar göster.',
  '/dino bastan   Üç adımlık terminal turunu sıfırla.',
  '/dino kapat    Rehberi gizle.',
  'Öneriler komut satırına yerleştirilir; Enter ile sen çalıştırırsın.',
  'Kod atölyesinde her sorunun kendi Dino ipucu var.',
];
const normalize = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıüöşğç]/g, (c) => ({ ı: 'i', ü: 'u', ö: 'o', ş: 's', ğ: 'g', ç: 'c' })[c]!);
export function parseDinoCommand(arg: string): DinoCommand | null {
  const key = normalize(arg.trim());
  if (key === '' || key === 'basla') return { type: 'start' };
  if (key === 'ipucu') return { type: 'hint' };
  if (key === 'bastan') return { type: 'restart' };
  if (key === 'kapat') return { type: 'hide' };
  return null;
}
export function dinoCommandLines(command: DinoCommand) {
  return [
    command.type === 'hide'
      ? 'Dino rehberi gizlendi. /dino ile geri çağırabilirsin.'
      : command.type === 'hint'
        ? 'Dino rehberi komut satırının yanında.'
        : command.type === 'restart'
          ? 'Terminal turu baştan başladı.'
          : 'Dino rehberi açıldı. Turdaki adımını komut satırının yanında görebilirsin.',
  ];
}
export function completeDino(input: string) {
  const match = /^(\/?dino)\s+([^\s]*)$/i.exec(input);
  if (!match) return [];
  return ['basla', 'ipucu', 'bastan', 'kapat']
    .filter((v) => v.startsWith(normalize(match[2])))
    .map((v) => match[1] + ' ' + v);
}
export const DINO_STEPS = [
  {
    title: 'Kulüp klasörüne gir.',
    text: 'cd, bulunduğun klasörü değiştirir. Önce kulübün dosyalarına gidelim.',
    command: 'cd /kulup',
  },
  {
    title: 'İçeride ne var?',
    text: 'ls, klasörün içindeki dosyaları listeler. Açabileceğin dosyanın adını bul.',
    command: 'ls /kulup',
  },
  {
    title: 'Dosyayı oku.',
    text: 'cat, metin dosyasının içeriğini gösterir. Kulübün tanışma notunu aç.',
    command: 'cat /kulup/hakkimizda.txt',
  },
] as const;
// Bounded edit distance, including adjacent swapped letters (sl → ls).
function distance(a: string, b: string) {
  if (a.length > 64 || b.length > 64) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
function closest(value: string, options: string[]) {
  if (!value || value.length > 64) return undefined;
  const scored = options
      .map((option) => ({ option, score: distance(normalize(value), normalize(option)) }))
      .sort((a, b) => a.score - b.score),
    first = scored[0];
  return first &&
    first.score <= Math.min(2, Math.floor(value.length / 2)) &&
    first.score < (scored[1]?.score ?? 99)
    ? first.option
    : undefined;
}
export function diagnoseCommand(
  raw: string,
  result: ShellResult,
  cwd: string,
  files: VirtualFiles,
  commands: readonly string[],
): DinoAdvice {
  const [name = '', ...parts] = normalize(raw.trim().replace(/^\//, '')).split(/\s+/),
    arg = raw.trim().replace(/^\/?\S+\s*/, '');
  const path = resolvePath(arg || '.', cwd),
    file = path ? findFile(files, path) : undefined;
  if (result.kind === 'error') {
    if (!commands.includes(name)) {
      const found = closest(name, [...commands]);
      return found
        ? {
            tone: 'error',
            text: '“' + name + '” yerine “' + found + '” yazmak istemiş olabilir misin?',
            command: found,
          }
        : {
            tone: 'error',
            text: 'Bu komutu tanımıyorum. Kullanabileceğin komutları help ile görebilirsin.',
            command: 'help',
          };
    }
    if (['cd', 'cat', 'ls', 'tree', 'wc'].includes(name)) {
      if (name === 'cd' && file?.kind === 'text')
        return {
          tone: 'error',
          text: 'Bu bir dosya. cd klasöre girer; dosyayı okumak için cat kullan.',
          command: 'cat ' + file.path,
        };
      if ((name === 'cat' || name === 'wc') && file?.kind === 'directory')
        return {
          tone: 'error',
          text: 'Bu bir klasör. Önce içindeki dosyaları listeleyelim.',
          command: 'ls ' + file.path,
        };
      const candidates = listFiles(files, cwd).filter((f) =>
          name === 'cd' || name === 'tree'
            ? f.kind === 'directory'
            : name === 'ls' || f.kind === 'text',
        ),
        found = closest(
          parts.join(' '),
          candidates.map((f) => f.name),
        );
      return found
        ? {
            tone: 'error',
            text: 'Dosya adında küçük bir fark var. Diskteki adıyla deneyebilirsin.',
            command: name + ' ' + candidates.find((f) => f.name === found)!.path,
          }
        : {
            tone: 'error',
            text: 'Bu yol bulunamadı. Bulunduğun klasördeki adları ls ile kontrol et; Tab da dosya adını tamamlar.',
            command: 'ls ' + cwd,
          };
    }
    if (name === 'hesap')
      return {
        tone: 'error',
        text: result.lines.some((l) => l.includes('Sıfıra'))
          ? 'Bölen sıfır olduğunda bu işlem tanımsız. Bölme işaretinin sağındaki sayıyı kontrol et.'
          : 'Sayıları, parantezleri ve işlem işaretlerini kontrol et. Örnek: (24 + 8) * 3.',
      };
    return {
      tone: 'error',
      text: 'Komut var, ancak yazılışını kontrol etmemiz gerekiyor. Kullanım örneğine bakalım.',
      command: 'help ' + name,
    };
  }
  if (result.effect?.type === 'cd')
    return {
      tone: 'success',
      text: 'Şimdi ' + result.effect.path + ' klasöründesin. İçeriğini ls ile görebilirsin.',
      command: 'ls',
    };
  if (name === 'ls') {
    if (file?.kind === 'text')
      return {
        tone: 'read',
        text: 'Bu bir metin dosyası. İçeriğini cat ile açabilirsin.',
        command: 'cat ' + file.path,
      };
    if (file?.kind === 'application')
      return {
        tone: 'read',
        text: 'Bu bir masaüstü uygulaması. open ile açabilirsin.',
        command: 'open ' + file.app,
      };
    const items = listFiles(files, path || cwd),
      text = items.find((f) => f.kind === 'text'),
      folder = items.find((f) => f.kind === 'directory');
    return text
      ? {
          tone: 'read',
          text: 'Bir metin dosyası bulduk. İçeriğini cat ile açabilirsin.',
          command: 'cat ' + text.path,
        }
      : folder
        ? {
            tone: 'read',
            text: 'Sonunda / olan adlar klasör. cd ile içine girebilirsin.',
            command: 'cd ' + folder.path,
          }
        : {
            tone: 'watch',
            text: 'Bu klasörde henüz dosya yok. Tüm diske tree ile bakabilirsin.',
            command: 'tree /',
          };
  }
  if (name === 'cat')
    return {
      tone: 'success',
      text: 'Dosya açıldı. Bir kelime aramak istersen grep kullanabilirsin.',
      command: 'help grep',
    };
  if (name === 'hesap')
    return {
      tone: 'success',
      text: 'İşlem tamamlandı. ↑ ile önceki hesabı geri getirip değiştirebilirsin.',
    };
  if (name === 'help')
    return {
      tone: 'read',
      text: 'Komut adına dokununca satıra gelir. Tab tamamlar; ↑ önceki komutu getirir.',
    };
  return {
    tone: 'watch',
    text: 'Tab ile tamamla, ↑ ile geri çağır. Yeni bir şey denemek için kod atölyesine geçebilirsin.',
    command: 'atolye web',
  };
}
export function advanceDinoGuide(
  state: DinoGuide,
  raw: string,
  result: ShellResult,
  cwd: string,
  files: VirtualFiles,
  commands: readonly string[],
): DinoGuide {
  if (result.dino) {
    const type = result.dino.type;
    if (type === 'hide') return { ...state, enabled: false };
    if (type === 'hint') return { ...state, enabled: true };
    return {
      ...state,
      enabled: true,
      step: type === 'restart' ? 0 : (state.step ?? 0),
      advice: null,
      turn: state.turn + 1,
    };
  }
  if (!state.enabled) return state;
  const [name, ...parts] = raw.trim().replace(/^\//, '').split(/\s+/),
    arg = parts.join(' '),
    path = resolvePath(arg || '.', cwd);
  let step = state.step;
  if (result.kind !== 'error') {
    if (step === 0 && result.effect?.type === 'cd' && result.effect.path === '/kulup') step = 1;
    else if (step === 1 && normalize(name) === 'ls' && path === '/kulup') step = 2;
    else if (step === 2 && normalize(name) === 'cat' && path === '/kulup/hakkimizda.txt') step = 3;
  }
  const touring = step !== null && step < 3;
  return {
    ...state,
    step,
    turn: state.turn + 1,
    advice:
      step === 3 && state.step !== 3
        ? null
        : result.kind === 'error' || !touring
          ? diagnoseCommand(raw, result, cwd, files, commands)
          : step !== state.step
            ? {
                tone: 'success',
                text:
                  step === 1
                    ? 'Klasöre girdin. Şimdi içeriğine bakalım.'
                    : 'Dosyayı buldun. Sırada içeriği var.',
              }
            : null,
  };
}
