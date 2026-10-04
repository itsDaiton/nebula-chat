import { Button } from '@chakra-ui/react';
import { LuArrowLeft } from 'react-icons/lu';
import { Link } from 'react-router';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { resources } from '@/resources';
import { route } from '@/routing/routes';

export const BackToSignIn = () => {
  const { hidePassword } = usePasswordVisibilityStore();

  return (
    <Button asChild variant="ghost" w="full">
      <Link to={route.auth.root()} onClick={hidePassword}>
        <LuArrowLeft />
        {resources.auth.page.backToSignIn}
      </Link>
    </Button>
  );
};
