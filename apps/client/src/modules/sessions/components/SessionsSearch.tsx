import { Box, Flex, Input, InputGroup, Portal, Text } from '@chakra-ui/react';
import type { SessionsSearchProps } from '@/modules/sessions/types/types';
import { chatScrollBar } from '@/shared/components/scrollbar';
import { useSessionsSearch } from '@/modules/sessions/hooks/useSessionsSearch';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { resources } from '@/resources';
import { SessionSkeletons } from '@/modules/sessions/components/SessionSkeletons';

export const SessionsSearch = ({ sessions, onSessionClick, onClose }: SessionsSearchProps) => {
  const {
    searchQuery,
    setSearchQuery,
    filteredSessions,
    isSearching,
    error,
    closeAndClearSearch,
    selectSessionAndClearSearch,
  } = useSessionsSearch({
    localSessions: sessions,
    onClose,
    onSessionClick,
  });

  useEscapeKey(closeAndClearSearch);

  return (
    <Portal>
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="blackAlpha.600"
        zIndex="modal"
        onClick={closeAndClearSearch}
      />
      <Flex
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        zIndex="modal"
        w="600px"
        maxW="90vw"
        maxH="600px"
        direction="column"
        bg="bg.default"
        borderColor="border.default"
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        overflow="hidden"
      >
        <Box p={4}>
          <InputGroup>
            <Input
              placeholder={resources.sessions.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              size="md"
              borderColor="border.default"
            />
          </InputGroup>
        </Box>

        <Box flex="1" overflowY="auto" px={4} pb={4} css={chatScrollBar}>
          <Flex direction="column" gap={1}>
            {error && (
              <Box py={8} textAlign="center">
                <Text fontSize="sm" color="red.500">
                  {error.message}
                </Text>
              </Box>
            )}
            {!error && isSearching && <SessionSkeletons count={3} />}
            {!error &&
              !isSearching &&
              filteredSessions.length > 0 &&
              filteredSessions.map((session) => (
                <Box
                  key={session.id}
                  asChild
                  p={3}
                  borderRadius="md"
                  textAlign="left"
                  fontSize="sm"
                  fontWeight="medium"
                  _hover={{ bg: 'bg.muted' }}
                >
                  <button type="button" onClick={() => selectSessionAndClearSearch(session.id)}>
                    {session.title}
                  </button>
                </Box>
              ))}
            {!error && !isSearching && filteredSessions.length === 0 && searchQuery.trim() && (
              <Box py={8} textAlign="center" color="fg.muted">
                {resources.sessions.noResults}
              </Box>
            )}
            {!error && !isSearching && filteredSessions.length === 0 && !searchQuery.trim() && (
              <Box py={8} textAlign="center" color="fg.muted" fontSize="sm">
                {resources.sessions.searchHint}
              </Box>
            )}
          </Flex>
        </Box>
      </Flex>
    </Portal>
  );
};
