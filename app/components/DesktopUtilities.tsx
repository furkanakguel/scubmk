'use client';
import { useEffect, useRef, useState } from 'react';
export function DesktopNotes() {
  const [text, setText] = useState(''),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState(true),
    [pending, setPending] = useState(false);
  const value = useRef(''),
    dirty = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function save() {
    if (timer.current) clearTimeout(timer.current);
    if (!dirty.current) return;
    try {
      localStorage.setItem('bmk-os-notes-v1', value.current);
      dirty.current = false;
      setSaved(true);
    } catch {
      setSaved(false);
    }
    setPending(false);
  }
  useEffect(() => {
    try {
      value.current = (localStorage.getItem('bmk-os-notes-v1') || '').slice(0, 5000);
      setText(value.current);
    } catch {
      setSaved(false);
    }
    setReady(true);
    const flush = () => {
      if (dirty.current)
        try {
          localStorage.setItem('bmk-os-notes-v1', value.current);
          dirty.current = false;
        } catch {}
    };
    addEventListener('pagehide', flush);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
      removeEventListener('pagehide', flush);
    };
  }, []);
  return (
    <div className="os-notepad">
      <div className="os-notepad-toolbar">
        <span>notlar.txt{pending ? ' *' : ''}</span>
        <span>
          {pending
            ? 'Kaydediliyor…'
            : saved
              ? 'Bu tarayıcıya kaydedildi'
              : 'Kaydetme kullanılamıyor'}
        </span>
      </div>
      <label className="sr-only" htmlFor="os-note-text">
        Masaüstü notların
      </label>
      <textarea
        id="os-note-text"
        maxLength={5000}
        value={text}
        disabled={!ready}
        onBlur={save}
        onChange={(e) => {
          value.current = e.target.value;
          setText(value.current);
          dirty.current = true;
          setPending(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(save, 300);
        }}
        placeholder={
          'Aklına geleni buraya bırak.\n\nBir proje fikri, bir etkinlik notu, yarım kalan bir satır…'
        }
        spellCheck={false}
      />
      <div className="os-notepad-footer">
        <span>Yalnızca bu cihazın tarayıcısında. Sunucuya gönderilmez.</span>
        <span>{text.length}/5000</span>
      </div>
    </div>
  );
}
