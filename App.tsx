import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@rneui/themed';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme/theme';
import 'react-native-gesture-handler'; // Important for Drawer

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <StatusBar style="light" />
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;

