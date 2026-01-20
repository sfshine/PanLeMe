import { createTheme } from '@rneui/themed';

// ChatGPT Style Theme
export const theme = createTheme({
  lightColors: {
    primary: '#10a37f', // ChatGPT green
    secondary: '#19c37d',
    background: '#343541', // Main chat area
    white: '#FFFFFF',
    black: '#ECECF1',
    grey0: '#444654', // AI message background
    grey1: '#40414f', // Input background
    grey2: '#8e8ea0', // Secondary text
    grey3: '#202123', // Sidebar background
    grey4: '#2A2B32', // Hover states
    grey5: '#565869', // Borders
    success: '#10a37f',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  darkColors: {
    primary: '#10a37f',
    secondary: '#19c37d',
    background: '#343541',
    white: '#FFFFFF',
    black: '#ECECF1',
    grey0: '#444654',
    grey1: '#40414f',
    grey2: '#8e8ea0',
    grey3: '#202123',
    grey4: '#2A2B32',
    grey5: '#565869',
    success: '#10a37f',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  components: {
    Button: {
      raised: false,
      radius: 6,
    },
    Text: {
      style: {
        fontFamily: 'System',
        color: '#ECECF1',
      },
    },
    Input: {
      inputStyle: {
        color: '#ECECF1',
      },
      placeholderTextColor: '#8e8ea0',
    },
  },
});
