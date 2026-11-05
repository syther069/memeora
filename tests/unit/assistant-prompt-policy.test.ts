import { describe, it, expect, vi } from 'vitest';
import { MemoryRecord } from '../../src/modules/financial-memory/domain/memory-record';
import { buildAssistantUserPrompt, ASSISTANT_SYSTEM_PROMPT } from '../../src/modules/assistant/application/prompt-policy';
import { FallbackAssistantClient } from '../../src/modules/assistant/infrastructure/fallback-assistant-client';
import { GroqAssistantClient } from '../../src/modules/assistant/infrastructure/groq-assistant-client';

describe('Assistant Prompt Policy & Grounding Directives', () => {
  it('enforces zero arithmetic in the system instruction', () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('Never calculate arithmetic');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('server-calculated');
    expect(ASSISTANT_SYSTEM_PROMPT).toContain('Recorded cash flow is not a bank balance');
  });

  it('builds a prompt containing pre-computed ledger math and recalled memory rules', () => {
    const memory = MemoryRecord.create({
      id: 'mem_emergency_01',
      userId: 'usr_1',
      category: 'goal',
      text: 'Prioritize saving ₹3,000 each month for liquid emergency reserves',
    });

    const promptText = buildAssistantUserPrompt({
      userId: 'usr_1',
      prompt: 'Can I afford a ₹5,000 laptop repair this month?',
      cycleMonth: '2026-11',
      calculationContext: {
        remainingBudgetMinor: 660000,
        proposedPurchaseMinor: 500000,
        remainingBudgetFormatted: '₹6,600.00',
        proposedPurchaseFormatted: '₹5,000.00',
        memoryStatus: 'used',
        verdict: 'Breaches ₹3,000.00 emergency reserve memory rule (leaves ₹1,600.00)',
      },
      recalledMemories: [memory],
      memoryStatus: 'used',
    });

    expect(promptText).toContain('Can I afford a ₹5,000 laptop repair this month?');
    expect(promptText).toContain('₹6,600.00');
    expect(promptText).toContain('₹5,000.00');
    expect(promptText).toContain('Breaches ₹3,000.00 emergency reserve');
    expect(promptText).toContain('Prioritize saving ₹3,000 each month for liquid emergency reserves');
    expect(promptText).toContain('"category":"goal"');
  });

  it('handles cold-start prompt when no memories are recorded', () => {
    const promptText = buildAssistantUserPrompt({
      userId: 'usr_new',
      prompt: 'How much can I spend on groceries?',
      calculationContext: {
        remainingBudgetFormatted: '₹12,000.00',
        verdict: 'Safe within monthly limit',
      },
      recalledMemories: [],
    });

    expect(promptText).toContain('NONE RECORDED (or no matching memory was returned).');
  });
});

describe('FallbackAssistantClient', () => {
  it('generates a structured deterministic response card directly from ledger figures', async () => {
    const client = new FallbackAssistantClient();
    const memory = MemoryRecord.create({
      id: 'mem_dine',
      userId: 'usr_1',
      category: 'preference',
      text: 'Keep dining out under ₹3,500 per month',
    });

    const result = await client.generateResponse({
      userId: 'usr_1',
      prompt: 'Can I go out for dinner tonight?',
      calculationContext: {
        remainingBudgetFormatted: '₹2,500.00',
        budgetLimitFormatted: '₹10,000.00',
        currency: 'INR',
        incomeFormatted: '₹5,000.00',
        spendingFormatted: '₹2,500.00',
        netCashFlowFormatted: '₹2,500.00',
        proposedPurchaseFormatted: '₹1,200.00',
        memoryStatus: 'used',
        verdict: 'Fits within remaining dining cap',
      },
      recalledMemories: [memory],
      memoryStatus: 'used',
    });

    expect(result.isFallback).toBe(true);
    expect(result.isFallback).toBe(true);
    expect(result.message).toContain('₹2,500.00');
    expect(result.message).toContain('Keep dining out under ₹3,500 per month');
    expect(result.recalledMemories).toHaveLength(1);
    expect(result.recalledMemories[0].category).toBe('preference');
  });
});

describe('GroqAssistantClient', () => {
  const input = {
    userId: 'usr_1',
    prompt: 'Can I buy shoes?',
    calculationContext: { remainingBudgetFormatted: '₹4,000.00', verdict: 'Within budget', memoryStatus: 'used' as const },
    recalledMemories: [MemoryRecord.create({ id: 'm1', userId: 'usr_1', category: 'preference', text: 'Keep a ₹3,000 buffer', status: 'confirmed' })],
  };
  const answer = (content: unknown, status = 200) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

  it('sends the policy and the calculated context, and returns the model answer with the same figures', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(answer('You can, and your buffer stays intact.'));
    const result = await new GroqAssistantClient({ apiKey: 'gsk_test', model: 'test-model', fetchImpl }).generateResponse(input);

    const [url, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer gsk_test');
    expect(body.model).toBe('test-model');
    expect(body.messages[0]).toEqual({ role: 'system', content: ASSISTANT_SYSTEM_PROMPT });
    expect(body.messages[1].content).toContain('Within budget');
    expect(body.messages[1].content).toContain('Keep a ₹3,000 buffer');
    expect(result).toMatchObject({ message: 'You can, and your buffer stays intact.', isFallback: false, memoryStatus: 'used' });
    expect(result.calculationContext.verdict).toBe('Within budget');
  });

  it('does not call Groq without a key or with the placeholder', async () => {
    const fetchImpl = vi.fn();
    expect((await new GroqAssistantClient({ apiKey: undefined, fetchImpl }).generateResponse(input)).isFallback).toBe(true);
    expect((await new GroqAssistantClient({ apiKey: 'your-groq-api-key', fetchImpl }).generateResponse(input)).isFallback).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('falls back to the calculation on an error status, an empty answer, or a network failure, without logging the key', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const fetchImpl of [
      vi.fn().mockResolvedValue(new Response('{}', { status: 401 })),
      vi.fn().mockResolvedValue(answer('  ')),
      vi.fn().mockRejectedValue(new Error('network down')),
    ]) {
      const result = await new GroqAssistantClient({ apiKey: 'gsk_secret', fetchImpl }).generateResponse(input);
      expect(result.isFallback).toBe(true);
      expect(result.calculationContext.verdict).toBe('Within budget');
    }
    expect(warn).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('gsk_secret');
    warn.mockRestore();
  });
});
