import { describe, it, expect } from 'vitest';
import { slotHasEnded } from './slots';

const at = (h, m) => new Date(2026, 9, 29, h, m);

describe('slotHasEnded', () => {
  it('is false before and during the window, true from its end time', () => {
    const slot = { endTime: '13:15:00' };
    expect(slotHasEnded(slot, at(12, 0))).toBe(false);
    expect(slotHasEnded(slot, at(13, 14))).toBe(false);
    expect(slotHasEnded(slot, at(13, 15))).toBe(true);
  });

  it('never hides a slot whose end time is unknown', () => {
    expect(slotHasEnded({}, at(23, 59))).toBe(false);
    expect(slotHasEnded({ endTime: 'later' }, at(23, 59))).toBe(false);
  });
});
