import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendGeminiMessage, ChatMessage } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Hey! I'm DustBot, your DustHeist assistant. Ask me anything about bookings, pricing, or services!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const getGeminiHistory = (): ChatMessage[] => {
    return messages.slice(1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = getGeminiHistory();
      const reply = await sendGeminiMessage(userText, history);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Oops! There was an issue connecting to the AI: ${error.message}. Please verify your API key or call us at +91-98765-43210.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-80 h-[480px] glass-card flex flex-col overflow-hidden shadow-glass"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border bg-gradient-to-r from-primary/20 to-primary/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-light">DustBot</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs text-muted">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg hover:bg-dark-hover transition-colors text-muted hover:text-text-light"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-dark-hover transition-colors text-muted hover:text-text-light"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                      msg.role === 'assistant'
                        ? 'bg-primary/20'
                        : 'bg-dark-border'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <Bot size={12} className="text-primary" />
                    ) : (
                      <User size={12} className="text-muted" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      'max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'assistant'
                        ? 'bg-dark-hover text-text-light rounded-tl-sm'
                        : 'bg-primary text-white rounded-tr-sm'
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={12} className="text-primary" />
                  </div>
                  <div className="bg-dark-hover px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {['Pricing?', 'Book a wash', 'Cancel booking', 'Track my washer'].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-dark-border text-muted hover:text-primary hover:border-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-dark-border flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-sm text-text-light placeholder:text-muted outline-none focus:border-primary"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized bar */}
      <AnimatePresence>
        {isOpen && isMinimized && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-4 py-2.5 glass-card border border-primary/30 rounded-2xl"
          >
            <Bot size={16} className="text-primary" />
            <span className="text-sm font-medium text-text-light">DustBot</span>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* FAB Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setIsOpen(!isOpen); setIsMinimized(false); }}
        className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-glow-blue relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle size={22} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Unread dot */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">1</span>
          </span>
        )}
      </motion.button>
    </div>
  );
}
