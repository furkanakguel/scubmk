'use client';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  COMMANDS,
  completeCommand,
  runCommand,
  type ShellContext,
  type ShellEffect,
  type ShellResult,
} from '../lab/shell';
import { DINO } from '../lab/terminal';
import { PixelDino } from './DesktopIcons';
import TerminalDino from './TerminalDino';
import { initialDinoGuide, advanceDinoGuide } from '../lab/dino';
import { createFileSystem } from '../lab/filesystem';
type Props = { context: ShellContext; onEffect: (e: ShellEffect) => void; active: boolean };
type Entry = { id: number; command: string; cwd: string; time: string; result: ShellResult };
function ShellSession({ context, onEffect, active }: Props) {
  const [input, setInput] = useState(''),
    [cwd, setCwd] = useState('/'),
    [entries, setEntries] = useState<Entry[]>([]),
    [history, setHistory] = useState<string[]>([]),
    [historyIndex, setHistoryIndex] = useState(-1),
    [suggestions, setSuggestions] = useState<string[]>([]);
  const seq = useRef(0),
    draft = useRef(''),
    field = useRef<HTMLInputElement>(null),
    scroll = useRef<HTMLDivElement>(null);
  const [guide, setGuide] = useState(initialDinoGuide);
  const files = useMemo(
    () => context.files ?? createFileSystem(context.content),
    [context.files, context.content],
  );
  function insert(command: string) {
    setInput(command);
    setHistoryIndex(-1);
    setSuggestions([]);
    field.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (active && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [entries, suggestions, active]);
  function submit(command = input) {
    if (!command.trim()) return;
    const now = new Date(),
      result = runCommand(command, {
        ...context,
        cwd,
        history,
        now,
        uptime: context.uptime + (now.getTime() - context.now.getTime()) / 1000,
      });
    setGuide((g) =>
      advanceDinoGuide(
        g,
        command,
        result,
        cwd,
        files,
        COMMANDS.map((c) => c.name),
      ),
    );
    setHistory((h) => [...h, command].slice(-60));
    setHistoryIndex(-1);
    setInput('');
    setSuggestions([]);
    if (result.effect?.type === 'clear') setEntries([]);
    else
      setEntries((v) =>
        [
          ...v,
          {
            id: ++seq.current,
            command,
            cwd,
            time: now.toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Istanbul',
            }),
            result,
          },
        ].slice(-60),
      );
    if (result.effect?.type === 'cd') setCwd(result.effect.path);
    else if (result.effect) onEffect(result.effect);
    if (!result.effect || ['clear', 'theme', 'cd'].includes(result.effect.type))
      field.current?.focus({ preventScroll: true });
  }
  return (
    <div className="os-shell-session">
      <div className="os-shell-scroll" ref={scroll}>
        <div className="os-shell-welcome">
          <pre aria-hidden="true">{DINO}</pre>
          <div>
            <span>BMK TERMINAL / 3.0</span>
            <h3>Bir satırla başlar.</h3>
            <p>
              Bir klasöre gir. Bir dosyayı aç. Bir şey dene.
              <br />
              <code>help</code> komutları, <code>Tab</code> tamamlamaları gösterir.
            </p>
            <small>konuk@bmk · {context.files?.length ?? 0} dosya ve klasör</small>
          </div>
        </div>
        <div className="os-shell-quick" aria-label="Hızlı terminal komutları">
          {['help', 'tree /', 'cat /basla.txt', 'dino'].map((c) => (
            <button key={c} onClick={() => submit(c)}>
              {c}
              <span>↵</span>
            </button>
          ))}
        </div>
        <div className="os-shell-output" aria-label="Terminal çıktısı">
          {entries.map((entry) => (
            <div
              className={'os-shell-entry output-' + (entry.result.kind || 'plain')}
              key={entry.id}
            >
              <div className="os-shell-command">
                <span>konuk@bmk</span>
                <b>{entry.cwd} $</b>
                <code>{entry.command}</code>
                <time>{entry.time}</time>
              </div>
              {entry.result.kind === 'help' ? (
                <div className="os-shell-help">
                  <span>{entry.result.lines[0]}</span>
                  <div>
                    {COMMANDS.map((c) => (
                      <button key={c.name} onClick={() => insert(c.name + (c.args ? ' ' : ''))}>
                        <code>
                          {c.name}
                          <small>{c.args}</small>
                        </code>
                        <span>{c.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : entry.result.kind === 'info' ? (
                <div className="os-shell-info">
                  <PixelDino />
                  <pre>{entry.result.lines.join('\n')}</pre>
                </div>
              ) : (
                <pre className="os-shell-lines">{entry.result.lines.join('\n')}</pre>
              )}
              {entry.result.kind === 'error' && (
                <span className="os-shell-exit">exit 1 · Komut tamamlanamadı</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="os-shell-dock">
        <TerminalDino
          guide={guide}
          active={active}
          typing={!!input.trim()}
          onInsert={insert}
          onStart={() => submit('/dino')}
          onHide={() => setGuide((g) => ({ ...g, enabled: false }))}
        />
        <form
          className="os-shell-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label>
            <span>konuk@bmk</span>
            <b>{cwd} $</b>
            <span className="sr-only">BMK terminal komutu</span>
            <input
              ref={field}
              aria-label="BMK terminal komutu"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              placeholder="Bir komut yaz…"
              value={input}
              maxLength={256}
              onChange={(e) => {
                setInput(e.target.value);
                setHistoryIndex(-1);
                setSuggestions([]);
              }}
              onKeyDown={(e) => {
                if (
                  (e.key === 'Escape' && !suggestions.length) ||
                  (e.ctrlKey && e.code === 'Space') ||
                  (e.altKey && e.code === 'Backquote')
                )
                  return;
                e.stopPropagation();
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!history.length) return;
                  if (historyIndex < 0) draft.current = input;
                  const next =
                    e.key === 'ArrowUp'
                      ? Math.min(history.length - 1, historyIndex + 1)
                      : Math.max(-1, historyIndex - 1);
                  setHistoryIndex(next);
                  setInput(next < 0 ? draft.current : history[history.length - 1 - next]);
                } else if (e.key === 'Tab' && input.trim() && !e.shiftKey) {
                  const options = completeCommand(input, context.files, cwd);
                  if (options.length) {
                    e.preventDefault();
                    if (options.length === 1) {
                      setInput(options[0] + (options[0].endsWith('/') ? '' : ' '));
                      setSuggestions([]);
                    } else setSuggestions(options);
                  }
                } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                  e.preventDefault();
                  setEntries([]);
                } else if (e.ctrlKey && ['c', 'u'].includes(e.key.toLowerCase())) {
                  e.preventDefault();
                  setInput('');
                  setSuggestions([]);
                } else if (e.key === 'Escape') setSuggestions([]);
              }}
            />
          </label>
          <button type="submit" aria-label="Komutu çalıştır">
            ↵
          </button>
        </form>
        {!!suggestions.length && (
          <div className="os-shell-suggestions">
            {suggestions.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setInput(c);
                  setSuggestions([]);
                  field.current?.focus({ preventScroll: true });
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="os-shell-status">
        <span>
          {cwd} <b>·</b> UTF-8
        </span>
        <span>
          <kbd>Tab</kbd> tamamla <kbd>↑ ↓</kbd> geçmiş
        </span>
        <span>{input.length}/256</span>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {entries.at(-1)?.result.kind === 'help'
          ? 'Komut rehberi açıldı.'
          : entries.at(-1)?.result.lines.slice(0, 5).join(' ')}
      </span>
    </div>
  );
}
const Session = memo(ShellSession);
function DesktopShell(props: Props) {
  const [tabs, setTabs] = useState([1]),
    [selected, setSelected] = useState(1);
  const sequence = useRef(1);
  return (
    <div className="os-shell os-shell-v3">
      <div className="os-shell-tabbar" role="tablist" aria-label="Terminal oturumları">
        {tabs.map((id) => (
          <div className="os-shell-tab" key={id}>
            <button
              role="tab"
              id={'shell-tab-' + id}
              aria-controls={'shell-session-' + id}
              aria-selected={selected === id}
              onClick={() => setSelected(id)}
            >
              ▸ <span>{id}: bmk-shell</span>
            </button>
            {tabs.length > 1 && (
              <button
                aria-label={'Terminal oturumu ' + id + ' kapat'}
                onClick={() => {
                  setTabs((t) => t.filter((n) => n !== id));
                  if (selected === id) setSelected(tabs.find((n) => n !== id)!);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="os-shell-add"
          aria-label="Yeni terminal oturumu"
          disabled={tabs.length >= 3}
          onClick={() => {
            const id = ++sequence.current;
            setTabs((t) => [...t, id]);
            setSelected(id);
          }}
        >
          +
        </button>
      </div>
      {tabs.map((id) => (
        <div
          id={'shell-session-' + id}
          role="tabpanel"
          aria-labelledby={'shell-tab-' + id}
          className="os-shell-tabpanel"
          hidden={selected !== id}
          key={id}
        >
          <Session {...props} active={props.active && selected === id} />
        </div>
      ))}
    </div>
  );
}
export default memo(DesktopShell);
