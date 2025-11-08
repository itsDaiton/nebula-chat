import { useNavigate } from "react-router";
import { route } from "@/routes";

export const useResetChat = () => {
  const navigate = useNavigate();

  const resetChat = () => {
    navigate(route.chat.root());
  };

  return resetChat;
};
