-- Users can correct and delete their own transactions. RLS still limits both
-- to the verified wallet's account.
GRANT UPDATE, DELETE ON transactions TO memeora_runtime;
