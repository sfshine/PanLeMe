import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Message, StreamingMessage } from '../../types/ChatTypes';
import { registerMessageRenderer } from './MessageRegistry';
import TypewriterText from '../TypewriterText';
import { chatStore } from '../../store/ChatStore';
import { View } from 'react-native';
import { Text } from '@rneui/themed';

const StreamingMessageComponent = observer(({ message, theme }: { message: Message, theme: any }) => {
    const msg = message as StreamingMessage;

    useEffect(() => {
        if (msg.status === 'pending') {
            chatStore.startStreaming(msg.id);
        }
    }, [msg.id, msg.status]);

    const isStreaming = msg.status === 'loading';

    // If interrupted, we treat it as not streaming.
    // We can add a visual indicator for interrupted or failed states if needed.

    return (
        <View>
            <TypewriterText
                content={msg.content}
                isStreaming={isStreaming}
                theme={theme}
                speed={isStreaming ? 30 : 0}
            />
            {msg.status === 'failed' && (
                <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>生成失败</Text>
            )}
            {msg.status === 'interrupted' && (
                <Text style={{ color: theme.colors.grey3, fontSize: 12, marginTop: 4 }}>已停止生成</Text>
            )}
        </View>
    );
});

const StreamingMessageRenderer = {
    type: 'streaming' as const,
    render: (message: Message, theme: any) => {
        return <StreamingMessageComponent message={message} theme={theme} />;
    }
};

registerMessageRenderer(StreamingMessageRenderer);

export default StreamingMessageRenderer;
