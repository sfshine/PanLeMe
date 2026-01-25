import { makeAutoObservable, runInAction } from 'mobx';
import { Alert } from 'react-native';
import { LLMService } from '../services/LLMService';
import { StorageService, StorageKeys } from '../services/StorageService';
import { userStore } from './UserStore';
import { Message, SessionType, Session } from '../types/ChatTypes';
// import { Prompts } from '../config/Prompts'; // Removed
import { Bots } from '../config/Bots';
import { captureException, addBreadcrumb, setContext, trackEvent } from '../services/SentryService';

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
    private lastSaveTime: number = 0;
    private readonly SAVE_THROTTLE_MS = 1000;

    // 获取有效日期：凌晨2点前算前一天
    private getEffectiveDate(): string {
        const now = new Date();
        const hour = now.getHours();
        const effectiveDate = hour < 2
            ? new Date(now.getTime() - 24 * 60 * 60 * 1000)  // 减去1天
            : now;
        return effectiveDate.toLocaleDateString();
    }

    // 获取会话时间戳对应的有效日期
    private getEffectiveDateForTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const hour = date.getHours();
        const effectiveDate = hour < 2
            ? new Date(date.getTime() - 24 * 60 * 60 * 1000)
            : date;
        return effectiveDate.toLocaleDateString();
    }

    // 格式化日期和时间：2026/1/24 23:42
    private formatDateWithTime(date: Date): string {
        const dateStr = date.toLocaleDateString();
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `${dateStr} ${timeStr}`;
    }

    constructor() {
        makeAutoObservable(this);
        this.loadSessions();
    }

    loadSessions() {
        const storedWrapper = StorageService.getString(StorageKeys.CHAT_SESSIONS);
        if (storedWrapper) {
            try {
                this.sessions = JSON.parse(storedWrapper);
                addBreadcrumb('storage', 'Sessions loaded', { count: this.sessions.length });
            } catch (e) {
                console.error("Failed to parse sessions", e);
                captureException(e, {
                    context: 'loadSessions',
                    storedWrapperLength: storedWrapper.length,
                });
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
            const effectiveDate = this.getEffectiveDate();
            const now = new Date();

            // 检查同一天是否已有相同类型的会话
            const hasSameDaySession = this.sessions.some(s => {
                if (s.type !== this.sessionType) return false;
                const sessionDate = this.getEffectiveDateForTimestamp(s.timestamp);
                return sessionDate === effectiveDate;
            });

            // 如果同一天已有会话，标题追加时间；否则只用日期
            const title = bot
                ? hasSameDaySession
                    ? `${bot.title}-${this.formatDateWithTime(now)}`
                    : `${bot.title}-${effectiveDate}`
                : hasSameDaySession
                    ? `新会话-${this.formatDateWithTime(now)}`
                    : `新会话-${effectiveDate}`;

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

                // Track session loaded event
                trackEvent('session_loaded', {
                    sessionId: id,
                    sessionType: this.sessionType,
                    messageCount: this.messages.length,
                });
                setContext('current_session', {
                    sessionId: id,
                    sessionType: this.sessionType,
                });

                // [Fix] Handle interrupted messages
                let hasChanges = false;
                this.messages.forEach(m => {
                    if (m.type === 'streaming' && (m.status === 'loading' || m.status === 'pending')) {
                        m.status = 'interrupted';
                        hasChanges = true;
                    }
                });
                if (hasChanges) {
                    this.saveCurrentSession();
                }

            } catch (e) {
                console.error(e);
                captureException(e, {
                    context: 'loadSession',
                    sessionId: id,
                });
            }
        }
    }

    deleteSession(id: string) {
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveSessions();
        StorageService.removeItem(`session_${id}`);
        if (this.currentSessionId === id) {
            this.sessionType = 'unselected'; // Prevent startNewSession from saving this deleted session
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
            // Track session creation event
            trackEvent('session_created', {
                sessionType: type,
                sessionId: this.currentSessionId,
            });
            setContext('current_session', {
                sessionId: this.currentSessionId,
                sessionType: type,
            });
        }
    }

    startOrSwitchToSession(type: SessionType) {
        // 1. Check if we already have a session of this type from today (凌晨2点前算前一天)
        const today = this.getEffectiveDate();
        const existingSession = this.sessions.find(s => {
            if (s.type !== type) return false;
            const sessionDate = this.getEffectiveDateForTimestamp(s.timestamp);
            return sessionDate === today;
        });

        if (existingSession) {
            Alert.alert(
                '发现今日已有会话',
                '您想继续之前的会话，还是开始一个新的会话？',
                [
                    {
                        text: '继续之前的',
                        onPress: () => {
                            if (this.sessionType !== 'unselected') {
                                this.saveCurrentSession();
                            }
                            this.loadSession(existingSession.id);
                        }
                    },
                    {
                        text: '开始新的',
                        style: 'destructive',
                        onPress: () => {
                            // Save current if needed before switching
                            if (this.sessionType !== 'unselected') {
                                this.saveCurrentSession();
                            }
                            this.startNewSession(type);
                        }
                    }
                ]
            );
        } else {
            // Start new
            this.startNewSession(type);
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

        // Track message sent event
        addBreadcrumb('user_action', 'Message sent', {
            sessionType: this.sessionType,
            messageLength: content.length,
        });
        trackEvent('message_sent', {
            sessionType: this.sessionType,
            sessionId: this.currentSessionId,
            messageLength: content.length,
        });

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
        this.lastSaveTime = Date.now(); // Reset throttle timer

        // Prepare Context (excluding this message and newer ones, although mostly this is latest)
        // Actually strictly speaking we should send messages up to this point.
        const previousMessages = this.messages.slice(0, msgIndex).map(m => {
            return {
                role: m.role,
                content: m.content,
                timestamp: m.timestamp
            };
        });

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

        console.log(`[ChatStore] Request Payload for ${messageId}:`, JSON.stringify(fullMessages, null, 2));

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
                const currentBuffer = (this.streamBuffers.get(messageId) || '') + delta;
                this.streamBuffers.set(messageId, currentBuffer);
                this.notifyListeners(messageId, currentBuffer);

                // [Persistence] Throttled save to disk
                const now = Date.now();
                if (now - this.lastSaveTime > this.SAVE_THROTTLE_MS) {
                    runInAction(() => {
                        const currentMsg = this.messages.find(m => m.id === messageId);
                        if (currentMsg) {
                            currentMsg.content = currentBuffer;
                            this.saveCurrentSession();
                            this.lastSaveTime = now;
                        }
                    });
                }
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
                // Track streaming error in Sentry
                captureException(err, {
                    context: 'startStreaming',
                    messageId,
                    sessionType: this.sessionType,
                    errorStatus: err.status,
                });
                
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




    deleteMessage(id: string) {
        this.messages = this.messages.filter(m => m.id !== id);
        this.saveCurrentSession();
    }

    markMessageAnimationCompleted(id: string) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) {
            msg.shouldAnimate = false;
            this.saveCurrentSession();
        }
    }

    async generateSummary() {
        if (!userStore.apiKey) return;

        // Track summary generation event
        addBreadcrumb('user_action', 'Summary generation started', {
            sessionType: this.sessionType,
            sessionId: this.currentSessionId,
        });
        trackEvent('summary_generation_started', {
            sessionType: this.sessionType,
            sessionId: this.currentSessionId,
            messageCount: this.messages.length,
        });

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

        runInAction(() => {
            // this.messages.push(aiMessage) - done via addMessage
            // Update to loading immediately to prevent component from triggering standard logic
            const msg = this.messages.find(m => m.id === aiMsgId);
            if (msg && msg.type === 'streaming') msg.status = 'loading';
        });

        // Gather user messages with timestamp
        const userMessages = this.messages
            .filter(m => m.role === 'user' && m.type !== 'request-summary')
            .map(m => ({
                role: m.role,
                content: m.content,
                time: new Date(m.timestamp).toLocaleTimeString()
            }));

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

        const historyJson = JSON.stringify(userMessages);

        const promptMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: historyJson },
            { role: 'user', content: "请根据以上对话历史数据生成今日复盘" }
        ];
        console.log('[ChatStore] promptMessages', promptMessages);
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

                    // Track summary generation completed
                    trackEvent('summary_generation_completed', {
                        sessionType: this.sessionType,
                        sessionId: this.currentSessionId,
                    });

                    // Update Badge/Title
                    const session = this.sessions.find(s => s.id === this.currentSessionId);
                    if (session) {
                        session.title = `今日复盘-${this.getEffectiveDate()}`;
                        this.saveSessions();
                    }
                });
            },
            (err) => {
                // Track summary generation error in Sentry
                captureException(err, {
                    context: 'generateSummary',
                    sessionType: this.sessionType,
                    errorStatus: err.status,
                });
                
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
        return false;
    }
}

export const chatStore = new ChatStore();
