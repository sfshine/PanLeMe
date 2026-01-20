import React, { useEffect, useRef, useState } from 'react';
import Markdown from 'react-native-markdown-display';

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

export default TypewriterText;
