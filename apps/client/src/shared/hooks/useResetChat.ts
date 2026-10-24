import { useNavigate } from '@tanstack/react-router';

export const useResetChat = () => {
  const navigate = useNavigate();

  const resetChat = () => {
    void navigate({ to: '/' });
  };

  return { resetChat };
};
