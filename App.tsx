import React, { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@rneui/themed';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme/theme';
import 'react-native-gesture-handler'; // Important for Drawer
import { Pushy, UpdateProvider } from 'react-native-update';

const pushyClient = new Pushy({
  appKey: Platform.OS === 'ios' ? 'YOUR_IOS_APP_KEY' : 'GjxR64HzBIbR8d3cme6i76da',
});

const App = () => {
  const lastBackPressed = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - lastBackPressed.current < 2000) {
        // 2秒内再次按返回键，退出应用
        BackHandler.exitApp();
        return true;
      }
      lastBackPressed.current = now;
      ToastAndroid.show('再按一次退出应用', ToastAndroid.SHORT);
      return true; // 返回 true 表示已处理该事件，阻止默认行为
    });

    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <UpdateProvider client={pushyClient}>
          <StatusBar style="auto" />
          <RootNavigator />
        </UpdateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
