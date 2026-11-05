export type CategoryMode = 'personal' | 'business';

interface CategorySet {
  expense: string[];
  income: string[];
}

const CATEGORIES: Record<CategoryMode, CategorySet> = {
  personal: {
    expense: ['Groceries', 'Dining', 'Transport', 'Housing', 'Utilities', 'Health', 'Shopping', 'Education', 'Entertainment', 'Other'],
    income: ['Salary', 'Freelance', 'Other'],
  },
  business: {
    expense: [
      'Payroll', 'Contractors', 'Cloud & infrastructure', 'Software & tools', 'Gas & network fees',
      'Smart contract audits', 'Marketing', 'Legal & compliance', 'Accounting & tax', 'Rent & office',
      'Inventory & supplies', 'Travel', 'Liquidity & market making', 'Equipment', 'Other',
    ],
    income: [
      'Client revenue', 'Product sales', 'Subscriptions', 'Token sale', 'Grants',
      'Investment / funding', 'Staking / yield', 'Refunds', 'Other',
    ],
  },
};

/** On-chain entries in Personal also need a home for what crypto users do day to day. */
const PERSONAL_ONCHAIN: CategorySet = {
  expense: ['Crypto purchase', 'Swap', 'Gas fees', 'Crypto transfer', ...CATEGORIES.personal.expense],
  income: ['Crypto received', 'Staking rewards', 'Airdrop', 'Swap', ...CATEGORIES.personal.income],
};

export function categoriesFor(mode: CategoryMode, type: 'expense' | 'income', onChain = false): string[] {
  if (onChain && mode === 'personal') return PERSONAL_ONCHAIN[type];
  return CATEGORIES[mode][type];
}
