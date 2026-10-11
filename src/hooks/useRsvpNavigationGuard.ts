import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, type NavigateOptions, type To } from 'react-router-dom';

// Readdy may supply a declarative router, which cannot run useBlocker.
// Guard RSVP buttons and internal links without depending on a data router.
export function useRsvpNavigationGuard(dirty: boolean) {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<{ to: To; options?: NavigateOptions } | null>(null);
  const navigate = useCallback((to: To, options?: NavigateOptions) => {
    if (dirty) setPending({ to, options });
    else void routerNavigate(to, options);
  }, [dirty, routerNavigate]);

  useEffect(() => {
    if (!dirty) return;
    const interceptLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname === location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPending({ to: target.pathname + target.search + target.hash });
    };
    document.addEventListener('click', interceptLink, true);
    return () => document.removeEventListener('click', interceptLink, true);
  }, [dirty, location.pathname]);

  return {
    navigate,
    navigateAfterSave: routerNavigate,
    blocker: {
      state: pending ? 'blocked' : 'unblocked',
      reset: () => setPending(null),
      proceed: () => {
        if (!pending) return;
        setPending(null);
        void routerNavigate(pending.to, pending.options);
      },
    },
  };
}
