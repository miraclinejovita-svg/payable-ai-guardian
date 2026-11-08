import { InterpretedIntention, IntentMatchResult, TrustedOrder, CurrencyCode } from '../types';

/**
 * Currency Minor Unit Multipliers
 * INR: 100 paise = 1 INR
 * USD: 100 cents = 1 USD
 * EUR: 100 cents = 1 EUR
 * GBP: 100 pence = 1 GBP
 */
const MINOR_UNIT_MULTIPLIERS: Record<CurrencyCode, number> = {
  INR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
};

/**
 * Offline Demo Natural Language Parser
 * Used ONLY as a frontend foundation fallback before Phase 4 (Real AI Integration).
 * Explicitly labeled as OFFLINE_DEMO_PARSER.
 */
export function parseIntentOffline(rawText: string): InterpretedIntention {
  const text = rawText.toLowerCase().trim();
  const missingFields: string[] = [];

  // 1. Identify Currency using word boundaries (preventing false positives like "rs" in "stores")
  let detectedCurrency: CurrencyCode | undefined;
  if (/\b(rupees?|inr|rs\.?|₹)\b/i.test(text) || text.includes('₹')) {
    detectedCurrency = 'INR';
  } else if (/\b(dollars?|usd|\$)\b/i.test(text) || text.includes('$')) {
    detectedCurrency = 'USD';
  } else if (/\b(euros?|eur|€)\b/i.test(text) || text.includes('€')) {
    detectedCurrency = 'EUR';
  } else if (/\b(pounds?|gbp|£)\b/i.test(text) || text.includes('£')) {
    detectedCurrency = 'GBP';
  } else {
    missingFields.push('currency');
  }

  // 2. Identify Amount (Numeric or simple word match)
  const amountMatch = text.match(/\b\d+(\.\d{1,2})?\b/);
  let detectedAmount: number | undefined;
  let detectedMinorUnits: number | undefined;

  if (amountMatch) {
    detectedAmount = parseFloat(amountMatch[0]);
    if (detectedCurrency) {
      detectedMinorUnits = Math.round(detectedAmount * MINOR_UNIT_MULTIPLIERS[detectedCurrency]);
    }
  } else {
    // Check for common spoken numbers
    if (text.includes('five hundred')) {
      detectedAmount = 500;
      detectedMinorUnits = 50000;
    } else if (text.includes('eight hundred')) {
      detectedAmount = 800;
      detectedMinorUnits = 80000;
    } else if (text.includes('twelve hundred') || text.includes('one thousand two hundred')) {
      detectedAmount = 1200;
      detectedMinorUnits = 120000;
    } else if (text.includes('fifteen')) {
      detectedAmount = 15;
      detectedMinorUnits = 1500;
    } else {
      missingFields.push('amount');
    }
  }

  // 3. Identify Merchant
  let detectedMerchant: string | undefined;
  if (text.includes('maya stores') || text.includes('maya store')) {
    detectedMerchant = 'Maya Stores';
  } else if (text.includes('tech essentials')) {
    detectedMerchant = 'Tech Essentials';
  } else if (text.includes('global software') || text.includes('global goods') || text.includes('global tech')) {
    detectedMerchant = 'Global Software & Tech';
  } else if (text.includes('maya')) {
    // Ambiguous mention
    detectedMerchant = 'Maya';
  } else {
    missingFields.push('merchant');
  }

  // 4. Ambiguity Evaluation
  let isAmbiguous = false;
  let ambiguityReason: string | undefined;

  if (detectedMerchant === 'Maya') {
    isAmbiguous = true;
    ambiguityReason = 'Merchant name "Maya" is incomplete or ambiguous. Maya Stores was likely intended.';
  } else if (missingFields.includes('amount')) {
    isAmbiguous = true;
    ambiguityReason = 'No payment amount was specified in your request.';
  } else if (missingFields.includes('currency')) {
    isAmbiguous = true;
    ambiguityReason = 'No currency was specified in your request.';
  }

  let interpretationStatus: InterpretedIntention['interpretationStatus'] = 'CLEAR';
  if (isAmbiguous) {
    interpretationStatus = 'AMBIGUOUS';
  } else if (missingFields.length > 0) {
    interpretationStatus = 'INCOMPLETE';
  }

  return {
    rawText,
    merchantName: detectedMerchant,
    amount: detectedAmount,
    amountMinorUnits: detectedMinorUnits,
    currency: detectedCurrency,
    missingFields,
    isAmbiguous,
    ambiguityReason,
    confidenceExplanation: 'Interpreted using offline rule-based parser (Phase 2 foundation mode).',
    interpretationStatus,
    source: 'OFFLINE_DEMO_PARSER',
  };
}

/**
 * Deterministic IntentMatch Evaluation
 * Compares the parsed intention with authoritative order data.
 * Adheres strictly to the 10 safety rules.
 */
export function evaluateIntentMatch(
  intention: InterpretedIntention,
  trustedOrder: TrustedOrder
): IntentMatchResult {
  const reasons: string[] = [];
  const mismatchedFields: IntentMatchResult['mismatchedFields'] = [];
  const now = new Date().toISOString();

  // Rule: Ambiguity or missing essential information blocks or requires clarification
  if (intention.isAmbiguous || intention.missingFields.length > 0) {
    return {
      outcome: 'NEEDS_CLARIFICATION',
      orderId: trustedOrder.id,
      reasons: [
        intention.ambiguityReason ||
          `Missing payment details: ${intention.missingFields.join(', ')}.`,
      ],
      mismatchedFields: ['ambiguity'],
      userExplanation: `Your intention needs clarification. ${intention.ambiguityReason || 'Please state both the merchant and exact amount clearly.'}`,
      canProceedToReview: false,
      canProceedToCheckout: false,
      evaluatedAt: now,
    };
  }

  // Rule: Currency Match Check (Minor units must be measured in the exact same currency)
  if (intention.currency !== trustedOrder.currency) {
    mismatchedFields.push('currency');
    reasons.push(
      `Currency mismatch: You specified ${intention.currency || 'unknown'}, but order ${trustedOrder.orderReference} is in ${trustedOrder.currency}.`
    );
  }

  // Rule: Safe Decimal / Minor-unit Amount Check (Integer comparison only)
  if (intention.amountMinorUnits !== trustedOrder.amountMinorUnits) {
    mismatchedFields.push('amount');
    const userAmountDisplay = intention.amount !== undefined ? intention.amount.toFixed(2) : 'unknown';
    reasons.push(
      `Amount mismatch: You specified ${intention.currency || ''} ${userAmountDisplay}, but order ${trustedOrder.orderReference} is ${trustedOrder.currency} ${trustedOrder.amountDisplay}.`
    );
  }

  // Rule: Merchant Identity Check
  const normalizedIntentionMerchant = (intention.merchantName || '').toLowerCase().trim();
  const normalizedTrustedMerchant = trustedOrder.merchantName.toLowerCase().trim();

  if (normalizedIntentionMerchant !== normalizedTrustedMerchant) {
    mismatchedFields.push('merchant');
    reasons.push(
      `Merchant mismatch: You named "${intention.merchantName || 'unknown'}", but trusted order is for "${trustedOrder.merchantName}".`
    );
  }

  // Outcome Resolution
  if (mismatchedFields.length > 0) {
    const reasonsSummary = reasons.join(' ');
    return {
      outcome: 'BLOCKED',
      orderId: trustedOrder.id,
      reasons,
      mismatchedFields,
      userExplanation: `Checkout is BLOCKED due to a safety mismatch: ${reasonsSummary}`,
      canProceedToReview: false,
      canProceedToCheckout: false,
      evaluatedAt: now,
    };
  }

  // Exact Match Found!
  return {
    outcome: 'MATCH',
    orderId: trustedOrder.id,
    reasons: ['Intent exactly matches the trusted order amount, currency, and merchant.'],
    mismatchedFields: [],
    userExplanation: `Verification successful! Your intention to pay ${trustedOrder.merchantName} ${trustedOrder.currency} ${trustedOrder.amountDisplay} matches order ${trustedOrder.orderReference}. Please review the order details before checkout.`,
    canProceedToReview: true,
    canProceedToCheckout: true,
    evaluatedAt: now,
  };
}
