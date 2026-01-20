import React from 'react';
import { Text } from '@rneui/themed';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message, TextMessage } from '../../types/ChatTypes';
import { registerMessageRenderer } from './MessageRegistry';

const TextMessageRenderer = {
    type: 'text' as const,
    render: (message: Message, theme: any) => {
        const msg = message as TextMessage;
        return (
            <Markdown style={{
                body: { color: theme.colors.black, fontSize: 16 },
                paragraph: { marginTop: 0, marginBottom: 0 }
            }}>
                {msg.content}
            </Markdown>
        );
    }
};

registerMessageRenderer(TextMessageRenderer);

export default TextMessageRenderer;
