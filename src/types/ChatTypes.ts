export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type SessionType = 'happy' | 'daily' | 'unselected';

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  timestamp: number;
}
