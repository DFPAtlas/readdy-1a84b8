import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { describePrivateRoute } from '@/lib/seoRoutes';

const ATTR = 'data-private-seo';

function setMeta(key: string, content: string): void {
  const head = document.head;
  let el = head.querySelector<HTMLMetaElement>(`meta[name="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', key);
    el.setAttribute(ATTR, 'true');
    head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeTag(el: Element | null): void {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

/**
 * Applies the metadata contract for private screens: a unique, meaningful
 * title, a hard `noindex, nofollow` directive, no keywords and no Open Graph
 * preview tags. Social crawlers are also stripped of the marketing tags that
 * a previously visited public page may have left behind.
 *
 * Call this once per private layout (the authenticated app shell and the guest
 * portal) so every nested route inherits it — no per-page wiring required.
 */
export function usePrivateRouteSeo(titleOverride?: string): void {
  const { pathname } = useLocation();
  const title = titleOverride?.trim() || describePrivateRoute(pathname);

  useEffect(() => {
    const head = document.head;
    document.title = `${title} — Vowora`;

    setMeta('robots', 'noindex, nofollow');
    setMeta('description', `${title} inside your private Vowora wedding workspace. Not intended for search engines.`);

    // Private screens must not leak into share previews.
    head.querySelectorAll('meta[name="keywords"]').forEach(removeTag);
    head.querySelectorAll('meta[property^="og:"]').forEach(removeTag);
    head.querySelectorAll('meta[name^="twitter:"]').forEach(removeTag);
    head.querySelectorAll('link[rel="canonical"]').forEach(removeTag);

    return () => {
      head.querySelectorAll(`[${ATTR}]`).forEach(removeTag);
    };
  }, [title]);
}