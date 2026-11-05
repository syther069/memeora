'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { useAppSession } from '@/components/auth/app-session-guard';
import { formatPeriod } from '@/lib/dates';
import { currentPeriod, financeApi } from '@/lib/finance-api';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  Copy,
  RotateCcw,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  calculationContext?: {
    remainingBudgetFormatted: string;
    proposedPurchaseFormatted?: string;
    currency?: 'INR' | 'USD';
    recordWindowDescription?: string;
    incomeFormatted?: string;
    spendingFormatted?: string;
    netCashFlowFormatted?: string;
    budgetLimitFormatted?: string;
    verdict: string;
  };
  recalledMemories?: Array<{ id: string; category: string; text: string }>;
  memoryStatus?: 'used' | 'none_found' | 'not_consented' | 'unavailable';
  memorySource?: 'walrus' | 'local_fallback';
  isFallback?: boolean;
  timestamp: string;
}

const greeting = 'Ask me about your spending, budget or goals. I work out the sums from your ledger, then follow the rules you saved in Memory. I can only see what you recorded, not your bank balance.';

export default function AssistantPage() {
  const { toast } = useToast();
  const { preferredCurrency, mode } = useAppSession();
  const symbol = preferredCurrency === 'USD' ? '$' : '₹';
  const activePeriodLabel = formatPeriod(currentPeriod());
  const suggestedPrompts = mode === 'business' ? [
    `Can we afford a ${symbol}45,000 contractor this month?`,
    'What is our burn and runway?',
    'What are our biggest costs this month?',
    'How are our business goals doing?',
  ] : [
    `Can I afford a ${symbol}4,500 purchase this month?`,
    'How much did I spend on dining this month?',
    'How are my savings goals doing?',
    'How much is left over this month?',
  ];
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const logRef = React.useRef<HTMLDivElement>(null);
  const [inputPrompt, setInputPrompt] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keep the newest answer in view.
  React.useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, isTyping]);

  const messageSeqRef = React.useRef(1);

  const handleSendMessage = React.useCallback(async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isTyping) return;

    messageSeqRef.current += 1;
    const seq = messageSeqRef.current;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${seq}`,
      sender: 'user',
      content: text,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);
    setErrorMessage(null);

    try {
      const result = await financeApi<{
        message: string;
        calculationContext: ChatMessage['calculationContext'];
        recalledMemories: NonNullable<ChatMessage['recalledMemories']>;
        memoryStatus?: ChatMessage['memoryStatus'];
        memorySource?: ChatMessage['memorySource'];
        isFallback?: boolean;
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: text,
          cycleMonth: currentPeriod(),
        }),
      });

      messageSeqRef.current += 1;
      const botMsg: ChatMessage = {
        id: `ast-${messageSeqRef.current}`,
        sender: 'assistant',
        content: result.message,
        calculationContext: result.calculationContext,
        recalledMemories: result.recalledMemories,
        memoryStatus: result.memoryStatus,
        memorySource: result.memorySource,
        isFallback: result.isFallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assistant network error';
      setErrorMessage(msg);
      setMessages((prev) => prev.filter((message) => message.id !== userMsg.id));
      setInputPrompt(text);
    } finally {
      setIsTyping(false);
    }
  }, [inputPrompt, isTyping]);

  const handleCopyMessage = (content: string) => {
    navigator.clipboard?.writeText?.(content);
    toast({
      type: 'info',
      title: 'Answer copied',
      description: 'The answer is on your clipboard.',
    });
  };

  const handleResetChat = () => {
    setMessages([]);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col h-[calc(100vh-13rem)] min-h-[550px]">
      {/* Offline Banner State */}
      {!isOnline && (
        <div className="p-3.5 px-5 rounded-2xl bg-[var(--surface-well)] border border-[var(--border-subtle)] flex items-center gap-3 text-xs text-[var(--ink-secondary)]">
          <WifiOff className="w-4 h-4 text-[var(--accent-warning)] shrink-0" />
          <span>You are offline. The Assistant needs a connection to read your records.</span>
        </div>
      )}

      {/* Context Grounding Header Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-6 rounded-full bg-white border border-[var(--brand-sky-blue)]/80 shadow-[var(--shadow-sm)] text-xs">
        <div className="flex items-center gap-2.5 text-[var(--ink-secondary)]">
          <Sparkles className="w-4 h-4 text-[var(--brand-bright-current)] shrink-0" />
          <span>
            Answering for <strong className="text-[var(--ink-primary)]">{activePeriodLabel}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/memory" className="font-bold text-[var(--brand-deep-current)] hover:underline">Your memories</Link>
          <button
            type="button"
            onClick={handleResetChat}
            title="Start a new conversation"
            aria-label="Start a new conversation"
            className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded-full hover:bg-[var(--surface-sky-tint)] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Stream Card */}
      <Card
        ref={logRef}
        className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 bg-gradient-to-b from-white via-white to-[#f7faff] border border-[var(--brand-sky-blue)]/60"
        role="log"
        aria-live="polite"
        aria-label="Assistant conversation history"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-sky-solid)] text-[var(--brand-deep-current)] border border-[var(--brand-sky-blue)]"><Bot className="w-4 h-4" /></div>
          <p className="max-w-[85%] sm:max-w-xl rounded-2xl rounded-tl-xs border border-[var(--brand-sky-blue)]/50 bg-white p-5 text-sm leading-relaxed text-[var(--ink-body)] shadow-xs">{greeting}</p>
        </div>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-[var(--brand-deep-current)] text-white'
                    : 'bg-[var(--surface-sky-solid)] text-[var(--brand-deep-current)] border border-[var(--brand-sky-blue)]'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`group relative max-w-[85%] sm:max-w-xl rounded-2xl p-5 text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-[var(--brand-deep-current)] text-white rounded-tr-xs'
                    : 'bg-white text-[var(--ink-body)] border border-[var(--brand-sky-blue)]/50 rounded-tl-xs'
                }`}
              >
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.content)}
                    aria-label="Copy assistant answer"
                    className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-sky-solid)] transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}

                <p className="whitespace-pre-line pr-4">{msg.content}</p>

                {/* Structured Calculation Context Card */}
                {msg.calculationContext && (
                  <div className="mt-4 pt-3.5 border-t border-[var(--brand-sky-blue)]/40 space-y-2.5 text-xs bg-[var(--surface-sky-solid)]/60 p-3.5 rounded-xl border">
                    <div className="flex items-center gap-2 text-[var(--brand-deep-current)] font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{msg.calculationContext.verdict}</span>
                    </div>

                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] tabular-nums font-semibold text-[var(--ink-muted)]">
                      <span>{msg.calculationContext.budgetLimitFormatted ? 'Remaining budget' : 'Budget'}: {msg.calculationContext.remainingBudgetFormatted}</span>
                      {msg.calculationContext.proposedPurchaseFormatted && (
                        <span>Proposed: {msg.calculationContext.proposedPurchaseFormatted}</span>
                      )}
                    </div>
                    {(msg.calculationContext.incomeFormatted || msg.calculationContext.spendingFormatted || msg.calculationContext.netCashFlowFormatted) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-[var(--ink-muted)]"><span>Income: {msg.calculationContext.incomeFormatted}</span><span>Expenses: {msg.calculationContext.spendingFormatted}</span><span>Net: {msg.calculationContext.netCashFlowFormatted}</span></div>}
                    {msg.calculationContext.recordWindowDescription && <p className="text-[10px] text-[var(--ink-muted)]">{msg.calculationContext.recordWindowDescription}</p>}
                    {msg.memoryStatus && <p className="text-[10px] text-[var(--ink-muted)]">Memory: {msg.memoryStatus === 'used' ? (msg.memorySource === 'walrus' ? 'recalled from your Walrus memories' : 'from Memeora\'s saved list, because Walrus did not answer this time') : msg.memoryStatus === 'none_found' ? 'no memory matched this question' : msg.memoryStatus === 'not_consented' ? 'off. Turn it on in the Memory page' : 'could not be loaded for this answer'}{msg.isFallback ? ' · Answered without the AI model; the sums are unaffected' : ''}</p>}

                    {/* Cited Walrus Memories Pills */}
                    {msg.recalledMemories && msg.recalledMemories.length > 0 && (
                      <div className="pt-2 border-t border-[var(--brand-sky-blue)]/30 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-[var(--ink-secondary)] font-bold self-center">
                          Your memories used:
                        </span>
                        {msg.recalledMemories.map((m) => (
                          <span
                            key={m.id}
                            className="px-2.5 py-0.5 rounded-full bg-white border border-[var(--brand-sky-blue)] text-[10px] text-[var(--brand-deep-current)] font-medium"
                          >
                            {m.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <span
                  className={`block text-[11px] text-right mt-2 tabular-nums font-medium ${
                    isUser ? 'text-[var(--brand-sky-blue)]' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--surface-sky-solid)] text-[var(--brand-deep-current)] flex items-center justify-center">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-[var(--surface-card-subtle)] border border-[var(--border-subtle)] rounded-full px-4 py-2.5 text-xs text-[var(--ink-muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-bright-current)] animate-ping" />
              <span>Checking your records and memories…</span>
            </div>
          </div>
        )}
      </Card>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Suggested questions">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isTyping}
            onClick={() => handleSendMessage(prompt)}
            className="px-4 py-2 rounded-full bg-white hover:bg-[var(--surface-sky-solid)] border border-[var(--brand-sky-blue)] text-xs text-[var(--ink-primary)] font-bold shrink-0 transition-all cursor-pointer shadow-xs text-left disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Error Alert if needed */}
      {errorMessage && (
        <div className="p-3 px-4 rounded-xl bg-[var(--accent-danger-bg)] border border-[var(--accent-danger-border)] flex items-center gap-2 text-xs text-[var(--accent-danger)]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage} Your question is back in the box, so you can send it again.</span>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center gap-2">
        <Input
          aria-label="Ask assistant a financial question"
          placeholder="Ask about a purchase, your spending, or your goals…"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          disabled={isTyping}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isTyping) {
              void handleSendMessage();
            }
          }}
          className="flex-1"
        />
        <Button
          variant="primary"
          size="pill"
          onClick={() => handleSendMessage()}
          isLoading={isTyping}
          disabled={!inputPrompt.trim() || isTyping}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
