/**
 * Pure domain model for Sovereign Financial Memory.
 * Zero external dependencies (no React, Next.js, database drivers, or external SDKs).
 */

export type MemoryCategory = 'goal' | 'preference' | 'budget';

export type MemoryStatus =
  | 'pending'
  | 'confirmed'
  | 'pending_retry'
  | 'failed'
  | 'superseded';

export interface MemoryRecordProps {
  id: string;
  userId: string;
  category: MemoryCategory;
  text: string;
  walrusBlobId?: string | null;
  /** MemWal remember job, kept until the write is confirmed or fails. */
  walrusJobId?: string | null;
  status: MemoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class MemoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryValidationError';
  }
}

export class MemoryRecord {
  readonly id: string;
  readonly userId: string;
  readonly category: MemoryCategory;
  readonly text: string;
  readonly walrusBlobId: string | null;
  readonly walrusJobId: string | null;
  readonly status: MemoryStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: MemoryRecordProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.category = props.category;
    this.text = props.text;
    this.walrusBlobId = props.walrusBlobId ?? null;
    this.walrusJobId = props.walrusJobId ?? null;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    id: string;
    userId: string;
    category: MemoryCategory;
    text: string;
    walrusBlobId?: string | null;
    walrusJobId?: string | null;
    status?: MemoryStatus;
    createdAt?: Date;
    updatedAt?: Date;
  }): MemoryRecord {
    const trimmed = props.text.trim();
    if (trimmed.length < 5) {
      throw new MemoryValidationError('Memory text must be at least 5 characters long.');
    }
    if (trimmed.length > 500) {
      throw new MemoryValidationError('Memory text cannot exceed 500 characters.');
    }

    const validCategories: MemoryCategory[] = ['goal', 'preference', 'budget'];
    if (!validCategories.includes(props.category)) {
      throw new MemoryValidationError(
        `Invalid category: "${props.category}". Allowed: ${validCategories.join(', ')}.`
      );
    }

    const now = new Date();
    return new MemoryRecord({
      id: props.id,
      userId: props.userId,
      category: props.category,
      text: trimmed,
      walrusBlobId: props.walrusBlobId ?? null,
      walrusJobId: props.walrusJobId ?? null,
      status: props.status ?? 'pending',
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  withStatus(newStatus: MemoryStatus, walrusBlobId?: string | null): MemoryRecord {
    return new MemoryRecord({
      ...this,
      status: newStatus,
      walrusBlobId: walrusBlobId !== undefined ? walrusBlobId : this.walrusBlobId,
      updatedAt: new Date(),
    });
  }

  isConfirmed(): boolean {
    return this.status === 'confirmed' && Boolean(this.walrusBlobId);
  }

  isSuperseded(): boolean {
    return this.status === 'superseded';
  }
}

