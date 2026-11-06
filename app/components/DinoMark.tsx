import type { DinoReaction } from '../lab/dino';
// The club silhouette, articulated on a 24px grid. The feet stay on the baseline.
export default function DinoMark({
  reaction = 'watch',
  active = false,
}: {
  reaction?: DinoReaction;
  active?: boolean;
}) {
  return (
    <svg
      className="dino-mark"
      data-reaction={reaction}
      data-active={active}
      viewBox="0 0 80 72"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path className="dino-mark-ground" d="M10 62h60v1H10zM18 67h8v1h-8zM54 67h5v1h-5z" />
      <g transform="translate(13 14) scale(2)">
        <g className="dino-mark-body">
          <path
            className="dino-mark-tail"
            fill="currentColor"
            d="M2 8h2v4h2v2h5v-2h2v6H8v-2H4v-2H2z"
          />
          <path fill="currentColor" d="M12 8h4v10h-3v2h-3v-3H8v1H6v-4h4v-2h2z" />
          <path className="dino-mark-shade" d="M7 15h3v2h3v2h-3v-2H8v1H6v-2h1z" />
          <g className="dino-mark-head">
            <path fill="currentColor" d="M13 2h9v8h-7v2h-3V4h1z" />
            <path className="dino-mark-lit" d="M14 2h7v1h-7z" />
            <path className="dino-mark-eye" d="M16 4h2v2h-2z" />
            <path className="dino-mark-lid" d="M16 5h2v1h-2z" />
          </g>
          <path className="dino-mark-arm" fill="currentColor" d="M14 12h5v2h-1v-1h-4z" />
        </g>
        <path fill="currentColor" d="M6 17h2v5H5v-2h1zM11 17h2v4h1v1h-4v-2h1z" />
        <path className="dino-mark-lit" d="M6 21h2v1H6zM12 21h2v1h-2z" />
      </g>
      <g className="dino-mark-notice">
        <path d="M64 18h2v8h-2zM64 29h2v2h-2z" />
      </g>
      <g className="dino-mark-check">
        <path d="m61 23 3 3 7-7 2 2-9 9-5-5z" />
      </g>
    </svg>
  );
}
