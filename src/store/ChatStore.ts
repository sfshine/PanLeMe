import { makeAutoObservable, runInAction } from 'mobx';
import { LLMService } from '../services/LLMService';
import { StorageService, StorageKeys } from '../services/StorageService';
import { userStore } from './UserStore';
import { Message, SessionType, Session } from '../types/ChatTypes';
// import { Prompts } from '../config/Prompts'; // Removed
import { Bots } from '../config/Bots';

class ChatStore {
    messages: Message[] = [];
    isStreaming: boolean = false;
    sessionType: SessionType = 'happy';
    currentSessionId: string | null = null;
    abortController: (() => void) | null = null;
    apiErrorStatus: number | null = null;
    hasShownSummaryPrompt: boolean = false;

    sessions: Session[] = [];

    // Optimization: Stream buffers and listeners to avoid frequent MobX updates
    private streamBuffers: Map<string, string> = new Map();
    private streamListeners: Map<string, (content: string) => void> = new Map();

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

        // Optimization: Don't save if it's a new session and user hasn't sent anything yet
        const existing = this.sessions.find(s => s.id === this.currentSessionId);
        const hasUserMessage = this.messages.some(m => m.role === 'user');

        if (!existing && !hasUserMessage) {
            return;
        }

        const key = `session_${this.currentSessionId}`;
        StorageService.setString(key, JSON.stringify(this.messages));

        // Update session list if new or title changed (MVP: Title = Date)
        if (!existing) {
            const bot = Bots.find(b => b.id === this.sessionType);
            const title = bot
                ? `${bot.title}-${new Date().toLocaleDateString()}`
                : `新会话-${new Date().toLocaleDateString()}`;

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
                this.hasShownSummaryPrompt = false;
            } catch (e) { console.error(e) }
        }
    }

    deleteSession(id: string) {
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveSessions();
        StorageService.removeItem(`session_${id}`);
        if (this.currentSessionId === id) {
            this.startNewSession('unselected'); // Reset to default
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
        this.hasShownSummaryPrompt = false;

        if (type !== 'unselected') {
            this.initializeSession(type);
        }
    }

    initializeSession(type: SessionType) {
        this.sessionType = type;

        const bot = Bots.find(b => b.id === type);
        if (bot) {
            this.addMessage({
                id: Date.now().toString(),
                role: 'assistant',
                content: bot.initialMessage,
                timestamp: Date.now(),
                type: 'text',
                shouldAnimate: true
            });
        }
        this.saveCurrentSession();
    }

    markSummaryPromptShown() {
        this.hasShownSummaryPrompt = true;
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
            type: 'text'
        });

        // 3. Prepare AI Message Placeholder
        const aiMsgId = (Date.now() + 1).toString();
        const aiMessage: Message = {
            id: aiMsgId,
            role: 'assistant',
            content: '', // Start empty, will be filled on completion
            timestamp: Date.now(),
            type: 'streaming',
            status: 'pending'
        };

        // 4. Cancel previous streams and add new message
        this.cancelAllStreams();
        this.addMessage(aiMessage);
    }

    subscribeToStream(id: string, callback: (content: string) => void): () => void {
        this.streamListeners.set(id, callback);

        // If there's already buffered content, send it immediately
        if (this.streamBuffers.has(id)) {
            callback(this.streamBuffers.get(id) || '');
        }

        return () => {
            this.streamListeners.delete(id);
        };
    }

    private notifyListeners(id: string, content: string) {
        const listener = this.streamListeners.get(id);
        if (listener) {
            listener(content);
        }
    }

    cancelAllStreams() {
        // Abort current request
        if (this.abortController) {
            this.abortController();
            this.abortController = null;
        }
        this.isStreaming = false;
        this.streamBuffers.clear();
        // We don't clear listeners here, they will unsubscribe themselves or getting interrupted status update

        // Update statuses
        runInAction(() => {
            this.messages.forEach(msg => {
                if (msg.type === 'streaming' && (msg.status === 'loading' || msg.status === 'pending')) {
                    msg.status = 'interrupted';
                }
            });
        });
    }

    startStreaming(messageId: string) {
        const msgIndex = this.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;

        const msg = this.messages[msgIndex];
        if (msg.type !== 'streaming') return;
        if (msg.status !== 'pending' && msg.status !== 'failed') return;

        runInAction(() => {
            msg.status = 'loading';
            this.isStreaming = true; // Global flag maybe still useful for UI indicators
        });

        // Initialize buffer
        this.streamBuffers.set(messageId, '');
        this.notifyListeners(messageId, '');

        // Prepare Context (excluding this message and newer ones, although mostly this is latest)
        // Actually strictly speaking we should send messages up to this point.
        const previousMessages = this.messages.slice(0, msgIndex).map(m => ({ role: m.role, content: m.content }));

        let systemPrompt = "";
        const bot = Bots.find(b => b.id === this.sessionType);
        if (bot) {
            systemPrompt = bot.systemPrompt;
        }

        // Fallback or legacy handling if needed, but optimally we expect a valid bot


        console.log(`[ChatStore] startStreaming - ID: ${messageId}, Type: ${this.sessionType}`);

        const fullMessages = [
            { role: 'system', content: systemPrompt },
            ...previousMessages
        ];

        if (!userStore.apiKey) {
            runInAction(() => {
                msg.status = 'failed';
                msg.content = "Error: API Key missing.";
                this.saveCurrentSession();
                this.streamBuffers.delete(messageId);
            });
            return;
        }

        this.abortController = LLMService.streamCompletion(
            fullMessages,
            userStore.apiKey,
            (delta) => {
                // Update buffer and notify listener directly
                // NO MobX action needed for this part
                const currentBuffer = (this.streamBuffers.get(messageId) || '') + delta;
                this.streamBuffers.set(messageId, currentBuffer);
                this.notifyListeners(messageId, currentBuffer);
            },
            () => {
                runInAction(() => {
                    this.isStreaming = false;
                    const currentMsgIndex = this.messages.findIndex(m => m.id === messageId);
                    if (currentMsgIndex !== -1) {
                        const currentMsg = this.messages[currentMsgIndex];
                        if (currentMsg.type === 'streaming') {
                            currentMsg.status = 'completed';
                            // Final commit to MobX state
                            currentMsg.content = this.streamBuffers.get(messageId) || currentMsg.content;
                        }
                    }
                    this.streamBuffers.delete(messageId);
                    this.saveCurrentSession();
                });
            },
            (err) => {
                runInAction(() => {
                    this.isStreaming = false;
                    const currentMsgIndex = this.messages.findIndex(m => m.id === messageId);
                    if (currentMsgIndex !== -1) {
                        const currentMsg = this.messages[currentMsgIndex];
                        if (currentMsg.type === 'streaming') {
                            currentMsg.status = 'failed';
                            const buffer = this.streamBuffers.get(messageId) || '';
                            currentMsg.content = buffer + `\n[Error: ${err.message}]`;

                            if (err.status === 401 || err.status === 402) {
                                this.apiErrorStatus = err.status;
                            }
                        }
                    }
                    this.streamBuffers.delete(messageId);
                    this.saveCurrentSession();
                });
            },
            'deepseek-chat',
            userStore.baseUrl
        );
    }

    clearApiError() {
        this.apiErrorStatus = null;
    }

    updateMessage(id: string, content: string) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) msg.content = content;
    }



    markMessageAnimationCompleted(id: string) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) {
            msg.shouldAnimate = false;
            this.saveCurrentSession();
        }
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
            type: 'streaming',
            status: 'pending'
        };
        this.cancelAllStreams();

        // [NEW] Insert hidden request message to track state
        const requestMsg: Message = {
            id: Date.now().toString(),
            role: 'user', // conceptual role, but type is what matters for UI hiding
            content: '请求生成今日复盘', // Text for debugging if needed
            timestamp: Date.now(),
            type: 'request-summary'
        };
        this.addMessage(requestMsg);

        this.addMessage(aiMessage);

        // We need to special case summary generation because it uses a different prompt strategy
        // For now, let's just use the startStreaming structure but we might need a flag or separate method
        // if the prompt logic is vastly different.
        // The current startStreaming uses standard prompts. Summary uses specific prompt.
        // To keep it clean, we might need to handle 'summary' specific logic in startStreaming or kept here.

        // WAIT. If we use a pull model, the component will call startStreaming.
        // But startStreaming uses the SessionType to decide prompt.
        // Summary is a special action.
        // Maybe we can create a special message type or just handle it here directly?

        // User requirement: "Streaming request should be in the streaming component... only call LLMService if not received".
        // This implies unify logic.

        // For summary, it is triggered by user button, not automatic flow.
        // Let's manually trigger it here but using the same status update logic for consistency?

        // Actually, if we add the message with 'pending', the renderer will try to call 'startStreaming'.
        // But 'startStreaming' logic (above) uses the standard system prompt.
        // Summary needs a DIFFERENT system prompt.

        // Solution: Add a 'mode' or 'promptType' to StreamingMessage?
        // Or just keep summary logic separate but use the same status fields?
        // The user said: "request should be in the streaming component".
        // If we keep summary logic here, it violates "request in component".
        // But summary message is just an assistant message.

        // Let's stick to the decoupled plan:
        // The summary generation IS a form of streaming.
        // If we want to strictly follow "request in component", we need the component to know HOW to request.
        // Since `startStreaming` is central, we can pass extra params or infer from context?
        // Or we can just execute it here for Summary (since it's a specific action) but use the statuses.
        // The main goal is "prevent interruption issue".

        // Let's implement the logic here for Summary to use the same Status flow for now,
        // but we won't rely on the component to TRIGGER it (since it's not a standard chat flow).
        // Wait, if we add it as 'pending', the component WILL trigger startStreaming.
        // We should probably mark it as 'loading' immediately here so component doesn't trigger startStreaming?
        // OR update startStreaming to handle Summary?

        // Let's mark it as 'loading' and execute here. Use the same status updates.

        runInAction(() => {
            // this.messages.push(aiMessage) - done via addMessage
            // Update to loading immediately to prevent component from triggering standard logic
            const msg = this.messages.find(m => m.id === aiMsgId);
            if (msg && msg.type === 'streaming') msg.status = 'loading';
        });

        // Gather content
        const records = this.messages
            .filter(m => m.role === 'user')
            .map(m => `${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${m.content}`)
            .join('\n');

        const bot = Bots.find(b => b.id === this.sessionType);
        const summaryConfig = bot?.summary;

        if (!summaryConfig) {
            runInAction(() => {
                this.isStreaming = false;
                const msg = this.messages.find(m => m.id === aiMsgId);
                if (msg && msg.type === 'streaming') {
                    msg.status = 'failed';
                    msg.content = "Error: Summary configuration not found for this bot.";
                }
                this.saveCurrentSession();
            });
            return;
        }

        const systemPrompt = summaryConfig.systemPrompt;

        const promptMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `用户会话记录：${records}` }
        ];

        this.abortController = LLMService.streamCompletion(
            promptMessages,
            userStore.apiKey,
            (delta) => {
                // Buffer logic for summary too?
                // Yes, let's use the same buffer mechanics for consistency, 
                // although summary is often not as critical for list scroll.
                const currentBuffer = (this.streamBuffers.get(aiMsgId) || '') + delta;
                this.streamBuffers.set(aiMsgId, currentBuffer);
                this.notifyListeners(aiMsgId, currentBuffer);
            },
            () => {
                runInAction(() => {
                    this.isStreaming = false;
                    const msgIndex = this.messages.findIndex(m => m.id === aiMsgId);
                    if (msgIndex !== -1) {
                        const msg = this.messages[msgIndex];
                        if (msg.type === 'streaming') {
                            msg.status = 'completed';
                            msg.content = this.streamBuffers.get(aiMsgId) || msg.content;
                        }
                    }
                    this.streamBuffers.delete(aiMsgId);
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
                    const msgIndex = this.messages.findIndex(m => m.id === aiMsgId);
                    if (msgIndex !== -1) {
                        const msg = this.messages[msgIndex];
                        if (msg.type === 'streaming') {
                            msg.status = 'failed';
                            const buffer = this.streamBuffers.get(aiMsgId) || '';
                            msg.content = buffer + `\n[Summary Error: ${err.message}]`;

                            if (err.status === 401 || err.status === 402) {
                                this.apiErrorStatus = err.status;
                            }
                        }
                    }
                    this.streamBuffers.delete(aiMsgId);
                    this.saveCurrentSession();
                });
            },
            'deepseek-chat',
            userStore.baseUrl
        );
    }

    get needsSummary() {
        if (this.messages.length === 0) return false;

        // 如果没有用户发送的消息，不需要复盘
        const hasUserMessage = this.messages.some(m => m.role === 'user' && m.type !== 'request-summary');
        if (!hasUserMessage) return false;

        const bot = Bots.find(b => b.id === this.sessionType);
        const summaryConfig = bot?.summary;

        if (!summaryConfig) return false;

        const { promptStartTime = 20, promptDuration = 5 } = summaryConfig;

        // Calculate end hour (e.g., 20 + 5 = 25 -> 1 AM next day)
        // If current hour is within [start, start + duration)
        // Handle wrapping around midnight
        const endHour = promptStartTime + promptDuration;
        const currentHour = new Date().getHours();

        let isInTimeWindow = false;
        if (endHour <= 24) {
            isInTimeWindow = currentHour >= promptStartTime && currentHour < endHour;
        } else {
            // Wraps around midnight (e.g. 22 to 03) -> 22..24 OR 0..3
            const overflow = endHour - 24;
            isInTimeWindow = (currentHour >= promptStartTime) || (currentHour < overflow);
        }

        if (!isInTimeWindow) return false;

        // Check if already summarized (last message is assistant and contains specific content/flag)
        // Better: check if an assistant message exists AFTER the start time of the window today?
        // Simple check as per original logic: last message is assistant?
        // But user might chat more. 
        // Let's stick to "hasSummary" logic but maybe robustify it later.

        const lastMsg = this.messages[this.messages.length - 1];

        // If last message is AI response
        if (lastMsg.role === 'assistant') {
            // Check if the message BEFORE it was a hidden summary request
            // We need to look at length-2
            if (this.messages.length >= 2) {
                const prevMsg = this.messages[this.messages.length - 2];
                if (prevMsg && prevMsg.type === 'request-summary') {
                    // This means the last AI message is the result of a summary request
                    // So we don't need to show the prompt again
                    return false;
                }
            }
        }

        return true;
    }
}

export const chatStore = new ChatStore();
