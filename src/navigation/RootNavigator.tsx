import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { userStore } from '../store/UserStore';
import { SettingsScreen } from '../screens/SettingsScreen';
import { View, Text } from 'react-native';

import { ChatScreen } from '../screens/ChatScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

import { CustomDrawerContent } from '../components/CustomDrawerContent';

const MainDrawer = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Chat"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainDrawer" component={MainDrawer} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export const RootNavigator = observer(() => {
  // Wait for hydration
  if (!userStore.hasHydrated) {
    return null; // Or Splash Screen
  }

  return (
    <NavigationContainer>
      {userStore.isConfigured ? (
        <AppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
});
