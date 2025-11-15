import { defineConfig, createSystem, defaultConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          default: {
            value: { _light: 'white', _dark: 'rgb(10,10,10)' },
          },
          subtle: {
            value: {
              _light: '#F8F8F8',
              _dark: 'rgb(21,21,21)',
            },
          },
          muted: {
            value: {
              _light: '#F8F8F8',
              _dark: 'rgb(21,21,21)',
            },
          },
          input: {
            value: {
              _light: 'white',
              _dark: 'rgb(21,21,21)',
            },
          },
        },
        fg: {
          default: {
            value: { _light: '#1A1A1A', _dark: '#FFFFFF' },
          },
          soft: {
            value: {
              _light: '#4A4A4A',
              _dark: '#CCCCCC',
            },
          },
          muted: {
            value: {
              _light: '#737373',
              _dark: '#A1A1A1',
            },
          },
        },
        border: {
          default: {
            value: {
              _light: '#E8E8E8',
              _dark: 'rgb(31,31,31)',
            },
          },
          emphasized: {
            value: { _light: '#E8E8E8', _dark: 'rgb(41,41,41)' },
          },
          inner: {
            value: {
              _light: '#E8E8E8',
              _dark: 'rgb(21,21,21)',
            },
          },
        },
      },
    },
    tokens: {
      colors: {
        gray: {
          50: { value: '#f9fafb' },
          100: { value: '#f3f4f6' },
          200: { value: '#e5e7eb' },
          300: { value: '#d1d5db' },
          400: { value: '#9ca3af' },
          500: { value: '#6b7280' },
          600: { value: '#4b5563' },
          700: { value: '#374151' },
          800: { value: '#1f2937' },
          900: { value: '#111827' },
        },
      },
      fonts: {
        body: { value: 'Inter, -apple-system, system-ui, sans-serif' },
        heading: { value: 'Inter, -apple-system, system-ui, sans-serif' },
      },
      radii: {
        sm: { value: '0.375rem' },
        md: { value: '0.5rem' },
        lg: { value: '0.75rem' },
      },
      shadows: {
        container: { value: '0 1px 2px 0 rgba(0, 0, 0, 0.15)' },
      },
    },
    recipes: {
      button: {
        base: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '500',
          borderRadius: 'md',
          transition: 'colors 0.2s ease',
        },
        variants: {
          solid: {
            base: {
              bg: '{colors.fg.default}',
              color: '{colors.bg.default}',
              _hover: {
                opacity: 0.9,
              },
              _active: {
                opacity: 0.8,
              },
            },
          },
          outline: {
            base: {
              borderWidth: '1px',
              borderColor: '{colors.border.default}',
              color: '{colors.fg.default}',
              _hover: {
                bg: '{colors.bg.subtle}',
              },
            },
          },
          ghost: {
            base: {
              color: '{colors.fg.muted}',
              _hover: {
                bg: '{colors.bg.subtle}',
              },
            },
          },
        },
      },
      input: {
        base: {
          borderRadius: 'md',
          borderWidth: '1px',
          bg: '{colors.bg.default}',
          borderColor: '{colors.border.default}',
          color: '{colors.fg.default}',
          _placeholder: { color: '{colors.fg.muted}' },
          _hover: { borderColor: '{colors.border.emphasized}' },
          _focus: {
            borderColor: '{colors.border.emphasized}',
            boxShadow: '0 0 0 1px {colors.border.emphasized}',
          },
        },
      },
    },
  },
  globalCss: {
    'html, body': {
      fontFamily: '{fonts.body}',
      color: '{colors.fg.default}',
      bg: '{colors.bg.default}',
      transitionProperty: 'background-color, border-color, color, fill, stroke',
      transitionDuration: 'normal',
    },
  },
});

export const system = createSystem(defaultConfig, config);
