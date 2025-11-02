import { forwardRef } from "react";
import { Container, ContainerProps } from "@chakra-ui/react";

export const Page = forwardRef(function Page(props: ContainerProps, ref) {
  return (
    <Container
      maxW="container.xl"
      py={{ base: 4, sm: 6 }}
      px={{ base: 4, sm: 6, "2xl": 0 }}
      {...props}
    >
      {props.children}
    </Container>
  );
});
