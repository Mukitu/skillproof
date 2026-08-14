import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * -----------
 * Forces the window to scroll back to the top whenever the route (pathname)
 * changes. This prevents the React Router default behaviour of preserving
 * the scroll position when navigating between pages, which can leave users
 * "stuck" mid-page when they click a link to a deep page like `/owner`.
 *
 * Place this component inside the <Router> so it has access to location.
 */
export function ScrollToTop(): null {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If the URL has a hash, try to scroll to that element first.
    if (hash) {
      // Wait a tick so the new page has a chance to render before we scroll.
      const id = hash.replace(/^#/, '');
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };
      if (!tryScroll()) {
        const t = window.setTimeout(() => {
          tryScroll();
        }, 60);
        return () => window.clearTimeout(t);
      }
      return;
    }

    // No hash — always jump to the top of the page (across browsers).
    if (typeof window !== 'undefined') {
      // Reset both for cross-browser correctness.
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
