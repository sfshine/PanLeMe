import { createTheme } from '@rneui/themed';

export const theme = createTheme({
  lightColors: {
    primary: '#4A90E2',
    secondary: '#50E3C2',
    background: '#F5F7FA',
    white: '#FFFFFF',
    grey0: '#E1E8EE',
    grey1: '#BDC3C7',
    grey2: '#7F8C8D',
    grey3: '#2C3E50',
    success: '#2ECC71',
    error: '#E74C3C',
    warning: '#F1C40F',
  },
  darkColors: {
    primary: '#3498DB',
    secondary: '#1ABC9C',
    background: '#2C3E50',
    white: '#ECF0F1',
    grey0: '#34495E',
    grey1: '#7F8C8D',
    grey2: '#BDC3C7',
    grey3: '#ECF0F1',
    success: '#27AE60',
    error: '#C0392B',
    warning: '#F39C12',
  },
  components: {
    Button: {
      raised: true,
      radius: 10,
    },
    Text: {
      style: {
        fontFamily: 'System', // Use default system font or custom if available
      },
    },
  },
});
