import { APPS, appLabels, themeLabels, type AppId, type DesktopTheme } from './desktop';
import type { DesktopContent } from './public-content';
import {
  createFileSystem,
  resolvePath,
  findFile,
  listFiles,
  treeLines,
  fileSize,
  SHORTCUTS,
  type VirtualFiles,
} from './filesystem';
import {
  parseDinoCommand,
  dinoCommandLines,
  completeDino,
  DINO_HELP,
  type DinoCommand,
} from './dino';
export const COMMANDS = [
  { name: 'help', args: '[komut]', description: 'Komut rehberini aç.' },
  { name: 'ls', args: '[klasör]', description: 'Bir klasörün içeriğini listele.' },
  { name: 'pwd', args: '', description: 'Bulunduğun klasörün yolunu göster.' },
  { name: 'cd', args: '[klasör]', description: 'Klasör değiştir. Örnek: cd kulup veya cd ..' },
  { name: 'cat', args: 'dosya', description: 'Bir metin dosyasını oku.' },
  { name: 'tree', args: '[klasör]', description: 'Klasör ağacını çiz.' },
  { name: 'find', args: 'kelime', description: 'Dosya adlarında ara.' },
  {
    name: 'grep',
    args: '"metin" dosya',
    description: 'Dosyada metin ara; eşleşen satırları göster.',
  },
  { name: 'wc', args: 'dosya', description: 'Satır, kelime ve bayt sayısını göster.' },
  { name: 'ps', args: '', description: 'Açık BMK OS pencerelerini ve durumlarını gör.' },
  { name: 'close', args: 'uygulama', description: 'Bir masaüstü penceresini kapat.' },
  { name: 'files', args: '', description: 'Dosya gezginini aç.' },
  { name: 'tasks', args: '', description: 'Görev yöneticisini aç.' },
  { name: 'keys', args: '', description: 'Klavye kısayollarını göster.' },
  { name: 'open', args: 'uygulama', description: 'Bir pencere aç. Örnek: /open etkinlikler' },
  {
    name: 'atolye',
    args: '[web|veri|guvenlik|oyun]',
    description: '32 soruluk kod atölyesine geç.',
  },
  { name: 'etkinlikler', args: '', description: 'Yayımlanmış etkinlikleri terminalde gör.' },
  { name: 'ekip', args: '', description: 'Yayımlanmış ekip profillerini listele.' },
  { name: 'run', args: '', description: 'BMK Run penceresini aç.' },
  { name: 'kartlar', args: '', description: 'Üyelik kartı koleksiyonunu aç.' },
  { name: 'notlar', args: '', description: 'Bu tarayıcıdaki not defterini aç.' },
  {
    name: 'tema',
    args: '[cayir|gece|gunbatimi|kuzey|plan|kum]',
    description: 'Masaüstünün ışığını değiştir.',
  },
  {
    name: 'duzen',
    args: '[yan-yana|topla|sifirla]',
    description: 'Pencereleri düzenle veya yerleşimi sıfırla.',
  },
  {
    name: 'hesap',
    args: 'ifade',
    description: 'Dört işlem, bölümden kalan ve parantez. Örnek: /hesap (24 + 8) * 3',
  },
  { name: 'whoami', args: '', description: 'Bu terminaldeki kimliğini göster.' },
  { name: 'neofetch', args: '', description: 'BMK OS hakkında bilgi al.' },
  { name: 'date', args: '', description: 'İstanbul saatini göster.' },
  { name: 'uptime', args: '', description: 'Bu masaüstünde geçen süre.' },
  { name: 'echo', args: 'metin', description: 'Yazdığın metni ekrana yazdır.' },
  { name: 'history', args: '', description: 'Bu pencerenin komut geçmişi.' },
  { name: 'clear', args: '', description: 'Terminal ekranını temizle.' },
  {
    name: 'dino',
    args: '[basla|ipucu|bastan|kapat]',
    description: 'Dino ile terminali öğren. Komut ve dosya hatalarında yolunu bul.',
  },
  { name: 'kahve', args: '', description: 'Küçük bir mola.' },
  { name: 'masaustu', args: '', description: 'Bütün pencereleri küçült.' },
] as const;
const aliases: Record<string, AppId> = {
  terminal: 'console',
  console: 'console',
  atolye: 'terminal',
  workshop: 'terminal',
  etkinlikler: 'events',
  events: 'events',
  ekip: 'team',
  team: 'team',
  run: 'game',
  oyun: 'game',
  game: 'game',
  kartlar: 'cards',
  cards: 'cards',
  yardim: 'faq',
  faq: 'faq',
  notlar: 'notes',
  notes: 'notes',
  gorunum: 'settings',
  ayarlar: 'settings',
  settings: 'settings',
  dosyalar: 'files',
  files: 'files',
  gorevler: 'tasks',
  tasks: 'tasks',
};
const normalize = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ü', 'u')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c');
export type ShellEffect =
  | { type: 'open' | 'close'; app: AppId }
  | { type: 'cd'; path: string }
  | { type: 'quiz'; field: number }
  | { type: 'theme'; theme: DesktopTheme }
  | { type: 'layout'; mode: 'tile' | 'cascade' | 'reset' }
  | { type: 'desktop' }
  | { type: 'clear' };
export type ShellResult = {
  lines: string[];
  kind?: 'plain' | 'help' | 'info' | 'dino' | 'error' | 'coffee';
  effect?: ShellEffect;
  dino?: DinoCommand;
};
export type ShellContext = {
  content: DesktopContent;
  history: string[];
  uptime: number;
  theme: DesktopTheme;
  windows: AppId[];
  now: Date;
  cwd?: string;
  files?: VirtualFiles;
  minimized?: AppId[];
  focus?: AppId | null;
};
export function calculate(source: string): number {
  const clean = source.replace(/\s/g, '');
  if (!clean || clean.length > 100 || !/^[\d.+*/%()\-]+$/.test(clean))
    throw Error('Yalnızca sayılar, + − × / %, nokta ve parantez kullan.');
  const tokens = clean.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/%\-]/g) || [];
  if (tokens.join('') !== clean || tokens.length > 60) throw Error('İfadeyi biraz kısalt.');
  let i = 0,
    depth = 0;
  function atom(): number {
    if (++depth > 16) throw Error('Çok fazla iç içe işlem.');
    let value: number;
    const t = tokens[i++];
    if (t === '+' || t === '-') {
      value = (t === '-' ? -1 : 1) * atom();
    } else if (t === '(') {
      value = expression();
      if (tokens[i++] !== ')') throw Error('Parantezleri kontrol et.');
    } else {
      if (!t || !/^(\d|\.)/.test(t)) throw Error('Geçerli bir sayı bekleniyor.');
      value = Number(t);
    }
    depth--;
    return value;
  }
  function product(): number {
    let value = atom();
    while (['*', '/', '%'].includes(tokens[i])) {
      const op = tokens[i++],
        rhs = atom();
      if ((op === '/' || op === '%') && rhs === 0) throw Error('Sıfıra bölme yapılamaz.');
      value = op === '*' ? value * rhs : op === '/' ? value / rhs : value % rhs;
    }
    return value;
  }
  function expression(): number {
    let value = product();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++],
        rhs = product();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }
  const value = expression();
  if (i !== tokens.length || !Number.isFinite(value))
    throw Error('İşlem tamamlanamadı. İfadeyi kontrol et.');
  return Number(value.toPrecision(12));
}
export function completeCommand(input: string, files?: VirtualFiles, cwd = '/') {
  if (/^\/?dino\s/i.test(input)) return completeDino(input);
  if (!/\s/.test(input)) {
    const q = normalize(input.replace(/^\//, ''));
    return COMMANDS.filter((c) => c.name.startsWith(q)).map((c) => '/' + c.name);
  }
  const match = /^(\/?[\w]+)\s+([^\s]*)$/.exec(input);
  if (!match) return [];
  const command = match[1].replace(/^\//, ''),
    arg = match[2];
  if (command === 'open' || command === 'close')
    return Object.keys(aliases)
      .filter((a) => a.startsWith(normalize(arg)))
      .slice(0, 12)
      .map((a) => match[1] + ' ' + a);
  if (command === 'tema')
    return ['cayir', 'gece', 'gunbatimi', 'kuzey', 'plan', 'kum']
      .filter((a) => a.startsWith(normalize(arg)))
      .map((a) => match[1] + ' ' + a);
  if (!files || !['cd', 'ls', 'cat', 'tree', 'wc'].includes(command)) return [];
  const slash = arg.lastIndexOf('/'),
    base = slash < 0 ? '' : arg.slice(0, slash + 1),
    prefix = slash < 0 ? arg : arg.slice(slash + 1),
    dir = resolvePath(base || '.', cwd);
  if (!dir) return [];
  return listFiles(files, dir)
    .filter((f) => f.name.startsWith(prefix) && (command !== 'cd' || f.kind === 'directory'))
    .slice(0, 12)
    .map((f) => match[1] + ' ' + base + f.name + (f.kind === 'directory' ? '/' : ''));
}
export function runCommand(raw: string, c: ShellContext): ShellResult {
  if (raw.length > 256) return { kind: 'error', lines: ['Komut en fazla 256 karakter olabilir.'] };
  const text = raw.trim(),
    match = /^\/?([\wçğıöşü]+)(?:\s+([\s\S]*))?$/i.exec(text);
  if (!match) return { kind: 'error', lines: ['Komut okunamadı. /help ile başlayabilirsin.'] };
  const name = normalize(match[1]),
    arg = (match[2] || '').trim(),
    key = normalize(arg);
  if (name === 'help' && key.replace(/^\//, '') === 'dino') return { lines: DINO_HELP };
  if (name === 'help') {
    const cmd = arg ? COMMANDS.find((x) => x.name === key.replace(/^\//, '')) : null;
    return arg
      ? cmd
        ? { lines: ['/' + cmd.name + ' ' + cmd.args, cmd.description] }
        : { kind: 'error', lines: ['Bu komut yok. /help bütün komutları gösterir.'] }
      : { kind: 'help', lines: ['BMK SHELL / KOMUT REHBERİ'] };
  }
  const files = c.files ?? createFileSystem(c.content),
    cwd = c.cwd || '/',
    path = resolvePath(arg || '.', cwd),
    file = path ? findFile(files, path) : undefined;
  const error = (message: string): ShellResult => ({ kind: 'error', lines: [message] });
  if (name === 'pwd') return { lines: [cwd] };
  if (name === 'cd') {
    const dest = arg ? file : findFile(files, '/');
    return dest?.kind === 'directory'
      ? { lines: [], effect: { type: 'cd', path: dest.path } }
      : error('Klasör bulunamadı: ' + (arg || '/'));
  }
  if (name === 'ls') {
    if (!file) return error('Yol bulunamadı: ' + arg);
    if (file.kind !== 'directory') return { lines: [file.name] };
    const items = listFiles(files, file.path);
    return {
      lines: items.length
        ? items.map(
            (f) =>
              (f.kind === 'directory' ? 'd ' : f.kind === 'application' ? 'x ' : '· ') +
              f.name +
              (f.kind === 'directory' ? '/' : '') +
              (f.kind === 'text' ? '  ' + fileSize(f) + ' B' : ''),
          )
        : ['Bu klasör henüz boş.'],
    };
  }
  if (name === 'cat' || name === 'wc') {
    if (!arg || !file) return error('Dosya bulunamadı. Örnek: cat /basla.txt');
    if (file.kind !== 'text') return error('Bu bir metin dosyası değil.');
    const value = file.text || '';
    return {
      lines:
        name === 'cat'
          ? value.split('\n')
          : [
              `${value.split('\n').length} satır · ${value.trim().split(/\s+/).filter(Boolean).length} kelime · ${fileSize(file)} bayt`,
              file.path,
            ],
    };
  }
  if (name === 'tree') {
    if (file?.kind !== 'directory') return error('Bir klasör yolu yaz.');
    return { lines: [file.path, ...treeLines(files, file.path)] };
  }
  if (name === 'find') {
    if (!arg) return error('Aranacak dosya adını yaz.');
    const found = files
      .filter((f) => f.name.toLocaleLowerCase('tr-TR').includes(arg.toLocaleLowerCase('tr-TR')))
      .slice(0, 100);
    return { lines: found.length ? found.map((f) => f.path) : ['Eşleşen dosya yok.'] };
  }
  if (name === 'grep') {
    const parts = arg.match(/^(?:"([^"\n]*)"|'([^'\n]*)'|(\S+))\s+(\S+)$/);
    if (!parts) return error('Kullanım: grep "metin" /dosya.txt');
    const needle = parts[1] ?? parts[2] ?? parts[3],
      p = resolvePath(parts[4], cwd),
      f = p ? findFile(files, p) : undefined;
    if (!needle || f?.kind !== 'text')
      return error('Aranacak metni ve bir metin dosyasını belirt.');
    const found = (f.text || '')
      .split('\n')
      .flatMap((line, i) =>
        line.toLocaleLowerCase('tr-TR').includes(needle.toLocaleLowerCase('tr-TR'))
          ? [`${i + 1}: ${line}`]
          : [],
      );
    return { lines: found.length ? found.slice(0, 100) : ['Eşleşen satır yok.'] };
  }
  if (name === 'ps')
    return {
      lines: [
        'DURUM       UYGULAMA',
        ...c.windows.map(
          (app) =>
            (c.minimized?.includes(app)
              ? 'küçültüldü'
              : c.focus === app
                ? 'etkin'
                : 'arka plan'
            ).padEnd(12) +
            app +
            ' · ' +
            appLabels[app],
        ),
        'Yalnızca bu BMK OS oturumundaki pencereler.',
      ],
    };
  if (name === 'close') {
    const app = Object.hasOwn(aliases, key) ? aliases[key] : undefined;
    return app && c.windows.includes(app)
      ? { lines: [appLabels[app] + ' kapatıldı.'], effect: { type: 'close', app } }
      : error('Açık uygulama bulunamadı. ps ile bakabilirsin.');
  }
  if (name === 'files' || name === 'tasks')
    return { lines: [appLabels[name] + ' açılıyor.'], effect: { type: 'open', app: name } };
  if (name === 'keys') return { lines: SHORTCUTS.split('\n') };
  if (name === 'open') {
    const app = Object.hasOwn(aliases, key) ? aliases[key] : undefined;
    return app
      ? { lines: [appLabels[app] + ' açılıyor.'], effect: { type: 'open', app } }
      : { kind: 'error', lines: ['Uygulama bulunamadı. Uygulamalar için: ls /uygulamalar'] };
  }
  if (name === 'atolye') {
    const field = ['web', 'veri', 'guvenlik', 'oyun'].indexOf(key || 'web');
    return field < 0
      ? { kind: 'error', lines: ['Alanlar: web, veri, guvenlik, oyun.'] }
      : {
          lines: ['Kod atölyesi açılıyor. Soruyu tamamlamak sana kalmış.'],
          effect: { type: 'quiz', field },
        };
  }
  if (name === 'run' || name === 'kartlar' || name === 'notlar')
    return {
      lines: [appLabels[aliases[name]] + ' açılıyor.'],
      effect: { type: 'open', app: aliases[name] },
    };
  if (name === 'etkinlikler')
    return {
      lines: c.content.events.length
        ? c.content.events
            .slice(0, 15)
            .map((e) => `${e.title}\n  ${e.date.slice(0, 10)} · ${e.location}`)
            .concat(['Klasörü açmak için: /open etkinlikler'])
        : ['Henüz yayımlanmış etkinlik yok. Yeni etkinlikler burada da görünecek.'],
    };
  if (name === 'ekip')
    return {
      lines: c.content.members.length
        ? c.content.members
            .slice(0, 30)
            .map((m) => `${m.name} — ${m.role}`)
            .concat(['/open ekip ile profilleri aç.'])
        : ['Henüz yayımlanmış ekip profili yok.'],
    };
  if (name === 'tema') {
    const theme =
      key === 'cayir'
        ? 'meadow'
        : key === 'gece'
          ? 'night'
          : key === 'gunbatimi'
            ? 'amber'
            : key === 'kuzey'
              ? 'aurora'
              : key === 'plan'
                ? 'blueprint'
                : key === 'kum'
                  ? 'dune'
                  : null;
    return !arg
      ? {
          lines: [
            'Şu an: ' + themeLabels[c.theme],
            '/tema cayir · gece · gunbatimi · kuzey · plan · kum',
          ],
        }
      : theme
        ? { lines: [themeLabels[theme] + ' teması uygulandı.'], effect: { type: 'theme', theme } }
        : { kind: 'error', lines: ['Temalar: cayir, gece, gunbatimi, kuzey, plan, kum.'] };
  }
  if (name === 'duzen') {
    const mode =
      key === 'yan-yana'
        ? 'tile'
        : key === 'topla'
          ? 'cascade'
          : key === 'sifirla'
            ? 'reset'
            : null;
    return mode
      ? {
          lines: [
            mode === 'reset'
              ? 'Simge ve pencere yerleşimi sıfırlandı.'
              : 'Açık pencereler düzenlendi.',
          ],
          effect: { type: 'layout', mode },
        }
      : {
          lines: [
            '/duzen yan-yana  Pencereleri yan yana diz.',
            '/duzen topla     Pencereleri üst üste topla.',
            '/duzen sifirla   Başlangıç yerleşimine dön.',
          ],
        };
  }
  if (name === 'hesap') {
    try {
      return { lines: [`${arg} = ${calculate(arg)}`] };
    } catch (e) {
      return { kind: 'error', lines: [e instanceof Error ? e.message : 'İfade hesaplanamadı.'] };
    }
  }
  if (name === 'whoami')
    return {
      lines: [
        'konuk@bmk',
        'SCÜ Bilgisayar Mühendisliği Kulübü masaüstü.',
        'Bu terminal yalnızca masaüstü uygulamalarını yönetir.',
      ],
    };
  if (name === 'neofetch')
    return {
      kind: 'info',
      lines: [
        'BMK OS  /  Desktop edition 4.0',
        'Shell      bmk-shell',
        'Oturum     Konuk',
        'Görünüm    ' + themeLabels[c.theme],
        'Pencere    ' + c.windows.length + ' açık',
        'Atölye     4 alan · 32 soru',
        'Çalışma    Tarayıcı içi masaüstü',
      ],
    };
  if (name === 'date')
    return {
      lines: [
        c.now.toLocaleString('tr-TR', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'Europe/Istanbul',
        }),
      ],
    };
  if (name === 'uptime')
    return {
      lines: [
        `${Math.max(0, Math.floor(c.uptime / 60))} dakika ${Math.max(0, Math.floor(c.uptime % 60))} saniyedir buradasın.`,
      ],
    };
  if (name === 'echo') return { lines: [arg || '…'] };
  if (name === 'history')
    return {
      lines: c.history.length
        ? c.history.slice(-40).map((h, i) => String(i + 1).padStart(2, '0') + '  ' + h)
        : ['Henüz bir komut yazmadın.'],
    };
  if (name === 'clear') return { lines: [], effect: { type: 'clear' } };
  if (name === 'dino') {
    const dino = parseDinoCommand(arg);
    return dino
      ? { kind: 'dino', dino, lines: dinoCommandLines(dino) }
      : { kind: 'error', lines: ['Dino komut rehberin. /help dino ile neler yapabildiğine bak.'] };
  }
  if (name === 'kahve')
    return {
      kind: 'coffee',
      lines: [
        '   ( (',
        '    ) )',
        '  .------.',
        '  | BMK  |]',
        "  `------'",
        'Kahve hazır. Sıradaki satır sende.',
      ],
    };
  if (name === 'masaustu')
    return { lines: ['Pencereler küçültüldü.'], effect: { type: 'desktop' } };
  return {
    kind: 'error',
    lines: [`“${match[1]}” diye bir BMK komutu yok.`, `/help yaz veya Tab ile bir komutu tamamla.`],
  };
}
