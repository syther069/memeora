'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useToast } from '@/components/ui/toast';
import { clearFinanceCache } from '@/lib/use-finance-resource';

export function useSignOut() {
  const router = useRouter();
  const { toast } = useToast();
  const dAppKit = useDAppKit();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const signOut = React.useCallback(async () => {
    setIsSigningOut(true);
    try {
      // Revoke the Memeora session on the server first; that is what signs out.
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || result?.data?.signedOut !== true) throw new Error(result?.data?.message ?? 'Could not end the Memeora session.');
      clearFinanceCache();
      // After a page reload the wallet may not be connected in this tab; nothing to disconnect then.
      await dAppKit.disconnectWallet().catch(() => undefined);
      router.replace('/sign-in');
      router.refresh();
    } catch (cause) {
      toast({ type: 'error', title: 'You are still signed in', description: cause instanceof Error ? cause.message : 'Please try again.' });
      setIsSigningOut(false);
    }
  }, [dAppKit, router, toast]);

  return { signOut, isSigningOut };
}
