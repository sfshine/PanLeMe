import { makeAutoObservable, runInAction } from 'mobx';
import { LLMService } from '../services/LLMService';
import { StorageService, StorageKeys } from '../services/StorageService';
import { userStore } from './UserStore';
import { Message, SessionType, Session } from '../types/ChatTypes';
import { Prompts } from '../config/Prompts';

class ChatStore {
  messages: Message[] = [];
  isStreaming: boolean = false;
  sessionType: SessionType = 'happy';
  currentSessionId: string | null = null;
  abortController: (() => void) | null = null;

  sessions: Session[] = [];

  constructor() {
    makeAutoObservable(this);
    this.loadSessions();
  }

  loadSessions() {
    const storedWrapper = StorageService.getString(StorageKeys.CHAT_SESSIONS);
    if (storedWrapper) {
      try {
        this.sessions = JSON.parse(storedWrapper);
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }

  saveSessions() {
    StorageService.setString(StorageKeys.CHAT_SESSIONS, JSON.stringify(this.sessions));
  }

  saveCurrentSession() {
      if (!this.currentSessionId || this.sessionType === 'unselected') return;
      
      const key = `session_${this.currentSessionId}`;
      StorageService.setString(key, JSON.stringify(this.messages));
      
      // Update session list if new or title changed (MVP: Title = Date)
      const existing = this.sessions.find(s => s.id === this.currentSessionId);
      if (!existing) {
          const title = this.sessionType === 'happy' 
            ? `今日小确幸-${new Date().toLocaleDateString()}` 
            : `生活记录-${new Date().toLocaleDateString()}`;
            
          this.sessions.unshift({
              id: this.currentSessionId,
              title,
              type: this.sessionType,
              timestamp: Date.now()
          });
          this.saveSessions();
      }
  }

  loadSession(id: string) {
     const key = `session_${id}`;
     const stored = StorageService.getString(key);
     if (stored) {
         try {
             this.messages = JSON.parse(stored);
             this.currentSessionId = id;
             const session = this.sessions.find(s => s.id === id);
             if (session) this.sessionType = session.type;
         } catch (e) { console.error(e) }
     }
  }

  deleteSession(id: string) {
      this.sessions = this.sessions.filter(s => s.id !== id);
      this.saveSessions();
      StorageService.removeItem(`session_${id}`);
      if (this.currentSessionId === id) {
          this.startNewSession('happy'); // Reset to default
      }
  }

  startNewSession(type: SessionType = 'unselected') {
    // Only save if it was a valid session
    if (this.sessionType !== 'unselected') {
        this.saveCurrentSession(); 
    }
    
    this.messages = [];
    this.sessionType = type;
    this.currentSessionId = Date.now().toString();
    this.isStreaming = false;
    
    if (type !== 'unselected') {
        this.initializeSession(type);
    }
  }

  initializeSession(type: SessionType) {
      this.sessionType = type;
      
      // Initial Prompt triggers
      if (type === 'happy') {
        this.addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: Prompts.Happy.Initial,
          timestamp: Date.now(),
        });
      } else {
           // Daily record greeting
           this.addMessage({
             id: Date.now().toString(),
             role: 'assistant',
             content: Prompts.Daily.Initial,
             timestamp: Date.now(),
           });
      }
      this.saveCurrentSession();
  }

  addMessage(msg: Message) {
    this.messages.push(msg);
    this.saveCurrentSession(); // Auto-save on new message
  }

  async sendMessage(content: string) {
    if (!content.trim()) return;

    // 1. Add User Message
    this.addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    });

    // 2. Prepare Context
    const contextMessages = this.messages.map(m => ({ role: m.role, content: m.content }));
    
    // 3. Start Streaming AI Response
    this.isStreaming = true;
    const aiMsgId = (Date.now() + 1).toString();
    
    const aiMessage: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '', // Start empty
      timestamp: Date.now(),
      isStreaming: true
    };
    this.addMessage(aiMessage); // This calls saveCurrentSession, which saves empty AI msg

    let systemPrompt = "";
    if (this.sessionType === 'happy') {
        systemPrompt = Prompts.Happy.System;
    } else {
        // Daily Record Prompt
        systemPrompt = Prompts.Daily.System;
    }
    
    console.log(`[ChatStore] sendMessage - Type: ${this.sessionType}, Prompt: ${systemPrompt}`);

    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages
    ];

    if (!userStore.apiKey) {
        this.updateMessage(aiMsgId, "Error: API Key missing.");
        this.isStreaming = false;
        return;
    }

    this.abortController = LLMService.streamCompletion(
      fullMessages,
      userStore.apiKey,
      (delta) => {
        runInAction(() => {
            const msgIndex = this.messages.findIndex(m => m.id === aiMsgId);
            if (msgIndex !== -1) {
                this.messages[msgIndex].content += delta;
                // Optimization: don't save on every char, maybe save on finish
            }
        });
      },
      () => {
        runInAction(() => {
            this.isStreaming = false;
            const msgIndex = this.messages.findIndex(m => m.id === aiMsgId);
            if(msgIndex !== -1) {
                this.messages[msgIndex].isStreaming = false;
            }
            this.saveCurrentSession(); // Save full AI message
        });
      },
      (err) => {
        runInAction(() => {
            this.isStreaming = false;
             this.updateMessage(aiMsgId, "\n[Error: " + err.message + "]");
             this.saveCurrentSession();
        });
      },
      'deepseek-chat',
      userStore.baseUrl
    );
  }

  updateMessage(id: string, content: string) {
    const msg = this.messages.find(m => m.id === id);
    if (msg) msg.content = content;
  }
  
  async generateSummary() {
      if (this.sessionType !== 'daily' || !userStore.apiKey) return;
      
      this.isStreaming = true;
      const aiMsgId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true
      };
      this.addMessage(aiMessage);

      // Gather content
      const records = this.messages
          .filter(m => m.role === 'user')
          .map(m => `${new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}: ${m.content}`)
          .join('\n');

      const systemPrompt = Prompts.Summary.System;

      const promptMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户会话记录：${records}` }
      ];
      console.log("[ChatStore] Generating Summary. Records:", records);
      console.log("[ChatStore] Summary System Prompt:", systemPrompt);

      this.abortController = LLMService.streamCompletion(
        promptMessages, // Note: Not sending full history usually for specific summary, but here we summarize *records*
        // Requirement says "Summarize this session records".
        userStore.apiKey,
        (delta) => {
             runInAction(() => {
                const msgIndex = this.messages.findIndex(m => m.id === aiMsgId);
                if (msgIndex !== -1) {
                    this.messages[msgIndex].content += delta;
                }
             });
        },
        () => {
             runInAction(() => {
                this.isStreaming = false;
                const msgIndex = this.messages.findIndex(m => m.id === aiMsgId);
                if(msgIndex !== -1) this.messages[msgIndex].isStreaming = false;
                this.saveCurrentSession();
                
                // Update Badge/Title
                const session = this.sessions.find(s => s.id === this.currentSessionId);
                if (session) {
                    session.title = `今日复盘-${new Date().toLocaleDateString()}`;
                    this.saveSessions();
                }
             });
        },
        (err) => {
             runInAction(() => {
                this.isStreaming = false;
                this.updateMessage(aiMsgId, "\n[Summary Error: " + err.message + "]");
             });
        },
        'deepseek-chat',
        userStore.baseUrl
      );
  }

  get needsSummary() {
      if (this.sessionType !== 'daily' || this.messages.length === 0) return false;
      const hour = new Date().getHours();
      // 22:00 - 23:30 (Requirement)
      // Check if already summarized (last message is assistant?)
      const lastMsg = this.messages[this.messages.length - 1];
      const hasSummary = lastMsg.role === 'assistant' && lastMsg.content.includes("复盘");
      
      return (hour >= 20 || (hour === 23 && new Date().getMinutes() <= 30)) && !hasSummary;
  }
}

export const chatStore = new ChatStore();
