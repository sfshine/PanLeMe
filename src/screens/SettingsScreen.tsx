import { Button, Divider, Icon, Input, ListItem, Text, useTheme } from '@rneui/themed';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdate } from 'react-native-update';
import { LLMService } from '../services/LLMService';
import { userStore } from '../store/UserStore';



export const SettingsScreen = observer(({ navigation }: any) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [apiKey, setApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const { client } = useUpdate();

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', '请输入 API Key');
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
      Alert.alert('成功', 'API Key 配置成功', [
        { text: '确定', onPress: () => navigation.navigate('Chat') }
      ]);
    } else {
      Alert.alert('验证失败', 'API Key 无效或网络错误。请检查 API Key 是否正确。');
    }
  };

  const handleCheckUpdate = async () => {
    if (!client) return;

    if (__DEV__) {
      Alert.alert('提示', '开发环境无法检查热更新');
      return;
    }

    try {
      console.log('Checking for update...');
      const info: any = await client.checkUpdate();
      console.log('Update info received:', info);

      if (info.expired) {
        Alert.alert('提示', '应用版本过旧，请前往应用商店下载最新版本');
      } else if (info.update) {
        const description = info.description || '';
        const meta = info.metaInfo ? `\nMeta: ${info.metaInfo}` : '';
        Alert.alert('发现新版本', `版本: ${info.name}\n${description}${meta}`, [
          { text: '取消', style: 'cancel' },
          {
            text: '立即更新',
            onPress: async () => {
              try {
                console.log('Downloading update...');
                const hash = await client.downloadUpdate(
                  info,
                  (progress) => {
                    console.log('Download progress:', progress);
                  }
                );
                if (hash) {
                  Alert.alert('提示', '更新下载完毕，是否立即重启生效？', [
                    { text: '稍后', style: 'cancel' },
                    { text: '立即重启', onPress: () => client.switchVersion(hash) }
                  ]);
                }
              } catch (err) {
                console.error(err);
                Alert.alert('更新失败', '下载更新失败，请重试');
              }
            }
          }
        ]);
      } else {
        Alert.alert('提示', '当前已是最新版本');
      }
    } catch (err) {
      console.error('Check update error:', err);
      Alert.alert('错误', '检查更新失败');
    }
  };

  const handleClear = () => {
    Alert.alert('确认', '确定要清除 API Key 吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => {
          userStore.clearApiKey();
          setApiKey('');
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ChatGPT Style Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.grey5, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="arrow-left"
            type="feather"
            color={theme.colors.grey2}
            size={24}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.black }]}>设置</Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.grey2 }]}>API 配置</Text>

          {userStore.isConfigured ? (
            <View style={[styles.configuredContainer, { backgroundColor: theme.colors.grey0 }]}>
              <View style={styles.keyDisplay}>
                <Text style={[styles.keyText, { color: theme.colors.black }]}>
                  Key: {userStore.apiKey?.slice(0, 3)}...{userStore.apiKey?.slice(-4)}
                </Text>
                <Icon name="check-circle" type="material" color={theme.colors.success} size={20} />
              </View>
              <Button
                title="清除 API Key"
                type="outline"
                buttonStyle={{ borderColor: theme.colors.error, borderRadius: 8 }}
                titleStyle={{ color: theme.colors.error, fontSize: 14 }}
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
                    size={20}
                    color={theme.colors.grey2}
                    onPress={() => setShowKey(!showKey)}
                  />
                }
                label="DeepSeek API Key"
                labelStyle={{ color: theme.colors.grey2, fontSize: 14, fontWeight: '500' }}
                inputStyle={{ color: theme.colors.black }}
                inputContainerStyle={{ borderBottomWidth: 1, borderColor: theme.colors.grey5 }}
                containerStyle={{ paddingHorizontal: 0 }}
              />
              <Text style={[styles.hint, { color: theme.colors.grey2 }]}>
                API Key 仅存储在本地设备中，绝不会上传到我们的服务器。
              </Text>
              <Button
                title="验证并保存"
                loading={verifying}
                onPress={handleVerify}
                buttonStyle={{ backgroundColor: theme.colors.primary, borderRadius: 12, height: 50 }}
                containerStyle={{ marginTop: 24 }}
              />
            </View>
          )}
        </View>

        <Divider style={{ marginVertical: 24, backgroundColor: theme.colors.grey5 }} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.grey2 }]}>关于</Text>
          <ListItem
            containerStyle={{ backgroundColor: 'transparent', paddingHorizontal: 0 }}
            onPress={handleCheckUpdate}
          >
            <ListItem.Content>
              <ListItem.Title style={{ color: theme.colors.black }}>检查更新</ListItem.Title>
            </ListItem.Content>
            <ListItem.Chevron />
          </ListItem>
          <ListItem bottomDivider containerStyle={{ backgroundColor: 'transparent', paddingHorizontal: 0 }}>
            <ListItem.Content>
              <ListItem.Title style={{ color: theme.colors.black }}>版本</ListItem.Title>
              <ListItem.Subtitle style={{ color: theme.colors.grey2 }}>1.0.1 (MVP)</ListItem.Subtitle>
            </ListItem.Content>
          </ListItem>
          <ListItem containerStyle={{ backgroundColor: 'transparent', paddingHorizontal: 0 }}>
            <ListItem.Content>
              <ListItem.Title style={{ color: theme.colors.black }}>隐私政策</ListItem.Title>
              <ListItem.Subtitle style={{ color: theme.colors.grey2 }}>数据存储在本地。</ListItem.Subtitle>
            </ListItem.Content>
          </ListItem>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  menuButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRightPlaceholder: {
    width: 40, // Match menuButton width
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
  },
  configuredContainer: {
    padding: 16,
    borderRadius: 12,
  },
  keyDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  keyText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
});
