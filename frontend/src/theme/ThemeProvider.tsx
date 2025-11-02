import { ChakraProvider } from "@chakra-ui/react";
import { ReactNode } from "react";
import { system } from "./theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
