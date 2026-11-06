'use client';
import { createContext, useContext } from 'react';
import type { HomeSection } from './model';
export const SectionCopy = createContext<HomeSection | null>(null);
export const useSectionCopy = () => useContext(SectionCopy);
export function SectionTitle({ text }: { text: string }) {
  const lines = text.split('\n');
  if (lines.length > 1)
    return (
      <>
        {lines.slice(0, -1).map((s, i) => (
          <span className="home-title-line" key={i}>
            {s}
            <br />
          </span>
        ))}
        <em>{lines.at(-1)}</em>
      </>
    );
  const words = text.split(' ');
  return (
    <>
      {words.slice(0, -1).join(' ')} {words.length > 1 ? <em>{words.at(-1)}</em> : text}
    </>
  );
}
