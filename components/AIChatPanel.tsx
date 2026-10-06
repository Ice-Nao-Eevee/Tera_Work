'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Very lightweight markdown renderer: bold (**text**) and bullet lists (- item) */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<br key={i} />);
      return;
    }

    // Bullet list item
    if (/^[-*•]\s/.test(trimmed)) {
      const content = trimmed.replace(/^[-*•]\s/, '');
      elements.push(
        <li key={i} className="ml-3 list-disc">
          {renderInline(content)}
        </li>
      );
    } else {
      elements.push(<span key={i} className="block">{renderInline(trimmed)}</span>);
    }
  });

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
      )}
    </>
  );
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Halo! Saya Asisten AI Warkop Betawa ☕. Bingung mau pesan apa atau ada pertanyaan seputar menu & tingkat pedas? Tanyakan saja pada saya!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMsg = input.trim();
      setInput('');

      const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        // Build history (all messages except the last user message we just added)
        const history = updatedMessages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg,
            history,
          }),
        });

        const data = await res.json();
        const reply = data.reply ?? 'Maaf, ada gangguan. Coba tanya kasir ya.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Maaf, gagal menghubungkan ke asisten. Silakan hubungi pelayan di meja Anda.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[#fcf8f2] border-l border-[#d4bc8c] z-[65] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Panel Header */}
        <div className="p-4 border-b border-[#d4bc8c] bg-[#f3e8d6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-yellow-500 to-amber-400 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#b45309]">Asisten Warkop Betawa</h3>
              <p className="text-[11px] text-[#8c5950]">Tanya menu, promo, atau cara pesan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#e6cdac] text-[#b45309] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user'
                    ? 'bg-[#b45309] text-white'
                    : 'bg-[#f3e8d6] text-[#b45309] border border-[#d4bc8c]'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#b45309] text-white rounded-tr-none'
                    : 'bg-white text-[#2a1a15] border border-[#e6cdac] rounded-tl-none'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="space-y-0.5">{renderMarkdown(m.content)}</div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#f3e8d6] text-[#b45309] border border-[#d4bc8c]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-[#e6cdac] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 bg-[#b45309] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-[#b45309] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#b45309] rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-[#f3e8d6] border-t border-[#d4bc8c] flex gap-2">
          <input
            suppressHydrationWarning
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan menu, sambal, atau rekomendasi..."
            className="flex-1 px-4 py-2.5 text-sm bg-white rounded-full border border-[#d4bc8c] focus:outline-none focus:border-[#b45309] text-[#2a1a15] placeholder-[#9e8d87]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-[#b45309] hover:bg-[#631c1c] text-white flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}

