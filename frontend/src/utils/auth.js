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

