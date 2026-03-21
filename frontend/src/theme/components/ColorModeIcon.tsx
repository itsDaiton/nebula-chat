import { LuMoon, LuSun } from 'react-icons/lu';
import { useColorMode } from '@/theme/hooks/useColorMode';

export const ColorModeIcon = () => {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? <LuMoon /> : <LuSun />;
};
