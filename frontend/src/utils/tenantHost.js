/**
 * Tenant slug from browser host — align with backend CvTenantResolver / cv-next lib/tenant.
 */

const DEFAULT_ROOT = 'dainn.online';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'admin',
  'api',
  'app',
  'dashboard',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
]);

export function getCvRootDomain() {
  return (process.env.REACT_APP_CV_ROOT_DOMAIN || DEFAULT_ROOT)
    .toLowerCase()
    .replace(/^\.+/, '');
}

/**
 * @param {string | null | undefined} hostHeader e.g. window.location.hostname (no port)
 * @returns {string | null}
 */
export function parseTenantSlugFromHost(hostHeader) {
  if (!hostHeader) return null;
  const host = String(hostHeader).split(':')[0]?.toLowerCase().trim();
  if (!host) return null;

  const root = getCvRootDomain();

  if (host === root || host === `www.${root}`) return null;

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (!sub || sub.includes('.')) return null;
    if (RESERVED_SUBDOMAINS.has(sub)) return null;
    return sub;
  }

  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    if (!sub || sub.includes('.')) return null;
    if (RESERVED_SUBDOMAINS.has(sub)) return null;
    return sub;
  }

  if (host === 'localhost' || host.startsWith('127.0.0.1')) return null;

  return null;
}
