import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
    const isUser = message.role === 'user';

    return (
        <View style={[
            styles.messageRow,
            { backgroundColor: isUser ? theme.colors.background : theme.colors.grey0 }
        ]}>
            {/* Avatar */}
            <View style={[
                styles.avatar,
                { backgroundColor: isUser ? theme.colors.primary : theme.colors.grey4 }
            ]}>
                {isUser ? (
                    <Text style={styles.avatarText}>你</Text>
                ) : (
                    <Icon name="star" type="feather" color="#10a37f" size={16} />
                )}
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                <Text style={[styles.roleLabel, { color: theme.colors.black }]}>
                    {isUser ? '你' : '盘'}
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
