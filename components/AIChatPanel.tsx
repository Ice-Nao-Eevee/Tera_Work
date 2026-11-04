'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Bot, User, ExternalLink, MapPin, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { IMenuItem } from '@/lib/types';
import { STATIC_MENU_ITEMS } from '@/lib/staticData';
import AIProductCard from './AIProductCard';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Very lightweight markdown renderer: bold (**text**), bullet lists (- item), product cards, and minimap */
function renderMarkdown(
  text: string,
  menuItems: IMenuItem[],
  onSelectMenu?: () => void
) {
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
      const hasMenuCard = /\[[^\]]+\]\(\/menu[^\)]*\)/.test(trimmed);

      if (hasMenuCard) {
        // If line has a menu card, strip out redundant trailing price/desc to keep it clean
        // e.g. "- [Es Kopi Senja](/menu/123) (Rp 18.000): Double espresso..." -> only card
        const cardOnlyContent = content.replace(/(\]\(\/menu[^\)]*\))(\s*(\([^\)]+\)|:\s*[^-\n]*)+)/g, '$1');
        elements.push(
          <div key={i} className="my-1">
            {renderInline(cardOnlyContent, menuItems, onSelectMenu)}
          </div>
        );
      } else {
        elements.push(
          <li key={i} className="ml-3 list-disc">
            {renderInline(content, menuItems, onSelectMenu)}
          </li>
        );
      }
    } else {
      elements.push(
        <span key={i} className="block">
          {renderInline(trimmed, menuItems, onSelectMenu)}
        </span>
      );
    }
  });

  return <>{elements}</>;
}

/** Renders inline text: bold (**text**), markdown links [label](url), product cards, and Google Maps card */
function renderInline(
  text: string,
  menuItems: IMenuItem[],
  onSelectMenu?: () => void
): React.ReactNode {
  // Split by markdown links [label](url) first, then handle bold inside each segment
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let segKey = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Text before the link
    if (match.index > lastIndex) {
      segments.push(
        <React.Fragment key={segKey++}>
          {renderBold(text.slice(lastIndex, match.index))}
        </React.Fragment>
      );
    }

    const label = match[1];
    const url = match[2];
    const isExternal = url.startsWith('http');
    const isWhatsApp = url.includes('wa.me');
    const isMaps = url.includes('maps.google') || url.includes('goo.gl/maps');
    const isMenuLink = url.startsWith('/menu');

    if (isExternal) {
      if (isMaps) {
        // Render an interactive minimap card with embedded Google Maps preview
        const embedUrl =
          'https://maps.google.com/maps?q=Jl.+Raya+Jatimulya+No.+33,+Kel.+Jatimulya,+Kec.+Cilodong,+Kota+Depok,+Jawa+Barat&t=&z=15&ie=UTF8&iwloc=&output=embed';
        segments.push(
          <div
            key={segKey++}
            className="my-2.5 rounded-xl overflow-hidden border border-amber-200 bg-amber-50/50 shadow-sm transition-all hover:shadow-md"
          >
            {/* Header info */}
            <div className="px-3 py-2 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>Warkop Betawa (Cilodong, Depok)</span>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
              >
                <span>Buka</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* Embedded Mini Google Map */}
            <div className="relative w-full h-36 bg-gray-100">
              <iframe
                title="Lokasi Warkop Betawa"
                src={embedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Bottom action button */}
            <div className="p-2 bg-white flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-gray-500 truncate">
                Jl. Raya Jatimulya No. 33, Depok
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors shadow-xs"
              >
                <MapPin className="w-3 h-3" />
                <span>Rute Maps</span>
              </a>
            </div>
          </div>
        );
      } else {
        // External links: WhatsApp, etc. — open in new tab with styled button
        segments.push(
          <a
            key={segKey++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 my-1 rounded-full text-xs font-medium transition-all shadow-sm hover:shadow-md ${
              isWhatsApp
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
            }`}
          >
            {isWhatsApp ? (
              <MessageCircle className="w-3.5 h-3.5" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            {renderBold(label.replace(/^[^\x00-\x7F]+\s*/u, ''))}
          </a>
        );
      }
    } else if (isMenuLink) {
      // PRODUCT CARD: Displays photo, description, direct +Add to cart, and View button
      segments.push(
        <AIProductCard
          key={segKey++}
          productName={label}
          url={url}
          menuItems={menuItems}
          onSelectMenu={onSelectMenu}
        />
      );
    } else {
      // Other internal links
      segments.push(
        <Link
          key={segKey++}
          href={url}
          className="text-amber-700 hover:text-amber-900 underline underline-offset-2 decoration-amber-400 transition-colors"
        >
          {renderBold(label)}
        </Link>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after the last link
  if (lastIndex < text.length) {
    segments.push(
      <React.Fragment key={segKey++}>
        {renderBold(text.slice(lastIndex))}
      </React.Fragment>
    );
  }

  // If no links found, just render bold
  if (segments.length === 0) {
    return renderBold(text);
  }

  return <>{segments}</>;
}

/** Renders bold markdown: **text** */
function renderBold(text: string): React.ReactNode {
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
  const [menuItems, setMenuItems] = useState<IMenuItem[]>(STATIC_MENU_ITEMS);
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

  // Load menu items from API for real-time accurate photos, prices, descriptions
  useEffect(() => {
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
          const dbItemNames = new Set(data.menuItems.map((m: any) => m.name.toLowerCase()));
          const missingStatic = STATIC_MENU_ITEMS.filter((s) => !dbItemNames.has(s.name.toLowerCase()));
          setMenuItems([...data.menuItems, ...missingStatic]);
        }
      })
      .catch(() => {
        // Fallback already defaults to STATIC_MENU_ITEMS
      });
  }, []);

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
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-[#fcf8f2] border-l border-[#d4bc8c] z-[65] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Panel Header */}
        <div className="p-4 border-b border-[#d4bc8c] bg-[#f3e8d6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-yellow-500 to-amber-400 flex items-center justify-center text-white shadow-xs">
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
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#b45309] text-white rounded-tr-none'
                    : 'bg-white text-[#2a1a15] border border-[#e6cdac] rounded-tl-none'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="space-y-0.5">
                    {renderMarkdown(m.content, menuItems, onClose)}
                  </div>
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
