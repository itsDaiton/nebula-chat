import { useLocation, useRouter } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Router, createPath, type Navigator, type To } from 'react-router';
import type { LegacyRouterProps } from '@/routing/types/types';

const toHref = (to: To) => (typeof to === 'string' ? to : createPath(to));

/** react-router reading TanStack's location and navigating through its history, so both see one URL. */
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
        key: state.__TSR_key,
      }}
      navigator={navigator}
    >
      {children}
    </Router>
  );
};
