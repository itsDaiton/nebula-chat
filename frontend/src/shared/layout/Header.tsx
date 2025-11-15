import { Box, Flex, Text, IconButton, Button, Icon } from "@chakra-ui/react";
import {
  ColorModeButton,
  useColorModeValue,
} from "../components/ui/color-mode";
import { useResetChat } from "../hooks/useResetChat";
import { useEffect } from "react";
import { LuSettings } from "react-icons/lu";
import { TbGalaxy } from "react-icons/tb";

export const Header = () => {
  const resetChat = useResetChat();
  const bg = useColorModeValue("white", "bg.default");
  const borderColor = useColorModeValue("gray.200", "border.default");
  const textColor = useColorModeValue("gray.900", "fg.default");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById("settings-menu");
      const button = event.target as HTMLElement;

      if (
        menu &&
        menu.style.display === "block" &&
        !menu.contains(button) &&
        !button.closest("button")
      ) {
        menu.style.display = "none";
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg={bg}
      borderBottom="1.5px solid"
      borderColor={borderColor}
      zIndex={1000}
      py={2}
    >
      <Flex
        w="full"
        h="16"
        px={4}
        alignItems="center"
        justifyContent="space-between"
      >
        <Box display="flex" alignItems="center">
          <Icon as={TbGalaxy} boxSize={12} />
          <Text
            pl={2}
            fontSize="3xl"
            fontWeight="bold"
            color={textColor}
            letterSpacing="-0.03em"
            cursor="pointer"
            transition="opacity 0.2s"
            onClick={resetChat}
          >
            nebula chat
          </Text>
        </Box>
        <Flex gap={2} alignItems="center">
          <ColorModeButton />
          <Box position="relative">
            <IconButton
              aria-label="Settings"
              children={<LuSettings />}
              variant="ghost"
              size="md"
              onClick={() => {
                const menu = document.getElementById("settings-menu");
                if (menu) {
                  const isShown = menu.style.display === "block";
                  menu.style.display = isShown ? "none" : "block";
                }
              }}
            />
            <Box
              id="settings-menu"
              position="absolute"
              top="100%"
              right={0}
              mt={2}
              bg={bg}
              borderRadius="md"
              boxShadow="lg"
              borderWidth="1px"
              borderColor={borderColor}
              display="none"
              zIndex={1001}
            >
              <Button
                variant="ghost"
                size="md"
                w="full"
                justifyContent="flex-start"
                py={2}
              >
                Button 1
              </Button>
              <Button
                variant="ghost"
                size="md"
                w="full"
                justifyContent="flex-start"
                py={2}
              >
                Button 2
              </Button>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
};
