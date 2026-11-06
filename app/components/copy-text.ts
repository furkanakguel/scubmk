// Keep the HTTP fallback synchronous with the user's tap (important on iOS).
export function copyTextFallback(value: string): boolean {
  const active = document.activeElement as HTMLElement | null;
  const selection = window.getSelection(),
    ranges: Range[] = [];
  if (selection)
    for (let i = 0; i < selection.rangeCount; i++)
      ranges.push(selection.getRangeAt(i).cloneRange());
  const field = document.createElement('textarea');
  field.value = value;
  field.readOnly = true;
  field.setAttribute('aria-label', 'Kopyalanacak bağlantı');
  Object.assign(field.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    fontSize: '16px',
  });
  document.body.appendChild(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    active?.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
}
export async function copyText(value: string): Promise<boolean> {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) return copyTextFallback(value);
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return copyTextFallback(value);
  }
}
