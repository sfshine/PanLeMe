import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { observer } from 'mobx-react-lite';
import { chatStore, Message } from '../store/ChatStore';
import Markdown from 'react-native-markdown-display';
import { useNavigation, DrawerActions } from '@react-navigation/native';

const MessageBubble = ({ message, theme }: { message: Message, theme: any }) => {
  const isUser = message.role === 'user';
  return (
    <View style={[
      styles.bubbleContainer, 
      isUser ? styles.userBubbleAlign : styles.aiBubbleAlign
    ]}>
      <View style={[
        styles.bubble, 
        isUser ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.grey0 }
      ]}>
        {isUser ? (
             <Text style={{ color: theme.colors.white }}>{message.content}</Text>
        ) : (
             <Markdown style={{ 
                 body: { color: theme.colors.black, fontSize: 16 }, 
                 paragraph: { marginTop: 0, marginBottom: 0 } 
             }}>
                {message.content}
             </Markdown>
        )}
      </View>
      <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </Text>
    </View>
  );
};

export const ChatScreen = observer(({ navigation }: any) => {
  const { theme } = useTheme();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
      // Ensure we have a session on mount or if empty
      if (chatStore.messages.length === 0) {
          chatStore.startNewSession(chatStore.sessionType);
      }
      
      // Check for summary
      const checkSummary = () => {
          if (chatStore.needsSummary) {
              // We should use a custom bubble or toast, but requirements say "Top light hint bubble... AI sends message: Need summary?"
              // Wait, requirement 2.5.3: "Chat page top pops up light hint bubble... AI sends message... buttons 'Yes' 'Next time'"
              // Actually it says "AI sends message: Now need...?" logic is:
              // - User opens chat.
              // - ChatStore checks time.
              // - IF time match AND no summary:
              //   - AI *temporarily* prompts? Or is it a real message?
              //   - "Chat page top pops up light hint bubble (not blocking)" -> This sounds like a UI overlay, NOT a message bubble.
              //   - "AI sends message: ..." -> confusing.
              //   - "Message below has 'Yes' 'Next time'".
              //   Let's implement a UI Overlay/Banner at top of list.
              setShowSummaryPrompt(true);
          }
      };
      checkSummary();
  }, [chatStore.messages.length]); // Check when messages change or mount

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

  return (
    <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.header}>
        <Button 
            icon={<Icon name="menu" color={theme.colors.black} />} 
            type="clear" 
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())} 
        />
        <Text h4 style={{ flex: 1, textAlign: 'center', fontSize: 18 }}>
            {chatStore.sessionType === 'happy' ? '今日小确幸' : '生活记录'}
        </Text>
        <View style={{ width: 40 }} /> 
      </View>

      {showSummaryPrompt && (
          <View style={styles.summaryPrompt}>
              <Text style={{ flex: 1, fontSize: 13, color: '#333' }}>
                  🌙 晚安，需要为你生成今日复盘吗？
              </Text>
              <Button size="sm" title="好呀" onPress={() => handleSummaryAction('yes')} />
              <Button size="sm" type="clear" title="下次" onPress={() => handleSummaryAction('no')} />
          </View>
      )}

      <FlatList
        ref={flatListRef}
        data={chatStore.messages} // MobX array should be observable
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, { backgroundColor: theme.colors.white, borderTopColor: theme.colors.grey1 }]}>
        <Input
          placeholder={chatStore.sessionType === 'daily' ? "输入此刻想记录的内容吧" : "分享你的开心事..."}
          value={inputText}
          onChangeText={setInputText}
          containerStyle={{ flex: 1 }}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          rightIcon={
              <Icon 
                name="send" 
                color={theme.colors.primary} 
                onPress={handleSend}
                disabled={chatStore.isStreaming}
              />
          }
        />
      </View>
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
    paddingTop: 40, // Status bar safe area approximation
    paddingHorizontal: 10,
    height: 90,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white'
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  bubbleContainer: {
    marginBottom: 10,
    maxWidth: '85%',
  },
  userBubbleAlign: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiBubbleAlign: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 15,
    minHeight: 40,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    marginRight: 5,
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderTopWidth: 1,
    paddingBottom: 30 // Safe area bottom
  },
  summaryPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF9C4', // Light yellow
      padding: 10,
      margin: 10,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
  }
});
