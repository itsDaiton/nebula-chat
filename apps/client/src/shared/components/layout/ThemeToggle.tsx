import { MoonIcon, SunIcon } from 'lucide-react';
import { HeaderButton } from '@/shared/components/layout/HeaderButton';
import { resources } from '@/resources';
import { useColorMode } from '@/theme/hooks/useColorMode';

export const ThemeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <HeaderButton label={resources.shell.toggleTheme} onClick={toggleColorMode}>
      {colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </HeaderButton>
  );
};
