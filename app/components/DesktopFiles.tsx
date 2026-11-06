'use client';
import { memo, useMemo, useState } from 'react';
import {
  fileSize,
  findFile,
  listFiles,
  parentPath,
  resolvePath,
  type VirtualFile,
  type VirtualFiles,
} from '../lab/filesystem';
import type { AppId } from '../lab/desktop';
import { DesktopIcon } from './DesktopIcons';
function FileGlyph({ file }: { file: VirtualFile }) {
  return file.kind === 'text' ? (
    <span className="os-file-paper" aria-hidden="true">
      ≡
    </span>
  ) : (
    <DesktopIcon app={file.app ?? 'files'} />
  );
}
function DesktopFiles({ files, onOpen }: { files: VirtualFiles; onOpen: (app: AppId) => void }) {
  const [history, setHistory] = useState(['/']),
    [index, setIndex] = useState(0),
    [address, setAddress] = useState('/'),
    [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [view, setView] = useState<'list' | 'grid'>('list');
  const path = history[index],
    node = findFile(files, path)!,
    directory = node.kind === 'directory' ? path : parentPath(path);
  const rows = useMemo(
    () =>
      listFiles(files, directory).filter((f) =>
        (f.name + ' ' + (f.text?.split('\n')[0] || ''))
          .toLocaleLowerCase('tr-TR')
          .includes(query.toLocaleLowerCase('tr-TR')),
      ),
    [files, directory, query],
  );
  function go(value: string) {
    const resolved = resolvePath(value, directory),
      file = resolved ? findFile(files, resolved) : undefined;
    if (!file) {
      setError('Bu adreste bir dosya veya klasör yok.');
      return;
    }
    if (file.app) {
      onOpen(file.app);
      return;
    }
    setError('');
    setQuery('');
    setAddress(file.path);
    if (file.path === path) return;
    setHistory((h) => [...h.slice(0, index + 1), file.path].slice(-40));
    setIndex(Math.min(index + 1, 39));
  }
  function step(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= history.length) return;
    setIndex(next);
    setAddress(history[next]);
    setQuery('');
    setError('');
  }
  return (
    <div className="os-files">
      <div className="os-file-menu">
        <button onClick={() => go('/')}>Ana klasör</button>
        <button onClick={() => onOpen('console')}>Terminali aç</button>
        <div role="group" aria-label="Dosya görünümü">
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            ☷ Liste
          </button>
          <button aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
            ▦ Simgeler
          </button>
        </div>
      </div>
      <div className="os-files-toolbar">
        <button
          className="os-button"
          aria-label="Önceki klasör"
          disabled={!index}
          onClick={() => step(-1)}
        >
          ←
        </button>
        <button
          className="os-button"
          aria-label="Sonraki klasör"
          disabled={index >= history.length - 1}
          onClick={() => step(1)}
        >
          →
        </button>
        <button
          className="os-button"
          aria-label="Üst klasör"
          disabled={path === '/'}
          onClick={() => go(parentPath(path))}
        >
          ↑
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(address);
          }}
        >
          <label>
            <span>Adres</span>
            <input
              aria-label="Dosya yolu"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={256}
              spellCheck={false}
            />
          </label>
          <button className="os-button" aria-label="Adresi aç">
            ↵
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="os-file-error">
          {error}
        </p>
      )}
      <div className="os-files-layout">
        <nav className="os-files-sidebar" aria-label="Dosya gezgini klasörleri">
          <strong>BMK Disk</strong>
          {files
            .filter((f) => f.kind === 'directory')
            .map((f) => (
              <button
                key={f.path}
                aria-current={directory === f.path ? 'location' : undefined}
                onClick={() => go(f.path)}
              >
                <DesktopIcon app="files" />
                <span>{f.path === '/' ? 'Bilgisayarım' : f.name}</span>
              </button>
            ))}
          <div className="os-disk-info">
            <i />
            <span>
              Yayımlanmış içerikler
              <small>{files.filter((f) => f.kind === 'text').length} metin dosyası</small>
            </span>
          </div>
        </nav>
        <div className="os-files-main" key={path}>
          {node.kind === 'text' ? (
            <article className="os-file-reader">
              <header>
                <FileGlyph file={node} />
                <div>
                  <h3>{node.name}</h3>
                  <span>Metin belgesi · UTF-8 · {fileSize(node)} bayt</span>
                </div>
              </header>
              <pre>{node.text}</pre>
            </article>
          ) : (
            <>
              <div className="os-files-heading">
                <div>
                  <h3>{path === '/' ? 'Bilgisayarım' : node.name}</h3>
                  <p>
                    {path === '/'
                      ? 'Kulübün dosyaları, tek bir yerde.'
                      : path === '/etkinlikler'
                        ? 'Buluşmalar ve atölyeler.'
                        : 'Bir dosya seçerek aç.'}
                  </p>
                </div>
                <label className="os-file-search">
                  <span className="sr-only">Bu klasörde ara</span>
                  <input
                    aria-label="Bu klasörde ara"
                    placeholder="Klasörde ara…"
                    value={query}
                    maxLength={80}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className={'os-files-entries view-' + view}>
                {view === 'list' && (
                  <div className="os-files-columns" aria-hidden="true">
                    <span>Ad</span>
                    <span>Tür</span>
                    <span>Boyut</span>
                  </div>
                )}
                {rows.map((file, i) => (
                  <button
                    className="os-file-entry"
                    style={{ '--item': Math.min(i, 8) } as React.CSSProperties}
                    key={file.path}
                    onClick={() => go(file.path)}
                  >
                    <span>
                      <FileGlyph file={file} />
                      <span>
                        {file.name}
                        <small>
                          {file.kind === 'text'
                            ? file.text?.split('\n')[0]
                            : file.app
                              ? file.text
                              : ''}
                        </small>
                      </span>
                    </span>
                    <span>
                      {file.kind === 'directory'
                        ? 'Klasör'
                        : file.kind === 'text'
                          ? 'Metin belgesi'
                          : 'Uygulama'}
                    </span>
                    <span>{file.kind === 'text' ? fileSize(file) + ' B' : '—'}</span>
                  </button>
                ))}
              </div>
              {!rows.length && (
                <div className="os-empty">
                  <DesktopIcon app="files" />
                  <p>{query ? 'Bu aramaya uygun dosya yok.' : 'Henüz yayımlanmış içerik yok.'}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <footer className="os-files-status">
        <span>{node.kind === 'text' ? node.name : rows.length + ' öğe'}</span>
        <span>BMK Disk · Salt okunur</span>
      </footer>
    </div>
  );
}
export default memo(DesktopFiles);
