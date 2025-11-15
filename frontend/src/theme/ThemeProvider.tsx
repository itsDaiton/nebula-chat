import { ChakraProvider } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { ColorModeProvider } from "../shared/components/ui/color-mode";
import { system } from "./theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider defaultTheme="system" enableSystem>
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
