/**
 * Chat Discovery Component
 * A friendly, conversational AI chat interface for app discovery
 * Replaces the form-based DiscoveryDialog with a natural chat experience
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ChatMessage {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  quickReplies?: string[];
  isTyping?: boolean;
}

export interface ChatDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (appConfig: Record<string, unknown>) => void;
  initialInput: string;
  isLoading?: boolean;
}

// Friendly AI personality messages
const AI_GREETINGS = [
  "Hey there! 👋",
  "Hi! I'm excited to help you build something awesome!",
  "Hello! Let's create something amazing together! ✨",
];

const AI_ACKNOWLEDGMENTS = [
  "Love it! 🎉",
  "That's awesome!",
  "Great choice! 👍",
  "Perfect!",
  "Got it! ✨",
  "Nice!",
  "Sounds exciting!",
];

const AI_THINKING = [
  "Let me think about that...",
  "Hmm, interesting...",
  "Processing that...",
];

export const ChatDiscovery: React.FC<ChatDiscoveryProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialInput,
  isLoading = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [conversationState, setConversationState] = useState<{
    step: number;
    collectedInfo: Record<string, unknown>;
    originalInput: string;
    questionsAsked: string[];
    confidence: number;
    pendingConfirmation: boolean;
    questionCount: number;
    enabledFeatures: string[];
    answers: Record<string, string>;
  }>({ 
    step: 0, 
    collectedInfo: {}, 
    originalInput: '', 
    questionsAsked: [], 
    confidence: 0.3, 
    pendingConfirmation: false,
    questionCount: 0,
    enabledFeatures: [],
    answers: {},
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset messages when chat closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setConversationState({ 
        step: 0, 
        collectedInfo: {}, 
        originalInput: '', 
        questionsAsked: [], 
        confidence: 0.3, 
        pendingConfirmation: false,
        questionCount: 0,
        enabledFeatures: [],
        answers: {},
      });
    }
  }, [isOpen]);

  // Start conversation when opened with initial input
  useEffect(() => {
    if (isOpen && initialInput && messages.length === 0) {
      console.log('🚀 Starting chat discovery with:', initialInput);
      startConversation(initialInput);
    }
  }, [isOpen, initialInput]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const simulateTyping = async (duration: number = 1000) => {
    setIsAiTyping(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsAiTyping(false);
  };

  const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const startConversation = async (userInput: string) => {
    // Add user's initial message
    addMessage({ type: 'user', content: userInput });
    
    setConversationState(prev => ({ ...prev, originalInput: userInput, step: 1 }));

    // AI greeting with typing effect
    await simulateTyping(800);
    
    // Call backend to start discovery
    try {
      const response = await fetch('/api/apps/discover/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: userInput,
          action: 'start',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start discovery');
      }

      const data = await response.json();
      
      // Show AI's friendly response
      addMessage({
        type: 'ai',
        content: data.message || `${getRandomItem(AI_GREETINGS)} I'd love to help you build that! Let me ask you a few quick questions to make sure I get it just right.`,
        quickReplies: data.quickReplies,
      });

      // If there's a follow-up question, show it after a short delay
      if (data.question) {
        await simulateTyping(600);
        addMessage({
          type: 'ai',
          content: data.question,
          quickReplies: data.options,
        });
      }

      setConversationState(prev => ({
        ...prev,
        step: data.step || 1,
        collectedInfo: data.collectedInfo || {},
        questionsAsked: data.questionsAsked || prev.questionsAsked || [],
        confidence: data.confidence || prev.confidence || 0.3,
        pendingConfirmation: data.pendingConfirmation || false,
        questionCount: data.questionCount || prev.questionCount || 0,
        enabledFeatures: data.enabledFeatures || prev.enabledFeatures || [],
        // IMPORTANT: Preserve answers for vibe/businessName to work
        answers: data.answers || prev.answers || {},
      }));

      // If discovery is complete
      if (data.complete && data.appConfig) {
        onComplete(data.appConfig);
      }

    } catch (error) {
      console.error('Discovery chat error:', error);
      // Fallback to friendly error
      addMessage({
        type: 'ai',
        content: "Oops! I had a little hiccup there. Let me try again... What type of business or project is this for?",
      });
      // Reset state on error to prevent stale state issues
      setConversationState(prev => ({
        ...prev,
        step: 1,
        questionsAsked: [],
        confidence: 0.3,
        pendingConfirmation: false,
        questionCount: 0,
        enabledFeatures: [],
        answers: {},
      }));
    }
  };

  const handleSendMessage = async (message?: string) => {
    const content = message || inputValue.trim();
    if (!content || isAiTyping || isLoading) return;

    // Add user message
    addMessage({ type: 'user', content });
    setInputValue('');

    // Show typing indicator
    await simulateTyping(600 + Math.random() * 400);

    try {
      const response = await fetch('/api/apps/discover/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: content,
          action: 'continue',
          state: conversationState,
          originalInput: conversationState.originalInput,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to continue discovery');
      }

      const data = await response.json();

      // Show acknowledgment first
      if (data.acknowledgment) {
        addMessage({ type: 'ai', content: data.acknowledgment });
        await simulateTyping(400);
      }

      // Then show the next question or completion message
      if (data.message) {
        addMessage({
          type: 'ai',
          content: data.message,
          quickReplies: data.options || data.quickReplies,
        });
      }

      setConversationState(prev => ({
        ...prev,
        step: data.step || prev.step + 1,
        collectedInfo: { ...prev.collectedInfo, ...data.collectedInfo },
        questionsAsked: data.questionsAsked || prev.questionsAsked || [],
        confidence: data.confidence || prev.confidence || 0.3,
        pendingConfirmation: data.pendingConfirmation || false,
        questionCount: data.questionCount || prev.questionCount || 0,
        enabledFeatures: data.enabledFeatures || prev.enabledFeatures || [],
        // IMPORTANT: Preserve answers for vibe/businessName to work
        answers: data.answers || prev.answers || {},
      }));

      // If discovery is complete
      if (data.complete && data.appConfig) {
        await simulateTyping(500);
        addMessage({
          type: 'ai',
          content: data.completionMessage || "Perfect! I've got everything I need. Let me build your app now! 🚀",
        });
        setTimeout(() => onComplete(data.appConfig), 1500);
      }

    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        type: 'ai',
        content: "Hmm, I didn't quite catch that. Could you tell me a bit more?",
      });
    }
  };

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <div>
              <h2 className="text-primary-foreground font-semibold">Neo</h2>
              <p className="text-primary-foreground/70 text-xs">Your app building assistant</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                    : 'bg-card text-card-foreground rounded-2xl rounded-bl-md shadow-sm border border-border'
                } px-4 py-3`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                
                {/* Quick Replies */}
                {msg.quickReplies && msg.quickReplies.length > 0 && msg.type === 'ai' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.quickReplies.map((reply, idx) => (
                      <Button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
                        disabled={isAiTyping || isLoading}
                        variant="outline"
                        size="sm"
                        className="h-auto px-3 py-1.5 text-xs rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="bg-card rounded-2xl rounded-bl-md shadow-sm border border-border px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isAiTyping || isLoading}
              className="flex-1 px-4 py-3 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all disabled:opacity-50"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isAiTyping || isLoading}
              size="icon"
              className="rounded-full h-12 w-12"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send • Type freely or use quick replies
          </p>
        </div>
      </div>
    </div>
  );
};
