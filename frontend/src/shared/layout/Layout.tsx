import { Box, Flex } from "@chakra-ui/react";
import { Header } from "./Header";
import { Page } from "./Page";
import { LayoutProps } from "@/shared/types/types";
import { useColorModeValue } from "../components/ui/color-mode";

export const Layout = ({ children }: LayoutProps) => {
  const bg = useColorModeValue("white", "bg.default");

  return (
    <Flex direction="column" minHeight="100vh" bg={bg}>
      <Header />
      <Box as="main" flex="1" mt="20">
        <Page>{children}</Page>
      </Box>
    </Flex>
  );
};
