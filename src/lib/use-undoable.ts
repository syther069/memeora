'use client';

import * as React from 'react';
import { useToast } from '@/components/ui/toast';

const UNDO_WINDOW_MS = 6000;

interface Pending {
  commit: () => Promise<void>;
  timer: number;
  toastId: string;
}

export interface UndoableAction {
  title: string;
  description?: string;
  /** Changes the screen straight away. */
  apply: () => void;
  /** Puts the screen back, after Undo or a failed commit. */
  revert: () => void;
  /** The real change, sent once the undo window closes. */
  commit: () => Promise<void>;
  failureTitle: string;
  /** After a successful commit. */
  onCommitted?: () => void;
}

/**
 * Applies a reversible action on screen at once, offers Undo, and only then tells
 * the server. If the page goes away first the change is sent immediately, because
 * the user meant it and did not undo it. Commits must use `keepalive` to survive that.
 */
export function useUndoable() {
  const { toast, dismiss } = useToast();
  const pending = React.useRef(new Map<string, Pending>());

  const flush = React.useCallback(() => {
    for (const [id, action] of pending.current) {
      window.clearTimeout(action.timer);
      pending.current.delete(id);
      void action.commit().catch(() => undefined);
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return React.useCallback((action: UndoableAction) => {
    const id = globalThis.crypto.randomUUID();
    action.apply();

    const run = async () => {
      const entry = pending.current.get(id);
      if (!entry) return;
      pending.current.delete(id);
      dismiss(entry.toastId);
      try {
        await action.commit();
        action.onCommitted?.();
      } catch (cause) {
        action.revert();
        toast({ type: 'error', title: action.failureTitle, description: cause instanceof Error ? cause.message : 'Please try again.', durationMs: 6000 });
      }
    };

    const toastId = toast({
      type: 'info',
      title: action.title,
      description: action.description,
      durationMs: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          const entry = pending.current.get(id);
          if (!entry) return;
          window.clearTimeout(entry.timer);
          pending.current.delete(id);
          action.revert();
        },
      },
    });
    pending.current.set(id, { commit: action.commit, timer: window.setTimeout(() => { void run(); }, UNDO_WINDOW_MS), toastId });
  }, [toast, dismiss]);
}
