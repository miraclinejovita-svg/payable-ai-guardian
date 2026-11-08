import { AuditEvent, IntentMatchOutcome } from '../types/index.js';

/**
 * In-Memory Privacy-Conscious Audit Log Service
 * Stores verified decisions and events without logging sensitive user credentials,
 * payment secrets, or raw audio.
 */
class AuditService {
  private events: AuditEvent[] = [];

  public logEvaluation(
    orderReference: string,
    outcome: IntentMatchOutcome,
    reasons: string[]
  ): AuditEvent {
    const event: AuditEvent = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      eventType: 'INTENT_EVALUATION',
      orderReference,
      outcome,
      reasons: reasons.slice(0, 3), // store top reasons only
    };

    this.events.unshift(event);
    if (this.events.length > 500) {
      this.events.pop(); // Keep bounded memory buffer
    }

    return event;
  }

  public getRecentEvents(limit: number = 20): AuditEvent[] {
    return this.events.slice(0, limit);
  }
}

export const auditService = new AuditService();
