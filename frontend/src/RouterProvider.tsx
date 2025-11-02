import { Route, Routes } from "react-router";
import { route } from "./routes";
import { ChatPage } from "./modules/chat/ChatPage";
import { AuthPage } from "./modules/auth/AuthPage";

export const RouterProvider = () => {
  return (
    <Routes>
      <Route path={route.chat()} element={<ChatPage />} />
      <Route path={route.auth()} element={<AuthPage />} />
    </Routes>
  );
};
