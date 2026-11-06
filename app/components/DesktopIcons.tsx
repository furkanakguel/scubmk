import type { AppId } from '../lab/terminal';
export { appLabels } from '../lab/desktop';
export function PixelDino({ broken = false }: { broken?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges">
      <path
        fill="currentColor"
        d="M13 2h9v8h-7v2h4v2h-4v4h-2v4h-3v-2h1v-3H8v5H5v-2h1v-4H4v-2H2V8h2v4h2v2h4v-2h2V4h1z"
      />
      {broken ? (
        <path stroke="var(--dino-eye,#06191c)" strokeWidth="1" d="m16 4 3 3m0-3-3 3" />
      ) : (
        <path fill="var(--dino-eye,#06191c)" d="M16 4h2v2h-2z" />
      )}
    </svg>
  );
}
export function DesktopIcon({ app }: { app: AppId }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={'os-pixel-icon icon-' + app}
      shapeRendering="crispEdges"
    >
      {app === 'console' || app === 'terminal' ? (
        <>
          <path fill="#20262e" d="M3 5h42v34H3z" />
          <path fill="#fafbf4" d="M5 7h38v29H5z" />
          <path fill="#050b13" d="M7 9h34v24H7z" />
          <path fill="#bbbdbd" d="M20 39h8v4h10v3H10v-3h10z" />
          <path fill="#84eb8c" d="m11 14 6 5-6 5v-3l3-2-3-2zm9 9h12v2H20z" />
        </>
      ) : app === 'tasks' ? (
        <>
          <path fill="#273748" d="M3 5h42v33H3z" />
          <path fill="#12251e" d="M6 8h36v26H6z" />
          <path
            fill="#6cdb76"
            d="M9 25h4v6H9zM16 19h4v12h-4zM23 11h4v20h-4zM30 22h4v9h-4zM37 16h3v15h-3z"
          />
          <path fill="#c1c6bd" d="M20 38h8v5h10v3H10v-3h10z" />
        </>
      ) : app === 'settings' ? (
        <>
          <path fill="#798089" d="M20 3h9v7h7v6h8v14h-8v7h-7v8h-9v-8h-7v-7H5V16h8v-6h7z" />
          <path fill="#dce1df" d="M20 14h10v5h5v10h-5v5H20v-5h-5V19h5z" />
          <path fill="#52658e" d="M21 20h8v8h-8z" />
        </>
      ) : app === 'notes' ? (
        <>
          <path fill="#656d6e" d="M9 4h30v41H9z" />
          <path fill="#fffbe1" d="M11 6h26v37H11z" />
          <path fill="#4a7191" d="M11 6h26v7H11z" />
          <path fill="#9eb0a9" d="M15 18h17v2H15zM15 24h17v2H15zM15 30h17v2H15zM15 36h11v2H15z" />
        </>
      ) : app === 'game' ? (
        <>
          <path fill="#293c27" d="M4 10h40v28H4zM8 6h32v4H8zM8 38h32v4H8z" />
          <path fill="#b6c4a0" d="M6 12h36v24H6zM10 8h28v4H10z" />
          <path fill="#456c38" d="M18 16h12v8h-6v2h4v2h-4v5h-3v-3h-5v3h-3v-6h-3v-6h3v3h6z" />
          <path fill="#f8ffc0" d="M22 18h2v2h-2z" />
          <path fill="#e8f295" d="M34 29h4v4h-4z" />
        </>
      ) : app === 'faq' ? (
        <>
          <path fill="#18346a" d="M8 3h27v4h5v38H8z" />
          <path fill="#f5f3dc" d="M10 5h22v9h7v29H10z" />
          <path fill="#b5b7bd" d="M32 5v9h7zM13 39h20v2H13z" />
          <path fill="#2055bf" d="M18 17h11v3h3v7h-6v4h-4v-7h6v-4h-7v3h-4v-3h1zM22 34h4v4h-4z" />
        </>
      ) : app === 'cards' ? (
        <>
          <path fill="#26312e" d="M3 10h42v29H3z" />
          <path fill="#425f46" d="M5 12h38v25H5z" />
          <path fill="#b7a169" d="M7 14h34v2H7zM9 20h10v8H9zM9 32h20v2H9z" />
          <path fill="#e1d19f" d="M11 21h6v2h-6zM11 25h6v2h-6zM32 20h7v2h-7zM32 24h7v2h-7z" />
        </>
      ) : (
        <>
          <path fill="#64521e" d="M3 10h17v4h25v29H3z" />
          <path fill="#ffee77" d="M5 12h14v5h24v23H5z" />
          <path fill="#b38a21" d="M4 22h42l-3 21H1z" />
          <path fill="#ffd954" d="M6 24h37l-2 16H4z" />
          <path fill="#fff7ae" d="M7 24h34v2H7z" />
          {app === 'files' ? (
            <>
              <path fill="#fffdeb" d="M18 23h18v16H18z" />
              <path fill="#7585a4" d="M21 27h12v2H21zM21 32h9v2h-9z" />
            </>
          ) : app === 'events' ? (
            <>
              <path fill="#fffdf0" d="M20 24h15v13H20z" />
              <path fill="#be4e48" d="M20 24h15v4H20z" />
              <path fill="#535a60" d="M23 30h3v3h-3zM29 30h3v3h-3z" />
            </>
          ) : (
            <>
              <path fill="#475d9c" d="M23 25h7v6h-7zM19 33h15v5H19z" />
              <path fill="#d5dcfa" d="M23 25h7v2h-7z" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
