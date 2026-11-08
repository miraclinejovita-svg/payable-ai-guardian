import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { OrderService } from '../services/orderService.js';
import { auditService } from '../services/auditService.js';
import {
  PayPalService,
  isConfiguredPayPal,
} from '../services/paypalService.js';
import { paymentSessionStore } from '../services/paymentSessionStore.js';

export const paymentsRouter = Router();

// Zod Request Schemas
const CreateOrderSchema = z.object({
  orderId: z.string().min(1, 'Authoritative application orderId is required'),
  explicitConsent: z.boolean().refine((val) => val === true, {
    message: 'Explicit user review and consent is strictly required before PayPal checkout can initiate.',
  }),
  consentTimestamp: z.string().min(1, 'Consent timestamp is required'),
});

const CaptureOrderSchema = z.object({
  orderId: z.string().min(1, 'Authoritative application orderId is required'),
  paypalOrderId: z.string().min(1, 'PayPal Order ID is required'),
});

const CancelOrderSchema = z.object({
  paypalOrderId: z.string().min(1, 'PayPal Order ID is required'),
});

/**
 * GET /api/payments/config
 * Provides public client-side PayPal configuration (Client ID only, NEVER the secret).
 */
paymentsRouter.get('/config', (_req: Request, res: Response) => {
  // Read credentials live from process.env (env.* is cached at module-load time)
  const clientId = process.env.PAYPAL_CLIENT_ID ?? env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? env.PAYPAL_CLIENT_SECRET;
  const isConfigured = isConfiguredPayPal(clientId, clientSecret);
  res.json({
    clientId: isConfigured ? clientId : '',
    mode: 'sandbox',
    isConfigured,
    message: isConfigured
      ? 'PayPal Sandbox configured and ready.'
      : 'PayPal Sandbox test credentials are not configured in server/.env.',
  });
});

/**
 * POST /api/payments/create-order
 * Creates a PayPal order using strictly server-side authoritative amounts and currencies.
 */
paymentsRouter.post('/create-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // explicitConsent is enforced by the Zod schema (must be true); no further use needed here
    const { orderId, consentTimestamp } = CreateOrderSchema.parse(req.body);

    // 1. Fetch authoritative order from backend store (ignores client amounts)
    const trustedOrder = OrderService.getOrderById(orderId);
    if (!trustedOrder) {
      res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: `Order with ID "${orderId}" was not found in authoritative records.`,
      });
      return;
    }

    // 2. Currency support check (e.g. INR discontinued by PayPal vs USD supported)
    const currencyCheck = PayPalService.isCurrencySupportedForSandbox(trustedOrder.currency);
    if (!currencyCheck.supported) {
      res.status(400).json({
        error: 'CURRENCY_NOT_SUPPORTED',
        message: currencyCheck.reason,
      });
      return;
    }

    // 3. Bind user consent to exact order and timestamp
    const consentHash = paymentSessionStore.generateConsentHash(trustedOrder, consentTimestamp);
    const idempotencyKey = `IDEMP-CREATE-${trustedOrder.id}-${consentTimestamp}`;

    // 4. Create order via PayPal REST API
    const result = await PayPalService.createOrder(trustedOrder, idempotencyKey);
    if (!result.success || !result.paypalOrderId) {
      res.status(502).json({
        error: 'PAYPAL_ORDER_CREATION_FAILED',
        message: result.error || 'Failed to create PayPal Sandbox order.',
      });
      return;
    }

    // 5. Store session mapping
    const session = paymentSessionStore.createSession(
      result.paypalOrderId,
      trustedOrder,
      consentHash,
      idempotencyKey
    );

    auditService.logEvaluation(trustedOrder.orderReference, 'MATCH', [
      `PayPal Sandbox order created: ${result.paypalOrderId}`,
    ]);

    res.json({
      success: true,
      paypalOrderId: session.paypalOrderId,
      approveUrl: result.approveUrl,
      status: session.status,
      orderReference: session.orderReference,
      amountDisplay: session.trustedAmountDisplay,
      currency: session.trustedCurrency,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/capture
 * Captures payment and verifies status, amount, and currency against trusted order.
 */
paymentsRouter.post('/capture', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, paypalOrderId } = CaptureOrderSchema.parse(req.body);

    // 1. Validate session mapping (Fail closed if server restarted or mapping missing)
    const session = paymentSessionStore.getSession(paypalOrderId);
    if (!session) {
      res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message:
          'No active checkout session found for this PayPal Order ID. If the server restarted, active sessions are cleared for security. Please restart checkout.',
      });
      return;
    }

    // 2. Order ownership check
    if (session.applicationOrderId !== orderId) {
      res.status(403).json({
        error: 'ORDER_MISMATCH',
        message: 'Security mismatch: The PayPal Order ID does not belong to the requested application order.',
      });
      return;
    }

    // 3. Fetch trusted backend order
    const trustedOrder = OrderService.getOrderById(orderId);
    if (!trustedOrder) {
      res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: 'Authoritative backend order not found.',
      });
      return;
    }

    // 4. Acquire capture lock (prevents concurrent/duplicate capture attempts)
    const idempotencyKey = `IDEMP-CAP-${session.paypalOrderId}`;
    const lockResult = paymentSessionStore.acquireCaptureLock(paypalOrderId, idempotencyKey);

    if (!lockResult.success) {
      if (lockResult.error === 'CONCURRENT_CAPTURE_IN_PROGRESS') {
        res.status(409).json({
          error: 'CONCURRENT_CAPTURE_IN_PROGRESS',
          message: 'Payment capture is already in progress. Please wait.',
        });
        return;
      }

      res.status(400).json({
        error: 'INVALID_STATE_TRANSITION',
        message: lockResult.error || 'Cannot capture payment in current session state.',
      });
      return;
    }

    // If session was already completed, return idempotent replay
    if (lockResult.session?.status === 'COMPLETED') {
      res.json({
        success: true,
        captureId: lockResult.session.captureId,
        status: 'COMPLETED',
        verifiedAmount: lockResult.session.trustedAmountDisplay,
        verifiedCurrency: lockResult.session.trustedCurrency,
        orderReference: lockResult.session.orderReference,
        isIdempotentReplay: true,
      });
      return;
    }

    // 5. Execute server-to-server capture with PayPal REST API
    const captureResult = await PayPalService.captureOrder(paypalOrderId, trustedOrder, idempotencyKey);

    // 6. Handle Discrepancies or Failures
    if (!captureResult.success) {
      if (captureResult.isDiscrepancy) {
        paymentSessionStore.finalizeCapture(paypalOrderId, 'FAILED', undefined, captureResult.error);
        res.status(422).json({
          error: 'AMOUNT_OR_CURRENCY_DISCREPANCY',
          message: captureResult.error,
          verifiedAmount: captureResult.verifiedAmount,
          verifiedCurrency: captureResult.verifiedCurrency,
        });
        return;
      }

      if (captureResult.isUncertainOutcome) {
        paymentSessionStore.finalizeCapture(paypalOrderId, 'UNKNOWN', undefined, captureResult.error);
        res.status(504).json({
          error: 'CAPTURE_STATUS_UNCERTAIN',
          message:
            'Network timeout occurred while verifying capture with PayPal. Status is UNKNOWN. Do not retry without reconciliation.',
          paypalOrderId,
        });
        return;
      }

      paymentSessionStore.finalizeCapture(paypalOrderId, 'FAILED', undefined, captureResult.error);
      res.status(502).json({
        error: 'PAYPAL_CAPTURE_FAILED',
        message: captureResult.error || 'Payment capture failed with PayPal.',
      });
      return;
    }

    // 7. Successful Verified Capture
    paymentSessionStore.finalizeCapture(paypalOrderId, 'COMPLETED', captureResult.captureId);
    auditService.logEvaluation(trustedOrder.orderReference, 'MATCH', [
      `Sandbox capture verified: ${captureResult.captureId} for ${captureResult.verifiedCurrency} ${captureResult.verifiedAmount}`,
    ]);

    res.json({
      success: true,
      captureId: captureResult.captureId,
      status: 'COMPLETED',
      verifiedAmount: captureResult.verifiedAmount,
      verifiedCurrency: captureResult.verifiedCurrency,
      orderReference: trustedOrder.orderReference,
      merchantName: trustedOrder.merchantName,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/cancel
 * Safely marks session as cancelled by buyer.
 */
paymentsRouter.post('/cancel', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paypalOrderId } = CancelOrderSchema.parse(req.body);
    const cancelled = paymentSessionStore.markCancelled(paypalOrderId);

    res.json({
      success: true,
      status: 'CANCELLED',
      message: cancelled ? 'Payment session cancelled.' : 'Session already finalized or not found.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/:paypalOrderId/status
 * Reconciles remote status on network recovery.
 */
paymentsRouter.get('/:paypalOrderId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paypalOrderId } = req.params;
    const session = paymentSessionStore.getSession(paypalOrderId);

    if (!session) {
      res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'No session found for this PayPal Order ID.',
      });
      return;
    }

    const trustedOrder = OrderService.getOrderById(session.applicationOrderId);
    if (!trustedOrder) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND' });
      return;
    }

    const remoteStatus = await PayPalService.reconcileUncertainCapture(paypalOrderId, trustedOrder);
    res.json({
      sessionStatus: session.status,
      remoteStatus,
    });
  } catch (error) {
    next(error);
  }
});
