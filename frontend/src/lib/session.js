import { ROLES } from './constants';

/**
 * Builds the signed-in user from a backend response (/api/auth/login or /api/auth/me).
 *
 * The role comes ONLY from the server. Nothing the user selects or stores in the browser can
 * change it, and the UI role is only used for navigation — every permission is enforced by
 * the backend. Administrators are also customers (they can order food).
 */
export function toSessionUser(apiUser) {
  if (!apiUser || apiUser.userId == null) return null;
  const isAdmin = apiUser.role === 'ROLE_ADMIN';
  return {
    id: apiUser.userId,
    name: apiUser.name || '',
    email: apiUser.email || '',
    role: isAdmin ? ROLES.ADMIN : ROLES.STUDENT,
    isAdmin,
    phone: apiUser.phone || '',
    uid: apiUser.uid || '',
  };
}

/** Human-readable account type for the signed-in user. */
export function accountLabel(user) {
  return user?.isAdmin ? 'Mess Administrator' : 'Student';
}
