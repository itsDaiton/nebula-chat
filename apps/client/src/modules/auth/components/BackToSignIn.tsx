import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { resources } from '@/resources';
import { buttonVariants } from '@/shared/components/ui/button';

export const BackToSignIn = () => {
  const { hidePassword } = usePasswordVisibilityStore();

  return (
    <Link
      to="/auth"
      onClick={hidePassword}
      className={buttonVariants({ variant: 'ghost', className: 'text-muted-foreground' })}
    >
      <ArrowLeftIcon />
      {resources.auth.page.backToSignIn}
    </Link>
  );
};
