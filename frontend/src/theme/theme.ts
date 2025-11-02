import { defineConfig, createSystem, defaultConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        gray: {
          50: { value: "#f9fafb" },
          100: { value: "#f3f4f6" },
          200: { value: "#e5e7eb" },
          300: { value: "#d1d5db" },
          400: { value: "#9ca3af" },
          500: { value: "#6b7280" },
          600: { value: "#4b5563" },
          700: { value: "#374151" },
          800: { value: "#1f2937" },
          900: { value: "#111827" },
        },
      },
      fonts: {
        body: { value: "Inter, -apple-system, system-ui, sans-serif" },
        heading: { value: "Inter, -apple-system, system-ui, sans-serif" },
      },
      radii: {
        sm: { value: "0.375rem" },
        md: { value: "0.5rem" },
        lg: { value: "0.75rem" },
      },
      shadows: {
        container: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.15)" },
      },
    },
    recipes: {
      button: {
        base: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "500",
          borderRadius: "md",
        },
        variants: {
          solid: {
            base: {
              bg: "{colors.gray.900}",
              color: "white",
              _hover: { bg: "{colors.gray.800}" },
              _active: { bg: "{colors.gray.700}" },
            },
          },
          outline: {
            base: {
              borderWidth: "1px",
              borderColor: "{colors.gray.200}",
              _hover: { bg: "{colors.gray.50}" },
            },
          },
        },
      },
      input: {
        base: {
          borderRadius: "md",
          borderWidth: "1px",
          borderColor: "gray.200",
          _hover: { borderColor: "gray.300" },
          _focus: {
            borderColor: "gray.900",
            boxShadow: "0 0 0 1px {colors.gray.900}",
          },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      fontFamily: "{fonts.body}",
      color: "{colors.gray.900}",
      bg: "white",
    },
  },
});

export const system = createSystem(defaultConfig, config);
