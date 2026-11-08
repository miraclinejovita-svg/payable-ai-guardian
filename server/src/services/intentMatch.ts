import { z } from 'zod';
import {
  CurrencyCode,
  InterpretedIntention,
  IntentMatchResult,
  TrustedOrder,
} from '../types/index.js';

// Minor unit multipliers: 100 paise = 1 INR, 100 cents = 1 USD/EUR/GBP
export const CURRENCY_MINOR_MULTIPLIERS: Record<CurrencyCode, number> = {
  INR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
};

/**
 * Zod Schema for Validating Intention Objects received by the Safety Engine
 */
export const IntentionSchema = z.object({
  rawText: z.string().min(1, 'Raw intention text is required').max(500),
  merchantName: z.string().max(100).optional(),
  amount: z.number().positive('Amount must be positive').max(10000000).optional(),
  amountMinorUnits: z.number().int('Minor units must be an integer').nonnegative().optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  paymentPurpose: z.string().max(200).optional(),
  missingFields: z.array(z.string()).default([]),
  isAmbiguous: z.boolean().default(false),
  ambiguityReason: z.string().optional(),
  confidenceExplanation: z.string().default(''),
  interpretationStatus: z.enum(['CLEAR', 'AMBIGUOUS', 'INCOMPLETE', 'FAILED']).default('CLEAR'),
  source: z.enum(['REAL_AI_SERVICE', 'OFFLINE_DEMO_PARSER']).default('OFFLINE_DEMO_PARSER'),
});

/**
 * Request payload for POST /api/intent/match
 */
export const IntentMatchRequestSchema = z.object({
  orderId: z.string().min(1, 'Authoritative orderId is required'),
  intention: IntentionSchema,
});

export type ValidatedIntentMatchRequest = z.infer<typeof IntentMatchRequestSchema>;

/**
 * Convert standard decimal amount to minor units safely without floating-point errors.
 * e.g., 500.00 with multiplier 100 becomes 50000.
 */
export function convertToMinorUnits(amount: number, currency: CurrencyCode): number {
  const multiplier = CURRENCY_MINOR_MULTIPLIERS[currency];
  if (!multiplier) {
    throw new Error(`Unsupported currency for minor unit conversion: ${currency}`);
  }
  // Math.round ensures that 19.99 * 100 (which might be 1998.9999999999998 in floating point) becomes strictly 1999
  return Math.round(amount * multiplier);
}

/**
 * Deterministic IntentMatch Safety Engine
 * Compares an interpreted intention against authoritative backend order details.
 * Rule: AI output NEVER overrides this deterministic engine.
 */
export class IntentMatchEngine {
  public static evaluate(
    intention: InterpretedIntention,
    trustedOrder: TrustedOrder
  ): IntentMatchResult {
    const reasons: string[] = [];
    const mismatchedFields: IntentMatchResult['mismatchedFields'] = [];
    const evaluatedAt = new Date().toISOString();

    // Base context from trusted order
    const baseResult = {
      orderId: trustedOrder.id,
      orderReference: trustedOrder.orderReference,
      trustedMerchant: trustedOrder.merchantName,
      trustedAmountDisplay: trustedOrder.amountDisplay,
      trustedCurrency: trustedOrder.currency,
      evaluatedAt,
    };

    // Rule 1: Missing information or ambiguity requires clarification
    if (intention.isAmbiguous || intention.missingFields.length > 0) {
      const ambiguityReason =
        intention.ambiguityReason ||
        `Missing essential payment details: ${intention.missingFields.join(', ')}.`;

      return {
        ...baseResult,
        outcome: 'NEEDS_CLARIFICATION',
        reasons: [ambiguityReason],
        mismatchedFields: ['ambiguity'],
        userExplanation: `Your payment intention needs clarification before checkout can be reviewed. ${ambiguityReason} Please specify both the exact merchant and amount.`,
        canProceedToReview: false,
        canProceedToCheckout: false,
      };
    }

    // Rule 2: Amount presence & positive value check
    if (intention.amount === undefined || intention.amount <= 0) {
      return {
        ...baseResult,
        outcome: 'NEEDS_CLARIFICATION',
        reasons: ['No valid positive payment amount was specified.'],
        mismatchedFields: ['amount', 'ambiguity'],
        userExplanation: 'No valid payment amount was detected. Please state the amount you wish to pay.',
        canProceedToReview: false,
        canProceedToCheckout: false,
      };
    }

    // Rule 3: Currency Match Check
    if (!intention.currency || intention.currency !== trustedOrder.currency) {
      mismatchedFields.push('currency');
      reasons.push(
        `Currency mismatch: You specified ${intention.currency || 'no currency'}, but trusted order ${trustedOrder.orderReference} is in ${trustedOrder.currency}.`
      );
    }

    // Rule 4: Compute minor units deterministically if not provided
    const userMinorUnits =
      intention.amountMinorUnits !== undefined
        ? intention.amountMinorUnits
        : intention.currency
        ? convertToMinorUnits(intention.amount, intention.currency)
        : -1;

    // Rule 5: Integer Minor-Unit Amount Comparison (Never use floating-point equality)
    if (userMinorUnits !== trustedOrder.amountMinorUnits) {
      mismatchedFields.push('amount');
      const requestedDisplay = intention.amount.toFixed(2);
      reasons.push(
        `Amount mismatch: The requested amount is ${intention.currency || ''} ${requestedDisplay}, but the selected trusted order is ${trustedOrder.currency} ${trustedOrder.amountDisplay}.`
      );
    }

    // Rule 6: Merchant Normalization & Identity Verification
    const normalizedIntendedMerchant = (intention.merchantName || '').toLowerCase().trim();
    const normalizedTrustedMerchant = trustedOrder.merchantName.toLowerCase().trim();

    if (!normalizedIntendedMerchant || normalizedIntendedMerchant !== normalizedTrustedMerchant) {
      mismatchedFields.push('merchant');
      reasons.push(
        `Merchant mismatch: You requested payment to "${intention.merchantName || 'unnamed merchant'}", but the selected trusted order is for "${trustedOrder.merchantName}".`
      );
    }

    // Outcome Resolution: If any field mismatched, BLOCK checkout
    if (mismatchedFields.length > 0) {
      const explanationText = `Checkout is BLOCKED due to safety mismatches: ${reasons.join(' ')} Please select the correct order or correct your intention.`;

      return {
        ...baseResult,
        outcome: 'BLOCKED',
        reasons,
        mismatchedFields,
        userExplanation: explanationText,
        canProceedToReview: false,
        canProceedToCheckout: false,
      };
    }

    // Exact Match: All deterministic checks passed
    return {
      ...baseResult,
      outcome: 'MATCH',
      reasons: ['Intention strictly matches the authoritative merchant, currency, and minor-unit amount.'],
      mismatchedFields: [],
      userExplanation: `Safety verification successful! Your intention to pay ${trustedOrder.merchantName} ${trustedOrder.currency} ${trustedOrder.amountDisplay} matches order ${trustedOrder.orderReference}. Please review and explicitly confirm the details before proceeding to PayPal Sandbox.`,
      canProceedToReview: true,
      canProceedToCheckout: true,
    };
  }
}
