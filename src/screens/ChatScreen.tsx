import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Input, Button, Text, Icon, useTheme } from '@rneui/themed';
import { observer } from 'mobx-react-lite';
import { chatStore, Message } from '../store/ChatStore';
import Markdown from 'react-native-markdown-display';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// 打字机效果组件
interface TypewriterTextProps {
  content: string;
  isStreaming?: boolean;
  speed?: number; // 每个字符的显示间隔(ms)
  theme: any;
  onComplete?: () => void;
}

const TypewriterText = ({ content, isStreaming, speed = 30, theme, onComplete }: TypewriterTextProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const contentRef = useRef(content);

  useEffect(() => {
    // 如果是流式消息，直接显示全部内容
    if (isStreaming) {
      setDisplayedContent(content);
      return;
    }

    // 如果内容改变了，重置状态（用于动态内容）
    if (contentRef.current !== content) {
      contentRef.current = content;
      // 对于已完成的新消息，启动打字机效果
      if (!isComplete) {
        indexRef.current = 0;
        setDisplayedContent('');
      }
    }

    // 如果已完成打字效果或者内容为空，不需要动画
    if (isComplete || !content) {
      setDisplayedContent(content);
      return;
    }

    // 打字机效果
    if (indexRef.current < content.length) {
      const timer = setTimeout(() => {
        indexRef.current += 1;
        setDisplayedContent(content.slice(0, indexRef.current));
      }, speed);
      return () => clearTimeout(timer);
    } else {
      // 打字完成
      setIsComplete(true);
      onComplete?.();
    }
  }, [content, displayedContent, isStreaming, speed, isComplete, onComplete]);

  // 流式消息完成时，标记打字完成
  useEffect(() => {
    if (!isStreaming && contentRef.current === content && indexRef.current >= content.length) {
      setIsComplete(true);
    }
  }, [isStreaming, content]);

  return (
    <Markdown style={{
      body: { color: theme.colors.black, fontSize: 16 },
      paragraph: { marginTop: 0, marginBottom: 0 }
    }}>
      {displayedContent || ' '}
    </Markdown>
  );
};

// 追踪已显示过的消息ID，避免重复播放打字机效果
const displayedMessageIds = new Set<string>();

const MessageBubble = ({ message, theme }: { message: Message, theme: any }) => {
  const isUser = message.role === 'user';
  // 判断是否需要打字机效果：只对新的、未显示过的 AI 消息使用
  const needsTypewriter = !isUser && !displayedMessageIds.has(message.id);

  // 标记消息已显示
  useEffect(() => {
    if (!isUser) {
      displayedMessageIds.add(message.id);
    }
  }, [message.id, isUser]);

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
          <TypewriterText
            content={message.content}
            isStreaming={message.isStreaming}
            theme={theme}
            speed={needsTypewriter ? 30 : 0} // 已显示过的消息直接显示
          />
        )}
      </View>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
};

const GuidePage = ({ onSelect }: { onSelect: (type: 'happy' | 'daily') => void }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.guideContainer}>
      <Text h3 style={{ marginBottom: 30, color: theme.colors.black }}>想聊点什么？</Text>

      <TouchableOpacity
        style={[styles.guideCard, { backgroundColor: '#E8F5E9' }]}
        onPress={() => onSelect('happy')}
      >
        <Icon name="smile" type="feather" size={40} color="#43A047" />
        <View style={styles.guideTextContainer}>
          <Text h4 style={{ color: '#2E7D32' }}>高兴的事情</Text>
          <Text style={{ color: '#4CAF50', marginTop: 5 }}>分享今天的快乐时刻</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.guideCard, { backgroundColor: '#E3F2FD' }]}
        onPress={() => onSelect('daily')}
      >
        <Icon name="book" type="feather" size={40} color="#1E88E5" />
        <View style={styles.guideTextContainer}>
          <Text h4 style={{ color: '#1565C0' }}>日常记录</Text>
          <Text style={{ color: '#42A5F5', marginTop: 5 }}>记录生活的点滴</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const ChatScreen = observer(({ navigation }: any) => {
  const { theme } = useTheme();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Ensure we have a session on mount or if empty
    // If no current session, start an unselected one to show Guide Page
    if (!chatStore.currentSessionId) {
      chatStore.startNewSession('unselected');
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
          {chatStore.sessionType === 'unselected' ? '新会话' : (chatStore.sessionType === 'happy' ? '今日小确幸' : '生活记录')}
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

      {chatStore.sessionType === 'unselected' ? (
        <GuidePage onSelect={(type) => chatStore.initializeSession(type)} />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={chatStore.messages.slice()} // MobX array slice for update
            extraData={chatStore.messages.length}
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
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guideTextContainer: {
    marginLeft: 20,
  }
});
