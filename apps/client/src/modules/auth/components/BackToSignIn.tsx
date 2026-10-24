import { Button } from '@chakra-ui/react';
import { Link } from '@tanstack/react-router';
import { LuArrowLeft } from 'react-icons/lu';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import { resources } from '@/resources';

export const BackToSignIn = () => {
  const { hidePassword } = usePasswordVisibilityStore();

  return (
    <Button asChild variant="ghost" w="full">
      <Link to="/auth" onClick={hidePassword}>
        <LuArrowLeft />
        {resources.auth.page.backToSignIn}
      </Link>
    </Button>
  );
};
