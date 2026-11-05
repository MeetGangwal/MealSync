import { describe, it, expect } from 'vitest';
import { toSessionUser, accountLabel } from './session';
import { ROLES } from './constants';

const base = { userId: 7, name: 'Asha', email: 'asha@example.com', token: 't' };

describe('toSessionUser (role comes only from the server)', () => {
  it('maps ROLE_USER to a student', () => {
    const u = toSessionUser({ ...base, role: 'ROLE_USER' });
    expect(u).toMatchObject({ id: 7, role: ROLES.STUDENT, isAdmin: false });
    expect(accountLabel(u)).toBe('Student');
  });

  it('maps ROLE_ADMIN to an administrator', () => {
    const u = toSessionUser({ ...base, role: 'ROLE_ADMIN' });
    expect(u).toMatchObject({ role: ROLES.ADMIN, isAdmin: true });
    expect(accountLabel(u)).toBe('Mess Administrator');
  });

  it('never grants admin for unknown, missing or look-alike role values', () => {
    for (const role of [undefined, null, '', 'admin', 'ADMIN', 'ROLE_ADMIN ', 'role_admin', 'ROLE_SUPERUSER']) {
      expect(toSessionUser({ ...base, role }).isAdmin).toBe(false);
    }
  });

  it('ignores any client-side hints such as a selected role', () => {
    const u = toSessionUser({ ...base, role: 'ROLE_USER', selectedRole: 'admin', isAdmin: true });
    expect(u.isAdmin).toBe(false);
    expect(u.role).toBe(ROLES.STUDENT);
  });

  it('returns null for responses without a user id', () => {
    expect(toSessionUser(null)).toBeNull();
    expect(toSessionUser({ role: 'ROLE_ADMIN' })).toBeNull();
  });
});
