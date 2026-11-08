import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { PayPalService } from '../services/paypalService.js';
import { paymentSessionStore } from '../services/paymentSessionStore.js';
import { OrderService } from '../services/orderService.js';

const orderUSD = OrderService.getOrderById('demo-order-3')!; // Global Tech USD 15.00
const orderINR = OrderService.getOrderById('demo-order-1')!; // Maya Stores INR 500.00

describe('PayPal Sandbox REST API Integration Tests (Mocked Provider Tests)', () => {
  beforeEach(() => {
    paymentSessionStore.clearForTesting();
    PayPalService.clearTokenCacheForTesting();
    process.env.PAYPAL_CLIENT_ID = 'test_sandbox_client_id_12345';
    process.env.PAYPAL_CLIENT_SECRET = 'test_sandbox_client_secret_67890';
  });

  it('Scenario 1: OAuth token acquisition and caching', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'mock_bearer_token_xyz',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    } as any);

    const token1 = await PayPalService.getAccessToken(mockFetch);
    expect(token1).toBe('mock_bearer_token_xyz');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should return cached token without making another HTTP request
    const token2 = await PayPalService.getAccessToken(mockFetch);
    expect(token2).toBe('mock_bearer_token_xyz');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('Scenario 2: OAuth failure throws error gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid client credentials',
    } as any);

    await expect(PayPalService.getAccessToken(mockFetch)).rejects.toThrow('PAYPAL_AUTH_FAILED');
  });

  it('Scenario 3: Rejection of unsupported currency (INR discontinued by PayPal)', async () => {
    const check = PayPalService.isCurrencySupportedForSandbox('INR');
    expect(check.supported).toBe(false);
    expect(check.reason).toContain('discontinued domestic INR');

    // Attempting create-order with INR order returns HTTP 400
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({
        orderId: 'demo-order-1', // INR 500.00
        explicitConsent: true,
        consentTimestamp: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CURRENCY_NOT_SUPPORTED');
  });

  it('Scenario 4: Rejection when explicit user consent is missing or false', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({
        orderId: 'demo-order-3', // USD 15.00
        explicitConsent: false,
        consentTimestamp: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('Scenario 5: Successful Order Creation with trusted USD minor units', async () => {
    const mockOauthResponse = {
      ok: true,
      json: async () => ({ access_token: 'valid_mock_token', expires_in: 3600 }),
    };

    const mockOrderResponse = {
      ok: true,
      json: async () => ({
        id: 'PAYPAL-ORD-TEST-100',
        status: 'CREATED',
        links: [
          {
            href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORD-TEST-100',
            rel: 'approve',
          },
        ],
      }),
    };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockOauthResponse as any)
      .mockResolvedValueOnce(mockOrderResponse as any);

    const result = await PayPalService.createOrder(orderUSD, 'IDEMP-TEST-CREATE', mockFetch);
    expect(result.success).toBe(true);
    expect(result.paypalOrderId).toBe('PAYPAL-ORD-TEST-100');
    expect(result.approveUrl).toContain('token=PAYPAL-ORD-TEST-100');
  });

  it('Scenario 6: Successful Verified Capture with matching amount and currency', async () => {
    // 1. Setup session in store
    const consentHash = paymentSessionStore.generateConsentHash(orderUSD, '2026-11-08T12:00:00Z');
    paymentSessionStore.createSession('PAYPAL-ORD-TEST-200', orderUSD, consentHash, 'IDEMP-CREATE-200');

    // 2. Mock Capture Response
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/oauth2/token')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: 'valid_mock_token', expires_in: 3600 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 'PAYPAL-ORD-TEST-200',
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'PAYPAL-CAP-55555',
                    status: 'COMPLETED',
                    amount: {
                      value: '15.00',
                      currency_code: 'USD',
                    },
                  },
                ],
              },
            },
          ],
        }),
      });
    });

    const captureResult = await PayPalService.captureOrder(
      'PAYPAL-ORD-TEST-200',
      orderUSD,
      'IDEMP-CAP-200',
      mockFetch
    );

    expect(captureResult.success).toBe(true);
    expect(captureResult.captureId).toBe('PAYPAL-CAP-55555');
    expect(captureResult.status).toBe('COMPLETED');
    expect(captureResult.verifiedAmount).toBe('15.00');
    expect(captureResult.verifiedCurrency).toBe('USD');
  });

  it('Scenario 7: Discrepancy Rejection — PayPal reports unexpected amount or currency', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/oauth2/token')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: 'valid_mock_token', expires_in: 3600 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'PAYPAL-CAP-DISCREPANCY',
                    status: 'COMPLETED',
                    amount: {
                      value: '99.00', // Discrepancy! Trusted order is 15.00
                      currency_code: 'USD',
                    },
                  },
                ],
              },
            },
          ],
        }),
      });
    });

    const captureResult = await PayPalService.captureOrder(
      'PAYPAL-ORD-TEST-300',
      orderUSD,
      'IDEMP-CAP-300',
      mockFetch
    );

    expect(captureResult.success).toBe(false);
    expect(captureResult.isDiscrepancy).toBe(true);
    expect(captureResult.error).toContain('DISCREPANCY_DETECTED');
  });

  it('Scenario 8: Idempotency & Duplicate Capture Prevention', () => {
    const consentHash = paymentSessionStore.generateConsentHash(orderUSD, '2026-11-08T12:00:00Z');
    paymentSessionStore.createSession('PAYPAL-ORD-TEST-400', orderUSD, consentHash, 'IDEMP-CREATE-400');

    // First lock
    const lock1 = paymentSessionStore.acquireCaptureLock('PAYPAL-ORD-TEST-400', 'IDEMP-CAP-400');
    expect(lock1.success).toBe(true);

    // Finalize as completed
    paymentSessionStore.finalizeCapture('PAYPAL-ORD-TEST-400', 'COMPLETED', 'CAP-400');

    // Replay attempt returns completed session idempotently
    const lock2 = paymentSessionStore.acquireCaptureLock('PAYPAL-ORD-TEST-400', 'IDEMP-CAP-400');
    expect(lock2.success).toBe(true);
    expect(lock2.session?.status).toBe('COMPLETED');
    expect(lock2.session?.captureId).toBe('CAP-400');
  });

  it('Scenario 9: Concurrent Capture Locking rejects simultaneous requests', () => {
    const consentHash = paymentSessionStore.generateConsentHash(orderUSD, '2026-11-08T12:00:00Z');
    paymentSessionStore.createSession('PAYPAL-ORD-TEST-500', orderUSD, consentHash, 'IDEMP-CREATE-500');

    const lock1 = paymentSessionStore.acquireCaptureLock('PAYPAL-ORD-TEST-500', 'IDEMP-CAP-500');
    expect(lock1.success).toBe(true);

    // Second lock while first is in flight fails with concurrency error
    const lock2 = paymentSessionStore.acquireCaptureLock('PAYPAL-ORD-TEST-500', 'IDEMP-CAP-500');
    expect(lock2.success).toBe(false);
    expect(lock2.error).toBe('CONCURRENT_CAPTURE_IN_PROGRESS');
  });

  it('Scenario 10: Fail-Closed on missing session / simulated server restart', async () => {
    // Session not in store (or wiped after restart)
    const res = await request(app).post('/api/payments/capture').send({
      orderId: 'demo-order-3',
      paypalOrderId: 'NON-EXISTENT-OR-POST-RESTART-ORDER',
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('SESSION_NOT_FOUND');
  });

  it('Scenario 11: Mismatched order association is rejected with 403', async () => {
    const consentHash = paymentSessionStore.generateConsentHash(orderUSD, '2026-11-08T12:00:00Z');
    paymentSessionStore.createSession('PAYPAL-ORD-MISMATCH', orderUSD, consentHash, 'IDEMP-MISMATCH');

    // Submitting with demo-order-1 (Maya Stores) while session was created for demo-order-3 (Global Tech)
    const res = await request(app).post('/api/payments/capture').send({
      orderId: 'demo-order-1',
      paypalOrderId: 'PAYPAL-ORD-MISMATCH',
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ORDER_MISMATCH');
  });

  it('Scenario 12: Buyer cancellation safely marks session CANCELLED', () => {
    const consentHash = paymentSessionStore.generateConsentHash(orderUSD, '2026-11-08T12:00:00Z');
    paymentSessionStore.createSession('PAYPAL-ORD-CANCEL', orderUSD, consentHash, 'IDEMP-CANCEL');

    const cancelled = paymentSessionStore.markCancelled('PAYPAL-ORD-CANCEL');
    expect(cancelled).toBe(true);

    const session = paymentSessionStore.getSession('PAYPAL-ORD-CANCEL');
    expect(session?.status).toBe('CANCELLED');

    // Cannot capture a cancelled session
    const lock = paymentSessionStore.acquireCaptureLock('PAYPAL-ORD-CANCEL', 'IDEMP-CAP-CANCEL');
    expect(lock.success).toBe(false);
    expect(lock.error).toContain('INVALID_STATE_TRANSITION');
  });
});
