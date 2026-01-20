import React from 'react';
import { BaseMessage, Message, TextMessage, StreamingMessage } from '../../types/ChatTypes';

export type MessageType = 'text' | 'streaming';

export interface MessageRenderer {
    type: MessageType;
    render: (message: Message, theme: any) => React.ReactNode;
}

const messageRenderers: Map<MessageType, MessageRenderer> = new Map();

export function registerMessageRenderer(renderer: MessageRenderer): void {
    messageRenderers.set(renderer.type, renderer);
}

export function getMessageRenderer(type: MessageType): MessageRenderer | undefined {
    return messageRenderers.get(type);
}

interface Props {
    message: Message;
    theme: any;
}

export const MessageContent: React.FC<Props> = ({ message, theme }) => {
    // @ts-ignore
    const renderer = getMessageRenderer(message.type);
    if (!renderer) {
        return null;
    }
    return renderer.render(message, theme);
};
