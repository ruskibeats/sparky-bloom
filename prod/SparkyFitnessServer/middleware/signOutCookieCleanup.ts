import type { ServerResponse } from 'http';

// When Better Auth handles /api/auth/sign-out, its node adapter writes its own
// Set-Cookie headers via res.setHeader, which replaces anything we set earlier.
// This helper wraps res.setHeader so our delete cookies are merged into whatever
// Better Auth writes.
//
// During the Bloom/T1D transition, both old (sparky_*) and new (bloom_*) cookie
// names are cleared on sign-out so that stale cookies from either naming scheme
// cannot survive a session end. Attributes must match those used when the cookie
// was originally set in routes/auth/userProfileRoutes.js /switch-context,
// otherwise some browsers won't honor the delete.

/** Build a Set-Cookie delete string for a given cookie name. */
function buildDeleteCookie(name: string): string {
  return (
    `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict` +
    (process.env.NODE_ENV === 'production' ? '; Secure' : '')
  );
}

/**
 * Cookie names to clear on sign-out.
 * - sparky_active_user_id: legacy context-switching cookie
 * - bloom_active_user_id: new context-switching cookie (transition alias)
 * Both are cleared so that neither old nor new cookies survive sign-out.
 */
const COOKIE_NAMES_TO_CLEAR = ['sparky_active_user_id', 'bloom_active_user_id'];

export function applySignOutCookieCleanup(res: ServerResponse): void {
  const clearCookieStrs = COOKIE_NAMES_TO_CLEAR.map(buildDeleteCookie);

  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (
    name: string,
    value: number | string | readonly string[]
  ): ServerResponse {
    if (typeof name === 'string' && name.toLowerCase() === 'set-cookie') {
      const arr = (Array.isArray(value) ? [...value] : [value]).filter(
        Boolean
      ) as string[];
      for (const clearStr of clearCookieStrs) {
        if (!arr.includes(clearStr)) arr.push(clearStr);
      }
      return originalSetHeader(name, arr);
    }
    return originalSetHeader(name, value);
  } as typeof res.setHeader;

  // Initial write in case the downstream handler never touches Set-Cookie.
  res.setHeader('Set-Cookie', [...clearCookieStrs]);
}
