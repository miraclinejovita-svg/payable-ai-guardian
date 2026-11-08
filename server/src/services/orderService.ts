import { TrustedOrder } from '../types/index.js';

/**
 * Authoritative Demo Orders Catalog (Backend Source of Truth)
 * The server never trusts client-supplied order amounts or merchant details.
 * Monetary values are stored as integer minor units:
 * - 500.00 INR = 50000 paise
 * - 1200.00 INR = 120000 paise
 * - 15.00 USD = 1500 cents
 */
const AUTHORITATIVE_DEMO_ORDERS: TrustedOrder[] = [
  {
    id: 'demo-order-1',
    orderReference: 'DEMO-ORDER-001',
    merchantName: 'Maya Stores',
    merchantId: 'MCH-MAYA-9921',
    amountMinorUnits: 50000,
    amountDisplay: '500.00',
    currency: 'INR',
    currencySymbol: '₹',
    description: 'Weekly grocery basket and organic produce',
    items: [
      { name: 'Organic Basmati Rice (1kg)', quantity: 1, priceDisplay: '₹180.00' },
      { name: 'Whole Wheat Flour (2kg)', quantity: 1, priceDisplay: '₹120.00' },
      { name: 'Cold Pressed Sunflower Oil (1L)', quantity: 1, priceDisplay: '₹200.00' },
    ],
    isSimulatedDemo: true,
    supportsLivePayPalSandbox: false,
    notes: 'Indian Rupee domestic demo order for strict mismatch & consistency testing.',
  },
  {
    id: 'demo-order-2',
    orderReference: 'DEMO-ORDER-002',
    merchantName: 'Tech Essentials',
    merchantId: 'MCH-TECH-4412',
    amountMinorUnits: 120000,
    amountDisplay: '1,200.00',
    currency: 'INR',
    currencySymbol: '₹',
    description: 'Braille keyboard silicone overlay & USB-C adapter',
    items: [
      { name: 'Braille Keyboard Overlay', quantity: 1, priceDisplay: '₹850.00' },
      { name: 'Braided USB-C Cable (2m)', quantity: 1, priceDisplay: '₹350.00' },
    ],
    isSimulatedDemo: true,
    supportsLivePayPalSandbox: false,
    notes: 'Sample assistive technology order for mismatch checks.',
  },
  {
    id: 'demo-order-3',
    orderReference: 'DEMO-ORDER-003',
    merchantName: 'Global Software & Tech',
    merchantId: 'MCH-GLOBAL-0088',
    amountMinorUnits: 1500,
    amountDisplay: '15.00',
    currency: 'USD',
    currencySymbol: '$',
    description: 'Screen reader plugin annual demo license',
    items: [
      { name: 'Screen Reader Plugin Demo License', quantity: 1, priceDisplay: '$15.00' },
    ],
    isSimulatedDemo: true,
    supportsLivePayPalSandbox: true,
    notes: 'Configured in USD for universal PayPal Sandbox cross-border checkout tests.',
  },
];

export class OrderService {
  /**
   * Returns all available authoritative demo orders.
   */
  public static getAllOrders(): TrustedOrder[] {
    // Return immutable copies
    return AUTHORITATIVE_DEMO_ORDERS.map((order) => ({ ...order }));
  }

  /**
   * Retrieves an order strictly by its authoritative ID.
   */
  public static getOrderById(id: string): TrustedOrder | undefined {
    const order = AUTHORITATIVE_DEMO_ORDERS.find((o) => o.id === id);
    return order ? { ...order } : undefined;
  }

  /**
   * Retrieves an order strictly by its order reference (e.g. DEMO-ORDER-001).
   */
  public static getOrderByReference(reference: string): TrustedOrder | undefined {
    const order = AUTHORITATIVE_DEMO_ORDERS.find(
      (o) => o.orderReference.toLowerCase() === reference.toLowerCase().trim()
    );
    return order ? { ...order } : undefined;
  }
}
