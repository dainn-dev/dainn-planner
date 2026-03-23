export function getStoredUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function isAdminUser(user) {
  return user?.role === 'Admin';
}

export function isStoredAdmin() {
  return isAdminUser(getStoredUser());
}

/** CV hosting platform staff: JWT role `platform_admin` or legacy `Admin` (API still requires `platform_admin` where enforced). */
export function isCvPlatformStaffUser(user) {
  return user?.role === 'platform_admin' || user?.role === 'Admin';
}

export function isStoredCvPlatformStaff() {
  return isCvPlatformStaffUser(getStoredUser());
}

/** Where to send the user right after planner login (token already stored). */
export function getPostLoginPath(user) {
  if (!user) return '/daily';
  if (user.role === 'Admin') return '/admin/dashboard';
  if (user.role === 'platform_admin') return '/admin/cv-sites';
  return '/daily';
}

