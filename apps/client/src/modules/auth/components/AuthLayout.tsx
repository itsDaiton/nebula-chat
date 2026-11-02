import { Link } from '@tanstack/react-router';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthLayoutProps } from '@/modules/auth/types/types';
import { NebulaLogo } from '@/shared/components/NebulaLogo';

/** The shell every auth page shares: the app's mark above a single card, and any way out below it. */
export const AuthLayout = ({ children, footer }: AuthLayoutProps) => {
  const { hidePassword } = usePasswordVisibilityStore();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-[22px] bg-canvas px-4 py-5 text-foreground">
      <Link to="/" onClick={hidePassword} className="text-foreground">
        {/* The header hides the wordmark on a phone; here it is the page's only branding. */}
        <NebulaLogo className="[&>span]:inline [&>span]:text-base [&>svg]:size-[26px]" />
      </Link>
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-panel p-6 sm:p-7">
        {children}
      </div>
      {footer}
    </main>
  );
};
