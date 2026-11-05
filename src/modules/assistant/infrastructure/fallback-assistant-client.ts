import { AssistantPort, AssistantChatInput, AssistantChatOutput } from '../application/ports/assistant-port';

export class FallbackAssistantClient implements AssistantPort {
  async generateResponse(input: AssistantChatInput): Promise<AssistantChatOutput> {
    const { calculationContext, recalledMemories } = input;

    let memoryNote = '';
    if (recalledMemories.length > 0) {
      const memoryRules = recalledMemories.map(m => `"${m.text}"`).join(', ');
      memoryNote = `\n\nKeep in mind what you asked me to remember: ${memoryRules}.`;
    }

    const prompt = input.prompt.toLowerCase();
    const requestedCategory = calculationContext.spendingByCategory?.find(({ category }) => prompt.includes(category.toLowerCase()));
    const financeSummary = requestedCategory
      ? `Your ${calculationContext.period ?? 'selected-period'} records show ${requestedCategory.amountFormatted} in ${requestedCategory.category} expenses.`
      : /\b(goal|milestone|progress)\b/.test(prompt) && calculationContext.savingsGoals?.length
        ? `Your active savings goals show ${calculationContext.savingsGoals.map((goal) => `${goal.name}: ${goal.savedFormatted} of ${goal.targetFormatted} (${goal.progressPercent}%)`).join('; ')}.`
        : calculationContext.budgetLimitFormatted
          ? `Based on the saved ${calculationContext.currency} budget, ${calculationContext.remainingBudgetFormatted} remains. Recorded income is ${calculationContext.incomeFormatted}, expenses are ${calculationContext.spendingFormatted}, and net cash flow is ${calculationContext.netCashFlowFormatted}.`
          : `No monthly budget is saved for this period. Recorded income is ${calculationContext.incomeFormatted}, expenses are ${calculationContext.spendingFormatted}, and net cash flow is ${calculationContext.netCashFlowFormatted}; these records do not reveal your bank balance.`;
    const memoryStatusNote = calculationContext.memoryStatus === 'unavailable'
      ? '\n\nApproved memory could not be loaded for this response.'
      : calculationContext.memoryStatus === 'not_consented'
        ? '\n\nMemory is off, so your saved rules were not used.'
        : '';
    // The verdict appears in the calculation card under the message, so it is not repeated here.
    const message = `${financeSummary}${memoryNote}${memoryStatusNote}`;

    return {
      message,
      calculationContext,
      recalledMemories: recalledMemories.map(m => ({
        id: m.id,
        category: m.category,
        text: m.text,
      })),
      memoryStatus: calculationContext.memoryStatus,
      isFallback: true,
      timestamp: new Date().toISOString(),
    };
  }
}

