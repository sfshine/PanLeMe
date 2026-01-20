import React from 'react';
import { Text } from '@rneui/themed';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Message, TextMessage } from '../../types/ChatTypes';
import { registerMessageRenderer } from './MessageRegistry';

import { observer } from 'mobx-react-lite';
import TypewriterText from '../TypewriterText';
import { chatStore } from '../../store/ChatStore';

const TextMessageComponent = observer(({ message, theme }: { message: Message, theme: any }) => {
    const msg = message as TextMessage;

    return (
        <TypewriterText
            content={msg.content}
            theme={theme}
            isStreaming={!msg.shouldAnimate} // If shouldAnimate is true, we want local animation (isStreaming=false)
            onComplete={() => {
                if (msg.shouldAnimate) {
                    chatStore.markMessageAnimationCompleted(msg.id);
                }
            }}
        />
    );
});

const TextMessageRenderer = {
    type: 'text' as const,
    render: (message: Message, theme: any) => {
        return <TextMessageComponent message={message} theme={theme} />;
    }
};

registerMessageRenderer(TextMessageRenderer);

export default TextMessageRenderer;
