import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface BaseContainerProps {
  children: ReactNode;
}

export const BaseContainer = ({ children }: BaseContainerProps) => {
  return <Box>{children}</Box>;
};
