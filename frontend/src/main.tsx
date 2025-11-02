import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "@/shared/components/ui/provider.tsx";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Provider>
        <App />
      </Provider>
    </BrowserRouter>
  </StrictMode>,
);
