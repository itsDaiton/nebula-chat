import { useNavigate } from 'react-router';
import { route } from '@/routing/routes';

export const useResetChat = () => {
  const navigate = useNavigate();

  const resetChat = () => {
    void navigate(route.chat.root());
  };

  return { resetChat };
};
