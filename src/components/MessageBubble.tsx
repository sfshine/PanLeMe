import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Icon } from '@rneui/themed';
import { Message } from '../types/ChatTypes';
import { MessageContent } from './messages/MessageRegistry';
import './messages/TextMessageRenderer';
import './messages/StreamingMessageRenderer';

interface MessageBubbleProps {
    message: Message;
    theme: any;
}

const MessageBubble = ({ message, theme }: MessageBubbleProps) => {
    // Hidden internal messages
    if (message.type === 'request-summary') return null;

    const isUser = message.role === 'user';

    return (
        <View style={[
            styles.messageRow,
            { backgroundColor: isUser ? theme.colors.background : theme.colors.grey0 }
        ]}>
            {/* Avatar */}
            <View style={[
                styles.avatar,
                { backgroundColor: isUser ? theme.colors.primary : 'transparent' }
            ]}>
                {isUser ? (
                    <Text style={styles.avatarText}>你</Text>
                ) : (
                    <Image
                        source={require('../../icon.png')}
                        style={styles.avatarImage}
                    />
                )}
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                <Text style={[styles.roleLabel, { color: theme.colors.black }]}>
                    {isUser ? '你' : '小盘'}
                </Text>
                <MessageContent message={message} theme={theme} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    messageRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    contentContainer: {
        flex: 1,
    },
    roleLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 24,
    },
});

export default MessageBubble;
