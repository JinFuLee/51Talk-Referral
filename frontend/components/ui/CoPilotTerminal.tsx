'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function CoPilotTerminal() {
  const locale = useLocale() as string;
  const t = useTranslations('CoPilotTerminal');
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('welcome'),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setIsTyping(true);

    // Simulate network and LLM streaming delay
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('mockReply'),
        },
      ]);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 p-4 rounded-full bg-n-800 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center',
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        )}
      >
        <Sparkles className="w-6 h-6 animate-pulse text-action" />
      </button>

      {/* Terminal Window */}
      <div
        className={cn(
          'fixed bottom-6 right-6 w-96 h-[32rem] bg-subtle rounded-[var(--radius-xl)] shadow-2xl flex flex-col overflow-hidden z-50 border border-default-token transition-all duration-200 transform origin-bottom-right',
          isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-subtle border-b border-default-token">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-action" />
            <span className="text-sm font-semibold tracking-tight text-muted-token">{t('title')}</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-token hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-action-active text-white'
                    : 'bg-subtle text-muted-token font-mono tracking-tight'
                )}
              >
                {msg.role === 'assistant' && (
                  <Bot className="w-3 h-3 text-action inline mr-2 mb-0.5" />
                )}
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-subtle text-muted-token rounded-xl px-4 py-3 text-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-subtle animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-subtle animate-bounce delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-subtle animate-bounce delay-150" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-subtle border-t border-default-token">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('placeholder')}
              className="w-full bg-subtle text-muted-token text-sm rounded-xl py-2.5 pl-4 pr-10 border border-default-token focus:outline-none focus:ring-1 focus:ring-action font-mono placeholder:text-secondary-token"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 text-muted-token hover:text-action disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
