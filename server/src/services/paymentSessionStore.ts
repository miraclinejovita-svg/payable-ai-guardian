import crypto from 'crypto';
import { TrustedOrder } from '../types/index.js';

export type PaymentSessionStatus =
  | 'CREATED'
  | 'APPROVED'
  | 'CAPTURING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'UNKNOWN';

export interface PaymentSession {
  paypalOrderId: string;
  applicationOrderId: string;
  orderReference: string;
  trustedAmountMinorUnits: number;
  trustedAmountDisplay: string;
  trustedCurrency: string;
  status: PaymentSessionStatus;
  consentHash: string;
  createdAt: string;
  updatedAt: string;
  idempotencyKeyCreate: string;
  idempotencyKeyCapture?: string;
  captureId?: string;
  failureReason?: string;
}

/**
 * In-Memory Payment Session Store
 * 
 * PROTOTYPE LIMITATION NOTICE:
 * This in-memory store is designed for local hackathon and sandbox demonstrations.
 * In a multi-instance or production deployment, this MUST be backed by a persistent,
 * ACID-compliant database (e.g., PostgreSQL or Redis with distributed locking).
 * 
 * FAIL-CLOSED BEHAVIOR:
 * If the server restarts, active session mappings are discarded. The backend strictly
 * fails closed: it will REJECT any capture attempt for an unrecognized PayPal Order ID,
 * and will never reconstruct trusted ownership from frontend hints.
 */
class PaymentSessionStore {
  private sessions = new Map<string, PaymentSession>();
  private activeLocks = new Set<string>();

  /**
   * Generates a tamper-evident hash of explicit user consent bound to the exact order details.
   */
  public generateConsentHash(order: TrustedOrder, consentTimestamp: string): string {
    return crypto
      .createHash('sha256')
      .update(`${order.id}:${order.amountMinorUnits}:${order.currency}:${consentTimestamp}`)
      .digest('hex');
  }

  /**
   * Registers a newly created PayPal order linked to an authoritative application order.
   */
  public createSession(
    paypalOrderId: string,
    order: TrustedOrder,
    consentHash: string,
    idempotencyKeyCreate: string
  ): PaymentSession {
    const now = new Date().toISOString();
    const session: PaymentSession = {
      paypalOrderId,
      applicationOrderId: order.id,
      orderReference: order.orderReference,
      trustedAmountMinorUnits: order.amountMinorUnits,
      trustedAmountDisplay: order.amountDisplay,
      trustedCurrency: order.currency,
      status: 'CREATED',
      consentHash,
      createdAt: now,
      updatedAt: now,
      idempotencyKeyCreate,
    };

    this.sessions.set(paypalOrderId, session);
    return { ...session };
  }

  public getSession(paypalOrderId: string): PaymentSession | undefined {
    const session = this.sessions.get(paypalOrderId);
    return session ? { ...session } : undefined;
  }

  /**
   * Acquires a lock and transitions the session to CAPTURING state.
   * Prevents race conditions and duplicate concurrent capture attempts.
   */
  public acquireCaptureLock(paypalOrderId: string, idempotencyKey: string): { success: boolean; session?: PaymentSession; error?: string } {
    const session = this.sessions.get(paypalOrderId);
    if (!session) {
      return { success: false, error: 'SESSION_NOT_FOUND' };
    }

    // Already completed: return existing capture idempotently
    if (session.status === 'COMPLETED') {
      return { success: true, session: { ...session } };
    }

    // Terminal or invalid states
    if (session.status === 'CANCELLED' || session.status === 'FAILED') {
      return { success: false, error: `INVALID_STATE_TRANSITION: Cannot capture session in ${session.status} state.` };
    }

    // Concurrent capture already in flight
    if (this.activeLocks.has(paypalOrderId) || session.status === 'CAPTURING') {
      return { success: false, error: 'CONCURRENT_CAPTURE_IN_PROGRESS' };
    }

    // Acquire lock and transition
    this.activeLocks.add(paypalOrderId);
    session.status = 'CAPTURING';
    session.idempotencyKeyCapture = idempotencyKey;
    session.updatedAt = new Date().toISOString();

    return { success: true, session: { ...session } };
  }

  /**
   * Releases lock and updates the session after capture evaluation.
   */
  public finalizeCapture(
    paypalOrderId: string,
    finalStatus: 'COMPLETED' | 'FAILED' | 'UNKNOWN',
    captureId?: string,
    failureReason?: string
  ): PaymentSession | undefined {
    this.activeLocks.delete(paypalOrderId);
    const session = this.sessions.get(paypalOrderId);
    if (!session) return undefined;

    session.status = finalStatus;
    if (captureId) session.captureId = captureId;
    if (failureReason) session.failureReason = failureReason;
    session.updatedAt = new Date().toISOString();

    return { ...session };
  }

  /**
   * Releases lock on unexpected error without finalizing terminal state.
   */
  public releaseLock(paypalOrderId: string): void {
    this.activeLocks.delete(paypalOrderId);
  }

  /**
   * Marks a session as CANCELLED by buyer.
   */
  public markCancelled(paypalOrderId: string): boolean {
    const session = this.sessions.get(paypalOrderId);
    if (!session || session.status === 'COMPLETED') return false;

    session.status = 'CANCELLED';
    session.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Test utility to simulate a server crash/restart (clears in-memory state).
   */
  public clearForTesting(): void {
    this.sessions.clear();
    this.activeLocks.clear();
  }
}

export const paymentSessionStore = new PaymentSessionStore();
