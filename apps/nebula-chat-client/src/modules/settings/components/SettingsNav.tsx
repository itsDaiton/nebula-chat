import { Box, Button, Stack, Text } from '@chakra-ui/react';
import { NavLink } from 'react-router';
import { SETTINGS_SECTIONS } from '@/modules/settings/utils/settingsSections';
import { resources } from '@/resources';

/** The settings sections, beside the open one on desktop and above it on mobile. */
export const SettingsNav = () => (
  <Box
    as="nav"
    aria-label={resources.settings.title}
    flexShrink={0}
    w={{ base: 'full', md: 64 }}
    p={{ base: 3, md: 4 }}
    borderColor="border.default"
    borderBottomWidth={{ base: '1px', md: 0 }}
    borderRightWidth={{ base: 0, md: '1px' }}
  >
    <Text px={3} mb={2} fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
      {resources.settings.title}
    </Text>
    <Stack direction={{ base: 'row', md: 'column' }} gap={1} overflowX="auto">
      {SETTINGS_SECTIONS.map(({ label, icon: SectionIcon, path }) => (
        <Button
          key={path}
          asChild
          variant="ghost"
          justifyContent="flex-start"
          gap={3}
          _currentPage={{ bg: 'bg.muted', fontWeight: 'semibold' }}
        >
          <NavLink to={path} end>
            <SectionIcon />
            {label}
          </NavLink>
        </Button>
      ))}
    </Stack>
  </Box>
);
