import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { Button, Text, Icon, useTheme } from '@rneui/themed';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatStore } from '../store/ChatStore';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import MessageBubble from '../components/MessageBubble';
import GuidePage from '../components/GuidePage';

export const ChatScreen = observer(({ navigation }: any) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatStore.currentSessionId) {
      chatStore.startNewSession('unselected');
    }

    const checkSummary = () => {
      if (chatStore.needsSummary) {
        setShowSummaryPrompt(true);
      }
    };
    checkSummary();
  }, [chatStore.messages.length]);

  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);

  const handleSummaryAction = (action: 'yes' | 'no') => {
    setShowSummaryPrompt(false);
    if (action === 'yes') {
      chatStore.generateSummary();
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    chatStore.sendMessage(inputText);
    setInputText('');
  };

  const getSessionTitle = () => {
    if (chatStore.sessionType === 'unselected') return '三星';
    return chatStore.sessionType === 'happy' ? '今日小确幸' : '生活记录';
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      {/* ChatGPT Style Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.grey5, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Icon name="menu" color={theme.colors.grey2} size={24} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: theme.colors.black }]}>{getSessionTitle()}</Text>
          <Icon name="chevron-down" type="feather" color={theme.colors.grey2} size={16} />
        </View>
        <TouchableOpacity style={styles.newChatButton}>
          <Icon name="edit" type="feather" color={theme.colors.grey2} size={20} />
        </TouchableOpacity>
      </View>

      {showSummaryPrompt && (
        <View style={[styles.summaryPrompt, { backgroundColor: theme.colors.grey0 }]}>
          <Text style={[styles.summaryText, { color: theme.colors.black }]}>
            🌙 晚安，需要为你生成今日复盘吗？
          </Text>
          <TouchableOpacity
            style={[styles.summaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleSummaryAction('yes')}
          >
            <Text style={styles.summaryButtonText}>好呀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.summaryButtonClear}
            onPress={() => handleSummaryAction('no')}
          >
            <Text style={[styles.summaryButtonTextClear, { color: theme.colors.grey2 }]}>下次</Text>
          </TouchableOpacity>
        </View>
      )}

      {chatStore.sessionType === 'unselected' ? (
        <GuidePage onSelect={(type) => chatStore.initializeSession(type)} />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={chatStore.messages.slice()}
            extraData={chatStore.messages.length}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            style={{ flex: 1 }}
          />

          {/* ChatGPT Style Input */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.grey1, borderColor: theme.colors.grey5 }]}>
              <TextInput
                placeholder={chatStore.sessionType === 'daily' ? "输入此刻想记录的内容吧" : "分享你的开心事..."}
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
            <Text style={[styles.disclaimer, { color: theme.colors.grey2 }]}>
              三星可能会出错，请核实重要信息。
            </Text>
          </View>
        </>
      )}
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
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  newChatButton: {
    padding: 8,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  summaryPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
  },
  summaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  summaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryButtonClear: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 4,
  },
  summaryButtonTextClear: {
    fontSize: 14,
  },
});
