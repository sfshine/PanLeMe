import { makeAutoObservable, runInAction } from 'mobx';
import { LLMService } from '../services/LLMService';
import { StorageService, StorageKeys } from '../services/StorageService';
import { userStore } from './UserStore'; // To get API Key

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type SessionType = 'happy' | 'daily' | 'unselected';

class ChatStore {
  messages: Message[] = [];
  isStreaming: boolean = false;
  sessionType: SessionType = 'happy';
  currentSessionId: string | null = null;
  abortController: (() => void) | null = null;

  sessions: { id: string; title: string; type: SessionType; timestamp: number }[] = [];

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
          content: "你好呀～我是你的专属觉察助手😘 今天有没有遇到什么开心的小事？可以先和我分享**第一件**开心的事哦～",
          timestamp: Date.now(),
        });
      } else {
           // Daily record greeting
           this.addMessage({
             id: Date.now().toString(),
             role: 'assistant',
             content: "我是你的生活记录助手📝。无论是日常琐事还是重要时刻，随时发给我，我会为你妥善记录。",
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
        systemPrompt = "你是一位温柔的心理疗愈助手，擅长用亲切的语气和用户互动，回复需包含表情符号和适量富文本格式（加粗/斜体）。请根据用户分享的开心事，按以下要求生成反馈：1. 提及至少1个具体的开心点，用加粗突出；2. 语言温暖有感染力，搭配合适的表情（如✨😆🥰）；3. 结尾用一句简短的鼓励语，可加斜体；4. 总字数控制在50-80字。";
    } else {
        // Daily Record Prompt
        systemPrompt = "你是一位耐心的生活记录陪伴者。请注意：1. 你的角色是倾听者，而非建议者；2. 对用户的记录给予简单、温暖的反馈即可；3. 严禁使用夸张的赞美或过于激动的语气；4. 严禁使用加粗/标题等复杂格式，仅使用纯文本和少量Emoji。";
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

      const systemPrompt = "你是一位贴心的生活复盘助手，回复需包含表情和富文本格式，按照以下结构生成睡前复盘：\n1. 开篇总结：用一句话概括记录的整体状态，加表情（如😌✨），关键描述加粗；\n2. 流水账整理：按时间顺序逐条列出「**HH:MM**：XXX」，清晰明了；\n3. 结尾感悟：提炼1个小亮点或小感悟，加斜体，语气温柔。\n要求：总字数150字以内，排版整洁。";

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
