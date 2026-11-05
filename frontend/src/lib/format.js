/** Indian-rupee formatting used by every financial figure (the amounts themselves come from the server). */
export function formatINR(value) {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Date + time in the viewer's locale; `—` when missing. */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatPercent(fraction, digits = 1) {
  if (fraction == null || Number.isNaN(fraction)) return null;
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatBytes(bytes) {
  if (bytes == null) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}
