// Server-side Domain Types for PayAble AI Guardian

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface TrustedOrder {
  id: string;
  orderReference: string;
  merchantName: string;
  merchantId: string;
  amountMinorUnits: number; // Integer minor units (e.g. 50000 = 500.00 INR, 1500 = 15.00 USD)
  amountDisplay: string;    // "500.00"
  currency: CurrencyCode;
  currencySymbol: string;
  description: string;
  items: Array<{ name: string; quantity: number; priceDisplay: string }>;
  isSimulatedDemo: true;
  supportsLivePayPalSandbox: boolean;
  notes?: string;
}

export type InterpretationStatus = 'CLEAR' | 'AMBIGUOUS' | 'INCOMPLETE' | 'FAILED';

export interface InterpretedIntention {
  rawText: string;
  merchantName?: string;
  amount?: number;           // Standard decimal as spoken/typed (e.g. 500)
  amountMinorUnits?: number; // Integer minor unit representation (e.g. 50000)
  currency?: CurrencyCode;
  paymentPurpose?: string;
  missingFields: string[];
  isAmbiguous: boolean;
  ambiguityReason?: string;
  confidenceExplanation: string;
  interpretationStatus: InterpretationStatus;
  source: 'REAL_AI_SERVICE' | 'OFFLINE_DEMO_PARSER';
}

export type IntentMatchOutcome =
  | 'MATCH'
  | 'MISMATCH'
  | 'NEEDS_CLARIFICATION'
  | 'BLOCKED'
  | 'SERVICE_UNAVAILABLE';

export interface IntentMatchResult {
  outcome: IntentMatchOutcome;
  orderId: string;
  orderReference: string;
  trustedMerchant: string;
  trustedAmountDisplay: string;
  trustedCurrency: CurrencyCode;
  reasons: string[];
  mismatchedFields: Array<'merchant' | 'amount' | 'currency' | 'unknown_order' | 'ambiguity'>;
  userExplanation: string;
  canProceedToReview: boolean;
  canProceedToCheckout: boolean;
  evaluatedAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: 'INTENT_EVALUATION' | 'ORDER_FETCH' | 'PAYMENT_CHECKOUT';
  orderReference: string;
  outcome: IntentMatchOutcome | 'FETCHED';
  reasons: string[];
  clientIpHash?: string;
}
