import { IntentMatchEngine } from '../services/intentMatch.js';
import { OrderService } from '../services/orderService.js';
import { InterpretedIntention } from '../types/index.js';

const mayaOrder = OrderService.getOrderById('demo-order-1');
if (!mayaOrder) {
  console.error('Error: Maya Stores demo order not found.');
  process.exit(1);
}

console.log('--- TEST: ₹500 Trusted Order vs ₹800 User Intention ---');
console.log(`Trusted Order: ${mayaOrder.merchantName} | ${mayaOrder.currency} ${mayaOrder.amountDisplay} (${mayaOrder.amountMinorUnits} minor units)`);

const userIntention: InterpretedIntention = {
  rawText: 'I want to pay Maya Stores 800 rupees.',
  merchantName: 'Maya Stores',
  amount: 800,
  amountMinorUnits: 80000,
  currency: 'INR',
  missingFields: [],
  isAmbiguous: false,
  confidenceExplanation: 'Clear intention with mismatched amount',
  interpretationStatus: 'CLEAR',
  source: 'OFFLINE_DEMO_PARSER',
};

const result = IntentMatchEngine.evaluate(userIntention, mayaOrder);

console.log(`IntentMatch Outcome: ${result.outcome}`);
console.log(`Can Proceed to Checkout?: ${result.canProceedToCheckout}`);
console.log(`Mismatched Fields: ${result.mismatchedFields.join(', ')}`);
console.log(`Decision Reason: ${result.reasons[0]}`);
console.log(`User-Facing Explanation: ${result.userExplanation}`);

if (result.outcome === 'BLOCKED' && result.canProceedToCheckout === false) {
  console.log('>>> VERIFICATION PASSED: Checkout strictly blocked for mismatched amount.');
  process.exit(0);
} else {
  console.error('>>> VERIFICATION FAILED: Mismatch was not blocked!');
  process.exit(1);
}
