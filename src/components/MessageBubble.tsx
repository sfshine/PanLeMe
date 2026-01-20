import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@rneui/themed';
import { Message } from '../types/ChatTypes';
import TypewriterText from './TypewriterText';

// 追踪已显示过的消息ID，避免重复播放打字机效果
const displayedMessageIds = new Set<string>();

interface MessageBubbleProps {
    message: Message;
    theme: any;
}

const MessageBubble = ({ message, theme }: MessageBubbleProps) => {
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

const styles = StyleSheet.create({
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
});

export default MessageBubble;
