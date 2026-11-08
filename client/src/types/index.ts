// TypeScript definitions for PayAble AI Guardian

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface TrustedOrder {
  id: string;
  orderReference: string;
  merchantName: string;
  merchantId: string;
  amountMinorUnits: number; // Stored in minor units (e.g., 50000 = INR 500.00, 1500 = USD 15.00)
  amountDisplay: string;    // "500.00"
  currency: CurrencyCode;
  currencySymbol: string;   // "₹" or "$"
  description: string;
  items: Array<{ name: string; quantity: number; priceDisplay: string }>;
  isSimulatedDemo: true;
  supportsLivePayPalSandbox: boolean; // Indicates if currency is enabled for Sandbox direct test checkout
  notes?: string;
}

export interface InterpretedIntention {
  rawText: string;
  merchantName?: string;
  amount?: number;           // Standard decimal as spoken/typed (e.g. 500)
  amountMinorUnits?: number; // Integer minor unit (e.g. 50000)
  currency?: CurrencyCode;
  paymentPurpose?: string;
  missingFields: string[];
  isAmbiguous: boolean;
  ambiguityReason?: string;
  confidenceExplanation: string;
  interpretationStatus: 'CLEAR' | 'AMBIGUOUS' | 'INCOMPLETE' | 'FAILED';
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
  reasons: string[];
  mismatchedFields: Array<'merchant' | 'amount' | 'currency' | 'unknown_order' | 'ambiguity'>;
  userExplanation: string; // Plain-language explanation for speech and visual display
  canProceedToReview: boolean;
  canProceedToCheckout: boolean;
  evaluatedAt: string;
}

export type TransactionStatus =
  | 'IDLE'
  | 'INTERPRETING'
  | 'REVIEW_REQUIRED'
  | 'BLOCKED'
  | 'CHECKOUT_READY'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'UNKNOWN';

export interface DemoActivityRecord {
  id: string;
  timestamp: string;
  orderReference: string;
  merchantName: string;
  amountDisplay: string;
  currency: CurrencyCode;
  matchOutcome: IntentMatchOutcome;
  transactionStatus: TransactionStatus;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  isSimulated: boolean;
  details: string;
}

export interface UserPreferences {
  speechEnabled: boolean;
  speechRate: number; // 0.8 to 1.4
  textScale: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reducedMotion: boolean;
  preferredInput: 'voice' | 'typed';
}

export interface ServiceHealth {
  server: 'online' | 'offline' | 'checking';
  aiProvider: 'real_gemini' | 'real_openai' | 'offline_fallback' | 'checking';
  paypalSandbox: 'configured' | 'pending_credentials' | 'offline' | 'checking';
  message: string;
}
