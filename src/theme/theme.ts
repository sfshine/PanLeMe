import { createTheme } from '@rneui/themed';

// ChatGPT Style Theme
export const theme = createTheme({
  lightColors: {
    primary: '#19c37d',
    secondary: '#19c37d',
    background: '#FFFFFF',
    white: '#FFFFFF',
    black: '#1f2937', // Deeper blue-grey for text
    grey0: '#F7F7F8', // Message surface
    grey1: '#FFFFFF', // Input surface
    grey2: '#6b7280', // Medium grey text
    grey3: '#f3f4f6', // Sidebar/Surface
    grey4: '#e5e7eb', // Borders
    grey5: '#d1d5db', // Stronger borders
    success: '#10a37f',
    error: '#ef4444',
    warning: '#f59e0b',
    //@ts-ignore - Adding custom color for icon backgrounds
    brandSurface: 'rgba(16, 163, 127, 0.1)',
  },
  darkColors: {
    primary: '#10a37f',
    secondary: '#19c37d',
    background: '#1a1a1e',
    white: '#FFFFFF',
    black: '#f9fafb',
    grey0: '#2a2a2e',
    grey1: '#3a3a3e',
    grey2: '#9ca3af',
    grey3: '#202123',
    grey4: '#374151',
    grey5: '#4b5563',
    success: '#10a37f',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  components: {
    Button: {
      raised: false,
      radius: 8,
    },
    Text: {
      style: {
        fontFamily: 'System',
        color: '#1f2937',
      },
    },
    Input: {
      inputStyle: {
        color: '#1f2937',
      },
      placeholderTextColor: '#9ca3af',
      inputContainerStyle: {
        borderBottomWidth: 0,
      },
    },
  },
});
