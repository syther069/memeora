'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import { AnimatedLink } from '@/components/ui/animated-link';
import { MotionRow } from '@/components/ui/motion-row';
import { Card } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useAppSession } from '@/components/auth/app-session-guard';
import { MemoryAccountSetup, MemoryAccountStatus } from '@/components/memory/memory-account-setup';
import { DeletableMemory, PermanentDeleteDialog } from '@/components/memory/permanent-delete-dialog';
import { financeApi, financeApiHeaders } from '@/lib/finance-api';
import { MEMORY_DRAFT_KEY, MEMORY_OPEN_EVENT, MEMORY_OPEN_KEY } from '@/lib/memory-draft';
import { useUndoable } from '@/lib/use-undoable';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ArrowRight, Brain, Copy, InfoCircle, Lock, Plus, Refresh, Trash, WarningTriangle } from 'iconoir-react';

type Category = 'preference' | 'goal' | 'budget';

interface MemoryItem {
  id: string;
  text: string;
  category: Category;
  walrusBlobId?: string | null;
  walrusStatus?: string;
  createdAt: string;
}

interface RecallPayload {
  memories: MemoryItem[];
  walrus?: { available: boolean; setupRequired?: boolean; namespace?: string; reason?: string };
}

interface DeleteOverview {
  hidden: Array<{ id: string; text: string; category: Category; walrusBlobId: string }>;
  pending: Array<{ id: string; digest: string }>;
}

/** How each Walrus write state is shown. Only `confirmed` has a Walrus blob. */
const WALRUS_STATUS: Record<string, { label: string; variant: 'success' | 'default' | 'warning' | 'danger' }> = {
  confirmed: { label: 'Stored on Walrus', variant: 'success' },
  pending: { label: 'Storing on Walrus…', variant: 'default' },
  pending_retry: { label: 'Waiting to send to Walrus', variant: 'warning' },
  failed: { label: 'Walrus could not store this', variant: 'danger' },
};

const CATEGORY_LABELS: Record<Category, { label: string; hint: string }> = {
  preference: { label: 'Rule', hint: 'How you like to handle money.' },
  budget: { label: 'Limit', hint: 'A cap on a kind of spending.' },
  goal: { label: 'Goal', hint: 'Something you are working towards.' },
};

/** While a write is being stored, refresh this often to pick up its confirmation. */
const PENDING_REFRESH_MS = 8000;

export default function MemoryPage() {
  const { toast } = useToast();
  const undoable = useUndoable();
  const { walletAddress: sessionWallet, mode } = useAppSession();
  const isBusiness = mode === 'business';
  const walletAddress = sessionWallet ?? '';
  const [consentEnabled, setConsentEnabled] = React.useState<boolean | null>(null);
  const [isChangingConsent, setIsChangingConsent] = React.useState(false);
  const [memories, setMemories] = React.useState<MemoryItem[]>([]);
  const [walrus, setWalrus] = React.useState<RecallPayload['walrus']>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [syncFailed, setSyncFailed] = React.useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newMemoryText, setNewMemoryText] = React.useState('');
  const [newCategory, setNewCategory] = React.useState<Category>('preference');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  const [memoryToRemove, setMemoryToRemove] = React.useState<MemoryItem | null>(null);

  const [accountStatus, setAccountStatus] = React.useState<MemoryAccountStatus | null>(null);
  const [deleteOverview, setDeleteOverview] = React.useState<DeleteOverview>({ hidden: [], pending: [] });
  const [deleteTarget, setDeleteTarget] = React.useState<DeletableMemory | null>(null);

  const examples: Array<{ category: Category; text: string }> = isBusiness ? [
    { category: 'preference', text: 'Always keep at least 6 months of runway before any new hire.' },
    { category: 'budget', text: 'Keep cloud and infrastructure costs under $5,000 per month.' },
    { category: 'goal', text: 'We are raising $500,000 by next March and need to show steady revenue.' },
  ] : [
    { category: 'preference', text: 'Always keep at least $300 untouched before any non-essential purchase.' },
    { category: 'budget', text: 'Keep dining out under $350 per month.' },
    { category: 'goal', text: 'I am saving $2,500 for an emergency fund by next March.' },
  ];

  /** Checks Walrus: confirms finished writes and picks up memories stored elsewhere. */
  const syncWithWalrus = React.useCallback(async () => {
    try {
      const data = await financeApi<RecallPayload>('/api/memory/recall', { method: 'POST', body: JSON.stringify({ limit: 100 }) });
      setMemories(data.memories);
      setWalrus(data.walrus);
      setSyncFailed(false);
    } catch {
      // The list on screen stays usable, but its statuses may be behind.
      setSyncFailed(true);
    }
  }, []);

  /** Shows saved memories straight away, then checks Walrus in the background. */
  const fetchMemories = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await financeApi<RecallPayload>('/api/memory/recall', { method: 'POST', body: JSON.stringify({ limit: 100, sync: false }) });
      setMemories(data.memories);
      setIsLoading(false);
      void syncWithWalrus();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Your memories could not be loaded.');
      setIsLoading(false);
    }
  }, [syncWithWalrus]);

  const fetchAccountStatus = React.useCallback(async () => {
    try {
      const { status } = await financeApi<{ status: MemoryAccountStatus }>('/api/memory/account');
      setAccountStatus(status);
    } catch {
      setAccountStatus('unavailable');
    }
  }, []);

  const fetchDeleteOverview = React.useCallback(async () => {
    try {
      setDeleteOverview(await financeApi<DeleteOverview>('/api/memory/delete'));
    } catch {
      // The rest of the page stays usable; this list reloads on the next change.
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAccountStatus();
      void fetchDeleteOverview();
      void financeApi<{ enabled: boolean }>('/api/memory/consent')
        .then(({ enabled }) => setConsentEnabled(enabled))
        .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Your memory setting could not be loaded.'));
      void fetchMemories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMemories, fetchAccountStatus, fetchDeleteOverview]);

  // Walrus stores a write in the background (about 20 s on Mainnet). While any
  // write is unsettled, reload quietly so its confirmation and blob ID appear.
  const hasUnsettled = memories.some((m) => m.walrusStatus === 'pending' || m.walrusStatus === 'pending_retry');
  React.useEffect(() => {
    if (!hasUnsettled || !consentEnabled) return;
    const timer = window.setInterval(() => { void syncWithWalrus(); }, PENDING_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [hasUnsettled, consentEnabled, syncWithWalrus]);

  const setConsent = async (next: boolean) => {
    if (isChangingConsent) return;
    setIsChangingConsent(true);
    // Shown at once and put back if the server refuses.
    const previous = consentEnabled;
    setConsentEnabled(next);
    try {
      await financeApi('/api/memory/consent', { method: 'PUT', body: JSON.stringify({ enabled: next }) });
      toast({
        type: next ? 'success' : 'info',
        title: next ? 'Memory is on' : 'Memory is off',
        description: next ? 'You can now save memories, and the Assistant will use them.' : 'The Assistant stops using your memories, and nothing new is saved.',
      });
      void fetchMemories();
    } catch (error) {
      setConsentEnabled(previous);
      toast({ type: 'error', title: 'Your memory setting was not changed', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setIsChangingConsent(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemoryText.trim().length < 5 || isSubmitting) return;
    setIsSubmitting(true);
    setAddError(null);
    try {
      const created = await financeApi<MemoryItem>('/api/memory/remember', {
        method: 'POST',
        body: JSON.stringify({ category: newCategory, text: newMemoryText.trim() }),
      });
      setMemories((prev) => [created, ...prev]);
      setNewMemoryText('');
      setIsAddModalOpen(false);
      toast({
        type: 'success',
        title: 'Memory saved',
        description: created.walrusStatus === 'pending'
          ? 'Walrus is storing it now. This usually takes about 20 seconds.'
          : 'Saved in Memeora. It will be sent to Walrus as soon as Walrus responds.',
      });
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'This memory could not be saved. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMemory = () => {
    if (!memoryToRemove) return;
    const memory = memoryToRemove;
    const headers = financeApiHeaders();
    setMemoryToRemove(null);
    undoable({
      title: 'Memory hidden',
      description: memory.walrusBlobId ? 'The Assistant stops using it. Its encrypted copy stays on Walrus.' : 'The Assistant stops using it.',
      apply: () => setMemories((prev) => prev.filter((m) => m.id !== memory.id)),
      revert: () => setMemories((prev) => (prev.some((m) => m.id === memory.id) ? prev : [memory, ...prev])),
      commit: () => financeApi(`/api/memory/${encodeURIComponent(memory.id)}`, { method: 'DELETE', headers, keepalive: true }).then(() => undefined),
      failureTitle: 'The memory was not hidden',
      onCommitted: () => { void fetchDeleteOverview(); },
    });
  };

  const copyBlobId = async (blobId: string) => {
    try {
      await navigator.clipboard.writeText(blobId);
      toast({ type: 'info', title: 'Walrus blob ID copied', description: blobId });
    } catch {
      toast({ type: 'error', title: 'The blob ID was not copied', description: 'Your browser did not allow clipboard access. Select the ID and copy it by hand.' });
    }
  };

  const openPermanentDelete = (memory: DeletableMemory) => {
    setMemoryToRemove(null);
    setDeleteTarget(memory);
  };

  /** Removes what was confirmed deleted, and shows anything still running. */
  const handleDeleteSettled = () => {
    void fetchDeleteOverview();
    void fetchMemories();
  };

  const storedCount = memories.filter((m) => m.walrusStatus === 'confirmed').length;
  const accountReady = accountStatus === 'ready';
  const needsSetup = accountStatus === 'no_account' || accountStatus === 'needs_delegate' || accountStatus === 'inactive';
  const canSave = Boolean(consentEnabled) && accountReady;

  // The command menu can ask for the form from any page, including this one.
  React.useEffect(() => {
    if (!canSave) return;
    const openIfRequested = () => {
      try {
        if (sessionStorage.getItem(MEMORY_OPEN_KEY) !== '1') return;
        sessionStorage.removeItem(MEMORY_OPEN_KEY);
      } catch {
        return;
      }
      setAddError(null);
      setIsAddModalOpen(true);
    };
    const timer = window.setTimeout(openIfRequested, 0);
    window.addEventListener(MEMORY_OPEN_EVENT, openIfRequested);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(MEMORY_OPEN_EVENT, openIfRequested);
    };
  }, [canSave]);

  // "Remember this" on a transaction leaves a draft here, for the user to review and save.
  React.useEffect(() => {
    if (!canSave) return;
    let draft: string | null = null;
    try {
      draft = sessionStorage.getItem(MEMORY_DRAFT_KEY);
      if (draft) sessionStorage.removeItem(MEMORY_DRAFT_KEY);
    } catch {
      return;
    }
    if (!draft) return;
    const text = draft;
    const timer = window.setTimeout(() => {
      setNewCategory('preference');
      setNewMemoryText(text);
      setAddError(null);
      setIsAddModalOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canSave]);

  return (
    <div className="space-y-6">
      <Card variant="blue">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{isBusiness ? 'What Memeora remembers about your business' : 'What Memeora remembers'}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--ink-on-blue-muted)]">
                {isBusiness
                  ? 'Save how you run the business once. It is encrypted and stored on Walrus in an account your wallet owns, apart from your personal memories, and the Assistant follows it in business answers. Your transactions stay in your private ledger.'
                  : 'Save your rules and goals once. They are encrypted and stored on Walrus, in an account your wallet owns, and the Assistant follows them in every session. Your transactions stay in your private ledger.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 rounded-full bg-white/12 px-4 py-2">
            <span id="memory-switch-label" className="text-xs font-semibold">
              {consentEnabled === null ? 'Memory…' : consentEnabled ? 'Memory is on' : 'Memory is off'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={consentEnabled === true}
              aria-labelledby="memory-switch-label"
              disabled={consentEnabled === null || isChangingConsent}
              onClick={() => void setConsent(!consentEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-60 ${consentEnabled ? 'bg-[var(--brand-cream)]' : 'bg-white/30'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${consentEnabled ? 'translate-x-6 bg-[var(--brand-blue)]' : 'translate-x-1 bg-white'}`} />
            </button>
          </div>
        </div>
        {walrus?.namespace && (
          <p className="mt-4 border-t border-white/20 pt-3 text-xs text-[var(--ink-on-blue-muted)]">
            Your Walrus space: <code className="break-all font-mono font-medium text-[var(--ink-inverse)]">{walrus.namespace}</code>
          </p>
        )}
      </Card>

      {consentEnabled === false && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-4 text-sm text-[var(--accent-warning)]">
          <span className="flex items-center gap-2"><InfoCircle aria-hidden className="w-4 h-4 shrink-0" />Memory is off. Turn it on to save memories and let the Assistant use them. By turning it on, you agree to text you save being processed and stored by Walrus Memory.</span>
          <Button variant="outline" size="sm" isLoading={isChangingConsent} onClick={() => void setConsent(true)}>Turn on memory</Button>
        </div>
      )}

      {consentEnabled && needsSetup && (
        <MemoryAccountSetup
          walletAddress={walletAddress}
          status={accountStatus as MemoryAccountStatus}
          onReady={() => {
            setAccountStatus('ready');
            toast({ type: 'success', title: 'Your Walrus account is ready', description: 'You can now save memories to it.' });
            void fetchMemories();
          }}
        />
      )}

      {consentEnabled && (accountStatus === 'unavailable' || accountStatus === 'not_configured') && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-4 text-sm text-[var(--accent-warning)]">
          <WarningTriangle aria-hidden className="w-4 h-4 shrink-0" />
          <span>{accountStatus === 'unavailable'
            ? 'Your Walrus account could not be read on Sui right now, so saving is paused. Your other features still work.'
            : 'Walrus accounts are not set up on this server yet, so saving is paused. Your other features still work.'}</span>
          <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => void fetchAccountStatus()}>Check again</Button>
        </div>
      )}

      {deleteOverview.pending.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-4 text-sm text-[var(--accent-warning)]">
          <span className="flex items-center gap-2"><WarningTriangle aria-hidden className="w-4 h-4 shrink-0" />A deletion has not been confirmed on Sui yet. Until it is, treat the memory as still on Walrus.</span>
          <Button variant="outline" size="sm" onClick={handleDeleteSettled}>Check again</Button>
        </div>
      )}

      {consentEnabled && walrus && !walrus.available && !walrus.setupRequired && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)] p-4 text-sm text-[var(--accent-warning)]">
          <WarningTriangle aria-hidden className="w-4 h-4 shrink-0" />
          <span>Walrus cannot be reached right now. Your saved memories below still work, and new ones will be sent when it responds.</span>
        </div>
      )}

      {errorMessage && (
        <Card role="alert" className="flex flex-wrap items-center justify-between gap-3 border-[var(--accent-danger-border)]">
          <span className="flex items-center gap-2 text-sm text-[var(--accent-danger)]"><WarningTriangle aria-hidden className="w-4 h-4 shrink-0" />{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchMemories()} leftIcon={<Refresh className="w-3.5 h-3.5" />}>Try again</Button>
        </Card>
      )}

      <section aria-labelledby="memories-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="memories-title" className="text-base font-bold text-[var(--ink-primary)]">Your memories</h3>
            {!isLoading && memories.length > 0 && <p className="text-xs text-[var(--ink-muted)]">{storedCount} of {memories.length} stored on Walrus</p>}
          </div>
          <Button variant="primary" size="pill" disabled={!canSave} title={canSave ? undefined : consentEnabled ? 'Set up your Walrus account first' : 'Turn on memory first'} leftIcon={<Plus className="w-4 h-4" />} onClick={() => { setAddError(null); setIsAddModalOpen(true); }}>Save a memory</Button>
        </div>

        {syncFailed && memories.length > 0 && (
          <p role="status" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-[var(--accent-warning)]">
            <WarningTriangle aria-hidden className="h-3.5 w-3.5 shrink-0" />Walrus could not be checked just now. These statuses are from the last check.
            <button type="button" onClick={() => void syncWithWalrus()} className="hit font-bold underline cursor-pointer">Check again</button>
          </p>
        )}

        {isLoading ? (
          <Card><ListSkeleton rows={3} label="Loading your memories" /></Card>
        ) : memories.length === 0 && !errorMessage ? (
          <EmptyState
            icon={<Brain className="w-6 h-6" />}
            title="Nothing remembered yet"
            description={canSave ? 'Save a rule like “always keep a buffer”. The Assistant will follow it when you ask about your money.' : consentEnabled ? 'Set up your Walrus account above, then save your first rule.' : 'Turn on memory above, then save your first rule.'}
            actionLabel={canSave ? 'Save your first memory' : undefined}
            onAction={canSave ? () => setIsAddModalOpen(true) : undefined}
          />
        ) : (
          <ul aria-label="Your memories">
<AnimatePresence initial={false}>
            {memories.map((mem) => {
              const status = WALRUS_STATUS[mem.walrusStatus ?? ''];
              return (
                <MotionRow key={mem.id}>
                  <div className="pb-3"><Card className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="sky" className="text-[11px] font-bold">{CATEGORY_LABELS[mem.category].label}</Badge>
                        <Badge variant={status?.variant ?? 'default'} className="text-[11px] font-semibold">{status?.label ?? 'Unknown status'}</Badge>
                      </div>
                      <p className="text-sm font-semibold leading-relaxed text-[var(--ink-primary)]">{mem.text}</p>
                      {mem.walrusBlobId && (
                        <button type="button" onClick={() => void copyBlobId(mem.walrusBlobId as string)} title="Copy Walrus blob ID" className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer">
                          <span className="truncate font-mono">Walrus blob {mem.walrusBlobId}</span>
                          <Copy aria-hidden className="w-3 h-3 shrink-0" />
                        </button>
                      )}
                    </div>
                    <Tooltip label="Hide or delete">
                      <button type="button" onClick={() => setMemoryToRemove(mem)} aria-label={`Hide or delete memory: ${mem.text.slice(0, 40)}`} className="p-2 text-[var(--ink-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger-bg)] rounded-xl transition-colors cursor-pointer">
                        <Trash className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </Card></div>
                </MotionRow>
              );
            })}
</AnimatePresence>
          </ul>
        )}

        {memories.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold">
            <AnimatedLink href="/assistant" className="gap-1 text-[var(--brand-blue)]">See it change your advice: ask the Assistant<ArrowRight className="w-3.5 h-3.5" /></AnimatedLink>
            {storedCount > 0 && <AnimatedLink href="/verification" className="gap-1 text-[var(--brand-blue)]">Check it on Sui<ArrowRight className="w-3.5 h-3.5" /></AnimatedLink>}
          </div>
        )}
      </section>

      {deleteOverview.hidden.length > 0 && (
        <section aria-labelledby="hidden-title" className="space-y-3">
          <div>
            <h3 id="hidden-title" className="text-base font-bold text-[var(--ink-primary)]">Hidden, still on Walrus</h3>
            <p className="text-xs text-[var(--ink-muted)]">Memeora and the Assistant do not use these. Their encrypted copies stay on Walrus until you delete them or their storage ends.</p>
          </div>
          <ul aria-label="Hidden memories" className="space-y-3">
            {deleteOverview.hidden.map((mem) => (
              <li key={mem.id}>
                <Card className="p-4 sm:p-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold leading-relaxed text-[var(--ink-secondary)]">{mem.text}</p>
                    <p className="truncate font-mono text-[11px] text-[var(--ink-muted)]">Walrus blob {mem.walrusBlobId}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" leftIcon={<Trash className="w-3.5 h-3.5" />} onClick={() => openPermanentDelete(mem)}>Delete permanently</Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card variant="subtle" className="flex items-start gap-3 p-5 text-xs leading-relaxed text-[var(--ink-secondary)]">
        <Lock aria-hidden className="w-4 h-4 shrink-0 mt-0.5 text-[var(--brand-blue)]" />
        <p>
          Only text you save here goes to Walrus. Never save passwords, card numbers or recovery phrases. Hiding a memory stops Memeora and the Assistant from using it. Deleting it permanently also ends its storage on Walrus: your wallet approves that and pays a small SUI fee. Encrypted copies in caches can stay downloadable for a while, and copies saved elsewhere are not affected. Memeora&apos;s key can read your memories until you remove it from your Walrus account.
        </p>
      </Card>

      <Modal isOpen={memoryToRemove !== null} onClose={() => setMemoryToRemove(null)} title="Hide or delete this memory?" description="Hiding is instant and can be undone by saving it again. Deleting cannot be undone.">
        <div className="space-y-4">
          <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-tint)] p-3 text-sm font-semibold text-[var(--ink-primary)]">{memoryToRemove?.text}</p>
          <p className="text-xs leading-relaxed text-[var(--ink-secondary)]">
            {memoryToRemove?.walrusBlobId
              ? 'Hide: Memeora and the Assistant stop using it, but its encrypted copy stays on Walrus. Delete permanently: your wallet approves removing it from Walrus storage, and pays a small SUI fee.'
              : 'This memory has no confirmed copy on Walrus yet, so it can only be hidden. If Walrus finishes storing it afterwards, that copy stays there until its storage ends.'}
          </p>
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-3">
            <Button type="button" variant="ghost" onClick={() => setMemoryToRemove(null)}>Keep memory</Button>
            <Button type="button" variant="outline" onClick={handleRemoveMemory}>Hide memory</Button>
            {memoryToRemove?.walrusBlobId && (
              <Button type="button" variant="danger" onClick={() => openPermanentDelete({ id: memoryToRemove.id, text: memoryToRemove.text, walrusBlobId: memoryToRemove.walrusBlobId as string })}>Delete permanently</Button>
            )}
          </div>
        </div>
      </Modal>

      {deleteTarget && (
        <PermanentDeleteDialog
          walletAddress={walletAddress}
          memory={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSettled={handleDeleteSettled}
        />
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => !isSubmitting && setIsAddModalOpen(false)} title="Save a memory" description="Write it the way you would tell a friend. It is stored in your Walrus account and used by the Assistant.">
        <form onSubmit={handleAddMemory} className="space-y-4">
          <div role="group" aria-label="Kind of memory" className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-sunken)] rounded-full text-xs">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <button key={cat} type="button" aria-pressed={newCategory === cat} onClick={() => setNewCategory(cat)} disabled={isSubmitting} className={`py-1.5 rounded-full font-bold transition-colors cursor-pointer ${newCategory === cat ? 'bg-[var(--brand-blue)] text-white' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'}`}>
                {CATEGORY_LABELS[cat].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--ink-muted)]">{CATEGORY_LABELS[newCategory].hint}</p>

          <div className="space-y-1.5">
            <label htmlFor="memory-text" className="block text-xs font-bold text-[var(--ink-primary)]">Your memory</label>
            <textarea id="memory-text" required autoFocus rows={3} minLength={5} maxLength={500} value={newMemoryText} onChange={(e) => setNewMemoryText(e.target.value)} disabled={isSubmitting} className="w-full bg-[var(--surface-elevated)] border border-[var(--border-field)] rounded-[var(--radius-sm)] text-sm text-[var(--ink-primary)] p-3 hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]" />
            <p className="text-right text-[11px] text-[var(--ink-muted)] tabular-nums">{newMemoryText.length}/500</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-[var(--ink-primary)]">Need an idea?</p>
            <div className="flex flex-col items-start gap-1.5">
              {examples.map((example) => (
                <button key={example.text} type="button" onClick={() => { setNewCategory(example.category); setNewMemoryText(example.text); }} className="rounded-[var(--radius-sm)] border border-[var(--border-pill)] px-3 py-1.5 text-left text-xs text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer">{example.text}</button>
              ))}
            </div>
          </div>

          {addError && <p role="alert" className="text-xs text-[var(--accent-danger)]">{addError}</p>}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="pill" isLoading={isSubmitting} disabled={newMemoryText.trim().length < 5 || isSubmitting}>Save to Walrus</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
