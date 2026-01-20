export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type StreamStatus = 'pending' | 'loading' | 'completed' | 'failed' | 'interrupted';

export interface TextMessage extends BaseMessage {
  type: 'text';
}

export interface StreamingMessage extends BaseMessage {
  type: 'streaming';
  status: StreamStatus;
}

export type Message = TextMessage | StreamingMessage;

export type SessionType = 'happy' | 'daily' | 'unselected';

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  timestamp: number;
}
