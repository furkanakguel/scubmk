import { APPS, appLabels, type AppId } from './desktop';
import { HELP_QUESTIONS } from './help';
import type { DesktopContent } from './public-content';

export type VirtualFile = {
  path: string;
  name: string;
  kind: 'directory' | 'text' | 'application';
  text?: string;
  app?: AppId;
};
export type VirtualFiles = readonly VirtualFile[];
export const SHORTCUTS =
  'Ctrl + Boşluk  Çalıştır\nAlt + `        Sonraki pencere\nAlt + yön      Başlıktan pencereyi taşı\nTab            Komut veya dosya adını tamamla\n↑ / ↓          Komut geçmişi\nCtrl + L       Terminali temizle\nCtrl + U       Yazdığın komutu sil\nEscape         Açık menüyü kapat';
// This is a read-only, in-memory filesystem. No path ever reaches an OS or API.
export function createFileSystem(content: DesktopContent): VirtualFiles {
  const files: VirtualFile[] = [
    { path: '/', name: 'BMK Disk', kind: 'directory' },
    ...['kulup', 'etkinlikler', 'ekip', 'uygulamalar', 'rehber'].map((name) => ({
      path: '/' + name,
      name,
      kind: 'directory' as const,
    })),
    {
      path: '/basla.txt',
      name: 'basla.txt',
      kind: 'text',
      text: 'BMK OS 3.0\n\nSivas Cumhuriyet Üniversitesi\nBilgisayar Mühendisliği Kulübü\n\nBu masaüstü senin keşif alanın. Dosyaları aç, terminalden klasörlerde gezin, kod atölyesinde bir soru çöz.\n\nİlk komutlar:\n  ls\n  cd kulup\n  cat hakkimizda.txt\n  tree /\n\nDosyalar sitenin yayımlanmış içeriklerinden hazırlanır. Not defterindeki yazıların yalnızca bu tarayıcıda tutulur.',
    },
    {
      path: '/kulup/hakkimizda.txt',
      name: 'hakkimizda.txt',
      kind: 'text',
      text: 'SCÜ BMK\n\nMerak eden, öğrenen ve birlikte üreten öğrencilerin kulübü. Atölyeler, etkinlikler ve ortak projelerle derslerin dışında da bir aradayız.\n\nInstagram: @cumhuriyetbmk\n\nEkibimizi /ekip klasöründe, buluşmaları /etkinlikler klasöründe bulabilirsin.',
    },
    { path: '/rehber/kisayollar.txt', name: 'kisayollar.txt', kind: 'text', text: SHORTCUTS },
    ...HELP_QUESTIONS.map((q, i) => ({
      path: '/rehber/' + (i + 1) + '-soru.txt',
      name: i + 1 + '-soru.txt',
      kind: 'text' as const,
      text: q.q + '\n\n' + q.a,
    })),
    ...APPS.map((app) => ({
      path: '/uygulamalar/' + app + '.app',
      name: app + '.app',
      kind: 'application' as const,
      app,
      text: appLabels[app],
    })),
  ];
  content.events.slice(0, 200).forEach((e, i) => {
    const name = String(i + 1).padStart(3, '0') + '-etkinlik.txt';
    files.push({
      path: '/etkinlikler/' + name,
      name,
      kind: 'text',
      text: [e.title, e.category, e.date, e.location, '', e.description].join('\n').slice(0, 32000),
    });
  });
  content.members.slice(0, 200).forEach((m, i) => {
    const name = String(i + 1).padStart(3, '0') + '-profil.txt';
    files.push({
      path: '/ekip/' + name,
      name,
      kind: 'text',
      text: [m.name, m.role, m.team, m.department, '', m.bio].join('\n').slice(0, 32000),
    });
  });
  return files;
}
export function resolvePath(input: string, cwd = '/'): string | null {
  if (input.length > 256 || /[\\:\x00-\x1f?#]/.test(input)) return null;
  const source = input === '~' ? '/' : input.startsWith('~/') ? input.slice(1) : input;
  const parts = (source.startsWith('/') ? source : cwd + '/' + source).split('/'),
    out: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}
export function parentPath(path: string) {
  return path.slice(0, path.lastIndexOf('/')) || '/';
}
export function findFile(files: VirtualFiles, path: string) {
  return files.find((f) => f.path === path);
}
export function listFiles(files: VirtualFiles, path: string) {
  return files.filter((f) => f.path !== path && parentPath(f.path) === path);
}
export function fileSize(file: VirtualFile) {
  return new TextEncoder().encode(file.text || '').length;
}
export function treeLines(files: VirtualFiles, path = '/', depth = 0): string[] {
  if (depth > 8) return [];
  return listFiles(files, path)
    .flatMap((f, i, a) => {
      const last = i === a.length - 1;
      return [
        (last ? '└─ ' : '├─ ') + f.name + (f.kind === 'directory' ? '/' : ''),
        ...(f.kind === 'directory'
          ? treeLines(files, f.path, depth + 1).map((l) => (last ? '   ' : '│  ') + l)
          : []),
      ];
    })
    .slice(0, 500);
}
