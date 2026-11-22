/**
 * Clickjacking guard for the production host.
 *
 * Static hosting cannot send `frame-ancestors` / `X-Frame-Options`, and browsers
 * ignore `frame-ancestors` in a <meta> CSP, so on vowora.uk the app refuses to run
 * inside a third-party frame. Readdy's editor preview and local dev run on other
 * hosts and are never affected.
 */
export const FRAME_GUARDED_HOSTS = ['vowora.uk', 'www.vowora.uk'];

export function shouldBlockFraming(hostname: string, framed: boolean, sameOriginParent: boolean): boolean {
  return framed && !sameOriginParent && FRAME_GUARDED_HOSTS.includes(hostname);
}

export function applyFrameGuard(win: Window = window): boolean {
  const framed = win.self !== win.top;
  let sameOriginParent = false;
  if (framed) {
    try {
      sameOriginParent = win.top?.location.origin === win.location.origin;
    } catch {
      sameOriginParent = false; // cross-origin parent: reading top.location throws
    }
  }
  if (!shouldBlockFraming(win.location.hostname, framed, sameOriginParent)) return false;
  win.document.documentElement.style.display = 'none';
  try {
    if (win.top) win.top.location.href = win.location.href;
  } catch {
    // sandboxed frames may refuse navigation; the page stays hidden
  }
  return true;
}
