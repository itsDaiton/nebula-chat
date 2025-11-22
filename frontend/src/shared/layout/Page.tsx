import type { Ref } from 'react';
import { forwardRef } from 'react';
import type { ContainerProps } from '@chakra-ui/react';
import { Container } from '@chakra-ui/react';

export const Page = forwardRef(function Page(props: ContainerProps, ref: Ref<HTMLDivElement>) {
  return (
    <Container
      maxW="container.xl"
      py={{ base: 4, sm: 6 }}
      px={{ base: 4, sm: 6, '2xl': 0 }}
      ref={ref}
      {...props}
    >
      {props.children}
    </Container>
  );
});
