import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Server API Endpoints Tests', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });
  it('GET /api/health returns 200 with service information', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toContain('PayAble AI Guardian Backend');
    expect(res.body.checks.intentMatchEngine).toBe('ready');
  });

  it('GET /api/demo/orders returns authoritative demo orders list', async () => {
    const res = await request(app).get('/api/demo/orders');
    expect(res.status).toBe(200);
    expect(res.body.isSimulatedDemo).toBe(true);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(3);

    // Verify Maya Stores order structure
    const maya = res.body.orders.find((o: any) => o.merchantName === 'Maya Stores');
    expect(maya).toBeDefined();
    expect(maya.amountMinorUnits).toBe(50000);
    expect(maya.currency).toBe('INR');
  });

  it('GET /api/demo/orders/:id returns single order or 404', async () => {
    const res = await request(app).get('/api/demo/orders/demo-order-1');
    expect(res.status).toBe(200);
    expect(res.body.order.merchantName).toBe('Maya Stores');

    const res404 = await request(app).get('/api/demo/orders/non-existent-order');
    expect(res404.status).toBe(404);
    expect(res404.body.error).toBe('ORDER_NOT_FOUND');
  });

  it('POST /api/intent/match blocks ₹800 intention on ₹500 Maya Stores order', async () => {
    const payload = {
      orderId: 'demo-order-1',
      intention: {
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
      },
    };

    const res = await request(app).post('/api/intent/match').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('BLOCKED');
    expect(res.body.canProceedToCheckout).toBe(false);
    expect(res.body.mismatchedFields).toContain('amount');
  });

  it('POST /api/intent/match succeeds with MATCH on matching intention', async () => {
    const payload = {
      orderId: 'demo-order-1',
      intention: {
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
      },
    };

    const res = await request(app).post('/api/intent/match').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('MATCH');
    expect(res.body.canProceedToCheckout).toBe(true);
  });

  it('POST /api/intent/match returns 404 BLOCKED if orderId is unknown', async () => {
    const payload = {
      orderId: 'fake-order-id',
      intention: {
        rawText: 'Pay 500 rupees.',
        amount: 500,
        currency: 'INR',
        missingFields: [],
        isAmbiguous: false,
        source: 'OFFLINE_DEMO_PARSER',
      },
    };

    const res = await request(app).post('/api/intent/match').send(payload);
    expect(res.status).toBe(404);
    expect(res.body.outcome).toBe('BLOCKED');
    expect(res.body.mismatchedFields).toContain('unknown_order');
  });

  it('POST /api/intent/match returns 400 on malformed schema payload', async () => {
    const res = await request(app).post('/api/intent/match').send({ invalid: 'payload' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/intent/verify accepts orderId and rawText, returning MATCH for 500 INR', async () => {
    const res = await request(app)
      .post('/api/intent/verify')
      .send({
        orderId: 'demo-order-1',
        rawText: 'I want to pay Maya Stores 500 rupees.',
      });

    expect(res.status).toBe(200);
    expect(res.body.matchResult.outcome).toBe('MATCH');
    expect(res.body.matchResult.canProceedToCheckout).toBe(true);
    expect(res.body.intention.merchantName).toBe('Maya Stores');
    expect(res.body.intention.amount).toBe(500);
  });

  it('POST /api/intent/verify strictly BLOCKS checkout when rawText specifies 800 INR for 500 INR order', async () => {
    const res = await request(app)
      .post('/api/intent/verify')
      .send({
        orderId: 'demo-order-1',
        rawText: 'I want to pay Maya Stores 800 rupees.',
      });

    expect(res.status).toBe(200);
    expect(res.body.matchResult.outcome).toBe('BLOCKED');
    expect(res.body.matchResult.canProceedToCheckout).toBe(false);
    expect(res.body.matchResult.mismatchedFields).toContain('amount');
  });
});
