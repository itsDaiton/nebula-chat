import { useLocation, useRouter } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Router, createPath, type Navigator, type To } from 'react-router';
import type { LegacyRouterProps } from '@/routing/types/types';

const toHref = (to: To) => (typeof to === 'string' ? to : createPath(to));

/**
 * react-router on TanStack Router's history, so the two never disagree about the URL: the legacy
 * tree and the components still on react-router hooks read TanStack's location, and their
 * navigations go through TanStack's history, which TanStack then matches. Goes once the last
 * route has moved (NEB-528).
 */
export const LegacyRouter = ({ children }: LegacyRouterProps) => {
  const { history } = useRouter();
  const { pathname, searchStr, hash, state } = useLocation();

  const navigator = useMemo<Navigator>(
    () => ({
      createHref: (to) => history.createHref(toHref(to)),
      go: (delta) => history.go(delta),
      push: (to, nextState) => history.push(toHref(to), nextState),
      replace: (to, nextState) => history.replace(toHref(to), nextState),
    }),
    [history],
  );

  return (
    <Router
      location={{
        pathname,
        search: searchStr,
        hash: hash ? `#${hash}` : '',
        state,
        key: state.key,
      }}
      navigator={navigator}
    >
      {children}
    </Router>
  );
};
