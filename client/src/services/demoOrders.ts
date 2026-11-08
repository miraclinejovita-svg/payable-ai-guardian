import { TrustedOrder } from '../types';

/**
 * Authoritative Demo Orders Catalog
 * In Phase 2, this provides trusted mock data for frontend testing.
 * In Phase 3, this is strictly served by the backend API.
 * ALL orders are clearly labeled as simulated records.
 */
export const TRUSTED_DEMO_ORDERS: TrustedOrder[] = [
  {
    id: 'demo-order-1',
    orderReference: 'DEMO-ORDER-001',
    merchantName: 'Maya Stores',
    merchantId: 'MCH-MAYA-9921',
    amountMinorUnits: 50000, // 500.00 INR (paise)
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
    supportsLivePayPalSandbox: false, // Standard PayPal Sandbox requires supported cross-border currencies
    notes: 'Sample Indian Rupee domestic merchant order for consistency check testing.',
  },
  {
    id: 'demo-order-2',
    orderReference: 'DEMO-ORDER-002',
    merchantName: 'Tech Essentials',
    merchantId: 'MCH-TECH-4412',
    amountMinorUnits: 120000, // 1200.00 INR (paise)
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
    notes: 'Sample assistive technology purchase order for mismatch testing.',
  },
  {
    id: 'demo-order-3',
    orderReference: 'DEMO-ORDER-003',
    merchantName: 'Global Software & Tech',
    merchantId: 'MCH-GLOBAL-0088',
    amountMinorUnits: 1500, // 15.00 USD (cents)
    amountDisplay: '15.00',
    currency: 'USD',
    currencySymbol: '$',
    description: 'Screen reader plugin annual demo license',
    items: [
      { name: 'Screen Reader Plugin Demo License', quantity: 1, priceDisplay: '$15.00' },
    ],
    isSimulatedDemo: true,
    supportsLivePayPalSandbox: true, // Configured for live PayPal Sandbox checkout tests
    notes: 'Configured in USD for universal PayPal Sandbox developer checkout compatibility.',
  },
];
