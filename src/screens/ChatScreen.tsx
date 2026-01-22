import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Modal, Alert, ToastAndroid, StatusBar, Keyboard } from 'react-native';
import { Button, Text, Icon, useTheme } from '@rneui/themed';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatStore } from '../store/ChatStore';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import MessageBubble from '../components/MessageBubble';
import GuidePage from '../components/GuidePage';
import { Bots } from '../config/Bots';
import SummaryPrompt from '../components/SummaryPrompt';

export const ChatScreen = observer(({ navigation }: any) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const [showBotSelector, setShowBotSelector] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!chatStore.currentSessionId) {
      chatStore.startNewSession('unselected');
    }
  }, []);

  // Track keyboard visibility for iOS to remove bottom safe area padding when keyboard is shown
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const showSubscription = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Reset summary prompt when switching sessions
  useEffect(() => {
    setShowSummaryPrompt(false);
  }, [chatStore.currentSessionId]);

  useEffect(() => {
    const checkSummary = () => {
      // Only show if it's currently false (don't auto-hide strictly if user ignored it, but for now strict sync is safer for bugs)
      // "If chatStore.needsSummary is true, we show it."
      // But if user manually dismissed it (set to false), we don't want it to pop back up immediately on next render loop if nothing changed.
      // But dependency is messages.length.
      // Let's just set it to true if needed.
      if (chatStore.needsSummary) {
        if (!chatStore.hasShownSummaryPrompt) {
          setShowSummaryPrompt(true);
          chatStore.markSummaryPromptShown();
        }
      } else {
        // Safe to hide if conditions no longer met (e.g. time passed, or summary generated)
        setShowSummaryPrompt(false);
      }
    };
    checkSummary();
  }, [chatStore.messages.length, chatStore.sessionType, chatStore.hasShownSummaryPrompt]);

  useEffect(() => {
    if (chatStore.apiErrorStatus) {
      const status = chatStore.apiErrorStatus;
      chatStore.clearApiError();

      let title = '';
      let message = '';

      if (status === 401) {
        title = '认证失败';
        message = 'API key 错误，认证失败。请检查您的 API key 是否正确，如没有 API key，请先创建 API key。';
      } else if (status === 402) {
        title = '余额不足';
        message = '账号余额不足。请确认账户余额，并前往充值页面进行充值。';
      }

      Alert.alert(
        title,
        message,
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: () => navigation.navigate('Settings') }
        ]
      );
    }
  }, [chatStore.apiErrorStatus]);



  const handleSummaryAction = (action: 'yes' | 'no') => {
    setShowSummaryPrompt(false);
    if (action === 'yes') {
      chatStore.generateSummary();
    }
  };

  const handleBotSelect = (botId: string) => {
    setShowBotSelector(false);
    chatStore.startNewSession(botId);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    chatStore.sendMessage(inputText);
    setInputText('');
  };

  const getSessionTitle = () => {
    if (chatStore.sessionType === 'unselected') return '盘了么';
    const bot = Bots.find(b => b.id === chatStore.sessionType);
    return bot ? bot.title : '盘了么';
  };

  const topInset = Platform.OS === 'android' ? (insets.top || StatusBar.currentHeight || 0) : insets.top;
  const headerHeight = topInset + 48;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ChatGPT Style Header - Floating */}
      <View style={[
        styles.header,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.grey5,
          paddingTop: topInset,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: headerHeight
        }
      ]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Icon name="menu" color={theme.colors.grey2} size={24} />
        </TouchableOpacity>

        {chatStore.sessionType !== 'unselected' && (
          <View style={[styles.headerCenter, { top: topInset }]} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.titleContainer}
              onPress={() => setShowBotSelector(true)}
            >
              <Text style={[styles.headerTitle, { color: theme.colors.black }]}>{getSessionTitle()}</Text>
              <Icon name="chevron-down" type="feather" color={theme.colors.grey2} size={16} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.headerRight, { zIndex: 11 }]}>
          {/* Manual Summary Trigger */}
          {(() => {
            const bot = Bots.find(b => b.id === chatStore.sessionType);
            if (bot?.summary) {
              return (
                <TouchableOpacity
                  style={styles.newChatButton}
                  onPress={() => {
                    Alert.alert(
                      "生成复盘",
                      "确定要根据当前对话生成今日复盘吗？",
                      [
                        { text: "取消", style: "cancel" },
                        {
                          text: "生成",
                          onPress: () => chatStore.generateSummary()
                        }
                      ]
                    );
                  }}
                >
                  <Icon name="sparkles" type="ionicon" color={theme.colors.primary} size={20} />
                </TouchableOpacity>
              );
            }
            return null;
          })()}

          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => {
              if (chatStore.sessionType === 'unselected') {
                if (Platform.OS === 'android') {
                  ToastAndroid.show('请在下方选择一个话题开始。', ToastAndroid.SHORT);
                } else {
                  Alert.alert('提示', '请在下方选择一个话题开始。');
                }
              } else {
                chatStore.startNewSession('unselected');
              }
            }}
          >
            <Icon name="edit" type="feather" color={theme.colors.grey2} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <SummaryPrompt
        visible={showSummaryPrompt}
        topOffset={headerHeight + 8}
        onConfirm={() => handleSummaryAction('yes')}
        onCancel={() => handleSummaryAction('no')}
        onLayout={(e) => setSummaryHeight(e.nativeEvent.layout.height)}
      />

      {chatStore.sessionType === 'unselected' ? (
        <View style={{ flex: 1, paddingTop: headerHeight }}>
          <GuidePage onSelect={(type) => chatStore.initializeSession(type)} />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={chatStore.messages.slice().reverse()}
            extraData={chatStore.messages.length}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: headerHeight + 8 }
            ]}
            inverted
            style={{ flex: 1 }}
          />

          {/* ChatGPT Style Input */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, paddingBottom: isKeyboardVisible ? 15 : Math.max(insets.bottom, 15) }]}>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.grey1, borderColor: theme.colors.grey5 }]}>
              <TextInput
                placeholder={Bots.find(b => b.id === chatStore.sessionType)?.description || "输入内容..."}
                placeholderTextColor={theme.colors.grey2}
                value={inputText}
                onChangeText={setInputText}
                style={[styles.textInput, { color: theme.colors.black }]}
                multiline
                maxLength={4000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.grey5 }
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || chatStore.isStreaming}
              >
                <Icon name="arrow-up" type="feather" color="#fff" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Bot Switching Modal */}
      <Modal
        visible={showBotSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBotSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBotSelector(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.black }]}>切换助手</Text>
            {Bots.map(bot => (
              <TouchableOpacity
                key={bot.id}
                style={[styles.botOption, { borderBottomColor: theme.colors.grey4 }]}
                onPress={() => handleBotSelect(bot.id)}
              >
                <View style={[styles.botIconSmall, { backgroundColor: (theme.colors as any).brandSurface || 'rgba(16, 163, 127, 0.1)' }]}>
                  <Icon name={bot.icon} type="feather" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.botOptionContent}>
                  <Text style={[styles.botOptionTitle, { color: theme.colors.black }]}>{bot.title}</Text>
                  <Text style={[styles.botOptionDesc, { color: theme.colors.grey2 }]}>{bot.description}</Text>
                </View>
                {chatStore.sessionType === bot.id && (
                  <Icon name="check" type="feather" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
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
    borderBottomWidth: 0.5,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    zIndex: 11,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4, // Make touch target slightly larger
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  newChatButton: {
    padding: 8,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
    maxHeight: 200,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 160,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  botOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  botIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  botOptionContent: {
    flex: 1,
  },
  botOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  botOptionDesc: {
    fontSize: 12,
  },
});
