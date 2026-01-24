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
    const [currentContent, setCurrentContent] = React.useState(msg.content);

    useEffect(() => {
        // Always sync with message content initially (e.g. if loaded from history)
        setCurrentContent(msg.content);

        if (msg.status === 'loading' || msg.status === 'pending') {
            const unsub = chatStore.subscribeToStream(msg.id, (content) => {
                setCurrentContent(content);
            });

            if (msg.status === 'pending') {
                chatStore.startStreaming(msg.id);
            }
            return unsub;
        }
    }, [msg.id, msg.status, msg.content]);

    // We treat 'completed'/'failed'/'interrupted' as "streaming=true" for the TypewriterText component
    // because that tells it to render content immediately without the character-by-character animation.
    // We only want the animation (via stream updates) or immediate render, never the post-stream re-typing.
    const isStreaming = msg.status === 'loading' || msg.status === 'completed' || msg.status === 'failed' || msg.status === 'interrupted';

    // If interrupted, we treat it as not streaming.
    // We can add a visual indicator for interrupted or failed states if needed.

    return (
        <View>
            <TypewriterText
                content={currentContent}
                isStreaming={isStreaming}
                theme={theme}
                speed={isStreaming ? 30 : 0}
            />
            {msg.status === 'failed' && (
                <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>生成失败</Text>
            )}
            {msg.status === 'interrupted' && (
                <Text style={{ color: 'red', fontSize: 12, marginTop: 4 }}>生成中断</Text>
            )
            }
        </View >
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
