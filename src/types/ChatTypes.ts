export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  shouldAnimate?: boolean;
}

export type StreamStatus = 'pending' | 'loading' | 'completed' | 'failed' | 'interrupted';

export interface TextMessage extends BaseMessage {
  type: 'text';
}

export interface StreamingMessage extends BaseMessage {
  type: 'streaming';
  status: StreamStatus;
}

export interface SummaryRequestMessage extends BaseMessage {
  type: 'request-summary';
}

export type Message = TextMessage | StreamingMessage | SummaryRequestMessage;

export type SessionType = string;

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  timestamp: number;
}
