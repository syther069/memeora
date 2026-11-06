-- Memeora no longer supports INR. USD is the default, alongside USDC, USDT, SUI,
-- WAL and Other. There is no safe way to convert stored rupee amounts, so the owner
-- chose to delete INR transactions rather than relabel them with a wrong value.
DELETE FROM transactions WHERE currency = 'INR';
DELETE FROM budgets WHERE currency = 'INR';
DELETE FROM savings_goals WHERE currency = 'INR';
UPDATE profiles SET business_cash_minor = NULL, business_cash_currency = NULL WHERE business_cash_currency = 'INR';

ALTER TABLE profiles
  ALTER COLUMN preferred_currency TYPE VARCHAR(8),
  ALTER COLUMN preferred_currency SET DEFAULT 'USD',
  ALTER COLUMN business_cash_currency TYPE VARCHAR(8);
UPDATE profiles SET preferred_currency = 'USD' WHERE preferred_currency = 'INR';

ALTER TABLE transactions ALTER COLUMN currency TYPE VARCHAR(8), ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE budgets ALTER COLUMN currency TYPE VARCHAR(8), ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE savings_goals ALTER COLUMN currency TYPE VARCHAR(8), ALTER COLUMN currency SET DEFAULT 'USD';
