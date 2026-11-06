/** A fixed desktop remains visible even when its document-flow section is offscreen. */
export function labIsActive(
  visible: boolean,
  hidden: boolean,
  paused: boolean,
  overlay: boolean,
  desktopOpen: boolean,
  desktopOwner: boolean,
) {
  return (
    (visible || (desktopOwner && desktopOpen)) &&
    !hidden &&
    !paused &&
    !overlay &&
    (!desktopOpen || desktopOwner)
  );
}
