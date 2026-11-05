/**
 * True when today's window has already closed ("13:15:00" end time vs the device clock).
 * A convenience only: the server does not check slot times, so this just avoids offering a past slot.
 */
export function slotHasEnded(slot, now = new Date()) {
  const [h, m] = String(slot?.endTime || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}
