'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Terminal as TerminalIcon, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const I18N = {
  zh: {
    title: 'Co-pilot 助手',
    placeholder: '询问团队 Agent...',
    welcome:
      '你好！我是 ref-ops 团队 Agent，已接入全部 35 个数据源和实时 KPI。试试问我：\n\n- 本周转介绍业绩为什么下滑？\n- D31-60 围场 CC 业绩前 3 名是谁？\n- 本月目标还能完成吗？',
    mockReply:
      '我已通过 MCP 分析了近期快照。SS 团队在 D61-90 围场的转化率下降约 15%，根因是外呼合规率降低。建议发起定向激活活动，需要我起草活动方案吗？',
  },
  'zh-TW': {
    title: 'Co-pilot 助手',
    placeholder: '詢問團隊 Agent...',
    welcome:
      '你好！我是 ref-ops 團隊 Agent，已接入全部 35 個數據源和即時 KPI。試試問我：\n\n- 本週轉介紹業績為什麼下滑？\n- D31-60 圍場 CC 業績前 3 名是誰？\n- 本月目標還能完成嗎？',
    mockReply:
      '我已透過 MCP 分析了近期快照。SS 團隊在 D61-90 圍場的轉化率下降約 15%，根因是外呼合規率降低。建議發起定向啟動活動，需要我起草活動方案嗎？',
  },
  en: {
    title: 'Co-pilot Terminal',
    placeholder: 'Ask Team Agent...',
    welcome:
      "Hi! I'm your ref-ops Team Agent. I have full context of all 35 data sources and live KPIs. Try asking me:\n\n- Why is the referral revenue dropping this week?\n- Show me the top 3 CCs in D31-60 enclosure.\n- Can we hit this month's target?",
    mockReply:
      "I've analyzed the recent snapshots via MCP. It appears there's a 15% drop in D61-90 enclosure conversions specifically for the SS team due to lower outreach compliance. I recommend triggering a targeted Reactivation campaign. Shall I draft the campaign brief?",
  },
  th: {
    title: 'Co-pilot ผู้ช่วย',
    placeholder: 'ถาม Team Agent...',
    welcome:
      'สวัสดี! ฉันคือ ref-ops Team Agent เชื่อมต่อแหล่งข้อมูล 35 แหล่งและ KPI แบบเรียลไทม์ ลองถามฉัน:\n\n- ทำไมรายได้แนะนำถึงลดลงสัปดาห์นี้?\n- CC 3 อันดับแรกในกลุ่ม D31-60 คือใคร?\n- เราจะบรรลุเป้าหมายเดือนนี้ได้ไหม?',
    mockReply:
      'ฉันวิเคราะห์ snapshot ล่าสุดผ่าน MCP แล้ว พบว่า Conversion ของทีม SS ในกลุ่ม D61-90 ลดลง 15% เนื่องจากอัตราการปฏิบัติตามการติดต่อลดลง แนะนำให้เริ่มแคมเปญ Reactivation แบบเจาะจง ต้องการให้ฉันร่างแผนแคมเปญไหม?',
  },
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function CoPilotTerminal() {
  const locale = useLocale() as keyof typeof I18N;
  const t = I18N[locale] ?? I18N['zh'];
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t.welcome,
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
          content: t.mockReply,
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
            <span className="text-sm font-semibold tracking-tight text-muted-token">{t.title}</span>
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
              placeholder={t.placeholder}
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
