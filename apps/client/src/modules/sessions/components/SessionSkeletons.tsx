import { Box, Skeleton, Flex } from '@chakra-ui/react';
import { paginationConfig } from '@/shared/config/paginationConfig';
import type { SessionListSkeletonsProps } from '@/modules/sessions/types/types';

export const SessionSkeletons = ({
  count = paginationConfig.defaultLimit,
}: SessionListSkeletonsProps) => (
  <Flex direction="column" gap={1}>
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index} p={3} borderRadius="md" borderWidth="1px" borderColor="transparent">
        <Skeleton height="16px" width="70%" mb={2} />
        <Skeleton height="12px" width="40%" />
      </Box>
    ))}
  </Flex>
);
