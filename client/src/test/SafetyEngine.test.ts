import { describe, it, expect } from 'vitest';
import { parseIntentOffline, evaluateIntentMatch } from '../services/safetyEngine';
import { TrustedOrder } from '../types';

const mockOrderA: TrustedOrder = {
  id: 'demo-order-1',
  orderReference: 'DEMO-ORDER-001',
  merchantName: 'Maya Stores',
  merchantId: 'MCH-MAYA-9921',
  amountMinorUnits: 50000, // 500.00 INR
  amountDisplay: '500.00',
  currency: 'INR',
  currencySymbol: '₹',
  description: 'Weekly grocery basket',
  items: [{ name: 'Rice', quantity: 1, priceDisplay: '₹500.00' }],
  isSimulatedDemo: true,
  supportsLivePayPalSandbox: false,
};

describe('IntentMatch Safety Engine & Offline Parser Tests', () => {
  it('Scenario 1: Exact amount and merchant match succeeds with MATCH outcome', () => {
    const parsed = parseIntentOffline('I want to pay Maya Stores 500 rupees.');
    expect(parsed.merchantName).toBe('Maya Stores');
    expect(parsed.amount).toBe(500);
    expect(parsed.currency).toBe('INR');
    expect(parsed.amountMinorUnits).toBe(50000);

    const result = evaluateIntentMatch(parsed, mockOrderA);
    expect(result.outcome).toBe('MATCH');
    expect(result.canProceedToCheckout).toBe(true);
    expect(result.mismatchedFields).toHaveLength(0);
  });

  it('Scenario 2: Amount mismatch is BLOCKED (e.g. 800 requested for 500 order)', () => {
    const parsed = parseIntentOffline('I want to pay Maya Stores 800 rupees.');
    expect(parsed.amount).toBe(800);
    expect(parsed.amountMinorUnits).toBe(80000);

    const result = evaluateIntentMatch(parsed, mockOrderA);
    expect(result.outcome).toBe('BLOCKED');
    expect(result.canProceedToCheckout).toBe(false);
    expect(result.mismatchedFields).toContain('amount');
    expect(result.userExplanation).toContain('Amount mismatch');
  });

  it('Scenario 3: Currency mismatch is BLOCKED (e.g. USD requested for INR order)', () => {
    const parsed = parseIntentOffline('I want to pay Maya Stores 500 dollars.');
    expect(parsed.currency).toBe('USD');

    const result = evaluateIntentMatch(parsed, mockOrderA);
    expect(result.outcome).toBe('BLOCKED');
    expect(result.canProceedToCheckout).toBe(false);
    expect(result.mismatchedFields).toContain('currency');
  });

  it('Scenario 4: Ambiguous intention requires clarification (NEEDS_CLARIFICATION)', () => {
    const parsed = parseIntentOffline('I want to pay Maya.');
    expect(parsed.isAmbiguous).toBe(true);
    expect(parsed.missingFields).toContain('amount');

    const result = evaluateIntentMatch(parsed, mockOrderA);
    expect(result.outcome).toBe('NEEDS_CLARIFICATION');
    expect(result.canProceedToCheckout).toBe(false);
    expect(result.mismatchedFields).toContain('ambiguity');
  });

  it('Scenario 5: Merchant mismatch is BLOCKED (e.g. Tech Essentials vs Maya Stores)', () => {
    const parsed = parseIntentOffline('I want to pay Tech Essentials 500 rupees.');
    expect(parsed.merchantName).toBe('Tech Essentials');

    const result = evaluateIntentMatch(parsed, mockOrderA);
    expect(result.outcome).toBe('BLOCKED');
    expect(result.canProceedToCheckout).toBe(false);
    expect(result.mismatchedFields).toContain('merchant');
  });
});
