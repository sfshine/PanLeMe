import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Input, Text, ListItem, Icon, Divider, useTheme } from '@rneui/themed';
import { observer } from 'mobx-react-lite';
import { userStore } from '../store/UserStore';
import { LLMService } from '../services/LLMService';

export const SettingsScreen = observer(({ navigation }: any) => {
  const { theme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API Key');
      return;
    }

    // Hardcoded DeepSeek URL as requested
    const urlPayload = 'https://api.deepseek.com';

    console.log('[SettingsScreen] Starting verification...');
    setVerifying(true);
    const isValid = await LLMService.verifyKey(apiKey.trim(), urlPayload);
    console.log('[SettingsScreen] Verification result:', isValid);
    setVerifying(false);

    if (isValid) {
      userStore.setApiKey(apiKey.trim());
      userStore.setBaseUrl(urlPayload);
      Alert.alert('Success', 'API Key configured successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Chat') }
      ]);
    } else {
      Alert.alert('Verification Failed', 'Invalid API Key or network error. Check URL and Key.');
    }
  };

  const handleClear = () => {
    Alert.alert('Confirm', 'Are you sure you want to clear the API Key?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          userStore.clearApiKey();
          setApiKey('');
        }
      }
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text h4 style={{ color: theme.colors.grey0 }}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text h5 style={styles.sectionTitle}>API Configuration</Text>

        {userStore.isConfigured ? (
          <View style={styles.configuredContainer}>
            <View style={styles.keyDisplay}>
              <Text style={styles.keyText}>
                Key: {userStore.apiKey?.slice(0, 3)}...{userStore.apiKey?.slice(-4)}
              </Text>
              <Icon name="check-circle" color={theme.colors.success} />
            </View>
            <Button
              title="Clear API Key"
              type="outline"
              buttonStyle={{ borderColor: theme.colors.error }}
              titleStyle={{ color: theme.colors.error }}
              onPress={handleClear}
            />
          </View>
        ) : (
          <View>
            <Input
              placeholder="sk-..."
              secureTextEntry={!showKey}
              value={apiKey}
              onChangeText={setApiKey}
              rightIcon={
                <Icon
                  name={showKey ? 'eye-off' : 'eye'}
                  type="feather"
                  onPress={() => setShowKey(!showKey)}
                />
              }
              label="OpenAI Compatible API Key"
            />
            <Text style={styles.hint}>
              Stored locally on your device. Never uploaded to our servers.
            </Text>
            <Button
              title="Verify & Save"
              loading={verifying}
              onPress={handleVerify}
              containerStyle={{ marginTop: 20 }}
            />
          </View>
        )}
      </View>

      <Divider style={{ marginVertical: 20 }} />

      <View style={styles.section}>
        <Text h5 style={styles.sectionTitle}>About</Text>
        <ListItem bottomDivider containerStyle={{ backgroundColor: 'transparent' }}>
          <ListItem.Content>
            <ListItem.Title>Version</ListItem.Title>
            <ListItem.Subtitle>1.0.0 (MVP)</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
        <ListItem containerStyle={{ backgroundColor: 'transparent' }}>
          <ListItem.Content>
            <ListItem.Title>Privacy Policy</ListItem.Title>
            <ListItem.Subtitle>Data is stored locally.</ListItem.Subtitle>
          </ListItem.Content>
        </ListItem>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    marginTop: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 15,
    opacity: 0.8,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginLeft: 10,
    marginTop: 5,
  },
  configuredContainer: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
  },
  keyDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  keyText: {
    fontSize: 16,
    fontFamily: 'monospace',
  }
});
