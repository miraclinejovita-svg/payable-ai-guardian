import { describe, it, expect } from 'vitest';
import {
  IntentMatchEngine,
  convertToMinorUnits,
} from '../services/intentMatch.js';
import { TrustedOrder, InterpretedIntention } from '../types/index.js';

// Maya Stores: 500.00 INR (50000 paise)
const mayaOrder: TrustedOrder = {
  id: 'demo-order-1',
  orderReference: 'DEMO-ORDER-001',
  merchantName: 'Maya Stores',
  merchantId: 'MCH-MAYA-9921',
  amountMinorUnits: 50000,
  amountDisplay: '500.00',
  currency: 'INR',
  currencySymbol: '₹',
  description: 'Weekly grocery basket',
  items: [{ name: 'Rice', quantity: 1, priceDisplay: '₹500.00' }],
  isSimulatedDemo: true,
  supportsLivePayPalSandbox: false,
};

describe('Server-Side IntentMatch Engine Tests', () => {
  it('Scenario 1: Exact amount, merchant, and currency match succeeds with MATCH', () => {
    const intention: InterpretedIntention = {
      rawText: 'I want to pay Maya Stores 500 rupees.',
      merchantName: 'Maya Stores',
      amount: 500,
      amountMinorUnits: 50000,
      currency: 'INR',
      missingFields: [],
      isAmbiguous: false,
      confidenceExplanation: 'Clear intention',
      interpretationStatus: 'CLEAR',
      source: 'OFFLINE_DEMO_PARSER',
    };

    const result = IntentMatchEngine.evaluate(intention, mayaOrder);
    expect(result.outcome).toBe('MATCH');
    expect(result.canProceedToReview).toBe(true);
    expect(result.canProceedToCheckout).toBe(true);
    expect(result.mismatchedFields).toHaveLength(0);
    expect(result.userExplanation).toContain('Safety verification successful');
  });

  it('Scenario 2: Amount mismatch — ₹500 trusted order CANNOT proceed when user requests ₹800', () => {
    const intention: InterpretedIntention = {
      rawText: 'I want to pay Maya Stores 800 rupees.',
      merchantName: 'Maya Stores',
      amount: 800,
      amountMinorUnits: 80000,
      currency: 'INR',
      missingFields: [],
      isAmbiguous: false,
      confidenceExplanation: 'Clear intention but wrong amount',
      interpretationStatus: 'CLEAR',
      source: 'OFFLINE_DEMO_PARSER',
    };

    const result = IntentMatchEngine.evaluate(intention, mayaOrder);
    expect(result.outcome).toBe('BLOCKED');
    expect(result.canProceedToReview).toBe(false);
    expect(result.canProceedToCheckout).toBe(false);
    expect(result.mismatchedFields).toContain('amount');
    expect(result.reasons[0]).toContain('The requested amount is INR 800.00, but the selected trusted order is INR 500.00');
  });

  it('Scenario 3: Currency mismatch — USD requested for INR order is BLOCKED', () => {
    const intention: InterpretedIntention = {
      rawText: 'I want to pay Maya Stores 500 dollars.',
      merchantName: 'Maya Stores',
      amount: 500,
      amountMinorUnits: 50000,
      currency: 'USD',
      missingFields: [],
      isAmbiguous: false,
      confidenceExplanation: 'USD specified',
      interpretationStatus: 'CLEAR',
      source: 'OFFLINE_DEMO_PARSER',
    };

    const result = IntentMatchEngine.evaluate(intention, mayaOrder);
    expect(result.outcome).toBe('BLOCKED');
    expect(result.mismatchedFields).toContain('currency');
    expect(result.userExplanation).toContain('Currency mismatch');
  });

  it('Scenario 4: Merchant mismatch — Tech Essentials vs Maya Stores is BLOCKED', () => {
    const intention: InterpretedIntention = {
      rawText: 'I want to pay Tech Essentials 500 rupees.',
      merchantName: 'Tech Essentials',
      amount: 500,
      amountMinorUnits: 50000,
      currency: 'INR',
      missingFields: [],
      isAmbiguous: false,
      confidenceExplanation: 'Different merchant',
      interpretationStatus: 'CLEAR',
      source: 'OFFLINE_DEMO_PARSER',
    };

    const result = IntentMatchEngine.evaluate(intention, mayaOrder);
    expect(result.outcome).toBe('BLOCKED');
    expect(result.mismatchedFields).toContain('merchant');
  });

  it('Scenario 5: Ambiguous intention (missing amount) returns NEEDS_CLARIFICATION', () => {
    const intention: InterpretedIntention = {
      rawText: 'I want to pay Maya Stores.',
      merchantName: 'Maya Stores',
      missingFields: ['amount'],
      isAmbiguous: true,
      ambiguityReason: 'No payment amount was specified in your request.',
      confidenceExplanation: 'Missing amount',
      interpretationStatus: 'AMBIGUOUS',
      source: 'OFFLINE_DEMO_PARSER',
    };

    const result = IntentMatchEngine.evaluate(intention, mayaOrder);
    expect(result.outcome).toBe('NEEDS_CLARIFICATION');
    expect(result.canProceedToCheckout).toBe(false);
    expect(result.mismatchedFields).toContain('ambiguity');
  });

  it('Scenario 6: Integer Minor Units conversion prevents floating point drift', () => {
    expect(convertToMinorUnits(500, 'INR')).toBe(50000);
    expect(convertToMinorUnits(15.99, 'USD')).toBe(1599);
    expect(convertToMinorUnits(0.1 + 0.2, 'USD')).toBe(30); // 0.30000000000000004 rounded to 30 cents
  });
});
